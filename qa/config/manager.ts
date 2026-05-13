import * as dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';

import dev from './dev';
import staging from './staging';
import prod from './prod';

/* ------------------------------------------------------------------ */
/*  Schema                                                            */
/* ------------------------------------------------------------------ */

export const EnvName = z.enum(['dev', 'staging', 'prod']);
export type EnvName = z.infer<typeof EnvName>;

export const EnvConfigSchema = z.object({
  baseUrl: z.string().url(),
  apiBaseUrl: z.string().url(),
});
export type EnvConfig = z.infer<typeof EnvConfigSchema>;

export const AppConfigSchema = EnvConfigSchema.extend({
  env: EnvName,
  adminCredentials: z
    .object({
      username: z.string().min(1),
      password: z.string().min(1),
      email: z.string().email(),
    })
    .optional(),
  execution: z.object({
    headless: z.boolean(),
    slowMo: z.number().int().min(0),
    workers: z.number().int().min(1),
    retries: z.number().int().min(0),
    trace: z.enum(['on', 'off', 'retain-on-failure', 'on-first-retry']),
    actionTimeoutMs: z.number().int().min(1000),
    navigationTimeoutMs: z.number().int().min(1000),
    expectTimeoutMs: z.number().int().min(1000),
  }),
  artifacts: z.object({
    storageStateDir: z.string().min(1),
    reportDir: z.string().min(1),
    resultsDir: z.string().min(1),
  }),
});
export type AppConfig = z.infer<typeof AppConfigSchema>;

/* ------------------------------------------------------------------ */
/*  Registry of environment configs                                   */
/* ------------------------------------------------------------------ */

const ENVS: Record<EnvName, EnvConfig> = { dev, staging, prod };

const DEFAULTS = {
  headless: true,
  slowMo: 0,
  workers: 4,
  retries: 0,
  trace: 'on-first-retry' as const,
  actionTimeoutMs: 15_000,
  navigationTimeoutMs: 30_000,
  expectTimeoutMs: 10_000,
  storageStateDir: '.auth',
  reportDir: 'playwright-report',
  resultsDir: 'test-results',
};

/* ------------------------------------------------------------------ */
/*  ConfigManager                                                     */
/* ------------------------------------------------------------------ */

/**
 * Centralized configuration with layered resolution:
 *   defaults  <  per-environment file (config/<env>.ts)  <  process.env
 *
 * The merged object is validated by the zod schema, so misconfigurations
 * fail fast at startup instead of producing confusing test errors later.
 */
export class ConfigManager {
  private static cached: AppConfig | undefined;

  static load(envOverride?: EnvName): AppConfig {
    if (ConfigManager.cached && !envOverride) return ConfigManager.cached;

    dotenv.config({ path: path.resolve(process.cwd(), '.env') });

    const env = ConfigManager.resolveEnv(envOverride);
    const base = ENVS[env];

    const merged = {
      env,
      baseUrl: process.env.BASE_URL ?? base.baseUrl,
      apiBaseUrl: process.env.API_BASE_URL ?? base.apiBaseUrl,
      adminCredentials: ConfigManager.resolveAdminCredentials(),
      execution: {
        headless: ConfigManager.parseBool(process.env.HEADLESS, DEFAULTS.headless),
        slowMo: ConfigManager.parseInt(process.env.SLOW_MO, DEFAULTS.slowMo),
        workers: ConfigManager.parseInt(process.env.WORKERS, DEFAULTS.workers),
        retries: ConfigManager.parseInt(process.env.RETRIES, DEFAULTS.retries),
        trace: (process.env.TRACE as AppConfig['execution']['trace']) ?? DEFAULTS.trace,
        actionTimeoutMs: DEFAULTS.actionTimeoutMs,
        navigationTimeoutMs: DEFAULTS.navigationTimeoutMs,
        expectTimeoutMs: DEFAULTS.expectTimeoutMs,
      },
      artifacts: {
        storageStateDir: DEFAULTS.storageStateDir,
        reportDir: DEFAULTS.reportDir,
        resultsDir: DEFAULTS.resultsDir,
      },
    };

    const parsed = AppConfigSchema.safeParse(merged);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
        .join('\n');
      throw new Error(`Invalid configuration for TEST_ENV="${env}":\n${issues}`);
    }

    ConfigManager.cached = parsed.data;
    return ConfigManager.cached;
  }

  static get(): AppConfig {
    return ConfigManager.cached ?? ConfigManager.load();
  }

  static reset(): void {
    ConfigManager.cached = undefined;
  }

  private static resolveEnv(override?: EnvName): EnvName {
    const raw = override ?? process.env.TEST_ENV ?? 'dev';
    const result = EnvName.safeParse(raw);
    if (!result.success) {
      throw new Error(
        `Unknown TEST_ENV "${raw}". Expected one of: ${EnvName.options.join(', ')}.`,
      );
    }
    return result.data;
  }

  private static resolveAdminCredentials(): AppConfig['adminCredentials'] {
    const { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL } = process.env;
    if (!ADMIN_USERNAME && !ADMIN_PASSWORD && !ADMIN_EMAIL) return undefined;
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_EMAIL) {
      throw new Error(
        'ADMIN_USERNAME, ADMIN_PASSWORD, and ADMIN_EMAIL must all be set together, or all omitted.',
      );
    }
    return { username: ADMIN_USERNAME, password: ADMIN_PASSWORD, email: ADMIN_EMAIL };
  }

  private static parseBool(v: string | undefined, fallback: boolean): boolean {
    if (v === undefined) return fallback;
    return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
  }

  private static parseInt(v: string | undefined, fallback: number): number {
    if (v === undefined || v === '') return fallback;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }
}
