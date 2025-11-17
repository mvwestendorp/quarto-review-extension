/**
 * Keyboard Shortcuts & Command Palette Module
 * Provides keyboard-driven navigation and command execution
 */

import { createModuleLogger } from '@utils/debug';
import type { UIModuleInterface } from '@/types';
import { escapeHtml } from './shared/utils';
import { getAnimationDuration } from './constants';
import { FocusManager } from '@utils/focus-management';
import {
  createDiv,
  setAttributes,
  addClass,
  removeClass,
} from '@utils/dom-helpers';

const logger = createModuleLogger('KeyboardShortcuts');

export interface KeyboardCommand {
  id: string;
  name: string;
  description: string;
  shortcut?: string;
  category: 'editing' | 'navigation' | 'view' | 'help';
  handler: () => void | Promise<void>;
  enabled: () => boolean;
}

export class KeyboardShortcutManager {
  private commands: Map<string, KeyboardCommand> = new Map();
  private shortcutMap: Map<string, string> = new Map(); // Map keyboard combo → command id
  private paletteVisible: boolean = false;
  private paletteElement: HTMLElement | null = null;
  private filteredCommands: KeyboardCommand[] = [];
  private keydownListener: ((e: KeyboardEvent) => void) | null = null;
  private focusManager: FocusManager | null = null;

  constructor() {
    this.setupDefaultCommands();
    this.attachGlobalKeyListener();
  }

  /**
   * Register a new command
   */
  registerCommand(command: KeyboardCommand): void {
    this.commands.set(command.id, command);

    // Index shortcut if provided
    if (command.shortcut) {
      this.shortcutMap.set(
        this.normalizeShortcut(command.shortcut),
        command.id
      );
    }
  }

  /**
   * Execute a command by ID
   */
  async executeCommand(commandId: string): Promise<void> {
    const command = this.commands.get(commandId);
    if (!command) {
      logger.warn(`Command not found: ${commandId}`);
      return;
    }

    if (!command.enabled()) {
      logger.warn(`Command disabled: ${commandId}`);
      return;
    }

    try {
      await command.handler();
      this.closePalette();
    } catch (error) {
      logger.error(`Command execution failed: ${commandId}`, error);
    }
  }

  /**
   * Open command palette
   */
  openPalette(): void {
    if (this.paletteVisible) return;

    this.paletteVisible = true;
    this.filteredCommands = Array.from(this.commands.values()).filter((cmd) =>
      cmd.enabled()
    );

    const palette = this.createPaletteElement();
    document.body.appendChild(palette);
    this.paletteElement = palette;

    requestAnimationFrame(() => {
      addClass(palette, 'review-palette-visible');

      // Set up focus management for the modal
      this.focusManager = new FocusManager(palette);
      this.focusManager.activate();

      const input = palette.querySelector(
        '.review-palette-input'
      ) as HTMLInputElement;
      input?.focus();
    });
  }

  /**
   * Close command palette
   */
  closePalette(): void {
    if (!this.paletteElement) return;

    // Clean up focus management
    if (this.focusManager) {
      this.focusManager.deactivate();
      this.focusManager = null;
    }

    removeClass(this.paletteElement, 'review-palette-visible');
    setTimeout(() => {
      this.paletteElement?.remove();
      this.paletteElement = null;
      this.paletteVisible = false;
    }, getAnimationDuration('MEDIUM'));
  }

