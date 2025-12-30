/**
 * Test for inserting item in the middle of a list
 */

import { describe, it, expect } from 'vitest';
import { generateChanges, changesToHtmlDiff } from '@/modules/changes/converters';

describe('List Insert in Middle', () => {
  it('should correctly detect inserting one item in middle of list', () => {
    // Original: 4 items with 3 spaces after marker
    const original = `-   Inline code: \`function_name()\` using backticks
-   [Link to Quarto](https://quarto.org)
-   [Link with title](https://quarto.org "Visit Quarto")
-   Automatic link: <https://quarto.org>`;

    // Updated: Added "Test123" between item 2 and 3, plus added "test" at end
    const updated = `- Inline code: \`function_name()\` using backticks
- [Link to Quarto](https://quarto.org)
- Test123
- [Link with title](https://quarto.org "Visit Quarto")
- Automatic link: <https://quarto.org>
- test`;

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

    // Should detect 2 additions: "Test123" and "test"
    expect(changes.filter(c => c.type === 'addition')).toHaveLength(2);

    // Both should be properly formatted as separate list items
    // The list markers should be outside the <ins> tags
    expect(htmlDiff).toContain('- <ins');
    expect(htmlDiff).toContain('Test123');
    expect(htmlDiff).toContain('test');

    // They should NOT be in the same <ins> tag
    const insBlocks = htmlDiff.match(/<ins class="review-addition"[^>]*>[\s\S]*?<\/ins>/g);
    console.log('\n=== INS BLOCKS ===');
    insBlocks?.forEach((block, i) => {
      console.log(`Block ${i + 1}:`, block);
    });

    // Should have 2 separate <ins> blocks
    expect(insBlocks).toHaveLength(2);
  });

  it('should handle the exact scenario from user report', () => {
    // From the "Edited Just now" example showing the issue
    const original = `-   Inline code: \`function_name()\` using backticks
-   [Link to Quarto](https://quarto.org)
-   [Link with title](https://quarto.org "Visit Quarto")
-   Automatic link: <https://quarto.org>`;

    // User added Test123 in middle, and test at end
    const updated = `- Inline code: \`function_name()\` using backticks

- [Link to Quarto](https://quarto.org)

- Test123

- [Link with title](https://quarto.org "Visit Quarto")

- Automatic link: <https://quarto.org>

- test`;

    console.log('\n=== USER SCENARIO: ORIGINAL ===');
    console.log(JSON.stringify(original));

    console.log('\n=== USER SCENARIO: UPDATED ===');
    console.log(JSON.stringify(updated));

    const changes = generateChanges(original, updated);

    console.log('\n=== USER SCENARIO: CHANGES ===');
    console.log(JSON.stringify(changes, null, 2));

    const htmlDiff = changesToHtmlDiff(original, changes);

    console.log('\n=== USER SCENARIO: HTML DIFF ===');
    console.log(htmlDiff);

    // The issue: "test" is being marked as added when combined with previous line
    // Let's see what's actually happening
    const insBlocks = htmlDiff.match(/<ins class="review-addition"[^>]*>[\s\S]*?<\/ins>/g);
    console.log('\n=== USER SCENARIO: INS BLOCKS ===');
    insBlocks?.forEach((block, i) => {
      console.log(`Block ${i + 1}:`, JSON.stringify(block));
    });
  });
});
