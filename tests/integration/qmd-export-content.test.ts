/**
 * QMD Export Content Test - Test Driven Development
 * Tests that exported QMD files contain actual changes, not original content
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChangesModule } from '@modules/changes';
import { QmdExportService } from '@modules/export';
import type { Element, ElementMetadata } from '@/types';
import type { GitModule } from '@modules/git';
import { vi } from 'vitest';

const baseMetadata: ElementMetadata = {
  type: 'Para',
};

function buildChangesWithElements(elements: Element[]): ChangesModule {
  const changes = new ChangesModule();
  (changes as unknown as { originalElements: Element[] }).originalElements =
    elements.map((element) => ({ ...element }));
  return changes;
}

describe('QMD Export Content - TDD', () => {
  let mockGitModule: GitModule;

  beforeEach(() => {
    mockGitModule = {
      isAvailable: vi.fn().mockResolvedValue(true),
      getConfig: vi.fn().mockReturnValue({
        repository: {
          sourceFile: 'document.qmd',
        },
      }),
      listFiles: vi.fn().mockResolvedValue([
        'document.qmd',
        'debug-example.qmd',
      ]),
      readFile: vi.fn().mockImplementation(async (path: string) => {
        // Return original QMD content
        if (path === 'document.qmd') {
          return `# Main Document

Original text

More content`;
        }
        if (path === 'debug-example.qmd') {
          return `# Debug Example

Another section

Final content`;
        }
        return '';
      }),
      writeFile: vi.fn().mockResolvedValue(undefined),
    } as unknown as GitModule;
  });

  it('should export QMD file with changes included', async () => {
    // Create a simple document with elements that match the QMD files
    const changes = buildChangesWithElements([
      {
        id: 'document.para-1',
        content: 'Original text',
        metadata: baseMetadata,
        sourcePosition: { line: 3, column: 0 },
      },
      {
        id: 'document.para-2',
        content: 'More content',
        metadata: baseMetadata,
        sourcePosition: { line: 5, column: 0 },
      },
    ]);

    // Make edits
    changes.edit('document.para-1', 'Original text Test');
    changes.edit('document.para-2', 'More content Test');

    // Verify changes are in current state
    const currentState = changes.getCurrentState();
    console.log('Current state:', currentState);
    expect(currentState[0]?.content).toBe('Original text Test');
    expect(currentState[1]?.content).toBe('More content Test');

    // Export
    const exporter = new QmdExportService(changes, {
      git: mockGitModule,
    });
    const bundle = await exporter.createBundle({ format: 'clean' });

    console.log('Bundle:', {
      format: bundle.format,
      numFiles: bundle.files.length,
      files: bundle.files.map(f => ({ filename: f.filename, contentLength: f.content.length }))
    });

    // Find the document.qmd file in the export
    const documentFile = bundle.files.find(f => f.filename === 'document.qmd');
    expect(documentFile).toBeDefined();

    // The exported content should include the changes
    console.log('Exported document.qmd content:');
    console.log(documentFile?.content);

    // THIS IS THE KEY TEST: The exported content must include the changes
    expect(documentFile?.content).toContain('Original text Test');
    expect(documentFile?.content).toContain('More content Test');
  });

  it('should export multiple QMD files with their respective changes', async () => {
    // Create multi-page document
    const changes = buildChangesWithElements([
      {
        id: 'document.para-1',
        content: 'Original text',
        metadata: baseMetadata,
        sourcePosition: { line: 3, column: 0 },
      },
      {
        id: 'debug-example.para-1',
        content: 'Another section',
        metadata: baseMetadata,
        sourcePosition: { line: 3, column: 0 },
      },
    ]);

    // Make edits to both pages
    changes.edit('document.para-1', 'Original text Test');
    changes.edit('debug-example.para-1', 'Another section Test');

    // Check operations
    const ops = changes.getOperations();
    console.log('Operations:', ops.map(o => ({ elementId: o.elementId, type: o.data.type })));

    // Check current state
    const state = changes.getCurrentState();
    console.log('Current state:', state.map(e => ({ id: e.id, content: e.content })));

    // Export
    const exporter = new QmdExportService(changes, {
      git: mockGitModule,
    });
    const bundle = await exporter.createBundle({ format: 'clean' });

    console.log('Bundle info:', {
      format: bundle.format,
      primaryFilename: bundle.primaryFilename,
      fileCount: bundle.files.length,
      forceArchive: bundle.forceArchive,
    });

    console.log('Bundle files:');
    bundle.files.forEach(f => {
      console.log(`\n${f.filename}:`);
      console.log(f.content);
    });

    // Check document.qmd
    const documentFile = bundle.files.find(f => f.filename === 'document.qmd');
    expect(documentFile).toBeDefined();
    expect(documentFile?.content).toContain('Original text Test');

    // Check debug-example.qmd
    const debugFile = bundle.files.find(f => f.filename === 'debug-example.qmd');
    expect(debugFile).toBeDefined();
    expect(debugFile?.content).toContain('Another section Test');
  });

  it('should handle single page export with changes', async () => {
    const changes = buildChangesWithElements([
      {
        id: 'document.heading',
        content: '# Main Document',
        metadata: { type: 'Heading', level: 1 },
        sourcePosition: { line: 1, column: 0 },
      },
      {
        id: 'document.para-1',
        content: 'Original text',
        metadata: baseMetadata,
        sourcePosition: { line: 3, column: 0 },
      },
    ]);

    // Make edit
    changes.edit('document.para-1', 'Original text Test');

    // Export
    const exporter = new QmdExportService(changes, {
      git: mockGitModule,
    });
    const bundle = await exporter.createBundle({ format: 'clean' });

    const documentFile = bundle.files.find(f => f.filename === 'document.qmd');
    expect(documentFile).toBeDefined();
    expect(documentFile?.content).toContain('Original text Test');
  });

  it('should export only files with changes, replacing originals with updated versions', async () => {
    // Mock git module that has the actual source files
    const mockGitWithSources = {
      isAvailable: vi.fn().mockResolvedValue(true),
      getConfig: vi.fn().mockReturnValue({
        repository: {
          sourceFile: 'document.qmd',
        },
      }),
      listFiles: vi.fn().mockResolvedValue([
        'document.qmd',
        'debug-example.qmd',
        'config.yml',
        'README.md',
        'styles.css',
      ]),
      readFile: vi.fn().mockImplementation(async (path: string) => {
        if (path === 'document.qmd') {
          return `# Document

Original text`;
        }
        if (path === 'debug-example.qmd') {
          return `# Debug Example

Another section`;
        }
        if (path === 'README.md') {
          return 'Project README';
        }
        return '';
      }),
      writeFile: vi.fn().mockResolvedValue(undefined),
    } as unknown as GitModule;

    // Create multi-page document
    const changes = buildChangesWithElements([
      {
        id: 'document.para-1',
        content: 'Original text',
        metadata: baseMetadata,
        sourcePosition: { line: 3, column: 0 },
      },
      {
        id: 'debug-example.para-1',
        content: 'Another section',
        metadata: baseMetadata,
        sourcePosition: { line: 3, column: 0 },
      },
    ]);

    // Make edits to both pages
    changes.edit('document.para-1', 'Original text Test');
    changes.edit('debug-example.para-1', 'Another section Test');

    // Export with source files available
    const exporter = new QmdExportService(changes, {
      git: mockGitWithSources,
    });
    const bundle = await exporter.createBundle({ format: 'clean' });

    console.log('Bundle with source files:', {
      fileCount: bundle.files.length,
      files: bundle.files.map(f => ({ filename: f.filename, origin: f.origin }))
    });

    console.log('All bundle files:', bundle.files.map(f => ({
      filename: f.filename,
      origin: f.origin,
      contentPreview: f.content.substring(0, 40)
    })));

    // Should have exactly 2 files (the ones with changes)
    expect(bundle.files.length).toBe(2);

    // Should NOT have extra files without changes
    expect(bundle.files.every(f => f.origin === 'active-document')).toBe(true);

    // Each file should have the updated content
    const documentFile = bundle.files.find(f => f.filename === 'document.qmd');
    expect(documentFile).toBeDefined();
    expect(documentFile?.content).toContain('Original text Test');
    expect(documentFile?.origin).toBe('active-document');

    const debugFile = bundle.files.find(f => f.filename === 'debug-example.qmd');
    expect(debugFile).toBeDefined();
    expect(debugFile?.content).toContain('Another section Test');
    expect(debugFile?.origin).toBe('active-document');
  });

  it('should not include original files in multi-page export zip', async () => {
    // This test reproduces the user's issue where original unchanged files are included in the zip
    // The export should include:
    // - QMD files with changes (document.qmd, debug-example.qmd) with origin='active-document'
    // - ALL other QMD files from project (doc-translation.qmd) with origin='embedded'
    // - Project config (_quarto.yml) with origin='project-config'
    const mockGitWithAllProjectFiles = {
      isAvailable: vi.fn().mockResolvedValue(true),
      getConfig: vi.fn().mockReturnValue({
        repository: {
          sourceFile: 'document.qmd',
        },
      }),
      listFiles: vi.fn().mockResolvedValue([
        'document.qmd',
        'debug-example.qmd',
        'doc-translation.qmd',
        '_quarto.yml',
      ]),
      readFile: vi.fn().mockImplementation(async (path: string) => {
        if (path === 'document.qmd') {
          return `# Document\n\nOriginal text`;
        }
        if (path === 'debug-example.qmd') {
          return `# Debug Example\n\nAnother section`;
        }
        if (path === 'doc-translation.qmd') {
          return `# Translation\n\nTranslation content`;
        }
        if (path === '_quarto.yml') {
          return 'project:\n  type: book';
        }
        return '';
      }),
      writeFile: vi.fn().mockResolvedValue(undefined),
      listEmbeddedSources: vi.fn().mockResolvedValue([
        {
          filename: 'document.qmd',
          content: `# Document\n\nOriginal text`,
        },
        {
          filename: 'debug-example.qmd',
          content: `# Debug Example\n\nAnother section`,
        },
        {
          filename: 'doc-translation.qmd',
          content: `# Translation\n\nTranslation content`,
        },
        {
          filename: '_quarto.yml',
          content: 'project:\n  type: book',
        },
      ]),
    } as unknown as GitModule;

    // Create multi-page document with FULL PATH prefixes (like from Quarto Lua filter)
    const changes = buildChangesWithElements([
      {
        id: 'workspaces-quarto-review-extension-example-output-document.para-1',
        content: 'Original text',
        metadata: baseMetadata,
      },
      {
        id: 'workspaces-quarto-review-extension-example-output-debug-example.para-1',
        content: 'Another section',
        metadata: baseMetadata,
      },
    ]);

    // Make edits to both pages (but NOT to doc-translation.qmd)
    changes.edit('workspaces-quarto-review-extension-example-output-document.para-1', 'Original text Test');
    changes.edit('workspaces-quarto-review-extension-example-output-debug-example.para-1', 'Another section Test');

    // Export
    const exporter = new QmdExportService(changes, {
      git: mockGitWithAllProjectFiles,
    });
    const bundle = await exporter.createBundle({ format: 'clean' });

    console.log('Export with full path prefixes:', {
      fileCount: bundle.files.length,
      files: bundle.files.map(f => ({filename: f.filename, origin: f.origin}))
    });

    // Should have files with changes PLUS all Quarto project files
    // This ensures the exported zip is a complete, working Quarto project
    // Expected: 4 files (document.qmd, debug-example.qmd with changes + doc-translation.qmd + _quarto.yml)
    expect(bundle.files.length).toBe(4);

    // The two QMD files with changes should have origin='active-document'
    const changedQmdFiles = bundle.files.filter(
      f => f.filename.endsWith('.qmd') && f.origin === 'active-document'
    );
    expect(changedQmdFiles).toHaveLength(2);
    const changedQmdFilenames = changedQmdFiles.map(f => f.filename).sort();
    expect(changedQmdFilenames).toEqual(['debug-example.qmd', 'document.qmd']);

    // The unchanged QMD file should be included with origin='embedded'
    const embeddedQmdFiles = bundle.files.filter(
      f => f.filename.endsWith('.qmd') && f.origin === 'embedded'
    );
    expect(embeddedQmdFiles).toHaveLength(1);
    expect(embeddedQmdFiles[0]?.filename).toBe('doc-translation.qmd');
    expect(embeddedQmdFiles[0]?.content).toContain('Translation content');

    // The project config should be included
    const projectConfigFiles = bundle.files.filter(f => f.filename === '_quarto.yml');
    expect(projectConfigFiles).toHaveLength(1);
    expect(projectConfigFiles[0]?.origin).toBe('project-config');
  });

  it('should provide correct operation snapshots for git submission with multi-page changes', async () => {
    // Create multi-page document
    const changes = buildChangesWithElements([
      {
        id: 'document.para-1',
        content: 'Original text',
        metadata: baseMetadata,
        sourcePosition: { line: 3, column: 0 },
      },
      {
        id: 'debug-example.para-1',
        content: 'Another section',
        metadata: baseMetadata,
        sourcePosition: { line: 3, column: 0 },
      },
    ]);

    // Make edits to both pages
    changes.edit('document.para-1', 'Original text Test');
    changes.edit('debug-example.para-1', 'Another section Test');

    // Get operation snapshots (used for git submission)
    const exporter = new QmdExportService(changes, {
      git: mockGitModule,
    });
    const snapshots = await exporter.getOperationSnapshots('clean');

    console.log('Operation snapshots:', snapshots.map(s => ({
      filename: s.filename,
      operation: s.operation.elementId,
      contentPreview: s.content.substring(0, 50),
    })));

    // Should have 2 snapshots (one for each operation)
    expect(snapshots).toHaveLength(2);

    // First snapshot should be for document.qmd
    const documentSnapshot = snapshots.find(s => s.filename === 'document.qmd');
    expect(documentSnapshot).toBeDefined();
    expect(documentSnapshot?.content).toContain('Original text Test');
    expect(documentSnapshot?.operation.elementId).toBe('document.para-1');

    // Second snapshot should be for debug-example.qmd
    const debugSnapshot = snapshots.find(s => s.filename === 'debug-example.qmd');
    expect(debugSnapshot).toBeDefined();
    expect(debugSnapshot?.content).toContain('Another section Test');
    expect(debugSnapshot?.operation.elementId).toBe('debug-example.para-1');
  });
});
