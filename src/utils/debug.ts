/**
 * Debug Logging Module for Quarto Review Extension
 * Provides structured logging with levels, module filtering, and verbosity control
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface DebugConfig {
  enabled: boolean;
  level: LogLevel;
  modules?: string[];
  excludeModules?: string[];
  formatTimestamp: boolean;
}

const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

const LOG_STYLES: Record<LogLevel, string> = {
  error: 'background-color: #ff6b6b; color: white; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
  warn: 'background-color: #ffa500; color: white; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
  info: 'background-color: #4a90e2; color: white; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
  debug: 'background-color: #50e3c2; color: black; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
  trace: 'background-color: #b8e986; color: black; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
};

class DebugLogger {
  private config: DebugConfig;

  constructor(config?: Partial<DebugConfig>) {
    // Check for debug mode in URL or environment
    const urlParams = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : ''
    );
    const debugFromUrl = urlParams.get('debug');

    const env =
      typeof process !== 'undefined' && process.env ? process.env : {};
    const debugEnv = env['DEBUG'];
    const debugLevelEnv = env['DEBUG_LEVEL'];
    const debugModulesEnv = env['DEBUG_MODULES'];
    const debugExcludeEnv = env['DEBUG_EXCLUDE'];

    this.config = {
      enabled: debugFromUrl !== null || debugEnv === 'true',
      level:
        (debugFromUrl as LogLevel) ||
        (debugLevelEnv as LogLevel) ||
        'info',
      modules: debugModulesEnv?.split(','),
      excludeModules: debugExcludeEnv?.split(','),
      formatTimestamp: true,
      ...config,
    };
  }

  /**
   * Update debug configuration
   */
  setConfig(config: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): DebugConfig {
    return { ...this.config };
  }

  /**
   * Enable debug mode
   */
  enable(level: LogLevel = 'info'): void {
    this.config.enabled = true;
    this.config.level = level;
  }

  /**
   * Disable debug mode
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * Check if a module should be logged
   */
  private shouldLog(module: string, level: LogLevel): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Check if log level meets threshold
    if (LOG_LEVEL_VALUES[level] > LOG_LEVEL_VALUES[this.config.level]) {
      return false;
    }

    // Check module include list
    if (this.config.modules && this.config.modules.length > 0) {
      if (!this.config.modules.some((m) => module.includes(m))) {
        return false;
      }
    }

    // Check module exclude list
    if (this.config.excludeModules && this.config.excludeModules.length > 0) {
      if (this.config.excludeModules.some((m) => module.includes(m))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Format timestamp
   */
  private formatTime(): string {
    if (!this.config.formatTimestamp) {
      return '';
    }
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
  }

  /**
   * Core logging method
   */
  private log(module: string, level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(module, level)) {
      return;
    }

    const timestamp = this.formatTime();
    const consoleMethod = level === 'warn' || level === 'error' ? level : 'log';

    if (typeof window !== 'undefined' && window.console) {
      const parts = [
        `%c[${level.toUpperCase()}]`,
        LOG_STYLES[level],
        timestamp ? `[${timestamp}]` : '',
        `[${module}]`,
        message,
      ].filter((p) => p !== '');

      if (data !== undefined) {
        console[consoleMethod as 'log' | 'warn' | 'error'](...parts, data);
      } else {
        console[consoleMethod as 'log' | 'warn' | 'error'](...parts);
      }
    }
  }

  /**
   * Log error message
   */
  error(module: string, message: string, error?: unknown): void {
    this.log(module, 'error', message, error);
  }

  /**
   * Log warning message
   */
  warn(module: string, message: string, data?: unknown): void {
    this.log(module, 'warn', message, data);
  }

  /**
   * Log info message
   */
  info(module: string, message: string, data?: unknown): void {
    this.log(module, 'info', message, data);
  }

  /**
   * Log debug message
   */
  debug(module: string, message: string, data?: unknown): void {
    this.log(module, 'debug', message, data);
  }

  /**
   * Log trace message (most verbose)
   */
  trace(module: string, message: string, data?: unknown): void {
    this.log(module, 'trace', message, data);
  }
}

// Create singleton instance
export const debugLogger = new DebugLogger();

/**
 * Create a debug logger for a specific module
 */
export function createModuleLogger(moduleName: string) {
  return {
    error: (message: string, error?: unknown) => debugLogger.error(moduleName, message, error),
    warn: (message: string, data?: unknown) => debugLogger.warn(moduleName, message, data),
    info: (message: string, data?: unknown) => debugLogger.info(moduleName, message, data),
    debug: (message: string, data?: unknown) => debugLogger.debug(moduleName, message, data),
    trace: (message: string, data?: unknown) => debugLogger.trace(moduleName, message, data),
  };
}

/**
 * Print debug configuration and usage guide
 */
export function printDebugHelp(): void {
  console.log(`
%c╔══════════════════════════════════════════════════════════╗
║  Quarto Review Extension - Debug Mode Help               ║
╚══════════════════════════════════════════════════════════╝%c

%cURL Parameters:%c
  ?debug=error|warn|info|debug|trace
    Set debug level (default: info)

%cEnvironment Variables:%c
  DEBUG=true                    Enable debug mode
  DEBUG_LEVEL=level             Set verbosity level
  DEBUG_MODULES=ui,changes      Only log specified modules
  DEBUG_EXCLUDE=git             Exclude modules from logging

%cProgrammatic Usage:%c
  debugLogger.enable('debug')   Enable debug mode
  debugLogger.disable()         Disable debug mode
  debugLogger.setConfig({...})  Update configuration

%cExample:%c
  ?debug=debug&module=ui        Enable debug mode for UI module only
  debugLogger.setConfig({ modules: ['changes', 'ui'] })

%cLog Levels (lowest to highest verbosity):%c
  error  - Errors only
  warn   - Errors and warnings
  info   - General information (default)
  debug  - Detailed debugging info
  trace  - Most verbose, includes tracing
`,
    'font-weight: bold; color: #4a90e2; font-size: 12px;',
    'color: inherit; font-weight: normal;',
    'font-weight: bold; color: #4a90e2;',
    'color: inherit; font-weight: normal;',
    'font-weight: bold; color: #4a90e2;',
    'color: inherit; font-weight: normal;',
    'font-weight: bold; color: #4a90e2;',
    'color: inherit; font-weight: normal;',
    'font-weight: bold; color: #4a90e2;',
    'color: inherit; font-weight: normal;',
    'font-weight: bold; color: #4a90e2;',
    'color: inherit; font-weight: normal;'
  );
}

// Expose globally for development
if (typeof window !== 'undefined') {
  (window as any).debugLogger = debugLogger;
  (window as any).printDebugHelp = printDebugHelp;
}

export default debugLogger;
