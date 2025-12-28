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

    return line.replace(
      /^(\s*)[*+]\s+/,
      (_match, indent: string) => `${indent}- `
    );
  });

  return normalized.join('\n');
}

// Lazy-loaded Prettier instance
let prettierPromise: Promise<typeof import('prettier')> | null = null;

/**
 * Preload Prettier for faster formatting later
 * Call this during app initialization
 */
export function preloadPrettier(): void {
  if (!prettierPromise) {
    prettierPromise = import('prettier').catch((error) => {
      console.warn('Failed to preload Prettier:', error);
      return null;
    }) as Promise<typeof import('prettier')>;
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

    const prettier = await prettierPromise;
    if (!prettier) {
      // Prettier failed to load, return original
      return content;
    }

    const formatted = await prettier.format(content, {
      parser: 'markdown',
      // Prettier options optimized for Pandoc compatibility
      proseWrap: 'preserve', // Don't wrap prose (Pandoc does this differently)
      printWidth: 80,
      tabWidth: 4, // Match Pandoc's 4-space indentation
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
 * Normalize list indentation to Pandoc's 4-space standard
 *
 * Milkdown/GFM uses 2-3 space indentation for nested lists,
 * while Pandoc uses 4-space indentation. This function normalizes
 * indentation to match Pandoc's output.
 *
 * Algorithm:
 * 1. Detect list items and their indentation level
 * 2. Build indentation hierarchy (top-level = 0, nested = multiples of 4)
 * 3. Reindent each line to match the hierarchy
 *
 * Skips fenced code blocks to avoid touching sample snippets.
 */
export function normalizeListIndentation(content: string): string {
  const lines = content.split(/\r?\n/);
  let fenceDelimiter: string | null = null;
  const normalized: string[] = [];

  // Track indentation levels: map from detected indent to normalized indent
  const indentMap = new Map<number, number>();
  const indentLevels: number[] = []; // sorted array of detected indents

  // First pass: detect all indentation levels
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

    // Check if this is a list item line (fixed regex with proper grouping)
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s/);
    if (listMatch) {
      const indent = listMatch[1]?.length ?? 0;
      if (!indentLevels.includes(indent)) {
        indentLevels.push(indent);
      }
    }
  }

  // Sort indent levels and create mapping
  indentLevels.sort((a, b) => a - b);
  indentLevels.forEach((indent, index) => {
    indentMap.set(indent, index * 4);
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
      // Continuation line - check if it's indented content within a list
      const leadingSpaceMatch = line.match(/^(\s+)/);
      const currentIndent = leadingSpaceMatch?.[1]?.length ?? 0;

      if (currentIndent > 0 && indentLevels.length > 0) {
        // Find the appropriate list indentation level this content belongs to
        // Content should be indented 4 spaces from its parent list item
        let targetListIndent = 0;
        for (let i = indentLevels.length - 1; i >= 0; i--) {
          const level = indentLevels[i];
          if (level !== undefined && level < currentIndent) {
            targetListIndent = indentMap.get(level) ?? 0;
            break;
          }
        }

        // Add 4 spaces for list item content continuation
        const normalizedIndent = targetListIndent + 4;
        normalized.push(' '.repeat(normalizedIndent) + trimmed);
      } else {
        // Not list content, preserve as-is
        normalized.push(line);
      }
    }
  }

  return normalized.join('\n');
}
