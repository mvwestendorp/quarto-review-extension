/**
 * Remark plugin for CriticMarkup syntax
 * Supports: additions, deletions, substitutions, comments, and highlights
 */

import { visit } from 'unist-util-visit';
import type { Root, Text, Html, Parent } from 'mdast';
import type { Plugin } from 'unified';

interface CriticMarkupOptions {
  // Whether to render in accept mode (show additions/new, hide deletions/old)
  acceptMode?: boolean;
  // Whether to render in reject mode (show deletions/old, hide additions/new)
  rejectMode?: boolean;
  // CSS class prefix for generated HTML
  classPrefix?: string;
}

const defaultOptions: CriticMarkupOptions = {
  acceptMode: false,
  rejectMode: false,
  classPrefix: 'critic',
};

/**
 * CriticMarkup patterns
 * Using [\s\S] instead of . to match newlines
 */
const PATTERNS = {
  // Addition: {++text++}
  addition: /\{\+\+([\s\S]+?)\+\+\}/g,
  // Deletion: {--text--}
  deletion: /\{--([\s\S]+?)--\}/g,
  // Substitution: {~~old~>new~~}
  substitution: /\{~~([\s\S]+?)~>([\s\S]+?)~~\}/g,
  // Comment: {>>comment<<}
  comment: /\{>>([\s\S]+?)<<\}/g,
  // Highlight: {==text==} optionally followed by {>>comment<<}
  highlight: /\{==([\s\S]+?)==\}(?:\{>>([\s\S]+?)<<\})?/g,
};

/**
 * Convert CriticMarkup syntax to HTML
 */
function processCriticMarkup(
  text: string,
  options: CriticMarkupOptions
): string {
  const { acceptMode, rejectMode, classPrefix } = options;
  let result = text;

  // Process additions
  result = result.replace(PATTERNS.addition, (_match, content) => {
    if (rejectMode) {
      return ''; // Hide additions in reject mode
    }
    return `<ins class="${classPrefix}-addition" data-critic-type="addition">${content}</ins>`;
  });

  // Process deletions
  result = result.replace(PATTERNS.deletion, (_match, content) => {
    if (acceptMode) {
      return ''; // Hide deletions in accept mode
    }
    return `<del class="${classPrefix}-deletion" data-critic-type="deletion">${content}</del>`;
  });

  // Process substitutions
  result = result.replace(PATTERNS.substitution, (_match, oldText, newText) => {
    let markup = '';

    if (!acceptMode) {
      markup += `<del class="${classPrefix}-substitution-old" data-critic-type="deletion">${oldText}</del>`;
    }

    if (!rejectMode) {
      markup += `<ins class="${classPrefix}-substitution-new" data-critic-type="addition">${newText}</ins>`;
    }

    return `<span class="${classPrefix}-substitution" data-critic-type="substitution">${markup}</span>`;
  });

  // Process highlights with optional comments
  result = result.replace(PATTERNS.highlight, (_match, text, comment) => {
    const commentHtml = comment
      ? `<span class="${classPrefix}-comment" data-critic-type="comment">${comment}</span>`
      : '';
    return `<mark class="${classPrefix}-highlight" data-critic-type="highlight">${text}</mark>${commentHtml}`;
  });

  // Process standalone comments
  result = result.replace(PATTERNS.comment, (_match, content) => {
    return `<span class="${classPrefix}-comment" data-critic-type="comment">${content}</span>`;
  });

  return result;
}

/**
 * Check if text contains CriticMarkup syntax
 */
function hasCriticMarkup(text: string): boolean {
  return Object.values(PATTERNS).some((pattern) => {
    pattern.lastIndex = 0; // Reset regex
    return pattern.test(text);
  });
}

function renderSubstitutionMarkup(
  oldText: string,
  newText: string,
  options: CriticMarkupOptions
): string {
  const { classPrefix, acceptMode, rejectMode } = options;

  let markup = '';

  if (!acceptMode) {
    markup += `<del class="${classPrefix}-substitution-old" data-critic-type="deletion">${oldText}</del>`;
  }

  if (!rejectMode) {
    markup += `<ins class="${classPrefix}-substitution-new" data-critic-type="addition">${newText}</ins>`;
  }

  return `<span class="${classPrefix}-substitution" data-critic-type="substitution">${markup}</span>`;
}

