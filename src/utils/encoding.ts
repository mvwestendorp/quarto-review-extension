/**
 * Encoding utilities for Base64 operations
 * Supports both browser and Node.js environments
 */

/**
 * Decodes a Base64-encoded string to UTF-8
 * Handles Unicode characters correctly
 * @param content - Base64-encoded string
 * @returns Decoded UTF-8 string
 * @throws Error if Base64 decoding is not supported in the environment
 */
export function decodeBase64(content: string): string {
  // Browser environment
  if (typeof atob === 'function') {
    return decodeURIComponent(
      Array.prototype.map
        .call(
          atob(content),
          (c: string) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`
        )
        .join('')
    );
  }

  // Node.js environment (e.g., tests)
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(content, 'base64').toString('utf-8');
  }

  throw new Error('Base64 decoding is not supported in this environment');
}

/**
 * Encodes a UTF-8 string to Base64
 * Handles Unicode characters correctly
 * @param content - UTF-8 string to encode
 * @returns Base64-encoded string
 * @throws Error if Base64 encoding is not supported in the environment
 */
export function encodeBase64(content: string): string {
  // Browser environment
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(content)));
  }

  // Node.js environment (e.g., tests)
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(content, 'utf-8').toString('base64');
  }

  throw new Error('Base64 encoding is not supported in this environment');
}
