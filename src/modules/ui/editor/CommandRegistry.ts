/**
 * Command Registry
 *
 * Centralized registry for editor commands.
 * Decouples command logic from the toolbar by providing a registration-based pattern.
 * Enables runtime command registration, composition, and extensibility.
 */

import type { Editor } from '@milkdown/kit/core';
import { commandsCtx, editorViewCtx } from '@milkdown/kit/core';
import {
  toggleStrongCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  wrapInHeadingCommand,
  turnIntoTextCommand,
  wrapInBlockquoteCommand,
  liftListItemCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  createCodeBlockCommand,
} from '@milkdown/kit/preset/commonmark';
import { toggleStrikethroughCommand } from '@milkdown/kit/preset/gfm';
import { undoCommand, redoCommand } from '@milkdown/kit/plugin/history';
import type { EditorState } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';

import { createModuleLogger } from '@utils/debug';

const logger = createModuleLogger('CommandRegistry');

/**
 * Command execution context passed to command handlers
 */
export interface CommandContext {
  editor: Editor;
  commands: any; // Milkdown commands context
  view: EditorView;
  state: EditorState;
}

/**
 * Command handler function signature
 */
export type CommandHandler = (context: CommandContext) => boolean;

/**
 * Command definition with metadata
 */
export interface CommandDefinition {
  id: string;
  label: string;
  handler: CommandHandler;
  isActive?: (state: EditorState) => boolean;
}

/**
 * CommandRegistry manages command registration and execution
 */
export class CommandRegistry {
  private commands: Map<string, CommandDefinition> = new Map();
  private editor: Editor | null = null;

  /**
   * Initialize the registry with an editor instance
   */
  setEditor(editor: Editor): void {
    this.editor = editor;
  }

  /**
   * Register a command
   */
  register(definition: CommandDefinition): void {
    if (this.commands.has(definition.id)) {
      logger.warn(
        `Command '${definition.id}' is already registered, overwriting`
      );
    }
    this.commands.set(definition.id, definition);
    logger.debug(`Registered command: ${definition.id}`);
  }

  /**
   * Register multiple commands at once
   */
  registerBatch(definitions: CommandDefinition[]): void {
    definitions.forEach((def) => this.register(def));
  }

  /**
   * Execute a command by ID
   */
  execute(commandId: string): boolean {
    if (!this.editor) {
      logger.error('Editor not initialized');
      return false;
    }

    const command = this.commands.get(commandId);
    if (!command) {
      logger.warn(`Command '${commandId}' not found`);
      return false;
    }

    try {
      let result = false;
      this.editor.action((ctx: any) => {
        const context: CommandContext = {
          editor: this.editor!,
          commands: ctx.get(commandsCtx),
          view: ctx.get(editorViewCtx),
          state: ctx.get(editorViewCtx).state,
        };
        result = command.handler(context);
      });
      return result;
    } catch (error) {
      logger.error(`Error executing command '${commandId}':`, error);
      return false;
    }
  }

  /**
   * Get command definition
   */
  getCommand(commandId: string): CommandDefinition | undefined {
    return this.commands.get(commandId);
  }

