import {
  $mark,
  $inputRule,
  $prose,
  $useKeymap,
  $remark,
} from '@milkdown/utils';
import { Plugin, PluginKey } from '@milkdown/prose/state';
import type { MarkSchema } from '@milkdown/transformer';
import { toggleMark } from '@milkdown/prose/commands';
import { schemaCtx } from '@milkdown/core';
import { remarkCriticMarkupMilkdown } from './remark-parser';

// ---- MARK HELPERS ---- //

function createCriticMark(
  schemaName: string,
  markupName: string,
  className: string
): MarkSchema {
  return {
    // Prevent invalid mark nesting in lists or other blocks
    excludes: '',

    parseDOM: [
      { tag: `span[data-critic="${markupName}"]` },
      ...(markupName === 'addition' ? [{ tag: 'ins' }] : []),
      ...(markupName === 'deletion' ? [{ tag: 'del' }] : []),
      ...(markupName === 'highlight' ? [{ tag: 'mark' }] : []),
    ],

    toDOM: (): [string, Record<string, string>, 0] => {
      if (markupName === 'addition')
        return ['ins', { 'data-critic': markupName, class: className }, 0];
      if (markupName === 'deletion')
        return ['del', { 'data-critic': markupName, class: className }, 0];
      if (markupName === 'highlight')
        return ['mark', { 'data-critic': markupName, class: className }, 0];
      return ['span', { 'data-critic': markupName, class: className }, 0];
    },

    parseMarkdown: {
      match: (node: any) =>
        node.type === 'criticMarkup' && node.markup === markupName,
      runner: (state: any, node: any, markType: any) => {
        state.openMark(markType);

        // Extract text values and create completely new objects
        // This ensures NO references to original nodes remain
        const textValues: string[] = [];

        if (node.children && Array.isArray(node.children)) {
          for (const child of node.children) {
            if (child && child.type === 'text' && child.value) {
              textValues.push(String(child.value));
            }
          }
        }

        // Create brand new text nodes from scratch
        const textNodes = textValues.map((value) => ({
          type: 'text',
          value: value,
        }));

        state.next(textNodes);
        state.closeMark(markType);
      },
    },

    toMarkdown: {
      match: (mark: any) => mark.type.name === schemaName,
      runner: (state: any, mark: any) => {
        state.withMark(mark, 'criticMarkup', undefined, {
          markup: markupName,
        });
      },
    },
  };
}

// ---- MARK DEFINITIONS ---- //
// NOTE: These are factory functions that create new plugin instances
// This ensures fresh instances on each editor initialization and prevents
// "o is not a function" errors from plugin state corruption

export const criticAddition = $mark('criticAddition', () =>
  createCriticMark('criticAddition', 'addition', 'critic-addition')
);
export const criticDeletion = $mark('criticDeletion', () =>
  createCriticMark('criticDeletion', 'deletion', 'critic-deletion')
);
export const criticHighlight = $mark('criticHighlight', () =>
  createCriticMark('criticHighlight', 'highlight', 'critic-highlight')
);
export const criticComment = $mark('criticComment', () =>
  createCriticMark('criticComment', 'comment', 'critic-comment')
);
export const criticSubstitution = $mark('criticSubstitution', () =>
  createCriticMark('criticSubstitution', 'substitution', 'critic-substitution')
);

// ---- INPUT RULES ---- //

function makeCriticRule(regex: RegExp) {
  return $inputRule(() => ({
    match: regex,
    inCode: false, // <--- required by InputRule
    inCodeMark: false, // <--- required by InputRule
    handler: ({
      state,
      range,
      match,
    }: {
      state: any;
      range: any;
      match: any;
    }) => {
      const tr = state.tr.insertText(match[1], range.from, range.to);
      return tr;
    },
  }));
}

// Example (optional, placeholder)
export const criticAdditionRule = makeCriticRule(/\{([+]{2})([^}]+)\1}/);

// ---- KEYMAP ---- //

export const criticKeymap = $useKeymap(
  'criticKeymap',
  (ctx: { get: (arg0: any) => any }) => {
    const schema = ctx.get(schemaCtx); // ✅ get schema correctly

    return {
      'Mod-Shift-A': toggleMark(schema.marks.criticAddition),
      'Mod-Shift-D': toggleMark(schema.marks.criticDeletion),
      'Mod-Shift-H': toggleMark(schema.marks.criticHighlight),
      'Mod-Shift-C': toggleMark(schema.marks.criticComment),
      'Mod-Shift-S': toggleMark(schema.marks.criticSubstitution),
    };
  }
);

// ---- OPTIONAL: DECORATION PLUGIN (empty placeholder, safe stub) ---- //

export const criticDecorationPlugin = $prose(() => {
  return new Plugin({
    key: new PluginKey('criticDecoration'),
    props: {
      decorations() {
        return null; // no decorations yet
      },
    },
  });
});

export const criticMarkupPlugin = $prose(() => {
  return new Plugin({
    key: new PluginKey('criticMarkup'),
  });
});

// ---- REMARK PLUGIN ---- //

export const criticMarkupRemarkPlugin = $remark(
  'criticMarkupRemark',
  () => remarkCriticMarkupMilkdown
);
