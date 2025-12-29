/**
 * Test for Pandoc raw inline syntax handling
 *
 * Pandoc uses `content`{=format} for raw inline content
 * Example: `<mark>`{=html}text`</mark>`{=html}
 */

import { describe, it, expect } from 'vitest';
import { MarkdownModule } from '@modules/markdown';

describe('Pandoc Raw Inline Syntax', () => {
  const markdown = new MarkdownModule();

  it('should process raw HTML inline syntax', () => {
    const input = 'You can include raw HTML: `<mark>`{=html}highlighted text`</mark>`{=html}';
    const html = markdown.renderSync(input);

    console.log('Input:', input);
    console.log('Output:', html);

    // Should contain the actual <mark> tag, not the literal backtick syntax
    expect(html).toContain('<mark>highlighted text</mark>');

    // Should NOT contain the literal Pandoc syntax
    expect(html).not.toContain('`<mark>`{=html}');
    expect(html).not.toContain('{=html}');
  });

  it('should handle multiple raw inline elements', () => {
    const input = 'Text with `<span style="color: red">`{=html}red`</span>`{=html} and `<mark>`{=html}highlighted`</mark>`{=html}';
    const html = markdown.renderSync(input);

    expect(html).toContain('<span style="color: red">red</span>');
    expect(html).toContain('<mark>highlighted</mark>');
    expect(html).not.toContain('{=html}');
  });

  it('should work with raw inline followed by regular text', () => {
    const input = 'Before `<mark>`{=html}highlighted`</mark>`{=html} after';
    const html = markdown.renderSync(input);

    expect(html).toContain('<mark>highlighted</mark>');
    expect(html).toContain('Before');
    expect(html).toContain('after');
  });

  it('should handle raw inline in middle of sentence', () => {
    const input = 'This is `<em>`{=html}emphasized`</em>`{=html} text';
    const html = markdown.renderSync(input);

    expect(html).toContain('<em>emphasized</em>');
    expect(html).toContain('This is');
    expect(html).toContain('text');
  });

  it('should not affect regular inline code without raw attribute', () => {
    const input = 'Regular code: `console.log()` and more code';
    const html = markdown.renderSync(input);

    // Regular inline code should be wrapped in <code>
    expect(html).toContain('<code>console.log()</code>');
    expect(html).toContain('and more code');
  });
});
