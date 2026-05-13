export const logger = {
  info: (...args: unknown[]) => console.log('[qa]', ...args),
  warn: (...args: unknown[]) => console.warn('[qa]', ...args),
  error: (...args: unknown[]) => console.error('[qa]', ...args),
  debug: (...args: unknown[]) => {
    if (process.env.DEBUG_QA === '1') console.log('[qa:debug]', ...args);
  },
};
