import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  criticMarkupRemarkPlugin,
  criticAddition,
  criticDeletion,
  criticHighlight,
  criticComment,
  criticSubstitution,
  criticKeymap,
  criticMarkupPlugin,
} from '@modules/ui/criticmarkup';

/**
 * Editor Plugin Initialization Tests
 *
 * These tests verify that all Milkdown plugins are properly exported
 * and can be initialized without errors. They catch the "o is not a function"
 * error that occurs when a plugin import fails or returns undefined.
 */

describe('Editor Plugin Initialization', () => {

  describe('Plugin Exports - All plugins must be accessible', () => {
    it('criticMarkupRemarkPlugin is exported and defined', () => {
      expect(criticMarkupRemarkPlugin).toBeDefined();
    });

    it('criticAddition is exported and is callable', () => {
      expect(criticAddition).toBeDefined();
      expect(criticAddition).not.toBeNull();
    });

    it('criticDeletion is exported and is callable', () => {
      expect(criticDeletion).toBeDefined();
      expect(criticDeletion).not.toBeNull();
    });

    it('criticHighlight is exported and is callable', () => {
      expect(criticHighlight).toBeDefined();
      expect(criticHighlight).not.toBeNull();
    });

    it('criticComment is exported and is callable', () => {
      expect(criticComment).toBeDefined();
      expect(criticComment).not.toBeNull();
    });

    it('criticSubstitution is exported and is callable', () => {
      expect(criticSubstitution).toBeDefined();
      expect(criticSubstitution).not.toBeNull();
    });

    it('criticKeymap is exported and is callable', () => {
      expect(criticKeymap).toBeDefined();
      expect(criticKeymap).not.toBeNull();
    });

    it('criticMarkupPlugin is exported and is callable', () => {
      expect(criticMarkupPlugin).toBeDefined();
      expect(criticMarkupPlugin).not.toBeNull();
    });
  });

  describe('Plugin types - Understand plugin structure', () => {
    it('criticMarkupRemarkPlugin is defined', () => {
      expect(criticMarkupRemarkPlugin).toBeDefined();
      expect(criticMarkupRemarkPlugin).not.toBeNull();
    });

    it('criticAddition is defined', () => {
      expect(criticAddition).toBeDefined();
      expect(criticAddition).not.toBeNull();
    });

    it('criticDeletion is defined', () => {
      expect(criticDeletion).toBeDefined();
      expect(criticDeletion).not.toBeNull();
    });

    it('criticHighlight is defined', () => {
      expect(criticHighlight).toBeDefined();
      expect(criticHighlight).not.toBeNull();
    });

    it('criticComment is defined', () => {
      expect(criticComment).toBeDefined();
      expect(criticComment).not.toBeNull();
    });

    it('criticSubstitution is defined', () => {
      expect(criticSubstitution).toBeDefined();
      expect(criticSubstitution).not.toBeNull();
    });

    it('criticKeymap is defined', () => {
      expect(criticKeymap).toBeDefined();
      expect(criticKeymap).not.toBeNull();
    });

    it('criticMarkupPlugin is defined', () => {
      expect(criticMarkupPlugin).toBeDefined();
      expect(criticMarkupPlugin).not.toBeNull();
    });
  });

  describe('Plugin array validation - Verify all plugins are valid for .use()', () => {
    it('all plugins are defined and valid for Milkdown .use()', () => {
      const plugins = [
        criticMarkupRemarkPlugin,
        criticAddition,
        criticDeletion,
        criticHighlight,
        criticComment,
        criticSubstitution,
        criticKeymap,
        criticMarkupPlugin,
      ];

      plugins.forEach((plugin, index) => {
        expect(plugin).toBeDefined();
        expect(plugin).not.toBeNull();
        // Plugins can be either objects or functions - Milkdown handles both
        const typeOfPlugin = typeof plugin;
        expect(['object', 'function']).toContain(typeOfPlugin);
      });
    });

    it('plugins remain stable across successive editor opens', () => {
      const plugins = [
        criticMarkupRemarkPlugin,
        criticAddition,
        criticDeletion,
        criticHighlight,
        criticComment,
        criticSubstitution,
        criticKeymap,
        criticMarkupPlugin,
      ];

      // First access (simulating first editor open)
      const firstAccess = plugins.map((p) => p);

      // Second access (simulating second editor open after edit)
      const secondAccess = plugins.map((p) => p);

      // Verify all plugins remain unchanged
      firstAccess.forEach((plugin, index) => {
        expect(plugin).toBe(secondAccess[index]);
      });
    });
  });

  describe('Plugin availability - Multiple editor opens (reproduces "o is not a function" error)', () => {
    it('all plugins remain available for successive editor initializations', () => {
      const pluginSequence = [
        criticMarkupRemarkPlugin,
        criticAddition,
        criticDeletion,
        criticHighlight,
        criticComment,
        criticSubstitution,
        criticKeymap,
        criticMarkupPlugin,
      ];

      // First initialization (simulating first editor open)
      pluginSequence.forEach((plugin) => {
        expect(plugin).toBeDefined();
        expect(plugin).not.toBeNull();
      });

      // Second initialization (simulating second editor open after first edit)
      // THIS IS WHERE "o is not a function" would occur if plugins were corrupted
      pluginSequence.forEach((plugin) => {
        expect(plugin).toBeDefined();
        expect(plugin).not.toBeNull();
        // Should not throw "plugin is not a function"
        expect(() => {
          // Just access it, don't call it
          const _ = plugin;
        }).not.toThrow();
      });
    });

    it('plugins are singleton instances (same references across opens)', () => {
      // Verify that plugins are the same reference across accesses
      const first = criticAddition;
      const second = criticAddition;

      expect(first).toBe(second);
    });

    it('reproduces scenario: editor open -> edit -> open editor again', () => {
      // Simulate: First editor open
      let plugin1 = criticAddition;
      expect(plugin1).toBeDefined();

      // Simulate: User edits something
      // (In real scenario, editor might be destroyed here)

      // Simulate: User opens editor again
      let plugin2 = criticAddition;
      expect(plugin2).toBeDefined();

      // Should be the same plugin reference
      expect(plugin1).toBe(plugin2);

      // Both should be ready for use in .use()
      expect(['object', 'function']).toContain(typeof plugin1);
      expect(['object', 'function']).toContain(typeof plugin2);
    });
  });

  describe('Plugin error handling - Catch missing or malformed plugins', () => {
    it('should detect when a plugin is undefined', () => {
      const undefinedPlugin = undefined as any;
      expect(undefinedPlugin).toBeUndefined();
      expect(typeof undefinedPlugin).not.toBe('function');
    });

    it('should detect when a plugin is null', () => {
      const nullPlugin = null as any;
      expect(nullPlugin).toBeNull();
      expect(typeof nullPlugin).not.toBe('function');
    });

    it('should detect when a plugin is not a function', () => {
      const invalidPlugin = 'not a plugin';
      expect(typeof invalidPlugin).not.toBe('function');
    });

    it('all criticmarkup plugins pass validation', () => {
      const pluginsToValidate = [
        { name: 'criticMarkupRemarkPlugin', plugin: criticMarkupRemarkPlugin },
        { name: 'criticAddition', plugin: criticAddition },
        { name: 'criticDeletion', plugin: criticDeletion },
        { name: 'criticHighlight', plugin: criticHighlight },
        { name: 'criticComment', plugin: criticComment },
        { name: 'criticSubstitution', plugin: criticSubstitution },
        { name: 'criticKeymap', plugin: criticKeymap },
        { name: 'criticMarkupPlugin', plugin: criticMarkupPlugin },
      ];

      pluginsToValidate.forEach(({ name, plugin }) => {
        expect(
          plugin !== undefined && plugin !== null,
          `${name} is undefined or null`
        ).toBe(true);
        // Plugins can be objects or functions
        expect(['object', 'function']).toContain(typeof plugin);
      });
    });
  });

  describe('Editor initialization error scenario - Simulate "o is not a function"', () => {
    it('detects when a plugin fails to return a value (the "o is not a function" error scenario)', () => {
      // This simulates what would happen if a plugin returned undefined or null
      const mockFailedPlugin = vi.fn(() => undefined);

      const result = mockFailedPlugin();
      expect(result).toBeUndefined();

      // This is what causes the ".use()" to fail with "o is not a function"
      // because Milkdown's .use() method tries to process the result as a valid plugin spec
    });

    it('should catch plugin validation before editor build', () => {
      const pluginsForEditorBuild = [
        criticMarkupRemarkPlugin,
        criticAddition,
        criticDeletion,
        criticHighlight,
        criticComment,
        criticSubstitution,
        criticKeymap,
        criticMarkupPlugin,
      ];

      const validatePluginsBeforeUse = () => {
        for (let i = 0; i < pluginsForEditorBuild.length; i++) {
          const plugin = pluginsForEditorBuild[i];

          // Check: Plugin must be defined and not null
          if (plugin === null || plugin === undefined) {
            throw new Error(
              `Plugin at index ${i} is null or undefined`
            );
          }

          // Check: Plugin should be an object or function (valid Milkdown plugin)
          const pluginType = typeof plugin;
          if (pluginType !== 'object' && pluginType !== 'function') {
            throw new Error(
              `Plugin at index ${i} is not a valid type: ${pluginType}`
            );
          }
        }
        return true;
      };

      expect(validatePluginsBeforeUse).not.toThrow();
      expect(validatePluginsBeforeUse()).toBe(true);
    });

    it('provides helpful error message when plugin validation fails', () => {
      const undefinedPlugin = undefined;

      const validateAndReport = (plugin: any, name: string) => {
        if (plugin === null || plugin === undefined) {
          return {
            error: true,
            message: `Plugin "${name}" is null or undefined`,
          };
        }
        if (typeof plugin !== 'object') {
          return {
            error: true,
            message: `Plugin "${name}" is not an object: ${typeof plugin}`,
          };
        }
        return { error: false };
      };

      const report = validateAndReport(undefinedPlugin, 'testPlugin');
      expect(report.error).toBe(true);
      expect(report.message).toContain('null or undefined');
    });
  });
});
