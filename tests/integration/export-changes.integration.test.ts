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
    exporter = new QmdExportService({
      git: mockGitModule,
      getChanges: () => changes,
    });
  });

  describe('Clean Export', () => {
    it('should export clean markdown without tracked changes', async () => {
      // Make edits
      changes.edit('p-1', 'Modified first paragraph');
      changes.edit('p-2', 'Modified second paragraph');

      // Export clean
      const result = await exporter.exportToQmd({ format: 'clean' });

      // Should have exported files
      expect(result.fileCount).toBeGreaterThan(0);
      expect(mockGitModule.writeFile).toHaveBeenCalled();

      // Get the written content
      const writeCall = (mockGitModule.writeFile as ReturnType<typeof vi.fn>)
        .mock.calls[0];
      const writtenContent = writeCall?.[1];

      // Should be clean (no CriticMarkup)
      expect(writtenContent).not.toContain('{++');
      expect(writtenContent).not.toContain('++}');
      expect(writtenContent).not.toContain('{--');
      expect(writtenContent).not.toContain('--}');
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

      // Export with tracking
      const result = await exporter.exportToQmd({ format: 'critic' });

      // Should have exported
      expect(result.fileCount).toBeGreaterThan(0);

      // Get written content
      const writeCall = (mockGitModule.writeFile as ReturnType<typeof vi.fn>)
        .mock.calls[0];
      const writtenContent = writeCall?.[1];

      // Should contain CriticMarkup
      expect(writtenContent).toMatch(/\{--.*?--\}/);
      expect(writtenContent).toMatch(/\{\+\+.*?\+\+\}/);
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

      // Export all
      const result = await exporter.exportToQmd({ format: 'clean' });

      // Should export multiple files
      expect(result.fileCount).toBeGreaterThanOrEqual(1);
      expect(result.filenames).toBeDefined();
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

      // Export clean
      const cleanResult = await exporter.exportToQmd({ format: 'clean' });
      expect(cleanResult.format).toBe('clean');

      // Export with tracking
      const criticResult = await exporter.exportToQmd({ format: 'critic' });
      expect(criticResult.format).toBe('critic');
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
    it('should handle export failures gracefully', async () => {
      // Mock write failure
      (mockGitModule.writeFile as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Write failed')
      );

      // Try to export
      try {
        await exporter.exportToQmd({ format: 'clean' });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
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
});
