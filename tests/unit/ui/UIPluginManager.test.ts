import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIPluginManager } from '@modules/ui/UIPluginManager';
import type { ReviewUIPlugin, PluginHandle, ReviewUIContext } from '@/types';

// Hoisted mock factory for tracking plugin and handle instances
const {
  getPluginInstances,
  getHandleInstances,
  resetPluginMocks,
  createMockPlugin,
  createMockHandle,
} = vi.hoisted(() => {
  type MockPlugin = {
    id: string;
    mount: ReturnType<typeof vi.fn>;
  };

  type MockHandle = {
    dispose: ReturnType<typeof vi.fn>;
    id: string;
  };

  const pluginInstances: MockPlugin[] = [];
  const handleInstances: MockHandle[] = [];

  const createMockPlugin = (id: string = 'test-plugin'): MockPlugin => {
    const mockHandle = createMockHandle(id);
    const plugin: MockPlugin = {
      id,
      mount: vi.fn().mockReturnValue(mockHandle),
    };
    pluginInstances.push(plugin);
    return plugin;
  };

  const createMockHandle = (id: string): MockHandle => {
    const handle: MockHandle = {
      dispose: vi.fn(),
      id,
    };
    handleInstances.push(handle);
    return handle;
  };

  return {
    getPluginInstances: () => pluginInstances,
    getHandleInstances: () => handleInstances,
    createMockPlugin,
    createMockHandle,
    resetPluginMocks: () => {
      pluginInstances.length = 0;
      handleInstances.length = 0;
    },
  };
});

