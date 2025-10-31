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
