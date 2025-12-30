/**
 * Test for the list rendering issue shown by the user
 */

import { describe, it, expect } from 'vitest';
import { generateChanges, changesToHtmlDiff } from '@/modules/changes/converters';

describe('List Rendering Issue', () => {
  it('should not create phantom newline changes in lists', () => {
    // This is the original list from the user's example
    const original = `-   First item
-   Second item
    -   Nested item 1
    -   Nested item 2
        -   Deeply nested item
-   Third item with **bold** and *italic* text
-   Item with [a link](https://quarto.org)`;

    // User added "Test" to the deeply nested level
    const updated = `- First item
- Second item
  - Nested item 1
  - Nested item 2
    - Deeply nested item
    - Test
- Third item with **bold** and *italic* text
- Item with [a link](https://quarto.org)`;

    console.log('\n=== ORIGINAL ===');
    console.log(original);

    console.log('\n=== UPDATED ===');
    console.log(updated);

    const changes = generateChanges(original, updated);

    console.log('\n=== CHANGES ===');
    console.log(JSON.stringify(changes, null, 2));

    const htmlDiff = changesToHtmlDiff(original, changes);

    console.log('\n=== HTML DIFF ===');
    console.log(htmlDiff);

    // Count how many <ins> tags contain only newlines
    const emptyInsTags = (htmlDiff.match(/<ins class="review-addition"[^>]*>\s*\n\s*<\/ins>/g) || []).length;
    const emptyDelTags = (htmlDiff.match(/<del class="review-deletion"[^>]*>\s*\n\s*<\/del>/g) || []).length;

    console.log(`\nEmpty <ins> tags with just newlines: ${emptyInsTags}`);
    console.log(`Empty <del> tags with just newlines: ${emptyDelTags}`);

    // The diff should not have empty ins/del tags with just newlines
    // These break Pandoc's markdown parser
    expect(emptyInsTags).toBe(0);
    expect(emptyDelTags).toBe(0);

    // The diff should only contain the actual change (adding "Test")
    expect(htmlDiff).toContain('Test');
    expect(changes.length).toBe(1); // Should be exactly 1 change
  });
});
