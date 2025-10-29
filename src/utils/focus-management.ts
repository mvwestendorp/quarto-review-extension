/**
 * Focus Management Utilities
 * Handles focus trapping, focus restoration, and keyboard navigation
 */

/**
 * Trap focus within an element (modal dialog pattern)
 * Returns a function to remove the trap
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>;

  if (focusableElements.length === 0) {
    return () => {}; // No focusable elements, return no-op
  }

  const firstElement = focusableElements[0] ?? null;
  const lastElement = focusableElements[focusableElements.length - 1] ?? null;
  if (!firstElement || !lastElement) {
    return () => {};
  }
  let previouslyFocused = document.activeElement as HTMLElement;

  // Focus the first element
  requestAnimationFrame(() => {
    firstElement.focus();
  });

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') {
      return;
    }

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  element.addEventListener('keydown', handleKeydown);

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeydown);
    // Restore focus to previously focused element
    if (previouslyFocused && previouslyFocused instanceof HTMLElement) {
      previouslyFocused.focus();
    }
  };
}

/**
 * Manage focus for a modal dialog
 * Automatically handles focus trap and restores focus on close
 */
export class FocusManager {
  private previouslyFocused: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];
  private keydownListener: ((e: KeyboardEvent) => void) | null = null;

  constructor(private element: HTMLElement) {
    this.collectFocusableElements();
  }

  private collectFocusableElements(): void {
    const focusable = this.element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;
    this.focusableElements = Array.from(focusable);
  }

  /**
   * Enable focus trap and focus first focusable element
   */
  public activate(): void {
    // Store previously focused element
    this.previouslyFocused = document.activeElement as HTMLElement;

    // Focus first element
    const firstElement = this.focusableElements[0];
    if (firstElement) {
      requestAnimationFrame(() => {
        firstElement.focus();
      });
    }

    // Set up keyboard trap
    this.keydownListener = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && this.focusableElements.length > 0) {
        const first = this.focusableElements[0];
        const last = this.focusableElements[this.focusableElements.length - 1];
        if (!first || !last) {
          return;
        }

        if (e.shiftKey) {
          // Shift + Tab from first element
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // Tab from last element
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    this.element.addEventListener('keydown', this.keydownListener);
  }

  /**
   * Disable focus trap and restore previous focus
   */
  public deactivate(): void {
    if (this.keydownListener) {
      this.element.removeEventListener('keydown', this.keydownListener);
      this.keydownListener = null;
    }

    // Restore focus to previously focused element
    if (
      this.previouslyFocused &&
      this.previouslyFocused instanceof HTMLElement
    ) {
      requestAnimationFrame(() => {
        this.previouslyFocused?.focus();
      });
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.deactivate();
    this.focusableElements = [];
    this.previouslyFocused = null;
  }
}

/**
 * Announce text to screen readers using a live region
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only'; // Visually hidden but available to screen readers
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement is made
  setTimeout(() => {
    announcement.remove();
  }, 1000);
}

/**
 * Create a visually hidden skip link element
 */
export function createSkipLink(
  targetId: string,
  text: string = 'Skip to main content'
): HTMLElement {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.className = 'skip-link';
  skipLink.textContent = text;
  skipLink.setAttribute('tabindex', '0');

  return skipLink;
}
