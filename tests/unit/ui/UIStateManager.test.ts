import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIStateManager } from '@modules/ui/UIStateManager';
import type { StateStore } from '@/services/StateStore';
import type { EditorState, UIState, CommentState } from '@modules/ui/shared';

const {
  getBottomDrawerInstances,
  resetBottomDrawerMocks,
  getBottomDrawerConstructor,
} = vi.hoisted(() => {
  type MockBottomDrawer = {
    setTrackedChangesVisible: ReturnType<typeof vi.fn>;
    setCollapsed: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  };

  const instances: MockBottomDrawer[] = [];

  const constructor = vi.fn(function MockBottomDrawer(this: unknown) {
    const instance: MockBottomDrawer = {
      setTrackedChangesVisible: vi.fn(),
      setCollapsed: vi.fn(),
      create: vi.fn().mockImplementation(() => {
        const element = document.createElement('div');
        element.className = 'review-bottom-drawer';
        return element;
      }),
      destroy: vi.fn(),
    };
    instances.push(instance);
    return instance;
  });

  return {
    getBottomDrawerInstances: () => instances,
    getBottomDrawerConstructor: () => constructor,
    resetBottomDrawerMocks: () => {
      instances.length = 0;
      constructor.mockClear();
    },
  };
});

// Mock BottomDrawer
vi.mock('@modules/ui/sidebars/BottomDrawer', () => ({
  BottomDrawer: getBottomDrawerConstructor(),
}));

// Mock MarginComments (not used in current state listeners but included for completeness)
vi.mock('@modules/ui/comments/MarginComments', () => ({
  MarginComments: vi.fn(function MockMarginComments(this: unknown) {
    return {
      create: vi.fn(),
      destroy: vi.fn(),
    };
  }),
}));

// Mock DOM helpers
vi.mock('@utils/dom-helpers', () => ({
  createDiv: vi.fn(() => document.createElement('div')),
  setAttributes: vi.fn(),
  addClass: vi.fn(),
  removeClass: vi.fn(),
  toggleClass: vi.fn((element: HTMLElement, className: string, add: boolean) => {
    if (add) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
  }),
}));

