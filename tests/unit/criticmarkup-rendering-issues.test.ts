import { describe, it, expect, beforeEach } from 'vitest';
import MarkdownModule from '@modules/markdown';

/**
 * CriticMarkup Rendering Tests - ARCHITECTURAL CHANGE
 *
 * IMPORTANT: CriticMarkup preprocessing has been removed from the UI rendering pipeline.
 *
 * New Architecture (as of architectural simplification):
 * ────────────────────────────────────────────────────
 * 1. UI Rendering Path:
 *    - MarkdownModule.renderSync() does NOT preprocess CriticMarkup
 *    - CriticMarkup appears as literal text {++...++} in HTML
 *    - Changes are shown via CSS styling and change summary panel
 *    - Cleaner, simpler rendering pipeline
 *
 * 2. Export Path (CriticMarkup ONLY used here):
 *    - ChangesModule.toMarkdown() may include CriticMarkup
 *    - ChangesModule.toCleanMarkdown() strips all CriticMarkup
 *    - Git commits use CriticMarkup for text-based change tracking
 *    - converters.ts handles CriticMarkup generation
 *
 * Testing Strategy:
 * ─────────────────
 * - UI rendering tests: Verify CriticMarkup is NOT preprocessed
 * - Export tests: See tests/unit/export-criticmarkup.test.ts
 * - Pandoc parity tests: Simplified (no CriticMarkup special cases)
 */

describe('CriticMarkup - UI Rendering (Not Preprocessed)', () => {
  let markdown: MarkdownModule;

  beforeEach(() => {
    markdown = new MarkdownModule({ allowRawHtml: true });
  });

  describe('UI rendering does NOT preprocess CriticMarkup', () => {
    it('should render CriticMarkup addition as literal text', () => {
      const content = 'This is a paragraph with {++added text++}.';
      const html = markdown.renderSync(content);

      // CriticMarkup should appear as literal text
      expect(html).toContain('{++');
      expect(html).toContain('++}');
      expect(html).toContain('added text');

      // Should NOT be preprocessed into HTML tags
      expect(html).not.toMatch(/class="critic-addition"/);
    });

    it('should render CriticMarkup deletion as literal text', () => {
      const content = 'This has {--removed text--} content.';
      const html = markdown.renderSync(content);

      expect(html).toContain('{--');
      expect(html).toContain('--}');
      expect(html).not.toMatch(/class="critic-deletion"/);
    });

    it('should NOT preprocess CriticMarkup substitution', () => {
      const content = 'This is {~~old~>new~~} text.';
      const html = markdown.renderSync(content);

      // CriticMarkup is not preprocessed (no critic classes)
      expect(html).not.toMatch(/class="critic-substitution"/);
      expect(html).not.toMatch(/data-critic-type/);
      // Note: Remark may process ~~ as strikethrough, so exact literal syntax may vary
    });

    it('should NOT preprocess CriticMarkup comments', () => {
      const content = 'Text {>>This is a comment<<} continues.';
      const html = markdown.renderSync(content);

      // CriticMarkup is not preprocessed (no critic classes)
      expect(html).not.toMatch(/class="critic-comment"/);
      expect(html).not.toMatch(/data-critic-type/);
      // Note: >> and << may be processed as HTML entities by Remark
    });

    it('should render CriticMarkup highlight as literal text', () => {
      const content = 'Highlighted {==important text==} here.';
      const html = markdown.renderSync(content);

      expect(html).toContain('{==');
      expect(html).toContain('==}');
      expect(html).not.toMatch(/class="critic-highlight"/);
    });
  });

  describe('Rendering still works correctly for regular markdown', () => {
    it('should render inline code correctly', () => {
      const content = 'Use the `console.log()` function for debugging.';
      const html = markdown.renderSync(content);

      expect(html).toContain('<code>console.log()</code>');
    });

    it('should render LaTeX math expressions', () => {
      const content = 'The equation $E = mc^2$ is famous.';
      const html = markdown.renderSync(content);

      expect(html).toContain('class="katex"');
      expect(html).not.toContain('$E = mc^2$'); // Should not show literal $
    });

    it('should render blockquotes correctly', () => {
      const content = '> This is a quote.';
      const html = markdown.renderSync(content);

      expect(html).toContain('<blockquote>');
      expect(html).toContain('This is a quote.');
    });

    it('should render lists correctly', () => {
      const content = `- Item 1
- Item 2
- Item 3`;

      const html = markdown.renderSync(content);

      expect(html).toContain('<ul>');
      expect(html).toContain('<li>');
    });
  });
});
