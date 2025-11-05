/**
 * LoadingService
 * Handles loading indicators and overlays
 */

export interface LoadingOptions {
  /** Custom message to display (default: "Loading...") */
  message?: string;
  /** Whether to show a backdrop overlay (default: true) */
  showBackdrop?: boolean;
}

/**
 * Service for managing loading indicators
 */
export class LoadingService {
  private activeLoaders: Set<HTMLElement> = new Set();

  /**
   * Show a loading indicator
   * @returns HTMLElement reference to hide the loader later
   */
  public show(options: LoadingOptions = {}): HTMLElement {
    const { message = 'Loading...', showBackdrop = true } = options;

    const loader = this.createLoaderElement(message, showBackdrop);
    document.body.appendChild(loader);
    this.activeLoaders.add(loader);

    return loader;
  }

  /**
   * Hide a specific loading indicator
   */
  public hide(loader: HTMLElement): void {
    if (!this.activeLoaders.has(loader)) {
      return;
    }

    loader.remove();
    this.activeLoaders.delete(loader);
  }

  /**
   * Hide all active loading indicators
   */
  public hideAll(): void {
    this.activeLoaders.forEach((loader) => {
      this.hide(loader);
    });
  }

  /**
   * Create loader DOM element
   */
  private createLoaderElement(message: string, showBackdrop: boolean): HTMLElement {
    const loader = document.createElement('div');
    loader.className = 'review-loading';

    if (!showBackdrop) {
      loader.style.background = 'transparent';
    }

    loader.innerHTML = `
      <div class="review-loading-content">
        <div class="review-loading-spinner"></div>
        <p>${this.escapeHtml(message)}</p>
      </div>
    `;

    return loader;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Execute an async operation with loading indicator
   */
  public async withLoading<T>(
    operation: () => Promise<T>,
    options?: LoadingOptions
  ): Promise<T> {
    const loader = this.show(options);

    try {
      return await operation();
    } finally {
      this.hide(loader);
    }
  }

  /**
   * Clean up all loaders
   */
  public destroy(): void {
    this.activeLoaders.forEach((loader) => {
      loader.remove();
    });
    this.activeLoaders.clear();
  }
}

// Singleton instance
let loadingServiceInstance: LoadingService | null = null;

/**
 * Get the singleton loading service instance
 */
export function getLoadingService(): LoadingService {
  if (!loadingServiceInstance) {
    loadingServiceInstance = new LoadingService();
  }
  return loadingServiceInstance;
}
