import { logger } from '../../src/utils/logger';

export default async function globalTeardown(): Promise<void> {
  logger.info('Global teardown complete.');
}
