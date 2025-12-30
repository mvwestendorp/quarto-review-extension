/**
 * Test for list roundtrip issues where editing causes structure corruption
 */

import { describe, it, expect } from 'vitest';
import { generateChanges, changesToHtmlDiff } from '@/modules/changes/converters';

describe('List Roundtrip Issues', () => {
  it('should preserve list structure when editing a nested item', () => {
    const original = `-   First item
-   Second item
    -   Nested item 1
    -   Nested item 2
        -   Deeply nested item
-   Third item with **bold** and *italic* text
-   Item with [a link](https://quarto.org)`;

    // User edits "Deeply nested item" to add "Test" at the end
    const updated = `-   First item
-   Second item
    -   Nested item 1
    -   Nested item 2
        -   Deeply nested item Test
-   Third item with **bold** and *italic* text
-   Item with [a link](https://quarto.org)`;

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

    // The HTML diff should preserve the list structure
    // It should NOT change the indentation levels of other items
    expect(htmlDiff).toContain('- First item');
    expect(htmlDiff).toContain('- Second item');
    expect(htmlDiff).toContain('  - Nested item 1');
    expect(htmlDiff).toContain('  - Nested item 2');
    expect(htmlDiff).toContain('    - Deeply nested item');
    expect(htmlDiff).toContain('- Third item');
    expect(htmlDiff).toContain('- Item with');

    // Should only show the "Test" addition
    expect(htmlDiff).toContain('Test');
  });

  it('should handle adding a new nested item without merging items', () => {
    const original = `-   First item
-   Second item
    -   Nested item 1
    -   Nested item 2
        -   Deeply nested item
-   Third item with **bold** and *italic* text
-   Item with [a link](https://quarto.org)`;

    // User adds a new item at the deeply nested level
    const updated = `-   First item
-   Second item
    -   Nested item 1
    -   Nested item 2
        -   Deeply nested item
        -   Test2
-   Third item with **bold** and *italic* text
-   Item with [a link](https://quarto.org)`;

    console.log('\n=== ADD ITEM: ORIGINAL ===');
    console.log(original);

    console.log('\n=== ADD ITEM: UPDATED ===');
    console.log(updated);

    const changes = generateChanges(original, updated);

    console.log('\n=== ADD ITEM: CHANGES ===');
    console.log(JSON.stringify(changes, null, 2));

    const htmlDiff = changesToHtmlDiff(original, changes);

    console.log('\n=== ADD ITEM: HTML DIFF ===');
    console.log(htmlDiff);

    // Should not merge different items together
    expect(htmlDiff).not.toMatch(/Test2.*Third item/);

    // Each item should be on its own line
    const lines = htmlDiff.split('\n');
    const test2Line = lines.find(l => l.includes('Test2'));
    const thirdItemLine = lines.find(l => l.includes('Third item'));

    console.log('\n=== Line with Test2 ===');
    console.log(test2Line);
    console.log('\n=== Line with Third item ===');
    console.log(thirdItemLine);

    expect(test2Line).toBeDefined();
    expect(thirdItemLine).toBeDefined();
    expect(test2Line).not.toEqual(thirdItemLine);
  });

  it('should be stable on second save without changes', () => {
    // First edit: add "Test" to nested item
    const original = `-   First item
-   Second item
    -   Nested item 1
    -   Nested item 2
        -   Deeply nested item
-   Third item with **bold** and *italic* text
-   Item with [a link](https://quarto.org)`;

    const firstEdit = `-   First item
-   Second item
    -   Nested item 1
    -   Nested item 2
        -   Deeply nested item Test
-   Third item with **bold** and *italic* text
-   Item with [a link](https://quarto.org)`;

    const changes1 = generateChanges(original, firstEdit);
    const htmlDiff1 = changesToHtmlDiff(original, changes1);

    console.log('\n=== ROUNDTRIP: First HTML DIFF ===');
    console.log(htmlDiff1);

    // Second "edit": no actual changes, just re-save the same content
    const changes2 = generateChanges(firstEdit, firstEdit);

    console.log('\n=== ROUNDTRIP: Second edit changes (should be empty) ===');
    console.log(JSON.stringify(changes2, null, 2));

    // Should have no changes
    expect(changes2).toHaveLength(0);
  });
});
