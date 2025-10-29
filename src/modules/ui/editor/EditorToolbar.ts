/**
 * EditorToolbar Manager
 *
 * Handles creation and management of the editor's formatting toolbar,
 * including button rendering, event handling, and state management.
 *
 * Consolidates toolbar functionality from both editor-toolbar.ts and index.ts
 * to eliminate code duplication.
 */

import type { Editor } from '@milkdown/kit/core';
import { editorViewCtx } from '@milkdown/kit/core';

import { CommandRegistry, createStandardCommands } from './CommandRegistry';

/**
 * Editor toolbar action types
 */
export type EditorToolbarAction =
  | 'undo'
  | 'redo'
  | 'heading-2'
  | 'heading-3'
  | 'blockquote'
  | 'code-block'
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'bullet-list'
  | 'ordered-list';

/**
 * Button configuration interface
 */
export interface EditorToolbarButton {
  action: EditorToolbarAction;
  label: string;
  title: string;
  modifierClass?: string;
}

/**
 * Toolbar button groups - organized by functionality (default/full view)
 */
export const TOOLBAR_BUTTON_GROUPS: EditorToolbarButton[][] = [
  // Blocks
  [
    {
      action: 'heading-2',
      label: 'H2',
      title: 'Heading 2 (Ctrl+Alt+2)',
    },
    {
      action: 'heading-3',
      label: 'H3',
      title: 'Heading 3 (Ctrl+Alt+3)',
    },
    {
      action: 'blockquote',
      label: '>',
      title: 'Blockquote (Ctrl+Shift+B)',
    },
    {
      action: 'code-block',
      label: '{}',
      title: 'Code block (Ctrl+Alt+C)',
    },
  ],
  // Inline formatting
  [
    {
      action: 'bold',
      label: 'B',
      title: 'Bold (Ctrl+B)',
    },
    {
      action: 'italic',
      label: 'I',
      title: 'Italic (Ctrl+I)',
    },
    {
      action: 'strike',
      label: 'S',
      title: 'Strikethrough (Ctrl+Alt+X)',
      modifierClass: 'review-editor-toolbar-btn-strike',
    },
    {
      action: 'code',
      label: '`',
      title: 'Inline code (Ctrl+E)',
    },
  ],
  // Lists
  [
    {
      action: 'bullet-list',
      label: '•',
      title: 'Bullet list (Ctrl+Alt+8)',
    },
    {
      action: 'ordered-list',
      label: '1.',
      title: 'Ordered list (Ctrl+Alt+9)',
    },
  ],
];

/**
 * Context-aware toolbar configurations based on element type
 * Maps element types to their most relevant button groups
 */
export const CONTEXT_TOOLBAR_CONFIGS: Record<string, EditorToolbarButton[][]> =
  {
    // For headers - focus on heading levels and basic formatting
    heading: [
      [
        {
          action: 'heading-2',
          label: 'H2',
          title: 'Heading 2 (Ctrl+Alt+2)',
        },
        {
          action: 'heading-3',
          label: 'H3',
          title: 'Heading 3 (Ctrl+Alt+3)',
        },
        {
          action: 'blockquote',
          label: '>',
          title: 'Blockquote (Ctrl+Shift+B)',
        },
      ],
      [
        {
          action: 'bold',
          label: 'B',
          title: 'Bold (Ctrl+B)',
        },
        {
          action: 'italic',
          label: 'I',
          title: 'Italic (Ctrl+I)',
        },
        {
          action: 'code',
          label: '`',
          title: 'Inline code (Ctrl+E)',
        },
      ],
    ],

    // For paragraphs - focus on text formatting and lists
    paragraph: [
      [
        {
          action: 'bold',
          label: 'B',
          title: 'Bold (Ctrl+B)',
        },
        {
          action: 'italic',
          label: 'I',
          title: 'Italic (Ctrl+I)',
        },
        {
          action: 'strike',
          label: 'S',
          title: 'Strikethrough (Ctrl+Alt+X)',
          modifierClass: 'review-editor-toolbar-btn-strike',
        },
        {
          action: 'code',
          label: '`',
          title: 'Inline code (Ctrl+E)',
        },
      ],
      [
        {
          action: 'bullet-list',
          label: '•',
          title: 'Bullet list (Ctrl+Alt+8)',
        },
        {
          action: 'ordered-list',
          label: '1.',
          title: 'Ordered list (Ctrl+Alt+9)',
        },
      ],
    ],

    // For code blocks - only escape option
    code_block: [
      [
        {
          action: 'code-block',
          label: '{}',
          title: 'Exit code block (Ctrl+Alt+C)',
        },
      ],
    ],

    // For lists - list type switching and light formatting
    bullet_list: [
      [
        {
          action: 'bullet-list',
          label: '•',
          title: 'Bullet list (Ctrl+Alt+8)',
        },
        {
          action: 'ordered-list',
          label: '1.',
          title: 'Ordered list (Ctrl+Alt+9)',
        },
      ],
      [
        {
          action: 'bold',
          label: 'B',
          title: 'Bold (Ctrl+B)',
        },
        {
          action: 'italic',
          label: 'I',
          title: 'Italic (Ctrl+I)',
        },
        {
          action: 'code',
          label: '`',
          title: 'Inline code (Ctrl+E)',
        },
      ],
    ],

    ordered_list: [
      [
        {
          action: 'bullet-list',
          label: '•',
          title: 'Bullet list (Ctrl+Alt+8)',
        },
        {
          action: 'ordered-list',
          label: '1.',
          title: 'Ordered list (Ctrl+Alt+9)',
        },
      ],
      [
        {
          action: 'bold',
          label: 'B',
          title: 'Bold (Ctrl+B)',
        },
        {
          action: 'italic',
          label: 'I',
          title: 'Italic (Ctrl+I)',
        },
        {
          action: 'code',
          label: '`',
          title: 'Inline code (Ctrl+E)',
        },
      ],
    ],

    // For blockquotes - similar to paragraphs
    blockquote: [
      [
        {
          action: 'blockquote',
          label: '>',
          title: 'Blockquote (Ctrl+Shift+B)',
        },
      ],
      [
        {
          action: 'bold',
          label: 'B',
          title: 'Bold (Ctrl+B)',
        },
        {
          action: 'italic',
          label: 'I',
          title: 'Italic (Ctrl+I)',
        },
        {
          action: 'code',
          label: '`',
          title: 'Inline code (Ctrl+E)',
        },
      ],
    ],
  };

