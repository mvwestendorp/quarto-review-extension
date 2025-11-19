/**
 * Performance Utilities
 *
 * Utilities for optimizing performance through debouncing, throttling,
 * and other performance-related helper functions.
 */

/**
 * Debounce a function call - delays execution until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * Useful for expensive operations triggered by rapid events (e.g., resize, input)
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @param immediate - If true, trigger the function on the leading edge instead of trailing
 * @returns Debounced function
 *
 * @example
 * const debouncedSave = debounce(() => saveData(), 300);
 * input.addEventListener('input', debouncedSave);
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(this: any, ...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func.apply(this, args);
  };
}

/**
 * Throttle a function call - ensures the function is called at most once
 * every wait milliseconds.
 *
 * Useful for rate-limiting expensive operations (e.g., scroll handlers)
 *
 * @param func - The function to throttle
 * @param wait - The number of milliseconds to throttle
 * @returns Throttled function
 *
 * @example
 * const throttledScroll = throttle(() => updatePosition(), 50);
 * window.addEventListener('scroll', throttledScroll);
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  let lastTime: number;

  return function executedFunction(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      lastTime = Date.now();
      inThrottle = true;

      setTimeout(() => {
        if (Date.now() - lastTime >= wait) {
          inThrottle = false;
        }
      }, Math.max(wait - (Date.now() - lastTime), 0));
    }
  };
}

/**
 * Request animation frame wrapper for smooth animations
 * Automatically cancels previous frame request
 *
 * @returns Object with schedule and cancel methods
 *
 * @example
 * const raf = createRAFScheduler();
 * element.addEventListener('scroll', () => {
 *   raf.schedule(() => updateUI());
 * });
 */
export function createRAFScheduler() {
  let rafId: number | null = null;

  return {
    schedule(callback: () => void) {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        callback();
        rafId = null;
      });
    },
    cancel() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
  };
}

/**
 * Batch multiple calls into a single execution using microtask
 *
 * @param func - Function to batch
 * @returns Batched function
 *
 * @example
 * const batchedUpdate = batch(() => renderComments());
 * comments.forEach(c => batchedUpdate());
 */
export function batch<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let pending = false;
  let args: Parameters<T> | null = null;

  return function executedFunction(this: any, ...newArgs: Parameters<T>) {
    args = newArgs;

    if (!pending) {
      pending = true;
      queueMicrotask(() => {
        pending = false;
        if (args) {
          func.apply(this, args);
          args = null;
        }
      });
    }
  };
}
