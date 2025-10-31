/**
 * Editor Module
 *
 * Provides editor functionality for the UI module, including:
 * - Milkdown editor initialization and lifecycle (MilkdownEditor)
 * - Editor toolbar for formatting (EditorToolbar)
 * - Editor history for session-level undo/redo (EditorHistory)
 *
 * @module editor
 */

export { MilkdownEditor } from './MilkdownEditor';
export type { DiffHighlightRange } from './MilkdownEditor';

export { EditorToolbar, TOOLBAR_BUTTON_GROUPS } from './EditorToolbar';
export type { EditorToolbarAction, EditorToolbarButton } from './EditorToolbar';

export { EditorHistory } from './EditorHistory';
export type { HistoryState } from './EditorHistory';
