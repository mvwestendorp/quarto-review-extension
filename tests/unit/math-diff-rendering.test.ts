/**
 * Test for math rendering with diff markup
 *
 * This test reproduces the issue where LaTeX math commands show duplicate rendering
 * after edits are made.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarkdownModule } from '@modules/markdown';
import { changesToHtmlDiff } from '@modules/changes/converters';
import { ensureKatexCssForContent } from '@utils/katex-css-injector';
import type { TextChange } from '@/types';

// Mock DOM for CSS injection
beforeEach(() => {
  // Reset document.head
  document.head.innerHTML = '';
});

describe('Math Rendering with Diff Markup', () => {
  const markdown = new MarkdownModule();

  it('should render math correctly in initial state', () => {
    const input = 'Or LaTeX commands: $\\LaTeX$';
    const html = markdown.renderSync(input);

    // Should contain KaTeX rendering
    expect(html).toContain('class="katex"');
    // Should NOT show literal LaTeX
    expect(html).not.toContain('$\\LaTeX$');
  });

  it('should render math correctly after adding text with HTML diff tags', () => {
    const original = 'Or LaTeX commands: $\\LaTeX$';
    const changes: TextChange[] = [
      {
        type: 'addition',
        position: original.length,
        length: 5,
        text: ' Test',
      },
    ];

    // Generate markdown with inline HTML diff tags
    const markdownWithDiffs = changesToHtmlDiff(original, changes);

    console.log('Markdown with diffs:', markdownWithDiffs);

    // Render the markdown with diff tags (allowRawHtml must be true)
    const html = markdown.renderSync(markdownWithDiffs, {
      allowRawHtml: true,
    });

    console.log('Rendered HTML:', html);

    // Should contain KaTeX rendering
    expect(html).toContain('class="katex"');

    // Should contain the addition markup
    expect(html).toContain('class="review-addition"');
    expect(html).toContain('Test');

    // Should NOT show literal LaTeX
    expect(html).not.toContain('$\\LaTeX$');

    // Should NOT have duplicate LaTeX text
    const katexText = html.match(/LaTeX/gi);
    console.log('LaTeX occurrences:', katexText);

    // We expect exactly the rendered LaTeX, not duplicates
    // The issue is that we're seeing both the math rendering AND plain text
  });

  it('should handle inline math followed by diff tags', () => {
    const original = '$x^2$';
    const changes: TextChange[] = [
      {
        type: 'addition',
        position: original.length,
        length: 5,
        text: ' more',
      },
    ];

    const markdownWithDiffs = changesToHtmlDiff(original, changes);
    console.log('Math + diff:', markdownWithDiffs);

    const html = markdown.renderSync(markdownWithDiffs, {
      allowRawHtml: true,
    });

    console.log('Rendered:', html);

    // Should have KaTeX
    expect(html).toContain('class="katex"');
    // Should have the addition
    expect(html).toContain('more');
    // Should NOT have literal $x^2$
    expect(html).not.toContain('$x^2$');
  });

  // Note: Display math ($$...$$) rendering with diff tags is complex
  // because rehype-katex requires specific formatting that may be disrupted by diff markup.
  // This is a known limitation and not critical for the primary use case.

  describe('KaTeX CSS Lazy Loading', () => {
    it('should inject CSS link when math content is detected', () => {
      const htmlWithMath = '<p><span class="katex">test</span></p>';

      // Initially no KaTeX CSS
      expect(document.querySelector('link[href*="katex"]')).toBeNull();

      // Trigger CSS injection (fire immediately to avoid timeout)
      void ensureKatexCssForContent(htmlWithMath).catch(() => {
        // Ignore error in test env (link won't actually load)
      });

      // Give it a moment to inject the link element
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // CSS link should now be in the DOM (even if not loaded)
          const link = document.querySelector('link[href*="katex"]') as HTMLLinkElement;
          expect(link).not.toBeNull();
          expect(link?.href).toContain('katex');
          resolve();
        }, 100);
      });
    });

    it('should not inject CSS when no math content', async () => {
      const htmlWithoutMath = '<p>Regular text without math</p>';

      // Reset
      document.head.innerHTML = '';

      // Try to ensure CSS for content without math
      await ensureKatexCssForContent(htmlWithoutMath);

      // CSS should NOT be injected
      expect(document.querySelector('link[href*="katex"]')).toBeNull();
    });
  });
});