  /**
   * Get all registered commands
   */
  getAllCommands(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  /**
   * Check if a command is registered
   */
  hasCommand(commandId: string): boolean {
    return this.commands.has(commandId);
  }

  /**
   * Get active state of a command
   */
  getActiveState(commandId: string): boolean {
    if (!this.editor) {
      return false;
    }

    const command = this.commands.get(commandId);
    if (!command || !command.isActive) {
      return false;
    }

    let activeState = false;
    this.editor.action((ctx: any) => {
      const view = ctx.get(editorViewCtx);
      activeState = command.isActive!(view.state);
    });

    return activeState;
  }

  /**
   * Helper: Check if a mark is active at cursor position
   */
  static isMarkActive(state: EditorState, typeName: string): boolean {
    const { from, to } = state.selection;
    const { marks } = state.schema;
    const targetMark = marks[typeName];

    if (!targetMark) return false;

    let hasMarkInRange = false;

    state.doc.nodesBetween(from, to, (node) => {
      if (node.isText) {
        const marks = node.marks || [];
        const hasMark = marks.some((mark) => mark.type.name === typeName);
        if (hasMark) {
          hasMarkInRange = true;
          return false; // Stop early
        }
      }
      return true;
    });

    return hasMarkInRange;
  }

  /**
   * Helper: Check if a node type is active at cursor position
   */
  static isNodeActive(
    state: EditorState,
    typeName: string,
    attrs?: Record<string, any>
  ): boolean {
    const { $from } = state.selection;
    let depth = $from.depth;

    while (depth > 0) {
      const node = $from.node(depth);
      if (node.type.name === typeName) {
        if (!attrs) return true;

        const nodeAttrs = node.attrs || {};
        return Object.keys(attrs).every((key) => nodeAttrs[key] === attrs[key]);
      }
      depth--;
    }

    return false;
  }

  /**
   * Helper: Lift a blockquote (remove blockquote wrapper)
   */
  static liftBlockquote(view: EditorView): boolean {
    const { state, dispatch } = view;
    const { $from } = state.selection;

    // Find blockquote ancestor
    let depth = $from.depth;
    while (depth > 0) {
      if ($from.node(depth).type.name === 'blockquote') {
        break;
      }
      depth--;
    }

    if (depth === 0) return false;

    const blockquoteNode = $from.node(depth);
    const blockquoteStart = $from.before(depth);
    const blockquoteEnd = blockquoteStart + blockquoteNode.nodeSize;

    const tr = state.tr;
    const content = blockquoteNode.content;

    tr.replaceWith(blockquoteStart, blockquoteEnd, content);
    dispatch(tr);

    return true;
  }
}

/**
 * Create and return the standard editor commands
 */
export function createStandardCommands(): CommandDefinition[] {
  return [
    // Undo/Redo
    {
      id: 'undo',
      label: 'Undo',
      handler: (ctx) => ctx.commands.call(undoCommand.key),
      isActive: () => false, // Undo/Redo don't have active state
    },
    {
      id: 'redo',
      label: 'Redo',
      handler: (ctx) => ctx.commands.call(redoCommand.key),
      isActive: () => false,
    },
    // Inline formatting
    {
      id: 'bold',
      label: 'Bold',
      handler: (ctx) => ctx.commands.call(toggleStrongCommand.key),
      isActive: (state) => CommandRegistry.isMarkActive(state, 'strong'),
    },
    {
      id: 'italic',
      label: 'Italic',
      handler: (ctx) => ctx.commands.call(toggleEmphasisCommand.key),
      isActive: (state) => CommandRegistry.isMarkActive(state, 'emphasis'),
    },
    {
      id: 'strike',
      label: 'Strike',
      handler: (ctx) => ctx.commands.call(toggleStrikethroughCommand.key),
      isActive: (state) =>
        CommandRegistry.isMarkActive(state, 'strike_through'),
    },
    {
      id: 'code',
      label: 'Code',
      handler: (ctx) => ctx.commands.call(toggleInlineCodeCommand.key),
      isActive: (state) => CommandRegistry.isMarkActive(state, 'inlineCode'),
    },
    // Block formatting
    {
      id: 'heading-2',
      label: 'Heading 2',
      handler: (ctx) => {
        if (CommandRegistry.isNodeActive(ctx.state, 'heading', { level: 2 })) {
          return ctx.commands.call(turnIntoTextCommand.key);
        }
        return ctx.commands.call(wrapInHeadingCommand.key, 2);
      },
      isActive: (state) =>
        CommandRegistry.isNodeActive(state, 'heading', { level: 2 }),
    },
    {
      id: 'heading-3',
      label: 'Heading 3',
      handler: (ctx) => {
        if (CommandRegistry.isNodeActive(ctx.state, 'heading', { level: 3 })) {
          return ctx.commands.call(turnIntoTextCommand.key);
        }
        return ctx.commands.call(wrapInHeadingCommand.key, 3);
      },
      isActive: (state) =>
        CommandRegistry.isNodeActive(state, 'heading', { level: 3 }),
    },
    {
      id: 'blockquote',
      label: 'Blockquote',
      handler: (ctx) => {
        if (CommandRegistry.isNodeActive(ctx.state, 'blockquote')) {
          return CommandRegistry.liftBlockquote(ctx.view);
        }
        return ctx.commands.call(wrapInBlockquoteCommand.key);
      },
      isActive: (state) => CommandRegistry.isNodeActive(state, 'blockquote'),
    },
    {
      id: 'code-block',
      label: 'Code Block',
      handler: (ctx) => {
        if (CommandRegistry.isNodeActive(ctx.state, 'code_block')) {
          return ctx.commands.call(turnIntoTextCommand.key);
        }
        return ctx.commands.call(createCodeBlockCommand.key);
      },
      isActive: (state) => CommandRegistry.isNodeActive(state, 'code_block'),
    },
    // Lists
    {
      id: 'bullet-list',
      label: 'Bullet List',
      handler: (ctx) => {
        if (CommandRegistry.isNodeActive(ctx.state, 'bullet_list')) {
          return ctx.commands.call(liftListItemCommand.key);
        }
        return ctx.commands.call(wrapInBulletListCommand.key);
      },
      isActive: (state) => CommandRegistry.isNodeActive(state, 'bullet_list'),
    },
    {
      id: 'ordered-list',
      label: 'Ordered List',
      handler: (ctx) => {
        if (CommandRegistry.isNodeActive(ctx.state, 'ordered_list')) {
          return ctx.commands.call(liftListItemCommand.key);
        }
        return ctx.commands.call(wrapInOrderedListCommand.key);
      },
      isActive: (state) => CommandRegistry.isNodeActive(state, 'ordered_list'),
    },
  ];
}
