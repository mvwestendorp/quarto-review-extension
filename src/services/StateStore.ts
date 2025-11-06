/**
 * State Store
 *
 * Central state management system using EventEmitter pattern.
 * Provides type-safe state management with reactive updates.
 *
 * Benefits:
 * - Single source of truth for application state
 * - Predictable state updates
 * - Easy debugging with state change logging
 * - Type-safe state access and mutations
 * - No external dependencies
 */

import type {
  EditorState,
  UIState,
  CommentState,
  ContextMenuState,
  TranslationState,
} from '@modules/ui/shared';
import {
  createInitialEditorState,
  createInitialUIState,
  createInitialCommentState,
  createInitialContextMenuState,
  createInitialTranslationState,
} from '@modules/ui/shared';

/**
 * State change event types
 */
export type StateChangeEvent =
  | 'editor:changed'
  | 'ui:changed'
  | 'comment:changed'
  | 'contextMenu:changed'
  | 'translation:changed'
  | 'state:changed'; // Emitted on any state change

/**
 * State change listener callback
 */
export type StateChangeListener<T = unknown> = (state: T) => void;

/**
 * Combined application state
 */
export interface AppState {
  editor: EditorState;
  ui: UIState;
  comment: CommentState;
  contextMenu: ContextMenuState;
  translation: TranslationState;
}

/**
 * State Store options
 */
export interface StateStoreOptions {
  debug?: boolean;
}

/**
 * Central State Store
 *
 * Manages all application state with event emission for reactive updates.
 */
export class StateStore {
  private state: AppState;
  private listeners: Map<StateChangeEvent, Set<StateChangeListener>>;
  private debug: boolean;

  constructor(options: StateStoreOptions = {}) {
    this.debug = options.debug ?? false;
    this.listeners = new Map();
    this.state = {
      editor: createInitialEditorState(),
      ui: createInitialUIState(),
      comment: createInitialCommentState(),
      contextMenu: createInitialContextMenuState(),
      translation: createInitialTranslationState(),
    };

    this.log('State store initialized', this.state);
  }

  /**
   * Get current editor state (read-only)
   */
  getEditorState(): Readonly<EditorState> {
    return this.state.editor;
  }

  /**
   * Get current UI state (read-only)
   */
  getUIState(): Readonly<UIState> {
    return this.state.ui;
  }

  /**
   * Get current comment state (read-only)
   */
  getCommentState(): Readonly<CommentState> {
    return this.state.comment;
  }

  /**
   * Get current context menu state (read-only)
   */
  getContextMenuState(): Readonly<ContextMenuState> {
    return this.state.contextMenu;
  }

  /**
   * Get current translation state (read-only)
   */
  getTranslationState(): Readonly<TranslationState> {
    return this.state.translation;
  }

  /**
   * Get entire application state (read-only)
   */
  getState(): Readonly<AppState> {
    return {
      editor: this.state.editor,
      ui: this.state.ui,
      comment: this.state.comment,
      contextMenu: this.state.contextMenu,
      translation: this.state.translation,
    };
  }

  /**
   * Update editor state
   */
  setEditorState(updates: Partial<EditorState>): void {
    const prevState = { ...this.state.editor };
    this.state.editor = { ...this.state.editor, ...updates };
    this.log('Editor state updated', {
      prev: prevState,
      next: this.state.editor,
    });
    this.emit('editor:changed', this.state.editor);
    this.emit('state:changed', this.getState());
  }

  /**
   * Update UI state
   */
  setUIState(updates: Partial<UIState>): void {
    const prevState = { ...this.state.ui };
    this.state.ui = { ...this.state.ui, ...updates };
    this.log('UI state updated', { prev: prevState, next: this.state.ui });
    this.emit('ui:changed', this.state.ui);
    this.emit('state:changed', this.getState());
  }

  /**
   * Update comment state
   */
  setCommentState(updates: Partial<CommentState>): void {
    const prevState = { ...this.state.comment };
    this.state.comment = { ...this.state.comment, ...updates };
    this.log('Comment state updated', {
      prev: prevState,
      next: this.state.comment,
    });
    this.emit('comment:changed', this.state.comment);
    this.emit('state:changed', this.getState());
  }

