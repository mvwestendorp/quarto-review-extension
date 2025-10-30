import { describe, it, expect, vi, afterEach } from 'vitest';

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_URL = window.location.href;

function setLocationSearch(search: string) {
  const url = new URL(ORIGINAL_URL);
  url.search = search;
  url.hash = '';
  window.history.replaceState({}, '', url.toString());
}

async function loadDebugModule() {
  vi.resetModules();
  delete (window as any).debugLogger;
  delete (window as any).printDebugHelp;
  return await import('../../src/utils/debug.ts');
}

function restoreEnvironment() {
  // Restore URL
  window.history.replaceState({}, '', ORIGINAL_URL);

  // Restore environment variables
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    process.env[key] = value;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  restoreEnvironment();
});

describe('debug utilities', () => {
  it('logs messages when enabled and module is allowed', async () => {
    setLocationSearch('');
    const { debugLogger, createModuleLogger } = await loadDebugModule();
    debugLogger.setConfig({
      enabled: true,
      level: 'debug',
      modules: [],
      excludeModules: [],
      formatTimestamp: false,
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const logger = createModuleLogger('ui-module');
    const payload = { details: 'ready' };
    logger.info('Rendering UI', payload);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const args = logSpy.mock.calls[0];
    expect(args[0]).toContain('[INFO]');
    expect(args.at(-1)).toBe(payload);
  });

  it('skips logging when module is not in allowed list', async () => {
    setLocationSearch('');
    const { debugLogger, createModuleLogger } = await loadDebugModule();
    debugLogger.setConfig({
      enabled: true,
      level: 'trace',
      modules: ['changes'],
      excludeModules: [],
      formatTimestamp: false,
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const logger = createModuleLogger('ui-module');
    logger.debug('This should be filtered out');

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('enables debug mode from URL parameter', async () => {
    setLocationSearch('?debug=trace');
    const { debugLogger } = await loadDebugModule();
    const config = debugLogger.getConfig();

    expect(config.enabled).toBe(true);
    expect(config.level).toBe('trace');
  });

  it('normalizes module filters provided as comma-separated string', async () => {
    setLocationSearch('');
    const { debugLogger } = await loadDebugModule();
    debugLogger.setConfig({
      enabled: true,
      level: 'debug',
      modules: 'ui,changes',
      excludeModules: 'git ,  markdown  ',
    } as any);

    const config = debugLogger.getConfig();
    expect(config.modules).toEqual(['ui', 'changes']);
    expect(config.excludeModules).toEqual(['git', 'markdown']);
  });

  it('derives configuration from environment variables', async () => {
    setLocationSearch('');
    process.env.DEBUG = 'true';
    process.env.DEBUG_LEVEL = 'warn';
    process.env.DEBUG_MODULES = 'ui,changes';
    process.env.DEBUG_EXCLUDE = 'git';

    const { debugLogger } = await loadDebugModule();
    const config = debugLogger.getConfig();

    expect(config.enabled).toBe(true);
    expect(config.level).toBe('warn');
    expect(config.modules).toEqual(['ui', 'changes']);
    expect(config.excludeModules).toEqual(['git']);
  });
});
