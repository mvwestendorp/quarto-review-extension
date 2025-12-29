/**
 * Test for Pandoc attribute syntax handling
 *
 * Pandoc uses [text]{attributes} for inline spans with attributes
 * Example: [Red text]{style="color: red;"}
 * Example: [This text has a CSS class]{.highlight}
 */

import { describe, it, expect } from 'vitest';
import { MarkdownModule } from '@modules/markdown';

describe('Pandoc Attribute Syntax', () => {
  const markdown = new MarkdownModule();

  it('should process basic class attribute', () => {
    const input = '[This text has a CSS class]{.highlight}';
    const html = markdown.renderSync(input);

    console.log('Input:', input);
    console.log('Output:', html);

    // Should contain span with class
    expect(html).toContain('<span class="highlight">This text has a CSS class</span>');

    // Should NOT contain the literal Pandoc syntax
    expect(html).not.toContain('{.highlight}');
  });

  it('should process style attribute', () => {
    const input = '[Red text]{style="color: red;"}';
    const html = markdown.renderSync(input);

    expect(html).toContain('<span style="color: red;">Red text</span>');
    expect(html).not.toContain('{style=');
  });

  it('should process escaped bracket with style attribute', () => {
    const input = '\\[Red text]{style="color: red;"}';
    const html = markdown.renderSync(input);

    console.log('Input (escaped):', input);
    console.log('Output:', html);

    // Should still convert to span even with escaped bracket
    expect(html).toContain('<span style="color: red;">Red text</span>');
    expect(html).not.toContain('{style=');
    expect(html).not.toContain('\\[');
  });

  it('should handle escaped bracket with class attribute', () => {
    const input = '\\[This text has a CSS class]{.highlight}';
    const html = markdown.renderSync(input);

    expect(html).toContain('<span class="highlight">This text has a CSS class</span>');
    expect(html).not.toContain('{.highlight}');
    expect(html).not.toContain('\\[');
  });

  it('should process multiple attributes', () => {
    const input = '[Styled text]{.highlight #myid style="color: blue;"}';
    const html = markdown.renderSync(input);

    expect(html).toContain('class="highlight"');
    expect(html).toContain('id="myid"');
    expect(html).toContain('style="color: blue;"');
    expect(html).toContain('>Styled text</span>');
  });

  it('should handle escaped bracket in markdown source after edit', () => {
    // Simulating what happens after an edit: the opening [ gets escaped as \[
    const input = '\\[Red text]{style="color: red;"} test';
    const html = markdown.renderSync(input);

    console.log('Input (after edit):', input);
    console.log('Output:', html);

    // Should process the Pandoc attribute syntax correctly even with escaped bracket
    expect(html).toContain('<span style="color: red;">Red text</span>');
    expect(html).toContain('test');

    // Should NOT contain the literal backslash or curly braces
    expect(html).not.toContain('\\[');
    expect(html).not.toContain('{style=');
  });

  it('should not affect regular brackets without attributes', () => {
    const input = 'This is [a link](https://example.com) and more text';
    const html = markdown.renderSync(input);

    // Should render as a link
    expect(html).toContain('<a href="https://example.com">a link</a>');
    expect(html).toContain('and more text');
  });
});
