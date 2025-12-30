/**
 * Test that list detection doesn't incorrectly normalize non-list content
 */

import { describe, it, expect } from 'vitest';
import { generateChanges } from '@/modules/changes/converters';

describe('List Detection', () => {
  it('should not normalize paragraphs that contain dashes', () => {
    const original = 'This is a paragraph with - a dash in it.';
    const updated = 'This is a paragraph with - a dash and more in it.';

    const changes = generateChanges(original, updated);

    // Should detect the actual change (adding "and more ")
    expect(changes.length).toBeGreaterThan(0);
    expect(changes.some(c => c.text.includes('and more'))).toBe(true);
  });

  it('should normalize actual lists', () => {
    const original = `-   Item 1
-   Item 2`;

    const updated = `- Item 1
- Item 2`;

    const changes = generateChanges(original, updated);

    // Should have no changes since they're semantically identical after normalization
    expect(changes.length).toBe(0);
  });

  it('should not treat email addresses as lists', () => {
    const original = 'Contact me at: user@example.com\n- Item 1\n- Item 2';
    const updated = 'Contact me at: user@example.com\n- Item 1 modified\n- Item 2';

    const changes = generateChanges(original, updated);

    // Should only detect the change in "Item 1"
    expect(changes.some(c => c.text.includes('modified'))).toBe(true);
  });

  it('should handle mixed content with list in middle', () => {
    const original = `Some text here.

- List item 1
- List item 2

More text below.`;

    const updated = `Some text here.

- List item 1 changed
- List item 2

More text below.`;

    const changes = generateChanges(original, updated);

    // Should detect the change
    expect(changes.some(c => c.text.includes('changed'))).toBe(true);
  });

  it('should handle content that is mostly list items', () => {
    const original = `Title
-   First
-   Second
-   Third`;

    const updated = `Title
- First
- Second
- Third`;

    const changes = generateChanges(original, updated);

    // Since 75% of lines are list items, should normalize
    expect(changes.length).toBe(0);
  });

  it('should not normalize content that is mostly non-list', () => {
    const original = `Paragraph one
Paragraph two
- Just one list item
Paragraph three
Paragraph four`;

    const updated = `Paragraph one changed
Paragraph two
- Just one list item
Paragraph three
Paragraph four`;

    const changes = generateChanges(original, updated);

    // Since only 20% are list items, shouldn't apply list-specific normalization
    // But should still detect the actual content change
    expect(changes.length).toBeGreaterThan(0);
    expect(changes.some(c => c.text.includes('changed'))).toBe(true);
  });
});