/**
 * EditorToolbar class manages the editor's formatting toolbar with context awareness
 */
export class EditorToolbar {
  private element: HTMLElement | null = null;
  private handlersAttached = false;
  private milkdownEditor: Editor | null = null;
  private commandRegistry: CommandRegistry;
  private isCollapsed = true; // Start collapsed to show only core buttons
  private elementType: string = 'default'; // Current element type being edited
  private useContextMode = true; // Use context-aware button sets by default

  constructor(milkdownEditor?: Editor) {
    this.milkdownEditor = milkdownEditor || null;
    this.commandRegistry = new CommandRegistry();

    // Initialize with standard commands
    if (milkdownEditor) {
      this.commandRegistry.setEditor(milkdownEditor);
      this.commandRegistry.registerBatch(createStandardCommands());
    }

    // Load user preference for context mode
    this.useContextMode = this.loadContextModePreference();
  }

  /**
   * Set the element type being edited (for context-aware toolbar)
   */
  setElementType(type: string): void {
    this.elementType = type || 'default';
  }

  /**
   * Get the current element type being edited
   */
  getElementType(): string {
    return this.elementType;
  }

  /**
   * Toggle context mode (context-aware vs. full toolbar)
   */
  toggleContextMode(): void {
    this.useContextMode = !this.useContextMode;
    this.saveContextModePreference();
    this.refresh();
  }

  /**
   * Load context mode preference from localStorage
   */
  private loadContextModePreference(): boolean {
    try {
      const saved = localStorage.getItem('review-toolbar-context-mode');
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true; // Default to context mode on error
    }
  }

  /**
   * Save context mode preference to localStorage
   */
  private saveContextModePreference(): void {
    try {
      localStorage.setItem(
        'review-toolbar-context-mode',
        JSON.stringify(this.useContextMode)
      );
    } catch {
      // Silently fail if localStorage unavailable
    }
  }

  /**
   * Get button groups for current context
   */
  private getButtonGroups(): EditorToolbarButton[][] {
    if (!this.useContextMode) {
      return TOOLBAR_BUTTON_GROUPS; // Use full toolbar
    }

    // Try to get context-specific config
    const config = CONTEXT_TOOLBAR_CONFIGS[this.elementType];
    if (config) {
      return config;
    }

    // Fall back to default config
    return TOOLBAR_BUTTON_GROUPS;
  }

