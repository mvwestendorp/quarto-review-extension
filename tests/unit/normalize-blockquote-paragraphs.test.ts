import { describe, it, expect } from 'vitest';
import { normalizeBlockquoteParagraphs } from '@modules/ui/shared/utils';

describe('normalizeBlockquoteParagraphs', () => {
  it('should convert blank lines between blockquote lines to ">" lines', () => {
    const input = `> First paragraph.

> Second paragraph.`;

    const expected = `> First paragraph.
>
> Second paragraph.`;

    expect(normalizeBlockquoteParagraphs(input)).toBe(expected);
  });

  it('should handle multiple blank lines between blockquotes', () => {
    // ALL blank lines between blockquotes get converted to ">"
    // The function looks forward/backward past blank lines to find blockquotes
    const input = `> Para 1.


> Para 2.`;

    const expected = `> Para 1.
>
>
> Para 2.`;

    expect(normalizeBlockquoteParagraphs(input)).toBe(expected);
  });

  it('should preserve blank lines outside blockquotes', () => {
    const input = `Regular text.

> Blockquote.

More regular text.`;

    const expected = `Regular text.

> Blockquote.

More regular text.`;

    expect(normalizeBlockquoteParagraphs(input)).toBe(expected);
  });

  it('should not modify blockquotes that already have ">" on blank lines', () => {
    const input = `> First paragraph.
>
> Second paragraph.`;

    expect(normalizeBlockquoteParagraphs(input)).toBe(input);
  });

  it('should skip fenced code blocks', () => {
    const input = `\`\`\`
> This should not be modified

> Because it's in a fence
\`\`\`

> Real blockquote.

> Real blockquote continued.`;

    const expected = `\`\`\`
> This should not be modified

> Because it's in a fence
\`\`\`

> Real blockquote.
>
> Real blockquote continued.`;

    expect(normalizeBlockquoteParagraphs(input)).toBe(expected);
  });

  it('should skip tilde fenced code blocks', () => {
    const input = `~~~
> This should not be modified

> Because it's in a fence
~~~

> Real blockquote.

> Real blockquote continued.`;

    const expected = `~~~
> This should not be modified

> Because it's in a fence
~~~

> Real blockquote.
>
> Real blockquote continued.`;

    expect(normalizeBlockquoteParagraphs(input)).toBe(expected);
  });

  it('should handle blockquotes with indentation', () => {
    const input = `  > Indented blockquote.

  > Continued.`;

    const expected = `  > Indented blockquote.
>
  > Continued.`;

    expect(normalizeBlockquoteParagraphs(input)).toBe(expected);
  });

  it('should handle complex multi-paragraph blockquote from example', () => {
    const input = `> This is a blockquote. It can span multiple lines and contain other formatting.

> You can also have multiple paragraphs in a blockquote.`;

    const expected = `> This is a blockquote. It can span multiple lines and contain other formatting.
>
> You can also have multiple paragraphs in a blockquote.`;

    expect(normalizeBlockquoteParagraphs(input)).toBe(expected);
  });

  it('should not add ">" between blockquote and non-blockquote', () => {
    const input = `> Blockquote.

Not a blockquote.`;

    const expected = `> Blockquote.

Not a blockquote.`;

    expect(normalizeBlockquoteParagraphs(input)).toBe(expected);
  });

  it('should not add ">" before blockquote from non-blockquote', () => {
    const input = `Not a blockquote.

> Blockquote.`;

    const expected = `Not a blockquote.

> Blockquote.`;

    expect(normalizeBlockquoteParagraphs(input)).toBe(expected);
  });

  it('should handle empty string', () => {
    expect(normalizeBlockquoteParagraphs('')).toBe('');
  });

  it('should handle single blockquote line', () => {
    const input = '> Single line.';
    expect(normalizeBlockquoteParagraphs(input)).toBe(input);
  });

  it('should handle CRLF line endings', () => {
    const input = '> First paragraph.\r\n\r\n> Second paragraph.';
    const expected = '> First paragraph.\n>\n> Second paragraph.';

    expect(normalizeBlockquoteParagraphs(input)).toBe(expected);
  });
});
