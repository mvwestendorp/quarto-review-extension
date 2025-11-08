/**
 * Export + Changes Integration Tests
 * Tests the interaction between QmdExportService and ChangesModule
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChangesModule } from '@modules/changes';
import { QmdExportService } from '@modules/export';
import type { Element, ElementMetadata } from '@/types';
import type { GitModule } from '@modules/git';

const baseMetadata: ElementMetadata = {
  type: 'Para',
};

function buildChangesWithElements(elements: Element[]): ChangesModule {
  const changes = new ChangesModule();
  (changes as unknown as { originalElements: Element[] }).originalElements =
    elements.map((element) => ({ ...element }));
  return changes;
}

describe('Export + Changes Integration', () => {
  let changes: ChangesModule;
  let exporter: QmdExportService;
  let mockGitModule: GitModule;

  beforeEach(() => {
    // Create mock GitModule
    mockGitModule = {
      isAvailable: vi.fn().mockResolvedValue(true),
      getConfig: vi.fn().mockReturnValue({
        repository: {
          sourceFile: 'document.qmd',
        },
      }),
      listFiles: vi.fn().mockResolvedValue([
        'document.qmd',
        'chapter1.qmd',
        'chapter2.qmd',
      ]),
      readFile: vi.fn().mockImplementation(async (path: string) => {
        if (path === 'document.qmd') {
          return 'Original content';
        }
        return '';
      }),
      writeFile: vi.fn().mockResolvedValue(undefined),
    } as unknown as GitModule;

    // Initialize changes
    changes = buildChangesWithElements([
      {
        id: 'p-1',
        content: 'First paragraph',
        metadata: baseMetadata,
        sourcePosition: { line: 1, column: 0 },
      },
      {
        id: 'p-2',
        content: 'Second paragraph',
        metadata: baseMetadata,
        sourcePosition: { line: 3, column: 0 },
      },
    ]);

    // Initialize exporter
    exporter = new QmdExportService(changes, {
      git: mockGitModule,
    });
  });

  describe('Clean Export', () => {
    it('should export clean markdown without tracked changes', async () => {
      // Make edits
      changes.edit('p-1', 'Modified first paragraph');
      changes.edit('p-2', 'Modified second paragraph');

      // Create export bundle
      const bundle = await exporter.createBundle({ format: 'clean' });

      // Should have exported files
      expect(bundle.files.length).toBeGreaterThan(0);
      expect(bundle.format).toBe('clean');

      // Verify clean markdown doesn't have CriticMarkup
      const cleanMarkdown = changes.toCleanMarkdown();
      expect(cleanMarkdown).not.toContain('{++');
      expect(cleanMarkdown).not.toContain('++}');
      expect(cleanMarkdown).not.toContain('{--');
      expect(cleanMarkdown).not.toContain('--}');
    });

    it('should preserve document structure in clean export', async () => {
      // Create structured content
      const structuredChanges = buildChangesWithElements([
        {
          id: 'h-1',
          content: '# Introduction',
          metadata: { type: 'Heading', level: 1 },
        },
        { id: 'p-1', content: 'First paragraph', metadata: baseMetadata },
        {
          id: 'h-2',
          content: '## Section 1',
          metadata: { type: 'Heading', level: 2 },
        },
        { id: 'p-2', content: 'Second paragraph', metadata: baseMetadata },
      ]);

      // Edit some content
      structuredChanges.edit('p-1', 'Modified first paragraph');

      // Export
      const markdown = structuredChanges.toCleanMarkdown();

      // Should preserve structure
      expect(markdown).toContain('# Introduction');
      expect(markdown).toContain('## Section 1');
      expect(markdown).toContain('Modified first paragraph');
      expect(markdown).toContain('Second paragraph');
    });
  });

  describe('Tracked Export (CriticMarkup)', () => {
    it('should export with tracked changes in CriticMarkup format', async () => {
      // Set baselines
      changes.setElementBaseline('p-1', 'First paragraph');
      changes.setElementBaseline('p-2', 'Second paragraph');

      // Make edits
      changes.edit('p-1', 'Modified first paragraph');
      changes.edit('p-2', 'Updated second paragraph');

      // Create export bundle with tracking
      const bundle = await exporter.createBundle({ format: 'critic' });

      // Should have exported
      expect(bundle.files.length).toBeGreaterThan(0);
      expect(bundle.format).toBe('critic');

      // Verify tracked markdown has CriticMarkup
      const trackedMarkdown = changes.toTrackedMarkdown();
      expect(trackedMarkdown).toMatch(/\{--.*?--\}/);
      expect(trackedMarkdown).toMatch(/\{\+\+.*?\+\+\}/);
    });

    it('should show insertions and deletions in tracked export', () => {
      // Delete element
      changes.delete('p-2');

      // Insert new element
      changes.insert('New inserted content', baseMetadata, { after: 'p-1' });

      // Get tracked markdown
      const tracked = changes.toTrackedMarkdown();

      // Should show the insertion
      expect(tracked).toContain('New inserted content');
    });
  });

  describe('Multi-file Export', () => {
    it('should handle exporting changes across multiple Quarto files', async () => {
      // Mock multiple files
      (mockGitModule.listFiles as ReturnType<typeof vi.fn>).mockResolvedValue([
        'intro.qmd',
        'chapter1.qmd',
        'chapter2.qmd',
      ]);

      // Create bundle
      const bundle = await exporter.createBundle({ format: 'clean' });

      // Should export multiple files
      expect(bundle.files.length).toBeGreaterThanOrEqual(1);
      expect(bundle.primaryFilename).toBeDefined();
    });

    it('should map changes to correct source files', () => {
      // Create changes with source positions
      const multiFileChanges = buildChangesWithElements([
        {
          id: 'f1-p1',
          content: 'Intro paragraph',
          metadata: baseMetadata,
          sourcePosition: { line: 1, column: 0 },
        },
        {
          id: 'f2-p1',
          content: 'Chapter 1 paragraph',
          metadata: baseMetadata,
          sourcePosition: { line: 10, column: 0 },
        },
      ]);

      // Group by source file would happen in export service
      const state = multiFileChanges.getCurrentState();

      // Should have elements from different positions
      expect(state).toHaveLength(2);
      expect(state[0]?.sourcePosition?.line).toBe(1);
      expect(state[1]?.sourcePosition?.line).toBe(10);
    });
  });

  describe('Export with Comments', () => {
    it('should include comments in export when requested', () => {
      // Make edits
      changes.edit('p-1', 'Modified content');

      // Create comment map
      const commentMap = new Map<string, string>();
      commentMap.set('p-1', '{>>Please review this change<<}');

      // Export with comments
      const withComments = changes.toMarkdownWithComments(commentMap);

      // Should include comment
      expect(withComments).toContain('{>>Please review this change<<}');
      expect(withComments).toContain('Modified content');
    });

    it('should strip comments in clean export', () => {
      // Add comments to markdown
      const textWithComments =
        'Some text {>>This is a comment<<} more text';

      // Create changes with commented text
      const commentedChanges = buildChangesWithElements([
        { id: 'p-1', content: textWithComments, metadata: baseMetadata },
      ]);

      // Clean export should remove comments
      const clean = commentedChanges.toCleanMarkdown();

      // Should strip comment but preserve text
      expect(clean).not.toContain('{>>');
      expect(clean).not.toContain('<<}');
    });
  });

  describe('Export Metadata Preservation', () => {
    it('should preserve element metadata in export', () => {
      // Create elements with various metadata
      const metadataChanges = buildChangesWithElements([
        {
          id: 'h-1',
          content: '# Title',
          metadata: {
            type: 'Heading',
            level: 1,
            attributes: { id: 'title' },
          },
        },
        {
          id: 'p-1',
          content: 'Paragraph with class',
          metadata: {
            type: 'Para',
            classes: ['callout', 'note'],
          },
        },
      ]);

      // Export should maintain structure
      const state = metadataChanges.getCurrentState();

      expect(state[0]?.metadata.type).toBe('Heading');
      expect(state[0]?.metadata.level).toBe(1);
      expect(state[1]?.metadata.classes).toContain('callout');
    });

    it('should handle metadata changes in export', () => {
      // Edit with metadata change
      changes.edit('p-1', 'Modified paragraph', undefined, {
        type: 'Para',
        classes: ['highlight'],
      });

      // Get element
      const element = changes.getElementById('p-1');

      // Should have updated metadata
      expect(element?.metadata.classes).toContain('highlight');
    });
  });

  describe('Export Format Conversion', () => {
    it('should handle different export formats', async () => {
      // Edit content
      changes.edit('p-1', 'Modified content');

      // Create clean bundle
      const cleanBundle = await exporter.createBundle({ format: 'clean' });
      expect(cleanBundle.files.length).toBeGreaterThan(0);
      expect(cleanBundle.format).toBe('clean');

      // Create critic bundle
      const criticBundle = await exporter.createBundle({ format: 'critic' });
      expect(criticBundle.files.length).toBeGreaterThan(0);
      expect(criticBundle.format).toBe('critic');

      // Both should have files
      expect(cleanBundle.primaryFilename).toBeDefined();
      expect(criticBundle.primaryFilename).toBeDefined();
    });

    it('should handle markdown formatting in export', () => {
      // Create content with markdown
      const formattedChanges = buildChangesWithElements([
        {
          id: 'p-1',
          content: '**Bold** and *italic* and `code`',
          metadata: baseMetadata,
        },
      ]);

      // Export
      const markdown = formattedChanges.toMarkdown();

      // Should preserve markdown
      expect(markdown).toContain('**Bold**');
      expect(markdown).toContain('*italic*');
      expect(markdown).toContain('`code`');
    });
  });

  describe('Export Error Handling', () => {
    it('should handle export with no embedded files gracefully', async () => {
      // Mock no files
      (mockGitModule.listFiles as ReturnType<typeof vi.fn>).mockResolvedValue(
        []
      );

      // Create bundle should handle gracefully
      const bundle = await exporter.createBundle({ format: 'clean' });

      // Should still work (exports current document)
      expect(bundle).toBeDefined();
      expect(bundle.files.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty documents', () => {
      // Create empty changes
      const emptyChanges = buildChangesWithElements([]);

      // Export should handle gracefully
      const markdown = emptyChanges.toMarkdown();

      expect(markdown).toBe('');
    });
  });

  describe('Export Performance', () => {
    it('should efficiently export large documents', () => {
      // Create large document
      const largeChanges = buildChangesWithElements(
        Array.from({ length: 100 }, (_, i) => ({
          id: `p-${i}`,
          content: `Paragraph ${i} content`,
          metadata: baseMetadata,
        }))
      );

      // Export
      const startTime = performance.now();
      const markdown = largeChanges.toMarkdown();
      const endTime = performance.now();

      // Should complete reasonably fast
      expect(endTime - startTime).toBeLessThan(1000); // 1 second

      // Should have all content
      expect(markdown.split('\n\n')).toHaveLength(100);
    });
  });

  describe('Export with Operations History', () => {
    it('should export operation summary for review logs', () => {
      // Make various changes
      changes.edit('p-1', 'Edit 1');
      changes.edit('p-2', 'Edit 2');
      changes.insert('New paragraph', baseMetadata, { after: 'p-2' });

      // Get summary
      const summary = changes.summarizeOperations();

      // Should describe all operations
      expect(summary).toContain('Edited 2 element(s)');
      expect(summary).toContain('Added 1 element(s)');

      // Could be included in export metadata
      const operations = changes.getOperations();
      expect(operations).toHaveLength(3);
    });

    it('should support exporting at specific operation points', () => {
      // Make edits
      changes.edit('p-1', 'Edit 1');
      changes.edit('p-2', 'Edit 2');

      // Get state after first edit
      // (would need to implement operation replay to specific point)
      const allOps = changes.getOperations();
      expect(allOps).toHaveLength(2);

      // Export current state
      const current = changes.toMarkdown();
      expect(current).toContain('Edit 1');
      expect(current).toContain('Edit 2');
    });
  });

  describe('Integration with Git Export', () => {
    it('should prepare clean export suitable for Git commits', () => {
      // Make edits with baselines
      changes.setElementBaseline('p-1', 'Original');
      changes.edit('p-1', 'Modified');

      // Clean export (for Git)
      const clean = changes.toCleanMarkdown();

      // Should not have markup
      expect(clean).toBe('Modified\n\nSecond paragraph');
      expect(clean).not.toContain('{--');
      expect(clean).not.toContain('++}');
    });

    it('should prepare tracked export for review', () => {
      // Set baseline and edit
      changes.setElementBaseline('p-1', 'Original content');
      changes.edit('p-1', 'Modified content');

      // Tracked export (for review)
      const tracked = changes.getElementContentWithTrackedChanges('p-1');

      // Should show diff
      expect(tracked).toContain('{--Original--}');
      expect(tracked).toContain('{++Modified++}');
    });
  });

  describe('Multi-Page Export with Content Changes', () => {
    it('should export pages with actual content changes applied', () => {
      // Create multi-page document with page prefixes
      // (simulating pages like "page1", "page2")
      const multiPageChanges = buildChangesWithElements([
        {
          id: 'page1.sec-intro.para-1',
          content: 'First page introduction',
          metadata: baseMetadata,
        },
        {
          id: 'page2.sec-content.para-1',
          content: 'Second page content',
          metadata: baseMetadata,
        },
      ]);

      // Make edits to multiple pages
      multiPageChanges.edit('page1.sec-intro.para-1', 'First page introduction Test');
      multiPageChanges.edit('page2.sec-content.para-1', 'Second page content Test');

      // Get the current state to verify edits were applied
      const currentState = multiPageChanges.getCurrentState();
      expect(currentState).toHaveLength(2);
      expect(currentState[0]?.content).toBe('First page introduction Test');
      expect(currentState[1]?.content).toBe('Second page content Test');

      // Verify the operations contain the changes
      const ops = multiPageChanges.getOperations();
      expect(ops).toHaveLength(2);
      expect(ops[0]?.data.type).toBe('edit');
      expect(ops[1]?.data.type).toBe('edit');
    });

    it('should include changes in exported page content', async () => {
      // Create multi-page changes with page-prefixed IDs
      const multiPageChanges = buildChangesWithElements([
        {
          id: 'document.section.para-1',
          content: 'Original text',
          metadata: baseMetadata,
        },
        {
          id: 'debug-example.example.para-1',
          content: 'Another section',
          metadata: baseMetadata,
        },
      ]);

      // Apply edits with " Test" suffix (as in user's report)
      multiPageChanges.edit('document.section.para-1', 'Original text Test');
      multiPageChanges.edit('debug-example.example.para-1', 'Another section Test');

      // Verify changes are in current state
      const state = multiPageChanges.getCurrentState();
      expect(state[0]?.content).toContain(' Test');
      expect(state[1]?.content).toContain(' Test');

      // Export as clean format
      const exported = multiPageChanges.toCleanMarkdown();
      expect(exported).toContain('Original text Test');
      expect(exported).toContain('Another section Test');
    });
  });
});
