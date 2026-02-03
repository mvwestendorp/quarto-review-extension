/**
 * Shared UI Utilities
 *
 * Common utility functions used across the UI module, including:
 * - HTML escaping and sanitization
 * - String trimming and normalization
 * - Markdown list marker normalization
 *
 * Extracted from index.ts to reduce code duplication and improve maintainability.
 */

/**
 * Escape HTML special characters to prevent XSS
 * Uses the DOM to properly handle all edge cases
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Check if a character is whitespace (space, tab, CR, LF)
 */
export function isWhitespaceChar(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\r' || char === '\n';
}

/**
 * Trim whitespace from the end of a string without using String.trimEnd()
 * for precise control over what constitutes "whitespace"
 */
export function trimLineEnd(text: string): string {
  let end = text.length;
  while (end > 0 && isWhitespaceChar(text.charAt(end - 1))) {
    end--;
  }
  return text.slice(0, end);
}

/**
 * Trim whitespace from the start of a string without using String.trimStart()
 * for precise control over what constitutes "whitespace"
 */
export function trimLineStart(text: string): string {
  let start = 0;
  while (start < text.length && isWhitespaceChar(text.charAt(start))) {
    start++;
  }
  return text.slice(start);
}

/**
 * Check if a line is a Setext underline (markdown H1/H2 syntax)
 * Setext underlines are lines of `=` or `-` characters
 */
export function isSetextUnderline(line: string): boolean {
  if (!line) {
    return false;
  }
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return false;
  }
  const firstChar = trimmed.charAt(0);
  if (firstChar !== '=' && firstChar !== '-') {
    return false;
  }
  for (let i = 1; i < trimmed.length; i++) {
    if (trimmed.charAt(i) !== firstChar) {
      return false;
    }
  }
  return true;
}

/**
 * Fix multi-paragraph blockquotes from Milkdown
 *
 * Milkdown sometimes serializes multi-paragraph blockquotes with blank lines
 * between paragraphs, which causes Pandoc to split them into separate blockquotes.
 * This function ensures blank lines within blockquotes have the `>` marker.
 *
 * Example:
 * Input:  "> Para 1\n\n> Para 2"  (two separate blockquotes)
 * Output: "> Para 1\n>\n> Para 2" (one blockquote with two paragraphs)
 */
