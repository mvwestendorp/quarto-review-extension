/**
 * Tests for HTML entity decoding in markdown preprocessing
 * Verifies that markdown stored in data-review-markdown attributes (with HTML entities)
 * is correctly decoded before processing
 */

import { describe, it, expect } from 'vitest';
import { MarkdownModule } from '../../src/modules/markdown';

describe('HTML Entity Decoding in Markdown Preprocessing', () => {
  const markdown = new MarkdownModule();

  describe('Pandoc Attributes with HTML Entities', () => {
    it('should decode &quot; in Pandoc attributes', () => {
      // This is how markdown appears in data-review-markdown attributes
      const input = 'Regular text and [red text]{style=&quot;color: red;&quot;} test';
      const html = markdown.renderSync(input);

      // Should convert to proper HTML span with style attribute
      expect(html).toContain('style="color: red;"');
      expect(html).toContain('red text');
      // Should not contain HTML entities or literal braces in output
      expect(html).not.toContain('&quot;');
      expect(html).not.toContain('{style=');
    });

    it('should handle multiple Pandoc attributes with entities', () => {
      const input = '[Important]{.warning #note1 style=&quot;font-weight: bold;&quot;}';
      const html = markdown.renderSync(input);

      expect(html).toContain('class="warning"');
      expect(html).toContain('id="note1"');
      expect(html).toContain('style="font-weight: bold;"');
      expect(html).not.toContain('&quot;');
    });

    it('should decode &#39; (apostrophe) entities', () => {
      const input = "[Text]{data-value=&#39;test&#39;}";
      const html = markdown.renderSync(input);

      expect(html).toContain("data-value=\"'test'\"");
      expect(html).not.toContain('&#39;');
    });

    it('should decode &lt; and &gt; entities', () => {
      const input = '[Code]{title=&quot;&lt;div&gt;&quot;}';
      const html = markdown.renderSync(input);

      expect(html).toContain('title="<div>"');
      expect(html).not.toContain('&lt;');
      expect(html).not.toContain('&gt;');
    });

    it('should decode &amp; entities (but not double-decode)', () => {
      const input = '[Text]{data-content=&quot;A &amp; B&quot;}';
      const html = markdown.renderSync(input);

      // HTML output will re-encode & as &amp; for valid HTML
      // The important thing is that the attribute value was correctly processed
      expect(html).toContain('data-content="A &amp; B"');
      // Should not have the original escaped quotes
      expect(html).not.toContain('&quot;');
    });
  });

  describe('LaTeX Math (No Entity Issues)', () => {
    it('should render LaTeX math correctly', () => {
      const input = 'The equation is $\\beta = \\alpha + 1$.';
      const html = markdown.renderSync(input);

      expect(html).toContain('class="katex"');
      expect(html).not.toContain('$\\beta');
    });

    it('should render display math', () => {
      // Display math requires being on its own line
      const input = '$$\n\\sum_{i=1}^{n} x_i\n$$';
      const html = markdown.renderSync(input);

      // Check that it's rendered with KaTeX (may be inline or display depending on config)
      expect(html).toContain('class="katex');
      expect(html).not.toContain('$$');
    });
  });

  describe('CriticMarkup with Pandoc Attributes (CriticMarkup not preprocessed)', () => {
    it('should decode entities in Pandoc attributes with literal CriticMarkup', () => {
      const input =
        'The {++[new text]{style=&quot;color: green;&quot;}++} section.';
      const html = markdown.renderSync(input);

      // CriticMarkup is no longer preprocessed
      expect(html).toContain('{++');
      expect(html).not.toContain('critic-addition');

      // Pandoc attributes should still be processed
      expect(html).toContain('style="color: green;"');
      expect(html).not.toContain('&quot;');
    });

    it('should decode entities with literal CriticMarkup substitutions', () => {
      const input =
        '{~~[old]{style=&quot;color: red;&quot;}~>[new]{style=&quot;color: green;&quot;}~~}';
      const html = markdown.renderSync(input);

      // CriticMarkup is not preprocessed
      expect(html).not.toContain('critic-substitution');
      expect(html).not.toMatch(/data-critic-type/);

      // Pandoc attributes should still be processed
      expect(html).toContain('style="color: red;"');
      expect(html).toContain('style="color: green;"');
      expect(html).not.toContain('&quot;');
      // Note: ~~ may be processed as strikethrough by Remark
    });
  });

  describe('Footnotes (No Entity Issues)', () => {
    it('should render footnote references', () => {
      const input = "Text with footnote[^1].\n\n[^1]: Footnote content.";
      const html = markdown.renderSync(input);

      expect(html).toContain('footnote-ref');
      expect(html).not.toContain('[^1]');
    });
  });

  describe('Code Blocks Should Preserve Literals', () => {
    it('should NOT decode entities in code blocks', () => {
      const input =
        '```markdown\n[red text]{style=&quot;color: red;&quot;}\n```';
      const html = markdown.renderSync(input);

      // In code blocks, we want to preserve the original text
      // The preprocessing should skip code blocks
      expect(html).toContain('<code');
      // Should show the example syntax literally (decoded but not converted to HTML span)
      expect(html).toContain('[red text]');
      expect(html).toContain('style');
      // But should not have converted it to a span tag
      expect(html).not.toContain('<span style="color: red;">red text</span>');
    });
  });

  describe('Mixed Content with Entities', () => {
    it('should handle complex mixed content (CriticMarkup not preprocessed)', () => {
      const input =
        'Regular text and [red text]{style=&quot;color: red;&quot;} and $\\beta$ and {++addition++}.';
      const html = markdown.renderSync(input);

      // Pandoc attributes rendered
      expect(html).toContain('style="color: red;"');
      expect(html).not.toContain('&quot;');

      // LaTeX rendered
      expect(html).toContain('class="katex"');

      // CriticMarkup is NOT preprocessed (appears as literal text)
      expect(html).not.toContain('critic-addition');
      expect(html).toContain('{++addition++}');

      // No literal markdown syntax for other features
      expect(html).not.toContain('{style=');
      expect(html).not.toContain('$\\beta');
    });
  });
});
