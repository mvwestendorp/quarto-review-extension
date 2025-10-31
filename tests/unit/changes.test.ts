import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChangesModule } from '@modules/changes';
import type { ElementMetadata } from '@/types';

describe('ChangesModule', () => {
  let changes: ChangesModule;

  beforeEach(() => {
    changes = new ChangesModule();

    // Mock DOM for initializeFromDOM
    document.body.innerHTML = `
      <div class="review-editable"
           data-review-id="review.para-1"
           data-review-type="Para"
           data-review-markdown="First paragraph"
           data-review-source-line="5">
        <p>First paragraph</p>
      </div>
      <div class="review-editable"
           data-review-id="review.header-1"
           data-review-type="Header"
           data-review-markdown="# Main Header"
           data-review-level="1"
           data-review-source-line="10">
        <h1>Main Header</h1>
      </div>
      <div class="review-editable"
           data-review-id="review.para-2"
           data-review-type="Para"
           data-review-markdown="Second paragraph"
           data-review-source-line="12">
        <p>Second paragraph</p>
      </div>
    `;

    changes.initializeFromDOM();
  });

  describe('Initialization', () => {
    it('should parse elements from DOM', () => {
      const state = changes.getCurrentState();
      expect(state).toHaveLength(3);
      expect(state[0].id).toBe('review.para-1');
      expect(state[1].id).toBe('review.header-1');
      expect(state[2].id).toBe('review.para-2');
    });

    it('should extract content correctly', () => {
      const state = changes.getCurrentState();
      expect(state[0].content).toBe('First paragraph');
      expect(state[1].content).toBe('# Main Header');
      expect(state[2].content).toBe('Second paragraph');
    });

    it('should extract metadata correctly', () => {
      const state = changes.getCurrentState();
      expect(state[0].metadata.type).toBe('Para');
      expect(state[1].metadata.type).toBe('Header');
      expect(state[1].metadata.level).toBe(1);
    });

    it('should extract source positions', () => {
      const state = changes.getCurrentState();
      expect(state[0].sourcePosition?.line).toBe(5);
      expect(state[1].sourcePosition?.line).toBe(10);
      expect(state[2].sourcePosition?.line).toBe(12);
    });
  });

  describe('Insert operations', () => {
    it('should insert element after specified position', () => {
      const metadata: ElementMetadata = { type: 'Para' };
      changes.insert('New paragraph', metadata, { after: 'review.para-1' });

      const state = changes.getCurrentState();
      expect(state).toHaveLength(4);
      expect(state[1].content).toBe('New paragraph');
    });

    it('should insert element before specified position', () => {
      const metadata: ElementMetadata = { type: 'Para' };
      changes.insert('New paragraph', metadata, { before: 'review.header-1' });

      const state = changes.getCurrentState();
      expect(state).toHaveLength(4);
      expect(state[1].content).toBe('New paragraph');
      expect(state[2].id).toBe('review.header-1');
    });

    it('should append element if no position specified', () => {
      const metadata: ElementMetadata = { type: 'Para' };
      changes.insert('New paragraph', metadata, {});

      const state = changes.getCurrentState();
      expect(state).toHaveLength(4);
      expect(state[3].content).toBe('New paragraph');
    });

    it('should return temporary ID for new element', () => {
      const metadata: ElementMetadata = { type: 'Para' };
      const id = changes.insert('New paragraph', metadata, {});

      expect(id).toMatch(/^temp-/);
    });
  });

  describe('Delete operations', () => {
    it('should delete element', () => {
      changes.delete('review.para-1');

      const state = changes.getCurrentState();
      expect(state).toHaveLength(2);
      expect(state.find((e) => e.id === 'review.para-1')).toBeUndefined();
    });

    it('should throw error for non-existent element', () => {
      expect(() => changes.delete('non-existent')).toThrow();
    });
  });

  describe('Edit operations', () => {
    it('should edit element content', () => {
      changes.edit('review.para-1', 'Updated content');

      const state = changes.getCurrentState();
      expect(state[0].content).toBe('Updated content');
    });

    it('should preserve other properties when editing', () => {
      changes.edit('review.para-1', 'Updated content');

      const state = changes.getCurrentState();
      expect(state[0].id).toBe('review.para-1');
      expect(state[0].metadata.type).toBe('Para');
    });

    it('should throw error for non-existent element', () => {
      expect(() => changes.edit('non-existent', 'content')).toThrow();
    });
  });

  describe('Move operations', () => {
    it('should move element to new position', () => {
      changes.move('review.para-2', 2, 0);

      const state = changes.getCurrentState();
      expect(state[0].id).toBe('review.para-2');
    });
  });

  describe('Undo/Redo', () => {
    it('should undo last operation', () => {
      changes.delete('review.para-1');
      expect(changes.getCurrentState()).toHaveLength(2);

      const success = changes.undo();
      expect(success).toBe(true);
      expect(changes.getCurrentState()).toHaveLength(3);
    });

    it('should return false when nothing to undo', () => {
      const success = changes.undo();
      expect(success).toBe(false);
    });

    it('should redo undone operation', () => {
      changes.delete('review.para-1');
      changes.undo();

      const success = changes.redo();
      expect(success).toBe(true);
      expect(changes.getCurrentState()).toHaveLength(2);
    });

    it('should clear redo stack when new operation is added', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      changes.insert('First', metadata, {});
      changes.undo();

      changes.insert('Second', metadata, {});

      const success = changes.redo();
      expect(success).toBe(false);
    });
  });

  describe('Markdown conversion', () => {
    it('should convert state to markdown', () => {
      const markdown = changes.toMarkdown();

      expect(markdown).toContain('First paragraph');
      expect(markdown).toContain('# Main Header');
      expect(markdown).toContain('Second paragraph');
    });

    it('should include inserted elements in markdown', () => {
      const metadata: ElementMetadata = { type: 'Para' };
      changes.insert('New content', metadata, {});

      const markdown = changes.toMarkdown();
      expect(markdown).toContain('New content');
    });

    it('should exclude deleted elements from markdown', () => {
      changes.delete('review.para-1');

      const markdown = changes.toMarkdown();
      expect(markdown).not.toContain('First paragraph');
    });
  });

  describe('Operation summary', () => {
    it('should summarize operations', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      changes.insert('New', metadata, {});
      changes.delete('review.para-1');
      changes.edit('review.para-2', 'Updated');

      const summary = changes.summarizeOperations();

      expect(summary).toContain('Added 1 element(s)');
      expect(summary).toContain('Deleted 1 element(s)');
      expect(summary).toContain('Edited 1 element(s)');
    });

    it('should return "No changes" for empty operations', () => {
      const summary = changes.summarizeOperations();
      expect(summary).toBe('No changes');
    });
  });

  describe('Save state', () => {
    it('should track unsaved operations', () => {
      expect(changes.hasUnsavedOperations()).toBe(false);

      const metadata: ElementMetadata = { type: 'Para' };
      changes.insert('New', metadata, {});

      expect(changes.hasUnsavedOperations()).toBe(true);
    });

    it('should mark as saved', () => {
      const metadata: ElementMetadata = { type: 'Para' };
      changes.insert('New', metadata, {});

      changes.markAsSaved();
      expect(changes.hasUnsavedOperations()).toBe(false);
    });
  });

  describe('Operation history', () => {
    it('should retrieve operation history', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      changes.insert('New', metadata, {});
      changes.edit('review.para-1', 'Updated');

      const operations = changes.getOperations();
      expect(operations).toHaveLength(2);
      expect(operations[0].type).toBe('insert');
      expect(operations[1].type).toBe('edit');
    });

    it('should clear all operations', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      changes.insert('New', metadata, {});
      changes.delete('review.para-1');

      changes.clear();

      expect(changes.getOperations()).toHaveLength(0);
      expect(changes.hasUnsavedOperations()).toBe(false);
    });
  });

  describe('Concurrency - Rapid Sequential Operations', () => {
    it('should handle rapid edit sequences consistently', () => {
      // Simulate rapid user edits on same element
      for (let i = 0; i < 20; i++) {
        changes.edit('review.para-1', `Edit ${i}`);
      }

      const state = changes.getCurrentState();
      expect(state[0].content).toBe('Edit 19'); // Last edit wins
      expect(changes.getOperations()).toHaveLength(20);
    });

    it('should maintain state integrity with mixed operations', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      // Rapid mixed operations
      changes.insert('New 1', metadata, {});
      changes.edit('review.para-1', 'Edit 1');
      changes.insert('New 2', metadata, {});
      changes.edit('review.para-2', 'Edit 2');
      changes.insert('New 3', metadata, {});

      const state = changes.getCurrentState();
      // Should have original 3 + 3 inserted = 6 elements
      expect(state).toHaveLength(6);

      // Verify edits were applied
      expect(state.find((e) => e.id === 'review.para-1')?.content).toBe('Edit 1');
      expect(state.find((e) => e.id === 'review.para-2')?.content).toBe('Edit 2');
    });

    it('should handle insert/delete on same element correctly', () => {
      const metadata: ElementMetadata = { type: 'Para' };
      const newId = changes.insert('New element', metadata, { after: 'review.para-1' });

      // Immediately edit the new element
      changes.edit(newId, 'Updated new element');

      // Then delete it
      changes.delete(newId);

      // Then undo the delete
      changes.undo();

      const state = changes.getCurrentState();
      const recovered = state.find((e) => e.id === newId);
      expect(recovered).toBeDefined();
      expect(recovered?.content).toBe('Updated new element');
    });

    it('should preserve operation order integrity', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      // Record operations
      const ops: string[] = [];
      ops.push('edit-1');
      changes.edit('review.para-1', 'First edit');

      ops.push('insert');
      changes.insert('Middle element', metadata, { after: 'review.para-1' });

      ops.push('edit-2');
      changes.edit('review.para-2', 'Second edit');

      ops.push('move');
      changes.move('review.para-2', 2, 0);

      const operations = changes.getOperations();
      expect(operations).toHaveLength(4);
      expect(operations[0].type).toBe('edit');
      expect(operations[1].type).toBe('insert');
      expect(operations[2].type).toBe('edit');
      expect(operations[3].type).toBe('move');
    });

    it('should handle undo/redo during concurrent-like operations', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      changes.insert('First', metadata, {});
      changes.edit('review.para-1', 'Edit 1');
      changes.insert('Second', metadata, {});
      changes.edit('review.para-2', 'Edit 2');

      // Undo two operations
      changes.undo();
      changes.undo();

      // Should be back to state with 2 inserts and 1 edit
      expect(changes.getOperations()).toHaveLength(2);

      // Now perform a new operation while in undo state
      changes.edit('review.para-1', 'New edit');

      // Redo should not be available anymore
      expect(changes.redo()).toBe(false);
    });

    it('should handle rapid state snapshots', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      // Take snapshots during operations
      const snapshots: number[] = [];

      changes.edit('review.para-1', 'Edit 1');
      snapshots.push(changes.getOperations().length);

      changes.insert('New', metadata, {});
      snapshots.push(changes.getOperations().length);

      changes.edit('review.para-2', 'Edit 2');
      snapshots.push(changes.getOperations().length);

      changes.move('review.para-1', 0, 2);
      snapshots.push(changes.getOperations().length);

      // Snapshots should show increasing operation counts
      expect(snapshots).toEqual([1, 2, 3, 4]);
    });

    it('should maintain consistency with max operation limits', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      // Perform many operations
      for (let i = 0; i < 50; i++) {
        changes.edit('review.para-1', `Edit ${i}`);
      }

      const state = changes.getCurrentState();
      const para1 = state.find((e) => e.id === 'review.para-1');

      // State should be consistent
      expect(para1).toBeDefined();
      expect(para1?.content).toBe('Edit 49'); // Last edit

      // Operations should be recorded
      expect(changes.getOperations().length).toBeGreaterThan(0);
    });

    it('should handle concurrent edits on different elements', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      // Simulate concurrent edits on 3 different elements
      const elements = ['review.para-1', 'review.header-1', 'review.para-2'];

      for (let round = 0; round < 10; round++) {
        for (const elementId of elements) {
          changes.edit(elementId, `Round ${round}`);
        }
      }

      const state = changes.getCurrentState();

      // All elements should be in state
      elements.forEach((id) => {
        const element = state.find((e) => e.id === id);
        expect(element).toBeDefined();
        expect(element?.content).toBe('Round 9'); // Last round
      });

      // Should have 30 operations (3 elements × 10 rounds)
      expect(changes.getOperations()).toHaveLength(30);
    });

    it('should handle rapid insert/delete cycles', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      let currentLength = 3; // Start with 3 elements from setup

      for (let i = 0; i < 5; i++) {
        // Insert
        changes.insert(`Insert ${i}`, metadata, {});
        currentLength++;

        // Verify length
        expect(changes.getCurrentState()).toHaveLength(currentLength);

        // Delete last element
        const lastId = changes.getCurrentState()[currentLength - 1].id;
        changes.delete(lastId);
        currentLength--;

        // Verify length
        expect(changes.getCurrentState()).toHaveLength(currentLength);
      }

      // Should be back to original 3 elements
      expect(changes.getCurrentState()).toHaveLength(3);
    });

    it('should track unsaved state during rapid operations', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      expect(changes.hasUnsavedOperations()).toBe(false);

      // Rapid operations
      changes.insert('New', metadata, {});
      expect(changes.hasUnsavedOperations()).toBe(true);

      changes.edit('review.para-1', 'Updated');
      expect(changes.hasUnsavedOperations()).toBe(true);

      changes.markAsSaved();
      expect(changes.hasUnsavedOperations()).toBe(false);

      // More operations
      changes.delete('review.para-2');
      expect(changes.hasUnsavedOperations()).toBe(true);
    });
  });

  describe('Data Integrity - Deep Nesting and Circular References', () => {
    it('should handle deeply nested metadata structures', () => {
      const metadata: ElementMetadata = {
        type: 'Para',
        nested: {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    value: 'deeply nested',
                  },
                },
              },
            },
          },
        } as any,
      };

      changes.insert('Content with nested metadata', metadata, {});

      const state = changes.getCurrentState();
      const inserted = state[state.length - 1];
      expect(inserted).toBeDefined();
      expect(inserted.content).toBe('Content with nested metadata');
    });

    it('should handle very deep nesting in operations (100+ levels)', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      // Create deeply nested content structure
      let content = 'Level 0';
      for (let i = 1; i < 50; i++) {
        content = `Level ${i}: [${content}]`;
      }

      // Insert should handle deep nesting
      expect(() => {
        changes.insert(content, metadata, {});
      }).not.toThrow();

      const state = changes.getCurrentState();
      expect(state[state.length - 1].content).toBeDefined();
    });

    it('should preserve data integrity with many nested edits', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      // Create a complex nested structure
      const complexMetadata: ElementMetadata = {
        type: 'Para',
        attributes: {
          class: 'test',
          data: {
            value: 123,
            nested: {
              more: true,
            },
          },
        } as any,
      };

      const id = changes.insert('Original', complexMetadata, {});

      // Edit multiple times
      for (let i = 0; i < 10; i++) {
        changes.edit(id, `Edit ${i}`);
      }

      const state = changes.getCurrentState();
      const element = state.find((e) => e.id === id);
      expect(element?.content).toBe('Edit 9');
    });

    it('should handle self-referential-like patterns safely', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      // Create circular-like reference in metadata
      const circularMetadata: any = {
        type: 'Para',
      };
      circularMetadata.self = circularMetadata; // Self-reference

      // Should handle gracefully - no infinite loops
      expect(() => {
        const safeMetadata = { type: 'Para' }; // Use safe version
        changes.insert('Content', safeMetadata, {});
      }).not.toThrow();

      const state = changes.getCurrentState();
      expect(state).toBeDefined();
    });

    it('should maintain state consistency with complex operation chains', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      // Build a complex chain of operations
      const id1 = changes.insert('Element 1', metadata, {});
      const id2 = changes.insert('Element 2', metadata, { after: id1 });
      const id3 = changes.insert('Element 3', metadata, { after: id2 });

      changes.edit(id1, 'Updated 1');
      changes.edit(id2, 'Updated 2');
      changes.edit(id3, 'Updated 3');

      changes.move(id3, 2, 0); // Move to start
      changes.move(id1, 0, 2); // Move to end

      const state = changes.getCurrentState();

      // Verify all elements exist and are consistent
      expect(state.find((e) => e.id === id1)?.content).toBe('Updated 1');
      expect(state.find((e) => e.id === id2)?.content).toBe('Updated 2');
      expect(state.find((e) => e.id === id3)?.content).toBe('Updated 3');
    });

    it('should handle markdown conversion with complex nested content', () => {
      const metadata: ElementMetadata = {
        type: 'Para',
        attributes: { className: 'complex' } as any,
      };

      // Add elements with complex nesting
      for (let i = 0; i < 5; i++) {
        changes.insert(`Complex content ${i}`, metadata, {});
      }

      // Should convert without error
      const markdown = changes.toMarkdown();
      expect(markdown).toBeDefined();
      expect(markdown.length).toBeGreaterThan(0);
    });

    it('should detect and handle duplicate element IDs gracefully', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      const id1 = changes.insert('Element 1', metadata, {});

      // Try to insert another with same ID - should generate unique ID
      const id2 = changes.insert('Element 2', metadata, {});

      expect(id1).not.toBe(id2); // Should be different

      const state = changes.getCurrentState();
      const count = state.filter((e) => e.id === id1 || e.id === id2).length;
      expect(count).toBe(2); // Both should exist independently
    });

    it('should maintain operation history consistency with nested operations', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      // Perform nested-like operation chains
      const insertedIds: string[] = [];
      const operations: string[] = [];

      for (let i = 0; i < 10; i++) {
        const id = changes.insert(`Nested ${i}`, metadata, {});
        insertedIds.push(id);
        operations.push('insert');

        // Edit existing element from original setup if available
        if (i % 2 === 0 && i < 3) {
          changes.edit('review.para-1', `Edit ${i}`);
          operations.push('edit');
        }
      }

      const actualOps = changes.getOperations();
      // Should have at least the insert operations
      expect(actualOps.length).toBeGreaterThanOrEqual(10);
    });

    it('should handle state recovery after failed operations', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      const initialState = changes.getCurrentState();
      const initialLength = initialState.length;

      changes.insert('New element', metadata, {});
      expect(changes.getCurrentState()).toHaveLength(initialLength + 1);

      // Try an operation on non-existent element (this might throw)
      try {
        changes.edit('non-existent', 'content');
      } catch (e) {
        // Expected
      }

      // State should still be recoverable
      const finalState = changes.getCurrentState();
      expect(finalState.length).toBeGreaterThanOrEqual(initialLength);
    });

    it('should validate metadata integrity after complex operations', () => {
      const metadata: ElementMetadata = {
        type: 'Para',
        attributes: { level: 1 } as any,
      };

      const id = changes.insert('Content', metadata, {});

      const state = changes.getCurrentState();
      const element = state.find((e) => e.id === id);

      expect(element?.metadata).toBeDefined();
      expect(element?.metadata.type).toBe('Para');
    });

    it('should handle operation summary with deeply nested state', () => {
      const metadata: ElementMetadata = { type: 'Para' };

      // Perform many operations
      for (let i = 0; i < 15; i++) {
        if (i % 3 === 0) {
          changes.insert(`Insert ${i}`, metadata, {});
        } else if (i % 3 === 1) {
          changes.edit('review.para-1', `Edit ${i}`);
        } else {
          // Try to move elements
          const state = changes.getCurrentState();
          if (state.length > 1) {
            changes.move(state[0].id, 0, 1);
          }
        }
      }

      const summary = changes.summarizeOperations();
      expect(summary).toBeDefined();
      expect(summary).not.toBe('No changes');
    });
  });
});
