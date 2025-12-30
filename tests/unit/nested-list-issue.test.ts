/**
 * Test for nested list diff issue
 * Reproduces the problem where adding an item to a nested list creates confusing diff output
 */

import { describe, it, expect } from 'vitest';
import { generateChanges, changesToHtmlDiff } from '@/modules/changes/converters';

describe('Nested List Diff Issue', () => {
  it('should handle adding item to deeply nested list', () => {
    const original = `-   First item
-   Second item
    -   Nested item 1
    -   Nested item 2
        -   Deeply nested item
-   Third item with **bold** and *italic* text
-   Item with [a link](https://quarto.org)`;

    const updated = `- First item
- Second item
  - Nested item 1
  - Nested item 2
    - Deeply nested item
    - Test
- Third item with **bold** and *italic* text
- Item with [a link](https://quarto.org)`;

    const changes = generateChanges(original, updated);
    const htmlDiff = changesToHtmlDiff(original, changes);

    console.log('\n=== ORIGINAL ===');
    console.log(original);
    console.log('\n=== UPDATED ===');
    console.log(updated);
    console.log('\n=== CHANGES ===');
    console.log(JSON.stringify(changes, null, 2));
    console.log('\n=== HTML DIFF ===');
    console.log(htmlDiff);

    // The diff should only show the added "- Test" line as an addition
    // It should NOT show other lines as changed when only whitespace differs
    expect(htmlDiff).toContain('Test');
  });

  it('should normalize list marker spacing consistently', () => {
    // Test that the normalization function handles both "-   " and "- " correctly
    const withExtraSpaces = `-   First item
-   Second item`;

    const withSingleSpace = `- First item
- Second item`;

    const changes = generateChanges(withExtraSpaces, withSingleSpace);

    // Should have no changes since they're semantically identical
    console.log('\n=== Normalization Test Changes ===');
    console.log(JSON.stringify(changes, null, 2));

    // After normalization, these should be considered identical
    expect(changes.length).toBe(0);
  });

  it('should only show actual content changes in nested lists', () => {
    const original = `- First item
- Second item
  - Nested item 1
  - Nested item 2
    - Deeply nested item`;

    const updated = `- First item
- Second item
  - Nested item 1
  - Nested item 2
    - Deeply nested item
    - Test`;

    const changes = generateChanges(original, updated);
    const htmlDiff = changesToHtmlDiff(original, changes);

    console.log('\n=== CLEAN TEST: ORIGINAL ===');
    console.log(original);
    console.log('\n=== CLEAN TEST: UPDATED ===');
    console.log(updated);
    console.log('\n=== CLEAN TEST: HTML DIFF ===');
    console.log(htmlDiff);

    // Should only show "- Test" as an addition
    expect(htmlDiff).toContain('<ins');
    expect(htmlDiff).toContain('Test');

    // Should NOT mark other lines as changed
    expect(htmlDiff).not.toContain('<del class="review-deletion" data-critic-type="deletion">    </del>');
  });
});
