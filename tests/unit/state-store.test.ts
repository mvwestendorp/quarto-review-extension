import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateStore, createStateStore } from '@/services/StateStore';
import type {
  EditorState,
  UIState,
  CommentState,
  ContextMenuState,
  TranslationState,
} from '@modules/ui/shared';

describe('StateStore', () => {
  let store: StateStore;

  beforeEach(() => {
    store = createStateStore();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const state = store.getState();
      expect(state.editor).toBeDefined();
      expect(state.ui).toBeDefined();
      expect(state.comment).toBeDefined();
      expect(state.contextMenu).toBeDefined();
    });

    it('should have initial editor state', () => {
      const editorState = store.getEditorState();
      expect(editorState.activeEditor).toBeNull();
      expect(editorState.activeEditorToolbar).toBeNull();
      expect(editorState.currentElementId).toBeNull();
      expect(editorState.milkdownEditor).toBeNull();
      expect(editorState.currentEditorContent).toBe('');
      expect(editorState.showTrackedChanges).toBe(true);
    });

    it('should have initial UI state', () => {
      const uiState = store.getUIState();
      expect(uiState.isSidebarCollapsed).toBe(false);
    });

    it('should have initial comment state', () => {
      const commentState = store.getCommentState();
      expect(commentState.activeCommentComposer).toBeNull();
      expect(commentState.activeComposerInsertionAnchor).toBeNull();
      expect(commentState.activeComposerOriginalItem).toBeNull();
      expect(commentState.activeHighlightedSection).toBeNull();
      expect(commentState.highlightedBy).toBeNull();
    });

    it('should have initial context menu state', () => {
      const contextMenuState = store.getContextMenuState();
      expect(contextMenuState.activeContextMenu).toBeNull();
      expect(contextMenuState.contextMenuScrollHandler).toBeNull();
    });

    it('should have initial translation state', () => {
      const translationState = store.getTranslationState();
      expect(translationState.isActive).toBe(false);
      expect(translationState.selectedSourceSentenceId).toBeNull();
      expect(translationState.selectedTargetSentenceId).toBeNull();
      expect(translationState.busy).toBe(false);
      expect(translationState.progressStatus).toBeNull();
    });

    it('should support debug mode', () => {
      const debugStore = createStateStore({ debug: true });
      expect(debugStore).toBeDefined();
    });
  });

  describe('getters', () => {
    it('should return read-only editor state', () => {
      const state = store.getEditorState();
      expect(state).toBeDefined();
      expect(Object.isFrozen(state)).toBe(false); // TypeScript readonly, not frozen
    });

    it('should return read-only UI state', () => {
      const state = store.getUIState();
      expect(state).toBeDefined();
    });

    it('should return read-only comment state', () => {
      const state = store.getCommentState();
      expect(state).toBeDefined();
    });

    it('should return read-only context menu state', () => {
      const state = store.getContextMenuState();
      expect(state).toBeDefined();
    });

    it('should return read-only translation state', () => {
      const state = store.getTranslationState();
      expect(state).toBeDefined();
    });

    it('should return entire application state', () => {
      const state = store.getState();
      expect(state.editor).toBeDefined();
      expect(state.ui).toBeDefined();
      expect(state.comment).toBeDefined();
      expect(state.contextMenu).toBeDefined();
    });
  });

  describe('setters', () => {
    it('should update editor state', () => {
      const mockElement = document.createElement('div');
      store.setEditorState({ activeEditor: mockElement });
      const state = store.getEditorState();
      expect(state.activeEditor).toBe(mockElement);
    });

    it('should update UI state', () => {
      store.setUIState({ isSidebarCollapsed: true });
      const state = store.getUIState();
      expect(state.isSidebarCollapsed).toBe(true);
    });

    it('should update comment state', () => {
      const mockElement = document.createElement('div');
      store.setCommentState({ activeCommentComposer: mockElement });
      const state = store.getCommentState();
      expect(state.activeCommentComposer).toBe(mockElement);
    });

    it('should update context menu state', () => {
      const mockElement = document.createElement('div');
      store.setContextMenuState({ activeContextMenu: mockElement });
      const state = store.getContextMenuState();
      expect(state.activeContextMenu).toBe(mockElement);
    });

    it('should merge updates with existing state', () => {
      store.setEditorState({ currentElementId: 'element-1' });
      store.setEditorState({ currentEditorContent: 'test content' });
      const state = store.getEditorState();
      expect(state.currentElementId).toBe('element-1');
      expect(state.currentEditorContent).toBe('test content');
    });

    it('should allow updating multiple properties at once', () => {
      const mockElement = document.createElement('div');
      store.setEditorState({
        activeEditor: mockElement,
        currentElementId: 'element-1',
        currentEditorContent: 'test',
      });
      const state = store.getEditorState();
      expect(state.activeEditor).toBe(mockElement);
      expect(state.currentElementId).toBe('element-1');
      expect(state.currentEditorContent).toBe('test');
    });

    it('should update translation state', () => {
      store.setTranslationState({ isActive: true });
      const state = store.getTranslationState();
      expect(state.isActive).toBe(true);
    });

    it('should update translation selection state', () => {
      store.setTranslationState({
        selectedSourceSentenceId: 'source-1',
        selectedTargetSentenceId: 'target-1',
      });
      const state = store.getTranslationState();
      expect(state.selectedSourceSentenceId).toBe('source-1');
      expect(state.selectedTargetSentenceId).toBe('target-1');
    });

    it('should update translation progress state', () => {
      store.setTranslationState({
        busy: true,
        progressStatus: {
          phase: 'running',
          message: 'Translating...',
          percent: 45,
        },
      });
      const state = store.getTranslationState();
      expect(state.busy).toBe(true);
      expect(state.progressStatus?.phase).toBe('running');
      expect(state.progressStatus?.message).toBe('Translating...');
      expect(state.progressStatus?.percent).toBe(45);
    });

    it('should merge translation updates with existing state', () => {
      store.setTranslationState({ isActive: true });
      store.setTranslationState({ busy: true });
      const state = store.getTranslationState();
      expect(state.isActive).toBe(true);
      expect(state.busy).toBe(true);
    });

    it('should allow updating multiple translation properties at once', () => {
      store.setTranslationState({
        isActive: true,
        selectedSourceSentenceId: 'source-1',
        busy: true,
        progressStatus: {
          phase: 'running',
          message: 'Translating document...',
          percent: 25,
        },
      });
      const state = store.getTranslationState();
      expect(state.isActive).toBe(true);
      expect(state.selectedSourceSentenceId).toBe('source-1');
      expect(state.busy).toBe(true);
      expect(state.progressStatus?.phase).toBe('running');
      expect(state.progressStatus?.message).toBe('Translating document...');
      expect(state.progressStatus?.percent).toBe(25);
    });
  });

  describe('event emission', () => {
    it('should emit editor:changed event', () => {
      const listener = vi.fn();
      store.on('editor:changed', listener);
      store.setEditorState({ currentElementId: 'test' });
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ currentElementId: 'test' })
      );
    });

    it('should emit ui:changed event', () => {
      const listener = vi.fn();
      store.on('ui:changed', listener);
      store.setUIState({ isSidebarCollapsed: true });
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ isSidebarCollapsed: true })
      );
    });

    it('should emit comment:changed event', () => {
      const listener = vi.fn();
      const mockElement = document.createElement('div');
      store.on('comment:changed', listener);
      store.setCommentState({ activeCommentComposer: mockElement });
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ activeCommentComposer: mockElement })
      );
    });

    it('should emit contextMenu:changed event', () => {
      const listener = vi.fn();
      const mockElement = document.createElement('div');
      store.on('contextMenu:changed', listener);
      store.setContextMenuState({ activeContextMenu: mockElement });
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ activeContextMenu: mockElement })
      );
    });

    it('should emit state:changed event on any state change', () => {
      const listener = vi.fn();
      store.on('state:changed', listener);
      store.setEditorState({ currentElementId: 'test' });
      expect(listener).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          editor: expect.objectContaining({ currentElementId: 'test' }),
        })
      );
    });

    it('should call multiple listeners for same event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      store.on('editor:changed', listener1);
      store.on('editor:changed', listener2);
      store.setEditorState({ currentElementId: 'test' });
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should emit translation:changed event', () => {
      const listener = vi.fn();
      store.on('translation:changed', listener);
      store.setTranslationState({ isActive: true });
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true })
      );
    });

    it('should emit translation:changed with progress updates', () => {
      const listener = vi.fn();
      store.on('translation:changed', listener);
      store.setTranslationState({
        busy: true,
        progressStatus: {
          phase: 'running',
          message: 'Translating...',
          percent: 50,
        },
      });
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          busy: true,
          progressStatus: expect.objectContaining({
            phase: 'running',
            message: 'Translating...',
            percent: 50,
          }),
        })
      );
    });

    it('should emit translation:changed with selection updates', () => {
      const listener = vi.fn();
      store.on('translation:changed', listener);
      store.setTranslationState({
        selectedSourceSentenceId: 'source-1',
        selectedTargetSentenceId: 'target-1',
      });
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedSourceSentenceId: 'source-1',
          selectedTargetSentenceId: 'target-1',
        })
      );
    });

    it('should handle listener errors gracefully', () => {
      const goodListener = vi.fn();
      const badListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      store.on('editor:changed', badListener);
      store.on('editor:changed', goodListener);

      // Should not throw
      expect(() => {
        store.setEditorState({ currentElementId: 'test' });
      }).not.toThrow();

      expect(badListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('subscriptions', () => {
    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = store.on('editor:changed', listener);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe using returned function', () => {
      const listener = vi.fn();
      const unsubscribe = store.on('editor:changed', listener);
      unsubscribe();
      store.setEditorState({ currentElementId: 'test' });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should unsubscribe using off method', () => {
      const listener = vi.fn();
      store.on('editor:changed', listener);
      store.off('editor:changed', listener);
      store.setEditorState({ currentElementId: 'test' });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should support once subscription', () => {
      const listener = vi.fn();
      store.once('editor:changed', listener);
      store.setEditorState({ currentElementId: 'test1' });
      store.setEditorState({ currentElementId: 'test2' });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should count listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      expect(store.listenerCount('editor:changed')).toBe(0);
      store.on('editor:changed', listener1);
      expect(store.listenerCount('editor:changed')).toBe(1);
      store.on('editor:changed', listener2);
      expect(store.listenerCount('editor:changed')).toBe(2);
    });

    it('should remove all listeners for event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      store.on('editor:changed', listener1);
      store.on('editor:changed', listener2);
      store.removeAllListeners('editor:changed');
      store.setEditorState({ currentElementId: 'test' });
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('should remove all listeners for all events', () => {
      const editorListener = vi.fn();
      const uiListener = vi.fn();
      store.on('editor:changed', editorListener);
      store.on('ui:changed', uiListener);
      store.removeAllListeners();
      store.setEditorState({ currentElementId: 'test' });
      store.setUIState({ isSidebarCollapsed: true });
      expect(editorListener).not.toHaveBeenCalled();
      expect(uiListener).not.toHaveBeenCalled();
    });
  });

  describe('reset functions', () => {
    it('should reset editor state', () => {
      const mockElement = document.createElement('div');
      store.setEditorState({ activeEditor: mockElement, currentElementId: 'test' });
      store.resetEditorState();
      const state = store.getEditorState();
      expect(state.activeEditor).toBeNull();
      expect(state.currentElementId).toBeNull();
    });

    it('should reset UI state', () => {
      store.setUIState({ isSidebarCollapsed: true });
      store.resetUIState();
      const state = store.getUIState();
      expect(state.isSidebarCollapsed).toBe(false);
    });

    it('should reset comment state', () => {
      const mockElement = document.createElement('div');
      store.setCommentState({ activeCommentComposer: mockElement });
      store.resetCommentState();
      const state = store.getCommentState();
      expect(state.activeCommentComposer).toBeNull();
    });

    it('should reset context menu state', () => {
      const mockElement = document.createElement('div');
      store.setContextMenuState({ activeContextMenu: mockElement });
      store.resetContextMenuState();
      const state = store.getContextMenuState();
      expect(state.activeContextMenu).toBeNull();
    });

    it('should reset translation state', () => {
      store.setTranslationState({
        isActive: true,
        selectedSourceSentenceId: 'source-1',
        selectedTargetSentenceId: 'target-1',
        busy: true,
        progressStatus: {
          phase: 'running',
          message: 'Translating...',
          percent: 50,
        },
      });
      store.resetTranslationState();
      const state = store.getTranslationState();
      expect(state.isActive).toBe(false);
      expect(state.selectedSourceSentenceId).toBeNull();
      expect(state.selectedTargetSentenceId).toBeNull();
      expect(state.busy).toBe(false);
      expect(state.progressStatus).toBeNull();
    });

    it('should reset all state', () => {
      const mockElement = document.createElement('div');
      store.setEditorState({ activeEditor: mockElement });
      store.setUIState({ isSidebarCollapsed: true });
      store.setCommentState({ activeCommentComposer: mockElement });
      store.setContextMenuState({ activeContextMenu: mockElement });
      store.setTranslationState({
        isActive: true,
        busy: true,
        progressStatus: {
          phase: 'running',
          message: '',
        },
      });

      store.resetAll();

      const state = store.getState();
      expect(state.editor.activeEditor).toBeNull();
      expect(state.ui.isSidebarCollapsed).toBe(false);
      expect(state.comment.activeCommentComposer).toBeNull();
      expect(state.contextMenu.activeContextMenu).toBeNull();
      expect(state.translation.isActive).toBe(false);
      expect(state.translation.busy).toBe(false);
      expect(state.translation.progressStatus).toBeNull();
    });

    it('should emit events when resetting', () => {
      const editorListener = vi.fn();
      store.on('editor:changed', editorListener);
      store.resetEditorState();
      expect(editorListener).toHaveBeenCalled();
    });

    it('should emit all events when resetting all', () => {
      const editorListener = vi.fn();
      const uiListener = vi.fn();
      const commentListener = vi.fn();
      const contextMenuListener = vi.fn();
      const translationListener = vi.fn();
      const stateListener = vi.fn();

      store.on('editor:changed', editorListener);
      store.on('ui:changed', uiListener);
      store.on('comment:changed', commentListener);
      store.on('contextMenu:changed', contextMenuListener);
      store.on('translation:changed', translationListener);
      store.on('state:changed', stateListener);

      store.resetAll();

      expect(editorListener).toHaveBeenCalled();
      expect(uiListener).toHaveBeenCalled();
      expect(commentListener).toHaveBeenCalled();
      expect(contextMenuListener).toHaveBeenCalled();
      expect(translationListener).toHaveBeenCalled();
      expect(stateListener).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should remove all listeners on destroy', () => {
      const listener = vi.fn();
      store.on('editor:changed', listener);
      store.destroy();
      store.setEditorState({ currentElementId: 'test' });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should be safe to call destroy multiple times', () => {
      expect(() => {
        store.destroy();
        store.destroy();
      }).not.toThrow();
    });
  });

  describe('integration', () => {
    it('should handle complex state updates', () => {
      const mockEditor = document.createElement('div');
      const mockToolbar = document.createElement('div');

      store.setEditorState({
        activeEditor: mockEditor,
        activeEditorToolbar: mockToolbar,
        currentElementId: 'element-1',
        currentEditorContent: 'test content',
        showTrackedChanges: false,
      });

      const state = store.getEditorState();
      expect(state.activeEditor).toBe(mockEditor);
      expect(state.activeEditorToolbar).toBe(mockToolbar);
      expect(state.currentElementId).toBe('element-1');
      expect(state.currentEditorContent).toBe('test content');
      expect(state.showTrackedChanges).toBe(false);
    });

    it('should work with reactive patterns', () => {
      const updates: string[] = [];

      store.on<EditorState>('editor:changed', (state) => {
        if (state.currentElementId) {
          updates.push(state.currentElementId);
        }
      });

      store.setEditorState({ currentElementId: 'elem-1' });
      store.setEditorState({ currentElementId: 'elem-2' });
      store.setEditorState({ currentElementId: 'elem-3' });

      expect(updates).toEqual(['elem-1', 'elem-2', 'elem-3']);
    });

    it('should track translation workflow state changes', () => {
      const progressUpdates: Array<{
        phase: string;
        message: string;
        percent?: number;
      }> = [];

      store.on<TranslationState>('translation:changed', (state) => {
        progressUpdates.push({
          phase: state.progressStatus?.phase,
          message: state.progressStatus?.message,
          percent: state.progressStatus?.percent,
        });
      });

      // Simulate translation workflow
      store.setTranslationState({
        isActive: true,
        busy: true,
        progressStatus: {
          phase: 'running',
          message: 'Initializing...',
        },
      });

      store.setTranslationState({
        progressStatus: {
          phase: 'running',
          message: 'Translating sentences...',
          percent: 50,
        },
      });

      store.setTranslationState({
        progressStatus: {
          phase: 'success',
          message: 'Translation complete',
          percent: 100,
        },
        busy: false,
      });

      expect(progressUpdates).toHaveLength(3);
      expect(progressUpdates[0]).toEqual({
        phase: 'running',
        message: 'Initializing...',
        percent: undefined,
      });
      expect(progressUpdates[1]).toEqual({
        phase: 'running',
        message: 'Translating sentences...',
        percent: 50,
      });
      expect(progressUpdates[2]).toEqual({
        phase: 'success',
        message: 'Translation complete',
        percent: 100,
      });
    });

    it('should handle translation selection changes', () => {
      const selections: Array<{
        source: string | null;
        target: string | null;
      }> = [];

      store.on<TranslationState>('translation:changed', (state) => {
        selections.push({
          source: state.selectedSourceSentenceId,
          target: state.selectedTargetSentenceId,
        });
      });

      // Select source sentence
      store.setTranslationState({
        selectedSourceSentenceId: 'source-1',
        selectedTargetSentenceId: null,
      });

      // Select target sentence
      store.setTranslationState({
        selectedSourceSentenceId: null,
        selectedTargetSentenceId: 'target-1',
      });

      // Select both
      store.setTranslationState({
        selectedSourceSentenceId: 'source-2',
        selectedTargetSentenceId: 'target-2',
      });

      expect(selections).toHaveLength(3);
      expect(selections[0]).toEqual({ source: 'source-1', target: null });
      expect(selections[1]).toEqual({ source: null, target: 'target-1' });
      expect(selections[2]).toEqual({ source: 'source-2', target: 'target-2' });
    });
  });
});
