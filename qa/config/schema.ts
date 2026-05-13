import { z } from 'zod';

export const EnvName = z.enum(['local', 'dev', 'staging']);
export type EnvName = z.infer<typeof EnvName>;

export const AppConfigSchema = z.object({
  env: EnvName,
  baseUrl: z.string().url(),
  apiBaseUrl: z.string().url(),
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

export const RawEnvConfigSchema = AppConfigSchema.pick({
  baseUrl: true,
  apiBaseUrl: true,
});

export type RawEnvConfig = z.infer<typeof RawEnvConfigSchema>;
