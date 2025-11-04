/**
 * Remark plugin for CriticMarkup syntax - Milkdown compatible
 * This plugin creates tokens that Milkdown's mark parser can understand
 *
 * IMPORTANT: This plugin does NOT use unist-util-visit to avoid circular references.
 * Instead, it manually walks the tree without adding parent references.
 */

import type { Root, Text, Parent, Node } from 'mdast';
import type { Plugin } from 'unified';
import type {
  Handle as ToMarkdownHandle,
  Options as ToMarkdownExtension,
} from 'mdast-util-to-markdown';

/**
 * CriticMarkup patterns
 * Using [\s\S] instead of . to match newlines
 */
const PATTERNS = {
  addition: /\{\+\+([\s\S]+?)\+\+\}/g,
  deletion: /\{--([\s\S]+?)--\}/g,
  substitution: /\{~~([\s\S]+?)~>([\s\S]+?)~~\}/g,
  comment: /\{>>([\s\S]+?)<<\}/g,
  highlight: /\{==([\s\S]+?)==\}(?:\{>>([\s\S]+?)<<\})?/g,
};

/**
 * Check if text contains CriticMarkup syntax
 */
function hasCriticMarkup(text: string): boolean {
  return Object.values(PATTERNS).some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

// Create text nodes with only essential properties - NO parent references
const createText = (value: string): Text => ({
  type: 'text',
  value,
});

// Create criticMarkup nodes - NO parent references
const createMarkup = (markup: string, value: string) => ({
  type: 'criticMarkup' as const,
  markup,
  children: [createText(value)],
});

/**
 * Parse CriticMarkup syntax into tokens with children
 * Returns completely clean nodes without ANY circular references
 */
function parseCriticMarkup(text: string): any[] {
  const nodes: any[] = [];
  let lastIndex = 0;

  // Create a combined regex to find all CriticMarkup in order
  const combinedPattern =
    /(\{\+\+([\s\S]+?)\+\+\})|(\{--([\s\S]+?)--\})|(\{~~([\s\S]+?)~>([\s\S]+?)~~\})|(\{>>([\s\S]+?)<<\})|(\{==([\s\S]+?)==\}(?:\{>>([\s\S]+?)<<\})?)/g;

  let match;
  while ((match = combinedPattern.exec(text)) !== null) {
    const fullMatch = match?.[0] ?? '';
    const matchIndex = match?.index ?? 0;
    // Add text before the match
    if (matchIndex > lastIndex) {
      nodes.push(createText(text.substring(lastIndex, matchIndex)));
    }

    // Determine which pattern matched
    if (match?.[1]) {
      // Addition: {++text++}
      nodes.push(createMarkup('addition', match?.[2] ?? ''));
    } else if (match?.[3]) {
      // Deletion: {--text--}
      nodes.push(createMarkup('deletion', match?.[4] ?? ''));
    } else if (match?.[5]) {
      // Substitution: {~~old~>new~~}
      nodes.push(createMarkup('deletion', match?.[6] ?? ''));
      nodes.push(createMarkup('addition', match?.[7] ?? ''));
    } else if (match?.[8]) {
      // Comment: {>>text<<}
      nodes.push(createMarkup('comment', match?.[9] ?? ''));
    } else if (match?.[10]) {
      // Highlight: {==text==}{>>comment<<}?
      nodes.push(createMarkup('highlight', match?.[11] ?? ''));
      if (match?.[12]) {
        nodes.push(createMarkup('comment', match[12] ?? ''));
      }
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    nodes.push(createText(text.substring(lastIndex)));
  }

  return nodes;
}

/**
 * Create a clean copy of a node without parent/position references
 * Recursively cleans all nested objects
 */
function cleanCopyNode(node: any): any {
  if (node === null || node === undefined) return node;

  // Handle primitives
  if (typeof node !== 'object') return node;

  // Handle arrays
  if (Array.isArray(node)) {
    return node.map((item) => cleanCopyNode(item));
  }

  // Create clean object
  const cleaned: any = {};

  // Only copy type first if it exists
  if ('type' in node) {
    cleaned.type = node.type;
  }

  // Copy all other safe properties recursively
  for (const key in node) {
    if (key === 'parent' || key === 'position') continue;
    if (!node.hasOwnProperty(key)) continue;
    if (key === 'type') continue; // Already handled
    if (key === 'children') continue; // Will be handled separately

    // Recursively clean the property value
    cleaned[key] = cleanCopyNode(node[key]);
  }

  return cleaned;
}

/**
 * Process a node's children to parse CriticMarkup
 * Returns NEW children array, does not modify original
 */
function processNodeChildren(node: Parent): any[] {
  if (!node.children) return [];

  const nextChildren: any[] = [];

  for (const child of node.children) {
    if (child.type !== 'text') {
      // Recursively process children if they have children
      if ('children' in child && Array.isArray((child as any).children)) {
        const processedGrandchildren = processNodeChildren(child as Parent);
        // Create a clean copy without parent/position
        const newChild = cleanCopyNode(child);
        newChild.children = processedGrandchildren;
        nextChildren.push(newChild);
      } else {
        // Create a clean copy without parent/position
        nextChildren.push(cleanCopyNode(child));
      }
      continue;
    }

    const textChild = child as Text;
    if (!hasCriticMarkup(textChild.value)) {
      // Create a clean copy of the text node
      nextChildren.push(createText(textChild.value));
      continue;
    }

    const parsed = parseCriticMarkup(textChild.value);
    nextChildren.push(...parsed);
  }

  return nextChildren;
}

/**
 * Manually walk the tree and return a new tree without parent references
 * Does NOT modify the original tree
 */
function walkTree(node: Node): Node {
  if (!('children' in node) || !Array.isArray((node as any).children)) {
    // Leaf node - return a clean copy
    return cleanCopyNode(node);
  }

  const parent = node as Parent;

  // ALWAYS process children to extract CriticMarkup at any level
  // This ensures CriticMarkup is processed even when nested inside strong, emphasis, link, etc.
  const newChildren = processNodeChildren(parent);

  // Return a clean copy of the node with new children
  const cleanNode = cleanCopyNode(node);
  cleanNode.children = newChildren;
  return cleanNode as Node;
}

/**
 * Deep clean a node to remove all parent references and position data that could contain cycles
 */
function deepCleanNode(node: any): any {
  if (node === null || typeof node !== 'object') {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map(deepCleanNode);
  }

  // Create a new object with only safe properties
  const cleaned: any = {};

  for (const key in node) {
    // Skip parent and position to avoid any circular references
    if (key === 'parent' || key === 'position') {
      continue;
    }

    if (node.hasOwnProperty(key)) {
      cleaned[key] = deepCleanNode(node[key]);
    }
  }

  return cleaned;
}

interface CriticMarkupNode extends Parent {
  type: 'criticMarkup';
  markup: string;
}

const CRITIC_DELIMITERS: Record<string, [string, string]> = {
  addition: ['{++', '++}'],
  deletion: ['{--', '--}'],
  highlight: ['{==', '==}'],
  comment: ['{>>', '<<}'],
  substitution: ['{~~', '~~}'],
};

const criticMarkupToMarkdown: ToMarkdownExtension = {
  unsafe: [
    { character: '{', inConstruct: 'phrasing' },
    { character: '}', inConstruct: 'phrasing' },
  ],
  handlers: {
    criticMarkup: ((node, _parent, state, info) => {
      const { markup } = node as CriticMarkupNode;
      const [open, close] = CRITIC_DELIMITERS[markup] ?? ['', ''];

      const tracker = state.createTracker(info);
      const exit = state.enter('criticMarkup' as any);

      let value = tracker.move(open);

      // Extract text content directly from children instead of using containerPhrasing
      // This avoids accessing editorView context during serialization
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          if (child.type === 'text' && 'value' in child) {
            value += tracker.move(String(child.value));
          }
        }
      }

      value += tracker.move(close);
      exit();
      return value;
    }) as ToMarkdownHandle,
  } as any,
};

/**
 * Remark plugin to transform CriticMarkup syntax into Milkdown-compatible tokens
 * Uses manual tree walking instead of unist-util-visit to avoid circular references
 */
export const remarkCriticMarkupMilkdown: Plugin<[], Root> = function () {
  // Register custom toMarkdown handler so CriticMarkup serializes correctly
  const data = this.data();
  const toMarkdown =
    (data.toMarkdownExtensions as ToMarkdownExtension[] | undefined) ??
    (data.toMarkdownExtensions = []);

  toMarkdown.push(criticMarkupToMarkdown);

  return (tree: Root) => {
    // Walk the tree and get a completely new tree without parent references
    const newTree = walkTree(tree) as Root;
    // Deep clean to be absolutely sure no circular refs remain
    return deepCleanNode(newTree) as Root;
  };
};

export default remarkCriticMarkupMilkdown;
