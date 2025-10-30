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

    it('should render CriticMarkup inline without paragraph wrappers', () => {
      const result = markdown.renderInline('Start {++add++} end');
      expect(result).toContain('critic-addition');
      expect(result.startsWith('<ins')).toBe(false);
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

  describe('CriticMarkup support', () => {
    it('should render additions', () => {
      const result = markdown.renderSync('This is {++added text++}');
      expect(result).toStrictEqual(
        '<p>This is <ins class=\"critic-addition\" data-critic-type=\"addition\">added text</ins></p>'
      );
    });

    it('should render deletions', () => {
      const result = markdown.renderSync('This is {--deleted text--}');
      expect(result).toContain('deleted text');
      expect(result).toContain('critic-deletion');
    });

    it('should render substitutions', () => {
      const result = markdown.renderSync('This is {~~old~>new~~} text');
      expect(result).toContain('old');
      expect(result).toContain('new');
      expect(result).toContain('critic-substitution');
    });

    it('should render highlights with comments', () => {
      const result = markdown.renderSync(
        'This is {==highlighted==}{>>with a comment<<}'
      );
      expect(result).toContain('highlighted');
      expect(result).toContain('with a comment');
      expect(result).toContain('critic-highlight');
      expect(result).toContain('critic-comment');
    });

    it('should render standalone comments', () => {
      const result = markdown.renderSync('Text {>>comment here<<}');
      expect(result).toContain('comment here');
      expect(result).toContain('critic-comment');
    });

    it('should render added list items without leaking CriticMarkup syntax', () => {
      const input = '- First item\n{++- Added item++}';
      const result = markdown.renderSync(input);
      expect(result).toContain('<ul>');
      expect(result).toMatch(/<li>First item<\/li>/);
      expect(result).toMatch(/<li><ins class="critic-addition" data-critic-type="addition">Added item<\/ins><\/li>/);
      expect(result).not.toContain('{++');
      expect(result).not.toContain('++}');
    });

    it('should allow disabling CriticMarkup', () => {
      const result = markdown.renderSync('This is {++added++}', false);
      // When disabled, CriticMarkup syntax should be rendered as-is
      expect(result).toContain('{++added++}');
    });
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
    it('should respect enableCriticMarkup option', () => {
      const mdNoCritic = new MarkdownModule({ enableCriticMarkup: false });
      const result = mdNoCritic.renderSync('Text {++added++}');
      expect(result).toContain('{++added++}');
      expect(result).not.toContain('critic-addition');
    });

    it('should enable CriticMarkup by default', () => {
      const md = new MarkdownModule();
      const result = md.renderSync('Text {++added++}');
      expect(result).toContain('critic-addition');
    });

    it('should allow toggling CriticMarkup at runtime', () => {
      const md = new MarkdownModule();
      md.setEnableCriticMarkup(false);
      const disabled = md.renderSync('Text {++added++}');
      expect(disabled).toContain('{++added++}');

      md.setEnableCriticMarkup(true);
      const enabled = md.renderSync('Text {++added++}');
      expect(enabled).toContain('critic-addition');
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
});
