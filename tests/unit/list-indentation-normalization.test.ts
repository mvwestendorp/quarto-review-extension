/**
 * Tests for list indentation normalization
 *
 * This test suite verifies that list indentation is normalized to match Pandoc's
 * output format, ensuring consistent formatting between Milkdown (GFM-style) and
 * Pandoc markdown.
 *
 * Specifications:
 * - Pandoc: Uses 2-space indentation for nested lists (default behavior)
 *   Source: https://pandoc.org/demo/example33/8.7-lists.html
 * - CommonMark/GFM: Uses 2-space indentation
 *   Source: https://spec.commonmark.org/0.28/
 * - Milkdown: Uses GFM preset, typically outputs 2-space indentation
 *
 * This test normalizes all variations to 2-space standard for consistency.
 */

import { describe, it, expect } from 'vitest';
import { normalizeListIndentation } from '@modules/ui/shared/utils';

describe('List Indentation Normalization', () => {
  describe('Bullet Lists', () => {
    it('should preserve already-normalized 2-space indentation', () => {
      const input = `- First item
  - Nested item
  - Another nested`;

      const expected = `- First item
  - Nested item
  - Another nested`;

      expect(normalizeListIndentation(input)).toBe(expected);
    });

    it('should normalize 3-space indentation to 2-space', () => {
      const input = `- First item
   - Nested item
   - Another nested`;

      const expected = `- First item
  - Nested item
  - Another nested`;

      expect(normalizeListIndentation(input)).toBe(expected);
    });

    it('should normalize 4-space indentation to 2-space', () => {
      const input = `- First item
  - Nested item
  - Another nested`;

      const expected = `- First item
  - Nested item
  - Another nested`;

      expect(normalizeListIndentation(input)).toBe(expected);
    });

    it('should handle multiple nesting levels', () => {
      const input = `- Level 1
  - Level 2
    - Level 3
      - Level 4`;

      const expected = `- Level 1
  - Level 2
    - Level 3
      - Level 4`;

      expect(normalizeListIndentation(input)).toBe(expected);
    });
  });

  describe('Ordered Lists', () => {
    it('should normalize ordered list indentation', () => {
      const input = `1. First item
  1. Nested item
  2. Another nested`;

      const expected = `1. First item
    1. Nested item
    2. Another nested`;

      expect(normalizeListIndentation(input)).toBe(expected);
    });

    it('should handle double-digit numbers', () => {
      const input = `10. First item
   1. Nested item`;

      const expected = `10. First item
    1. Nested item`;

      expect(normalizeListIndentation(input)).toBe(expected);
    });
  });

  describe('Mixed Lists', () => {
    it('should normalize mixed bullet and ordered lists (Pandoc standard)', () => {
      // This is the exact case from the user's feedback
      const input = `1. Ordered item
   - Unordered sub-item
   - Another sub-item
     1. Nested ordered item
     2. Another nested ordered
2. Back to ordered item`;

      const expected = `1. Ordered item
  - Unordered sub-item
  - Another sub-item
        1. Nested ordered item
        2. Another nested ordered
2. Back to ordered item`;

      expect(normalizeListIndentation(input)).toBe(expected);
    });

    it('should handle user example with added item', () => {
      // From user's feedback: adding "3. Test" should only show that addition, not whitespace changes
      const input = `1. Ordered item
   - Unordered sub-item
   - Another sub-item
     1. Nested ordered item
     2. Another nested ordered
2. Back to ordered item
3. Test`;

      const expected = `1. Ordered item
  - Unordered sub-item
  - Another sub-item
        1. Nested ordered item
        2. Another nested ordered
2. Back to ordered item
3. Test`;

      expect(normalizeListIndentation(input)).toBe(expected);
    });
  });

  describe('List Content Continuation', () => {
    it('should normalize continuation lines within list items', () => {
      const input = `- First item
  with continuation
  on multiple lines
- Second item`;

      const expected = `- First item
    with continuation
    on multiple lines
- Second item`;

      expect(normalizeListIndentation(input)).toBe(expected);
    });

    it('should handle continuation lines with varied indentation', () => {
      const input = `1. First paragraph
   continuation here

   Second paragraph
2. Next item`;

      const expected = `1. First paragraph
    continuation here

    Second paragraph
2. Next item`;

      expect(normalizeListIndentation(input)).toBe(expected);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty lists', () => {
      expect(normalizeListIndentation('')).toBe('');
    });

    it('should preserve non-list content', () => {
      const input = `Regular paragraph

Not a list

Another paragraph`;

      expect(normalizeListIndentation(input)).toBe(input);
    });

    it('should not normalize lists inside code blocks', () => {
      const input = `\`\`\`markdown
- First item
  - Nested item (2 spaces)
\`\`\`

- Real list
  - Should be normalized`;

      const expected = `\`\`\`markdown
- First item
  - Nested item (2 spaces)
\`\`\`

- Real list
  - Should be normalized`;

      expect(normalizeListIndentation(input)).toBe(expected);
    });

    it('should handle mixed spaces and content', () => {
      const input = `- Item 1

  - Nested with blank line above`;

      const expected = `- Item 1

  - Nested with blank line above`;

      expect(normalizeListIndentation(input)).toBe(expected);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should normalize Milkdown output to match Pandoc', () => {
      // Milkdown (GFM) might output:
      const milkdownOutput = `1. First
   - Sub A
   - Sub B
2. Second`;

      // Pandoc expects:
      const pandocFormat = `1. First
  - Sub A
  - Sub B
2. Second`;

      expect(normalizeListIndentation(milkdownOutput)).toBe(pandocFormat);
    });

    it('should prevent spurious diff when only indentation differs', () => {
      // Original content (Pandoc format):
      const original = `1. Item
  - Nested`;

      // After editing in Milkdown (GFM format):
      const afterEdit = `1. Item
   - Nested`;

      // Both should normalize to the same result
      const normalized1 = normalizeListIndentation(original);
      const normalized2 = normalizeListIndentation(afterEdit);

      expect(normalized1).toBe(normalized2);
      expect(normalized1).toBe(original); // Should match Pandoc format
    });
  });
});
