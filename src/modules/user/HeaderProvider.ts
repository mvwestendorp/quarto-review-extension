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
  /**
   * Attempt to get header from multiple sources:
   * 1. Meta tags (e.g., <meta name="x-auth-request-user" content="john">)
   * 2. Window variables (e.g., window.__authHeaders)
   * 3. Session storage
   */
  getHeader(name: string): string | undefined {
    const normalizedName = name.toLowerCase().replace(/_/g, '-');

    // Try meta tags first
    const metaTag = document.querySelector(
      `meta[name="${normalizedName}"]`
    ) as HTMLMetaElement;
    if (metaTag?.content) {
      return metaTag.content;
    }

    // Try window variable
    if (typeof window !== 'undefined') {
      const headers =
        (window as unknown as { __authHeaders?: Record<string, string> })
          ?.__authHeaders || {};
      if (name in headers) {
        return headers[name];
      }
      if (normalizedName in headers) {
        return headers[normalizedName];
      }
    }

    // Try session storage as last resort
    try {
      const stored = sessionStorage.getItem(`header:${name}`);
      if (stored) {
        return stored;
      }
    } catch {
      // sessionStorage may not be available
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
