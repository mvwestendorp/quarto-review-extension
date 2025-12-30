/**
 * Test for nested list with blank lines being deleted
 */

import { describe, it, expect } from 'vitest';
import { generateChanges, changesToHtmlDiff } from '@/modules/changes/converters';

describe('Nested List Blank Line Handling', () => {
  it('should not mark blank lines between list items as deletions', () => {
    // Original: Has blank lines between items (from user report)
    const original = `-   First item
-   Second item

    -   Nested item 1
    -   Nested item 2

        -   Deeply nested item

-   Third item with **bold** and *italic* text
-   Item with [a link](https://quarto.org)`;

    // Updated: Added "Test" to deeply nested level, blank lines normalized
    const updated = `- First item

- Second item

  - Nested item 1

  - Nested item 2

    - Deeply nested item

    - Test

- Third item with **bold** and *italic* text

- Item with [a link](https://quarto.org)`;

    console.log('\n=== ORIGINAL ===');
    console.log(JSON.stringify(original));

    console.log('\n=== UPDATED ===');
    console.log(JSON.stringify(updated));

    const changes = generateChanges(original, updated);

    console.log('\n=== CHANGES ===');
    console.log(JSON.stringify(changes, null, 2));

    const htmlDiff = changesToHtmlDiff(original, changes);

    console.log('\n=== HTML DIFF ===');
    console.log(htmlDiff);

    // Should only detect the addition of "Test", not blank line deletions
    const deletions = changes.filter(c => c.type === 'deletion');
    console.log('\n=== DELETIONS ===');
    console.log(JSON.stringify(deletions, null, 2));

    // Check for blank line deletions
    const blankLineDeletions = deletions.filter(d => d.text.trim() === '');
    console.log('\n=== BLANK LINE DELETIONS ===');
    console.log('Count:', blankLineDeletions.length);

    // Should have NO blank line deletions
    expect(blankLineDeletions).toHaveLength(0);

    // Check the HTML for <del> tags with only whitespace
    const delTags = htmlDiff.match(/<del[^>]*>[\s\n]*<\/del>/g);
    console.log('\n=== DEL TAGS WITH ONLY WHITESPACE ===');
    console.log('Count:', delTags?.length || 0);
    if (delTags) {
      delTags.forEach((tag, i) => {
        console.log(`Tag ${i + 1}:`, JSON.stringify(tag));
      });
    }

    // Should have NO <del> tags with only whitespace
    expect(delTags || []).toHaveLength(0);
  });
});
