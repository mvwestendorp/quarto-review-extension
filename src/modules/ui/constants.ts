/**
 * UI Module Constants
 * Centralized configuration for magic numbers and constants used throughout the UI module
 */

/**
 * History and State Management
 */
export const UI_CONSTANTS = {
  // Editor history storage
  EDITOR_HISTORY_STORAGE_PREFIX: 'review-editor-history-',
  MAX_HISTORY_SIZE_BYTES: 500000, // 500KB per element history
  MAX_HISTORY_STATES: 50, // Max number of states per element

  // Milkdown editor configuration
  MILKDOWN_HISTORY_DEPTH: 100, // Number of undo/redo steps
  MILKDOWN_NEW_GROUP_DELAY: 500, // Delay (ms) before grouping undo/redo steps

  /**
   * Animation and Transition Timings
   */
  ANIMATION_DURATION_MS: {
    FAST: 150, // Search debounce, editor input
    MEDIUM: 200, // Palette closing, search panel closing
    SLOW: 300, // Sidebar animation, notification removal
    FLASH_HIGHLIGHT: 1500, // Flash highlight on elements
    LONG_HIGHLIGHT: 2000, // Flash highlight (longer variant)
    NOTIFICATION_DISPLAY: 3000, // How long notifications display
  },

  /**
   * Search and Navigation
   */
  SEARCH_DEBOUNCE_DELAY_MS: 150,
  SEARCH_HIGHLIGHT_DURATION_MS: 1500,

  /**
   * Comments and Notifications
   */
  COMMENT_BADGE_ANIMATION_DELAY_MS: 1000,
  NOTIFICATION_DISPLAY_DURATION_MS: 3000,

  /**
   * UI Element IDs and Classes
   */
  TOOLBAR_CLASS: 'review-toolbar',
  SIDEBAR_CLASS: 'review-sidebar',
  MODIFIED_ELEMENT_SELECTOR: '[data-review-modified="true"]',
  ELEMENT_DATA_ATTRIBUTE: '[data-review-id]',

  /**
   * Focus and Keyboard Navigation
   */
  FOCUS_TRAP_ENABLED: true,
  ARROW_NAVIGATION_ENABLED: true,
};

/**
 * Get animation duration by name
 */
export function getAnimationDuration(key: keyof typeof UI_CONSTANTS.ANIMATION_DURATION_MS): number {
  return UI_CONSTANTS.ANIMATION_DURATION_MS[key];
}
