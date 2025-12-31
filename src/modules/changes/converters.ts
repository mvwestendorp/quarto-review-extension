/**
 * Converters for tracking changes and CriticMarkup
 *
 * Architecture:
 * - Store changes as structured TextChange[] objects
 * - Convert to CriticMarkup for UI display
 * - Apply changes to produce clean markdown for Git export
 */

import * as Diff from 'diff';
import type { Change } from 'diff';
import type { TextChange } from '@/types';

/**
 * Detect the indent size used in a list (2 or 4 spaces per level).
 * Returns the most common indent increment found, defaulting to 2.
 */
function detectListIndentSize(lines: string[]): number {
  const indents: number[] = [];

  for (const line of lines) {
    const listMatch = line.match(/^(\s*)([-*+]|\d+[.)])\s/);
    if (listMatch) {
      const indentLength = listMatch[1]?.length ?? 0;
      if (indentLength > 0) {
        indents.push(indentLength);
      }
    }
  }

  if (indents.length === 0) {
    return 2; // Default to 2-space indent
  }

  // Find the minimum non-zero indent (this is likely the base indent size)
  const minIndent = Math.min(...indents);

  // Check if it's closer to 2 or 4
  if (minIndent >= 3) {
    return 4; // Likely using 4-space indents
  }
  return 2; // Using 2-space indents
}

/**
 * Check if content appears to be a list based on how many lines are list items.
 * Returns true if at least 50% of non-empty lines are list items.
 */
function isListContent(lines: string[]): boolean {
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  if (nonEmptyLines.length === 0) return false;

  const listItemCount = nonEmptyLines.filter((line) =>
    /^(\s*)([-*+]|\d+[.)])\s+/.test(line)
  ).length;

  // If at least 50% of non-empty lines are list items, treat as list
  return listItemCount >= nonEmptyLines.length * 0.5;
}

/**
 * Normalize list indentation to a consistent 2-space indent per level.
 * This prevents spurious diffs when comparing lists with different indent styles.
 * For example: "    - item" (4 spaces) vs "  - item" (2 spaces) are semantically identical.
 *
 * Also removes blank lines between list items to prevent formatting differences
 * from appearing as content changes.
 *
 * Only normalizes if the content appears to actually be a list.
 */
function normalizeListIndentation(lines: string[]): string[] {
  // First check if this is actually list content
  if (!isListContent(lines)) {
    // Not a list, just trim trailing whitespace
    return lines.map((line) => line.trimEnd());
  }

  const result: string[] = [];

  // Detect the indent size used in this content
  const indentSize = detectListIndentSize(lines);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) {
      continue;
    }

    // Match list items - ONLY at start of line (^)
    // Captures: (spaces)(marker)(space+)(content)
    const listMatch = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);

    if (listMatch) {
      const [, indent, marker, content] = listMatch;

      // Calculate indent level based on detected indent size
      // This converts both 2-space and 4-space indents to consistent 2-space
      const indentLength = indent?.length ?? 0;
      const level = Math.round(indentLength / indentSize);

      // Normalize to 2-space indent per level
      const normalizedIndent = '  '.repeat(level);

      // Trim trailing whitespace from content to normalize spurious spaces
      const lineContent = (content ?? '').trimEnd();

      // Rebuild line with normalized indent and single space after marker
      result.push(`${normalizedIndent}${marker} ${lineContent}`);
    } else if (line.trim() === '') {
      // Skip blank lines between list items to normalize formatting differences
      // Only preserve blank lines that separate list from non-list content
      const prevLine = i > 0 ? lines[i - 1] : null;
      const nextLine = i < lines.length - 1 ? lines[i + 1] : null;

      const prevIsListItem =
        prevLine && /^(\s*)([-*+]|\d+[.)])\s+/.test(prevLine);
      const nextIsListItem =
        nextLine && /^(\s*)([-*+]|\d+[.)])\s+/.test(nextLine);

      // Skip blank lines between list items (they're formatting noise)
      if (prevIsListItem && nextIsListItem) {
        continue;
      }

      // Preserve blank lines between list and non-list content
      result.push('');
    } else {
      // Not a list item, trim trailing whitespace to normalize
      result.push(line.trimEnd());
    }
  }

  return result;
}

/**
 * Normalize markdown whitespace to match CommonMark serialization.
 * This prevents false positives in diffs caused by:
 * - List marker spacing (e.g., "-   " → "- ")
 * - List indentation (e.g., "    -" → "  -" for nested items)
 * - Blockquote marker inconsistencies (e.g., " > " → "> ")
 * - Trailing whitespace
 * - Inconsistent line endings
 */
