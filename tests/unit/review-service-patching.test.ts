import { describe, it, expect, vi } from 'vitest';
import { GitReviewService } from '@/modules/git/review-service';
import QmdExportService from '@modules/export';
import type { OperationSnapshot } from '@modules/export';
import type { Operation } from '@/types';

describe('GitReviewService — patched vs reconstructed submission', () => {
  // Source uses 3-space list markers; pandoc normalises to 1-space.
  const originalSource = [
    '---',
    'title: "Test"',
    '---',
    '',
    'Intro paragraph.',
    '',
    '-   item one',
    '-   item two',
    '-   item three',
    '',
    'Outro paragraph.',
  ].join('\n');

  const originalElements = [
    {
      id: 'p-intro',
      content: 'Intro paragraph.',
      metadata: { type: 'Para' as const },
      sourcePosition: { line: 5, column: 1 },
    },
    {
      id: 'list-1',
      content: '- item one\n- item two\n- item three',
      metadata: { type: 'BulletList' as const },
      // No sourcePosition — triggers content-search fallback
    },
    {
      id: 'p-outro',
      content: 'Outro paragraph.',
      metadata: { type: 'Para' as const },
      sourcePosition: { line: 11, column: 1 },
    },
  ];

  const editOp: Operation = {
    id: 'op-1',
    type: 'edit',
    elementId: 'list-1',
    timestamp: 1,
    data: {
      type: 'edit',
      oldContent: '- item one\n- item two\n- item three',
      newContent: '- item one updated\n- item two\n- item three',
      changes: [],
    },
  };

  const currentElements = originalElements.map((e) =>
    e.id === 'list-1'
      ? { ...e, content: '- item one updated\n- item two\n- item three' }
      : e
  );

  function buildExporter() {
    const changes = {
      getOperations: vi.fn().mockReturnValue([editOp]),
      getStateAfterOperations: vi
        .fn()
        .mockImplementation((count?: number) =>
          count === 0 ? originalElements : currentElements
        ),
      getCurrentState: vi.fn().mockReturnValue(currentElements),
    };
    return new QmdExportService(changes as any);
  }

  function stubExporterBookkeeping(
    exporter: QmdExportService,
    bundleContent: string
  ) {
    vi.spyOn(exporter, 'getOperationSnapshots').mockResolvedValue([
      {
        filename: 'document.qmd',
        content: bundleContent,
        operation: editOp,
        index: 0,
      } as OperationSnapshot,
    ]);
    vi.spyOn(exporter, 'createBundle').mockResolvedValue({
      files: [
        {
          filename: 'document.qmd',
          content: bundleContent,
          origin: 'active-document',
          primary: true,
        },
      ],
      primaryFilename: 'document.qmd',
      suggestedArchiveName: 'test.zip',
      format: 'clean',
    });
  }

  function buildGitModule(sourceContent: string) {
    return {
      isEnabled: vi.fn().mockReturnValue(true),
      getConfig: vi.fn().mockReturnValue({
        provider: 'github',
        repository: { owner: 'o', name: 'r', baseBranch: 'main' },
        auth: { mode: 'pat', token: 'tok' },
      }),
      listEmbeddedSources: vi.fn().mockResolvedValue([
        {
          filename: 'document.qmd',
          content: sourceContent,
          originalContent: sourceContent,
          lastModified: '',
          version: '1',
        },
      ]),
      ensureRepositoryInitialized: vi
        .fn()
        .mockResolvedValue({ baseBranch: 'main' }),
      submitReview: vi.fn().mockResolvedValue({ success: true }),
      requiresAuthToken: vi.fn().mockReturnValue(false),
      getFallbackStore: vi.fn().mockReturnValue(null),
    };
  }

  it('submits patched source when normalised content-search succeeds', async () => {
    const exporter = buildExporter();
    stubExporterBookkeeping(
      exporter,
      'PANDOC_RECONSTRUCTED: full document with formatting noise'
    );
    // patchSourceWithTrackedChanges runs for real on the exporter

    const git = buildGitModule(originalSource);
    const service = new GitReviewService(git as any, exporter);

    await service.submitReview({
      reviewer: 'tester',
      pullRequest: { title: 'Test PR' },
    });

    expect(git.submitReview).toHaveBeenCalledTimes(1);
    const submittedContent = git.submitReview.mock.calls[0][0].files[0].content;

    // Patched source was used — NOT the pandoc reconstruction
    expect(submittedContent).not.toContain('PANDOC_RECONSTRUCTED');
    // The user's edit is present
    expect(submittedContent).toContain('item one updated');
    // Surrounding structure from the original source is preserved
    expect(submittedContent).toContain('Intro paragraph.');
    expect(submittedContent).toContain('Outro paragraph.');
    expect(submittedContent).toContain('title: "Test"');
  });

  it('falls back to bundle content when patching returns null', async () => {
    // Source has no content that matches any element — patching cannot succeed
    const unrelatableSource = [
      '---',
      'title: "Test"',
      '---',
      '',
      'Completely different content with no matching elements.',
    ].join('\n');

    const bundleContent = 'PANDOC_RECONSTRUCTED: full fallback document';
    const exporter = buildExporter();
    stubExporterBookkeeping(exporter, bundleContent);

    const git = buildGitModule(unrelatableSource);
    const service = new GitReviewService(git as any, exporter);

    await service.submitReview({
      reviewer: 'tester',
      pullRequest: { title: 'Test PR' },
    });

    expect(git.submitReview).toHaveBeenCalledTimes(1);
    const submittedContent = git.submitReview.mock.calls[0][0].files[0].content;

    // Patching failed → bundle content was used as fallback
    expect(submittedContent).toBe(bundleContent);
  });
});

