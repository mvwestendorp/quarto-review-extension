import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalDraftPersistence } from '@modules/storage/LocalDraftPersistence';
import { TranslationPersistence } from '@modules/translation/storage/TranslationPersistence';
import { ChangesModule } from '@modules/changes';
import { CommentsModule } from '@modules/comments';
import { PersistenceManager } from '@/services/PersistenceManager';
import { NotificationService } from '@/services/NotificationService';
import { EditorHistoryStorage } from '@modules/ui/editor/EditorHistoryStorage';

/**
 * Phase 1: Foundation Tests for Cross-Session Restoration
 * Tests basic scenarios for restoring edits and comments after page reload
 */

describe('localStorage - Cross-Session Restoration', () => {
  let persistence: LocalDraftPersistence;
  let changes: ChangesModule;
  let comments: CommentsModule;
  let persistenceManager: PersistenceManager;
  let notificationService: NotificationService;
  let historyStorage: EditorHistoryStorage;
  let restoredElements: any[] = [];
  let commentsImported = false;

  // Create a mock EmbeddedSourceStore
  const createMockStore = () => {
    let fileStorage: Record<string, { content: string; commitMessage?: string }> = {};
    return {
      getSource: vi.fn(async (filename: string) => {
        const file = fileStorage[filename];
        return file ? { content: file.content, commitMessage: file.commitMessage } : null;
      }),
      saveFile: vi.fn(async (filename: string, content: string, commitMessage?: string) => {
        fileStorage[filename] = { content, commitMessage };
      }),
      clearAll: vi.fn(async () => {
        fileStorage = {};
      }),
      clear: () => {
        fileStorage = {};
      },
    };
  };

  // Helper: Create test element
  const createTestElement = (
    id: string,
    content: string,
    type: string = 'Para'
  ) => ({
    id,
    content,
    metadata: { type },
  });

  // Helper: Create test comment
  const createTestComment = (
    id: string,
    elementId: string,
    content: string,
    resolved: boolean = false
  ) => ({
    id,
    elementId,
    content,
    userId: 'test-user',
    timestamp: Date.now(),
    resolved,
    type: 'comment' as const,
  });

  // Helper: Initialize ChangesModule with elements
  const initializeChangesWithElements = (mod: ChangesModule, elements: any[]) => {
    // Set up private originalElements by using a trick:
    // We'll directly set it via object property assignment since this is a test
    (mod as any).originalElements = elements;
  };

  beforeEach(() => {
    // Clear session storage for notification tracking
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }

    // Initialize modules with mock store
    const mockStore = createMockStore() as any;
    persistence = new LocalDraftPersistence(mockStore, {
      filename: 'test-draft.json',
    });
    changes = new ChangesModule();
    comments = new CommentsModule();
    notificationService = new NotificationService();
    historyStorage = new EditorHistoryStorage({
      prefix: 'test:',
      maxSize: 100000,
      maxStates: 10,
    });

    // Reset tracking variables
    restoredElements = [];
    commentsImported = false;

    // Initialize PersistenceManager with callbacks
    persistenceManager = new PersistenceManager(
      {
        localPersistence: persistence,
        translationPersistence: new TranslationPersistence('test-doc'),
        changes,
        comments,
        historyStorage,
        notificationService,
      },
      {
        onDraftRestored: (elements) => {
          restoredElements = elements;
        },
        onCommentsImported: () => {
          commentsImported = true;
        },
        refresh: () => {
          // Mock refresh
        },
      }
    );
  });

  afterEach(async () => {
    // Cleanup storage
    await persistence.clearAll?.();
    changes.clear?.();
    comments.clear?.();
    notificationService.destroy?.();
  });

  // ============================================================================
  // 1.1 Single Element Scenarios
  // ============================================================================

  describe('1.1 Single element scenarios', () => {
    it('should restore single edit after page reload', async () => {
      // Arrange: Setup initial state with one edit
      const elem1 = createTestElement('elem-1', 'Original content');
      initializeChangesWithElements(changes, [elem1]);
      changes.edit('elem-1', 'Modified content');

      // Get state before simulating reload
      const stateBefore = changes.getCurrentState();
      expect(stateBefore[0].content).toBe('Modified content');

      // Act: Save to localStorage
      persistenceManager.persistDocument();

      // Simulate reload: Reset modules
      changes.clear?.();
      const newChanges = new ChangesModule();
      initializeChangesWithElements(newChanges, [elem1]); // Reset to original

      // Restore from localStorage
      const newPersistenceManager = new PersistenceManager(
        {
          localPersistence: persistence,
          translationPersistence: new TranslationPersistence('test-doc'),
          changes: newChanges,
          comments,
          historyStorage,
          notificationService,
        },
        {
          onDraftRestored: (elements) => {
            restoredElements = elements;
          },
          onCommentsImported: () => {
            commentsImported = true;
          },
          refresh: () => {},
        }
      );

      await newPersistenceManager.restoreLocalDraft();

      // Assert: Content should be restored
      expect(restoredElements.length).toBe(1);
      expect(restoredElements[0].content).toBe('Modified content');
      expect(newChanges.getCurrentState()[0].content).toBe('Modified content');
    });

    it('should restore multiple edits in same element', async () => {
      // Arrange: Multiple sequential edits
      const elem1 = createTestElement('elem-1', 'Original');
      initializeChangesWithElements(changes, [elem1]);

      changes.edit('elem-1', 'Edit 1');
      changes.edit('elem-1', 'Edit 2');
      changes.edit('elem-1', 'Edit 3');

      const state = changes.getCurrentState();
      expect(state[0].content).toBe('Edit 3');

      // Act: Save and reload
      persistenceManager.persistDocument();

      changes.clear?.();
      const newChanges = new ChangesModule();
      initializeChangesWithElements(newChanges, [elem1]);

      const newPersistenceManager = new PersistenceManager(
        {
          localPersistence: persistence,
          translationPersistence: new TranslationPersistence('test-doc'),
          changes: newChanges,
          comments,
          historyStorage,
          notificationService,
        },
        {
          onDraftRestored: (elements) => {
            restoredElements = elements;
          },
          onCommentsImported: () => {
            commentsImported = true;
          },
          refresh: () => {},
        }
      );

      await newPersistenceManager.restoreLocalDraft();

      // Assert: Final state restored
      expect(restoredElements[0].content).toBe('Edit 3');
    });

    it('should preserve edit metadata after reload', async () => {
      // Arrange: Element with metadata
      const elem1 = {
        id: 'elem-1',
        content: 'Content',
        metadata: {
          type: 'Header',
          level: 2,
          attributes: { id: 'section-1' },
        },
      };

      initializeChangesWithElements(changes, [elem1]);
      changes.edit('elem-1', 'Updated content');

      // Act: Save and reload
      persistenceManager.persistDocument();

      changes.clear?.();
      const newChanges = new ChangesModule();
      initializeChangesWithElements(newChanges, [elem1]);

      const newPersistenceManager = new PersistenceManager(
        {
          localPersistence: persistence,
          translationPersistence: new TranslationPersistence('test-doc'),
          changes: newChanges,
          comments,
          historyStorage,
          notificationService,
        },
        {
          onDraftRestored: (elements) => {
            restoredElements = elements;
          },
          onCommentsImported: () => {
            commentsImported = true;
          },
          refresh: () => {},
        }
      );

      await newPersistenceManager.restoreLocalDraft();

      // Assert: Metadata preserved
      expect(restoredElements[0].metadata.type).toBe('Header');
      expect(restoredElements[0].metadata.level).toBe(2);
      expect(restoredElements[0].metadata.attributes?.id).toBe('section-1');
    });
  });

  // ============================================================================
  // 1.2 Comments Restoration
  // ============================================================================

  describe('1.2 Comments restoration', () => {
    it('should restore comments without content changes', async () => {
      // Arrange: Element with no edits, but with comments
      const elem1 = createTestElement('elem-1', 'Original content');
      initializeChangesWithElements(changes, [elem1]);

      // Add comments without editing
      const comment1 = createTestComment(
        'comment-1',
        'elem-1',
        'First comment'
      );
      const comment2 = createTestComment(
        'comment-2',
        'elem-1',
        'Second comment'
      );
      comments.addComment('elem-1', 'First comment', 'user-1', 'comment');
      comments.addComment('elem-1', 'Second comment', 'user-1', 'comment');

      // Act: Save to localStorage
      persistenceManager.persistDocument();

      // Simulate reload: Reset modules
      comments.clear?.();
      const newComments = new CommentsModule();

      const newPersistenceManager = new PersistenceManager(
        {
          localPersistence: persistence,
          translationPersistence: new TranslationPersistence('test-doc'),
          changes,
          comments: newComments,
          historyStorage,
          notificationService,
        },
        {
          onDraftRestored: (elements) => {
            restoredElements = elements;
          },
          onCommentsImported: () => {
            commentsImported = true;
          },
          refresh: () => {},
        }
      );

      await newPersistenceManager.restoreLocalDraft();

      // Assert: Comments restored
      expect(commentsImported).toBe(true);
      expect(restoredElements).toEqual([]); // No content changes
      const restoredComments = newComments.getCommentsForElement('elem-1');
      expect(restoredComments.length).toBe(2);
      expect(restoredComments[0].content).toMatch(/comment/i);
    });

    it('should restore multiple comments on same element', async () => {
      // Arrange: Element with multiple comments
      const elem1 = createTestElement('elem-1', 'Content');
      initializeChangesWithElements(changes, [elem1]);

      for (let i = 1; i <= 5; i++) {
        comments.addComment('elem-1', `Comment ${i}`, 'user-1', 'comment');
      }

      // Act: Save and reload
      persistenceManager.persistDocument();

      comments.clear?.();
      const newComments = new CommentsModule();

      const newPersistenceManager = new PersistenceManager(
        {
          localPersistence: persistence,
          translationPersistence: new TranslationPersistence('test-doc'),
          changes,
          comments: newComments,
          historyStorage,
          notificationService,
        },
        {
          onDraftRestored: (elements) => {
            restoredElements = elements;
          },
          onCommentsImported: () => {
            commentsImported = true;
          },
          refresh: () => {},
        }
      );

      await newPersistenceManager.restoreLocalDraft();

      // Assert: All 5 comments restored
      const restoredComments = newComments.getCommentsForElement('elem-1');
      expect(restoredComments.length).toBe(5);
      expect(restoredComments.map((c) => c.content)).toEqual([
        'Comment 1',
        'Comment 2',
        'Comment 3',
        'Comment 4',
        'Comment 5',
      ]);
    });

    it('should restore resolved comment state', async () => {
      // Arrange: Mix of resolved and unresolved comments
      const elem1 = createTestElement('elem-1', 'Content');
      initializeChangesWithElements(changes, [elem1]);

      const c1 = comments.addComment('elem-1', 'Issue', 'user-1', 'comment');
      const c2 = comments.addComment(
        'elem-1',
        'Resolved issue',
        'user-1',
        'comment'
      );

      // Resolve second comment
      comments.resolveComment(c2.id);

      // Act: Save and reload
      persistenceManager.persistDocument();

      comments.clear?.();
      const newComments = new CommentsModule();

      const newPersistenceManager = new PersistenceManager(
        {
          localPersistence: persistence,
          translationPersistence: new TranslationPersistence('test-doc'),
          changes,
          comments: newComments,
          historyStorage,
          notificationService,
        },
        {
          onDraftRestored: (elements) => {
            restoredElements = elements;
          },
          onCommentsImported: () => {
            commentsImported = true;
          },
          refresh: () => {},
        }
      );

      await newPersistenceManager.restoreLocalDraft();

      // Assert: Resolution state preserved
      const restoredComments = newComments.getCommentsForElement('elem-1');
      expect(restoredComments[0].resolved).toBe(false);
      expect(restoredComments[1].resolved).toBe(true);
    });

    it('should restore comment metadata (userId, timestamp)', async () => {
      // Arrange: Comments with metadata
      const elem1 = createTestElement('elem-1', 'Content');
      initializeChangesWithElements(changes, [elem1]);

      const now = Date.now();
      const comment = comments.addComment('elem-1', 'Feedback', 'alice@example.com', 'comment');

      // Act: Save and reload
      persistenceManager.persistDocument();

      comments.clear?.();
      const newComments = new CommentsModule();

      const newPersistenceManager = new PersistenceManager(
        {
          localPersistence: persistence,
          translationPersistence: new TranslationPersistence('test-doc'),
          changes,
          comments: newComments,
          historyStorage,
          notificationService,
        },
        {
          onDraftRestored: (elements) => {
            restoredElements = elements;
          },
          onCommentsImported: () => {
            commentsImported = true;
          },
          refresh: () => {},
        }
      );

      await newPersistenceManager.restoreLocalDraft();

      // Assert: Metadata intact
      const restored = newComments.getCommentsForElement('elem-1')[0];
      expect(restored.userId).toBe('alice@example.com');
      expect(restored.timestamp).toBeGreaterThanOrEqual(now);
      expect(restored.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  // ============================================================================
  // 1.3 Combined Edits + Comments
  // ============================================================================

  describe('1.3 Combined edits and comments', () => {
    it('should restore both edits and comments together', async () => {
      // Arrange: Element with edits and comments
      const elem1 = createTestElement('elem-1', 'Original');
      initializeChangesWithElements(changes, [elem1]);

      changes.edit('elem-1', 'Edited content');
      comments.addComment('elem-1', 'Good point', 'user-1', 'comment');
      comments.addComment('elem-1', 'Needs revision', 'user-2', 'comment');

      // Act: Save and reload
      persistenceManager.persistDocument();

      changes.clear?.();
      comments.clear?.();
      const newChanges = new ChangesModule();
      const newComments = new CommentsModule();

      initializeChangesWithElements(newChanges, [elem1]);

      const newPersistenceManager = new PersistenceManager(
        {
          localPersistence: persistence,
          translationPersistence: new TranslationPersistence('test-doc'),
          changes: newChanges,
          comments: newComments,
          historyStorage,
          notificationService,
        },
        {
          onDraftRestored: (elements) => {
            restoredElements = elements;
          },
          onCommentsImported: () => {
            commentsImported = true;
          },
          refresh: () => {},
        }
      );

      await newPersistenceManager.restoreLocalDraft();

      // Assert: Both edits and comments restored
      expect(restoredElements[0].content).toBe('Edited content');
      expect(commentsImported).toBe(true);
      const restoredComments = newComments.getCommentsForElement('elem-1');
      expect(restoredComments.length).toBe(2);
    });

    it('should handle comments on edited content', async () => {
      // Arrange: Comment added after edit
      const elem1 = createTestElement('elem-1', 'Original');
      initializeChangesWithElements(changes, [elem1]);

      changes.edit('elem-1', 'First edit');
      changes.edit('elem-1', 'Second edit');
      comments.addComment('elem-1', 'Comment on edited content', 'user-1', 'comment');

      // Act: Save and reload
      persistenceManager.persistDocument();

      changes.clear?.();
      comments.clear?.();
      const newChanges = new ChangesModule();
      const newComments = new CommentsModule();

      initializeChangesWithElements(newChanges, [elem1]);

      const newPersistenceManager = new PersistenceManager(
        {
          localPersistence: persistence,
          translationPersistence: new TranslationPersistence('test-doc'),
          changes: newChanges,
          comments: newComments,
          historyStorage,
          notificationService,
        },
        {
          onDraftRestored: (elements) => {
            restoredElements = elements;
          },
          onCommentsImported: () => {
            commentsImported = true;
          },
          refresh: () => {},
        }
      );

      await newPersistenceManager.restoreLocalDraft();

      // Assert: Content is at correct edit state, comment references correct element
      expect(restoredElements[0].content).toBe('Second edit');
      const restoredComments = newComments.getCommentsForElement('elem-1');
      expect(restoredComments.length).toBe(1);
      expect(restoredComments[0].elementId).toBe('elem-1');
    });

    it('should handle deletion with remaining comments', async () => {
      // Arrange: Element with comments, then deleted
      const elem1 = createTestElement('elem-1', 'Content');
      const elem2 = createTestElement('elem-2', 'Other');
      initializeChangesWithElements(changes, [elem1, elem2]);

      comments.addComment('elem-1', 'This will persist', 'user-1', 'comment');
      changes.delete('elem-1');

      // Act: Save and reload
      persistenceManager.persistDocument();

      changes.clear?.();
      comments.clear?.();
      const newChanges = new ChangesModule();
      const newComments = new CommentsModule();

      initializeChangesWithElements(newChanges, [elem1, elem2]);

      const newPersistenceManager = new PersistenceManager(
        {
          localPersistence: persistence,
          translationPersistence: new TranslationPersistence('test-doc'),
          changes: newChanges,
          comments: newComments,
          historyStorage,
          notificationService,
        },
        {
          onDraftRestored: (elements) => {
            restoredElements = elements;
          },
          onCommentsImported: () => {
            commentsImported = true;
          },
          refresh: () => {},
        }
      );

      await newPersistenceManager.restoreLocalDraft();

      // Assert: Deletion restored, comments still available
      expect(restoredElements.map((e) => e.id)).not.toContain('elem-1');
      const orphanedComments = newComments.getCommentsForElement('elem-1');
      expect(orphanedComments.length).toBe(1);
      expect(orphanedComments[0].content).toBe('This will persist');
    });
  });
});