  /**
   * Refresh toolbar to reflect context changes
   */
  private refresh(): void {
    if (!this.element) return;

    // Remove existing buttons
    const oldGroups = this.element.querySelectorAll(
      '.review-editor-toolbar-group'
    );
    oldGroups.forEach((group) => group.remove());

    // Recreate buttons with new configuration
    const buttonGroups = this.getButtonGroups();
    let buttonCount = 0;
    const CORE_BUTTON_COUNT = 3;

    buttonGroups.forEach((group, groupIndex) => {
      const groupElem = document.createElement('div');
      groupElem.className = 'review-editor-toolbar-group';
      groupElem.setAttribute('role', 'group');
      groupElem.setAttribute(
        'aria-label',
        `Formatting controls group ${groupIndex + 1}`
      );

      group.forEach((buttonConfig) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'review-editor-toolbar-btn';
        if (buttonConfig.modifierClass) {
          button.classList.add(buttonConfig.modifierClass);
        }
        // Mark first N buttons as core buttons (visible in collapsed state)
        if (buttonCount < CORE_BUTTON_COUNT) {
          button.classList.add('review-editor-toolbar-btn-core');
        }
        button.dataset.command = buttonConfig.action;
        button.textContent = buttonConfig.label;
        button.setAttribute('title', buttonConfig.title);
        button.setAttribute('aria-label', buttonConfig.title);
        button.setAttribute('aria-pressed', 'false');

        groupElem.appendChild(button);
        buttonCount++;
      });

      // Insert before the toggle buttons
      const toggleBtn = this.element!.querySelector(
        '.review-editor-toolbar-toggle'
      );
      if (toggleBtn) {
        this.element!.insertBefore(groupElem, toggleBtn);
      } else {
        this.element!.appendChild(groupElem);
      }
    });

