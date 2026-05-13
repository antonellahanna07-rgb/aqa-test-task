import * as dotenv from 'dotenv';
import * as path from 'path';
import { AppConfig, AppConfigSchema, EnvName, RawEnvConfig } from './schema';

import localCfg from './envs/local';
import devCfg from './envs/dev';
import stagingCfg from './envs/staging';

const ENV_REGISTRY: Record<EnvName, RawEnvConfig> = {
  local: localCfg,
  dev: devCfg,
  staging: stagingCfg,
};

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

/**
 * Centralized configuration. Resolves layered values:
 *   defaults  <  env-specific file  <  process.env overrides
 * Then validates the resulting object against a zod schema so misconfigurations
 * fail fast instead of producing confusing test errors downstream.
 */
export class ConfigManager {
  private static instance: AppConfig | undefined;

  static load(envOverride?: EnvName): AppConfig {
    if (ConfigManager.instance && !envOverride) return ConfigManager.instance;

    dotenv.config({ path: path.resolve(process.cwd(), '.env') });

    const envName = ConfigManager.resolveEnvName(envOverride);
    const envCfg = ENV_REGISTRY[envName];

    const merged = {
      env: envName,
      baseUrl: process.env.BASE_URL ?? envCfg.baseUrl,
      apiBaseUrl: process.env.API_BASE_URL ?? envCfg.apiBaseUrl,
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
      throw new Error(`Invalid configuration for TEST_ENV="${envName}":\n${issues}`);
    }

    ConfigManager.instance = parsed.data;
    return ConfigManager.instance;
  }

  static get(): AppConfig {
    return ConfigManager.instance ?? ConfigManager.load();
  }

  static reset(): void {
    ConfigManager.instance = undefined;
  }

  private static resolveEnvName(override?: EnvName): EnvName {
    const raw = override ?? process.env.TEST_ENV ?? 'local';
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