function normalizeMarkdownWhitespace(content: string): string {
  const lines = content.split(/\r?\n/);

  // Detect if this is a blockquote by checking if most lines start with >
  const blockquoteLineCount = lines.filter((line) => /^\s*>/.test(line)).length;
  const isBlockquote =
    blockquoteLineCount > 0 && blockquoteLineCount >= lines.length * 0.5;

  if (isBlockquote) {
    // Normalize blockquote: remove leading whitespace before >, normalize spacing
    return lines
      .map((line) => {
        // Remove leading whitespace before >
        const withoutLeadingSpace = line.replace(/^\s*>/, '>');
        // Remove lines that are just > with optional whitespace
        if (/^>\s*$/.test(withoutLeadingSpace)) {
          return '';
        }
        // Normalize spacing after > marker
        const normalized = withoutLeadingSpace.replace(/^>\s*/, '> ');
        // Remove trailing whitespace from blockquote lines
        return normalized.trimEnd();
      })
      .filter((line, index, arr) => {
        // Remove empty lines, but keep them if they're between content lines
        if (line === '') {
          const prevLine = arr[index - 1];
          const nextLine = arr[index + 1];
          return prevLine && nextLine && prevLine !== '' && nextLine !== '';
        }
        return true;
      })
      .join('\n');
  }

  // For non-blockquote content, normalize list markers, indentation, and trailing whitespace
  return normalizeListIndentation(lines).join('\n');
}

/**
 * Generate granular changes from old and new content for display purposes.
 * Normalizes whitespace in both inputs to avoid spurious diff markers.
 * Uses a line-level diff to preserve structural constructs like lists and tables.
 *
 * Note: Use `generateChangesForExport` when you need to preserve exact original formatting.
 */
export function generateChanges(
  oldContent: string,
  newContent: string
): TextChange[] {
  // Normalize both inputs to prevent whitespace-only differences
  const normalizedOld = normalizeMarkdownWhitespace(oldContent);
  const normalizedNew = normalizeMarkdownWhitespace(newContent);

  return generateChangesInternal(normalizedOld, normalizedNew);
}

/**
 * Generate granular changes preserving exact original formatting.
 * Use this for Git exports where original formatting must be maintained.
 */
export function generateChangesForExport(
  oldContent: string,
  newContent: string
): TextChange[] {
  return generateChangesInternal(oldContent, newContent);
}

/**
 * Internal implementation of change generation.
 * Uses a line-level diff to preserve structural constructs like lists and tables.
 */
function generateChangesInternal(
  oldContent: string,
  newContent: string
): TextChange[] {
  const changes: TextChange[] = [];
  const diffs = Diff.diffLines(oldContent, newContent);
  let position = 0;

  for (let i = 0; i < diffs.length; i++) {
    const part = diffs[i];
    if (!part) {
      continue;
    }
    const value = part.value ?? '';

    if (part.added) {
      changes.push({
        type: 'addition',
        position,
        length: value.length,
        text: value,
      });
      continue;
    }

    if (part.removed) {
      const next = diffs[i + 1];

      if (next && next.added) {
        const nextValue = next.value ?? '';
        const wordDiffs = Diff.diffWordsWithSpace(value, nextValue);
        let localPos = position;

        // Improved character-level diffing within word changes
        const skipIndexes = new Set<number>();

        wordDiffs.forEach((diff: Change, wordIndex: number) => {
          // Skip if this was already processed as part of a character-level diff
          if (skipIndexes.has(wordIndex)) {
            return;
          }

          if (diff.added) {
            changes.push({
              type: 'addition',
              position: localPos,
              length: diff.value.length,
              text: diff.value,
            });
          } else if (diff.removed) {
            // Check if next chunk is an addition (potential character-level substitution)
            const nextWordDiff = wordDiffs[wordIndex + 1];
            if (
              nextWordDiff &&
              nextWordDiff.added &&
              !nextWordDiff.value.startsWith(' ') &&
              !diff.value.endsWith(' ')
            ) {
              // Use character-level diffing for better granularity
              const charDiffs = Diff.diffChars(diff.value, nextWordDiff.value);
              let charPos = localPos;

              charDiffs.forEach((charDiff: Change) => {
                if (charDiff.added) {
                  changes.push({
                    type: 'addition',
                    position: charPos,
                    length: charDiff.value.length,
                    text: charDiff.value,
                  });
                } else if (charDiff.removed) {
                  changes.push({
                    type: 'deletion',
                    position: charPos,
                    length: charDiff.value.length,
                    text: charDiff.value,
                  });
                  charPos += charDiff.value.length;
                } else {
                  charPos += charDiff.value.length;
                }
              });

              localPos += diff.value.length;
              // Mark the paired addition as processed
              skipIndexes.add(wordIndex + 1);
            } else {
              // Regular word deletion
              changes.push({
                type: 'deletion',
                position: localPos,
                length: diff.value.length,
                text: diff.value,
              });
              localPos += diff.value.length;
            }
          } else {
            localPos += diff.value.length;
          }
        });

        position += value.length;
        i++; // skip paired addition
        continue;
      }

      changes.push({
        type: 'deletion',
        position,
        length: value.length,
        text: value,
      });
      position += value.length;
      continue;
    }

    position += value.length;
  }

  return changes;
}

