/**
 * Example project workflow integration tests.
 *
 * These tests simulate the "two document" workflow from the example
 * directory by editing paragraphs in both `document.qmd` and
 * `doc-translation.qmd`. We verify that the exporter produces both
 * clean and critic bundles with the expected edits and that the
 * GitReviewService submits those edits through a mocked provider.
 */

import { describe, it, expect, vi } from 'vitest';
import { ChangesModule } from '@modules/changes';
import { QmdExportService } from '@modules/export';
import GitReviewService from '@modules/git/review-service';
import type { Element, ElementMetadata } from '@/types';
import type { GitModule } from '@modules/git';
import type { EmbeddedSourceRecord } from '@modules/git/fallback';

const baseMetadata: ElementMetadata = {
  type: 'Para',
};

const exampleSources: EmbeddedSourceRecord[] = [
  {
    filename: 'document.qmd',
    content: [
      '---',
      'title: "Example Document"',
      '---',
      '',
      'Document paragraph.',
    ].join('\n'),
    originalContent: [
      '---',
      'title: "Example Document"',
      '---',
      '',
      'Document paragraph.',
    ].join('\n'),
    lastModified: new Date().toISOString(),
    version: '1',
  },
  {
    filename: 'doc-translation.qmd',
    content: [
      '---',
      'title: "Translation Document"',
      '---',
      '',
      'Translation paragraph.',
    ].join('\n'),
    originalContent: [
      '---',
      'title: "Translation Document"',
      '---',
      '',
      'Translation paragraph.',
    ].join('\n'),
    lastModified: new Date().toISOString(),
    version: '1',
  },
  {
    filename: '_quarto.yml',
    content: 'project:\n  type: website\n',
    originalContent: 'project:\n  type: website\n',
    lastModified: new Date().toISOString(),
    version: '1',
  },
];

function buildExampleChanges(): ChangesModule {
  const changes = new ChangesModule();
  (changes as unknown as { originalElements: Element[] }).originalElements = [
    {
      id: 'document.para-1',
      content: 'Document paragraph.',
      metadata: baseMetadata,
    },
    {
      id: 'doc-translation.para-1',
      content: 'Translation paragraph.',
      metadata: baseMetadata,
    },
  ];
  return changes;
}

function createGitModuleMocks() {
  const submitReviewMock = vi.fn().mockResolvedValue({
    branchName: 'review/example',
    baseBranch: 'main',
    pullRequest: {
      number: 42,
      title: 'Example Review',
      body: 'Automated submission',
      state: 'open',
      author: 'bot',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      url: 'https://example.test/pr/42',
    },
    files: [],
    reusedPullRequest: false,
  });

  const git = {
    isEnabled: vi.fn().mockReturnValue(true),
    getConfig: vi.fn().mockReturnValue({
      provider: 'github',
      repository: {
        owner: 'example',
        name: 'docs',
        baseBranch: 'main',
        sourceFile: 'document.qmd',
      },
    }),
    listEmbeddedSources: vi.fn().mockResolvedValue(exampleSources),
    ensureRepositoryInitialized: vi
      .fn()
      .mockResolvedValue({ baseBranch: 'main' }),
    submitReview: submitReviewMock,
    getFallbackStore: vi.fn().mockReturnValue({
      saveFile: vi.fn().mockResolvedValue({
        version: 'v1',
        timestamp: new Date().toISOString(),
      }),
    }),
  } as unknown as GitModule & {
    submitReview: ReturnType<typeof vi.fn>;
  };

  return { git, submitReviewMock };
}

describe('Example project multi-document workflow', () => {
  it('exports a clean bundle with edits across both example documents', async () => {
    const changes = buildExampleChanges();
    changes.edit(
      'document.para-1',
      'Document paragraph. Added reviewer note.'
    );
    changes.edit(
      'doc-translation.para-1',
      'Translation paragraph. Added translator note.'
    );

    const { git } = createGitModuleMocks();
    const exporter = new QmdExportService(changes, { git });

    const bundle = await exporter.createBundle({ format: 'clean' });
    const documentFile = bundle.files.find(
      (file) => file.filename === 'document.qmd'
    );
    const translationFile = bundle.files.find(
      (file) => file.filename === 'doc-translation.qmd'
    );

    expect(documentFile?.content).toContain('Added reviewer note.');
    expect(documentFile?.content).not.toContain('{++');
    expect(translationFile?.content).toContain('Added translator note.');
    expect(translationFile?.content).not.toContain('{++');
  });

  it('exports a critic bundle showing tracked additions for both documents', async () => {
    const changes = buildExampleChanges();
    changes.setElementBaseline('document.para-1', 'Document paragraph.');
    changes.setElementBaseline('doc-translation.para-1', 'Translation paragraph.');
    changes.edit(
      'document.para-1',
      'Document paragraph. Added reviewer note.'
    );
    changes.edit(
      'doc-translation.para-1',
      'Translation paragraph. Added translator note.'
    );

    const { git } = createGitModuleMocks();
    const exporter = new QmdExportService(changes, { git });

    const bundle = await exporter.createBundle({ format: 'critic' });
    const documentFile = bundle.files.find(
      (file) => file.filename === 'document.qmd'
    );
    const translationFile = bundle.files.find(
      (file) => file.filename === 'doc-translation.qmd'
    );

    expect(documentFile?.content).toMatch(/\{\+\+Added reviewer note\.\+\+\}/);
    expect(translationFile?.content).toMatch(
      /\{\+\+Added translator note\.\+\+\}/
    );
  });

  it('submits a git review containing both documents via the mocked provider', async () => {
    const changes = buildExampleChanges();
    changes.edit(
      'document.para-1',
      'Document paragraph. Added reviewer note.'
    );
    changes.edit(
      'doc-translation.para-1',
      'Translation paragraph. Added translator note.'
    );

    const { git, submitReviewMock } = createGitModuleMocks();
    const exporter = new QmdExportService(changes, { git });
    const reviewService = new GitReviewService(git, exporter);

    await reviewService.submitReview({
      reviewer: 'qa-user',
      commitMessage: 'Update example documents',
      pullRequest: {
        title: 'Example workflow review',
        body: 'Please review the example document updates.',
      },
    });

    expect(submitReviewMock).toHaveBeenCalledTimes(1);
    const payload = submitReviewMock.mock.calls[0]?.[0];
    expect(payload).toBeTruthy();

    const documentFile = payload.files.find(
      (file: { path: string }) => file.path === 'document.qmd'
    );
    const translationFile = payload.files.find(
      (file: { path: string }) => file.path === 'doc-translation.qmd'
    );

    expect(documentFile?.content).toContain('Added reviewer note.');
    expect(translationFile?.content).toContain('Added translator note.');
    expect(
      payload.files.some((file: { path: string }) => file.path === '_quarto.yml')
    ).toBe(false);
  });
});
