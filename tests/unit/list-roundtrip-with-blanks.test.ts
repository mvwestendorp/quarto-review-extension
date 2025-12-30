/**
 * E2E test for list round-trip with blank lines (as sometimes produced by Pandoc)
 * Tests scenario where original has blank lines between items
 */

import { describe, it, expect } from 'vitest';
import { generateChanges, changesToHtmlDiff } from '@/modules/changes/converters';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('List Round-Trip with Blank Lines', () => {
  const fixturesDir = join(__dirname, '../fixtures/list-roundtrip-with-blanks');

  it('should not show blank lines as deletions when adding item', () => {
    // Original from Pandoc with blank lines
    const original = readFileSync(join(fixturesDir, 'original.md'), 'utf-8');
    // Edited: added "Test" item
    const edited = readFileSync(join(fixturesDir, 'edited.md'), 'utf-8');

    console.log('\n=== ORIGINAL (with blank lines) ===');
    console.log(JSON.stringify(original));

    console.log('\n=== EDITED (with blank lines) ===');
    console.log(JSON.stringify(edited));

    // Generate changes
    const changes = generateChanges(original, edited);

    console.log('\n=== CHANGES ===');
    console.log(JSON.stringify(changes, null, 2));

    // Generate HTML diff
    const htmlDiff = changesToHtmlDiff(original, changes);

    console.log('\n=== HTML DIFF ===');
    console.log(htmlDiff);

    // Verify the changes
    const additions = changes.filter(c => c.type === 'addition');
    const deletions = changes.filter(c => c.type === 'deletion');

    console.log('\n=== ADDITIONS ===');
    console.log(JSON.stringify(additions, null, 2));

    console.log('\n=== DELETIONS ===');
    console.log(JSON.stringify(deletions, null, 2));

    // Should only detect the addition of "Test"
    expect(additions).toHaveLength(1);
    expect(additions[0].text).toContain('Test');

    // Should NOT have any blank line deletions
    const blankLineDeletions = deletions.filter(d => d.text.trim() === '');
    console.log('\n=== BLANK LINE DELETIONS ===');
    console.log('Count:', blankLineDeletions.length);
    expect(blankLineDeletions).toHaveLength(0);

    // Should NOT have any deletions at all (blank lines are normalized away)
    expect(deletions).toHaveLength(0);

    // HTML diff should contain the expected markup
    expect(htmlDiff).toContain('<ins class="review-addition"');
    expect(htmlDiff).toContain('Test');

    // List marker should be outside the <ins> tag
    expect(htmlDiff).toMatch(/- <ins[^>]*>Test<\/ins>/);

    // Should NOT have any <del> tags
    expect(htmlDiff).not.toContain('<del');
  });

  it('should normalize blank lines consistently in both versions', () => {
    // Version with blank lines
    const withBlanks = `-   First item
-   Second item

    -   Nested item 1
    -   Nested item 2

-   Third item`;

    // Version without blank lines
    const withoutBlanks = `-   First item
-   Second item
    -   Nested item 1
    -   Nested item 2
-   Third item`;

    console.log('\n=== WITH BLANK LINES ===');
    console.log(JSON.stringify(withBlanks));

    console.log('\n=== WITHOUT BLANK LINES ===');
    console.log(JSON.stringify(withoutBlanks));

    // These should generate no changes after normalization
    const changes = generateChanges(withBlanks, withoutBlanks);

    console.log('\n=== CHANGES (should be empty) ===');
    console.log(JSON.stringify(changes, null, 2));

    // Should have NO changes - blank lines are just formatting noise
    expect(changes).toHaveLength(0);
  });
});
