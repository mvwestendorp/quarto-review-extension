/**
 * Shared type definitions for sidebar components
 * @module ui/types/sidebar-types
 */

import type { Comment } from '@/types';

/**
 * Callbacks for comments sidebar interactions
 */
export interface CommentsSidebarCallbacks {
  /** Navigate to a specific comment in the document */
  onNavigate: (elementId: string, commentKey: string) => void;
  /** Remove a comment */
  onRemove: (elementId: string, comment: Comment) => void;
  /** Edit an existing comment */
  onEdit: (elementId: string, comment: Comment) => void;
  /** Handle hover over a comment */
  onHover: (elementId: string, commentKey: string) => void;
  /** Handle mouse leave from a comment */
  onLeave: () => void;
}

/**
 * Translation drawer progress information
 */
export interface TranslationDrawerProgress {
  /** Current phase of translation operation */
  phase: 'idle' | 'running' | 'success' | 'error';
  /** Status message to display */
  message: string;
  /** Optional completion percentage (0-100) */
  percent?: number;
}
