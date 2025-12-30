/**
 * Test for the specific issue where empty <del> tags break list structure
 */

import { describe, it, expect } from 'vitest';
import { generateChanges, changesToHtmlDiff } from '@/modules/changes/converters';

describe('Nested List Empty Deletion Issue', () => {
  it('should not generate empty <del> tags that break list structure', () => {
    // Original from Pandoc - note the blank line before nested items
    const original = `-   First item
-   Second item

    -   Nested item 1
    -   Nested item 2

        -   Deeply nested item

-   Third item with **bold** and *italic* text
-   Item with [a link](https://quarto.org)`;

    // Updated: Added "Test" after deeply nested item
    const updated = `-   First item
-   Second item
    -   Nested item 1
    -   Nested item 2
        -   Deeply nested item
        -   Test
-   Third item with **bold** and *italic* text
-   Item with [a link](https://quarto.org)`;

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

    // Check for empty <del> tags
    const emptyDelTags = htmlDiff.match(/<del[^>]*>\s*<\/del>/g);
    console.log('\n=== EMPTY <del> TAGS ===');
    if (emptyDelTags) {
      console.log('Count:', emptyDelTags.length);
      emptyDelTags.forEach((tag, i) => {
        console.log(`Tag ${i + 1}:`, JSON.stringify(tag));
      });
    } else {
      console.log('None found');
    }

    // Should NOT have any empty <del> tags
    expect(emptyDelTags || []).toHaveLength(0);

    // Should have exactly one addition: "Test"
    const additions = changes.filter(c => c.type === 'addition');
    expect(additions).toHaveLength(1);
    expect(additions[0].text).toContain('Test');

    // Should NOT have any deletions (blank lines are normalized away)
    const deletions = changes.filter(c => c.type === 'deletion');
    expect(deletions).toHaveLength(0);
  });

  it('should handle the exact scenario from user report', () => {
    // This is the exact markdown that causes the issue
    const original = `-   First item
-   Second item

    -   Nested item 1
    -   Nested item 2

        -   Deeply nested item

-   Third item with **bold** and *italic* text`;

    // After adding Test
    const updated = `-   First item
-   Second item
    -   Nested item 1
    -   Nested item 2
        -   Deeply nested item
        -   Test
-   Third item with **bold** and *italic* text`;

    const changes = generateChanges(original, updated);
    const htmlDiff = changesToHtmlDiff(original, changes);

    console.log('\n=== USER SCENARIO: CHANGES ===');
    console.log(JSON.stringify(changes, null, 2));

    console.log('\n=== USER SCENARIO: HTML DIFF ===');
    console.log(htmlDiff);

    // Verify no empty deletions
    const deletions = changes.filter(c => c.type === 'deletion');
    console.log('\n=== DELETIONS ===');
    console.log(JSON.stringify(deletions, null, 2));

    expect(deletions).toHaveLength(0);
  });
});
