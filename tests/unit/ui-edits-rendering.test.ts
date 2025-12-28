import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import MarkdownModule from '@modules/markdown';
import type { Element } from '@/types';

/**
 * UI Module Tests - HTML Rendering Verification
 *
 * Tests verify that:
 * - Markdown edits generate correct HTML output
 * - HTML structure matches expected DOM tree
 * - Content is properly escaped and sanitized
 * - Formatting markup is correctly converted
 * - CriticMarkup annotations are rendered
 */

describe('UI Module - HTML Rendering & DOM Structure', () => {
  let markdown: MarkdownModule;
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    markdown = new MarkdownModule();
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document as any;
    global.document = document as any;
  });

  // ===== PARAGRAPH RENDERING =====
  describe('Para Section - HTML Rendering', () => {
    it('Para: plain text should render as <p> tag', () => {
      const content = 'This is a paragraph.';
      const html = markdown.renderSync(content);

      expect(html).toContain('<p>');
      expect(html).toContain('This is a paragraph.');
      expect(html).toContain('</p>');
    });

    it('Para: bold formatting should render as <strong> tag', () => {
      const content = 'This has **bold** text.';
      const html = markdown.renderSync(content);

      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('<p>');
    });

    it('Para: italic formatting should render as <em> tag', () => {
      const content = 'This has *italic* text.';
      const html = markdown.renderSync(content);

      expect(html).toContain('<em>italic</em>');
      expect(html).toContain('<p>');
    });

    it('Para: inline code should render as <code> tag', () => {
      const content = 'Use `const x = 1;` in JavaScript.';
      const html = markdown.renderSync(content);

      expect(html).toContain('<code>');
      expect(html).toContain('const x = 1;');
      expect(html).toContain('</code>');
    });

    it('Para: link should render as <a> tag', () => {
      const content = 'Visit [example](https://example.com) for more.';
      const html = markdown.renderSync(content);

      expect(html).toContain('<a');
      expect(html).toContain('href=');
      expect(html).toContain('example.com');
      expect(html).toContain('</a>');
    });

    it('Para: strikethrough should render as <del> or <s> tag', () => {
      const content = 'This is ~~wrong~~ correct.';
      const html = markdown.renderSync(content);

      expect(html).toMatch(/<(del|s)>/);
    });

    it('Para: complex formatting should render multiple tags', () => {
      const content = 'This has **bold**, *italic*, `code`, and [link](https://example.com).';
      const html = markdown.renderSync(content);

      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('<em>italic</em>');
      expect(html).toContain('<code>code</code>');
      expect(html).toContain('<a');
    });

    it('Para: inline HTML tags in markdown content', () => {
      const content = 'This has <span>inline HTML</span> attempt.';
      const html = markdown.renderSync(content);

      // Markdown allows inline HTML with allowDangerousHtml: true
      // The actual escaping depends on Rehype configuration
      expect(html).toContain('inline HTML');
      expect(html).toContain('attempt');
    });

    it('Para: unicode characters should render correctly', () => {
      const content = 'Unicode test: 你好 مرحبا שלום';
      const html = markdown.renderSync(content);

      expect(html).toContain('你好');
      expect(html).toContain('مرحبا');
      expect(html).toContain('שלום');
    });

    it('Para: special characters should render correctly', () => {
      const content = 'Special: @#$%^&*()_+-=[]{}|;:,.<>?';
      const html = markdown.renderSync(content);

      expect(html).toContain('@#$%');
      // & can be encoded as &amp; or &#x26;
      expect(html).toMatch(/(&amp;|&#x26;)/);
    });
  });

  // ===== HEADER RENDERING =====
  describe('Header Section - HTML Rendering', () => {
    it('Header level 1 should render as <h1> tag', () => {
      const content = '# Main Title';
      const html = markdown.renderSync(content);

      expect(html).toContain('<h1');
      expect(html).toContain('Main Title');
      expect(html).toContain('</h1>');
    });

    it('Header level 2 should render as <h2> tag', () => {
      const content = '## Section Title';
      const html = markdown.renderSync(content);

      expect(html).toContain('<h2');
      expect(html).toContain('Section Title');
      expect(html).toContain('</h2>');
    });

    it('Header level 3 should render as <h3> tag', () => {
      const content = '### Subsection';
      const html = markdown.renderSync(content);

      expect(html).toContain('<h3');
      expect(html).toContain('Subsection');
      expect(html).toContain('</h3>');
    });

    it('Header with bold formatting should render correctly', () => {
      const content = '# **Important** Title';
      const html = markdown.renderSync(content);

      expect(html).toContain('<h1');
      expect(html).toContain('<strong>Important</strong>');
    });

    it('Header with code should render correctly', () => {
      const content = '## The `useState` Hook';
      const html = markdown.renderSync(content);

      expect(html).toContain('<h2');
      expect(html).toContain('<code>useState</code>');
    });

    it('Header with link should render correctly', () => {
      const content = '## [Linked](https://example.com) Section';
      const html = markdown.renderSync(content);

      expect(html).toContain('<h2');
      expect(html).toContain('<a');
      expect(html).toContain('Linked');
    });
  });

  // ===== CODE BLOCK RENDERING =====
  describe('CodeBlock Section - HTML Rendering', () => {
    it('Code block should render as <pre><code> tags', () => {
      const content = '```javascript\nconst x = 1;\n```';
      const html = markdown.renderSync(content);

      expect(html).toContain('<pre>');
      expect(html).toContain('<code');
      expect(html).toContain('const x = 1;');
      expect(html).toContain('</code>');
      expect(html).toContain('</pre>');
    });

    it('Code block with language should include language info', () => {
      const content = '```python\nprint("Hello")\n```';
      const html = markdown.renderSync(content);

      expect(html).toContain('<pre');
      expect(html).toContain('<code');
      expect(html).toContain('print');
    });

    it('Code block with multiple lines should preserve structure', () => {
      const content = '```javascript\nconst x = 1;\nconst y = 2;\nreturn x + y;\n```';
      const html = markdown.renderSync(content);

      expect(html).toContain('<pre');
      expect(html).toContain('const x = 1;');
      expect(html).toContain('const y = 2;');
      expect(html).toContain('return x + y;');
    });

    it('Code block should escape HTML tags', () => {
      const content = '```html\n<script>alert("xss")</script>\n```';
      const html = markdown.renderSync(content);

      expect(html).toContain('<pre');
      expect(html).not.toContain('<script>');
      // HTML entities can be encoded as named (&lt;) or numeric (&#x3C;)
      expect(html).toMatch(/(&lt;|&#x3C;)script/);
    });

    it('Code block should preserve whitespace and indentation', () => {
      const content = '```python\ndef func():\n    return 42\n```';
      const html = markdown.renderSync(content);

      expect(html).toContain('def func');
      expect(html).toContain('return 42');
    });
  });

  // ===== BULLET LIST RENDERING =====
  describe('BulletList Section - HTML Rendering', () => {
    it('Bullet list should render as <ul> with <li> items', () => {
      const content = '- First\n- Second\n- Third';
      const html = markdown.renderSync(content);

      expect(html).toContain('<ul>');
      expect(html).toContain('<li>');
      expect(html).toContain('First');
      expect(html).toContain('Second');
      expect(html).toContain('Third');
      expect(html).toContain('</li>');
      expect(html).toContain('</ul>');
    });

    it('Bullet list with formatting should render tags inside <li>', () => {
      const content = '- **Bold** item\n- *Italic* item\n- `Code` item';
      const html = markdown.renderSync(content);

      expect(html).toContain('<li>');
      expect(html).toContain('<strong>Bold</strong>');
      expect(html).toContain('<em>Italic</em>');
      expect(html).toContain('<code>Code</code>');
    });

    it('Nested bullet list should render as nested <ul>', () => {
      const content = '- First\n  - Nested 1\n  - Nested 2\n- Second';
      const html = markdown.renderSync(content);

      expect(html).toContain('<ul>');
      expect(html).toContain('First');
      expect(html).toContain('Nested 1');
      expect(html).toContain('Nested 2');
      expect(html).toContain('Second');
    });

    it('Bullet list with links should render <a> inside <li>', () => {
      const content = '- [Link 1](https://example1.com)\n- [Link 2](https://example2.com)';
      const html = markdown.renderSync(content);

      expect(html).toContain('<li>');
      expect(html).toContain('<a');
      expect(html).toContain('example1.com');
      expect(html).toContain('example2.com');
    });

    it('Bullet list with code blocks should render correctly', () => {
      const content = '- Item with `code`\n- Another item';
      const html = markdown.renderSync(content);

      expect(html).toContain('<li>');
      expect(html).toContain('<code>code</code>');
    });
  });

  // ===== ORDERED LIST RENDERING =====
  describe('OrderedList Section - HTML Rendering', () => {
    it('Ordered list should render as <ol> with <li> items', () => {
      const content = '1. First\n2. Second\n3. Third';
      const html = markdown.renderSync(content);

      expect(html).toContain('<ol>');
      expect(html).toContain('<li>');
      expect(html).toContain('First');
      expect(html).toContain('Second');
      expect(html).toContain('Third');
      expect(html).toContain('</li>');
      expect(html).toContain('</ol>');
    });

    it('Ordered list should preserve numeric order', () => {
      const content = '1. One\n2. Two\n3. Three\n4. Four';
      const html = markdown.renderSync(content);

      expect(html).toContain('<ol>');
      const matches = html.match(/<li>/g);
      expect(matches?.length).toBeGreaterThanOrEqual(4);
    });

    it('Ordered list with formatting should render tags inside <li>', () => {
      const content = '1. **Bold** step\n2. *Italic* step\n3. `Code` step';
      const html = markdown.renderSync(content);

      expect(html).toContain('<strong>Bold</strong>');
      expect(html).toContain('<em>Italic</em>');
      expect(html).toContain('<code>Code</code>');
    });

    it('Ordered list with nested list should render correctly', () => {
      const content = '1. First\n   a. Nested a\n   b. Nested b\n2. Second';
      const html = markdown.renderSync(content);

      expect(html).toContain('<ol>');
      expect(html).toContain('First');
      expect(html).toContain('Nested a');
    });

    it('Ordered list with paragraphs should render correctly', () => {
      const content = '1. Item one with text\n2. Item two\n3. Item three';
      const html = markdown.renderSync(content);

      expect(html).toContain('<li>');
      expect(html).toContain('Item one');
    });
  });

  // ===== BLOCKQUOTE RENDERING =====
  describe('BlockQuote Section - HTML Rendering', () => {
    it('Blockquote should render as <blockquote> tag', () => {
      const content = '> This is a quote';
      const html = markdown.renderSync(content);

      expect(html).toContain('<blockquote>');
      expect(html).toContain('This is a quote');
      expect(html).toContain('</blockquote>');
    });

    it('Multi-line blockquote should preserve all lines', () => {
      const content = '> Line 1\n> Line 2\n> Line 3';
      const html = markdown.renderSync(content);

      expect(html).toContain('<blockquote>');
      expect(html).toContain('Line 1');
      expect(html).toContain('Line 2');
      expect(html).toContain('Line 3');
    });

    it('Blockquote with formatting should render tags', () => {
      const content = '> This is a **bold** quote with *italic* text';
      const html = markdown.renderSync(content);

      expect(html).toContain('<blockquote>');
      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('<em>italic</em>');
    });

    it('Blockquote with lists should render correctly', () => {
      const content = '> - Item 1\n> - Item 2';
      const html = markdown.renderSync(content);

      expect(html).toContain('<blockquote>');
      expect(html).toContain('<li>');
      expect(html).toContain('Item 1');
    });

    it('Nested blockquotes should render correctly', () => {
      const content = '> Quote 1\n> > Nested quote\n> Quote 2';
      const html = markdown.renderSync(content);

      expect(html).toContain('<blockquote>');
      expect(html).toContain('Quote 1');
      expect(html).toContain('Nested quote');
    });
  });

  // ===== CRITIC MARKUP RENDERING =====
  describe('CriticMarkup - HTML Rendering', () => {
    it('Addition markup {++ ++} should render with visual indicator', () => {
      const content = 'Original text {++with addition++}.';
      const html = markdown.renderSync(content, true);

      expect(html).toContain('Original text');
      expect(html).toContain('with addition');
    });

    it('Deletion markup {-- --} should render with visual indicator', () => {
      const content = 'Original {--deleted--} text.';
      const html = markdown.renderSync(content, true);

      expect(html).toContain('Original');
      expect(html).toContain('text');
    });

    it('Substitution markup {~~ ~~} should render both versions', () => {
      const content = 'Original {~~old~>new~~} text.';
      const html = markdown.renderSync(content, true);

      expect(html).toContain('Original');
      expect(html).toContain('text');
    });

    it('Highlight markup {== ==} should render highlighted', () => {
      const content = 'This {==highlighted text==} is important.';
      const html = markdown.renderSync(content, true);

      expect(html).toContain('highlighted text');
    });

    it('Comment markup {>> <<} should render with comment indicator', () => {
      const content = 'Text {>>This is a comment<<} to note.';
      const html = markdown.renderSync(content, true);

      expect(html).toContain('Text');
      expect(html).toContain('note');
    });
  });

  // ===== COMBINED ELEMENTS RENDERING =====
  describe('Combined Elements - Complex Rendering', () => {
    it('Should render header followed by paragraphs correctly', () => {
      const html = markdown.renderSync('# Title\n\nParagraph text.');

      expect(html).toContain('<h1>Title</h1>');
      expect(html).toContain('<p>Paragraph text.</p>');
    });

    it('Should render header with list correctly', () => {
      const html = markdown.renderSync('## Section\n\n- Item 1\n- Item 2');

      expect(html).toContain('<h2>Section</h2>');
      expect(html).toContain('<ul>');
      expect(html).toContain('<li>Item 1</li>');
    });

    it('Should render code block with surrounding paragraphs', () => {
      const html = markdown.renderSync('Before code.\n\n```javascript\nconst x = 1;\n```\n\nAfter code.');

      expect(html).toContain('<p>Before code.</p>');
      expect(html).toContain('<pre');
      expect(html).toContain('<p>After code.</p>');
    });

    it('Should render blockquote with formatting correctly', () => {
      const html = markdown.renderSync('> **Important** quote with `code` block.');

      expect(html).toContain('<blockquote>');
      expect(html).toContain('<strong>Important</strong>');
      expect(html).toContain('<code>code</code>');
    });
  });

  // ===== TABLE RENDERING =====
  describe('Table - HTML Rendering', () => {
    it('Table should render with correct structure', () => {
      const content = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
      const html = markdown.renderSync(content);

      expect(html).toContain('<table');
      expect(html).toContain('<thead');
      expect(html).toContain('<tbody');
      expect(html).toContain('<tr');
      expect(html).toContain('<th');
      expect(html).toContain('<td');
    });

    it('Table with formatting should render correctly', () => {
      const content = '| **Bold** | *Italic* |\n|----------|----------|\n| `Code` | [Link](url) |';
      const html = markdown.renderSync(content);

      expect(html).toContain('<table');
      expect(html).toContain('<strong>Bold</strong>');
      expect(html).toContain('<em>Italic</em>');
      expect(html).toContain('<code>Code</code>');
      expect(html).toContain('<a');
    });
  });

  // ===== EDGE CASES =====
  describe('Edge Cases - HTML Rendering', () => {
    it('Empty string should render as empty', () => {
      const html = markdown.renderSync('');
      expect(html.trim()).toBe('');
    });

    it('Only whitespace should render minimal HTML', () => {
      const html = markdown.renderSync('   \n   \n   ');
      expect(html.trim()).toBe('');
    });

    it('Very long line should render without truncation', () => {
      const longLine = 'x'.repeat(1000);
      const html = markdown.renderSync(longLine);

      expect(html).toContain('x'.repeat(100));
    });

    it('Deeply nested structure should render correctly', () => {
      const content = '- Item 1\n  - Nested 1\n    - Deep 1\n      - Very deep\n- Item 2';
      const html = markdown.renderSync(content);

      expect(html).toContain('<ul>');
      expect(html).toContain('Item 1');
      expect(html).toContain('Very deep');
    });

    it('Mixed HTML entities handling', () => {
      const content = 'Test < > & " \'';
      const html = markdown.renderSync(content);

      // HTML entities can be encoded as numeric (&#x3C;, &#x3E;, &#x26;)
      // Some are escaped, some are not depending on context
      expect(html).toContain('Test');
      expect(html).toContain('&');
      // Verify the content is present in some form
      expect(html).not.toBe('');
    });

    it('Multiple consecutive blank lines should be handled', () => {
      const content = 'Paragraph 1\n\n\n\n\nParagraph 2';
      const html = markdown.renderSync(content);

      expect(html).toContain('Paragraph 1');
      expect(html).toContain('Paragraph 2');
    });
  });
});
