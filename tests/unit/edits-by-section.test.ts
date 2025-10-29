import { describe, it, expect, beforeEach } from 'vitest';
import ChangesModule from '@modules/changes';
import MarkdownModule from '@modules/markdown';
import type { Element, ElementMetadata } from '@/types';

/**
 * Comprehensive Unit Tests for Edit Operations
 *
 * Tests cover:
 * - All section types (Para, Header, CodeBlock, BulletList, OrderedList, BlockQuote, Div)
 * - All edit types (addition, deletion, text change, formatting change)
 * - Verification of markdown output
 * - Verification of HTML generation
 */

describe('Edit Operations - Markdown Output & HTML Rendering', () => {
  let changes: ChangesModule;
  let markdown: MarkdownModule;

  beforeEach(() => {
    changes = new ChangesModule();
    markdown = new MarkdownModule();
  });

  // ===== PARAGRAPH (Para) SECTION TESTS =====
  describe('Para (Paragraph) Section Edits', () => {
    let paraId: string;
    const originalPara: Element = {
      id: 'para-1',
      content: 'This is an example paragraph.',
      metadata: { type: 'Para' },
    };

    beforeEach(() => {
      paraId = originalPara.id;
      changes = new ChangesModule();
      changes['originalElements'] = [{ ...originalPara }];
    });

    it('Para: Addition - should append text and render correctly', () => {
      const newContent = 'This is an example paragraph. New text added.';
      changes.edit(paraId, newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === paraId);

      expect(editedElement?.content).toBe(newContent);

      // Verify markdown output
      const markdownOutput = changes.toMarkdown();
      expect(markdownOutput).toContain('New text added');

      // Verify HTML rendering
      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('<p>This is an example paragraph. New text added.</p>');
    });

    it('Para: Deletion - should remove text and render correctly', () => {
      const newContent = 'This is an example';
      changes.edit(paraId, newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === paraId);

      expect(editedElement?.content).toBe(newContent);
      expect(editedElement?.content).not.toContain('paragraph');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('This is an example');
      expect(html).not.toContain('paragraph');
    });

    it('Para: Text change - should replace content and render correctly', () => {
      const newContent = 'This is a modified example paragraph.';
      changes.edit(paraId, newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === paraId);

      expect(editedElement?.content).toBe(newContent);
      expect(editedElement?.content).toContain('modified');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('modified');
    });

    it('Para: Formatting change - should add markdown emphasis', () => {
      const newContent = 'This is an **example** paragraph.';
      changes.edit(paraId, newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === paraId);

      expect(editedElement?.content).toContain('**example**');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('<strong>example</strong>');
    });

    it('Para: Complex formatting - should handle multiple markdown formats', () => {
      const newContent = 'This is an **bold** and *italic* example with `code`.';
      changes.edit(paraId, newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === paraId);

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('<em>italic</em>');
      expect(html).toContain('<code>code</code>');
    });

    it('Para: Empty content - should handle deletion of all content', () => {
      changes.edit(paraId, '');

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === paraId);

      expect(editedElement?.content).toBe('');

      const html = markdown.renderSync(editedElement!.content);
      expect(html.trim()).toBe('');
    });

    it('Para: Special characters - should preserve special chars in output', () => {
      const newContent = 'Test with special chars: @#$%^&*()_+-=[]{}|;:,.<>?';
      changes.edit(paraId, newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === paraId);

      expect(editedElement?.content).toBe(newContent);
      expect(editedElement?.content).toContain('@#$%');
    });

    it('Para: Unicode - should handle unicode characters', () => {
      const newContent = 'Testing unicode: 你好世界 Ñoño 🎉';
      changes.edit(paraId, newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === paraId);

      expect(editedElement?.content).toContain('你好世界');
      expect(editedElement?.content).toContain('Ñoño');
      expect(editedElement?.content).toContain('🎉');
    });
  });

  // ===== HEADER SECTION TESTS =====
  describe('Header Section Edits', () => {
    const h1Header: Element = {
      id: 'header-1',
      content: '# Main Title',
      metadata: { type: 'Header', level: 1 },
    };
    const h2Header: Element = {
      id: 'header-2',
      content: '## Section Title',
      metadata: { type: 'Header', level: 2 },
    };

    beforeEach(() => {
      changes = new ChangesModule();
      changes['originalElements'] = [{ ...h1Header }, { ...h2Header }];
    });

    it('Header: Addition - should append text to header', () => {
      const newContent = '# Main Title [Updated]';
      changes.edit('header-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'header-1');

      expect(editedElement?.content).toBe(newContent);

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('<h1');
      expect(html).toContain('Main Title [Updated]');
    });

    it('Header: Deletion - should remove text from header', () => {
      const newContent = '## Section';
      changes.edit('header-2', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'header-2');

      expect(editedElement?.content).toBe(newContent);
      expect(editedElement?.content).not.toContain('Title');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('<h2');
      expect(html).not.toContain('Title');
    });

    it('Header: Level change - should change from h2 to h3', () => {
      const newContent = '### New Level';
      const newMetadata: ElementMetadata = { type: 'Header', level: 3 };
      changes.edit('header-2', newContent, undefined, newMetadata);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'header-2');

      expect(editedElement?.metadata.level).toBe(3);

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('<h3');
      expect(html).not.toContain('<h2');
    });

    it('Header: Formatting - should add emphasis to header', () => {
      const newContent = '# **Main** Title';
      changes.edit('header-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'header-1');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('<h1');
      expect(html).toContain('<strong>Main</strong>');
    });

    it('Header: Complex formatting - should handle multiple formats', () => {
      const newContent = '# **Bold** *Italic* Header';
      changes.edit('header-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'header-1');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('<strong>Bold</strong>');
      expect(html).toContain('<em>Italic</em>');
    });
  });

  // ===== CODE BLOCK SECTION TESTS =====
  describe('CodeBlock Section Edits', () => {
    const codeBlock: Element = {
      id: 'code-1',
      content: '```javascript\nconst x = 1;\n```',
      metadata: { type: 'CodeBlock' },
    };

    beforeEach(() => {
      changes = new ChangesModule();
      changes['originalElements'] = [{ ...codeBlock }];
    });

    it('CodeBlock: Addition - should add code lines', () => {
      const newContent = '```javascript\nconst x = 1;\nconst y = 2;\n```';
      changes.edit('code-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'code-1');

      expect(editedElement?.content).toContain('const y = 2');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('<code');
      expect(html).toContain('const y = 2');
    });

    it('CodeBlock: Deletion - should remove code lines', () => {
      const newContent = '```javascript\nconst x = 1;\n```';
      changes.edit('code-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'code-1');

      expect(editedElement?.content).toContain('const x = 1');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('<code');
    });

    it('CodeBlock: Modification - should change code content', () => {
      const newContent = '```javascript\nlet x = 1;\n```';
      changes.edit('code-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'code-1');

      expect(editedElement?.content).toContain('let x = 1');
      expect(editedElement?.content).not.toContain('const x');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('let x');
    });

    it('CodeBlock: Language change - should change language identifier', () => {
      const newContent = '```python\nx = 1\nprint(x)\n```';
      changes.edit('code-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'code-1');

      expect(editedElement?.content).toContain('```python');
      expect(editedElement?.content).toContain('print(x)');
    });
  });

  // ===== BULLET LIST SECTION TESTS =====
  describe('BulletList Section Edits', () => {
    const bulletList: Element = {
      id: 'list-1',
      content: '- First item\n- Second item\n- Third item',
      metadata: { type: 'BulletList' },
    };

    beforeEach(() => {
      changes = new ChangesModule();
      changes['originalElements'] = [{ ...bulletList }];
    });

    it('BulletList: Addition - should add new list item', () => {
      const newContent = '- First item\n- Second item\n- Third item\n- Fourth item';
      changes.edit('list-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'list-1');

      expect(editedElement?.content).toContain('Fourth item');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('<li>');
      expect(html).toContain('Fourth item');
    });

    it('BulletList: Deletion - should remove list item', () => {
      const newContent = '- First item\n- Second item';
      changes.edit('list-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'list-1');

      expect(editedElement?.content).not.toContain('Third item');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).not.toContain('Third item');
    });

    it('BulletList: Item modification - should change text in item', () => {
      const newContent = '- First item\n- Second item (modified)\n- Third item';
      changes.edit('list-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'list-1');

      expect(editedElement?.content).toContain('Second item (modified)');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('Second item (modified)');
    });

    it('BulletList: Formatting in item - should add formatting to list item', () => {
      const newContent = '- First item\n- **Second item** (bold)\n- Third item';
      changes.edit('list-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'list-1');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('<strong>Second item</strong>');
    });

    it('BulletList: Nesting - should create nested list', () => {
      const newContent = '- First item\n- Second item\n  - Nested item\n- Third item';
      changes.edit('list-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'list-1');

      expect(editedElement?.content).toContain('  - Nested item');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('<li>');
      expect(html).toContain('Nested item');
    });
  });

  // ===== ORDERED LIST SECTION TESTS =====
  describe('OrderedList Section Edits', () => {
    const orderedList: Element = {
      id: 'olist-1',
      content: '1. Step one\n2. Step two\n3. Step three',
      metadata: { type: 'OrderedList' },
    };

    beforeEach(() => {
      changes = new ChangesModule();
      changes['originalElements'] = [{ ...orderedList }];
    });

    it('OrderedList: Addition - should add new step', () => {
      const newContent = '1. Step one\n2. Step two\n3. Step three\n4. Step four';
      changes.edit('olist-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'olist-1');

      expect(editedElement?.content).toContain('Step four');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('<li>');
      expect(html).toContain('Step four');
    });

    it('OrderedList: Deletion - should remove step', () => {
      const newContent = '1. Step one\n2. Step two';
      changes.edit('olist-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'olist-1');

      expect(editedElement?.content).not.toContain('Step three');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).not.toContain('Step three');
    });

    it('OrderedList: Modification - should change step text', () => {
      const newContent = '1. First step (modified)\n2. Step two\n3. Step three';
      changes.edit('olist-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'olist-1');

      expect(editedElement?.content).toContain('First step (modified)');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('First step (modified)');
    });

    it('OrderedList: Formatting - should add code formatting to step', () => {
      const newContent = '1. `Step one` code\n2. Step two\n3. Step three';
      changes.edit('olist-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'olist-1');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('<code>Step one</code>');
    });
  });

  // ===== BLOCK QUOTE SECTION TESTS =====
  describe('BlockQuote Section Edits', () => {
    const blockquote: Element = {
      id: 'quote-1',
      content: '> This is a quote',
      metadata: { type: 'BlockQuote' },
    };

    beforeEach(() => {
      changes = new ChangesModule();
      changes['originalElements'] = [{ ...blockquote }];
    });

    it('BlockQuote: Addition - should add content to quote', () => {
      const newContent = '> This is a quote\n> with multiple lines';
      changes.edit('quote-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'quote-1');

      expect(editedElement?.content).toContain('multiple lines');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('<blockquote>');
      expect(html).toContain('multiple lines');
    });

    it('BlockQuote: Deletion - should remove lines from quote', () => {
      const newContent = '> This is a quote';
      changes.edit('quote-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'quote-1');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('<blockquote>');
    });

    it('BlockQuote: Modification - should change quote text', () => {
      const newContent = '> This is a modified quote';
      changes.edit('quote-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'quote-1');

      expect(editedElement?.content).toContain('modified');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('modified');
    });

    it('BlockQuote: Formatting - should add emphasis in quote', () => {
      const newContent = '> This is a **bold** quote';
      changes.edit('quote-1', newContent);

      const state = changes.getCurrentState();
      const editedElement = state.find(e => e.id === 'quote-1');

      const html = markdown.renderSync(editedElement!.content);
      expect(html).toContain('<strong>bold</strong>');
    });
  });

  // ===== MULTIPLE CONSECUTIVE EDITS =====
  describe('Multiple Consecutive Edits', () => {
    const element1: Element = {
      id: 'elem-1',
      content: 'First element',
      metadata: { type: 'Para' },
    };
    const element2: Element = {
      id: 'elem-2',
      content: 'Second element',
      metadata: { type: 'Para' },
    };

    beforeEach(() => {
      changes = new ChangesModule();
      changes['originalElements'] = [{ ...element1 }, { ...element2 }];
    });

    it('Multiple edits: should apply edits sequentially and preserve order', () => {
      changes.edit('elem-1', 'First element [edited]');
      changes.edit('elem-2', 'Second element [edited]');

      const state = changes.getCurrentState();
      expect(state[0].content).toBe('First element [edited]');
      expect(state[1].content).toBe('Second element [edited]');

      const markdown_output = changes.toMarkdown();
      expect(markdown_output).toContain('First element [edited]');
      expect(markdown_output).toContain('Second element [edited]');
    });

    it('Multiple edits: should handle undo and redo correctly', () => {
      changes.edit('elem-1', 'First element [edited]');
      changes.edit('elem-2', 'Second element [edited]');

      // Undo second edit
      const canUndo1 = changes.undo();
      expect(canUndo1).toBe(true);

      let state = changes.getCurrentState();
      expect(state[1].content).toBe('Second element');

      // Redo second edit
      const canRedo = changes.redo();
      expect(canRedo).toBe(true);

      state = changes.getCurrentState();
      expect(state[1].content).toBe('Second element [edited]');
    });

    it('Multiple edits: should generate correct HTML for all elements', () => {
      changes.edit('elem-1', '**First** element');
      changes.edit('elem-2', '*Second* element');

      const state = changes.getCurrentState();

      const html1 = markdown.renderSync(state[0].content);
      const html2 = markdown.renderSync(state[1].content);

      expect(html1).toContain('<strong>First</strong>');
      expect(html2).toContain('<em>Second</em>');
    });
  });

  // ===== CRITIC MARKUP TRACKING =====
  describe('CriticMarkup Tracked Changes', () => {
    const element: Element = {
      id: 'tracked-1',
      content: 'This is original content.',
      metadata: { type: 'Para' },
    };

    beforeEach(() => {
      changes = new ChangesModule();
      changes['originalElements'] = [{ ...element }];
    });

    it('CriticMarkup: should track additions with {++ ++}', () => {
      changes.edit('tracked-1', 'This is original content with additions.');

      const tracked = changes.getElementContentWithTrackedChanges('tracked-1');
      expect(tracked).toContain('{++');
      expect(tracked).toContain('+}');
    });

    it('CriticMarkup: should track deletions with {-- --}', () => {
      changes.edit('tracked-1', 'This is content.');

      const tracked = changes.getElementContentWithTrackedChanges('tracked-1');
      expect(tracked).toContain('{--');
      expect(tracked).toContain('--}');
    });

    it('CriticMarkup: should render tracked changes as HTML', () => {
      changes.edit('tracked-1', 'This is original content with new text.');

      const tracked = changes.getElementContentWithTrackedChanges('tracked-1');
      const html = markdown.renderSync(tracked, true);

      expect(html).toContain('<p>');
      expect(html).toContain('This is original content');
    });
  });

  // ===== EDGE CASES =====
  describe('Edge Cases', () => {
    it('Should handle very long text', () => {
      const longText = 'x'.repeat(10000);
      const element: Element = {
        id: 'long-1',
        content: 'Short content',
        metadata: { type: 'Para' },
      };

      changes['originalElements'] = [element];
      changes.edit('long-1', longText);

      const state = changes.getCurrentState();
      expect(state[0].content.length).toBe(10000);
    });

    it('Should handle empty to full content transition', () => {
      const element: Element = {
        id: 'empty-1',
        content: '',
        metadata: { type: 'Para' },
      };

      changes['originalElements'] = [element];
      changes.edit('empty-1', 'Now has content');

      const state = changes.getCurrentState();
      expect(state[0].content).toBe('Now has content');
    });

    it('Should handle full to empty content transition', () => {
      const element: Element = {
        id: 'full-1',
        content: 'Had content',
        metadata: { type: 'Para' },
      };

      changes['originalElements'] = [element];
      changes.edit('full-1', '');

      const state = changes.getCurrentState();
      expect(state[0].content).toBe('');
    });

    it('Should handle newlines in content', () => {
      const element: Element = {
        id: 'newline-1',
        content: 'Line one',
        metadata: { type: 'Para' },
      };

      changes['originalElements'] = [element];
      const newContent = 'Line one\nLine two\nLine three';
      changes.edit('newline-1', newContent);

      const state = changes.getCurrentState();
      expect(state[0].content).toContain('\n');
    });
  });
});