/**
 * Apply changes to CriticMarkup syntax for UI display
 * Returns markdown with {++additions++} and {--deletions--}
 *
 * NOTE: Changes generated by `generateChanges()` are based on normalized content.
 * This function normalizes the oldContent to match before applying changes.
 */
export function changesToCriticMarkup(
  oldContent: string,
  changes: TextChange[]
): string {
  if (changes.length === 0) {
    return oldContent;
  }

  // Normalize oldContent to match the normalized content that changes are based on
  const normalizedOld = normalizeMarkdownWhitespace(oldContent);
  const newContent = applyChanges(normalizedOld, changes);
  const oldTokens = tokenizeMarkdown(normalizedOld);
  const newTokens = tokenizeMarkdown(newContent);
  const parts = Diff.diffArrays(oldTokens, newTokens);
  const result: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) {
      continue;
    }
    const partValue = Array.isArray(part.value) ? (part.value as string[]) : [];

    if (part.added) {
      partValue.forEach((token) => {
        result.push(formatBlock(token, 'addition'));
      });
      continue;
    }

    if (part.removed) {
      const next = parts[i + 1];
      if (next && next.added) {
        const nextValue = Array.isArray(next.value)
          ? (next.value as string[])
          : [];
        result.push(...formatBlockPair(partValue, nextValue));
        i++;
      } else {
        partValue.forEach((token) => {
          result.push(formatBlock(token, 'deletion'));
        });
      }
      continue;
    }

    result.push(...partValue);
  }

  return result.join('');
}

type ChangeKind = 'addition' | 'deletion';

function formatBlock(text: string, kind: ChangeKind): string {
  if (text.trim().length === 0) {
    return kind === 'addition' ? text : '';
  }

  return splitIntoLines(text)
    .map((line) => formatLine(line, kind))
    .join('');
}

function formatBlockPair(oldBlocks: string[], newBlocks: string[]): string[] {
  const result: string[] = [];
  const m = oldBlocks.length;
  const n = newBlocks.length;
  const oldMeta = oldBlocks.map((block) => ({
    block,
    normalized: normalizeBlock(block),
    signature: blockSignature(block),
  }));
  const newMeta = newBlocks.map((block) => ({
    block,
    normalized: normalizeBlock(block),
    signature: blockSignature(block),
  }));

  const lcs: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = m - 1; i >= 0; i--) {
    const currentRow = lcs[i] ?? (lcs[i] = Array(n + 1).fill(0));
    const nextRow = lcs[i + 1] ?? [];
    for (let j = n - 1; j >= 0; j--) {
      const oldEntry = oldMeta[i];
      const newEntry = newMeta[j];
      const diag = nextRow[j + 1] ?? 0;
      const down = nextRow[j] ?? 0;
      const right = currentRow[j + 1] ?? 0;
      if (
        oldEntry &&
        newEntry &&
        oldEntry.normalized === newEntry.normalized &&
        oldEntry.signature === newEntry.signature
      ) {
        currentRow[j] = 1 + diag;
      } else {
        currentRow[j] = Math.max(down, right);
      }
    }
  }

  let i = 0;
  let j = 0;

  while (i < m && j < n) {
    const oldEntry = oldMeta[i];
    const newEntry = newMeta[j];
    if (!oldEntry || !newEntry) {
      break;
    }

    if (
      oldEntry.normalized === newEntry.normalized &&
      oldEntry.signature === newEntry.signature
    ) {
      result.push(newEntry.block);
      i++;
      j++;
      continue;
    }

    const skipOld = lcs[i + 1]?.[j] ?? 0;
    const skipNew = lcs[i]?.[j + 1] ?? 0;

    if (skipOld === skipNew) {
      result.push(formatBlockSubstitution(oldEntry.block, newEntry.block));
      i++;
      j++;
    } else if (skipOld > skipNew) {
      result.push(formatBlock(oldEntry.block, 'deletion'));
      i++;
    } else {
      result.push(formatBlock(newEntry.block, 'addition'));
      j++;
    }
  }

  while (i < m) {
    const entry = oldMeta[i];
    if (entry) {
      result.push(formatBlock(entry.block, 'deletion'));
    }
    i++;
  }

  while (j < n) {
    const entry = newMeta[j];
    if (entry) {
      result.push(formatBlock(entry.block, 'addition'));
    }
    j++;
  }

  return result;
}

