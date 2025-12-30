/**
 * Test to understand what Prettier does to list formatting
 */

import { describe, it, expect } from 'vitest';
import prettier from 'prettier';

describe('Prettier List Formatting Behavior', () => {
  it('should show what Prettier does to nested lists', async () => {
    // Original from Pandoc (no blank lines, 4-space indent)
    const pandocOutput = `-   First item
-   Second item
    -   Nested item 1
    -   Nested item 2
        -   Deeply nested item
-   Third item with **bold** and *italic* text
-   Item with [a link](https://quarto.org)`;

    console.log('\n=== PANDOC OUTPUT (original) ===');
    console.log(JSON.stringify(pandocOutput));

    // Format with Prettier (our current settings)
    const formatted = await prettier.format(pandocOutput, {
      parser: 'markdown',
      proseWrap: 'preserve',
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      singleQuote: false,
      endOfLine: 'lf',
    });

    console.log('\n=== PRETTIER FORMATTED ===');
    console.log(JSON.stringify(formatted));

    console.log('\n=== PRETTIER FORMATTED (readable) ===');
    console.log(formatted);

    // Check if Prettier adds blank lines
    const hasBlankLines = formatted.includes('\n\n');
    console.log('\n=== PRETTIER ADDS BLANK LINES? ===');
    console.log(hasBlankLines ? 'YES' : 'NO');

    if (hasBlankLines) {
      const blankLineCount = (formatted.match(/\n\n/g) || []).length;
      console.log('Blank line count:', blankLineCount);
    }
  });

  it('should show what happens with GFM-style list (2-space, no blank lines)', async () => {
    // GFM-style input (2-space indent, no blank lines)
    const gfmInput = `- First item
- Second item
  - Nested item 1
  - Nested item 2
    - Deeply nested item
- Third item with **bold** and *italic* text
- Item with [a link](https://quarto.org)`;

    console.log('\n=== GFM INPUT (2-space, no blank lines) ===');
    console.log(JSON.stringify(gfmInput));

    // Format with Prettier
    const formatted = await prettier.format(gfmInput, {
      parser: 'markdown',
      proseWrap: 'preserve',
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      singleQuote: false,
      endOfLine: 'lf',
    });

    console.log('\n=== PRETTIER FORMATTED ===');
    console.log(JSON.stringify(formatted));

    console.log('\n=== PRETTIER FORMATTED (readable) ===');
    console.log(formatted);

    // Check if it matches the input
    const unchanged = formatted.trim() === gfmInput;
    console.log('\n=== PRETTIER LEAVES IT UNCHANGED? ===');
    console.log(unchanged ? 'YES' : 'NO');
  });
});
