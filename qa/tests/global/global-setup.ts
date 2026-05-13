import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from '../../config/ConfigManager';
import { logger } from '../../src/utils/logger';

/**
 * Runs once before all workers. Responsibilities:
 *   1. Load and validate configuration (fail-fast on bad config).
 *   2. Wipe and (re)create the artifact directories so previous runs do not
 *      leak storage states or stale results into the new run.
 *
 * Per-worker authentication state is created lazily inside the auth fixture
 * — that keeps workers fully isolated and free from a "shared seed user"
 * that would be a hotspot for flakiness in parallel runs.
 */
export default async function globalSetup(): Promise<void> {
  const cfg = ConfigManager.load();
  logger.info(`Environment: ${cfg.env} → ${cfg.baseUrl}`);

  const storageDir = path.resolve(process.cwd(), cfg.artifacts.storageStateDir);
  if (fs.existsSync(storageDir)) {
    fs.rmSync(storageDir, { recursive: true, force: true });
  }
  fs.mkdirSync(storageDir, { recursive: true });
  logger.info(`Storage state dir ready: ${storageDir}`);
}