function formatBlockSubstitution(
  oldSegment: string,
  newSegment: string
): string {
  const oldLines = splitIntoLines(oldSegment);
  const newLines = splitIntoLines(newSegment);
  const max = Math.max(oldLines.length, newLines.length);
  const buffer: string[] = [];

  for (let index = 0; index < max; index++) {
    const oldLine = oldLines[index];
    const newLine = newLines[index];

    if (oldLine !== undefined && newLine !== undefined) {
      if (
        isListItemLine(oldLine) &&
        isListItemLine(newLine) &&
        normalizeListMarker(getListMarker(oldLine)) ===
          normalizeListMarker(getListMarker(newLine))
      ) {
        buffer.push(formatListLineChange(oldLine, newLine));
      } else if (isTableLine(oldLine) && isTableLine(newLine)) {
        buffer.push(formatTableLineChange(oldLine, newLine));
      } else {
        buffer.push(formatLineDiff(oldLine, newLine));
      }
    } else if (oldLine !== undefined) {
      buffer.push(formatLine(oldLine, 'deletion'));
    } else if (newLine !== undefined) {
      buffer.push(formatLine(newLine, 'addition'));
    }
  }

  return buffer.join('');
}

function formatLineDiff(oldLine: string, newLine: string): string {
  const { content: oldContent, newline: oldBreak } = splitLine(oldLine);
  const { content: newContent, newline: newBreak } = splitLine(newLine);

  const { prefix: oldPrefix, body: oldBody } = splitListPrefix(oldContent);
  const { prefix: newPrefix, body: newBody } = splitListPrefix(newContent);

  if (oldPrefix !== newPrefix) {
    return formatLine(oldLine, 'deletion') + formatLine(newLine, 'addition');
  }

  const diffs = Diff.diffWordsWithSpace(oldBody, newBody);
  let lineResult = oldPrefix;

  diffs.forEach((diff: Change) => {
    if (diff.added) {
      // If addition starts with space, put the space outside the markup
      if (diff.value.startsWith(' ') && diff.value.length > 1) {
        lineResult += ' ' + wrapWithMarkup(diff.value.slice(1), 'addition');
      } else {
        lineResult += wrapWithMarkup(diff.value, 'addition');
      }
    } else if (diff.removed) {
      // Keep deletions as-is (including trailing/leading spaces)
      lineResult += wrapWithMarkup(diff.value, 'deletion');
    } else {
      lineResult += diff.value;
    }
  });

  return `${lineResult}${newBreak || oldBreak}`;
}

function formatListLineChange(oldLine: string, newLine: string): string {
  const { content: oldContent, newline: oldNewline } = splitLine(oldLine);
  const { content: newContent, newline: newNewline } = splitLine(newLine);
  const newPrefix = splitListPrefix(newContent).prefix;
  const oldBody = splitListPrefix(oldContent).body;
  const newBody = splitListPrefix(newContent).body;

  if (normalizeBlock(oldContent) === normalizeBlock(newContent)) {
    return `${newContent}${newNewline || oldNewline}`;
  }

  // Use the new line's prefix (with proper spacing)
  const prefix = newPrefix;
  const newline = newNewline || oldNewline;

  const diffs = Diff.diffWordsWithSpace(oldBody, newBody);
  const hasAdditions = diffs.some((diff: Change) => diff.added);
  const hasDeletions = diffs.some((diff: Change) => diff.removed);
  const hasUnchanged = diffs.some(
    (diff: Change) =>
      !diff.added && !diff.removed && diff.value.trim().length > 0
  );

  if (hasAdditions && hasDeletions && !hasUnchanged) {
    return `${prefix}${wrapWithSubstitution(oldBody, newBody)}${newline}`;
  }

  let trimmedResult = '';

  diffs.forEach((diff: Change) => {
    if (diff.added) {
      // If addition starts with space, put the space outside the markup
      if (diff.value.startsWith(' ') && diff.value.length > 1) {
        trimmedResult += ' ' + wrapWithMarkup(diff.value.slice(1), 'addition');
      } else {
        trimmedResult += wrapWithMarkup(diff.value, 'addition');
      }
    } else if (diff.removed) {
      // Keep deletions as-is (including trailing/leading spaces)
      trimmedResult += wrapWithMarkup(diff.value, 'deletion');
    } else {
      trimmedResult += diff.value;
    }
  });

  const result = `${prefix}${trimmedResult}`;
  if (result.trim() === prefix.trim()) {
    return `${prefix}${wrapWithMarkup(newBody, 'addition')}${newline}`;
  }

  return `${result}${newline}`;
}