  /**
   * Update context menu state
   */
  setContextMenuState(updates: Partial<ContextMenuState>): void {
    const prevState = { ...this.state.contextMenu };
    this.state.contextMenu = { ...this.state.contextMenu, ...updates };
    this.log('Context menu state updated', {
      prev: prevState,
      next: this.state.contextMenu,
    });
    this.emit('contextMenu:changed', this.state.contextMenu);
    this.emit('state:changed', this.getState());
  }

  /**
   * Update translation state
   */
  setTranslationState(updates: Partial<TranslationState>): void {
    const prevState = { ...this.state.translation };
    // Handle Set and Map updates specially to avoid reference issues
    const loadingSentences =
      updates.loadingSentences ?? this.state.translation.loadingSentences;
    const sentenceErrors =
      updates.sentenceErrors ?? this.state.translation.sentenceErrors;

    this.state.translation = {
      ...this.state.translation,
      ...updates,
      loadingSentences,
      sentenceErrors,
    };

    this.log('Translation state updated', {
      prev: prevState,
      next: this.state.translation,
    });
    this.emit('translation:changed', this.state.translation);
    this.emit('state:changed', this.getState());
  }

  /**
   * Reset editor state to initial values
   */
  resetEditorState(): void {
    this.setEditorState(createInitialEditorState());
  }

  /**
   * Reset UI state to initial values
   */
  resetUIState(): void {
    this.setUIState(createInitialUIState());
  }

  /**
   * Reset comment state to initial values
   */
  resetCommentState(): void {
    this.setCommentState(createInitialCommentState());
  }

  /**
   * Reset context menu state to initial values
   */
  resetContextMenuState(): void {
    this.setContextMenuState(createInitialContextMenuState());
  }

  /**
   * Reset translation state to initial values
   */
  resetTranslationState(): void {
    this.setTranslationState(createInitialTranslationState());
  }

  /**
   * Reset all state to initial values
   */
  resetAll(): void {
    this.state = {
      editor: createInitialEditorState(),
      ui: createInitialUIState(),
      comment: createInitialCommentState(),
      contextMenu: createInitialContextMenuState(),
      translation: createInitialTranslationState(),
    };
    this.log('All state reset', this.state);
    this.emit('editor:changed', this.state.editor);
    this.emit('ui:changed', this.state.ui);
    this.emit('comment:changed', this.state.comment);
    this.emit('contextMenu:changed', this.state.contextMenu);
    this.emit('translation:changed', this.state.translation);
    this.emit('state:changed', this.getState());
  }

  /**
   * Subscribe to state changes
   */
  on<T = unknown>(
    event: StateChangeEvent,
    listener: StateChangeListener<T>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as StateChangeListener);

    // Return unsubscribe function
    return () => {
      this.off(event, listener);
    };
  }

  /**
   * Unsubscribe from state changes
   */
  off<T = unknown>(
    event: StateChangeEvent,
    listener: StateChangeListener<T>
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener as StateChangeListener);
    }
  }

  /**
   * Subscribe to state changes (one-time)
   */
  once<T = unknown>(
    event: StateChangeEvent,
    listener: StateChangeListener<T>
  ): void {
    const onceListener: StateChangeListener<T> = (state: T) => {
      listener(state);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
  }

  /**
   * Emit state change event
   */
  private emit<T = unknown>(event: StateChangeEvent, state: T): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          (listener as StateChangeListener<T>)(state);
        } catch (error) {
          console.error(`Error in state change listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get number of listeners for an event
   */
  listenerCount(event: StateChangeEvent): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /**
   * Remove all listeners for an event (or all events if no event specified)
   */
  removeAllListeners(event?: StateChangeEvent): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Log debug messages
   */
  private log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[StateStore] ${message}`, data);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.removeAllListeners();
    this.log('State store destroyed');
  }
}

/**
 * Create a new state store instance
 */
export function createStateStore(options?: StateStoreOptions): StateStore {
  return new StateStore(options);
}
