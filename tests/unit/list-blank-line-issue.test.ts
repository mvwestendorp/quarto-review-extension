/**
 * Test for the blank line issue in list diffs shown by the user
 * The problem is that ins/del tags are appearing BETWEEN list items
 * creating visual blank lines in the output
 */

import { describe, it, expect } from 'vitest';
import { generateChanges, changesToHtmlDiff } from '@/modules/changes/converters';

describe('List Blank Line Issue', () => {
  it('should not insert ins/del tags between list items', () => {
    // Original from user's example (4-space indents with extra marker spacing)
    const original = `-   First item
-   Second item

    -   Nested item 1
    -   Nested item 2

        -   Deeply nested item

-   Third item with **bold** and *italic* text
-   Item with [a link](https://quarto.org)`;

    // Updated (2-space indents, normal marker spacing, added "Test")
    const updated = `- First item

- Second item

  - Nested item 1

  - Nested item 2

    - Deeply nested item

- Third item with **bold** and *italic* text

- Item with [a link](https://quarto.org)

- Test`;

    console.log('\n=== ORIGINAL ===');
    console.log(JSON.stringify(original, null, 2));

    console.log('\n=== UPDATED ===');
    console.log(JSON.stringify(updated, null, 2));

    const changes = generateChanges(original, updated);

    console.log('\n=== CHANGES ===');
    console.log(JSON.stringify(changes, null, 2));

    const htmlDiff = changesToHtmlDiff(original, changes);

    console.log('\n=== HTML DIFF ===');
    console.log(htmlDiff);

    // The issue: ins/del tags appearing on their own lines between list items
    // Like: </del>- Item or <ins>\n</ins>- Item

    // Check for problematic patterns
    const insTagsOnOwnLine = htmlDiff.match(/\n<ins[^>]*>\s*\n<\/ins>\n/g);
    const delTagsOnOwnLine = htmlDiff.match(/\n<del[^>]*>\s*\n<\/del>\n/g);
    const insTagsBeforeListItem = htmlDiff.match(/<ins[^>]*>\s*\n<\/ins>-/g);
    const delTagsBeforeListItem = htmlDiff.match(/<del[^>]*>\s*\n<\/del>\s+-/g);

    console.log('\nProblematic patterns found:');
    console.log('Ins tags on own line:', insTagsOnOwnLine?.length || 0);
    console.log('Del tags on own line:', delTagsOnOwnLine?.length || 0);
    console.log('Ins tags before list item:', insTagsBeforeListItem?.length || 0);
    console.log('Del tags before list item:', delTagsBeforeListItem?.length || 0);

    // These should all be zero - no empty ins/del tags between list items
    expect(insTagsOnOwnLine || []).toHaveLength(0);
    expect(delTagsOnOwnLine || []).toHaveLength(0);
    expect(insTagsBeforeListItem || []).toHaveLength(0);
    expect(delTagsBeforeListItem || []).toHaveLength(0);
  });
});