// Mock logger
vi.mock('@utils/debug', () => ({
  createModuleLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('UIStateManager (TDD - Test First)', () => {
  let mockStateStore: StateStore;
  let mockBottomDrawer: any;
  let stateListeners: Map<string, (data: any) => void>;

  beforeEach(() => {
    // Reset mocks
    resetBottomDrawerMocks();
    vi.clearAllMocks();

    // Setup DOM
    document.body.innerHTML = '<div class="review-toolbar"></div>';

    // Create mock state store with listener tracking
    stateListeners = new Map();
    mockStateStore = {
      on: vi.fn((event: string, handler: (data: any) => void) => {
        stateListeners.set(event, handler);
        // Return a mock unsubscribe function
        return vi.fn();
      }),
      off: vi.fn(),
      getState: vi.fn(),
      setEditorState: vi.fn(),
      setUIState: vi.fn(),
      setCommentState: vi.fn(),
    } as any;

    // Create a mock BottomDrawer instance by calling the constructor
    const BottomDrawerConstructor = getBottomDrawerConstructor();
    mockBottomDrawer = new (BottomDrawerConstructor as any)();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Initialization', () => {
    it('should register state listeners on initialization', () => {
      // Act: create UIStateManager
      const stateManager = new UIStateManager(mockStateStore, mockBottomDrawer);

      // Assert: state listeners should be registered
      expect(mockStateStore.on).toHaveBeenCalledWith('editor:changed', expect.any(Function));
      expect(mockStateStore.on).toHaveBeenCalledWith('ui:changed', expect.any(Function));
      expect(mockStateStore.on).toHaveBeenCalledWith('comment:changed', expect.any(Function));

      // Clean up
      stateManager.dispose();
    });

    it('should not modify StateStore during initialization', () => {
      // Act: create UIStateManager
      const stateManager = new UIStateManager(mockStateStore, mockBottomDrawer);

      // Assert: should only read state, not modify it
      expect(mockStateStore.setEditorState).not.toHaveBeenCalled();
      expect(mockStateStore.setUIState).not.toHaveBeenCalled();
      expect(mockStateStore.setCommentState).not.toHaveBeenCalled();

      // Clean up
      stateManager.dispose();
    });
  });

  describe('Editor State Changes', () => {
    it('should propagate editor state changes to UI components', () => {
      // Arrange
      const stateManager = new UIStateManager(mockStateStore, mockBottomDrawer);
      const editorState: EditorState = {
        showTrackedChanges: true,
      };

      // Act: trigger editor state change
      const editorListener = stateListeners.get('editor:changed');
      if (editorListener) {
        editorListener(editorState);
      }

      // Assert: bottomDrawer should be updated
      expect(mockBottomDrawer.setTrackedChangesVisible).toHaveBeenCalledWith(true);

      // Clean up
      stateManager.dispose();
    });

    it('should update tracked changes visibility when showTrackedChanges changes', () => {
      // Arrange
      const stateManager = new UIStateManager(mockStateStore, mockBottomDrawer);

      // Act: simulate tracked changes toggle
      const editorListener = stateListeners.get('editor:changed');
      if (editorListener) {
        editorListener({ showTrackedChanges: false });
      }

      // Assert
      expect(mockBottomDrawer.setTrackedChangesVisible).toHaveBeenCalledWith(false);

      // Clean up
      stateManager.dispose();
    });
  });

  describe('UI State Changes', () => {
    it('should propagate UI state changes to toolbar and body', () => {
      // Arrange
      const stateManager = new UIStateManager(mockStateStore, mockBottomDrawer);
      const toolbar = document.querySelector('.review-toolbar') as HTMLElement;
      const uiState: UIState = {
        isSidebarCollapsed: true,
      };

      // Act: trigger UI state change
      const uiListener = stateListeners.get('ui:changed');
      if (uiListener) {
        uiListener(uiState);
      }

      // Assert: toolbar and body classes should be updated
      expect(toolbar.classList.contains('review-sidebar-collapsed')).toBe(true);
      expect(document.body.classList.contains('review-sidebar-collapsed-mode')).toBe(true);
      expect(mockBottomDrawer.setCollapsed).toHaveBeenCalledWith(true);

      // Clean up
      stateManager.dispose();
    });

    it('should handle missing toolbar gracefully', () => {
      // Arrange: remove toolbar from DOM
      document.body.innerHTML = '';
      const stateManager = new UIStateManager(mockStateStore, mockBottomDrawer);
      const uiState: UIState = {
        isSidebarCollapsed: true,
      };

      // Act: trigger UI state change with no toolbar
      const uiListener = stateListeners.get('ui:changed');

      // Assert: should not throw error
      expect(() => {
        if (uiListener) {
          uiListener(uiState);
        }
      }).not.toThrow();

      // Clean up
      stateManager.dispose();
    });

    it('should toggle sidebar collapsed state correctly', () => {
      // Arrange
      const stateManager = new UIStateManager(mockStateStore, mockBottomDrawer);
      const toolbar = document.querySelector('.review-toolbar') as HTMLElement;

      // Act: collapse sidebar
      const uiListener = stateListeners.get('ui:changed');
      if (uiListener) {
        uiListener({ isSidebarCollapsed: true });
      }

      // Assert
      expect(mockBottomDrawer.setCollapsed).toHaveBeenCalledWith(true);

      // Act: expand sidebar
      if (uiListener) {
        uiListener({ isSidebarCollapsed: false });
      }

      // Assert
      expect(mockBottomDrawer.setCollapsed).toHaveBeenCalledWith(false);

      // Clean up
      stateManager.dispose();
    });
  });

  describe('Comment State Changes', () => {
    it('should handle comment state changes', () => {
      // Arrange
      const stateManager = new UIStateManager(mockStateStore, mockBottomDrawer);
      const commentState: CommentState = {
        activeCommentKey: 'comment-1',
      };

      // Act: trigger comment state change
      const commentListener = stateListeners.get('comment:changed');

      // Assert: should not throw (comment state is handled by CommentController)
      expect(() => {
        if (commentListener) {
          commentListener(commentState);
        }
      }).not.toThrow();

      // Clean up
      stateManager.dispose();
    });
  });

  describe('Disposal', () => {
    it('should clean up subscriptions on disposal', () => {
      // Arrange
      const stateManager = new UIStateManager(mockStateStore, mockBottomDrawer);

      // Store the unsubscribe functions that were created
      const unsubscribeFns: any[] = [];
      (mockStateStore.on as any).mockImplementation((event: string, handler: any) => {
        const unsubscribe = vi.fn();
        unsubscribeFns.push(unsubscribe);
        stateListeners.set(event, handler);
        return unsubscribe;
      });

      // Recreate state manager to capture unsubscribe functions
      const stateManager2 = new UIStateManager(mockStateStore, mockBottomDrawer);

      // Act: dispose state manager
      stateManager2.dispose();

      // Assert: all unsubscribe functions should have been called
      expect(unsubscribeFns.length).toBe(3); // editor, ui, comment listeners
      unsubscribeFns.forEach((unsub) => {
        expect(unsub).toHaveBeenCalled();
      });

      // Clean up first instance
      stateManager.dispose();
    });

    it('should prevent state updates after disposal', () => {
      // Arrange
      const stateManager = new UIStateManager(mockStateStore, mockBottomDrawer);

      // Act: dispose and try to trigger state change
      stateManager.dispose();
      const editorListener = stateListeners.get('editor:changed');

      // Assert: listener should not cause errors after disposal (disposed flag prevents execution)
      expect(() => {
        if (editorListener) {
          editorListener({ showTrackedChanges: true });
        }
      }).not.toThrow();

      // BottomDrawer methods should not be called after disposal
      const callsBefore = mockBottomDrawer.setTrackedChangesVisible.mock.calls.length;
      if (editorListener) {
        editorListener({ showTrackedChanges: false });
      }
      const callsAfter = mockBottomDrawer.setTrackedChangesVisible.mock.calls.length;
      expect(callsAfter).toBe(callsBefore); // No new calls
    });
  });

  describe('State Isolation', () => {
    it('should not directly modify StateStore', () => {
      // Arrange
      const stateManager = new UIStateManager(mockStateStore, mockBottomDrawer);

      // Act: trigger various state changes
      const editorListener = stateListeners.get('editor:changed');
      const uiListener = stateListeners.get('ui:changed');
      if (editorListener) {
        editorListener({ showTrackedChanges: true });
      }
      if (uiListener) {
        uiListener({ isSidebarCollapsed: true });
      }

      // Assert: UIStateManager should only read state, never set it
      // State modifications should come from user actions, not from listeners
      expect(mockStateStore.setEditorState).not.toHaveBeenCalled();
      expect(mockStateStore.setUIState).not.toHaveBeenCalled();

      // Clean up
      stateManager.dispose();
    });
  });
});
