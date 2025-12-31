/**
 * Test that stripCriticMarkup removes empty list items after accepting deletions
 */

import { describe, it, expect } from 'vitest';
import { stripCriticMarkup } from '@/modules/changes/converters';

describe('Strip CriticMarkup - Empty List Items', () => {
  it('should remove empty list items when accepting deletion of entire item', () => {
    const input = `- {--*Italic text* using \`*text*\`--}
- **Bold text** using \`**text**\`
- ***Bold and italic*** using \`***text***\``;

    const result = stripCriticMarkup(input, true);

    console.log('\n=== INPUT ===');
    console.log(input);

    console.log('\n=== RESULT (accept mode) ===');
    console.log(result);

    // Should NOT have empty list item
    expect(result).not.toMatch(/^-\s*$/m);

    // Should have 2 list items (first deleted, leaving 2)
    const listItems = result.match(/^- /gm);
    console.log('\n=== LIST ITEMS ===');
    console.log('Count:', listItems?.length || 0);
    expect(listItems).toHaveLength(2);

    // Should start with "- **Bold text**"
    expect(result.trim()).toMatch(/^- \*\*Bold text\*\*/);
  });

  it('should handle multiple deleted list items', () => {
    const input = `- {--First item--}
- Second item
- {--Third item--}
- Fourth item`;

    const result = stripCriticMarkup(input, true);

    console.log('\n=== INPUT (multiple deletions) ===');
    console.log(input);

    console.log('\n=== RESULT ===');
    console.log(result);

    // Should have 2 list items remaining
    const listItems = result.match(/^- /gm);
    expect(listItems).toHaveLength(2);

    // Should NOT have empty list items
    expect(result).not.toMatch(/^-\s*$/m);

    expect(result).toContain('Second item');
    expect(result).toContain('Fourth item');
    expect(result).not.toContain('First item');
    expect(result).not.toContain('Third item');
  });

  it('should handle nested list item deletion', () => {
    const input = `- First item
  - {--Nested item 1--}
  - Nested item 2
- Second item`;

    const result = stripCriticMarkup(input, true);

    console.log('\n=== INPUT (nested) ===');
    console.log(input);

    console.log('\n=== RESULT ===');
    console.log(result);

    // Should still have 2 top-level items
    const topLevelItems = result.match(/^- /gm);
    expect(topLevelItems).toHaveLength(2);

    // Should have 1 nested item (second one)
    const nestedItems = result.match(/^  - /gm);
    expect(nestedItems).toHaveLength(1);

    expect(result).toContain('Nested item 2');
    expect(result).not.toContain('Nested item 1');
  });

  it('should preserve list structure when rejecting deletions', () => {
    const input = `- {--*Italic text* using \`*text*\`--}
- **Bold text** using \`**text**\``;

    const result = stripCriticMarkup(input, false); // reject mode

    console.log('\n=== RESULT (reject mode) ===');
    console.log(result);

    // Should have 2 list items (deletion is kept)
    const listItems = result.match(/^- /gm);
    expect(listItems).toHaveLength(2);

    // Deletion content should be restored
    expect(result).toContain('*Italic text*');
  });
});
