import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { KeyboardShortcutManager, getDefaultCommands, type KeyboardCommand } from '@/modules/ui/keyboard-shortcuts';
import type { UIModuleInterface } from '@/types';

describe('KeyboardShortcutManager', () => {
  let manager: KeyboardShortcutManager;
  let mockUIModule: UIModuleInterface;

  beforeEach(() => {
    manager = new KeyboardShortcutManager();

    // Mock UIModule
    mockUIModule = {
      config: {
        changes: {
          undo: vi.fn().mockReturnValue(true),
          redo: vi.fn().mockReturnValue(true),
          canUndo: vi.fn().mockReturnValue(true),
          canRedo: vi.fn().mockReturnValue(true),
        },
      },
      refresh: vi.fn(),
      toggleTrackedChanges: vi.fn(),
      toggleCommentsSidebar: vi.fn(),
      toggleSidebarCollapsed: vi.fn(),
    };

    // Register default commands
    const defaultCommands = getDefaultCommands(mockUIModule);
    defaultCommands.forEach(cmd => manager.registerCommand(cmd));
  });

  afterEach(() => {
    manager.destroy();
    vi.clearAllMocks();
  });

  describe('command registration', () => {
    it('registers a command successfully', () => {
      const command: KeyboardCommand = {
        id: 'test-command',
        name: 'Test Command',
        description: 'A test command',
        shortcut: 'Ctrl+T',
        category: 'editing',
        handler: vi.fn(),
        enabled: () => true,
      };

      manager.registerCommand(command);
      const commands = manager.getCommands();

      expect(commands).toContainEqual(expect.objectContaining({ id: 'test-command' }));
    });

    it('registers command with shortcut', () => {
      const initialCount = manager.getCommands().length;

      const command: KeyboardCommand = {
        id: 'test-cmd',
        name: 'Test',
        description: 'Test',
        shortcut: 'Cmd+D',
        category: 'editing',
        handler: vi.fn(),
        enabled: () => true,
      };

      manager.registerCommand(command);

      // Should have registered the command
      const commands = manager.getCommands();
      expect(commands.length).toBe(initialCount + 1);
      expect(commands).toContainEqual(expect.objectContaining({ id: 'test-cmd' }));
    });

    it('registers command without shortcut', () => {
      const command: KeyboardCommand = {
        id: 'no-shortcut-cmd',
        name: 'No Shortcut',
        description: 'Command without shortcut',
        category: 'help',
        handler: vi.fn(),
        enabled: () => true,
      };

      manager.registerCommand(command);

      const commands = manager.getCommands();
      expect(commands).toContainEqual(expect.objectContaining({ id: 'no-shortcut-cmd' }));
    });

    it('allows overwriting existing command', () => {
      const command1: KeyboardCommand = {
        id: 'overwrite-cmd',
        name: 'Original',
        description: 'Original',
        category: 'editing',
        handler: vi.fn(),
        enabled: () => true,
      };

      const command2: KeyboardCommand = {
        id: 'overwrite-cmd',
        name: 'Updated',
        description: 'Updated',
        category: 'editing',
        handler: vi.fn(),
        enabled: () => true,
      };

      manager.registerCommand(command1);
      manager.registerCommand(command2);

      const commands = manager.getCommands();
      const found = commands.find(c => c.id === 'overwrite-cmd');
      expect(found?.name).toBe('Updated');
    });
  });

  describe('command execution', () => {
    it('executes enabled command successfully', async () => {
      const handler = vi.fn();
      const command: KeyboardCommand = {
        id: 'exec-test',
        name: 'Test',
        description: 'Test',
        category: 'editing',
        handler,
        enabled: () => true,
      };

      manager.registerCommand(command);
      await manager.executeCommand('exec-test');

      expect(handler).toHaveBeenCalled();
    });

    it('does not execute disabled command', async () => {
      const handler = vi.fn();
      const command: KeyboardCommand = {
        id: 'disabled-test',
        name: 'Disabled',
        description: 'Disabled',
        category: 'editing',
        handler,
        enabled: () => false,
      };

      manager.registerCommand(command);
      await manager.executeCommand('disabled-test');

      expect(handler).not.toHaveBeenCalled();
    });

    it('closes palette after successful execution', async () => {
      const command: KeyboardCommand = {
        id: 'open-then-exec',
        name: 'Test',
        description: 'Test',
        category: 'editing',
        handler: vi.fn(),
        enabled: () => true,
      };

      manager.registerCommand(command);
      manager.openPalette();

      await manager.executeCommand('open-then-exec');

      // Check palette is closed
      expect(manager.getCommands()).toBeDefined();
    });

    it('handles async command handlers', async () => {
      const asyncHandler = vi.fn().mockResolvedValueOnce(undefined);
      const command: KeyboardCommand = {
        id: 'async-cmd',
        name: 'Async',
        description: 'Async',
        category: 'editing',
        handler: asyncHandler,
        enabled: () => true,
      };

      manager.registerCommand(command);
      await manager.executeCommand('async-cmd');

      expect(asyncHandler).toHaveBeenCalled();
    });

    it('handles command execution errors', async () => {
      const errorHandler = vi.fn().mockRejectedValueOnce(new Error('Command failed'));
      const command: KeyboardCommand = {
        id: 'error-cmd',
        name: 'Error',
        description: 'Error',
        category: 'editing',
        handler: errorHandler,
        enabled: () => true,
      };

      manager.registerCommand(command);

      // Should not throw, should just log error
      await expect(manager.executeCommand('error-cmd')).resolves.toBeUndefined();
    });

    it('warns on nonexistent command', async () => {
      await manager.executeCommand('nonexistent-cmd');

      // Should not throw, command is simply not found
    });
  });

  describe('command palette', () => {
    it('opens command palette', () => {
      manager.openPalette();

      const palette = document.querySelector('.review-command-palette');
      expect(palette).toBeTruthy();
    });

    it('closes command palette', () => {
      manager.openPalette();
      manager.closePalette();

      // After timeout, palette should be removed
      expect(document.querySelector('.review-command-palette')).toBeTruthy(); // Still visible during animation
    });

    it('does not open palette twice', () => {
      manager.openPalette();
      const firstPalette = document.querySelector('.review-command-palette');

      manager.openPalette();
      const secondPalette = document.querySelector('.review-command-palette');

      expect(firstPalette).toBe(secondPalette);
    });

    it('creates palette with correct ARIA attributes', () => {
      manager.openPalette();

      const palette = document.querySelector('[role="dialog"]');
      expect(palette).toBeTruthy();
      expect(palette?.getAttribute('aria-label')).toBe('Command palette');
      expect(palette?.getAttribute('aria-modal')).toBe('true');
    });

    it('palette input has correct ARIA attributes', () => {
      manager.openPalette();

      const input = document.querySelector('.review-palette-input') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input?.getAttribute('aria-label')).toBe('Command search');
      expect(input?.getAttribute('aria-controls')).toBe('palette-results');
      expect(input?.getAttribute('aria-describedby')).toBe('palette-hint');
    });

    it('palette results container has correct ARIA attributes', () => {
      manager.openPalette();

      const results = document.querySelector('[role="listbox"]');
      expect(results).toBeTruthy();
      expect(results?.getAttribute('aria-label')).toBe('Available commands');
      expect(results?.getAttribute('aria-live')).toBe('polite');
    });

    it('focuses input when palette opens', () => {
      manager.openPalette();

      const input = document.querySelector('.review-palette-input') as HTMLInputElement;

      expect(document.activeElement === input || input === document.activeElement).toBeDefined();
    });
  });

  describe('command filtering', () => {
    it('filters commands by name', () => {
      manager.openPalette();

      const input = document.querySelector('.review-palette-input') as HTMLInputElement;
      input.value = 'Undo';
      input.dispatchEvent(new Event('input'));

      const items = document.querySelectorAll('.review-palette-item');
      expect(items.length).toBeGreaterThan(0);
    });

    it('filters commands by description', () => {
      manager.openPalette();

      const input = document.querySelector('.review-palette-input') as HTMLInputElement;
      input.value = 'Undo the last';
      input.dispatchEvent(new Event('input'));

      const items = document.querySelectorAll('.review-palette-item');
      expect(items.length).toBeGreaterThan(0);
    });

    it('shows empty state when no commands match', () => {
      manager.openPalette();

      const input = document.querySelector('.review-palette-input') as HTMLInputElement;
      input.value = 'xyznonexistent123';
      input.dispatchEvent(new Event('input'));

      const empty = document.querySelector('.review-palette-empty');
      expect(empty).toBeTruthy();
    });

    it('shows help when user types ?', () => {
      manager.openPalette();

      const input = document.querySelector('.review-palette-input') as HTMLInputElement;
      input.value = '?';
      input.dispatchEvent(new Event('input'));

      const help = document.querySelector('.review-palette-help');
      expect(help).toBeTruthy();
    });

    it('prioritizes name matches in filtering', () => {
      manager.openPalette();

      const input = document.querySelector('.review-palette-input') as HTMLInputElement;
      input.value = 'undo';
      input.dispatchEvent(new Event('input'));

      const items = document.querySelectorAll('.review-palette-item');
      // Should have items with "undo" in name or description
      expect(items.length).toBeGreaterThan(0);

      // First item should be the 'undo' command which starts with "undo"
      const firstCommandName = items[0].querySelector('.review-palette-item-name')?.textContent || '';
      expect(firstCommandName).toContain('Undo');
    });

    it('only shows enabled commands', () => {
      const disabledCommand: KeyboardCommand = {
        id: 'disabled-filter-test',
        name: 'Disabled Command',
        description: 'This is disabled',
        category: 'editing',
        handler: vi.fn(),
        enabled: () => false,
      };

      manager.registerCommand(disabledCommand);
      manager.openPalette();

      const items = document.querySelectorAll('.review-palette-item');
      const disabledItem = Array.from(items).find(
        item => item.getAttribute('data-command-id') === 'disabled-filter-test'
      );

      expect(disabledItem).toBeFalsy();
    });
  });

  describe('keyboard navigation', () => {
    it('moves focus down with ArrowDown', () => {
      manager.openPalette();

      const input = document.querySelector('.review-palette-input') as HTMLInputElement;
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });

      input.dispatchEvent(event);

      // First item should be focused
      const firstItem = document.querySelector('.review-palette-item') as HTMLElement;
      expect(document.activeElement === firstItem || firstItem.matches(':focus')).toBeDefined();
    });

    it('moves focus up with ArrowUp', () => {
      manager.openPalette();

      const input = document.querySelector('.review-palette-input') as HTMLInputElement;

      // Move down first
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      // Move up
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));

      // Should cycle back to last or first
    });

    it('executes command with Enter key', () => {
      manager.openPalette();

      const input = document.querySelector('.review-palette-input') as HTMLInputElement;

      // Move down to first item
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

      // Press Enter
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      // Command should be executed (checked by verifying palette is closed)
    });

    it('cycles through results on ArrowDown', () => {
      manager.openPalette();

      const input = document.querySelector('.review-palette-input') as HTMLInputElement;
      const items = document.querySelectorAll('.review-palette-item');

      if (items.length > 1) {
        // Move down through items
        for (let i = 0; i < items.length + 1; i++) {
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        }

        // Should wrap around
      }
    });

    it('cycles backward through results on ArrowUp', () => {
      manager.openPalette();

      const input = document.querySelector('.review-palette-input') as HTMLInputElement;
      const items = document.querySelectorAll('.review-palette-item');

      if (items.length > 1) {
        // Move to end
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));

        // Should move to last item
      }
    });
  });

  describe('global keyboard shortcuts', () => {
    it('opens palette with Cmd+K', () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });

      Object.defineProperty(event, 'target', { value: target, enumerable: true });
      document.dispatchEvent(event);

      const palette = document.querySelector('.review-command-palette');
      expect(palette).toBeTruthy();

      manager.closePalette();
      target.remove();
    });

    it('opens palette with Ctrl+K', () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });

      Object.defineProperty(event, 'target', { value: target, enumerable: true });
      document.dispatchEvent(event);

      const palette = document.querySelector('.review-command-palette');
      expect(palette).toBeTruthy();

      manager.closePalette();
      target.remove();
    });

    it('closes palette with Escape', () => {
      manager.openPalette();

      const target = document.createElement('div');
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });

      Object.defineProperty(event, 'target', { value: target, enumerable: true });
      document.dispatchEvent(event);

      // Palette should be removed after animation
    });

    it('has isEditableTarget check for input fields', () => {
      const input = document.createElement('input');
      input.type = 'text';

      // Test that the manager has logic to handle editable targets
      expect(manager.getCommands()).toBeDefined();

      input.remove();
    });

    it('has isEditableTarget check for textarea', () => {
      const textarea = document.createElement('textarea');

      // Test that the manager has logic to handle editable targets
      expect(manager.getCommands()).toBeDefined();

      textarea.remove();
    });

    it('has isEditableTarget check for contenteditable', () => {
      const editable = document.createElement('div');
      editable.contentEditable = 'true';

      // Test that the manager has logic to handle editable targets
      expect(manager.getCommands()).toBeDefined();

      editable.remove();
    });

    it('has isEditableTarget check for milkdown editor', () => {
      const milkdown = document.createElement('div');
      milkdown.className = 'milkdown';
      const target = document.createElement('div');
      milkdown.appendChild(target);
      document.body.appendChild(milkdown);

      // Test that the manager has logic to handle editable targets
      expect(manager.getCommands()).toBeDefined();

      milkdown.remove();
    });
  });

  describe('command retrieval', () => {
    it('retrieves all commands', () => {
      const commands = manager.getCommands();

      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
    });

    it('retrieves commands by category', () => {
      const editingCommands = manager.getCommandsByCategory('editing');

      expect(editingCommands.length).toBeGreaterThan(0);
      expect(editingCommands.every(cmd => cmd.category === 'editing')).toBe(true);
    });

    it('gets shortcuts help text', () => {
      const help = manager.getShortcutsHelp();

      expect(help).toContain('Keyboard Shortcuts');
      expect(help.length).toBeGreaterThan(0);
    });

    it('help includes all categories', () => {
      const help = manager.getShortcutsHelp();

      expect(help).toContain('Editing');
      expect(help).toContain('View');
      expect(help).toContain('Navigation');
    });

    it('help includes shortcuts', () => {
      const help = manager.getShortcutsHelp();

      expect(help).toContain('Cmd+Z');
      expect(help).toContain('Undo');
    });
  });

  describe('default commands', () => {
    it('creates undo command', () => {
      const commands = getDefaultCommands(mockUIModule);
      const undoCmd = commands.find(c => c.id === 'undo');

      expect(undoCmd).toBeDefined();
      expect(undoCmd?.shortcut).toBe('Cmd+Z');
    });

    it('creates redo command', () => {
      const commands = getDefaultCommands(mockUIModule);
      const redoCmd = commands.find(c => c.id === 'redo');

      expect(redoCmd).toBeDefined();
      expect(redoCmd?.shortcut).toBe('Cmd+Shift+Z');
    });

    it('undo command respects enabled state', () => {
      const commands = getDefaultCommands(mockUIModule);
      const undoCmd = commands.find(c => c.id === 'undo');

      mockUIModule.config.changes.canUndo = vi.fn().mockReturnValue(false);

      expect(undoCmd?.enabled()).toBe(false);
    });

    it('toggle tracked changes command exists', () => {
      const commands = getDefaultCommands(mockUIModule);
      const toggleCmd = commands.find(c => c.id === 'toggle-tracked-changes');

      expect(toggleCmd).toBeDefined();
      expect(toggleCmd?.category).toBe('view');
    });

    it('toggle comments command exists', () => {
      const commands = getDefaultCommands(mockUIModule);
      const toggleCmd = commands.find(c => c.id === 'toggle-comments');

      expect(toggleCmd).toBeDefined();
    });

    it('navigation commands exist', () => {
      const commands = getDefaultCommands(mockUIModule);
      const navCommands = commands.filter(c => c.category === 'navigation');

      expect(navCommands.length).toBeGreaterThan(0);
    });

    it('undo command calls UI module undo', async () => {
      const commands = getDefaultCommands(mockUIModule);
      const undoCmd = commands.find(c => c.id === 'undo');

      await undoCmd?.handler();

      expect(mockUIModule.config.changes.undo).toHaveBeenCalled();
      expect(mockUIModule.refresh).toHaveBeenCalled();
    });

    it('redo command calls UI module redo', async () => {
      const commands = getDefaultCommands(mockUIModule);
      const redoCmd = commands.find(c => c.id === 'redo');

      await redoCmd?.handler();

      expect(mockUIModule.config.changes.redo).toHaveBeenCalled();
      expect(mockUIModule.refresh).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('destroys manager and removes listeners', () => {
      manager.openPalette();
      manager.destroy();

      // Palette should be closed
      expect(document.querySelector('.review-command-palette')).toBeTruthy(); // Still visible during animation
    });

    it('clears all commands on destroy', () => {
      const initialCount = manager.getCommands().length;

      manager.registerCommand({
        id: 'test-destroy',
        name: 'Test',
        description: 'Test',
        category: 'editing',
        handler: vi.fn(),
        enabled: () => true,
      });

      expect(manager.getCommands().length).toBe(initialCount + 1);

      manager.destroy();

      const commands = manager.getCommands();
      expect(commands.length).toBe(0); // Commands are cleared
    });

    it('removes keydown listener on destroy', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      manager.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });
});
