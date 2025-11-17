import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownModule } from '../../../src/modules/markdown';
import { fixtureLoader } from '../../utils/fixture-loader';

/**
 * Comprehensive markdown rendering tests
 *
 * Tests markdown rendering with CriticMarkup support:
 * - Basic markdown rendering
 * - CriticMarkup rendering ({++addition++}, {--deletion--}, {~~old~>new~~})
 * - Heading normalization (stripping Pandoc attributes)
 * - Element-specific rendering (headers, code, blockquotes, etc.)
 * - Sanitization (XSS prevention)
 *
 * Test cases can be added in tests/fixtures/rendering/
 * See tests/fixtures/README.md for how to add new test cases.
 */
describe('Markdown Rendering', () => {
  let markdownModule: MarkdownModule;

  beforeEach(() => {
    markdownModule = new MarkdownModule();
  });

  describe('Basic Rendering', () => {
    it('should render plain text', () => {
      const markdown = 'Hello world';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('Hello world');
    });

    it('should render paragraphs', () => {
      const markdown = 'Paragraph 1\n\nParagraph 2';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('<p>Paragraph 1</p>');
      expect(html).toContain('<p>Paragraph 2</p>');
    });

    it('should render headings', () => {
      const markdown = '# Heading 1\n## Heading 2';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('<h1>Heading 1</h1>');
      expect(html).toContain('<h2>Heading 2</h2>');
    });

    it('should render lists', () => {
      const markdown = '- Item 1\n- Item 2';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('<ul>');
      expect(html).toContain('<li>Item 1</li>');
      expect(html).toContain('<li>Item 2</li>');
    });

    it('should render ordered lists', () => {
      const markdown = '1. First\n2. Second';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('<ol>');
      expect(html).toContain('<li>First</li>');
      expect(html).toContain('<li>Second</li>');
    });

    it('should render code blocks', () => {
      const markdown = '```js\nconst x = 1;\n```';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('<pre>');
      expect(html).toContain('<code');
      expect(html).toContain('const x = 1;');
    });

    it('should render inline code', () => {
      const markdown = 'Use `console.log()` for debugging';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('<code>console.log()</code>');
    });

    it('should render blockquotes', () => {
      const markdown = '> This is a quote';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('<blockquote>');
      expect(html).toContain('This is a quote');
    });

    it('should render tables (GFM)', () => {
      const markdown = '| A | B |\n|---|---|\n| 1 | 2 |';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('<table>');
      expect(html).toContain('<thead>');
      expect(html).toContain('<tbody>');
    });

    it('should render bold and italic', () => {
      const markdown = '**bold** and *italic*';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('<em>italic</em>');
    });

    it('should render links', () => {
      const markdown = '[Example](https://example.com)';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('<a href="https://example.com">Example</a>');
    });
  });

  describe('CriticMarkup Rendering', () => {
    it('should render additions', () => {
      const markdown = 'Text with {++addition++}';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('addition');
      // The remark-criticmarkup plugin should wrap it
      expect(html).toMatch(/addition/);
    });

    it('should render deletions', () => {
      const markdown = 'Text with {--deletion--}';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('deletion');
    });

    it('should render substitutions', () => {
      const markdown = 'Text with {~~old~>new~~}';
      const html = markdownModule.renderSync(markdown);

      // Should contain both old and new
      expect(html).toContain('old');
      expect(html).toContain('new');
    });

    it('should render highlights', () => {
      const markdown = 'Text with {==highlight==}';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('highlight');
    });

    it('should render comments', () => {
      const markdown = 'Text with {>>comment<<}';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('comment');
    });

    it('should render mixed CriticMarkup', () => {
      const markdown =
        'Start {++add++} middle {--delete--} end {~~old~>new~~} finish';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('add');
      expect(html).toContain('delete');
      expect(html).toContain('old');
      expect(html).toContain('new');
    });

    it('should render CriticMarkup in headings', () => {
      const markdown = '# Heading with {++addition++}';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('<h1');
      expect(html).toContain('addition');
    });

    it('should render CriticMarkup in lists', () => {
      const markdown = '- Item with {++addition++}\n- Normal item';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('<li>');
      expect(html).toContain('addition');
    });

    it('should render CriticMarkup in tables', () => {
      const markdown = '| A | B |\n|---|---|\n| {~~old~>new~~} | value |';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('<table>');
      expect(html).toContain('old');
      expect(html).toContain('new');
    });
  });

  describe('Heading Normalization', () => {
    it('should strip Pandoc heading attributes', () => {
      const markdown = '## Heading {#id .class}';
      const normalized = markdownModule.stripPandocHeadingAttributes(markdown);

      expect(normalized).toBe('## Heading');
    });

    it('should strip attributes with multiple classes', () => {
      const markdown = '## Heading {#id .class1 .class2 attr=value}';
      const normalized = markdownModule.stripPandocHeadingAttributes(markdown);

      expect(normalized).toBe('## Heading');
    });

    it('should handle headings without attributes', () => {
      const markdown = '## Regular Heading';
      const normalized = markdownModule.stripPandocHeadingAttributes(markdown);

      expect(normalized).toBe('## Regular Heading');
    });

    it('should handle Setext-style headings', () => {
      const markdown = 'Heading\n=======';
      const normalized = markdownModule.stripPandocHeadingAttributes(markdown);

      expect(normalized).toContain('Heading');
    });

    it('should preserve CriticMarkup in headings', () => {
      const markdown = '## Heading {++addition++} {#id}';
      const normalized = markdownModule.stripPandocHeadingAttributes(markdown);

      expect(normalized).toBe('## Heading {++addition++}');
    });
  });

  describe('Element-Specific Rendering', () => {
    it('should render headers with level adjustment', () => {
      const markdown = '## Second Level';
      const html = markdownModule.renderElement(markdown, 'Header', 2);

      expect(html).toContain('<h2');
      expect(html).toContain('Second Level');
    });

    it('should render code blocks with language', () => {
      const markdown = '```python\nprint("hello")\n```';
      const html = markdownModule.renderElement(markdown, 'CodeBlock');

      expect(html).toContain('<pre>');
      expect(html).toContain('print("hello")');
    });

    it('should render blockquotes', () => {
      const markdown = '> Quote text';
      const html = markdownModule.renderElement(markdown, 'BlockQuote');

      expect(html).toContain('<blockquote>');
      expect(html).toContain('Quote text');
    });

    it('should render inline content without paragraph wrapper', () => {
      const markdown = 'Inline text';
      const html = markdownModule.renderInline(markdown);

      // Should not wrap in <p> tags
      expect(html).not.toContain('<p>');
      expect(html).toContain('Inline text');
    });
  });

  describe('Sanitization and Security', () => {
    it('should sanitize dangerous HTML', () => {
      const markdown = '<script>alert("xss")</script>';
      const html = markdownModule.renderSync(markdown);

      // Should not include the script tag
      expect(html).not.toContain('<script>');
    });

    it('should sanitize dangerous attributes', () => {
      const markdown = '<img src="x" onerror="alert(1)">';
      const html = markdownModule.renderSync(markdown);

      // Should not include onerror
      expect(html).not.toContain('onerror');
    });

    it('should allow safe HTML elements', () => {
      const markdown = '<strong>bold</strong>';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('<strong>bold</strong>');
    });
  });

  describe('Plain Text Extraction', () => {
    it('should extract plain text from markdown', () => {
      const markdown = '# Heading\n\n**bold** and *italic*';
      const text = markdownModule.toPlainText(markdown);

      expect(text).toContain('Heading');
      expect(text).toContain('bold');
      expect(text).toContain('italic');
      expect(text).not.toContain('**');
      expect(text).not.toContain('*');
    });

    it('should extract text from CriticMarkup', () => {
      const markdown = 'Text with {++addition++} and {--deletion--}';
      const text = markdownModule.toPlainText(markdown);

      expect(text).toContain('addition');
      expect(text).toContain('deletion');
    });
  });

  describe('AST Parsing', () => {
    it('should parse markdown to AST', () => {
      const markdown = '# Heading\n\nParagraph';
      const ast = markdownModule.parseToAST(markdown);

      expect(ast).toBeDefined();
      expect(ast.type).toBe('root');
      expect(ast.children).toBeDefined();
      expect(Array.isArray(ast.children)).toBe(true);
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('should parse complex structures', () => {
      const markdown = `# Heading

- List item 1
- List item 2

| A | B |
|---|---|
| 1 | 2 |`;

      const ast = markdownModule.parseToAST(markdown);

      expect(ast.children.length).toBeGreaterThan(2);
    });
  });

  describe('Fixture-Based Rendering Tests', () => {
    const testCases = fixtureLoader.getRenderingTestCases();

    if (testCases.length === 0) {
      it.skip('No rendering test cases found in fixtures', () => {
        // This test will be skipped but documented
      });
    } else {
      testCases.forEach((testCase) => {
        it(`should render ${testCase.name} correctly`, () => {
          const html = markdownModule.renderSync(testCase.input);

          // Compare with expected output (allowing for whitespace differences)
          const normalizedActual = html.replace(/\s+/g, ' ').trim();
          const normalizedExpected = testCase.expected
            .replace(/\s+/g, ' ')
            .trim();

          expect(normalizedActual).toBe(normalizedExpected);
        });
      });
    }
  });

  describe('Edge Cases', () => {
    it('should handle empty markdown', () => {
      const html = markdownModule.renderSync('');
      expect(html).toBe('');
    });

    it('should handle whitespace-only markdown', () => {
      const html = markdownModule.renderSync('   \n  \n  ');
      expect(html.trim()).toBe('');
    });

    it('should handle very long lines', () => {
      const longText = 'word '.repeat(1000).trim();
      const html = markdownModule.renderSync(longText);
      expect(html).toContain('word');
    });

    it('should handle deeply nested structures', () => {
      const markdown = `
- Level 1
  - Level 2
    - Level 3
      - Level 4
        - Level 5
      `.trim();

      const html = markdownModule.renderSync(markdown);
      expect(html).toContain('<ul>');
      expect(html).toContain('Level 5');
    });

    it('should handle mixed line endings', () => {
      const markdown = 'Line 1\r\nLine 2\nLine 3';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('Line 1');
      expect(html).toContain('Line 2');
      expect(html).toContain('Line 3');
    });

    it('should handle unicode characters', () => {
      const markdown = 'Unicode: 你好 🌍 עברית';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('你好');
      expect(html).toContain('🌍');
      expect(html).toContain('עברית');
    });

    it('should handle special markdown edge cases', () => {
      // Multiple blank lines
      const markdown = 'Paragraph 1\n\n\n\nParagraph 2';
      const html = markdownModule.renderSync(markdown);

      expect(html).toContain('Paragraph 1');
      expect(html).toContain('Paragraph 2');
    });

    it('should handle malformed markdown gracefully', () => {
      const markdown = '# Heading\n\n[unclosed link](http://';

      // Should not throw
      expect(() => {
        markdownModule.renderSync(markdown);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large documents efficiently', () => {
      const paragraphs = Array.from(
        { length: 1000 },
        (_, i) => `Paragraph ${i + 1} with some content.`
      );
      const markdown = paragraphs.join('\n\n');

      const startTime = Date.now();
      const html = markdownModule.renderSync(markdown);
      const endTime = Date.now();

      expect(html).toContain('Paragraph 1');
      expect(html).toContain('Paragraph 1000');

      // Should complete in reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });
  });
});