function formatTableLineChange(oldLine: string, newLine: string): string {
  const { content: oldContent, newline } = splitLine(oldLine);
  const { content: newContent } = splitLine(newLine);

  if (isAlignmentRow(oldContent) && isAlignmentRow(newContent)) {
    return `${newContent}${newline || ''}`;
  }

  const oldCells = oldContent.split('|');
  const newCells = newContent.split('|');
  const cellCount = Math.max(oldCells.length, newCells.length);
  const formattedCells: string[] = [];

  for (let i = 0; i < cellCount; i++) {
    const oldCell = oldCells[i] ?? '';
    const newCell = newCells[i] ?? '';

    if (i === 0 || i === cellCount - 1) {
      formattedCells.push(newCell || oldCell);
      continue;
    }

    formattedCells.push(formatTableCellChange(oldCell, newCell));
  }

  return `${formattedCells.join('|')}${newline || ''}`;
}

function formatLine(line: string, kind: ChangeKind): string {
  const { content, newline } = splitLine(line);
  if (!content.trim()) {
    return kind === 'addition' ? content + newline : newline;
  }

  const { prefix, body } = splitListPrefix(content);

  if (prefix) {
    // Keep list markers outside CriticMarkup so Markdown still recognizes the list
    // For deletions, keep marker outside so list structure is preserved
    if (kind === 'deletion') {
      // Marker outside, body inside markup, newline outside
      return `${prefix}${wrapWithMarkup(body, kind)}${newline}`;
    }

    // For additions, fall back to wrapping the full line when body is empty
    if (body.trim().length === 0) {
      const fullLine = `${prefix}${body}`;
      return `${wrapWithMarkup(fullLine, kind)}${newline}`;
    }

    return `${prefix}${wrapWithMarkup(body, kind)}${newline}`;
  }

  if (isTableLine(content)) {
    return formatTableLine('', content, kind) + newline;
  }

  return `${wrapWithMarkup(content, kind)}${newline}`;
}

function wrapWithMarkup(content: string, kind: ChangeKind): string {
  if (!content) return '';
  const text = content;
  if (!text.trim()) {
    return text;
  }
  return kind === 'addition' ? `{++${text}++}` : `{--${text}--}`;
}

function wrapWithSubstitution(oldContent: string, newContent: string): string {
  const oldText = oldContent.trim();
  const newText = newContent.trim();
  if (!oldText && !newText) {
    return newContent;
  }

  const leading = newContent.match(/^\s*/)?.[0] ?? '';
  const trailing = newContent.match(/\s*$/)?.[0] ?? '';

  return `${leading}{~~${oldText}~>${newText}~~}${trailing}`;
}

function formatTableCellChange(oldCell: string, newCell: string): string {
  const oldTrimmed = oldCell.trim();
  const newTrimmed = newCell.trim();

  if (oldTrimmed === newTrimmed) {
    return newCell || oldCell;
  }

  const leadingMatch = newCell.match(/^\s*/);
  const trailingMatch = newCell.match(/\s*$/);
  const leading: string = leadingMatch?.[0] ?? '';
  const trailing: string = trailingMatch?.[0] ?? '';

  const diffs = Diff.diffWordsWithSpace(oldTrimmed, newTrimmed);
  let result = '';

  diffs.forEach((diff: Change) => {
    const value = diff.value ?? '';
    if (diff.added) {
      result += wrapWithMarkup(value, 'addition');
    } else if (diff.removed) {
      result += wrapWithMarkup(value, 'deletion');
    } else {
      result += value;
    }
  });

  return `${leading}${result}${trailing}`;
}

