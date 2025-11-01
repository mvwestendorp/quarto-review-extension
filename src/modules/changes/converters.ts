/**
 * Converters for tracking changes and CriticMarkup
 *
 * Architecture:
 * - Store changes as structured TextChange[] objects
 * - Convert to CriticMarkup for UI display
 * - Apply changes to produce clean markdown for Git export
 */

import * as Diff from 'diff';
import type { TextChange } from '@/types';

/**
 * Generate granular changes from old and new content.
 * Uses a line-level diff to preserve structural constructs like lists and tables.
 */
export function generateChanges(
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

        wordDiffs.forEach((diff) => {
          if (diff.added) {
            changes.push({
              type: 'addition',
              position: localPos,
              length: diff.value.length,
              text: diff.value,
            });
          } else if (diff.removed) {
            changes.push({
              type: 'deletion',
              position: localPos,
              length: diff.value.length,
              text: diff.value,
            });
            localPos += diff.value.length;
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
 */
export function changesToCriticMarkup(
  oldContent: string,
  changes: TextChange[]
): string {
  if (changes.length === 0) {
    return oldContent;
  }

  const newContent = applyChanges(oldContent, changes);
  const oldTokens = tokenizeMarkdown(oldContent);
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

  diffs.forEach((diff) => {
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
  const hasAdditions = diffs.some((diff) => diff.added);
  const hasDeletions = diffs.some((diff) => diff.removed);
  const hasUnchanged = diffs.some(
    (diff) => !diff.added && !diff.removed && diff.value.trim().length > 0
  );

  if (hasAdditions && hasDeletions && !hasUnchanged) {
    return `${prefix}${wrapWithSubstitution(oldBody, newBody)}${newline}`;
  }

  let trimmedResult = '';

  diffs.forEach((diff) => {
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
    // Fall back to wrapping the full line when the body is empty (e.g. placeholder items)
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

  diffs.forEach((diff) => {
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
    result = result.replace(/\{--[^}]*--\}/g, '');
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
