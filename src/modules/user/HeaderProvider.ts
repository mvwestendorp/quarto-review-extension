/**
 * Header Provider - Abstraction for reading HTTP headers
 * Allows flexible header source (browser meta tags, injected variables, etc.)
 */

/**
 * Interface for providing header values
 * Implementations handle different environments (browser, server, tests, etc.)
 */
export interface IHeaderProvider {
  /**
   * Get a header value by name
   * Returns the header value or undefined if not found
   * Header names are case-insensitive
   */
  getHeader(name: string): string | undefined;
}

/**
 * Default browser-based header provider
 * Reads from meta tags or injected window variables
 */
export class BrowserHeaderProvider implements IHeaderProvider {
  private debugMode = false;

  constructor(debugMode = false) {
    this.debugMode = debugMode;
  }

  /**
   * Enable debug mode for detailed logging
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Attempt to get header from multiple sources:
   * 1. Meta tags (e.g., <meta name="x-auth-request-user" content="john">)
   * 2. Window variables (e.g., window.__authHeaders)
   * 3. Session storage
   *
   * Logs available headers when debug mode is enabled for troubleshooting
   */
  getHeader(name: string): string | undefined {
    const normalizedName = name.toLowerCase().replace(/_/g, '-');

    if (this.debugMode) {
      console.debug(
        `[HeaderProvider] Attempting to retrieve header: "${name}" (normalized: "${normalizedName}")`
      );
    }

    // Try meta tags first
    if (typeof document !== 'undefined') {
      const metaTag = document.querySelector(
        `meta[name="${normalizedName}"]`
      ) as HTMLMetaElement;
      if (metaTag?.content) {
        if (this.debugMode) {
          console.debug(
            `[HeaderProvider] ✓ Found header "${name}" from META TAG`,
            { value: metaTag.content.substring(0, 50) }
          );
        }
        return metaTag.content;
      }
      if (this.debugMode) {
        console.debug(
          `[HeaderProvider] ✗ Meta tag not found for: "${normalizedName}"`
        );
      }
    }

    // Try window variable
    if (typeof window !== 'undefined') {
      const windowHeaders =
        (window as unknown as { __authHeaders?: Record<string, string> })
          ?.__authHeaders || {};

      if (this.debugMode) {
        const availableKeys = Object.keys(windowHeaders);
        console.debug(
          `[HeaderProvider] window.__authHeaders available keys:`,
          availableKeys
        );
      }

      if (name in windowHeaders) {
        if (this.debugMode) {
          console.debug(
            `[HeaderProvider] ✓ Found header "${name}" from window.__authHeaders (exact match)`,
            { value: windowHeaders[name]?.substring(0, 50) }
          );
        }
        return windowHeaders[name];
      }
      if (normalizedName in windowHeaders) {
        if (this.debugMode) {
          console.debug(
            `[HeaderProvider] ✓ Found header "${normalizedName}" from window.__authHeaders (normalized match)`,
            { value: windowHeaders[normalizedName]?.substring(0, 50) }
          );
        }
        return windowHeaders[normalizedName];
      }
      if (this.debugMode) {
        console.debug(
          `[HeaderProvider] ✗ Header "${name}" not found in window.__authHeaders`
        );
      }
    }

    // Try session storage as last resort
    try {
      const stored = sessionStorage.getItem(`header:${name}`);
      if (stored) {
        if (this.debugMode) {
          console.debug(
            `[HeaderProvider] ✓ Found header "${name}" from sessionStorage`,
            { value: stored.substring(0, 50) }
          );
        }
        return stored;
      }
      if (this.debugMode) {
        console.debug(
          `[HeaderProvider] ✗ Header "${name}" not found in sessionStorage`
        );
      }
    } catch (error) {
      if (this.debugMode) {
        console.debug(
          `[HeaderProvider] ✗ sessionStorage access failed:`,
          error
        );
      }
    }

    // Not found anywhere - provide detailed diagnostics
    if (this.debugMode) {
      console.error(`[HeaderProvider] ✗ HEADER NOT FOUND: "${name}"`, {
        normalizedName,
      });

      // Print all available headers from all sources
      if (typeof document !== 'undefined') {
        const allMetas = Array.from(
          document.querySelectorAll('meta[name^="x-"]')
        );
        if (allMetas.length > 0) {
          console.debug(
            '[HeaderProvider] Available x-* meta tags:',
            allMetas.map((m) => ({
              name: m.getAttribute('name'),
              value: m.getAttribute('content')?.substring(0, 50) + '...',
            }))
          );
        } else {
          console.debug('[HeaderProvider] No x-* meta tags found in document');
        }
      }

      if (typeof window !== 'undefined') {
        const windowHeaders =
          (window as unknown as { __authHeaders?: Record<string, string> })
            ?.__authHeaders || {};
        if (Object.keys(windowHeaders).length > 0) {
          console.debug(
            '[HeaderProvider] Available window.__authHeaders:',
            Object.entries(windowHeaders).map(([key, value]) => ({
              name: key,
              value: value?.substring(0, 50) + '...',
            }))
          );
        } else {
          console.debug('[HeaderProvider] window.__authHeaders is empty');
        }
      }

      try {
        const storageKeys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key?.startsWith('header:')) {
            storageKeys.push(key);
          }
        }
        if (storageKeys.length > 0) {
          console.debug(
            '[HeaderProvider] Available sessionStorage headers:',
            storageKeys
          );
        } else {
          console.debug('[HeaderProvider] No headers in sessionStorage');
        }
      } catch (error) {
        console.debug(
          '[HeaderProvider] Could not access sessionStorage:',
          error
        );
      }
    }

    return undefined;
  }
}

/**
 * Test/mock header provider for testing
 */
export class MockHeaderProvider implements IHeaderProvider {
  private headers: Map<string, string> = new Map();

  constructor(headers?: Record<string, string>) {
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        this.headers.set(key.toLowerCase(), value);
      }
    }
  }

  getHeader(name: string): string | undefined {
    return this.headers.get(name.toLowerCase());
  }

  setHeader(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }

  clear(): void {
    this.headers.clear();
  }
}

/**
 * Singleton instance of the header provider
 */
let headerProviderInstance: IHeaderProvider | null = null;

/**
 * Get the global header provider instance
 * Returns BrowserHeaderProvider by default
 */
export function getHeaderProvider(): IHeaderProvider {
  if (!headerProviderInstance) {
    headerProviderInstance = new BrowserHeaderProvider();
  }
  return headerProviderInstance;
}

/**
 * Set a custom header provider (useful for testing)
 */
export function setHeaderProvider(provider: IHeaderProvider): void {
  headerProviderInstance = provider;
}

/**
 * Reset to default provider
 */
export function resetHeaderProvider(): void {
  headerProviderInstance = null;
}