function splitLine(line: string): { content: string; newline: string } {
  if (line.endsWith('\n')) {
    return { content: line.slice(0, -1), newline: '\n' };
  }
  return { content: line, newline: '' };
}

function splitListPrefix(content: string): { prefix: string; body: string } {
  const match = content.match(/^(\s*(?:[-*+]|\d+[.)])\s+)(.*)$/);
  if (match) {
    const [, prefixMatch = '', bodyMatch = ''] = match;
    return { prefix: prefixMatch, body: bodyMatch };
  }
  return { prefix: '', body: content };
}

function splitIntoLines(text: string): string[] {
  if (text === '') return [];
  return text.match(/[^\n]*\n?/g)?.filter((line) => line.length > 0) ?? [];
}

function getListMarker(line: string): string | null {
  const { content } = splitLine(line);
  const match = content.match(/^(\s*(?:[-*+]|\d+[.)])\s+)/);
  return match?.[0] ?? null;
}

function normalizeListMarker(marker: string | null): string | null {
  if (!marker) return null;
  // Normalize to single space after marker, preserve leading indent
  return marker.replace(/^(\s*)([-*+]|\d+[.)])\s+/, '$1$2 ');
}

function isTableLine(body: string): boolean {
  const trimmed = body.trim();
  if (!trimmed.includes('|')) return false;
  const pipeCount = (trimmed.match(/\|/g) || []).length;
  return pipeCount >= 2;
}

function isAlignmentRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  const cells = trimmed.split('|').filter((cell) => cell.length > 0);
  return (
    cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell.trim()))
  );
}

function formatTableLine(
  prefix: string,
  body: string,
  kind: ChangeKind
): string {
  const cells = body.split('|');
  if (cells.length < 2) {
    return `${prefix}${wrapWithMarkup(body, kind)}`;
  }

  const formatted = cells
    .map((cell, index) => {
      if (index === 0 || index === cells.length - 1) {
        return cell;
      }
      const trimmed = cell.trim();
      if (!trimmed || /^:?-+:?$/.test(trimmed)) {
        return cell;
      }

      const leadingMatch = cell.match(/^\s*/);
      const trailingMatch = cell.match(/\s*$/);
      const leading: string = leadingMatch?.[0] ?? '';
      const trailing: string = trailingMatch?.[0] ?? '';
      const inner = cell.slice(leading.length, cell.length - trailing.length);

      return `${leading}${wrapWithMarkup(inner || ' ', kind)}${trailing}`;
    })
    .join('|');

  return `${prefix}${formatted}`;
}

function tokenizeMarkdown(content: string): string[] {
  const lines = splitIntoLines(content);
  const tokens: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line) {
      break;
    }

    if (isListItemLine(line)) {
      const indent = getIndentWidth(line);
      let token = line;
      index++;

      // Collect continuation lines (indented more than the list item)
      while (index < lines.length) {
        const nextLine = lines[index];
        if (!nextLine) {
          break;
        }

        // Empty line ends the list item token but should stay attached so
        // subsequent neutral blocks don't split the diff pairing.
        if (nextLine.trim() === '') {
          token += nextLine;
          index++;
          break;
        }

        // If next line is also a list item at same or less indent, stop
        if (isListItemLine(nextLine)) {
          const nextIndent = getIndentWidth(nextLine);
          if (nextIndent <= indent) {
            break;
          }
        }

        // If it's a continuation line (indented more), include it
        if (isContinuationLine(nextLine, indent)) {
          token += nextLine;
          index++;
          continue;
        }

        // Otherwise, stop
        break;
      }

      tokens.push(token);
    } else {
      tokens.push(line);
      index++;
    }
  }

  return tokens;
}

function normalizeBlock(block: string): string {
  return stripListFormatting(block);
}

