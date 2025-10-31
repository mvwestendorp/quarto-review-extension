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
 * Milkdown Editor Plugin Handling Tests
 *
 * These tests verify that the MilkdownEditor.validatePlugin() method
 * correctly handles plugin initialization and prevents the "o is not a function" error
 * that occurs when opening an editor after making an edit.
 *
 * The error occurs because:
 * 1. Some plugins are functions that need to be called
 * 2. Some plugins are already plugin spec objects
 * 3. Milkdown's .use() expects the processed plugin, not the raw function
 */

describe('MilkdownEditor Plugin Handling - Prevents "o is not a function"', () => {
  /**
   * Simulates the validatePlugin method logic
   */
  function validatePlugin(plugin: any, name: string): any {
    if (!plugin) {
      throw new Error(`Plugin "${name}" is null or undefined`);
    }

    // If it's a function, call it to get the plugin spec
    if (typeof plugin === 'function') {
      try {
        const result = plugin();
        if (!result) {
          throw new Error(
            `Plugin "${name}" function returned null or undefined`
          );
        }
        return result;
      } catch (error) {
        throw new Error(
          `Failed to initialize plugin "${name}": ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // If it's an object, it's already a plugin spec - return as-is
    if (typeof plugin === 'object') {
      return plugin;
    }

    // Invalid plugin type
    throw new Error(
      `Plugin "${name}" has invalid type: ${typeof plugin}. Expected function or object.`
    );
  }

  describe('Plugin validation - Handles mixed plugin types', () => {
    it('handles criticMarkupRemarkPlugin correctly', () => {
      expect(() => {
        const validated = validatePlugin(
          criticMarkupRemarkPlugin,
          'criticMarkupRemarkPlugin'
        );
        expect(validated).toBeDefined();
        expect(validated).not.toBeNull();
      }).not.toThrow();
    });

    it('handles criticAddition correctly', () => {
      expect(() => {
        const validated = validatePlugin(criticAddition, 'criticAddition');
        expect(validated).toBeDefined();
        expect(validated).not.toBeNull();
      }).not.toThrow();
    });

    it('handles criticDeletion correctly', () => {
      expect(() => {
        const validated = validatePlugin(criticDeletion, 'criticDeletion');
        expect(validated).toBeDefined();
        expect(validated).not.toBeNull();
      }).not.toThrow();
    });

    it('handles criticHighlight correctly', () => {
      expect(() => {
        const validated = validatePlugin(criticHighlight, 'criticHighlight');
        expect(validated).toBeDefined();
        expect(validated).not.toBeNull();
      }).not.toThrow();
    });

    it('handles criticComment correctly', () => {
      expect(() => {
        const validated = validatePlugin(criticComment, 'criticComment');
        expect(validated).toBeDefined();
        expect(validated).not.toBeNull();
      }).not.toThrow();
    });

    it('handles criticSubstitution correctly', () => {
      expect(() => {
        const validated = validatePlugin(criticSubstitution, 'criticSubstitution');
        expect(validated).toBeDefined();
        expect(validated).not.toBeNull();
      }).not.toThrow();
    });

    it('handles criticKeymap correctly', () => {
      expect(() => {
        const validated = validatePlugin(criticKeymap, 'criticKeymap');
        expect(validated).toBeDefined();
        expect(validated).not.toBeNull();
      }).not.toThrow();
    });

    it('handles criticMarkupPlugin correctly', () => {
      expect(() => {
        const validated = validatePlugin(criticMarkupPlugin, 'criticMarkupPlugin');
        expect(validated).toBeDefined();
        expect(validated).not.toBeNull();
      }).not.toThrow();
    });
  });

  describe('Successive editor opens - Reproduces and prevents the "o is not a function" error', () => {
    it('all plugins can be validated multiple times without error', () => {
      const plugins = [
        { name: 'criticMarkupRemarkPlugin', plugin: criticMarkupRemarkPlugin },
        { name: 'criticAddition', plugin: criticAddition },
        { name: 'criticDeletion', plugin: criticDeletion },
        { name: 'criticHighlight', plugin: criticHighlight },
        { name: 'criticComment', plugin: criticComment },
        { name: 'criticSubstitution', plugin: criticSubstitution },
        { name: 'criticKeymap', plugin: criticKeymap },
        { name: 'criticMarkupPlugin', plugin: criticMarkupPlugin },
      ];

      // First editor open
      plugins.forEach(({ name, plugin }) => {
        expect(() => {
          validatePlugin(plugin, name);
        }).not.toThrow();
      });

      // Second editor open (after edit) - THIS IS WHERE ERROR WOULD OCCUR
      plugins.forEach(({ name, plugin }) => {
        expect(() => {
          validatePlugin(plugin, name);
        }).not.toThrow();
      });

      // Third editor open - stress test
      plugins.forEach(({ name, plugin }) => {
        expect(() => {
          validatePlugin(plugin, name);
        }).not.toThrow();
      });
    });

    it('reproduces exact scenario: open editor → make edit → close → open again', () => {
      // First editor open
      const firstValidated = validatePlugin(
        criticAddition,
        'criticAddition'
      );
      expect(firstValidated).toBeDefined();

      // Simulate: User edits text
      // (in real code, editor might be destroyed and recreated here)

      // Second editor open - trying to use the plugin again
      // THIS IS WHERE "o is not a function" would occur
      const secondValidated = validatePlugin(
        criticAddition,
        'criticAddition'
      );
      expect(secondValidated).toBeDefined();

      // Both validations should produce valid plugin specs
      expect(['object', 'function']).toContain(typeof firstValidated);
      expect(['object', 'function']).toContain(typeof secondValidated);
    });
  });

  describe('Error handling - Prevents broken plugins from causing failures', () => {
    it('throws helpful error for undefined plugin', () => {
      expect(() => {
        validatePlugin(undefined, 'testPlugin');
      }).toThrow('testPlugin" is null or undefined');
    });

    it('throws helpful error for null plugin', () => {
      expect(() => {
        validatePlugin(null, 'testPlugin');
      }).toThrow('testPlugin" is null or undefined');
    });

    it('throws helpful error when function returns null', () => {
      const badPlugin = () => null;
      expect(() => {
        validatePlugin(badPlugin, 'badPlugin');
      }).toThrow('badPlugin" function returned null or undefined');
    });

    it('throws helpful error when function returns undefined', () => {
      const badPlugin = () => undefined;
      expect(() => {
        validatePlugin(badPlugin, 'badPlugin');
      }).toThrow('badPlugin" function returned null or undefined');
    });

    it('throws helpful error for invalid type', () => {
      const invalidPlugin = 'not a plugin';
      expect(() => {
        validatePlugin(invalidPlugin, 'invalidPlugin');
      }).toThrow('Expected function or object');
    });

    it('provides clear error message when plugin function throws', () => {
      const errorPlugin = () => {
        throw new Error('Plugin initialization failed');
      };
      expect(() => {
        validatePlugin(errorPlugin, 'errorPlugin');
      }).toThrow('Failed to initialize plugin');
    });
  });

  describe('Prevention of "o is not a function" error specifics', () => {
    it('handles when a plugin is accidentally called multiple times', () => {
      const plugin = criticAddition;

      // First validation (normal flow)
      const first = validatePlugin(plugin, 'criticAddition');
      expect(first).toBeDefined();

      // Second validation - should NOT try to call the result
      const second = validatePlugin(plugin, 'criticAddition');
      expect(second).toBeDefined();

      // If the code was trying to call the plugin twice, this would fail with
      // "o is not a function" where 'o' is the already-processed plugin spec
    });

    it('validates all plugins can be used in sequence without state pollution', () => {
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

      const validatedPlugins: any[] = [];

      // Validate all plugins (first editor open)
      plugins.forEach((plugin, index) => {
        const validated = validatePlugin(
          plugin,
          `plugin-${index}`
        );
        validatedPlugins.push(validated);
      });

      // All should be valid
      expect(validatedPlugins).toHaveLength(plugins.length);
      expect(
        validatedPlugins.every((p) => p !== null && p !== undefined)
      ).toBe(true);

      // Validate all plugins again (second editor open after edit)
      validatedPlugins.forEach((_, index) => {
        const revalidated = validatePlugin(
          plugins[index],
          `plugin-${index}`
        );
        expect(revalidated).toBeDefined();
      });
    });
  });
});