// Mock logger
vi.mock('@utils/debug', () => ({
  createModuleLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('UIPluginManager (TDD - Test First)', () => {
  let pluginManager: UIPluginManager;
  let mockContext: ReviewUIContext;

  beforeEach(() => {
    resetPluginMocks();
    vi.clearAllMocks();

    // Create mock context for plugin mounting
    mockContext = {
      stateStore: {} as any,
      editorManager: {} as any,
      config: {} as any,
    };

    // Create plugin manager instance
    pluginManager = new UIPluginManager();
  });

  describe('Initialization', () => {
    it('should initialize with empty plugin registry', () => {
      // Assert: no plugins should be active initially
      expect(pluginManager.getActivePluginCount()).toBe(0);
    });

    it('should not throw errors during construction', () => {
      // Assert: construction should be safe
      expect(() => new UIPluginManager()).not.toThrow();
    });
  });

  describe('Plugin Mounting', () => {
    it('should mount a plugin and return its handle', () => {
      // Arrange
      const mockPlugin = createMockPlugin('test-plugin');

      // Act: mount the plugin
      const handle = pluginManager.mountPlugin(
        mockPlugin as unknown as ReviewUIPlugin,
        mockContext
      );

      // Assert: plugin.mount should be called with context
      expect(mockPlugin.mount).toHaveBeenCalledWith(mockContext);
      expect(mockPlugin.mount).toHaveBeenCalledTimes(1);

      // Assert: returned handle should be the one from plugin.mount()
      expect(handle).toBeDefined();
      expect(handle.id).toBe('test-plugin');

      // Assert: plugin count should increase
      expect(pluginManager.getActivePluginCount()).toBe(1);
    });

    it('should track multiple plugins independently', () => {
      // Arrange
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');
      const plugin3 = createMockPlugin('plugin-3');

      // Act: mount multiple plugins
      pluginManager.mountPlugin(plugin1 as unknown as ReviewUIPlugin, mockContext);
      pluginManager.mountPlugin(plugin2 as unknown as ReviewUIPlugin, mockContext);
      pluginManager.mountPlugin(plugin3 as unknown as ReviewUIPlugin, mockContext);

      // Assert: all plugins should be tracked
      expect(pluginManager.getActivePluginCount()).toBe(3);
      expect(plugin1.mount).toHaveBeenCalled();
      expect(plugin2.mount).toHaveBeenCalled();
      expect(plugin3.mount).toHaveBeenCalled();
    });

    it('should unmount existing plugin when remounting same ID', () => {
      // Arrange
      const plugin1 = createMockPlugin('same-id');
      const plugin2 = createMockPlugin('same-id');

      // Act: mount first plugin
      const handle1 = pluginManager.mountPlugin(
        plugin1 as unknown as ReviewUIPlugin,
        mockContext
      );

      // Act: remount with same ID (should unmount first)
      const handle2 = pluginManager.mountPlugin(
        plugin2 as unknown as ReviewUIPlugin,
        mockContext
      );

      // Assert: first handle should be disposed
      expect(handle1.dispose).toHaveBeenCalled();

      // Assert: only one plugin should be active (replaced, not added)
      expect(pluginManager.getActivePluginCount()).toBe(1);

      // Assert: second plugin should be mounted
      expect(plugin2.mount).toHaveBeenCalled();
    });
  });

  describe('Plugin Unmounting', () => {
    it('should unmount a plugin and call dispose', () => {
      // Arrange
      const mockPlugin = createMockPlugin('test-plugin');
      const handle = pluginManager.mountPlugin(
        mockPlugin as unknown as ReviewUIPlugin,
        mockContext
      );

      // Act: unmount the plugin
      pluginManager.unmountPlugin('test-plugin');

      // Assert: handle.dispose should be called
      expect(handle.dispose).toHaveBeenCalled();

      // Assert: plugin should be removed from registry
      expect(pluginManager.getActivePluginCount()).toBe(0);
    });

    it('should handle unmounting non-existent plugin gracefully', () => {
      // Act & Assert: should not throw error
      expect(() => {
        pluginManager.unmountPlugin('non-existent-plugin');
      }).not.toThrow();

      // Assert: no errors, count remains 0
      expect(pluginManager.getActivePluginCount()).toBe(0);
    });

    it('should isolate plugin disposal errors', () => {
      // Arrange
      const mockPlugin = createMockPlugin('error-plugin');
      const handle = pluginManager.mountPlugin(
        mockPlugin as unknown as ReviewUIPlugin,
        mockContext
      );

      // Make dispose throw an error
      handle.dispose.mockImplementation(() => {
        throw new Error('Plugin disposal failed');
      });

      // Act & Assert: should not throw (error should be caught and logged)
      expect(() => {
        pluginManager.unmountPlugin('error-plugin');
      }).not.toThrow();

      // Assert: plugin should still be removed from registry despite error
      expect(pluginManager.getActivePluginCount()).toBe(0);
    });

    it('should clean up plugin handle from Map after unmounting', () => {
      // Arrange
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');

      pluginManager.mountPlugin(plugin1 as unknown as ReviewUIPlugin, mockContext);
      pluginManager.mountPlugin(plugin2 as unknown as ReviewUIPlugin, mockContext);

      // Assert: 2 plugins active
      expect(pluginManager.getActivePluginCount()).toBe(2);

      // Act: unmount one plugin
      pluginManager.unmountPlugin('plugin-1');

      // Assert: only 1 plugin remaining
      expect(pluginManager.getActivePluginCount()).toBe(1);

      // Act: unmount second plugin
      pluginManager.unmountPlugin('plugin-2');

      // Assert: no plugins remaining
      expect(pluginManager.getActivePluginCount()).toBe(0);
    });
  });

  describe('Unmount All Plugins', () => {
    it('should unmount all plugins and dispose their handles', () => {
      // Arrange
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');
      const plugin3 = createMockPlugin('plugin-3');

      const handle1 = pluginManager.mountPlugin(
        plugin1 as unknown as ReviewUIPlugin,
        mockContext
      );
      const handle2 = pluginManager.mountPlugin(
        plugin2 as unknown as ReviewUIPlugin,
        mockContext
      );
      const handle3 = pluginManager.mountPlugin(
        plugin3 as unknown as ReviewUIPlugin,
        mockContext
      );

      // Act: unmount all plugins
      pluginManager.unmountAll();

      // Assert: all handles should be disposed
      expect(handle1.dispose).toHaveBeenCalled();
      expect(handle2.dispose).toHaveBeenCalled();
      expect(handle3.dispose).toHaveBeenCalled();

      // Assert: plugin registry should be empty
      expect(pluginManager.getActivePluginCount()).toBe(0);
    });

    it('should handle unmountAll with no plugins gracefully', () => {
      // Act & Assert: should not throw error
      expect(() => {
        pluginManager.unmountAll();
      }).not.toThrow();

      // Assert: count remains 0
      expect(pluginManager.getActivePluginCount()).toBe(0);
    });

    it('should continue unmounting other plugins if one fails', () => {
      // Arrange
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2-error');
      const plugin3 = createMockPlugin('plugin-3');

      const handle1 = pluginManager.mountPlugin(
        plugin1 as unknown as ReviewUIPlugin,
        mockContext
      );
      const handle2 = pluginManager.mountPlugin(
        plugin2 as unknown as ReviewUIPlugin,
        mockContext
      );
      const handle3 = pluginManager.mountPlugin(
        plugin3 as unknown as ReviewUIPlugin,
        mockContext
      );

      // Make plugin2's dispose throw an error
      handle2.dispose.mockImplementation(() => {
        throw new Error('Disposal error');
      });

      // Act: unmount all (should not throw despite error)
      expect(() => {
        pluginManager.unmountAll();
      }).not.toThrow();

      // Assert: all handles should be called (error isolation)
      expect(handle1.dispose).toHaveBeenCalled();
      expect(handle2.dispose).toHaveBeenCalled();
      expect(handle3.dispose).toHaveBeenCalled();

      // Assert: all plugins should be removed despite error
      expect(pluginManager.getActivePluginCount()).toBe(0);
    });
  });

  describe('Plugin Handle Tracking', () => {
    it('should correctly track plugin handles in Map', () => {
      // Arrange
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');

      // Act: mount plugins
      pluginManager.mountPlugin(plugin1 as unknown as ReviewUIPlugin, mockContext);
      expect(pluginManager.getActivePluginCount()).toBe(1);

      pluginManager.mountPlugin(plugin2 as unknown as ReviewUIPlugin, mockContext);
      expect(pluginManager.getActivePluginCount()).toBe(2);

      // Act: unmount one
      pluginManager.unmountPlugin('plugin-1');
      expect(pluginManager.getActivePluginCount()).toBe(1);

      // Act: unmount other
      pluginManager.unmountPlugin('plugin-2');
      expect(pluginManager.getActivePluginCount()).toBe(0);
    });

    it('should return correct plugin count after mount/unmount operations', () => {
      // Arrange
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');
      const plugin3 = createMockPlugin('plugin-3');

      // Initial state
      expect(pluginManager.getActivePluginCount()).toBe(0);

      // Mount 3 plugins
      pluginManager.mountPlugin(plugin1 as unknown as ReviewUIPlugin, mockContext);
      pluginManager.mountPlugin(plugin2 as unknown as ReviewUIPlugin, mockContext);
      pluginManager.mountPlugin(plugin3 as unknown as ReviewUIPlugin, mockContext);
      expect(pluginManager.getActivePluginCount()).toBe(3);

      // Unmount 1 plugin
      pluginManager.unmountPlugin('plugin-2');
      expect(pluginManager.getActivePluginCount()).toBe(2);

      // Remount with same ID (should replace, not add)
      const plugin1v2 = createMockPlugin('plugin-1');
      pluginManager.mountPlugin(plugin1v2 as unknown as ReviewUIPlugin, mockContext);
      expect(pluginManager.getActivePluginCount()).toBe(2);

      // Unmount all
      pluginManager.unmountAll();
      expect(pluginManager.getActivePluginCount()).toBe(0);
    });
  });

  describe('Plugin Isolation', () => {
    it('should isolate plugin mount failures', () => {
      // Arrange
      const errorPlugin = createMockPlugin('error-plugin');
      const goodPlugin = createMockPlugin('good-plugin');

      // Make the error plugin's mount throw
      errorPlugin.mount.mockImplementation(() => {
        throw new Error('Mount failed');
      });

      // Act & Assert: error plugin mount should not crash manager
      expect(() => {
        try {
          pluginManager.mountPlugin(
            errorPlugin as unknown as ReviewUIPlugin,
            mockContext
          );
        } catch (error) {
          // Let the error propagate for this test to verify it's thrown
          throw error;
        }
      }).toThrow('Mount failed');

      // Act: mount good plugin (should still work)
      const handle = pluginManager.mountPlugin(
        goodPlugin as unknown as ReviewUIPlugin,
        mockContext
      );

      // Assert: good plugin should mount successfully
      expect(goodPlugin.mount).toHaveBeenCalled();
      expect(handle).toBeDefined();
    });

    it('should isolate plugin disposal failures during unmount', () => {
      // Arrange
      const plugin1 = createMockPlugin('plugin-1');
      const plugin2 = createMockPlugin('plugin-2');

      const handle1 = pluginManager.mountPlugin(
        plugin1 as unknown as ReviewUIPlugin,
        mockContext
      );
      pluginManager.mountPlugin(plugin2 as unknown as ReviewUIPlugin, mockContext);

      // Make plugin1 disposal throw error
      handle1.dispose.mockImplementation(() => {
        throw new Error('Dispose failed');
      });

      // Act: unmount plugin1 (should not throw)
      expect(() => {
        pluginManager.unmountPlugin('plugin-1');
      }).not.toThrow();

      // Assert: plugin1 should be removed despite error
      expect(pluginManager.getActivePluginCount()).toBe(1);

      // Assert: plugin2 should still be mounted and functional
      pluginManager.unmountPlugin('plugin-2');
      expect(pluginManager.getActivePluginCount()).toBe(0);
    });
  });
});
