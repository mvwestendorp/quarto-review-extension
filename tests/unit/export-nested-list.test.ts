/**
 * Test for export duplication issue with nested lists
 */

import { describe, it, expect } from 'vitest';
import { generateChanges, changesToCriticMarkup } from '@/modules/changes/converters';

describe('Export Nested List Issue', () => {
  it('should not duplicate nested list items when exporting', () => {
    // Original markdown
    const original = `- First item
- Second item
  - Nested item 1
  - Nested item 2
    - Deeply nested item
- Third item`;

    // User edited "Nested item 1" to "Test"
    const updated = `- First item
- Second item
  - Test
  - Nested item 2
    - Deeply nested item
- Third item`;

    const changes = generateChanges(original, updated);
    const criticMarkup = changesToCriticMarkup(original, changes);

    console.log('\n=== ORIGINAL ===');
    console.log(original);

    console.log('\n=== UPDATED ===');
    console.log(updated);

    console.log('\n=== CRITIC MARKUP ===');
    console.log(criticMarkup);

    // The critic markup should show the change inline
    expect(criticMarkup).toContain('{--Nested item 1--}');
    expect(criticMarkup).toContain('{++Test++}');

    // Should NOT have duplicate "Nested item 1" appearing later
    const nestedItem1Count = (criticMarkup.match(/Nested item 1/g) || []).length;
    console.log('\n=== COUNT OF "Nested item 1" ===');
    console.log(nestedItem1Count);

    // Should appear once in deletion markup only
    expect(nestedItem1Count).toBe(1);
  });
});
