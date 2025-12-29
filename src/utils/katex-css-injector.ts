/**
 * KaTeX CSS Injector
 *
 * Lazy-loads KaTeX CSS when math content is detected.
 * The extension's markdown renderer (rehype-katex) generates KaTeX HTML
 * but doesn't automatically inject the required CSS stylesheet.
 */

import { createModuleLogger } from './debug';

const logger = createModuleLogger('KaTeXCSSInjector');

let cssInjected = false;
let injectionPromise: Promise<void> | null = null;

/**
 * Lazy-load KaTeX CSS when math content is being rendered
 * This is called automatically when rendering HTML that contains KaTeX elements
 *
 * @param html - The HTML string to check for KaTeX content
 * @returns Promise that resolves when CSS is loaded (or immediately if already loaded)
 */
export function ensureKatexCssForContent(html: string): Promise<void> {
  // Quick check: does this HTML contain KaTeX elements?
  if (!html.includes('class="katex"')) {
    // No math content, no need to load CSS
    return Promise.resolve();
  }

  // CSS already injected
  if (cssInjected) {
    return Promise.resolve();
  }

  // Injection already in progress, return existing promise
  if (injectionPromise) {
    return injectionPromise;
  }

  // Start injection
  injectionPromise = injectKatexCss();
  return injectionPromise;
}

/**
 * Internal function to inject KaTeX CSS into the document head
 */
function injectKatexCss(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Double-check if CSS is already loaded (by Quarto or previous injection)
    const existingLink = document.querySelector(
      'link[href*="katex"]'
    ) as HTMLLinkElement | null;

    if (existingLink) {
      logger.debug('KaTeX CSS already loaded by Quarto or external source');
      cssInjected = true;
      resolve();
      return;
    }

    logger.debug('Injecting KaTeX CSS from CDN...');

    // Create and inject the stylesheet link
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
    link.integrity =
      'sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV';
    link.crossOrigin = 'anonymous';

    // Wait for CSS to load
    link.onload = () => {
      cssInjected = true;
      logger.info('KaTeX CSS loaded successfully from CDN');
      resolve();
    };

    link.onerror = () => {
      logger.error('Failed to load KaTeX CSS from CDN');
      // Still mark as injected to avoid retry loops
      cssInjected = true;
      reject(new Error('Failed to load KaTeX CSS'));
    };

    document.head.appendChild(link);
  });
}