export function normalizeBlockquoteParagraphs(content: string): string {
  const lines = content.split(/\r?\n/);
  let fenceDelimiter: string | null = null;
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || '';
    const trimmed = line.trim();

    // Track fence blocks to skip them
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    const delimiter = fenceMatch?.[1] ?? null;

    if (delimiter) {
      if (!fenceDelimiter) {
        fenceDelimiter = delimiter;
      } else if (fenceDelimiter && trimmed.startsWith(fenceDelimiter)) {
        fenceDelimiter = null;
      }
      result.push(line);
      continue;
    }

    if (fenceDelimiter) {
      result.push(line);
      continue;
    }

    // Check if this is a blank line between blockquote lines
    const currentIsBlank = trimmed === '';

    if (currentIsBlank) {
      // Look backwards to find the last non-blank line
      let prevBlockquoteIndex = -1;
      for (let j = i - 1; j >= 0; j--) {
        const prevLine = lines[j] || '';
        const prevTrimmed = prevLine.trim();
        if (prevTrimmed !== '') {
          if (/^\s*>/.test(prevLine)) {
            prevBlockquoteIndex = j;
          }
          break;
        }
      }

      // Look forwards to find the next non-blank line
      let nextBlockquoteIndex = -1;
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j] || '';
        const nextTrimmed = nextLine.trim();
        if (nextTrimmed !== '') {
          if (/^\s*>/.test(nextLine)) {
            nextBlockquoteIndex = j;
          }
          break;
        }
      }

      // If blank line is between two blockquotes, convert to ">"
      if (prevBlockquoteIndex !== -1 && nextBlockquoteIndex !== -1) {
        result.push('>');
      } else {
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

/**
 * Normalize markdown list markers
 *
 * Converts Milkdown output (`*`/`+`) to canonical `-` format.
 * Skips fenced code blocks to avoid touching sample snippets.
 *
 * This is useful for ensuring consistent markdown output across different editors.
 */
export function normalizeListMarkers(content: string): string {
  const lines = content.split(/\r?\n/);
  let fenceDelimiter: string | null = null;
  let listCounter = 1; // Track numeric counter for alphabetic markers
  let lastIndent = -1; // Track indentation level to reset counter

  const normalized = lines.map((line) => {
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    const delimiter = fenceMatch?.[1] ?? null;

    if (delimiter) {
      if (!fenceDelimiter) {
        fenceDelimiter = delimiter;
      } else if (fenceDelimiter && trimmed.startsWith(fenceDelimiter)) {
        fenceDelimiter = null;
      }
      return line;
    }

    if (fenceDelimiter) {
      return line;
    }

    // Normalize bullet list markers (* and + to -)
    let normalized = line.replace(
      /^(\s*)[*+]\s+/,
      (_match, indent: string) => `${indent}- `
    );

    // Normalize alphabetic ordered list markers (a., b., c., etc. to 1., 2., 3., etc.)
    // This is needed because Pandoc supports alphabetic markers but CommonMark/GFM only supports numeric
    const alphaMatch = normalized.match(/^(\s*)([a-z])\.\s+/i);
    if (alphaMatch) {
      const indent = alphaMatch[1] ?? '';
      const currentIndent = indent.length;

      // Reset counter when indentation changes (different nesting level)
      if (currentIndent !== lastIndent) {
        listCounter = 1;
        lastIndent = currentIndent;
      }

      // Replace alphabetic marker with numeric
      normalized = normalized.replace(
        /^(\s*)[a-z]\.\s+/i,
        `${indent}${listCounter}. `
      );
      listCounter++;
    } else {
      // Check if this is a numeric list item at a different level
      const numericMatch = normalized.match(/^(\s*)\d+\.\s+/);
      if (numericMatch) {
        const currentIndent = (numericMatch[1] ?? '').length;
        if (currentIndent !== lastIndent) {
          listCounter = 1;
          lastIndent = currentIndent;
        }
      } else if (trimmed === '') {
        // Blank lines reset the list counter
        listCounter = 1;
        lastIndent = -1;
      }
    }

    return normalized;
  });

  return normalized.join('\n');
}

// Lazy-loaded Prettier instance and plugins
let prettierPromise: Promise<{
  prettier: typeof import('prettier');
  parserMarkdown: any;
} | null> | null = null;

/**
 * Preload Prettier for faster formatting later
 * Call this during app initialization
 */
export function preloadPrettier(): void {
  if (!prettierPromise) {
    prettierPromise = Promise.all([
      import('prettier'),
      import('prettier/plugins/markdown'),
    ])
      .then(([prettier, parserMarkdown]) => ({
        prettier,
        parserMarkdown,
      }))
      .catch((error) => {
        console.warn('Failed to preload Prettier:', error);
        return null;
      });
  }
}

/**
 * Format markdown using Prettier
 *
 * This fixes various formatting issues from Milkdown's markdown serialization,
 * including:
 * - Missing line breaks between list items (Milkdown Issue #343)
 * - Inconsistent indentation
 * - Whitespace normalization
 *
 * Uses Prettier's markdown parser with options optimized for Pandoc compatibility.
 *
 * Reference: https://github.com/Milkdown/milkdown/issues/343
 *
 * @param content - Raw markdown content from editor
 * @returns Formatted markdown content
 */
export async function formatMarkdownWithPrettier(
  content: string
): Promise<string> {
  try {
    if (!prettierPromise) {
      preloadPrettier();
    }

    const result = await prettierPromise;
    if (!result) {
      // Prettier failed to load, return original
      return content;
    }

    const { prettier, parserMarkdown } = result;

    const formatted = await prettier.format(content, {
      parser: 'markdown',
      plugins: [parserMarkdown],
      // Prettier options optimized for Pandoc compatibility
      proseWrap: 'preserve', // Don't wrap prose (Pandoc does this differently)
      printWidth: 80,
      tabWidth: 2, // Match Pandoc's 2-space list indentation
      useTabs: false,
      singleQuote: false,
      endOfLine: 'lf',
    });

    return formatted;
  } catch (error) {
    // If Prettier fails, return original content
    console.warn('Failed to format markdown with Prettier:', error);
    return content;
  }
}

/**
 * Normalize list indentation to 2-space standard
 *
 * Milkdown/GFM and Pandoc both use 2-space indentation for nested lists.
 * This function normalizes indentation to match this standard.
 *
 * Algorithm:
 * 1. Detect list items and their indentation level
 * 2. Build indentation hierarchy (top-level = 0, nested = multiples of 2)
 * 3. Reindent each line to match the hierarchy
 *
 * Skips fenced code blocks to avoid touching sample snippets.
 */
export function normalizeListIndentation(content: string): string {
  const lines = content.split(/\r?\n/);
  let fenceDelimiter: string | null = null;
  const normalized: string[] = [];

  // Track list hierarchy: map from detected indent to {normalized indent, marker type}
  interface ListLevel {
    originalIndent: number;
    normalizedIndent: number;
    markerType: 'bullet' | 'ordered';
    markerWidth: number; // Width of "- " or "1. " etc
  }

  const listLevels: ListLevel[] = [];
  const indentMap = new Map<number, number>();

  // First pass: detect all list levels and build hierarchy
  for (const line of lines) {
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    const delimiter = fenceMatch?.[1] ?? null;

    if (delimiter) {
      if (!fenceDelimiter) {
        fenceDelimiter = delimiter;
      } else if (fenceDelimiter && trimmed.startsWith(fenceDelimiter)) {
        fenceDelimiter = null;
      }
      continue;
    }

    if (fenceDelimiter) {
      continue;
    }

    // Check if this is a list item line
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s/);
    if (listMatch) {
      const originalIndent = listMatch[1]?.length ?? 0;
      const marker = listMatch[2] ?? '';
      const markerType = marker.match(/\d+\./) ? 'ordered' : 'bullet';

      // Don't add duplicate indents
      if (!listLevels.some((l) => l.originalIndent === originalIndent)) {
        listLevels.push({
          originalIndent,
          normalizedIndent: 0, // Will be calculated next
          markerType,
          markerWidth: marker.length, // Width of "- " or "1. " (marker itself)
        });
      }
    }
  }

  // Sort by original indentation
  listLevels.sort((a, b) => a.originalIndent - b.originalIndent);

  // Calculate normalized indentation using cumulative parent-based approach
  // Standard: Use 2 spaces per nesting level
  // Exception: Ordered parent adds 4 spaces (for Remark compatibility with "1. " markers)
  // Reference: https://github.com/remarkjs/remark-parse#list-item-indentation
  //
  // This creates patterns like:
  // - Bullet → Bullet: 0 → 2 → 4 → 6 (always +2)
  // - Ordered → Ordered: 0 → 4 → 8 → 12 (always +4)
  // - Ordered → Bullet: 0 → 2 (ordered parent adds 2 for bullets)
  // - Bullet → Ordered: 0 → 2 → 8 (bullet adds 2, then ordered under bullet needs alignment)
  listLevels.forEach((level, index) => {
    if (index === 0) {
      level.normalizedIndent = 0;
    } else {
      const parent = listLevels[index - 1];
      if (parent) {
        // Parent type and child type both determine increment
        if (parent.markerType === 'ordered') {
          if (level.markerType === 'ordered') {
            // Ordered under ordered: add 4
            level.normalizedIndent = parent.normalizedIndent + 4;
          } else {
            // Bullet under ordered: add 2
            level.normalizedIndent = parent.normalizedIndent + 2;
          }
        } else {
          // Bullet parent
          if (level.markerType === 'ordered') {
            // Ordered under bullet: add 6 for proper alignment
            level.normalizedIndent = parent.normalizedIndent + 6;
          } else {
            // Bullet under bullet: add 2
            level.normalizedIndent = parent.normalizedIndent + 2;
          }
        }
      } else {
        level.normalizedIndent = 0;
      }
    }
    indentMap.set(level.originalIndent, level.normalizedIndent);
  });

  // Reset fence tracking for second pass
  fenceDelimiter = null;

  // Second pass: normalize indentation
  for (const line of lines) {
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    const delimiter = fenceMatch?.[1] ?? null;

    if (delimiter) {
      if (!fenceDelimiter) {
        fenceDelimiter = delimiter;
      } else if (fenceDelimiter && trimmed.startsWith(fenceDelimiter)) {
        fenceDelimiter = null;
      }
      normalized.push(line);
      continue;
    }

    if (fenceDelimiter) {
      normalized.push(line);
      continue;
    }

    // Check if this is a list item line
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s/);
    if (listMatch) {
      const currentIndent = listMatch[1]?.length ?? 0;
      const normalizedIndent = indentMap.get(currentIndent) ?? 0;
      const marker = listMatch[2];
      const rest = line.slice(listMatch[0].length);
      normalized.push(' '.repeat(normalizedIndent) + marker + ' ' + rest);
    } else if (trimmed.length === 0) {
      // Preserve blank lines as-is
      normalized.push(line);
    } else {
      // Continuation line - find which list level it belongs to
      const leadingSpaceMatch = line.match(/^(\s+)/);
      const currentIndent = leadingSpaceMatch?.[1]?.length ?? 0;

      if (currentIndent > 0 && listLevels.length > 0) {
        // Find the deepest list level that this content is nested under
        let parentLevel: ListLevel | null = null;
        for (let i = listLevels.length - 1; i >= 0; i--) {
          const level = listLevels[i];
          if (level && level.originalIndent < currentIndent) {
            parentLevel = level;
            break;
          }
        }

        if (parentLevel) {
          // Continuation lines use simple rule: parent indent + 4 spaces
          // This aligns with Pandoc standard for list continuation
          // "- Text" at indent 0 → continuation at 4
          // "1. Text" at indent 0 → continuation at 4
          const continuationIndent = parentLevel.normalizedIndent + 4;
          normalized.push(' '.repeat(continuationIndent) + trimmed);
        } else {
          // Not under any list, preserve as-is
          normalized.push(line);
        }
      } else {
        // Not list content, preserve as-is
        normalized.push(line);
      }
    }
  }

  return normalized.join('\n');
}
