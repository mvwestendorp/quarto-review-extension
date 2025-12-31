/**
 * Test for deletion of first item in a list
 */

import { describe, it, expect } from 'vitest';
import { generateChanges, changesToCriticMarkup, changesToHtmlDiff } from '@/modules/changes/converters';

describe('List First Item Deletion', () => {
  it('should handle deletion of first list item correctly in CriticMarkup', () => {
    const original = `- *Italic text* using \`*text*\`
- **Bold text** using \`**text**\`
- ***Bold and italic text*** using \`***text***\``;

    const updated = `- **Bold text** using \`**text**\`
- Test
- ***Bold and italic text*** using \`***text***\``;

    console.log('\n=== ORIGINAL ===');
    console.log(JSON.stringify(original));

    console.log('\n=== UPDATED ===');
    console.log(JSON.stringify(updated));

    const changes = generateChanges(original, updated);
    const criticMarkup = changesToCriticMarkup(original, changes);

    console.log('\n=== CHANGES ===');
    console.log(JSON.stringify(changes, null, 2));

    console.log('\n=== CRITIC MARKUP ===');
    console.log(criticMarkup);

    // The closing delimiter should be on the same line as the deleted content
    expect(criticMarkup).not.toMatch(/\{--[^\}]*\n--\}/);

    // Should have deletion marker closed on same line
    expect(criticMarkup).toMatch(/\{--.*--\}/);

    // Check that the deletion doesn't include trailing newline inside the markup
    expect(criticMarkup).not.toContain('{--*Italic text*\n--}');
  });

  it('should handle deletion of first list item correctly in HTML', () => {
    const original = `- *Italic text* using \`*text*\`
- **Bold text** using \`**text**\`
- ***Bold and italic text*** using \`***text***\``;

    const updated = `- **Bold text** using \`**text**\`
- Test
- ***Bold and italic text*** using \`***text***\``;

    const changes = generateChanges(original, updated);
    const htmlDiff = changesToHtmlDiff(original, changes);

    console.log('\n=== HTML DIFF ===');
    console.log(htmlDiff);

    // List marker should be outside the <del> tag
    expect(htmlDiff).toMatch(/- <del[^>]*>.*<\/del>/);

    // Should NOT have newline inside <del> tag
    expect(htmlDiff).not.toMatch(/<del[^>]*>[^<]*\n[^<]*<\/del>/);

    // The deletion should not break the list structure
    // All items should still be list items starting with "- "
    const lines = htmlDiff.split('\n');
    const listItemLines = lines.filter(line => line.trim().startsWith('- '));
    console.log('\n=== LIST ITEM LINES ===');
    console.log('Count:', listItemLines.length);
    listItemLines.forEach((line, i) => {
      console.log(`Line ${i + 1}:`, line);
    });

    // Should have 3 list items (one deleted, one added, one unchanged)
    expect(listItemLines.length).toBeGreaterThanOrEqual(3);
  });
});
