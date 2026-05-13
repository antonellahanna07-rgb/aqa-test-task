import * as path from 'path';
import { ConfigManager } from '../../config/ConfigManager';

export function storageStateDir(): string {
  return path.resolve(process.cwd(), ConfigManager.get().artifacts.storageStateDir);
}

export function storageStatePath(scope: string): string {
  return path.join(storageStateDir(), `${scope}.json`);
}

export function workerStorageStatePath(workerIndex: number): string {
  return storageStatePath(`worker-${workerIndex}`);
}

export function sharedStorageStatePath(): string {
  return storageStatePath('shared');
}

export function workerUserPath(workerIndex: number): string {
  return path.join(storageStateDir(), `worker-${workerIndex}.user.json`);
}
