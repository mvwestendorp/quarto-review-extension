/**
 * Test for Pandoc attribute syntax with diff markup
 *
 * This reproduces the issue where editing text containing Pandoc attributes
 * results in malformed HTML with broken <ins> tags.
 */

import { describe, it, expect } from 'vitest';
import { MarkdownModule } from '@modules/markdown';
import {
  changesToHtmlDiff,
  generateChanges,
} from '@modules/changes/converters';
import type { TextChange } from '@/types';

describe('Pandoc Attributes with Diff Markup', () => {
  const markdown = new MarkdownModule();

  it('should handle Pandoc attributes when adding text after', () => {
    // Original: [Red text]{style="color: red;"}
    // User adds " test" at the end
    const original = '[Red text]{style="color: red;"}';
    const changes: TextChange[] = [
      {
        type: 'addition',
        position: original.length,
        length: 5,
        text: ' test',
      },
    ];

    const markdownWithDiffs = changesToHtmlDiff(original, changes);
    console.log('Original:', original);
    console.log('Markdown with diffs:', markdownWithDiffs);

    const html = markdown.renderSync(markdownWithDiffs, { allowRawHtml: true });
    console.log('Rendered HTML:', html);

    // Should contain the styled span
    expect(html).toContain('<span style="color: red;">Red text</span>');

    // Should contain the added text
    expect(html).toContain('test');

    // Should have proper <ins> tags
    expect(html).toContain('<ins');
    expect(html).toContain('review-addition');

    // Should NOT have malformed HTML
    expect(html).not.toContain('&lt;/ins&gt;');
  });

  it('should handle escaped brackets with diff markup', () => {
    // Simulating what happens when the editor escapes the bracket
    // Original: \[Red text]{style="color: red;"}
    // User adds " test" at the end
    const original = '\\[Red text]{style="color: red;"}';
    const changes: TextChange[] = [
      {
        type: 'addition',
        position: original.length,
        length: 5,
        text: ' test',
      },
    ];

    const markdownWithDiffs = changesToHtmlDiff(original, changes);
    console.log('Original (escaped):', original);
    console.log('Markdown with diffs:', markdownWithDiffs);

    const html = markdown.renderSync(markdownWithDiffs, { allowRawHtml: true });
    console.log('Rendered HTML:', html);

    // Should contain the styled span
    expect(html).toContain('<span style="color: red;">Red text</span>');

    // Should contain the added text
    expect(html).toContain('test');

    // Should NOT have malformed HTML
    expect(html).not.toContain('&lt;/ins&gt;');
  });

  it('should handle the exact scenario from the bug report', () => {
    // The user showed:
    // Updated Markdown: \[Red text]{style="color: red;"} test
    // This suggests the original was without the backslash
    const original = '[Red text]{style="color: red;"}';

    // After editing, it becomes: \[Red text]{style="color: red;"} test
    // The backslash and " test" were added
    const newContent = '\\[Red text]{style="color: red;"} test';

    // Calculate the diff
    const changes: TextChange[] = [
      {
        type: 'substitution',
        position: 0,
        length: 1,
        text: '\\[',
        oldText: '[',
      },
      {
        type: 'addition',
        position: original.length,
        length: 5,
        text: ' test',
      },
    ];

    const markdownWithDiffs = changesToHtmlDiff(original, changes);
    console.log('Original:', original);
    console.log('New content:', newContent);
    console.log('Markdown with diffs:', markdownWithDiffs);

    const html = markdown.renderSync(markdownWithDiffs, { allowRawHtml: true });
    console.log('Rendered HTML:', html);

    // Should contain the styled span
    expect(html).toContain('<span style="color: red;">Red text</span>');

    // Should contain the added text
    expect(html).toContain('test');
  });

  it('should normalize escaped brackets before computing diff', () => {
    // This tests the normalization fix in ChangesModule.getElementContentWithHtmlDiffs
    // Original: [Red text]{style="color: red;"}
    // Editor saves as: \[Red text]{style="color: red;"} test
    // The normalization should treat \[ and [ as the same

    const original = '[Red text]{style="color: red;"}';
    const updated = '\\[Red text]{style="color: red;"} test';

    // Simulate the normalization
    const normalizeFunc = (content: string) => {
      return content.replace(/\\(\[([^\]]+)\]\{[^}]+\})/g, '$1');
    };

    const normalizedOriginal = normalizeFunc(original);
    const normalizedUpdated = normalizeFunc(updated);

    console.log('Original:', original);
    console.log('Updated:', updated);
    console.log('Normalized original:', normalizedOriginal);
    console.log('Normalized updated:', normalizedUpdated);

    // After normalization, the bracket should be the same
    expect(normalizedOriginal).toBe('[Red text]{style="color: red;"}');
    expect(normalizedUpdated).toBe('[Red text]{style="color: red;"} test');

    // Now compute the diff on normalized versions
    const changes = generateChanges(normalizedOriginal, normalizedUpdated);

    console.log('Changes:', changes);

    // Should only detect the " test" addition, not the bracket change
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('addition');
    expect(changes[0].text).toBe(' test');
  });
});
