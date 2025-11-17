import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getCurrentPagePrefix,
  getPagePrefixFromElementId,
  elementBelongsToPage,
  groupOperationsByPage,
  filterOperationsByPage,
  getPagePrefixesFromOperations,
  getPageDisplayName,
  inferQmdFilenameFromPagePrefix,
  hasChangesOnOtherPages,
  getChangesSummaryByPage,
} from '../../../src/utils/page-utils';
import type { Operation } from '../../../src/types';

/**
 * Tests for page utilities
 *
 * These utilities handle multi-page projects by:
 * - Extracting page prefixes from element IDs
 * - Grouping operations by page
 * - Filtering operations by page
 * - Inferring QMD filenames from page prefixes
 *
 * Element ID format: {page-prefix}.{section}.{type}-{counter}
 * Examples: "index.para-1", "about.header-1", "processes-page-2.para-1"
 */
describe('Page Utilities', () => {
  describe('getPagePrefixFromElementId', () => {
    it('should extract page prefix from simple element ID', () => {
      const result = getPagePrefixFromElementId('index.para-1');
      expect(result).toBe('index');
    });

    it('should extract page prefix from multi-segment ID', () => {
      const result = getPagePrefixFromElementId('about.section-intro.para-1');
      expect(result).toBe('about');
    });

    it('should extract page prefix with hyphens', () => {
      const result = getPagePrefixFromElementId('processes-page-2.para-1');
      expect(result).toBe('processes-page-2');
    });

    it('should extract page prefix with underscores', () => {
      const result = getPagePrefixFromElementId('my_document.para-1');
      expect(result).toBe('my_document');
    });

    it('should handle element ID with .qmd extension in prefix', () => {
      const result = getPagePrefixFromElementId('intro.qmd.section-1.para-1');
      expect(result).toBe('intro');
    });

    it('should handle empty element ID', () => {
      const result = getPagePrefixFromElementId('');
      expect(result).toBe('');
    });

    it('should handle element ID without dots', () => {
      const result = getPagePrefixFromElementId('nodots');
      expect(result).toBe('nodots');
    });

    it('should handle element ID with only prefix', () => {
      const result = getPagePrefixFromElementId('justprefix.');
      expect(result).toBe('justprefix');
    });
  });

  describe('elementBelongsToPage', () => {
    it('should return true for matching page prefix', () => {
      const result = elementBelongsToPage('index.para-1', 'index');
      expect(result).toBe(true);
    });

    it('should return false for non-matching page prefix', () => {
      const result = elementBelongsToPage('about.para-1', 'index');
      expect(result).toBe(false);
    });

    it('should handle multi-segment prefixes', () => {
      const result = elementBelongsToPage(
        'processes-page-2.para-1',
        'processes-page-2'
      );
      expect(result).toBe(true);
    });

    it('should not match partial prefixes', () => {
      const result = elementBelongsToPage('index-extra.para-1', 'index');
      expect(result).toBe(false);
    });

    it('should handle element IDs with multiple dots', () => {
      const result = elementBelongsToPage(
        'intro.qmd.section-1.para-1',
        'intro'
      );
      expect(result).toBe(true);
    });
  });

  describe('groupOperationsByPage', () => {
    it('should group operations by page prefix', () => {
      const operations: Operation[] = [
        {
          type: 'edit',
          elementId: 'index.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'index.para-2',
          timestamp: Date.now(),
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'about.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
      ];

      const result = groupOperationsByPage(operations);

      expect(result.size).toBe(2);
      expect(result.get('index')?.length).toBe(2);
      expect(result.get('about')?.length).toBe(1);
    });

    it('should handle empty operations array', () => {
      const result = groupOperationsByPage([]);
      expect(result.size).toBe(0);
    });

    it('should handle operations without element IDs', () => {
      const operations: Operation[] = [
        {
          type: 'edit',
          elementId: '',
          timestamp: Date.now(),
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'index.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
      ];

      const result = groupOperationsByPage(operations);

      expect(result.size).toBe(1);
      expect(result.get('index')?.length).toBe(1);
    });

    it('should handle mixed page prefixes', () => {
      const operations: Operation[] = [
        {
          type: 'edit',
          elementId: 'intro.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'methods.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'results.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'intro.para-2',
          timestamp: Date.now(),
          data: {} as any,
        },
      ];

      const result = groupOperationsByPage(operations);

      expect(result.size).toBe(3);
      expect(result.get('intro')?.length).toBe(2);
      expect(result.get('methods')?.length).toBe(1);
      expect(result.get('results')?.length).toBe(1);
    });

    it('should preserve operation order within groups', () => {
      const operations: Operation[] = [
        {
          type: 'edit',
          elementId: 'index.para-1',
          timestamp: 100,
          data: { newContent: 'first' } as any,
        },
        {
          type: 'edit',
          elementId: 'index.para-2',
          timestamp: 200,
          data: { newContent: 'second' } as any,
        },
        {
          type: 'edit',
          elementId: 'index.para-3',
          timestamp: 300,
          data: { newContent: 'third' } as any,
        },
      ];

      const result = groupOperationsByPage(operations);
      const indexOps = result.get('index');

      expect(indexOps?.[0]?.timestamp).toBe(100);
      expect(indexOps?.[1]?.timestamp).toBe(200);
      expect(indexOps?.[2]?.timestamp).toBe(300);
    });
  });

  describe('filterOperationsByPage', () => {
    const operations: Operation[] = [
      {
        type: 'edit',
        elementId: 'index.para-1',
        timestamp: Date.now(),
        data: {} as any,
      },
      {
        type: 'edit',
        elementId: 'index.para-2',
        timestamp: Date.now(),
        data: {} as any,
      },
      {
        type: 'edit',
        elementId: 'about.para-1',
        timestamp: Date.now(),
        data: {} as any,
      },
    ];

    it('should filter operations for specific page', () => {
      const result = filterOperationsByPage(operations, 'index');
      expect(result.length).toBe(2);
      expect(result[0]?.elementId).toBe('index.para-1');
      expect(result[1]?.elementId).toBe('index.para-2');
    });

    it('should return empty array for non-existent page', () => {
      const result = filterOperationsByPage(operations, 'nonexistent');
      expect(result.length).toBe(0);
    });

    it('should handle empty operations array', () => {
      const result = filterOperationsByPage([], 'index');
      expect(result.length).toBe(0);
    });
  });

  describe('getPagePrefixesFromOperations', () => {
    it('should extract unique page prefixes', () => {
      const operations: Operation[] = [
        {
          type: 'edit',
          elementId: 'index.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'index.para-2',
          timestamp: Date.now(),
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'about.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'methods.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
      ];

      const result = getPagePrefixesFromOperations(operations);

      expect(result.length).toBe(3);
      expect(result).toContain('index');
      expect(result).toContain('about');
      expect(result).toContain('methods');
    });

    it('should return sorted page prefixes', () => {
      const operations: Operation[] = [
        {
          type: 'edit',
          elementId: 'zebra.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'alpha.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'beta.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
      ];

      const result = getPagePrefixesFromOperations(operations);

      expect(result).toEqual(['alpha', 'beta', 'zebra']);
    });

    it('should handle empty operations array', () => {
      const result = getPagePrefixesFromOperations([]);
      expect(result.length).toBe(0);
    });

    it('should skip operations without element IDs', () => {
      const operations: Operation[] = [
        {
          type: 'edit',
          elementId: '',
          timestamp: Date.now(),
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'index.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
      ];

      const result = getPagePrefixesFromOperations(operations);

      expect(result.length).toBe(1);
      expect(result[0]).toBe('index');
    });
  });

  describe('getPageDisplayName', () => {
    it('should convert "index" to "Home"', () => {
      const result = getPageDisplayName('index');
      expect(result).toBe('Home');
    });

    it('should capitalize single word', () => {
      const result = getPageDisplayName('about');
      expect(result).toBe('About');
    });

    it('should convert hyphens to spaces and capitalize', () => {
      const result = getPageDisplayName('processes-page-2');
      expect(result).toBe('Processes Page 2');
    });

    it('should handle underscores (as-is)', () => {
      const result = getPageDisplayName('my_document');
      expect(result).toBe('My_document');
    });

    it('should handle all lowercase input', () => {
      const result = getPageDisplayName('methodology');
      expect(result).toBe('Methodology');
    });

    it('should handle multiple hyphens', () => {
      const result = getPageDisplayName('chapter-1-introduction-section');
      expect(result).toBe('Chapter 1 Introduction Section');
    });
  });

  describe('inferQmdFilenameFromPagePrefix', () => {
    it('should infer filename from simple prefix', () => {
      const result = inferQmdFilenameFromPagePrefix('index');
      expect(result).toBe('index.qmd');
    });

    it('should infer filename from hyphenated prefix', () => {
      const result = inferQmdFilenameFromPagePrefix('processes-page-2');
      expect(result).toBe('processes-page-2.qmd');
    });

    it('should infer filename from complex prefix', () => {
      const result = inferQmdFilenameFromPagePrefix('chapter-1-intro');
      expect(result).toBe('chapter-1-intro.qmd');
    });

    it('should handle single character prefix', () => {
      const result = inferQmdFilenameFromPagePrefix('a');
      expect(result).toBe('a.qmd');
    });

    it('should handle prefix with numbers', () => {
      const result = inferQmdFilenameFromPagePrefix('page-123');
      expect(result).toBe('page-123.qmd');
    });
  });

  describe('hasChangesOnOtherPages', () => {
    it('should return true when changes exist on other pages', () => {
      const operations: Operation[] = [
        {
          type: 'edit',
          elementId: 'index.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'about.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
      ];

      const result = hasChangesOnOtherPages(operations, 'index');
      expect(result).toBe(true);
    });

    it('should return false when all changes are on current page', () => {
      const operations: Operation[] = [
        {
          type: 'edit',
          elementId: 'index.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'index.para-2',
          timestamp: Date.now(),
          data: {} as any,
        },
      ];

      const result = hasChangesOnOtherPages(operations, 'index');
      expect(result).toBe(false);
    });

    it('should handle empty operations array', () => {
      const result = hasChangesOnOtherPages([], 'index');
      expect(result).toBe(false);
    });
  });

  describe('getChangesSummaryByPage', () => {
    it('should return summary of changes by page', () => {
      const operations: Operation[] = [
        {
          type: 'edit',
          elementId: 'index.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'index.para-2',
          timestamp: Date.now(),
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'about.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
      ];

      const result = getChangesSummaryByPage(operations);

      expect(result.totalChanges).toBe(3);
      expect(result.pageCount).toBe(2);
      expect(result.details.length).toBe(2);

      const indexDetail = result.details.find((d) => d.pagePrefix === 'index');
      expect(indexDetail?.changeCount).toBe(2);
      expect(indexDetail?.displayName).toBe('Home');

      const aboutDetail = result.details.find((d) => d.pagePrefix === 'about');
      expect(aboutDetail?.changeCount).toBe(1);
      expect(aboutDetail?.displayName).toBe('About');
    });

    it('should sort details by page prefix', () => {
      const operations: Operation[] = [
        {
          type: 'edit',
          elementId: 'zebra.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'alpha.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
      ];

      const result = getChangesSummaryByPage(operations);

      expect(result.details[0]?.pagePrefix).toBe('alpha');
      expect(result.details[1]?.pagePrefix).toBe('zebra');
    });

    it('should handle empty operations array', () => {
      const result = getChangesSummaryByPage([]);

      expect(result.totalChanges).toBe(0);
      expect(result.pageCount).toBe(0);
      expect(result.details.length).toBe(0);
    });
  });

  describe('getCurrentPagePrefix', () => {
    let originalWindow: typeof global.window;

    beforeEach(() => {
      originalWindow = global.window;
    });

    afterEach(() => {
      global.window = originalWindow;
    });

    it('should extract prefix from /index.html', () => {
      global.window = {
        location: { pathname: '/index.html' },
      } as any;

      const result = getCurrentPagePrefix();
      expect(result).toBe('index');
    });

    it('should extract prefix from /about.html', () => {
      global.window = {
        location: { pathname: '/about.html' },
      } as any;

      const result = getCurrentPagePrefix();
      expect(result).toBe('about');
    });

    it('should extract prefix from /processes/page-2.html', () => {
      global.window = {
        location: { pathname: '/processes/page-2.html' },
      } as any;

      const result = getCurrentPagePrefix();
      expect(result).toBe('page-2');
    });

    it('should handle root path', () => {
      global.window = {
        location: { pathname: '/' },
      } as any;

      const result = getCurrentPagePrefix();
      expect(result).toBe('index');
    });

    it('should sanitize page prefix', () => {
      global.window = {
        location: { pathname: '/My_Page Title!.html' },
      } as any;

      const result = getCurrentPagePrefix();
      // Should convert to lowercase and replace invalid chars with hyphens
      expect(result).toBe('my_page-title');
    });

    it('should handle .htm extension', () => {
      global.window = {
        location: { pathname: '/about.htm' },
      } as any;

      const result = getCurrentPagePrefix();
      expect(result).toBe('about');
    });

    it('should handle path without extension', () => {
      global.window = {
        location: { pathname: '/about/' },
      } as any;

      const result = getCurrentPagePrefix();
      expect(result).toBe('about');
    });

    it('should return "document" when window is undefined', () => {
      // @ts-ignore
      global.window = undefined;

      const result = getCurrentPagePrefix();
      expect(result).toBe('document');
    });
  });

  describe('Edge Cases', () => {
    it('should handle element IDs with .qmd in page prefix', () => {
      const prefix = getPagePrefixFromElementId('intro.qmd.section-1.para-1');
      expect(prefix).toBe('intro');

      const belongs = elementBelongsToPage('intro.qmd.section-1.para-1', 'intro');
      expect(belongs).toBe(true);
    });

    it('should handle very long page prefixes', () => {
      const longPrefix = 'a'.repeat(100);
      const elementId = `${longPrefix}.para-1`;

      const prefix = getPagePrefixFromElementId(elementId);
      expect(prefix).toBe(longPrefix);

      const filename = inferQmdFilenameFromPagePrefix(longPrefix);
      expect(filename).toBe(`${longPrefix}.qmd`);
    });

    it('should handle special characters in page prefixes', () => {
      const operations: Operation[] = [
        {
          type: 'edit',
          elementId: 'page_with_underscores.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'page-with-hyphens.para-1',
          timestamp: Date.now(),
          data: {} as any,
        },
      ];

      const prefixes = getPagePrefixesFromOperations(operations);
      expect(prefixes).toContain('page_with_underscores');
      expect(prefixes).toContain('page-with-hyphens');
    });

    it('should handle operations with identical page prefixes but different element IDs', () => {
      const operations: Operation[] = [
        {
          type: 'edit',
          elementId: 'index.para-1',
          timestamp: 100,
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'index.header-1',
          timestamp: 200,
          data: {} as any,
        },
        {
          type: 'edit',
          elementId: 'index.blockquote-1',
          timestamp: 300,
          data: {} as any,
        },
      ];

      const grouped = groupOperationsByPage(operations);
      expect(grouped.get('index')?.length).toBe(3);

      const prefixes = getPagePrefixesFromOperations(operations);
      expect(prefixes.length).toBe(1);
      expect(prefixes[0]).toBe('index');
    });
  });
});
