/**
 * Tests for Pandoc-specific feature rendering after edits
 *
 * Tests LaTeX math, Pandoc attributes, and footnotes that should render
 * correctly when paragraphs are re-rendered after editing.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownModule } from '../../src/modules/markdown';

describe('Pandoc Features Rendering After Edits', () => {
  let markdown: MarkdownModule;

  beforeEach(() => {
    markdown = new MarkdownModule({
      allowRawHtml: true,
    });
  });

  describe('LaTeX Math Rendering', () => {
    it('should render inline LaTeX math', () => {
      const content = 'The equation is $\\beta = \\alpha + 1$.';
      const html = markdown.renderSync(content);

      // Should not show literal dollar signs and LaTeX
      expect(html).not.toContain('$\\beta$');
      expect(html).not.toContain('$\\alpha$');

      // Should contain KaTeX-rendered elements
      expect(html).toContain('class="katex"');
    });

    it('should render display LaTeX math', () => {
      const content = '$$\\sum_{i=1}^{n} x_i$$';
      const html = markdown.renderSync(content);

      // Should not show literal dollar signs
      expect(html).not.toContain('$$\\sum');

      // Should contain KaTeX math class (display math might be in <p> or have katex-display)
      expect(html).toContain('class="katex"');
    });

    it('should handle LaTeX with literal CriticMarkup syntax (not preprocessed)', () => {
      const content = 'The {++new++} equation is $\\beta$.';
      const html = markdown.renderSync(content);

      // CriticMarkup is no longer preprocessed in UI rendering
      expect(html).toContain('{++');
      expect(html).toContain('++}');
      // LaTeX should still render
      expect(html).toContain('class="katex"');
      expect(html).not.toContain('$\\beta$');
    });

    it('should handle LaTeX with literal CriticMarkup deletions (not preprocessed)', () => {
      const content = 'The {--old $\\alpha$--} equation.';
      const html = markdown.renderSync(content);

      // CriticMarkup is no longer preprocessed
      expect(html).toContain('{--');
      // LaTeX should still be rendered
      expect(html).toContain('class="katex"');
      expect(html).not.toContain('$\\alpha$');

      // Note: CriticMarkup around LaTeX currently doesn't work perfectly
      // because remarkMath parses $...$ first, leaving {-- --} orphaned
      // This would require preprocessing to fix (future enhancement)
    });

    it('should handle multiple inline math expressions', () => {
      const content = 'We have $x = 5$ and $y = 10$ therefore $z = 15$.';
      const html = markdown.renderSync(content);

      // Should not show any literal dollar signs
      expect(html).not.toContain('$x =');
      expect(html).not.toContain('$y =');
      expect(html).not.toContain('$z =');

      // Should contain multiple katex elements
      const katexMatches = html.match(/class="katex"/g);
      expect(katexMatches).toBeTruthy();
      expect(katexMatches!.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle complex LaTeX expressions', () => {
      const content = 'The formula is $f(x) = \\int_{-\\infty}^{\\infty} e^{-x^2} dx$.';
      const html = markdown.renderSync(content);

      // Should not show literal LaTeX in visible content (may appear in MathML annotation)
      // Check that it's not visible in the main text by looking for katex rendering
      expect(html).toContain('class="katex"');
      expect(html).not.toContain('$f(x)');
    });

    it('should preserve LaTeX in code blocks as literal text', () => {
      const content = `Here is code:

\`\`\`python
result = "$\\beta$"
\`\`\`

And inline code: \`$x = 5$\`.`;
      const html = markdown.renderSync(content);

      // In code blocks and inline code, LaTeX should remain literal
      // This is correct Markdown behavior
      expect(html).toContain('$\\beta$');
      expect(html).toContain('$x = 5$');
    });
  });

  describe('Pandoc Attributes', () => {
    it('should render inline span with style attribute', () => {
      const content = '[Red text]{style="color: red;"}';
      const html = markdown.renderSync(content);

      // Should not show literal braces
      expect(html).not.toContain('{style=');

      // Should contain style attribute
      expect(html).toContain('style="color: red;"');
      expect(html).toContain('Red text');
    });

    it('should render inline span with class attribute', () => {
      const content = '[Important]{.highlight}';
      const html = markdown.renderSync(content);

      // Should not show literal braces and dot notation
      expect(html).not.toContain('{.highlight}');

      // Should contain class attribute
      expect(html).toContain('class="highlight"');
      expect(html).toContain('Important');
    });

    it('should render inline span with id attribute', () => {
      const content = '[Section]{#intro}';
      const html = markdown.renderSync(content);

      // Should not show literal braces and hash notation
      expect(html).not.toContain('{#intro}');

      // Should contain id attribute
      expect(html).toContain('id="intro"');
      expect(html).toContain('Section');
    });

    it('should handle multiple attributes together', () => {
      const content = '[Text]{.highlight #intro style="color: blue;"}';
      const html = markdown.renderSync(content);

      // Should not show literal braces
      expect(html).not.toContain('{.highlight');

      // Should contain all attributes
      expect(html).toContain('class="highlight"');
      expect(html).toContain('id="intro"');
      expect(html).toContain('style="color: blue;"');
      expect(html).toContain('Text');
    });

    it('should handle Pandoc attributes with CriticMarkup', () => {
      const content = '{++[New text]{style="color: green;"}++}';
      const html = markdown.renderSync(content);

      // Pandoc attributes should be rendered (preprocessing runs first)
      expect(html).toContain('style="color: green;"');
      expect(html).toContain('New text');
      expect(html).not.toContain('[New text]');

      // Note: CriticMarkup wrapping Pandoc attributes doesn't work perfectly
      // because Pandoc attribute preprocessing converts [text]{attr} to <span>
      // before CriticMarkup can process it, leaving {++ ++} orphaned
      // For CriticMarkup on styled text, use: {++text++} with [result]{style="..."}
    });

    it('should preserve Pandoc attributes in code blocks as literal', () => {
      const content = `Code example:

\`\`\`markdown
[Text]{style="color: red;"}
\`\`\``;
      const html = markdown.renderSync(content);

      // In code blocks, attributes should remain literal
      expect(html).toContain('{style="color: red;"}');
    });

    it('should handle nested formatting with Pandoc attributes', () => {
      const content = '[**Bold** and *italic*]{.highlight}';
      const html = markdown.renderSync(content);

      // Should render both Markdown formatting and Pandoc attributes
      expect(html).toContain('<strong>Bold</strong>');
      expect(html).toContain('<em>italic</em>');
      expect(html).toContain('class="highlight"');
      expect(html).not.toContain('{.highlight}');
    });
  });

  describe('Footnotes', () => {
    it('should render footnote reference as superscript link', () => {
      const content = 'Text with footnote[^1].\n\n[^1]: Footnote content.';
      const html = markdown.renderSync(content);

      // Should not show literal footnote syntax
      expect(html).not.toContain('[^1]');

      // Should contain footnote reference (as sup or with footnote class)
      expect(html).toMatch(/<sup|footnote-ref/);
    });

    it('should render footnote definition', () => {
      const content = 'Text[^1].\n\n[^1]: Content here.';
      const html = markdown.renderSync(content);

      // Should contain the footnote content
      expect(html).toContain('Content here');

      // Should be in a list or footnote definition structure
      expect(html).toMatch(/<li|footnote/);
    });

    it('should handle footnote with CriticMarkup in reference', () => {
      const content = 'Text{++[^1]++}.\n\n[^1]: Added footnote.';
      const html = markdown.renderSync(content);

      // Footnote should be rendered (footnotes parse first)
      expect(html).toMatch(/<sup|footnote-ref/);
      expect(html).not.toContain('[^1]');

      // Note: CriticMarkup around footnote references doesn't work perfectly
      // because remarkGfm parses [^1] first, leaving {++ ++} orphaned
      // This is an edge case that would require preprocessing to fix
    });

    it('should handle footnote with literal CriticMarkup in definition', () => {
      const content = 'Text[^1].\n\n[^1]: {++Added++} content.';
      const html = markdown.renderSync(content);

      // CriticMarkup is no longer preprocessed
      expect(html).toContain('{++');
      expect(html).toContain('++}');
      expect(html).toContain('Added');
      expect(html).toContain('content');
    });

    it('should handle multiple footnotes', () => {
      const content = 'First[^1] and second[^2].\n\n[^1]: First note.\n\n[^2]: Second note.';
      const html = markdown.renderSync(content);

      // Should contain both footnote contents
      expect(html).toContain('First note');
      expect(html).toContain('Second note');

      // Should not show literal syntax
      expect(html).not.toContain('[^1]');
      expect(html).not.toContain('[^2]');
    });

    it('should preserve footnote syntax in code blocks as literal', () => {
      const content = `Example:

\`\`\`markdown
Text[^1].

[^1]: Footnote.
\`\`\``;
      const html = markdown.renderSync(content);

      // In code blocks, footnote syntax should remain literal
      expect(html).toContain('[^1]');
    });
  });

  describe('Combined Features', () => {
    it('should handle LaTeX and Pandoc attributes together', () => {
      const content = '[$\\beta$ value]{.math-highlight}';
      const html = markdown.renderSync(content);

      // Should render both LaTeX and Pandoc attributes
      expect(html).toContain('class="katex"');
      expect(html).toContain('class="math-highlight"');
      expect(html).not.toContain('$\\beta$');
      expect(html).not.toContain('{.math-highlight}');
    });

    it('should handle all three features together', () => {
      const content = 'See equation [$\\alpha$]{.important}[^1].\n\n[^1]: Important equation.';
      const html = markdown.renderSync(content);

      // Should render LaTeX
      expect(html).toContain('class="katex"');
      expect(html).not.toContain('$\\alpha$');

      // Should render Pandoc attribute
      expect(html).toContain('class="important"');
      expect(html).not.toContain('{.important}');

      // Should render footnote
      expect(html).toMatch(/<sup|footnote-ref/);
      expect(html).toContain('Important equation');
    });

    it('should handle features with CriticMarkup', () => {
      const content = '{++[$\\beta$]{style="color: red;"}[^1]++}.\n\n[^1]: New equation.';
      const html = markdown.renderSync(content);

      // LaTeX should be rendered (remarkMath runs first)
      expect(html).toContain('class="katex"');

      // Pandoc attribute should be rendered (preprocessing)
      expect(html).toContain('style="color: red;"');

      // Footnote should be rendered (remarkGfm footnotes run early)
      expect(html).toMatch(/<sup|footnote-ref/);

      // Note: CriticMarkup wrapping all features doesn't work perfectly
      // because other parsers run first, leaving {++ ++} orphaned
      // This is a complex edge case that would require comprehensive preprocessing
    });
  });
});