  /**
   * Get all available commands
   */
  getCommands(): KeyboardCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category: string): KeyboardCommand[] {
    return Array.from(this.commands.values()).filter(
      (cmd) => cmd.category === category
    );
  }

  /**
   * Get keyboard shortcuts help
   */
  getShortcutsHelp(): string {
    const categories = new Map<string, KeyboardCommand[]>();

    for (const command of this.commands.values()) {
      if (!categories.has(command.category)) {
        categories.set(command.category, []);
      }
      categories.get(command.category)!.push(command);
    }

    let help = '# Keyboard Shortcuts\n\n';

    for (const [category, commands] of categories) {
      help += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
      for (const cmd of commands) {
        if (cmd.shortcut) {
          help += `- **${cmd.shortcut}** - ${cmd.description}\n`;
        }
      }
      help += '\n';
    }

    return help;
  }

  // ─────────────────────────────────────────────────────────────────
  // Private Methods
  // ─────────────────────────────────────────────────────────────────

  private setupDefaultCommands(): void {
    // This will be called by UIModule to register commands
    // See below for default command definitions
  }

  private attachGlobalKeyListener(): void {
    this.keydownListener = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      if (this.isEditableTarget(e.target as HTMLElement)) {
        return;
      }

      const shortcut = this.keyEventToShortcut(e);

      // Command palette toggle (Cmd+K / Ctrl+K)
      if (shortcut === 'cmd+k' || shortcut === 'ctrl+k') {
        e.preventDefault();
        if (this.paletteVisible) {
          this.closePalette();
        } else {
          this.openPalette();
        }
        return;
      }

      // Escape to close palette
      if (e.key === 'Escape' && this.paletteVisible) {
        e.preventDefault();
        this.closePalette();
        return;
      }

      // Check for registered shortcuts
      const commandId = this.shortcutMap.get(shortcut);
      if (commandId) {
        e.preventDefault();
        this.executeCommand(commandId);
      }
    };
    document.addEventListener('keydown', this.keydownListener);
  }

  private createPaletteElement(): HTMLElement {
    const palette = createDiv('review-command-palette');
    setAttributes(palette, {
      role: 'dialog',
      'aria-label': 'Command palette',
      'aria-modal': 'true',
    });

    palette.innerHTML = `
      <div class="review-palette-overlay" aria-hidden="true"></div>
      <div class="review-palette-container" role="document">
        <div class="review-palette-header">
          <input
            type="text"
            class="review-palette-input"
            placeholder="Type command name or press ? for help..."
            autocomplete="off"
            aria-label="Command search"
            aria-controls="palette-results"
            aria-describedby="palette-hint"
          />
          <span
            class="review-palette-hint"
            id="palette-hint"
            aria-hidden="true"
          >ESC to close</span>
        </div>
        <div class="review-palette-content">
          <div
            class="review-palette-results"
            id="palette-results"
            role="listbox"
            aria-label="Available commands"
            aria-live="polite"
          ></div>
        </div>
      </div>
    `;

    // Attach event listeners
    const input = palette.querySelector(
      '.review-palette-input'
    ) as HTMLInputElement;
    const overlay = palette.querySelector(
      '.review-palette-overlay'
    ) as HTMLElement;

    input.addEventListener('input', (e) => {
      this.filterCommands((e.target as HTMLInputElement).value);
    });

    input.addEventListener('keydown', (e) => {
      this.handlePaletteKeydown(e);
    });

    overlay.addEventListener('click', () => {
      this.closePalette();
    });

    // Prevent palette from closing when clicking inside
    palette
      .querySelector('.review-palette-container')
      ?.addEventListener('click', (e) => {
        e.stopPropagation();
      });

    // Initial render
    this.renderPaletteResults(palette);

    return palette;
  }

  private filterCommands(query: string): void {
    if (query === '?') {
      // Show help
      this.showHelp();
      return;
    }

    const normalizedQuery = query.toLowerCase();

    this.filteredCommands = Array.from(this.commands.values())
      .filter((cmd) => cmd.enabled())
      .filter(
        (cmd) =>
          cmd.name.toLowerCase().includes(normalizedQuery) ||
          cmd.description.toLowerCase().includes(normalizedQuery) ||
          cmd.id.toLowerCase().includes(normalizedQuery)
      )
      .sort((a, b) => {
        // Prioritize name matches
        const aNameMatch = a.name.toLowerCase().startsWith(normalizedQuery);
        const bNameMatch = b.name.toLowerCase().startsWith(normalizedQuery);
        if (aNameMatch !== bNameMatch) {
          return aNameMatch ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

    this.renderPaletteResults(this.paletteElement!);
  }

  private renderPaletteResults(paletteElement: HTMLElement): void {
    const resultsContainer = paletteElement.querySelector(
      '.review-palette-results'
    );
    if (!resultsContainer) return;

    if (this.filteredCommands.length === 0) {
      resultsContainer.innerHTML = `
        <div class="review-palette-empty">
          <p>No commands found</p>
          <p class="review-palette-hint">Type ? for help</p>
        </div>
      `;
      return;
    }

    // Group by category
    const byCategory = new Map<string, KeyboardCommand[]>();
    for (const cmd of this.filteredCommands) {
      if (!byCategory.has(cmd.category)) {
        byCategory.set(cmd.category, []);
      }
      byCategory.get(cmd.category)!.push(cmd);
    }

    let html = '';
    for (const [category, commands] of byCategory) {
      html += `<div class="review-palette-category">`;
      html += `<div class="review-palette-category-label">${this.capitalize(category)}</div>`;

      for (const cmd of commands) {
        html += `
          <button
            class="review-palette-item"
            data-command-id="${cmd.id}"
            title="${cmd.description}"
            role="option"
            aria-label="${escapeHtml(cmd.name)}${cmd.shortcut ? ` (${cmd.shortcut})` : ''}"
          >
            <div class="review-palette-item-name">${escapeHtml(cmd.name)}</div>
            <div class="review-palette-item-description">${escapeHtml(cmd.description)}</div>
            ${cmd.shortcut ? `<div class="review-palette-item-shortcut" aria-hidden="true">${cmd.shortcut}</div>` : ''}
          </button>
        `;
      }

      html += `</div>`;
    }

    resultsContainer.innerHTML = html;

    // Attach click handlers
    resultsContainer.querySelectorAll('.review-palette-item').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const commandId = btn.getAttribute('data-command-id');
        if (commandId) {
          await this.executeCommand(commandId);
        }
      });
    });
  }

  private handlePaletteKeydown(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.focusNextResult();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.focusPreviousResult();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const focused = this.paletteElement?.querySelector(
        '.review-palette-item:focus'
      ) as HTMLElement;
      if (focused) {
        focused.click();
      }
    }
  }

  private focusNextResult(): void {
    const palette = this.paletteElement;
    if (!palette) return;

    const items = palette.querySelectorAll('.review-palette-item');
    const focused = palette.querySelector('.review-palette-item:focus');

    if (!focused) {
      (items[0] as HTMLElement)?.focus();
    } else {
      const currentIndex = Array.from(items).indexOf(focused as Element);
      const nextIndex = (currentIndex + 1) % items.length;
      (items[nextIndex] as HTMLElement)?.focus();
    }
  }

  private focusPreviousResult(): void {
    const palette = this.paletteElement;
    if (!palette) return;

    const items = palette.querySelectorAll('.review-palette-item');
    const focused = palette.querySelector('.review-palette-item:focus');

    if (!focused) {
      (items[items.length - 1] as HTMLElement)?.focus();
    } else {
      const currentIndex = Array.from(items).indexOf(focused as Element);
      const previousIndex = (currentIndex - 1 + items.length) % items.length;
      (items[previousIndex] as HTMLElement)?.focus();
    }
  }

  private showHelp(): void {
    const help = this.getShortcutsHelp();
    const resultsContainer = this.paletteElement?.querySelector(
      '.review-palette-results'
    );
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `
      <div class="review-palette-help">
        <pre>${escapeHtml(help)}</pre>
      </div>
    `;
  }

  private keyEventToShortcut(e: KeyboardEvent): string {
    const parts: string[] = [];

    if (e.ctrlKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    if (e.metaKey) parts.push('cmd');

    const key = e.key.toLowerCase();
    if (
      key !== 'control' &&
      key !== 'alt' &&
      key !== 'shift' &&
      key !== 'meta'
    ) {
      parts.push(key === ' ' ? 'space' : key);
    }

    return parts.join('+');
  }

  private normalizeShortcut(shortcut: string): string {
    return shortcut.toLowerCase().replace(/\s+/g, '');
  }

  private isEditableTarget(target: HTMLElement): boolean {
    const editableTypes = ['INPUT', 'TEXTAREA', 'SELECT'];
    if (editableTypes.includes(target.tagName)) {
      const type = (target as HTMLInputElement).type;
      // Allow if it's not a text input
      return (
        type === 'text' || type === 'search' || type === 'email' || type === ''
      );
    }

    // Check contenteditable
    if (target.contentEditable === 'true') {
      return true;
    }

    // Check if within Milkdown editor
    if (target.closest('.milkdown')) {
      return true;
    }

    return false;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Destroy the keyboard shortcut manager and clean up listeners
   */
  destroy(): void {
    // Close palette if open
    if (this.paletteVisible) {
      this.closePalette();
    }

    // Clean up focus manager
    if (this.focusManager) {
      this.focusManager.destroy();
      this.focusManager = null;
    }

    // Remove global keydown listener
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
      this.keydownListener = null;
    }

    // Clear command data
    this.commands.clear();
    this.shortcutMap.clear();
    this.filteredCommands = [];
  }
}