// ---------------------------------------------------------------------------
// Regression: prefix-match fallback for pandoc-wrapped Para elements
// ---------------------------------------------------------------------------
// pandoc.write wraps paragraphs at 72 columns.  The Lua filter post-processes
// Para output to rejoin wrapped lines, but if that post-processing is ever
// removed or broken the stored content will be only the first wrapped line —
// a strict prefix of the original source line.  The export service's
// prefix-match fallback (≥ 20-char threshold) must still locate and patch the
// element.  This suite guards that path.
describe('patchSourceWithTrackedChanges — prefix-match fallback for wrapped Para', () => {
  // A paragraph long enough to be wrapped at 72 cols.  The source keeps it on
  // one line; the element content simulates what pandoc.write would produce if
  // the Para-rejoin post-processing were absent (first 60 chars only).
  const fullParaLine =
    'This is a deliberately long paragraph that would be wrapped by pandoc at seventy two columns in the output.';
  // Simulate pandoc truncation: first line only (< 72 chars, but ≥ 20)
  const wrappedFirstLine = fullParaLine.slice(0, 60);

  const originalSource = [
    '---',
    'title: "Wrap Test"',
    '---',
    '',
    fullParaLine,
    '',
    'Short outro.',
  ].join('\n');

  const originalElements = [
    {
      id: 'p-long',
      content: wrappedFirstLine, // only the prefix — no sourcePosition
      metadata: { type: 'Para' as const },
      // intentionally no sourcePosition — forces content-search fallback
    },
    {
      id: 'p-outro',
      content: 'Short outro.',
      metadata: { type: 'Para' as const },
      sourcePosition: { line: 7, column: 1 },
    },
  ];

  const editedContent = wrappedFirstLine + ' EDITED';

  const currentElements = originalElements.map((e) =>
    e.id === 'p-long' ? { ...e, content: editedContent } : e
  );

  const editOp: Operation = {
    id: 'op-wrap-1',
    type: 'edit',
    elementId: 'p-long',
    timestamp: 1,
    data: {
      type: 'edit',
      oldContent: wrappedFirstLine,
      newContent: editedContent,
      changes: [],
    },
  };

  function buildExporter() {
    const changes = {
      getOperations: vi.fn().mockReturnValue([editOp]),
      getStateAfterOperations: vi
        .fn()
        .mockImplementation((count?: number) =>
          count === 0 ? originalElements : currentElements
        ),
      getCurrentState: vi.fn().mockReturnValue(currentElements),
    };
    return new QmdExportService(changes as any);
  }

  it('resolves the Para position via prefix-match and applies the edit', () => {
    const exporter = buildExporter();
    const patched = exporter.patchSourceWithTrackedChanges(originalSource);

    // Patching must succeed (not fall back to null)
    expect(patched).not.toBeNull();
    // The edit marker must appear in the output
    expect(patched).toContain('EDITED');
    // Surrounding structure is preserved
    expect(patched).toContain('title: "Wrap Test"');
    expect(patched).toContain('Short outro.');
  });

  it('does not match when the shared prefix is shorter than 20 chars', () => {
    // Replace the long element with a short one — prefix match threshold not met
    const shortContent = 'Too short prefix.'; // 17 chars < 20
    const shortElements = [
      { id: 'p-short', content: shortContent, metadata: { type: 'Para' as const } },
      originalElements[1]!,
    ];
    const shortCurrent = shortElements.map((e) =>
      e.id === 'p-short' ? { ...e, content: shortContent + ' EDITED' } : e
    );
    const shortOp: Operation = {
      id: 'op-short-1',
      type: 'edit',
      elementId: 'p-short',
      timestamp: 1,
      data: { type: 'edit', oldContent: shortContent, newContent: shortContent + ' EDITED', changes: [] },
    };

    const changes = {
      getOperations: vi.fn().mockReturnValue([shortOp]),
      getStateAfterOperations: vi
        .fn()
        .mockImplementation((count?: number) => (count === 0 ? shortElements : shortCurrent)),
      getCurrentState: vi.fn().mockReturnValue(shortCurrent),
    };
    const exporter = new QmdExportService(changes as any);

    // Source line that partially overlaps but is too short for prefix-match
    const shortSource = [
      '---',
      'title: "Short Test"',
      '---',
      '',
      'Too short prefix. continues with more text here.',
      '',
      'Short outro.',
    ].join('\n');

    const patched = exporter.patchSourceWithTrackedChanges(shortSource);

    // Patching should return null — element cannot be located
    expect(patched).toBeNull();
  });
});
