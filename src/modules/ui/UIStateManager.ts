/**
 * UIStateManager
 *
 * Manages state subscriptions and propagates state changes to UI components.
 * Extracted from UIModule as part of TDD refactoring to improve separation of concerns.
 *
 * Responsibilities:
 * - Subscribe to StateStore changes (editor, UI, comment states)
 * - Propagate state updates to UI components (BottomDrawer, toolbar, body classes)
 * - Manage subscription lifecycle (setup/cleanup)
 *
 * @module ui/UIStateManager
 */

import type { StateStore } from '@/services/StateStore';
import type { BottomDrawer } from './sidebars/BottomDrawer';
import type { EditorState, UIState, CommentState } from './shared';
import { toggleClass } from '@utils/dom-helpers';
import { createModuleLogger } from '@utils/debug';

const logger = createModuleLogger('UIStateManager');

/**
 * UIStateManager coordinates state changes across UI components.
 * It listens to StateStore events and updates UI components accordingly.
 */
export class UIStateManager {
  private stateStore: StateStore;
  private bottomDrawer: BottomDrawer;
  private unsubscribers: (() => void)[] = [];
  private disposed = false;

  constructor(stateStore: StateStore, bottomDrawer: BottomDrawer) {
    this.stateStore = stateStore;
    this.bottomDrawer = bottomDrawer;

    this.setupStateListeners();
  }

  /**
   * Set up reactive listeners for state changes
   * Automatically updates UI when state changes occur
   */
  private setupStateListeners(): void {
    // Listen for editor state changes
    const editorUnsubscribe = this.stateStore.on<EditorState>(
      'editor:changed',
      (editorState) => {
        if (this.disposed) {
          return;
        }

        logger.debug('Editor state changed', editorState);

        // When showTrackedChanges changes, update the sidebar UI
        // Note: refresh() is already called when toggleTrackedChanges is invoked,
        // so we only need to ensure the sidebar reflects the current state
        this.bottomDrawer.setTrackedChangesVisible(
          editorState.showTrackedChanges
        );
      }
    );
    this.unsubscribers.push(editorUnsubscribe);

    // Listen for UI state changes
    const uiUnsubscribe = this.stateStore.on<UIState>(
      'ui:changed',
      (uiState) => {
        if (this.disposed) {
          return;
        }

        logger.debug('UI state changed', uiState);

        // Update sidebar collapsed state in the UI
        const toolbar = document.querySelector(
          '.review-toolbar'
        ) as HTMLElement | null;
        if (toolbar) {
          toggleClass(
            toolbar,
            'review-sidebar-collapsed',
            uiState.isSidebarCollapsed
          );
          if (document.body) {
            toggleClass(
              document.body,
              'review-sidebar-collapsed-mode',
              uiState.isSidebarCollapsed
            );
          }
          this.bottomDrawer.setCollapsed(uiState.isSidebarCollapsed);
        }
      }
    );
    this.unsubscribers.push(uiUnsubscribe);

    // Listen for comment state changes
    const commentUnsubscribe = this.stateStore.on<CommentState>(
      'comment:changed',
      (commentState) => {
        if (this.disposed) {
          return;
        }

        logger.debug('Comment state changed', commentState);
        // Comment state changes are handled by CommentController
        // which already has a reference to the state
      }
    );
    this.unsubscribers.push(commentUnsubscribe);

    logger.info('State listeners initialized - UI will react to state changes');
  }

  /**
   * Clean up all state subscriptions
   * Should be called when UIStateManager is no longer needed
   */
  public dispose(): void {
    if (this.disposed) {
      logger.warn('UIStateManager already disposed');
      return;
    }

    logger.info('Disposing UIStateManager and cleaning up subscriptions');

    // Unsubscribe from all state changes
    this.unsubscribers.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        logger.warn('Error unsubscribing from state change', { error });
      }
    });
    this.unsubscribers = [];

    this.disposed = true;
  }
}
