/**
 * Shared UI Module
 *
 * Provides common utilities used across UI modules:
 * - HTML escaping and sanitization
 * - String manipulation (trimming, normalization)
 * - Markdown utilities
 * - Event system for module communication
 *
 * @module shared
 */

export {
  escapeHtml,
  isWhitespaceChar,
  trimLineEnd,
  trimLineStart,
  isSetextUnderline,
  normalizeListMarkers,
} from './utils';

export {
  ModuleEvent,
  MODULE_EVENTS,
  ModuleEventEmitter,
  onModuleEvent,
  emitModuleEvent,
  type EditorReadyDetail,
  type EditorContentChangedDetail,
  type EditorSelectionChangedDetail,
  type CommentSubmittedDetail,
  type CommentCancelledDetail,
  type CommentComposerOpenedDetail,
  type ToolbarCommandExecutedDetail,
  type ToolbarStateUpdatedDetail,
  type SidebarToggledDetail,
  type ContextMenuOpenedDetail,
} from './ModuleEvent';

export {
  createInitialEditorState,
  createInitialUIState,
  createInitialCommentState,
  createInitialContextMenuState,
  createInitialTranslationState,
  type EditorState,
  type UIState,
  type CommentState,
  type ContextMenuState,
  type TranslationState,
} from './UIState';
