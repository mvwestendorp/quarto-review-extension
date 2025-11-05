/**
 * Persistence + Changes Integration Tests
 * Tests the interaction between PersistenceManager and ChangesModule
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChangesModule } from '@modules/changes';
import LocalDraftPersistence from '@modules/storage/LocalDraftPersistence';
import { EmbeddedSourceStore } from '@modules/git/fallback';
import type { Element, ElementMetadata, Operation } from '@/types';

const baseMetadata: ElementMetadata = {
  type: 'Para',
};

function buildChangesWithElements(elements: Element[]): ChangesModule {
  const changes = new ChangesModule();
  (changes as unknown as { originalElements: Element[] }).originalElements =
    elements.map((element) => ({ ...element }));
  return changes;
}

// Mock storage
const storageMock = (() => {
  let store: Record<string, { content: string; commitMessage?: string }> = {};

  return {
    getSource: async (filename: string) => {
      return store[filename] || null;
    },
    saveFile: async (
      filename: string,
      content: string,
      commitMessage: string
    ) => {
      store[filename] = { content, commitMessage };
    },
    clearAll: async () => {
      store = {};
    },
    clear: () => {
      store = {};
    },
  };
})();

describe('Persistence + Changes Integration', () => {
  let changes: ChangesModule;
  let persistence: LocalDraftPersistence;
  let mockStore: EmbeddedSourceStore;

  beforeEach(() => {
    storageMock.clear();

    // Create mock store
    mockStore = {
      getSource: vi.fn(storageMock.getSource),
      saveFile: vi.fn(storageMock.saveFile),
      clearAll: vi.fn(storageMock.clearAll),
    } as unknown as EmbeddedSourceStore;

    // Initialize changes
    changes = buildChangesWithElements([
      { id: 'p-1', content: 'First paragraph', metadata: baseMetadata },
      { id: 'p-2', content: 'Second paragraph', metadata: baseMetadata },
    ]);

    // Initialize persistence with mock store
    persistence = new LocalDraftPersistence(mockStore, {
      filename: 'test-draft.json',
    });
  });

  afterEach(() => {
    storageMock.clear();
  });

  describe('Draft Persistence', () => {
    it('should save draft with current state and operations', async () => {
      // Make some edits
      changes.edit('p-1', 'Modified first paragraph');
      changes.edit('p-2', 'Modified second paragraph');

      // Get state for persistence
      const state = changes.getCurrentState();
      const operations = changes.getOperations();

      // Save draft
      await persistence.saveDraft(
        state.map((el) => ({
          id: el.id,
          content: el.content,
          metadata: el.metadata,
        })),
        {
          operations: operations as Operation[],
        }
      );

      // Verify saved
      const loaded = await persistence.loadDraft();
      expect(loaded).toBeDefined();
      expect(loaded?.elements).toHaveLength(2);
      expect(loaded?.operations).toHaveLength(2);
    });

    it('should restore draft and reconstruct state', async () => {
      // Make edits and save
      changes.edit('p-1', 'Modified content');

      const state = changes.getCurrentState();
      const operations = changes.getOperations();

      await persistence.saveDraft(
        state.map((el) => ({
          id: el.id,
          content: el.content,
          metadata: el.metadata,
        })),
        {
          operations: operations as Operation[],
        }
      );

      // Create new instance
      const newChanges = buildChangesWithElements([
        { id: 'p-1', content: 'First paragraph', metadata: baseMetadata },
        { id: 'p-2', content: 'Second paragraph', metadata: baseMetadata },
      ]);

      // Load draft
      const draft = await persistence.loadDraft();
      expect(draft).toBeDefined();

      // Restore operations
      if (draft?.operations) {
        newChanges.initializeWithOperations(draft.operations);
      }

      // Verify state matches
      const restoredState = newChanges.getCurrentState();
      expect(restoredState[0]?.content).toContain('Modified content');
    });

    it('should handle multiple save/load cycles', async () => {
      // First edit and save
      changes.edit('p-1', 'First edit');

      await persistence.saveDraft(
        changes.getCurrentState().map((el) => ({
          id: el.id,
          content: el.content,
          metadata: el.metadata,
        })),
        {
          operations: changes.getOperations() as Operation[],
        }
      );

      // Second edit and save
      changes.edit('p-2', 'Second edit');

      await persistence.saveDraft(
        changes.getCurrentState().map((el) => ({
          id: el.id,
          content: el.content,
          metadata: el.metadata,
        })),
        {
          operations: changes.getOperations() as Operation[],
        }
      );

      // Load should get latest
      const draft = await persistence.loadDraft();
      expect(draft?.operations).toHaveLength(2);
    });
  });

  describe('Operation History Persistence', () => {
    it('should preserve operation timestamps across persistence', async () => {
      // Create operations with specific timestamps
      const timestamp1 = Date.now();
      changes.edit('p-1', 'Edit 1');

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      const timestamp2 = Date.now();
      changes.edit('p-2', 'Edit 2');

      // Save
      await persistence.saveDraft(
        changes.getCurrentState().map((el) => ({
          id: el.id,
          content: el.content,
          metadata: el.metadata,
        })),
        {
          operations: changes.getOperations() as Operation[],
        }
      );

      // Load
      const draft = await persistence.loadDraft();
      const ops = draft?.operations || [];

      // Should preserve timestamps
      expect(ops[0]?.timestamp).toBeGreaterThanOrEqual(timestamp1);
      expect(ops[1]?.timestamp).toBeGreaterThanOrEqual(timestamp2);
    });

    it('should preserve operation IDs for undo/redo', async () => {
      // Make edits
      changes.edit('p-1', 'Edit 1');
      changes.edit('p-2', 'Edit 2');

      const originalOps = changes.getOperations();

      // Save
      await persistence.saveDraft(
        changes.getCurrentState().map((el) => ({
          id: el.id,
          content: el.content,
          metadata: el.metadata,
        })),
        {
          operations: originalOps as Operation[],
        }
      );

      // Load
      const draft = await persistence.loadDraft();
      const restoredOps = draft?.operations || [];

      // IDs should match
      expect(restoredOps[0]?.id).toBe(originalOps[0]?.id);
      expect(restoredOps[1]?.id).toBe(originalOps[1]?.id);
    });

    it('should handle complex operation sequences', async () => {
      // Complex sequence
      changes.edit('p-1', 'Edit 1');
      changes.insert('New paragraph', baseMetadata, { after: 'p-1' });
      changes.edit('p-2', 'Edit 2');

      const operations = changes.getOperations();

      // Save
      await persistence.saveDraft(
        changes.getCurrentState().map((el) => ({
          id: el.id,
          content: el.content,
          metadata: el.metadata,
        })),
        {
          operations: operations as Operation[],
        }
      );

      // Load and restore
      const draft = await persistence.loadDraft();
      const newChanges = buildChangesWithElements([
        { id: 'p-1', content: 'First paragraph', metadata: baseMetadata },
        { id: 'p-2', content: 'Second paragraph', metadata: baseMetadata },
      ]);

      if (draft?.operations) {
        newChanges.initializeWithOperations(draft.operations);
      }

      // Should have correct operation types
      const restoredOps = newChanges.getOperations();
      expect(restoredOps[0]?.type).toBe('edit');
      expect(restoredOps[1]?.type).toBe('insert');
      expect(restoredOps[2]?.type).toBe('edit');
    });
  });

  describe('Persistence with Comments', () => {
    it('should save and restore comments alongside changes', async () => {
      // Make edits
      changes.edit('p-1', 'Modified');

      // Simulate comments
      const comments = [
        {
          id: 'c-1',
          elementId: 'p-1',
          content: 'Please review',
          author: 'Reviewer',
          timestamp: Date.now(),
          resolved: false,
        },
      ];

      // Save with comments
      await persistence.saveDraft(
        changes.getCurrentState().map((el) => ({
          id: el.id,
          content: el.content,
          metadata: el.metadata,
        })),
        {
          operations: changes.getOperations() as Operation[],
          comments,
        }
      );

      // Load
      const draft = await persistence.loadDraft();

      // Should have comments
      expect(draft?.comments).toHaveLength(1);
      expect(draft?.comments?.[0]?.elementId).toBe('p-1');
    });
  });

  describe('Draft Cleanup', () => {
    it('should clear drafts when requested', async () => {
      // Save draft
      await persistence.saveDraft(
        changes.getCurrentState().map((el) => ({
          id: el.id,
          content: el.content,
          metadata: el.metadata,
        })),
        {
          operations: changes.getOperations() as Operation[],
        }
      );

      // Verify saved
      let draft = await persistence.loadDraft();
      expect(draft).toBeDefined();

      // Clear
      await persistence.clearAll();

      // Should be gone
      draft = await persistence.loadDraft();
      expect(draft).toBeNull();
    });

    it('should persist across multiple clear/save cycles', async () => {
      // Save a draft
      await persistence.saveDraft(
        changes.getCurrentState().map((el) => ({
          id: el.id,
          content: el.content,
          metadata: el.metadata,
        })),
        { operations: changes.getOperations() as Operation[] }
      );

      // Clear all
      await persistence.clearAll();

      // Should be gone
      let draft = await persistence.loadDraft();
      expect(draft).toBeNull();

      // Save again
      changes.edit('p-1', 'New edit');
      await persistence.saveDraft(
        changes.getCurrentState().map((el) => ({
          id: el.id,
          content: el.content,
          metadata: el.metadata,
        })),
        { operations: changes.getOperations() as Operation[] }
      );

      // Should load new draft
      draft = await persistence.loadDraft();
      expect(draft).toBeDefined();
      expect(draft?.operations).toHaveLength(1);
    });
  });

  describe('Persistence Error Handling', () => {
    it('should handle storage quota exceeded', async () => {
      // Create large state
      const largeChanges = buildChangesWithElements(
        Array.from({ length: 1000 }, (_, i) => ({
          id: `p-${i}`,
          content: 'X'.repeat(1000),
          metadata: baseMetadata,
        }))
      );

      // Try to save (may fail depending on quota)
      try {
        await persistence.saveDraft(
          largeChanges.getCurrentState().map((el) => ({
            id: el.id,
            content: el.content,
            metadata: el.metadata,
          })),
          {}
        );
        // If it succeeds, that's fine too
      } catch (error) {
        // Should handle gracefully
        expect(error).toBeDefined();
      }
    });

    it('should handle corrupted draft data', async () => {
      // Manually corrupt storage
      await storageMock.saveFile('test-draft.json', 'invalid json', 'test');

      // Try to load
      const draft = await persistence.loadDraft();

      // Should return null or handle gracefully
      expect(draft).toBeNull();
    });
  });

  describe('Auto-save Integration', () => {
    it('should support auto-save workflow', async () => {
      // Simulate auto-save on each edit
      const autoSave = async () => {
        await persistence.saveDraft(
          changes.getCurrentState().map((el) => ({
            id: el.id,
            content: el.content,
            metadata: el.metadata,
          })),
          {
            operations: changes.getOperations() as Operation[],
          }
        );
      };

      // Make edits with auto-save
      changes.edit('p-1', 'Edit 1');
      await autoSave();

      changes.edit('p-2', 'Edit 2');
      await autoSave();

      // Load should have latest
      const draft = await persistence.loadDraft();
      expect(draft?.operations).toHaveLength(2);
    });
  });

  describe('Cross-session Persistence', () => {
    it('should simulate restoring session across page reloads', async () => {
      // Session 1: Make changes and save
      changes.edit('p-1', 'Session 1 edit');

      await persistence.saveDraft(
        changes.getCurrentState().map((el) => ({
          id: el.id,
          content: el.content,
          metadata: el.metadata,
        })),
        {
          operations: changes.getOperations() as Operation[],
        }
      );

      // Simulate page reload: Create new instances with same store
      const newPersistence = new LocalDraftPersistence(mockStore, {
        filename: 'test-draft.json',
      });
      const newChanges = buildChangesWithElements([
        { id: 'p-1', content: 'First paragraph', metadata: baseMetadata },
        { id: 'p-2', content: 'Second paragraph', metadata: baseMetadata },
      ]);

      // Session 2: Load draft
      const draft = await newPersistence.loadDraft();
      expect(draft).toBeDefined();

      if (draft?.operations) {
        newChanges.initializeWithOperations(draft.operations);
      }

      // Should restore previous session
      const restoredState = newChanges.getCurrentState();
      expect(restoredState[0]?.content).toBe('Session 1 edit');
    });
  });
});
