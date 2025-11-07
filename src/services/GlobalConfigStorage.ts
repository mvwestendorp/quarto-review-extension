/**
 * GlobalConfigStorage
 *
 * Provides persistent storage of Quarto Review configuration across pages
 * in multi-page projects. Stores config in sessionStorage so it persists
 * as the user navigates between pages, but is cleared when the session ends.
 *
 * This solves the problem where secondary pages in a multi-page project don't
 * receive the review.git config from Quarto metadata.
 */

import { createModuleLogger } from '@utils/debug';
import type { ReviewGitConfig } from '@/types';

const logger = createModuleLogger('GlobalConfigStorage');

const STORAGE_KEY = 'quarto-review-global-config';

export interface GlobalReviewConfig {
  git?: ReviewGitConfig;
  timestamp: number;
}

/**
 * Store configuration globally so it's available on subsequent pages
 */
export function storeGlobalConfig(config: GlobalReviewConfig): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    logger.debug('Stored global config to sessionStorage', {
      hasGit: !!config.git,
      timestamp: config.timestamp,
    });
  } catch (error) {
    logger.warn('Failed to store global config', error);
  }
}

/**
 * Retrieve configuration from global storage
 */
export function getGlobalConfig(): GlobalReviewConfig | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const config: GlobalReviewConfig = JSON.parse(stored);
    logger.debug('Retrieved global config from sessionStorage', {
      hasGit: !!config.git,
      age: Date.now() - config.timestamp,
    });
    return config;
  } catch (error) {
    logger.warn('Failed to retrieve global config', error);
    return null;
  }
}

/**
 * Clear stored configuration
 */
export function clearGlobalConfig(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    logger.debug('Cleared global config from sessionStorage');
  } catch (error) {
    logger.warn('Failed to clear global config', error);
  }
}

/**
 * Merge page-specific config with global config
 * Page-specific config takes precedence over global config
 */
export function mergeWithGlobalConfig(
  pageConfig: ReviewGitConfig | undefined
): ReviewGitConfig | undefined {
  // If page has config, use it and store globally for other pages
  if (pageConfig) {
    storeGlobalConfig({
      git: pageConfig,
      timestamp: Date.now(),
    });
    return pageConfig;
  }

  // If page doesn't have config, try to use global config
  const global = getGlobalConfig();
  if (global?.git) {
    logger.info('Using git config from global storage (previous page)', {
      provider: global.git.provider,
    });
    return global.git;
  }

  return undefined;
}