function blockSignature(block: string): string {
  const trimmed = block.replace(/[ \t]+$/gm, '').trimEnd();
  const lines = trimmed.split(/\r?\n/);
  return lines
    .map((line) => {
      const { prefix } = splitListPrefix(line);
      if (!prefix) {
        return 'paragraph';
      }
      const indentMatch = prefix.match(/^\s*/);
      const indentLength = (indentMatch?.[0] ?? '').length;
      const markerMatch = prefix
        .trim()
        .replace(/\d+/g, '#')
        .match(/^([-*+]|#(?:[.)]?))/);
      const marker = markerMatch?.[0] ?? prefix.trim();
      return `${indentLength}:${marker}`;
    })
    .join('|');
}

function isListItemLine(line: string): boolean {
  return /^(\s*)([-*+]|\d+[.)])\s/.test(line);
}

function getIndentWidth(line: string): number {
  const match = line.match(/^(\s*)/);
  return match?.[1]?.length ?? 0;
}

function isContinuationLine(line: string, baseIndent: number): boolean {
  if (!line.trim()) return true;
  const indent = getIndentWidth(line);
  return indent > baseIndent;
}

function stripListFormatting(block: string): string {
  const lines = block.split(/\r?\n/);
  const normalized = lines
    .map((line) => {
      if (!line.trim()) {
        return '';
      }
      const { prefix, body } = splitListPrefix(line);
      const cleanedBody = removeMarkupForNormalization(body);
      if (!prefix) {
        return cleanedBody.trim();
      }
      const normalizedPrefix = prefix.replace(/\s+/g, ' ').trimEnd();
      const trimmedBody = cleanedBody.trim();
      return trimmedBody.length > 0
        ? `${normalizedPrefix} ${trimmedBody}`
        : normalizedPrefix;
    })
    .filter((line) => line.length > 0);

  return normalized.join('\n');
}

function removeMarkupForNormalization(text: string): string {
  return text
    .replace(/\{~~([^~]*?)~>([^]*?)~~\}/g, '$2')
    .replace(/\{--([^]*?)--\}/g, '')
    .replace(/\{\+\+([^]*?)\+\+\}/g, '$1')
    .replace(/\{==([^]*?)==\}/g, '$1')
    .replace(/\{>>([^]*?)<<\}/g, '')
    .trim();
}

/**
 * Convert TextChange[] directly to HTML with diff tags
 * This is simpler than CriticMarkup intermediate format
 * Returns markdown with inline <ins> and <del> tags
 *
 * NOTE: Changes must be generated from normalized content (via generateChanges),
 * and this function will normalize oldContent to match.
 */
export function changesToHtmlDiff(
  oldContent: string,
  changes: TextChange[]
): string {
  if (changes.length === 0) {
    return oldContent;
  }

  // Normalize the old content to match what was used in generateChanges
  // This ensures that change positions align correctly
  const normalizedOld = normalizeMarkdownWhitespace(oldContent);

  // Sort changes by position (forward order) to apply them correctly
  const sortedChanges = [...changes].sort((a, b) => a.position - b.position);

  let result = '';
  let currentPos = 0;

  for (const change of sortedChanges) {
    // Add unchanged content before this change
    if (change.position > currentPos) {
      result += normalizedOld.slice(currentPos, change.position);
    }

    if (change.type === 'addition') {
      // Insert HTML tag for addition
      // NOTE: We don't escape the text because it's markdown that needs to be rendered
      // The markdown renderer will handle the content properly

      // Move newlines and list markers outside of <ins> tags to prevent list items from merging
      let text = change.text;
      let prefix = '';
      let suffix = '';

      // Move leading newlines outside
      while (text.startsWith('\n')) {
        prefix += '\n';
        text = text.slice(1);
      }

      // Move trailing newlines outside
      while (text.endsWith('\n')) {
        suffix += '\n';
        text = text.slice(0, -1);
      }

      // Move list markers outside the tag so markdown parser recognizes them
      // Match: "- ", "* ", "+ ", or "1. ", "2. ", etc.
      const listMarkerMatch = text.match(/^(\s*)([-*+]|\d+[.)])\s+/);
      if (listMarkerMatch) {
        prefix += listMarkerMatch[0]; // Add the full marker including spaces
        text = text.slice(listMarkerMatch[0].length);
      }

      result +=
        prefix +
        '<ins class="review-addition" data-critic-type="addition">' +
        text +
        '</ins>' +
        suffix;
      currentPos = change.position;
    } else if (change.type === 'deletion') {
      // Insert HTML tag for deletion
      let deletedText = normalizedOld.slice(
        change.position,
        change.position + change.length
      );

      // Skip empty or whitespace-only deletions to avoid breaking document structure
      // (e.g., empty <del> tags can break list structure when parsed by Pandoc)
      if (deletedText.trim().length > 0) {
        // Move newlines and list markers outside of <del> tags to preserve list structure
        let prefix = '';
        let suffix = '';

        // Move leading newlines outside
        while (deletedText.startsWith('\n')) {
          prefix += '\n';
          deletedText = deletedText.slice(1);
        }

        // Move trailing newlines outside
        while (deletedText.endsWith('\n')) {
          suffix += '\n';
          deletedText = deletedText.slice(0, -1);
        }

        // Move list markers outside the tag so markdown parser recognizes them
        const listMarkerMatch = deletedText.match(/^(\s*)([-*+]|\d+[.)])\s+/);
        if (listMarkerMatch) {
          prefix += listMarkerMatch[0];
          deletedText = deletedText.slice(listMarkerMatch[0].length);
        }

        // Only output if there's actual content left after stripping markers/newlines
        if (deletedText.trim().length > 0) {
          // NOTE: We don't escape the text because it's markdown that needs to be rendered
          result +=
            prefix +
            '<del class="review-deletion" data-critic-type="deletion">' +
            deletedText +
            '</del>' +
            suffix;
        } else {
          // If only markers/newlines, just output them without <del> tags
          result += prefix + suffix;
        }
      }
      currentPos = change.position + change.length;
    }
  }

  // Add any remaining content after the last change
  if (currentPos < normalizedOld.length) {
    result += normalizedOld.slice(currentPos);
  }

  return result;
}

