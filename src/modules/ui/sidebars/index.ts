/**
 * Sidebars Module
 *
 * Provides sidebar functionality for the UI module, including:
 * - Bottom drawer with review tools, comments, and translation controls
 * - Legacy unified sidebar (deprecated, kept for backwards compatibility)
 * - Context menu for quick actions
 *
 * @module sidebars
 */

export { BottomDrawer } from './BottomDrawer';
export { UnifiedSidebar } from './UnifiedSidebar';
export type { CommentsSidebarCallbacks } from './UnifiedSidebar';
export { ContextMenu } from './ContextMenu';
export type { MenuPosition } from './ContextMenu';
