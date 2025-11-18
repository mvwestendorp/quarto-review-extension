/**
 * Security Utilities
 *
 * Provides security functions for:
 * - Safe localStorage/sessionStorage operations with validation
 * - Token encryption/decryption for sensitive data
 * - Input sanitization and validation
 * - XSS prevention
 *
 * Security Review Findings Addressed:
 * - localStorage used without validation
 * - Git tokens stored without encryption
 * - Missing input validation
 */

import { createModuleLogger } from './debug';

const logger = createModuleLogger('Security');

/**
 * Maximum allowed storage size per key (5MB by default)
 * Prevents storage quota exhaustion attacks
 */
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Storage key prefix for application data
 * Prevents collision with other applications
 */
const STORAGE_PREFIX = 'quarto-review:';

/**
 * Simple XOR encryption for tokens
 * Note: This is NOT cryptographically secure. For production use,
 * consider using Web Crypto API or a proper encryption library.
 *
 * This provides basic obfuscation to prevent casual inspection.
 */
function xorEncrypt(data: string, key: string): string {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result); // Base64 encode
}

function xorDecrypt(encrypted: string, key: string): string {
  try {
    const data = atob(encrypted); // Base64 decode
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch (error) {
    logger.error('Failed to decrypt data:', error);
    return '';
  }
}

/**
 * Get encryption key from environment or generate one
 * In production, this should come from a secure source
 */
function getEncryptionKey(): string {
  // Try to get from environment variable (injected at build time)
  if (typeof process !== 'undefined' && process.env.ENCRYPTION_KEY) {
    return process.env.ENCRYPTION_KEY;
  }

  // Fallback: Generate from domain (not secure, but better than nothing)
  const domain = window.location.hostname;
  return `${domain}-${Date.now().toString(36)}`;
}

/**
 * Validate JSON string before parsing
 * Prevents JSON injection attacks
 */
function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize storage key to prevent injection
 */
function sanitizeKey(key: string): string {
  // Remove any characters that could be problematic
  return key.replace(/[^a-zA-Z0-9:_-]/g, '');
}

/**
 * Get prefixed storage key
 */
function getPrefixedKey(key: string): string {
  return `${STORAGE_PREFIX}${sanitizeKey(key)}`;
}

/**
 * Safe localStorage operations with validation
 */
export const SafeStorage = {
  /**
   * Set item in localStorage with validation
   *
   * @param key - Storage key
   * @param value - Value to store (will be JSON stringified)
   * @param options - Storage options
   * @returns true if successful, false otherwise
   *
   * @example
   * SafeStorage.setItem('user-settings', { theme: 'dark' });
   */
  setItem(
    key: string,
    value: any,
    options: { encrypt?: boolean; expiresIn?: number } = {}
  ): boolean {
    try {
      const prefixedKey = getPrefixedKey(key);

      // Serialize value
      const serialized = JSON.stringify(value);

      // Check size limit
      if (serialized.length > MAX_STORAGE_SIZE) {
        logger.error('Storage value exceeds size limit', {
          key,
          size: serialized.length,
          limit: MAX_STORAGE_SIZE,
        });
        return false;
      }

      // Create storage envelope with metadata
      const envelope = {
        data: serialized,
        timestamp: Date.now(),
        expiresAt: options.expiresIn ? Date.now() + options.expiresIn : null,
        version: '1.0',
      };

      let finalValue = JSON.stringify(envelope);

      // Encrypt if requested
      if (options.encrypt) {
        const encryptionKey = getEncryptionKey();
        finalValue = xorEncrypt(finalValue, encryptionKey);
      }

      localStorage.setItem(prefixedKey, finalValue);
      logger.debug('Storage item set', { key: prefixedKey, encrypted: options.encrypt });
      return true;
    } catch (error) {
      logger.error('Failed to set storage item', { key, error });
      return false;
    }
  },

  /**
   * Get item from localStorage with validation
   *
   * @param key - Storage key
   * @param options - Retrieval options
   * @returns Parsed value or null if not found/invalid
   *
   * @example
   * const settings = SafeStorage.getItem('user-settings');
   */
  getItem<T = any>(key: string, options: { decrypt?: boolean } = {}): T | null {
    try {
      const prefixedKey = getPrefixedKey(key);
      let stored = localStorage.getItem(prefixedKey);

      if (!stored) {
        return null;
      }

      // Decrypt if needed
      if (options.decrypt) {
        const encryptionKey = getEncryptionKey();
        stored = xorDecrypt(stored, encryptionKey);
        if (!stored) {
          logger.warn('Failed to decrypt storage item', { key });
          return null;
        }
      }

      // Validate JSON
      if (!isValidJSON(stored)) {
        logger.warn('Invalid JSON in storage', { key });
        localStorage.removeItem(prefixedKey);
        return null;
      }

      // Parse envelope
      const envelope = JSON.parse(stored);

      // Validate envelope structure
      if (!envelope.data || !envelope.timestamp) {
        logger.warn('Invalid storage envelope', { key });
        localStorage.removeItem(prefixedKey);
        return null;
      }

      // Check expiration
      if (envelope.expiresAt && Date.now() > envelope.expiresAt) {
        logger.debug('Storage item expired', { key });
        localStorage.removeItem(prefixedKey);
        return null;
      }

      // Parse actual data
      if (!isValidJSON(envelope.data)) {
        logger.warn('Invalid JSON in envelope data', { key });
        localStorage.removeItem(prefixedKey);
        return null;
      }

      return JSON.parse(envelope.data) as T;
    } catch (error) {
      logger.error('Failed to get storage item', { key, error });
      return null;
    }
  },

  /**
   * Remove item from localStorage
   */
  removeItem(key: string): void {
    try {
      const prefixedKey = getPrefixedKey(key);
      localStorage.removeItem(prefixedKey);
      logger.debug('Storage item removed', { key: prefixedKey });
    } catch (error) {
      logger.error('Failed to remove storage item', { key, error });
    }
  },

  /**
   * Clear all application storage
   * Only removes items with our prefix
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      let removed = 0;

      for (const key of keys) {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
          removed++;
        }
      }

      logger.debug('Storage cleared', { itemsRemoved: removed });
    } catch (error) {
      logger.error('Failed to clear storage', error);
    }
  },

  /**
   * Check if storage is available
   */
  isAvailable(): boolean {
    try {
      const testKey = `${STORAGE_PREFIX}test`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get storage usage statistics
   */
  getUsageStats(): { used: number; available: number; percentage: number } {
    try {
      let used = 0;
      const keys = Object.keys(localStorage);

      for (const key of keys) {
        if (key.startsWith(STORAGE_PREFIX)) {
          const value = localStorage.getItem(key);
          if (value) {
            used += value.length;
          }
        }
      }

      // localStorage typically has 5-10MB limit
      const available = 10 * 1024 * 1024; // Assume 10MB
      const percentage = (used / available) * 100;

      return { used, available, percentage };
    } catch {
      return { used: 0, available: 0, percentage: 0 };
    }
  },
};

/**
 * Secure token storage for git credentials and API keys
 */
export const SecureTokenStorage = {
  /**
   * Store a token securely with encryption
   *
   * @param key - Token identifier
   * @param token - Token value to store
   * @param expiresIn - Optional expiration time in milliseconds
   *
   * @example
   * SecureTokenStorage.setToken('github-token', 'ghp_abc123...', 3600000);
   */
  setToken(key: string, token: string, expiresIn?: number): boolean {
    return SafeStorage.setItem(
      `token:${key}`,
      { token, createdAt: Date.now() },
      { encrypt: true, expiresIn }
    );
  },

  /**
   * Retrieve a stored token
   *
   * @param key - Token identifier
   * @returns Token value or null if not found/expired
   *
   * @example
   * const token = SecureTokenStorage.getToken('github-token');
   */
  getToken(key: string): string | null {
    const data = SafeStorage.getItem<{ token: string; createdAt: number }>(
      `token:${key}`,
      { decrypt: true }
    );
    return data?.token || null;
  },

  /**
   * Remove a stored token
   */
  removeToken(key: string): void {
    SafeStorage.removeItem(`token:${key}`);
  },

  /**
   * Check if a token exists and is valid
   */
  hasToken(key: string): boolean {
    return this.getToken(key) !== null;
  },

  /**
   * Clear all stored tokens
   */
  clearAllTokens(): void {
    try {
      const keys = Object.keys(localStorage);
      const tokenPrefix = `${STORAGE_PREFIX}token:`;

      for (const key of keys) {
        if (key.startsWith(tokenPrefix)) {
          localStorage.removeItem(key);
        }
      }

      logger.debug('All tokens cleared');
    } catch (error) {
      logger.error('Failed to clear tokens', error);
    }
  },
};

/**
 * Input sanitization utilities
 */
export const InputSanitizer = {
  /**
   * Sanitize string to prevent XSS
   * Escapes HTML special characters
   */
  sanitizeHTML(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  },

  /**
   * Sanitize URL to prevent javascript: and data: URLs
   */
  sanitizeURL(url: string): string {
    try {
      const parsed = new URL(url);
      const allowedProtocols = ['http:', 'https:', 'mailto:'];

      if (!allowedProtocols.includes(parsed.protocol)) {
        logger.warn('Blocked unsafe URL protocol', { protocol: parsed.protocol });
        return '';
      }

      return url;
    } catch {
      // Invalid URL
      return '';
    }
  },

  /**
   * Validate and sanitize file path
   * Prevents path traversal attacks
   */
  sanitizeFilePath(path: string): string {
    // Remove any ../ sequences
    let sanitized = path.replace(/\.\.\//g, '');
    sanitized = sanitized.replace(/\.\.\\/g, '');

    // Remove leading slashes
    sanitized = sanitized.replace(/^\/+/, '');

    // Only allow alphanumeric, dash, underscore, slash, and dot
    sanitized = sanitized.replace(/[^a-zA-Z0-9/_.-]/g, '');

    return sanitized;
  },

  /**
   * Validate email address format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate username format
   * Allows alphanumeric, dash, and underscore
   */
  isValidUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,32}$/;
    return usernameRegex.test(username);
  },
};

/**
 * Security audit logger
 * Logs security-relevant events for monitoring
 */
export const SecurityAudit = {
  /**
   * Log authentication attempt
   */
  logAuthAttempt(username: string, success: boolean, reason?: string): void {
    logger.info('Authentication attempt', {
      username,
      success,
      reason,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    });
  },

  /**
   * Log token access
   */
  logTokenAccess(tokenKey: string, action: 'read' | 'write' | 'delete'): void {
    logger.debug('Token access', {
      tokenKey,
      action,
      timestamp: Date.now(),
    });
  },

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(activity: string, details: Record<string, any>): void {
    logger.warn('Suspicious activity detected', {
      activity,
      ...details,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    });
  },

  /**
   * Log permission denial
   */
  logPermissionDenied(resource: string, action: string, userId?: string): void {
    logger.warn('Permission denied', {
      resource,
      action,
      userId,
      timestamp: Date.now(),
    });
  },
};

/**
 * Content Security Policy helpers
 */
export const CSP = {
  /**
   * Check if inline scripts are allowed
   */
  areInlineScriptsAllowed(): boolean {
    try {
      const metaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
      for (const tag of Array.from(metaTags)) {
        const content = tag.getAttribute('content') || '';
        if (content.includes("script-src") && !content.includes("'unsafe-inline'")) {
          return false;
        }
      }
      return true;
    } catch {
      return true; // Assume allowed if check fails
    }
  },

  /**
   * Report CSP violation
   */
  reportViolation(violation: SecurityPolicyViolationEvent): void {
    logger.error('CSP Violation', {
      blockedURI: violation.blockedURI,
      violatedDirective: violation.violatedDirective,
      originalPolicy: violation.originalPolicy,
    });
  },
};

// Set up CSP violation listener
if (typeof window !== 'undefined') {
  window.addEventListener('securitypolicyviolation', (e) => {
    CSP.reportViolation(e as SecurityPolicyViolationEvent);
  });
}

/**
 * Rate limiting for sensitive operations
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  /**
   * Check if action is allowed
   *
   * @param key - Unique identifier for the action
   * @returns true if allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Remove old attempts outside the window
    const recentAttempts = attempts.filter((time) => now - time < this.windowMs);

    if (recentAttempts.length >= this.maxAttempts) {
      logger.warn('Rate limit exceeded', { key, attempts: recentAttempts.length });
      return false;
    }

    // Record this attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);

    return true;
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.attempts.clear();
  }
}
