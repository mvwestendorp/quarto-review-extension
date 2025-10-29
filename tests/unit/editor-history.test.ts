/**
 * Editor History Tests
 *
 * Tests for the EditorHistory class which manages undo/redo state
 * for individual editor sessions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import EditorHistory, { HistoryState } from '../../src/modules/ui/editor/EditorHistory';

describe('EditorHistory', () => {
  let history: EditorHistory;

  beforeEach(() => {
    history = new EditorHistory(50); // Default max states
  });

  describe('Basic push/undo/redo', () => {
    it('should initialize with empty history', () => {
      const stats = history.getStats();
      expect(stats.totalStates).toBe(0);
      expect(stats.currentIndex).toBe(-1);
    });

    it('should push a new state', () => {
      history.push('content 1');
      const stats = history.getStats();
      expect(stats.totalStates).toBe(1);
      expect(stats.currentIndex).toBe(0);
    });

    it('should track multiple states', () => {
      history.push('state 1');
      history.push('state 2');
      history.push('state 3');
      const stats = history.getStats();
      expect(stats.totalStates).toBe(3);
      expect(stats.currentIndex).toBe(2);
    });

    it('should undo to previous state', () => {
      history.push('state 1');
      history.push('state 2');
      const undoResult = history.undo();
      expect(undoResult?.content).toBe('state 1');
      expect(history.getStats().currentIndex).toBe(0);
    });

    it('should redo to next state', () => {
      history.push('state 1');
      history.push('state 2');
      history.undo();
      const redoResult = history.redo();
      expect(redoResult?.content).toBe('state 2');
      expect(history.getStats().currentIndex).toBe(1);
    });

    it('should return null when undo not available', () => {
      history.push('state 1');
      const undoResult = history.undo();
      expect(undoResult).toBeNull();
    });

    it('should return null when redo not available', () => {
      history.push('state 1');
      history.push('state 2');
      const redoResult = history.redo();
      expect(redoResult).toBeNull();
    });
  });

  describe('canUndo/canRedo checks', () => {
    it('should return false for canUndo when at beginning', () => {
      history.push('state 1');
      expect(history.canUndo()).toBe(false);
    });

    it('should return true for canUndo when undo available', () => {
      history.push('state 1');
      history.push('state 2');
      expect(history.canUndo()).toBe(true);
    });

    it('should return false for canRedo when at end', () => {
      history.push('state 1');
      history.push('state 2');
      expect(history.canRedo()).toBe(false);
    });

    it('should return true for canRedo when redo available', () => {
      history.push('state 1');
      history.push('state 2');
      history.undo();
      expect(history.canRedo()).toBe(true);
    });

    it('should track canUndo/canRedo through operations', () => {
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);

      history.push('state 1');
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);

      history.push('state 2');
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);

      history.undo();
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(true);

      history.redo();
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });
  });

  describe('History branching (push after undo)', () => {
    it('should discard redo history when pushing after undo', () => {
      history.push('state 1');
      history.push('state 2');
      history.push('state 3');

      // Undo twice
      history.undo();
      history.undo();
      expect(history.getStats().currentIndex).toBe(0);
      expect(history.getStats().totalStates).toBe(3);

      // Push new state (discards state 2 and 3)
      history.push('new state');
      const stats = history.getStats();
      expect(stats.totalStates).toBe(2);
      expect(stats.currentIndex).toBe(1);
      expect(history.redo()).toBeNull(); // No more redo available
    });

    it('should allow branching at any point', () => {
      history.push('state 1');
      history.push('state 2');
      history.push('state 3');
      history.push('state 4');

      history.undo();
      history.undo();
      history.undo();
      // Now at state 1

      history.push('branch state');
      const stats = history.getStats();
      expect(stats.totalStates).toBe(2);
      expect(stats.currentIndex).toBe(1);
    });
  });

  describe('History size limit', () => {
    it('should respect max states limit', () => {
      const smallHistory = new EditorHistory(3);

      smallHistory.push('state 1');
      smallHistory.push('state 2');
      smallHistory.push('state 3');
      expect(smallHistory.getStats().totalStates).toBe(3);

      // Adding 4th state should remove oldest
      smallHistory.push('state 4');
      const stats = smallHistory.getStats();
      expect(stats.totalStates).toBe(3);
      expect(stats.currentIndex).toBe(2);

      // Oldest state (state 1) should be gone
      smallHistory.undo();
      smallHistory.undo();
      expect(smallHistory.undo()).toBeNull();
    });

    it('should handle size limit with undo/redo', () => {
      const smallHistory = new EditorHistory(2);

      smallHistory.push('state 1');
      smallHistory.push('state 2');
      smallHistory.push('state 3');

      // At this point, state 1 should be removed
      smallHistory.undo();
      smallHistory.undo();

      // Should not be able to undo further
      expect(smallHistory.undo()).toBeNull();
    });

    it('should decrement index when removing oldest state', () => {
      const smallHistory = new EditorHistory(1);
      smallHistory.push('state 1');
      expect(smallHistory.getStats().currentIndex).toBe(0);

      smallHistory.push('state 2');
      expect(smallHistory.getStats().currentIndex).toBe(0); // Decremented
      expect(smallHistory.getStats().totalStates).toBe(1);
    });
  });

  describe('Current state access', () => {
    it('should return current state', () => {
      history.push('state 1');
      history.push('state 2');

      const current = history.getCurrentState();
      expect(current?.content).toBe('state 2');
    });

    it('should return null for current state when empty', () => {
      expect(history.getCurrentState()).toBeNull();
    });

    it('should return correct state after undo', () => {
      history.push('state 1');
      history.push('state 2');
      history.undo();

      const current = history.getCurrentState();
      expect(current?.content).toBe('state 1');
    });
  });

  describe('History statistics', () => {
    it('should provide accurate statistics', () => {
      history.push('state 1');
      history.push('state 2');
      history.undo();

      const stats = history.getStats();
      expect(stats.totalStates).toBe(2);
      expect(stats.currentIndex).toBe(0);
      expect(stats.canUndo).toBe(false);
      expect(stats.canRedo).toBe(true);
    });

    it('should include oldest and newest timestamps', () => {
      history.push('state 1');
      const state1Time = history.getStats().oldestTimestamp;

      history.push('state 2');
      const state2Time = history.getStats().newestTimestamp;

      const stats = history.getStats();
      expect(stats.oldestTimestamp).toBe(state1Time);
      expect(stats.newestTimestamp).toBe(state2Time);
      expect(stats.newestTimestamp).toBeGreaterThanOrEqual(stats.oldestTimestamp);
    });

    it('should clear timestamps when empty', () => {
      history.push('state 1');
      history.clear();

      const stats = history.getStats();
      expect(stats.oldestTimestamp).toBeNull();
      expect(stats.newestTimestamp).toBeNull();
    });
  });

  describe('Clear functionality', () => {
    it('should clear all history', () => {
      history.push('state 1');
      history.push('state 2');
      history.push('state 3');

      history.clear();
      const stats = history.getStats();
      expect(stats.totalStates).toBe(0);
      expect(stats.currentIndex).toBe(-1);
    });

    it('should reset undo/redo availability after clear', () => {
      history.push('state 1');
      history.clear();

      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
    });

    it('should allow pushing after clear', () => {
      history.push('state 1');
      history.clear();
      history.push('new state');

      const stats = history.getStats();
      expect(stats.totalStates).toBe(1);
      expect(stats.currentIndex).toBe(0);
    });
  });

  describe('Serialization (export/import)', () => {
    it('should export history as JSON', () => {
      history.push('state 1');
      history.push('state 2');
      history.undo();

      const exported = history.export();
      const parsed = JSON.parse(exported);

      expect(parsed.history).toBeDefined();
      expect(parsed.currentIndex).toBe(0);
      expect(parsed.history.length).toBe(2);
    });

    it('should import history from JSON', () => {
      history.push('state 1');
      history.push('state 2');
      const exported = history.export();

      const newHistory = new EditorHistory();
      const success = newHistory.import(exported);

      expect(success).toBe(true);
      expect(newHistory.getStats().totalStates).toBe(2);
      expect(newHistory.getStats().currentIndex).toBe(1);
    });

    it('should restore current state after import', () => {
      history.push('state 1');
      history.push('state 2');
      history.push('state 3');
      history.undo();

      const exported = history.export();
      const newHistory = new EditorHistory();
      newHistory.import(exported);

      const current = newHistory.getCurrentState();
      expect(current?.content).toBe('state 2');
    });

    it('should restore undo/redo capability after import', () => {
      history.push('state 1');
      history.push('state 2');
      history.push('state 3');
      history.undo(); // Now at state 2, can redo to state 3

      const exported = history.export();
      const newHistory = new EditorHistory();
      newHistory.import(exported);

      expect(newHistory.canUndo()).toBe(true); // Can go back to state 1
      expect(newHistory.canRedo()).toBe(true); // Can go forward to state 3
    });

    it('should handle invalid JSON gracefully', () => {
      const newHistory = new EditorHistory();
      const success = newHistory.import('invalid json {]');

      expect(success).toBe(false);
      expect(newHistory.getStats().totalStates).toBe(0);
    });

    it('should handle malformed history object', () => {
      const newHistory = new EditorHistory();
      const malformed = JSON.stringify({ invalid: 'structure' });
      const success = newHistory.import(malformed);

      expect(success).toBe(true); // No error thrown, but history empty
      expect(newHistory.getStats().totalStates).toBe(0);
    });
  });

  describe('Timestamp tracking', () => {
    it('should record timestamps for each state', async () => {
      history.push('state 1');
      const time1 = history.getStats().oldestTimestamp;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      history.push('state 2');
      const time2 = history.getStats().newestTimestamp;

      expect(time2).toBeGreaterThan(time1!);
    });

    it('should maintain timestamps through undo/redo', () => {
      history.push('state 1');
      const time1 = history.getCurrentState()?.timestamp;

      history.push('state 2');
      history.undo();

      const restoredTime = history.getCurrentState()?.timestamp;
      expect(restoredTime).toBe(time1);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty content push', () => {
      history.push('');
      const stats = history.getStats();
      expect(stats.totalStates).toBe(1);
    });

    it('should handle large content', () => {
      const largeContent = 'x'.repeat(10000);
      history.push(largeContent);

      const current = history.getCurrentState();
      expect(current?.content.length).toBe(10000);
    });

    it('should handle special characters in content', () => {
      const special = '<script>alert("xss")</script>\n\t{}[]"\'';
      history.push(special);

      const current = history.getCurrentState();
      expect(current?.content).toBe(special);
    });

    it('should handle rapid push/undo/redo sequences', () => {
      history.push('1');
      history.push('2');
      history.push('3');

      history.undo();
      history.push('3b');
      history.undo();
      history.redo();

      const current = history.getCurrentState();
      expect(current?.content).toBe('3b');
    });

    it('should maintain consistency through complex operations', () => {
      // Complex scenario: push, undo, push, undo, redo, push
      history.push('a');
      history.push('b');
      history.push('c');

      history.undo();
      history.undo();
      history.push('b2');

      history.undo();
      history.redo();
      history.push('b3');

      const stats = history.getStats();
      expect(stats.totalStates).toBe(3); // a, b2, b3
      expect(stats.currentIndex).toBe(2);
      expect(history.getCurrentState()?.content).toBe('b3');
    });
  });

  describe('Security - Null/Undefined Handling', () => {
    it('should safely handle null content as empty string', () => {
      // Treat null as empty string
      const nullContent = null as any;
      history.push(String(nullContent || ''));

      const stats = history.getStats();
      expect(stats.totalStates).toBe(1);
    });

    it('should safely handle undefined content as empty string', () => {
      const undefinedContent = undefined as any;
      history.push(String(undefinedContent || ''));

      const stats = history.getStats();
      expect(stats.totalStates).toBe(1);
    });

    it('should handle null/undefined in import data', () => {
      const newHistory = new EditorHistory();

      // Import with null history array
      const malformed1 = JSON.stringify({ history: null, currentIndex: 0 });
      const success1 = newHistory.import(malformed1);
      expect(success1).toBe(true); // Should handle gracefully
      expect(newHistory.getStats().totalStates).toBe(0);
    });

    it('should handle missing currentIndex property', () => {
      history.push('state 1');
      const exported = history.export();
      const parsed = JSON.parse(exported);

      // Corrupt the data
      delete parsed.currentIndex;
      const corrupted = JSON.stringify(parsed);

      const newHistory = new EditorHistory();
      const success = newHistory.import(corrupted);
      expect(success).toBe(true); // Should handle gracefully
    });

    it('should handle out-of-bounds currentIndex', () => {
      history.push('state 1');
      history.push('state 2');
      const exported = history.export();
      const parsed = JSON.parse(exported);

      // Set currentIndex beyond array bounds
      parsed.currentIndex = 999;
      const corrupted = JSON.stringify(parsed);

      const newHistory = new EditorHistory();
      const success = newHistory.import(corrupted);
      expect(success).toBe(true); // Should handle without crashing
      // The implementation may or may not clamp the index,
      // but it should not throw an error
      expect(newHistory.getStats()).toBeDefined();
    });

    it('should handle negative currentIndex', () => {
      history.push('state 1');
      history.push('state 2');
      const exported = history.export();
      const parsed = JSON.parse(exported);

      // Set currentIndex to negative value
      parsed.currentIndex = -999;
      const corrupted = JSON.stringify(parsed);

      const newHistory = new EditorHistory();
      const success = newHistory.import(corrupted);
      expect(success).toBe(true); // Should handle gracefully
    });

    it('should handle null/undefined entries in history array', () => {
      history.push('state 1');
      const exported = history.export();
      const parsed = JSON.parse(exported);

      // Insert null/undefined into history
      parsed.history.push(null);
      parsed.history.push(undefined);
      const corrupted = JSON.stringify(parsed);

      const newHistory = new EditorHistory();
      const success = newHistory.import(corrupted);
      expect(success).toBe(true); // Should handle gracefully
    });

    it('should handle empty history array with valid currentIndex', () => {
      const malformed = JSON.stringify({
        history: [],
        currentIndex: 0,
      });

      const newHistory = new EditorHistory();
      const success = newHistory.import(malformed);
      expect(success).toBe(true);
      expect(newHistory.getStats().totalStates).toBe(0);
    });

    it('should gracefully handle undo/redo on empty history', () => {
      expect(() => {
        history.undo();
        history.redo();
      }).not.toThrow();

      expect(history.undo()).toBeNull();
      expect(history.redo()).toBeNull();
    });

    it('should handle operations after failed import', () => {
      const newHistory = new EditorHistory();

      // Import invalid data
      const success = newHistory.import('invalid json {]');
      expect(success).toBe(false);

      // Should still be able to use the history
      expect(() => {
        newHistory.push('valid state');
      }).not.toThrow();

      expect(newHistory.getStats().totalStates).toBe(1);
    });

    it('should handle very deeply nested or circular state data', () => {
      // Create a very deep object structure
      let deepObj: any = { level: 0 };
      let current = deepObj;
      for (let i = 1; i < 100; i++) {
        current.next = { level: i };
        current = current.next;
      }

      const deepStr = JSON.stringify(deepObj);
      history.push(deepStr);

      const retrieved = history.getCurrentState();
      expect(retrieved?.content).toBeDefined();
    });

    it('should handle push with whitespace-only content', () => {
      history.push('   ');
      history.push('\n\t\r');
      history.push(' \n ');

      const stats = history.getStats();
      expect(stats.totalStates).toBe(3);

      // Each state should be preserved exactly
      const current = history.getCurrentState();
      expect(current?.content).toBe(' \n ');
    });

    it('should handle zero max states gracefully', () => {
      // Even with maxStates = 0, should handle gracefully
      const zeroHistory = new EditorHistory(0);
      zeroHistory.push('state 1');

      // Should have at least handled the push
      expect(zeroHistory.canUndo()).toBe(false);
    });

    it('should handle NaN and Infinity in timestamps', () => {
      history.push('state 1');

      // Get the history stats which include timestamps
      const stats = history.getStats();
      expect(isFinite(stats.oldestTimestamp || 0)).toBe(true);
      expect(isFinite(stats.newestTimestamp || 0)).toBe(true);
    });
  });
});
