/**
 * Tests for remark-criticmarkup-milkdown plugin
 * Ensures no circular references are created
 */

import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { remarkCriticMarkupMilkdown } from '../../src/modules/ui/criticmarkup';

/**
 * Check if an object has circular references
 */
function hasCircularReferences(obj: any, seen = new WeakSet()): boolean {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }

  if (seen.has(obj)) {
    return true;
  }

  seen.add(obj);

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (hasCircularReferences(obj[key], seen)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Try to serialize an object to detect circular references
 */
function canSerialize(obj: any): boolean {
  try {
    JSON.stringify(obj);
    return true;
  } catch (e) {
    return false;
  }
}

describe('remarkCriticMarkupMilkdown', () => {
  it('should not create circular references in parsed tree', async () => {
    const markdown = `
# Test

This is a paragraph with {++added text++}.

- First item
- Second item with {++addition++}
- Third item
`.trim();

    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkCriticMarkupMilkdown);

    const tree = processor.parse(markdown);
    const transformedTree = await processor.run(tree);

    // Check for circular references
    expect(hasCircularReferences(transformedTree)).toBe(false);
    expect(canSerialize(transformedTree)).toBe(true);
  });

  it('should handle multiple CriticMarkup types without circular refs', async () => {
    const markdown = `
Test with {++addition++} and {--deletion--} and {~~old~>new~~}.

Also {==highlighted==}{>>with comment<<}.
`.trim();

    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkCriticMarkupMilkdown);

    const tree = processor.parse(markdown);
    const transformedTree = await processor.run(tree);

    expect(hasCircularReferences(transformedTree)).toBe(false);
    expect(canSerialize(transformedTree)).toBe(true);
  });

  it('should handle existing CriticMarkup in lists without circular refs', async () => {
    const markdown = `
-   First item
-   Second item with some {++added text++}
-   Third item
`.trim();

    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkCriticMarkupMilkdown);

    const tree = processor.parse(markdown);
    const transformedTree = await processor.run(tree);

    expect(hasCircularReferences(transformedTree)).toBe(false);
    expect(canSerialize(transformedTree)).toBe(true);
  });

  it('should verify criticMarkup nodes have no parent property', async () => {
    const markdown = 'Text with {++addition++} here.';

    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkCriticMarkupMilkdown);

    const tree = processor.parse(markdown);
    const transformedTree = await processor.run(tree);

    // Walk the tree and find criticMarkup nodes
    let foundCriticMarkupNode = false;

    function walk(node: any) {
      if (node.type === 'criticMarkup') {
        foundCriticMarkupNode = true;
        // Verify no parent property
        expect(node).not.toHaveProperty('parent');
        // Verify no position that could have parent refs
        if (node.position) {
          expect(hasCircularReferences(node.position)).toBe(false);
        }
      }

      if (node.children) {
        for (const child of node.children) {
          walk(child);
        }
      }
    }

    walk(transformedTree);
    expect(foundCriticMarkupNode).toBe(true);
  });
});
