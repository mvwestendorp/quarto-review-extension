import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownModule } from '@modules/markdown';

describe('MarkdownModule', () => {
  let markdown: MarkdownModule;

  beforeEach(() => {
    markdown = new MarkdownModule();
  });

  describe('Basic rendering', () => {
    it('should render simple markdown to HTML', () => {
      const result = markdown.renderSync('# Hello World');
      expect(result).toContain('<h1>');
      expect(result).toContain('Hello World');
      expect(result).toContain('</h1>');
    });

    it('should render paragraphs', () => {
      const result = markdown.renderSync('This is a paragraph.');
      expect(result).toContain('<p>');
      expect(result).toContain('This is a paragraph.');
      expect(result).toContain('</p>');
    });

    it('should render multiple paragraphs', () => {
      const input = 'First paragraph.\n\nSecond paragraph.';
      const result = markdown.renderSync(input);
      expect(result).toStrictEqual(
        '<p>First paragraph.</p>\n<p>Second paragraph.</p>'
      );
    });

    it('should render async', async () => {
      const result = await markdown.render('# Async Header');
      expect(result).toStrictEqual('<h1>Async Header</h1>');
    });
  });

  describe('Inline rendering', () => {
    it('should render inline markdown', () => {
      const result = markdown.renderInline('**bold** and *italic*');
      expect(result).toStrictEqual('<strong>bold</strong> and <em>italic</em>');
      expect(result).not.toContain('<p>');
    });

    it('should render CriticMarkup as literal text without paragraph wrappers', () => {
      const result = markdown.renderInline('Start {++add++} end');
      // CriticMarkup is no longer preprocessed
      expect(result).toContain('{++add++}');
      expect(result).not.toContain('critic-addition');
      expect(result).not.toContain('<p>');
    });

    it('should sanitize inline HTML when raw output disabled', () => {
      const result = markdown.renderInline('Click <script>alert("xss")</script> here');
      expect(result).not.toContain('<script>');
      expect(result).toContain('Click');
    });
  });

  describe('Element-specific rendering', () => {
    it('should render headers with correct level', () => {
      const result = markdown.renderElement('Test Header', 'Header', 2);
      expect(result).toContain('<h2>');
      expect(result).toContain('Test Header');
    });

    it('should update the existing header level when re-rendered', () => {
      const existingHeading = '## Existing Heading';
      const result = markdown.renderElement(existingHeading, 'Header', 4);
      expect(result).toBe('<h4>Existing Heading</h4>');
    });

    it('should strip existing hash prefixes before applying new level', () => {
      const result = markdown.renderElement('##Heading', 'Header', 3);
      expect(result).toBe('<h3>Heading</h3>');
    });

    it('should normalize setext headings when adjusting level', () => {
      const setext = 'Heading level one\n===';
      const result = markdown.renderElement(setext, 'Header', 2);
      expect(result).toBe('<h2>Heading level one</h2>');
    });

    it('should discard previous heading marker tokens embedded in text', () => {
      const result = markdown.renderElement('## # Heading', 'Header', 3);
      expect(result).toBe('<h3>Heading</h3>');
    });

    it('should remove pandoc attribute blocks before rendering', () => {
      const result = markdown.renderElement('## Heading {#id .class}', 'Header', 1);
      expect(result).toBe('<h1>Heading</h1>');
    });

    it('should preserve escaped hash characters at the start of text', () => {
      const result = markdown.renderElement('# \\# Not a heading marker', 'Header', 2);
      expect(result).toBe('<h2># Not a heading marker</h2>');
    });

    it('should render code blocks', () => {
      const code = '```javascript\nconst x = 1;\n```';
      const result = markdown.renderElement(code, 'CodeBlock');
      expect(result).toContain('<pre>');
      expect(result).toContain('<code>');
    });

    it('should render block quotes', () => {
      const result = markdown.renderElement('Quote text', 'BlockQuote');
      expect(result).toContain('<blockquote>');
      expect(result).toContain('Quote text');
    });

    it('should render bullet lists', () => {
      const list = '- Item 1\n- Item 2';
      const result = markdown.renderElement(list, 'BulletList');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
    });

    it('should render ordered lists', () => {
      const list = '1. Item 1\n2. Item 2';
      const result = markdown.renderElement(list, 'OrderedList');
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>');
    });
  });

  describe('GitHub Flavored Markdown features', () => {
    it('should render links', () => {
      const result = markdown.renderSync('[Link](https://example.com)');
      expect(result).toContain('<a href="https://example.com">');
      expect(result).toContain('Link');
    });

    it('should render emphasis', () => {
      const result = markdown.renderSync('**bold** and *italic*');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
    });

    it('should render inline code', () => {
      const result = markdown.renderSync('Use `const` keyword');
      expect(result).toContain('<code>const</code>');
    });

    it('should render strikethrough', () => {
      const result = markdown.renderSync('~~strikethrough~~');
      expect(result).toContain('<del>strikethrough</del>');
    });

    it('should render tables', () => {
      const table =
        '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
      const result = markdown.renderSync(table);
      expect(result).toContain('<table>');
      expect(result).toContain('<th>Header 1</th>');
      expect(result).toContain('<td>Cell 1</td>');
    });

    it('should auto-linkify URLs', () => {
      const result = markdown.renderSync('Visit https://example.com');
      expect(result).toContain('https://example.com');
    });
  });

  describe('CriticMarkup NOT preprocessed (architectural change)', () => {
    it('should render additions as literal text', () => {
      const result = markdown.renderSync('This is {++added text++}');
      // CriticMarkup is no longer preprocessed
      expect(result).toContain('{++added text++}');
      expect(result).not.toContain('critic-addition');
    });

    it('should render deletions as literal text', () => {
      const result = markdown.renderSync('This is {--deleted text--}');
      expect(result).toContain('{--deleted text--}');
      expect(result).not.toContain('critic-deletion');
    });

    it('should NOT preprocess substitutions', () => {
      const result = markdown.renderSync('This is {~~old~>new~~} text');
      expect(result).not.toContain('critic-substitution');
      expect(result).not.toMatch(/data-critic-type/);
      // Note: Remark may process ~~ as strikethrough
    });

    it('should NOT preprocess highlights with comments', () => {
      const result = markdown.renderSync(
        'This is {==highlighted==}{>>with a comment<<}'
      );
      expect(result).not.toContain('critic-highlight');
      expect(result).not.toContain('critic-comment');
      expect(result).not.toMatch(/data-critic-type/);
      // Note: ==, >>, and << may be processed as markdown/entities
    });

    it('should NOT preprocess standalone comments', () => {
      const result = markdown.renderSync('Text {>>comment here<<}');
      expect(result).not.toContain('critic-comment');
      expect(result).not.toMatch(/data-critic-type/);
    });

    // Note: List tests with CriticMarkup removed - not relevant since
    // CriticMarkup is never preprocessed in UI rendering
  });

  describe('Sanitization', () => {
    it('should remove script tags', () => {
      const html = '<p>Safe</p><script>alert("xss")</script>';
      const result = markdown.sanitize(html);
      expect(result).toContain('<p>Safe</p>');
      expect(result).toContain('&lt;script&gt;alert("xss")&lt;/script&gt;');
      expect(result).not.toContain('<script>');
    });

    it('should remove event handlers', () => {
      const html = '<p onclick="alert()">Click me</p>';
      const result = markdown.sanitize(html);
      expect(result).not.toContain('onclick');
      expect(result).toContain('Click me');
    });

    it('should preserve safe HTML', () => {
      const html = '<p><strong>Bold</strong> and <em>italic</em></p>';
      const result = markdown.sanitize(html);
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });
  });

  describe('Plain text extraction', () => {
    it('should extract plain text from markdown', () => {
      const result = markdown.toPlainText('# Header\n\n**Bold** text');
      expect(result).toBe('Header\nBold text');
    });

    it('should remove all formatting', () => {
      const input = '**bold** *italic* `code` [link](url)';
      const result = markdown.toPlainText(input);
      expect(result).not.toContain('**');
      expect(result).not.toContain('*');
      expect(result).not.toContain('`');
      expect(result).not.toContain('[');
    });

    it('should handle links correctly', () => {
      const result = markdown.toPlainText('[Link text](https://example.com)');
      expect(result).toBe('Link text');
    });
  });

  describe('Custom options', () => {
    it('should NOT preprocess CriticMarkup (architectural change)', () => {
      // CriticMarkup preprocessing has been removed from UI rendering
      const md = new MarkdownModule();
      const result = md.renderSync('Text {++added++}');
      // CriticMarkup appears as literal text
      expect(result).toContain('{++added++}');
      expect(result).not.toContain('critic-addition');
    });

    it('should render CriticMarkup as literal text by default', () => {
      const md = new MarkdownModule();
      const result = md.renderSync('Text {++added++} and {--removed--}');
      expect(result).toContain('{++added++}');
      expect(result).toContain('{--removed--}');
      expect(result).not.toContain('critic-addition');
      expect(result).not.toContain('critic-deletion');
    });

    it('should allow enabling raw HTML output at runtime', () => {
      const md = new MarkdownModule();
      const input = '<script>alert("xss")</script>';
      const sanitized = md.renderSync(input);
      expect(sanitized).not.toContain('<script>');

      md.setAllowRawHtml(true);
      const raw = md.renderSync(input);
      expect(raw).toContain('<script>');
    });
  });

  describe('AST parsing', () => {
    it('should parse markdown to AST', () => {
      const ast = markdown.parseToAST('# Header\n\nParagraph');
      expect(ast).toBeDefined();
      expect(ast.type).toBe('root');
      expect(ast.children).toBeDefined();
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('should parse GFM features', () => {
      const ast = markdown.parseToAST('~~strikethrough~~');
      expect(ast).toBeDefined();
      expect(ast.type).toBe('root');
    });
  });

  describe.skip('Heading rendering with CriticMarkup (DEPRECATED - CriticMarkup no longer preprocessed)', () => {
    it('should render heading with CriticMarkup addition', () => {
      // New section with addition markup: {++New Heading++}
      const result = markdown.renderElement('{++New Heading++}', 'Header', 2);
      console.log('Addition test result:', result);

      // Should contain heading tags
      expect(result).toContain('<h2>');
      expect(result).toContain('</h2>');

      // Should NOT contain visible ## markers anywhere
      expect(result).not.toContain('##');

      // Should contain the heading text
      expect(result).toContain('New Heading');

      // Should contain CriticMarkup classes for green line
      expect(result).toContain('critic-addition');
      expect(result).toContain('<ins');
      expect(result).toContain('</ins>');

      // Should have proper structure: h2 with ins inside
      expect(result).toMatch(/<h2><ins[^>]*>New Heading<\/ins><\/h2>/);
    });

    it('should render heading with CriticMarkup deletion', () => {
      const result = markdown.renderElement('{--Old Heading--}', 'Header', 2);
      console.log('Deletion test result:', result);

      expect(result).toContain('<h2>');
      expect(result).toContain('</h2>');
      expect(result).not.toContain('##');
      expect(result).toContain('Old Heading');
      expect(result).toContain('critic-deletion');
      expect(result).toContain('<del');
      expect(result).toContain('</del>');

      // Should have proper structure: h2 with del inside
      expect(result).toMatch(/<h2><del[^>]*>Old Heading<\/del><\/h2>/);
    });

    it('should render heading with CriticMarkup substitution', () => {
      const result = markdown.renderElement('{~~Old~>New~~}', 'Header', 2);
      console.log('Substitution test result:', result);

      expect(result).toContain('<h2>');
      expect(result).toContain('</h2>');
      expect(result).not.toContain('##');
      expect(result).toContain('critic-substitution');
      expect(result).toContain('<del');
      expect(result).toContain('<ins');

      // Should have proper structure with both old and new text
      expect(result).toMatch(/<h2><span[^>]*>.*<del[^>]*>Old<\/del>.*<ins[^>]*>New<\/ins>.*<\/span><\/h2>/);
    });

    it('should handle heading with Pandoc attributes and CriticMarkup', () => {
      const result = markdown.renderElement('{++New Heading++} {#id .class}', 'Header', 3);
      console.log('Pandoc attributes test result:', result);

      // Should contain h3 tags (level 3)
      expect(result).toContain('<h3>');
      expect(result).not.toContain('##');
      expect(result).toContain('New Heading');
      expect(result).toContain('critic-addition');

      // Pandoc attributes should be stripped
      expect(result).not.toContain('{#id');
      expect(result).not.toContain('.class}');
    });

    it('should render plain heading without CriticMarkup', () => {
      const result = markdown.renderElement('Simple Heading', 'Header', 2);
      console.log('Plain heading test result:', result);

      expect(result).toStrictEqual('<h2>Simple Heading</h2>');
      expect(result).not.toContain('critic');
      expect(result).not.toContain('##');
    });

    it('should handle heading with CriticMarkup containing heading markers', () => {
      // Edge case: CriticMarkup wrapper contains heading markers
      const result = markdown.renderElement('{++## New Heading++}', 'Header', 2);
      console.log('Edge case test result:', result);

      // Should NOT show ## even if input contains them within CriticMarkup
      expect(result).not.toContain('##');
      expect(result).toContain('<h2>');
      expect(result).toContain('New Heading');
      expect(result).toContain('critic-addition');
    });

    it('should handle heading with CriticMarkup not fully wrapped', () => {
      // Edge case: Heading markers outside CriticMarkup
      const result = markdown.renderElement('## {++New Heading++}', 'Header', 2);
      console.log('Partially wrapped test result:', result);

      // The ## should be treated as content to extract
      // Should render as proper heading
      expect(result).toContain('<h2>');
      expect(result).toContain('critic-addition');
      // Should NOT show literal ## in output
      expect(result).not.toContain('##<');
    });
  });
});