/**
 * Apply changes to produce final clean content
 * Used for accepting all changes
 */
export function applyChanges(
  oldContent: string,
  changes: TextChange[]
): string {
  if (changes.length === 0) {
    return oldContent;
  }

  // Sort changes by position (reverse order for proper application)
  const sortedChanges = [...changes].sort((a, b) => b.position - a.position);

  let result = oldContent;

  for (const change of sortedChanges) {
    if (change.type === 'addition') {
      // Insert addition at position
      const before = result.substring(0, change.position);
      const after = result.substring(change.position);
      result = before + change.text + after;
    } else if (change.type === 'deletion') {
      // Remove deleted text
      const before = result.substring(0, change.position);
      const after = result.substring(change.position + change.length);
      result = before + after;
    }
  }

  return result;
}

/**
 * Remove changes to revert to original content
 * Used for rejecting all changes (returns oldContent without additions)
 */
export function revertChanges(
  oldContent: string,
  _changes: TextChange[]
): string {
  // Simply return oldContent - all changes are based on positions in oldContent
  // Additions were never in oldContent, deletions are still there
  return oldContent;
}

/**
 * Strip all CriticMarkup syntax from content
 * Useful for cleaning up content that has CriticMarkup annotations
 */
interface StripOptions {
  preserveCommentsAsHtml?: boolean;
}

export function stripCriticMarkup(
  content: string,
  acceptMode = true,
  options: StripOptions = {}
): string {
  let result = content;
  const preserveComments = options.preserveCommentsAsHtml ?? false;

  const formatComment = (raw: string): string => {
    if (!preserveComments) {
      return '';
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      return '';
    }
    const sanitized = trimmed.replace(/--/g, '- -');
    return `<!-- review-comment ${sanitized} -->`;
  };

  if (acceptMode) {
    // Accept mode: keep additions/new, remove deletions/old
    // Remove deletions: {--text--}
    result = result.replace(/\{--[^}]*--\}/g, '');

    // Clean up empty list items left after deleting entire list item content
    // Pattern: list marker followed by only whitespace until newline
    result = result.replace(/^(\s*)([-*+]|\d+[.)])\s*$/gm, '');

    // Remove consecutive blank lines that result from deleted list items
    result = result.replace(/\n\n\n+/g, '\n\n');

    // Keep addition content: {++text++} -> text
    result = result.replace(/\{\+\+([^}]*)\+\+\}/g, '$1');
    // Keep new from substitutions: {~~old~>new~~} -> new
    result = result.replace(/\{~~[^~]*~>([^}]*)~~\}/g, '$1');
    // Convert critic comments {>> comment <<}
    result = result.replace(/\{>>([\s\S]*?)<<\}/g, (_match, text) =>
      formatComment(text ?? '')
    );
  } else {
    // Reject mode: keep deletions/old, remove additions/new
    // Keep deletion content: {--text--} -> text
    result = result.replace(/\{--([^}]*)--\}/g, '$1');
    // Remove additions: {++text++}
    result = result.replace(/\{\+\+[^}]*\+\+\}/g, '');
    // Keep old from substitutions: {~~old~>new~~} -> old
    result = result.replace(/\{~~([^~]*)~>[^}]*~~\}/g, '$1');
    // Convert critic comments {>> comment <<}
    result = result.replace(/\{>>([\s\S]*?)<<\}/g, (_match, text) =>
      formatComment(text ?? '')
    );
  }

  // Always preserve highlight text
  result = result.replace(/\{==([\s\S]*?)==\}/g, '$1');

  return result;
}
