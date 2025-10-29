/**
 * Tests for Milkdown CriticMarkup remark plugin
 */

import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkCriticMarkupMilkdown } from '../../src/modules/ui/criticmarkup';

describe('remarkCriticMarkupMilkdown', () => {
  function parse(markdown: string) {
    const processor = unified()
      .use(remarkParse)
      .use(remarkCriticMarkupMilkdown);

    return processor.parse(markdown);
  }

  function processSync(markdown: string) {
    const processor = unified()
      .use(remarkParse)
      .use(remarkCriticMarkupMilkdown);

    return processor.runSync(parse(markdown));
  }

  it('should parse additions', () => {
    const tree = processSync('Hello {++world++}!');

    // Find the criticMarkup node
    const paragraph = (tree as any).children[0];
    const nodes = paragraph.children;

    expect(nodes.some((n: any) => n.type === 'criticMarkup')).toBe(true);
    expect(
      nodes.some(
        (n: any) => n.type === 'criticMarkup' && n.markup === 'addition'
      )
    ).toBe(true);
  });

  it('should parse deletions', () => {
    const tree = processSync('Hello {--world--}!');

    const paragraph = (tree as any).children[0];
    const nodes = paragraph.children;

    expect(
      nodes.some(
        (n: any) => n.type === 'criticMarkup' && n.markup === 'deletion'
      )
    ).toBe(true);
  });

  it('should parse highlights', () => {
    const tree = processSync('Hello {==world==}!');

    const paragraph = (tree as any).children[0];
    const nodes = paragraph.children;

    expect(
      nodes.some(
        (n: any) => n.type === 'criticMarkup' && n.markup === 'highlight'
      )
    ).toBe(true);
  });

  it('should parse comments', () => {
    const tree = processSync('Hello {>>this is a comment<<}!');

    const paragraph = (tree as any).children[0];
    const nodes = paragraph.children;

    expect(
      nodes.some((n: any) => n.type === 'criticMarkup' && n.markup === 'comment')
    ).toBe(true);
  });

  it('should parse substitutions as deletion + addition', () => {
    const tree = processSync('The {~~quick~>slow~~} fox');

    const paragraph = (tree as any).children[0];
    const nodes = paragraph.children;

    // Should have both deletion and addition
    expect(
      nodes.some(
        (n: any) => n.type === 'criticMarkup' && n.markup === 'deletion'
      )
    ).toBe(true);
    expect(
      nodes.some(
        (n: any) => n.type === 'criticMarkup' && n.markup === 'addition'
      )
    ).toBe(true);
  });

  it('should preserve regular text', () => {
    const tree = processSync('Hello world');

    const paragraph = (tree as any).children[0];
    const nodes = paragraph.children;

    expect(nodes.length).toBe(1);
    expect(nodes[0].type).toBe('text');
    expect(nodes[0].value).toBe('Hello world');
  });

  it('should handle mixed content', () => {
    const tree = processSync('Hello {++new++} {--old--} world');

    const paragraph = (tree as any).children[0];
    const nodes = paragraph.children;

    // Should have text, addition, text, deletion, text
    expect(nodes.length).toBeGreaterThan(3);
    expect(
      nodes.some(
        (n: any) => n.type === 'criticMarkup' && n.markup === 'addition'
      )
    ).toBe(true);
    expect(
      nodes.some(
        (n: any) => n.type === 'criticMarkup' && n.markup === 'deletion'
      )
    ).toBe(true);
  });

  it('should handle highlight with comment', () => {
    const tree = processSync('Hello {==world==}{>>nice<<}!');

    const paragraph = (tree as any).children[0];
    const nodes = paragraph.children;

    expect(
      nodes.some(
        (n: any) => n.type === 'criticMarkup' && n.markup === 'highlight'
      )
    ).toBe(true);
    expect(
      nodes.some((n: any) => n.type === 'criticMarkup' && n.markup === 'comment')
    ).toBe(true);
  });

  it('should include children in criticMarkup nodes', () => {
    const tree = processSync('Hello {++world++}!');

    const paragraph = (tree as any).children[0];
    const criticNode = paragraph.children.find(
      (n: any) => n.type === 'criticMarkup'
    );

    expect(criticNode).toBeDefined();
    expect(criticNode.children).toBeDefined();
    expect(criticNode.children.length).toBeGreaterThan(0);
    expect(criticNode.children[0].type).toBe('text');
    expect(criticNode.children[0].value).toBe('world');
  });
});
