/**
 * UI State Objects
 *
 * Consolidates related state properties into logical state objects
 * to improve code organization and maintainability.
 *
 * This replaces scattered individual state properties in UIModule
 * with cohesive, domain-specific state objects.
 */

import type { Editor } from '@milkdown/kit/core';

/**
 * Editor state - all properties related to the active editor instance
 */
export interface EditorState {
  activeEditor: HTMLElement | null;
  activeEditorToolbar: HTMLElement | null;
  currentElementId: string | null;
  milkdownEditor: Editor | null;
  currentEditorContent: string;
  showTrackedChanges: boolean;
}

/**
 * UI state - all properties related to sidebar and toolbar UI
 */
export interface UIState {
  isSidebarCollapsed: boolean;
}

/**
 * Comment state - all properties related to comments and commenting
 */
export interface CommentState {
  activeCommentComposer: HTMLElement | null;
  activeComposerInsertionAnchor: HTMLElement | null;
  activeComposerOriginalItem: HTMLElement | null;
  activeHighlightedSection: HTMLElement | null;
  highlightedBy: 'hover' | 'composer' | null;
}

/**
 * Context menu state - all properties related to context menu
 */
export interface ContextMenuState {
  activeContextMenu: HTMLElement | null;
  contextMenuScrollHandler: (() => void) | null;
}

/**
 * Translation state - all properties related to translation mode
 */
export interface TranslationState {
  /** Whether translation mode is active */
  isActive: boolean;
  /** Currently selected source sentence ID */
  selectedSourceSentenceId: string | null;
  /** Currently selected target sentence ID */
  selectedTargetSentenceId: string | null;
  /** Translation mode: manual entry or automatic translation */
  mode: 'manual' | 'automatic';
  /** Whether a translation operation is in progress */
  busy: boolean;
  /** Source language code */
  sourceLanguage: string;
  /** Target language code */
  targetLanguage: string;
  /** Currently active translation provider */
  activeProvider: string;
  /** Show correspondence lines between sentences */
  showCorrespondenceLines: boolean;
  /** Highlight corresponding sentences on hover */
  highlightOnHover: boolean;
  /** IDs of sentences currently being translated */
  loadingSentences: Set<string>;
  /** Error messages for sentences that failed translation */
  sentenceErrors: Map<string, string>;
  /** Current translation progress status */
  progressStatus: {
    phase: 'idle' | 'running' | 'success' | 'error';
    message: string;
    percent?: number;
  } | null;
}

/**
 * Create initial editor state
 */
export function createInitialEditorState(): EditorState {
  return {
    activeEditor: null,
    activeEditorToolbar: null,
    currentElementId: null,
    milkdownEditor: null,
    currentEditorContent: '',
    showTrackedChanges: true,
  };
}

/**
 * Create initial UI state
 */
export function createInitialUIState(): UIState {
  return {
    isSidebarCollapsed: false,
  };
}

/**
 * Create initial comment state
 */
export function createInitialCommentState(): CommentState {
  return {
    activeCommentComposer: null,
    activeComposerInsertionAnchor: null,
    activeComposerOriginalItem: null,
    activeHighlightedSection: null,
    highlightedBy: null,
  };
}

/**
 * Create initial context menu state
 */
export function createInitialContextMenuState(): ContextMenuState {
  return {
    activeContextMenu: null,
    contextMenuScrollHandler: null,
  };
}

/**
 * Create initial translation state
 */
export function createInitialTranslationState(): TranslationState {
  return {
    isActive: false,
    selectedSourceSentenceId: null,
    selectedTargetSentenceId: null,
    mode: 'automatic',
    busy: false,
    sourceLanguage: 'en',
    targetLanguage: 'nl',
    activeProvider: 'manual',
    showCorrespondenceLines: true,
    highlightOnHover: true,
    loadingSentences: new Set(),
    sentenceErrors: new Map(),
    progressStatus: null,
  };
}
