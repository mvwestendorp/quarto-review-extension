/**
 * E2E test for list round-trip behavior using fixtures
 * Tests the complete flow: original → edited → diff → verify no corruption
 */

import { describe, it, expect } from 'vitest';
import { generateChanges, changesToHtmlDiff } from '@/modules/changes/converters';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('List Round-Trip Fixture Tests', () => {
  const fixturesDir = join(__dirname, '../fixtures/list-roundtrip');

  it('should correctly handle nested list with addition at deep level', () => {
    // Load fixtures
    const original = readFileSync(join(fixturesDir, 'original.md'), 'utf-8');
    const edited = readFileSync(join(fixturesDir, 'edited.md'), 'utf-8');
    const expectedDiff = readFileSync(join(fixturesDir, 'expected-diff.html'), 'utf-8').trim();

    console.log('\n=== ORIGINAL ===');
    console.log(JSON.stringify(original));

    console.log('\n=== EDITED ===');
    console.log(JSON.stringify(edited));

    // Generate changes
    const changes = generateChanges(original, edited);

    console.log('\n=== CHANGES ===');
    console.log(JSON.stringify(changes, null, 2));

    // Generate HTML diff
    const htmlDiff = changesToHtmlDiff(original, changes);

    console.log('\n=== HTML DIFF ===');
    console.log(htmlDiff);

    console.log('\n=== EXPECTED DIFF ===');
    console.log(expectedDiff);

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

    // Should NOT have any deletions at all (only an addition)
    expect(deletions).toHaveLength(0);

    // HTML diff should contain the expected markup
    expect(htmlDiff).toContain('<ins class="review-addition"');
    expect(htmlDiff).toContain('Test');

    // List marker should be outside the <ins> tag
    expect(htmlDiff).toMatch(/- <ins[^>]*>Test<\/ins>/);

    // Should NOT have any <del> tags
    expect(htmlDiff).not.toContain('<del');

    // Verify structure matches expected (allowing for minor whitespace differences)
    const normalizeWhitespace = (str: string) => str.replace(/\s+/g, ' ').trim();
    expect(normalizeWhitespace(htmlDiff)).toBe(normalizeWhitespace(expectedDiff));
  });

  it('should handle second edit cycle without corruption', () => {
    // Start with the edited version
    const firstEdit = readFileSync(join(fixturesDir, 'edited.md'), 'utf-8');

    // Simulate a second edit: add another item
    const secondEdit = firstEdit.replace(
      '        -   Test',
      '        -   Test\n        -   Another test'
    );

    console.log('\n=== FIRST EDIT (baseline) ===');
    console.log(JSON.stringify(firstEdit));

    console.log('\n=== SECOND EDIT ===');
    console.log(JSON.stringify(secondEdit));

    // Generate changes
    const changes = generateChanges(firstEdit, secondEdit);

    console.log('\n=== SECOND EDIT CHANGES ===');
    console.log(JSON.stringify(changes, null, 2));

    const htmlDiff = changesToHtmlDiff(firstEdit, changes);

    console.log('\n=== SECOND EDIT HTML DIFF ===');
    console.log(htmlDiff);

    // Should only detect the new addition
    const additions = changes.filter(c => c.type === 'addition');
    const deletions = changes.filter(c => c.type === 'deletion');

    expect(additions).toHaveLength(1);
    expect(additions[0].text).toContain('Another test');

    // Should NOT have deletions or blank line changes
    expect(deletions).toHaveLength(0);

    // Verify list structure is preserved
    expect(htmlDiff).toMatch(/- <ins[^>]*>Another test<\/ins>/);
  });
});
