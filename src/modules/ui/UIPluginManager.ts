/**
 * UIPluginManager
 *
 * Manages the lifecycle of ReviewUIPlugin instances.
 * Extracted from UIModule as part of TDD refactoring to improve separation of concerns.
 *
 * Responsibilities:
 * - Register and track ReviewUIPlugin instances
 * - Create and manage PluginHandle objects
 * - Coordinate plugin lifecycle (mount/unmount)
 * - Isolate plugin failures to prevent cascading errors
 *
 * @module ui/UIPluginManager
 */

import type {
  ReviewUIPlugin,
  PluginHandle,
  ReviewUIContext,
} from './plugins/types';
import { createModuleLogger } from '@utils/debug';

const logger = createModuleLogger('UIPluginManager');

/**
 * UIPluginManager coordinates the lifecycle of UI plugins.
 * It handles mounting, unmounting, and tracking of plugin instances.
 */
export class UIPluginManager {
  private pluginHandles = new Map<string, PluginHandle>();

  constructor() {
    logger.info('UIPluginManager initialized');
  }

  /**
   * Mount a plugin and return its handle
   * If a plugin with the same ID already exists, it will be unmounted first
   *
   * @param plugin - The ReviewUIPlugin to mount
   * @param context - The ReviewUIContext for the plugin
   * @returns The PluginHandle for the mounted plugin
   */
  public mountPlugin(
    plugin: ReviewUIPlugin,
    context: ReviewUIContext
  ): PluginHandle {
    logger.debug('Mounting plugin', { id: plugin.id });

    // Unmount any existing plugin with the same ID
    this.unmountPlugin(plugin.id);

    // Mount the plugin and get its handle
    const handle = plugin.mount(context);

    // Track the handle
    this.pluginHandles.set(plugin.id, handle);

    logger.info('Plugin mounted successfully', { id: plugin.id });

    return handle;
  }

  /**
   * Unmount a plugin by its ID
   * Disposes the plugin handle and removes it from tracking
   *
   * @param id - The plugin ID to unmount
   */
  public unmountPlugin(id: string): void {
    const handle = this.pluginHandles.get(id);

    if (!handle) {
      logger.debug('No plugin found to unmount', { id });
      return;
    }

    logger.debug('Unmounting plugin', { id });

    try {
      handle.dispose();
      logger.info('Plugin unmounted successfully', { id });
    } catch (error) {
      logger.warn('Failed to dispose UI plugin', { id, error });
    }

    // Remove from tracking regardless of disposal success
    this.pluginHandles.delete(id);
  }

  /**
   * Unmount all plugins
   * Disposes all plugin handles and clears the registry
   */
  public unmountAll(): void {
    logger.info('Unmounting all plugins', {
      count: this.pluginHandles.size,
    });

    // Iterate over all plugin IDs and unmount them
    const pluginIds = Array.from(this.pluginHandles.keys());

    for (const id of pluginIds) {
      this.unmountPlugin(id);
    }

    logger.info('All plugins unmounted');
  }

  /**
   * Get the number of currently active plugins
   * Useful for testing and debugging
   *
   * @returns The number of active plugins
   */
  public getActivePluginCount(): number {
    return this.pluginHandles.size;
  }
}