/**
 * Default commands for the Review Extension
 * These are registered by the UIModule
 */
export function getDefaultCommands(
  uiModule: UIModuleInterface
): KeyboardCommand[] {
  return [
    // Editing Commands
    {
      id: 'undo',
      name: 'Undo',
      description: 'Undo the last change',
      shortcut: 'Cmd+Z',
      category: 'editing',
      handler: () => {
        if (uiModule.config.changes.undo()) {
          uiModule.refresh();
        }
      },
      enabled: () => uiModule.config.changes.canUndo(),
    },
    {
      id: 'redo',
      name: 'Redo',
      description: 'Redo the last undone change',
      shortcut: 'Cmd+Shift+Z',
      category: 'editing',
      handler: () => {
        if (uiModule.config.changes.redo()) {
          uiModule.refresh();
        }
      },
      enabled: () => uiModule.config.changes.canRedo(),
    },

    // View Commands
    {
      id: 'toggle-tracked-changes',
      name: 'Toggle Tracked Changes',
      description: 'Show or hide tracked changes',
      shortcut: 'Cmd+Shift+T',
      category: 'view',
      handler: () => {
        uiModule.toggleTrackedChanges();
      },
      enabled: () => true,
    },
    {
      id: 'toggle-sidebar',
      name: 'Toggle Review Toolbar',
      description: 'Show or hide the review toolbar',
      shortcut: 'Cmd+Shift+E',
      category: 'view',
      handler: () => {
        uiModule.toggleSidebarCollapsed();
      },
      enabled: () => !!document.querySelector('.review-toolbar'),
    },

    // Navigation Commands
    {
      id: 'focus-first-change',
      name: 'Jump to First Change',
      description: 'Scroll to the first modified section',
      shortcut: 'Cmd+Shift+Home',
      category: 'navigation',
      handler: () => {
        const firstModified = document.querySelector(
          '[data-review-modified="true"]'
        );
        if (firstModified) {
          (firstModified as HTMLElement).scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      },
      enabled: () => !!document.querySelector('[data-review-modified="true"]'),
    },
    {
      id: 'focus-last-change',
      name: 'Jump to Last Change',
      description: 'Scroll to the last modified section',
      shortcut: 'Cmd+Shift+End',
      category: 'navigation',
      handler: () => {
        const allModified = document.querySelectorAll(
          '[data-review-modified="true"]'
        );
        if (allModified.length > 0) {
          const lastModified = allModified[allModified.length - 1];
          (lastModified as HTMLElement).scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      },
      enabled: () => !!document.querySelector('[data-review-modified="true"]'),
    },

    // Help Commands
    {
      id: 'show-help',
      name: 'Show Keyboard Help',
      description: 'Display keyboard shortcuts reference',
      shortcut: '?',
      category: 'help',
      handler: () => {
        // This will be handled by palette when user types ?
      },
      enabled: () => true,
    },
  ];
}
