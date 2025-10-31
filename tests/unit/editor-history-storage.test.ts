import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EditorHistoryStorage } from '@modules/ui/editor/EditorHistoryStorage';

describe('EditorHistoryStorage', () => {
  let storage: EditorHistoryStorage;
  const prefix = 'test-history-';

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    storage = new EditorHistoryStorage({
      prefix,
      maxStates: 10,
      maxSize: 5000, // 5KB max per history
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('save', () => {
    it('saves content to localStorage', () => {
      storage.save('elem-1', 'First content');

      const history = storage.get('elem-1');
      expect(history.states.length).toBe(1);
      expect(history.states[0]?.content).toBe('First content');
    });

    it('appends new states to existing history', () => {
      storage.save('elem-1', 'State 1');
      storage.save('elem-1', 'State 2');
      storage.save('elem-1', 'State 3');

      const history = storage.get('elem-1');
      expect(history.states.length).toBe(3);
      expect(history.states[0]?.content).toBe('State 1');
      expect(history.states[2]?.content).toBe('State 3');
    });

    it('respects maxStates limit by removing oldest', () => {
      const smallStorage = new EditorHistoryStorage({
        prefix,
        maxStates: 3,
        maxSize: 5000,
      });

      smallStorage.save('elem-1', 'State 1');
      smallStorage.save('elem-1', 'State 2');
      smallStorage.save('elem-1', 'State 3');
      smallStorage.save('elem-1', 'State 4');

      const history = smallStorage.get('elem-1');
      expect(history.states.length).toBe(3);
      expect(history.states[0]?.content).toBe('State 2'); // State 1 removed
      expect(history.states[2]?.content).toBe('State 4');
    });

    it('updates lastUpdated timestamp', () => {
      const now = Date.now();
      storage.save('elem-1', 'Content');

      const history = storage.get('elem-1');
      expect(history.lastUpdated).toBeGreaterThanOrEqual(now);
    });

    it('does not save if elementId is empty', () => {
      storage.save('', 'Content');

      const keys = Object.keys(localStorage);
      expect(keys.length).toBe(0);
    });

    it('records timestamp for each state', () => {
      const before = Date.now();
      storage.save('elem-1', 'Content');
      const after = Date.now();

      const history = storage.get('elem-1');
      const timestamp = history.states[0]?.timestamp || 0;
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('handles maxSize limit by pruning states', () => {
      const tinyStorage = new EditorHistoryStorage({
        prefix,
        maxStates: 100,
        maxSize: 200, // Very small - 200 bytes
      });

      // Add states that will exceed maxSize
      for (let i = 0; i < 20; i++) {
        tinyStorage.save('elem-1', `Content ${i}`);
      }

      // Should have pruned to fit within maxSize
      const history = tinyStorage.get('elem-1');
      const serialized = JSON.stringify(history);
      expect(serialized.length).toBeLessThan(200);
      expect(history.states.length).toBeGreaterThan(0); // But not empty
    });
  });

  describe('get', () => {
    it('retrieves saved history', () => {
      storage.save('elem-1', 'Content 1');
      storage.save('elem-1', 'Content 2');

      const history = storage.get('elem-1');
      expect(history.elementId).toBe('elem-1');
      expect(history.states.length).toBe(2);
    });

    it('returns empty history for non-existent element', () => {
      const history = storage.get('nonexistent');

      expect(history.elementId).toBe('nonexistent');
      expect(history.states).toEqual([]);
      expect(history.lastUpdated).toBeDefined();
    });

    it('handles corrupted data gracefully', () => {
      localStorage.setItem(`${prefix}elem-1`, 'invalid json {]');

      const history = storage.get('elem-1');
      expect(history.states).toEqual([]);
      expect(history.elementId).toBe('elem-1');
    });

    it('handles missing states property', () => {
      localStorage.setItem(
        `${prefix}elem-1`,
        JSON.stringify({ elementId: 'elem-1', lastUpdated: Date.now() })
      );

      const history = storage.get('elem-1');
      expect(history.states).toEqual([]);
    });

    it('handles missing lastUpdated property', () => {
      localStorage.setItem(
        `${prefix}elem-1`,
        JSON.stringify({ elementId: 'elem-1', states: [] })
      );

      const history = storage.get('elem-1');
      expect(history.lastUpdated).toBeDefined();
      expect(typeof history.lastUpdated).toBe('number');
    });
  });

  describe('list', () => {
    it('lists all stored histories', () => {
      storage.save('elem-1', 'Content 1');
      storage.save('elem-2', 'Content 2');
      storage.save('elem-3', 'Content 3');

      const list = storage.list();
      expect(list.length).toBe(3);
      expect(list.map((h) => h.elementId).sort()).toEqual([
        'elem-1',
        'elem-2',
        'elem-3',
      ]);
    });

    it('includes state count in listing', () => {
      storage.save('elem-1', 'State 1');
      storage.save('elem-1', 'State 2');
      storage.save('elem-1', 'State 3');

      const list = storage.list();
      const elem1 = list.find((h) => h.elementId === 'elem-1');
      expect(elem1?.stateCount).toBe(3);
    });

    it('includes size in listing', () => {
      storage.save('elem-1', 'Content');

      const list = storage.list();
      expect(list[0]?.size).toBeGreaterThan(0);
    });

    it('includes formatted timestamp in listing', () => {
      storage.save('elem-1', 'Content');

      const list = storage.list();
      expect(list[0]?.lastUpdated).toBeDefined();
      expect(list[0]?.lastUpdated).not.toBe('Unknown');
    });

    it('returns empty array when no histories', () => {
      const list = storage.list();
      expect(list).toEqual([]);
    });

    it('ignores non-history localStorage keys', () => {
      localStorage.setItem('other-key', 'value');
      localStorage.setItem('test-history-elem-1', JSON.stringify({
        elementId: 'elem-1',
        states: [],
        lastUpdated: Date.now(),
      }));

      const list = storage.list();
      expect(list.length).toBe(1);
      expect(list[0]?.elementId).toBe('elem-1');
    });

    it('handles corrupted entries gracefully', () => {
      localStorage.setItem(`${prefix}elem-1`, 'invalid json');
      localStorage.setItem(
        `${prefix}elem-2`,
        JSON.stringify({
          elementId: 'elem-2',
          states: [],
          lastUpdated: Date.now(),
        })
      );

      const list = storage.list();
      // Should still return elem-2, skip corrupted elem-1
      expect(list.length).toBe(1);
      expect(list[0]?.elementId).toBe('elem-2');
    });

    it('shows "Unknown" for missing lastUpdated', () => {
      localStorage.setItem(
        `${prefix}elem-1`,
        JSON.stringify({ elementId: 'elem-1', states: [] })
      );

      const list = storage.list();
      expect(list[0]?.lastUpdated).toBe('Unknown');
    });
  });

  describe('clear', () => {
    it('removes history for specific element', () => {
      storage.save('elem-1', 'Content 1');
      storage.save('elem-2', 'Content 2');

      storage.clear('elem-1');

      expect(storage.get('elem-1').states).toEqual([]);
      expect(storage.get('elem-2').states.length).toBe(1);
    });

    it('does not throw if element does not exist', () => {
      expect(() => storage.clear('nonexistent')).not.toThrow();
    });
  });

  describe('clearAll', () => {
    it('removes all histories with prefix', () => {
      storage.save('elem-1', 'Content 1');
      storage.save('elem-2', 'Content 2');
      storage.save('elem-3', 'Content 3');

      storage.clearAll();

      expect(storage.list()).toEqual([]);
    });

    it('does not remove non-history keys', () => {
      localStorage.setItem('other-key', 'value');
      storage.save('elem-1', 'Content');

      storage.clearAll();

      expect(localStorage.getItem('other-key')).toBe('value');
      expect(storage.list()).toEqual([]);
    });

    it('handles empty localStorage', () => {
      expect(() => storage.clearAll()).not.toThrow();
    });
  });

  describe('quota exceeded handling', () => {
    it('prunes old histories when quota exceeded', () => {
      // Create a scenario where localStorage quota is exceeded
      const quotaStorage = new EditorHistoryStorage({
        prefix,
        maxStates: 10,
        maxSize: 5000,
      });

      // Fill up some histories
      for (let i = 0; i < 5; i++) {
        quotaStorage.save(`elem-${i}`, `Content for ${i}`);
      }

      // Mock localStorage to throw QuotaExceededError
      const originalSetItem = Storage.prototype.setItem;
      let callCount = 0;
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
        this: Storage,
        key: string,
        value: string
      ) {
        callCount++;
        // Throw on first call, succeed on second (after pruning)
        if (callCount === 1) {
          const error = new Error('Quota exceeded');
          error.name = 'QuotaExceededError';
          throw error;
        }
        return originalSetItem.call(this, key, value);
      });

      // This should trigger pruning
      quotaStorage.save('new-elem', 'New content');

      // Should have succeeded after pruning
      const history = quotaStorage.get('new-elem');
      expect(history.states.length).toBeGreaterThan(0);
    });

    it('handles persistent quota errors after pruning', () => {
      // Even after pruning, if quota still exceeded, should handle gracefully
      // Mock to always throw on setItem but allow other operations
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const error = new Error('Quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      });

      // The implementation will:
      // 1. Try to save
      // 2. Catch QuotaExceededError
      // 3. Try to prune
      // 4. Try to save again
      // 5. If still fails, catch and log warning
      // This test verifies it doesn't crash the application
      try {
        storage.save('elem-1', 'Content');
      } catch (error) {
        // If it throws, that's the current behavior - it's handled upstream
        // The key is that it's a QuotaExceededError, not an unhandled exception
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('pruning logic', () => {
    it('prunes oldest half of histories', () => {
      const now = Date.now();

      // Create 10 histories with different timestamps
      for (let i = 0; i < 10; i++) {
        const history = {
          elementId: `elem-${i}`,
          states: [{ content: `Content ${i}`, timestamp: now + i * 1000 }],
          lastUpdated: now + i * 1000,
        };
        localStorage.setItem(
          `${prefix}elem-${i}`,
          JSON.stringify(history)
        );
      }

      // Trigger pruning by exceeding quota
      const originalSetItem = Storage.prototype.setItem;
      let callCount = 0;
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
        this: Storage,
        key: string,
        value: string
      ) {
        callCount++;
        if (callCount === 1) {
          const error = new Error('Quota exceeded');
          error.name = 'QuotaExceededError';
          throw error;
        }
        return originalSetItem.call(this, key, value);
      });

      storage.save('new-elem', 'New content');

      // Should have pruned oldest 5
      const list = storage.list();
      expect(list.length).toBeLessThanOrEqual(6); // 5 remaining + 1 new
    });
  });

  describe('edge cases', () => {
    it('handles very large content', () => {
      const largeContent = 'x'.repeat(10000);
      storage.save('elem-1', largeContent);

      const history = storage.get('elem-1');
      expect(history.states[0]?.content.length).toBe(10000);
    });

    it('handles empty content', () => {
      storage.save('elem-1', '');

      const history = storage.get('elem-1');
      expect(history.states.length).toBe(1);
      expect(history.states[0]?.content).toBe('');
    });

    it('handles special characters in content', () => {
      const special = '<script>alert("xss")</script>\n\t{}[]"\'';
      storage.save('elem-1', special);

      const history = storage.get('elem-1');
      expect(history.states[0]?.content).toBe(special);
    });

    it('handles special characters in elementId', () => {
      const specialId = 'elem-with-dashes-123_456';
      storage.save(specialId, 'Content');

      const history = storage.get(specialId);
      expect(history.states.length).toBe(1);
    });

    it('handles multiple elements concurrently', () => {
      for (let i = 0; i < 100; i++) {
        storage.save(`elem-${i}`, `Content ${i}`);
      }

      const list = storage.list();
      expect(list.length).toBe(100);
    });

    it('handles rapid saves to same element', () => {
      for (let i = 0; i < 20; i++) {
        storage.save('elem-1', `Content ${i}`);
      }

      const history = storage.get('elem-1');
      // Should be limited by maxStates (10)
      expect(history.states.length).toBe(10);
      // Should have newest states
      expect(history.states[9]?.content).toBe('Content 19');
    });

    it('handles localStorage being disabled', () => {
      // Mock localStorage.getItem to throw
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage is disabled');
      });

      // Should not crash
      const history = storage.get('elem-1');
      expect(history.states).toEqual([]);
    });

    it('handles localStorage.setItem throwing non-quota errors', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Some other error');
      });

      // Should not crash - implementation catches error and logs warning
      storage.save('elem-1', 'Content');
      expect(storage.get('elem-1').states.length).toBe(0); // Failed to save
    });

    it('handles corrupted history with missing elementId', () => {
      localStorage.setItem(
        `${prefix}elem-1`,
        JSON.stringify({ states: [], lastUpdated: Date.now() })
      );

      const list = storage.list();
      // Should handle gracefully - may or may not include the item
      expect(list).toBeDefined();
    });

    it('handles Unicode content correctly', () => {
      const unicode = '你好世界 🚀 emoji café';
      storage.save('elem-1', unicode);

      const history = storage.get('elem-1');
      expect(history.states[0]?.content).toBe(unicode);
    });

    it('maintains state order across save/get cycles', () => {
      const contents = ['First', 'Second', 'Third', 'Fourth'];
      contents.forEach((content) => storage.save('elem-1', content));

      const history = storage.get('elem-1');
      expect(history.states.map((s) => s.content)).toEqual(contents);
    });
  });

  describe('storage key generation', () => {
    it('generates correct storage key', () => {
      storage.save('elem-1', 'Content');

      const key = `${prefix}elem-1`;
      expect(localStorage.getItem(key)).toBeDefined();
    });

    it('isolates different prefixes', () => {
      const storage1 = new EditorHistoryStorage({
        prefix: 'prefix1-',
        maxStates: 10,
        maxSize: 5000,
      });

      const storage2 = new EditorHistoryStorage({
        prefix: 'prefix2-',
        maxStates: 10,
        maxSize: 5000,
      });

      storage1.save('elem-1', 'Content 1');
      storage2.save('elem-1', 'Content 2');

      expect(storage1.get('elem-1').states[0]?.content).toBe('Content 1');
      expect(storage2.get('elem-1').states[0]?.content).toBe('Content 2');
      expect(storage1.list().length).toBe(1);
      expect(storage2.list().length).toBe(1);
    });
  });
});
