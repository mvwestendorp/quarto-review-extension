/**
 * Debug Utilities Module
 * Provides debug logging functions with conditional output based on debug flags
 */

/**
 * General debug logging - only logs when WebReviewDebug.general is enabled
 * @param {...any} args - Arguments to log
 */
function debug(...args) {
  if (window.WebReviewDebug?.general) {
    console.log('[Web Review]', ...args);
  }
}

/**
 * Git integration debug logging - only logs when WebReviewDebug.git is enabled
 * @param {...any} args - Arguments to log
 */
function debugGit(...args) {
  if (window.WebReviewDebug?.git) {
    console.log('[Git Integration]', ...args);
  }
}

/**
 * Editing debug logging - only logs when WebReviewDebug.editing is enabled
 * @param {...any} args - Arguments to log
 */
function debugEditing(...args) {
  if (window.WebReviewDebug?.editing) {
    console.log('[Editing]', ...args);
  }
}