    // Ensure handlers are reattached after rebuild
    if (this.handlersAttached) {
      this.attachHandlers();
    }
  }

  /**
   * Set the Milkdown editor instance
   */
  setEditor(editor: Editor): void {
    this.milkdownEditor = editor;
    this.commandRegistry.setEditor(editor);
    // Register standard commands if not already done
    if (this.commandRegistry.getAllCommands().length === 0) {
      this.commandRegistry.registerBatch(createStandardCommands());
    }
  }

  /**
   * Create the toolbar DOM element
   */
  create(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'review-editor-toolbar review-editor-toolbar-collapsed';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Formatting toolbar');

    // Add undo button in top-left corner
    const undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.className =
      'review-editor-toolbar-undo-redo review-editor-toolbar-undo';
    undoBtn.setAttribute('aria-label', 'Undo (Ctrl+Z)');
    undoBtn.setAttribute('title', 'Undo (Ctrl+Z)');
    undoBtn.textContent = '↶';
    undoBtn.dataset.command = 'undo';
    undoBtn.disabled = true;
    toolbar.appendChild(undoBtn);

    // Add redo button in top-right corner
    const redoBtn = document.createElement('button');
    redoBtn.type = 'button';
    redoBtn.className =
      'review-editor-toolbar-undo-redo review-editor-toolbar-redo';
    redoBtn.setAttribute('aria-label', 'Redo (Ctrl+Y)');
    redoBtn.setAttribute('title', 'Redo (Ctrl+Y)');
    redoBtn.textContent = '↷';
    redoBtn.dataset.command = 'redo';
    redoBtn.disabled = true;
    toolbar.appendChild(redoBtn);

    let buttonCount = 0;
    const CORE_BUTTON_COUNT = 3; // Show 3 core buttons in collapsed state

    // Use context-aware button groups
    const buttonGroups = this.getButtonGroups();

    buttonGroups.forEach((group, groupIndex) => {
      const groupElem = document.createElement('div');
      groupElem.className = 'review-editor-toolbar-group';
      groupElem.setAttribute('role', 'group');
      groupElem.setAttribute(
        'aria-label',
        `Formatting controls group ${groupIndex + 1}`
      );

      group.forEach((buttonConfig) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'review-editor-toolbar-btn';
        if (buttonConfig.modifierClass) {
          button.classList.add(buttonConfig.modifierClass);
        }
        // Mark first N buttons as core buttons (visible in collapsed state)
        if (buttonCount < CORE_BUTTON_COUNT) {
          button.classList.add('review-editor-toolbar-btn-core');
        }
        button.dataset.command = buttonConfig.action;
        button.textContent = buttonConfig.label;
        button.setAttribute('title', buttonConfig.title);
        button.setAttribute('aria-label', buttonConfig.title);
        button.setAttribute('aria-pressed', 'false');

        groupElem.appendChild(button);
        buttonCount++;
      });

      toolbar.appendChild(groupElem);
    });

    // Add context mode toggle button (shows/hides depending on current mode)
    const contextToggleBtn = document.createElement('button');
    contextToggleBtn.type = 'button';
    contextToggleBtn.className = 'review-editor-toolbar-context-toggle';
    contextToggleBtn.setAttribute(
      'aria-label',
      this.useContextMode ? 'Show all buttons' : 'Show smart buttons'
    );
    contextToggleBtn.setAttribute(
      'title',
      this.useContextMode ? 'Show all buttons (⇄)' : 'Show smart buttons (⇄)'
    );
    contextToggleBtn.textContent = '⇄';
    toolbar.appendChild(contextToggleBtn);

    // Add expand/collapse toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'review-editor-toolbar-toggle';
    toggleBtn.setAttribute('aria-label', 'Expand toolbar');
    toggleBtn.textContent = '⋯';
    toolbar.appendChild(toggleBtn);

    this.element = toolbar;
    return toolbar;
  }

  /**
   * Toggle toolbar collapsed/expanded state
   */
  private toggleCollapsed(): void {
    if (!this.element) return;

    this.isCollapsed = !this.isCollapsed;
    this.element.classList.toggle(
      'review-editor-toolbar-collapsed',
      this.isCollapsed
    );

    // Update button label
    const toggleBtn = this.element.querySelector(
      '.review-editor-toolbar-toggle'
    ) as HTMLButtonElement;
    if (toggleBtn) {
      toggleBtn.setAttribute(
        'aria-label',
        this.isCollapsed ? 'Expand toolbar' : 'Collapse toolbar'
      );
    }
  }

  /**
   * Attach event handlers to the toolbar
   */
  attachHandlers(): void {
    if (!this.element || this.handlersAttached) {
      return;
    }

    this.element.addEventListener('mousedown', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
        'button[data-command]'
      );
      if (target) {
        event.preventDefault();
      }
    });

    this.element.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
        'button[data-command]'
      );
      if (!target || target.disabled) {
        return;
      }
      event.preventDefault();
      const command = target.dataset.command as EditorToolbarAction | undefined;
      if (!command) {
        return;
      }
      this.executeCommand(command);
    });

    // Handle context mode toggle button
    const contextToggleBtn = this.element.querySelector(
      '.review-editor-toolbar-context-toggle'
    ) as HTMLButtonElement;
    if (contextToggleBtn) {
      contextToggleBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.toggleContextMode();
      });
    }

    // Handle expand/collapse toggle button
    const toggleBtn = this.element.querySelector(
      '.review-editor-toolbar-toggle'
    ) as HTMLButtonElement;
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.toggleCollapsed();
      });
    }

    this.handlersAttached = true;
  }

  /**
   * Execute a toolbar command using the command registry
   */
  private executeCommand(action: EditorToolbarAction): void {
    if (!this.milkdownEditor) return;

    // Focus the editor first
    this.milkdownEditor.action((ctx: any) => {
      const view = ctx.get(editorViewCtx);
      view.focus();
    });

    // Execute the command through the registry
    const handled = this.commandRegistry.execute(action);

    if (handled) {
      requestAnimationFrame(() => {
        this.updateState();
      });
    }
  }

  /**
   * Update button states based on current editor state
   */
  updateState(): void {
    if (!this.element || !this.milkdownEditor) {
      return;
    }

    const buttons = Array.from(
      this.element.querySelectorAll<HTMLButtonElement>('button[data-command]')
    );

    buttons.forEach((button) => {
      const action = button.dataset.command as EditorToolbarAction;

      // Special handling for undo/redo buttons - check if they're enabled
      if (action === 'undo' || action === 'redo') {
        const canExecute = this.canExecuteCommand(action);
        button.disabled = !canExecute;
        button.classList.toggle(
          'review-editor-toolbar-undo-redo-disabled',
          !canExecute
        );
      } else {
        // For other buttons, track active state
        const isActive = this.commandRegistry.getActiveState(action);
        button.classList.toggle('review-editor-toolbar-btn-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      }
    });
  }

  /**
   * Check if a command can be executed (for undo/redo state)
   */
  private canExecuteCommand(action: EditorToolbarAction): boolean {
    if (!this.milkdownEditor) {
      return false;
    }

    // For undo/redo, we check the editor state
    if (action === 'undo' || action === 'redo') {
      let canExecute = false;
      this.milkdownEditor.action((ctx: any) => {
        const state = ctx.get(editorViewCtx).state;
        if (action === 'undo') {
          // Check if there's any history to undo
          canExecute =
            state.history &&
            state.history.done &&
            state.history.done.length > 0;
        } else if (action === 'redo') {
          // Check if there's any history to redo
          canExecute =
            state.history &&
            state.history.undone &&
            state.history.undone.length > 0;
        }
      });
      return canExecute;
    }

    return false;
  }

  /**
   * Get the toolbar element
   */
  getElement(): HTMLElement | null {
    return this.element;
  }

  /**
   * Get command registry for external access
   */
  getCommandRegistry(): CommandRegistry {
    return this.commandRegistry;
  }

  /**
   * Destroy the toolbar and clean up
   */
  destroy(): void {
    this.element = null;
    this.handlersAttached = false;
  }
}
