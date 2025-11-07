/**
 * Page Utility Functions
 *
 * Helpers for working with element IDs and page prefixes in multi-page projects.
 * Element IDs follow the pattern: {page-slug}.{section}.{type}-{counter}
 *
 * Examples:
 *   index.para-1
 *   processes-page-2.header-1
 *   about.blockquote-3
 */

import { createModuleLogger } from './debug';
import type { Operation } from '@/types';

const logger = createModuleLogger('PageUtils');

/**
 * Get the current page's ID prefix based on the URL pathname
 * Extracts the page slug and converts it to match the Lua filter's sanitization
 *
 * Examples:
 *   /index.html -> "index"
 *   /processes/page-2.html -> "processes-page-2"
 *   /about/ -> "about"
 */
export function getCurrentPagePrefix(): string {
  if (typeof window === 'undefined') {
    return 'document';
  }

  const path = window.location.pathname || '';
  const segments = path.split('/').filter(Boolean);
  const last = segments.pop();

  if (!last) {
    // Root page (index)
    return 'index';
  }

  // Remove .html or .htm extension
  let base = last.replace(/\.(html?|htm)$/i, '');

  if (!base) {
    // Was just "index.html" or similar
    return 'index';
  }

  // Sanitize to match Lua filter's sanitization:
  // Convert to lowercase and replace non-word, non-hyphen chars with hyphens
  const sanitized = base
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');

  return sanitized || 'document';
}

/**
 * Extract the page prefix from an element ID
 *
 * Example: "index.para-1" -> "index"
 */
export function getPagePrefixFromElementId(elementId: string): string {
  if (!elementId) {
    return '';
  }
  const parts = elementId.split('.');
  return parts[0] || '';
}

/**
 * Check if an element ID belongs to the given page prefix
 */
export function elementBelongsToPage(
  elementId: string,
  pagePrefix: string
): boolean {
  return elementId.startsWith(pagePrefix + '.');
}

/**
 * Group operations by their page prefix
 *
 * Returns a map where keys are page prefixes and values are arrays of operations
 * for that page
 */
export function groupOperationsByPage(
  operations: Operation[]
): Map<string, Operation[]> {
  const grouped = new Map<string, Operation[]>();

  for (const op of operations) {
    if (!op.elementId) continue;

    const pagePrefix = getPagePrefixFromElementId(op.elementId);
    if (!pagePrefix) continue;

    if (!grouped.has(pagePrefix)) {
      grouped.set(pagePrefix, []);
    }
    grouped.get(pagePrefix)!.push(op);
  }

  logger.debug('Grouped operations by page', {
    pages: Array.from(grouped.keys()),
    totalOps: operations.length,
  });

  return grouped;
}

/**
 * Filter operations to only those belonging to a specific page
 */
export function filterOperationsByPage(
  operations: Operation[],
  pagePrefix: string
): Operation[] {
  return operations.filter((op) =>
    elementBelongsToPage(op.elementId || '', pagePrefix)
  );
}

/**
 * Get all unique page prefixes from a list of operations
 */
export function getPagePrefixesFromOperations(
  operations: Operation[]
): string[] {
  const prefixes = new Set<string>();

  for (const op of operations) {
    if (!op.elementId) continue;
    const prefix = getPagePrefixFromElementId(op.elementId);
    if (prefix) {
      prefixes.add(prefix);
    }
  }

  return Array.from(prefixes).sort();
}

/**
 * Get a human-readable page name from a page prefix
 * This is useful for UI display
 *
 * Examples:
 *   "index" -> "Home"
 *   "processes-page-2" -> "Processes Page 2"
 *   "about" -> "About"
 */
export function getPageDisplayName(pagePrefix: string): string {
  if (pagePrefix === 'index') {
    return 'Home';
  }

  // Convert hyphens to spaces and capitalize each word
  return pagePrefix
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Infer the QMD filename from a page prefix
 *
 * Examples:
 *   "index" -> "index.qmd"
 *   "processes-page-2" -> "processes/page-2.qmd" (guessed)
 *   "about" -> "about.qmd"
 */
export function inferQmdFilenameFromPagePrefix(pagePrefix: string): string {
  // For now, simple mapping: page-prefix -> page-prefix.qmd
  // More sophisticated logic could parse the prefix to reconstruct directory structure
  return `${pagePrefix}.qmd`;
}

/**
 * Check if there are changes on pages other than the current one
 */
export function hasChangesOnOtherPages(
  operations: Operation[],
  currentPagePrefix: string
): boolean {
  for (const op of operations) {
    if (!op.elementId) continue;
    const pagePrefix = getPagePrefixFromElementId(op.elementId);
    if (pagePrefix && pagePrefix !== currentPagePrefix) {
      return true;
    }
  }
  return false;
}

/**
 * Get a summary of changes by page
 * Useful for display in UI (e.g., "5 changes across 2 pages")
 */
export function getChangesSummaryByPage(operations: Operation[]): {
  totalChanges: number;
  pageCount: number;
  details: Array<{
    pagePrefix: string;
    displayName: string;
    changeCount: number;
  }>;
} {
  const grouped = groupOperationsByPage(operations);
  const details = Array.from(grouped.entries())
    .map(([pagePrefix, ops]) => ({
      pagePrefix,
      displayName: getPageDisplayName(pagePrefix),
      changeCount: ops.length,
    }))
    .sort((a, b) => a.pagePrefix.localeCompare(b.pagePrefix));

  return {
    totalChanges: operations.length,
    pageCount: grouped.size,
    details,
  };
}