function processNodeChildren(node: Parent, options: CriticMarkupOptions): void {
  if (!node.children) return;

  const nextChildren: Parent['children'] = [];

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i] as any;

    if (child.type === 'delete') {
      const previous = nextChildren[nextChildren.length - 1] as
        | Text
        | Html
        | undefined;
      const nextSibling = node.children[i + 1] as Text | undefined;
      const deleteText =
        child.children
          ?.map((c: any) => ('value' in c ? (c as Text).value : ''))
          .join('') ?? '';
      const [oldText, newText] = deleteText.split('~>');

      if (
        oldText !== undefined &&
        newText !== undefined &&
        previous &&
        previous.type === 'text' &&
        nextSibling &&
        nextSibling.type === 'text' &&
        previous.value?.includes('{') &&
        nextSibling.value?.includes('}')
      ) {
        const braceIndex = previous.value.lastIndexOf('{');
        if (braceIndex !== -1) {
          const updated =
            previous.value.slice(0, braceIndex) +
            previous.value.slice(braceIndex + 1);
          if (updated) {
            previous.value = updated;
          } else {
            nextChildren.pop();
          }
        }

        const substitutionHtml = renderSubstitutionMarkup(
          oldText,
          newText,
          options
        );
        nextChildren.push({
          type: 'html',
          value: substitutionHtml,
        } as Html);

        nextSibling.value = nextSibling.value.replace(/^\}/, '');

        continue;
      }
    }

    nextChildren.push(child);
  }

  node.children = nextChildren;
}

/**
 * Remark plugin to transform CriticMarkup syntax
 */
export const remarkCriticMarkup: Plugin<[CriticMarkupOptions?], Root> = (
  userOptions = {}
) => {
  const options = { ...defaultOptions, ...userOptions };

  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === null || index === undefined) return;

      const text = node.value;

      // Only process if text contains CriticMarkup
      if (!hasCriticMarkup(text)) return;

      // Convert CriticMarkup to HTML
      const html = processCriticMarkup(text, options);

      // Replace text node with HTML node
      const htmlNode: Html = {
        type: 'html',
        value: html,
      };

      (parent as Parent).children[index] = htmlNode;
    });

    visit(
      tree,
      ['paragraph', 'heading', 'table', 'tableRow', 'tableCell'],
      (node: any) => {
        processNodeChildren(node, options);
      }
    );
  };
};

/**
 * Extract all CriticMarkup annotations from text
 */
export function extractCriticMarkup(text: string): {
  type: 'addition' | 'deletion' | 'substitution' | 'comment' | 'highlight';
  content: string;
  comment?: string;
  position: { start: number; end: number };
}[] {
  const annotations: ReturnType<typeof extractCriticMarkup> = [];

  // Extract additions
  let match;
  PATTERNS.addition.lastIndex = 0;
  while ((match = PATTERNS.addition.exec(text)) !== null) {
    const fullMatch = match?.[0] ?? '';
    const content = match?.[1] ?? '';
    const matchIndex = match?.index ?? 0;
    annotations.push({
      type: 'addition',
      content,
      position: { start: matchIndex, end: matchIndex + fullMatch.length },
    });
  }

  // Extract deletions
  PATTERNS.deletion.lastIndex = 0;
  while ((match = PATTERNS.deletion.exec(text)) !== null) {
    const fullMatch = match?.[0] ?? '';
    const content = match?.[1] ?? '';
    const matchIndex = match?.index ?? 0;
    annotations.push({
      type: 'deletion',
      content,
      position: { start: matchIndex, end: matchIndex + fullMatch.length },
    });
  }

  // Extract substitutions
  PATTERNS.substitution.lastIndex = 0;
  while ((match = PATTERNS.substitution.exec(text)) !== null) {
    const fullMatch = match?.[0] ?? '';
    const left = match?.[1] ?? '';
    const right = match?.[2] ?? '';
    const matchIndex = match?.index ?? 0;
    annotations.push({
      type: 'substitution',
      content: `${left}~>${right}`,
      position: { start: matchIndex, end: matchIndex + fullMatch.length },
    });
  }

  // Extract highlights
  PATTERNS.highlight.lastIndex = 0;
  while ((match = PATTERNS.highlight.exec(text)) !== null) {
    const fullMatch = match?.[0] ?? '';
    const content = match?.[1] ?? '';
    const comment = match?.[2] ?? '';
    const matchIndex = match?.index ?? 0;
    annotations.push({
      type: 'highlight',
      content,
      comment: comment || undefined,
      position: { start: matchIndex, end: matchIndex + fullMatch.length },
    });
  }

  // Extract standalone comments
  PATTERNS.comment.lastIndex = 0;
  while ((match = PATTERNS.comment.exec(text)) !== null) {
    const fullMatch = match?.[0] ?? '';
    const content = match?.[1] ?? '';
    const matchIndex = match?.index ?? 0;
    // Skip if this comment is part of a highlight (already processed)
    const prevChar = matchIndex > 0 ? text.charAt(matchIndex - 1) : '';
    const isPreviousHighlight = prevChar === '}';
    if (!isPreviousHighlight) {
      annotations.push({
        type: 'comment',
        content,
        position: { start: matchIndex, end: matchIndex + fullMatch.length },
      });
    }
  }

  return annotations.sort((a, b) => a.position.start - b.position.start);
}

export default remarkCriticMarkup;
