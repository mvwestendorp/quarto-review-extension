import { describe, it, expect, beforeEach, vi } from 'vitest';
import GitReviewService, {
  type SubmitReviewOptions,
} from '@/modules/git/review-service';
import type GitModule from '@/modules/git';
import type QmdExportService from '@/modules/export';
import type {
  ReviewSubmissionResult,
  ReviewSubmissionPayload,
} from '@/modules/git';
import type { Operation } from '@/types';
import type { OperationSnapshot } from '@/modules/export';

const buildBundle = () => ({
  files: [
    {
      filename: 'document.qmd',
      content: 'Hello world',
      origin: 'active-document' as const,
      primary: true,
    },
    {
      filename: '_quarto.yml',
      content: 'project: website',
      origin: 'project-config' as const,
    },
  ],
  primaryFilename: 'document.qmd',
  suggestedArchiveName: 'document-20240101.zip',
  format: 'clean' as const,
  forceArchive: true,
});

const buildDefaultGitConfig = () => ({
  provider: 'github' as const,
  repository: {
    owner: 'owner',
    name: 'repo',
    baseBranch: 'main',
  },
});

type MockGitModule = Pick<
  GitModule,
  | 'isEnabled'
  | 'getConfig'
  | 'submitReview'
  | 'getFallbackStore'
  | 'requiresAuthToken'
  | 'setAuthToken'
  | 'listEmbeddedSources'
  | 'ensureRepositoryInitialized'
>;
type MockExportService = Pick<
  QmdExportService,
  'createBundle' | 'getOperationSnapshots'
>;

describe('GitReviewService', () => {
  let git: MockGitModule;
  let exporter: MockExportService;
  let service: GitReviewService;
  let bundleFixture: ReturnType<typeof buildBundle>;
  let isEnabledMock: ReturnType<typeof vi.fn>;
  let submitReviewMock: ReturnType<typeof vi.fn>;
  let getConfigMock: ReturnType<typeof vi.fn>;
  let createBundleMock: ReturnType<typeof vi.fn>;
  let getOperationSnapshotsMock: ReturnType<typeof vi.fn>;
  let getFallbackStoreMock: ReturnType<typeof vi.fn>;
  let fallbackStoreSaveMock: ReturnType<typeof vi.fn>;
  let requiresAuthTokenMock: ReturnType<typeof vi.fn>;
  let setAuthTokenMock: ReturnType<typeof vi.fn>;
  let listEmbeddedSourcesMock: ReturnType<typeof vi.fn>;
  let ensureRepositoryInitializedMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    bundleFixture = buildBundle();

    isEnabledMock = vi.fn().mockReturnValue(true);
    submitReviewMock = vi.fn().mockResolvedValue({
      branchName: 'feature/review',
      baseBranch: 'main',
      pullRequest: {
        number: 101,
        title: 'Review',
        body: '',
        state: 'open',
        author: 'bot',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        url: 'https://example.test/pr/101',
      },
      files: [
        {
          path: 'document.qmd',
          sha: 'abc',
          commitSha: 'def',
        },
      ],
      reusedPullRequest: false,
    } satisfies ReviewSubmissionResult);
    getConfigMock = vi.fn().mockReturnValue(buildDefaultGitConfig());

    fallbackStoreSaveMock = vi.fn().mockResolvedValue({
      version: 'v1',
      timestamp: new Date().toISOString(),
    });
    getFallbackStoreMock = vi.fn().mockReturnValue({
      saveFile: fallbackStoreSaveMock,
    });
    requiresAuthTokenMock = vi.fn().mockReturnValue(false);
    setAuthTokenMock = vi.fn();
    listEmbeddedSourcesMock = vi.fn().mockResolvedValue([]);
    ensureRepositoryInitializedMock = vi.fn().mockImplementation(async (sources, fallbackBase) => ({
      baseBranch: fallbackBase,
    }));

    git = {
      isEnabled: isEnabledMock,
      submitReview: submitReviewMock,
      getConfig: getConfigMock,
      getFallbackStore: getFallbackStoreMock,
      requiresAuthToken: requiresAuthTokenMock,
      setAuthToken: setAuthTokenMock,
      listEmbeddedSources: listEmbeddedSourcesMock,
      ensureRepositoryInitialized: ensureRepositoryInitializedMock,
    };

    createBundleMock = vi.fn().mockResolvedValue(bundleFixture);
    getOperationSnapshotsMock = vi.fn().mockResolvedValue([
      buildOperationSnapshot(),
    ]);
    exporter = {
      createBundle: createBundleMock,
      getOperationSnapshots: getOperationSnapshotsMock,
    } as MockExportService;

    service = new GitReviewService(git as GitModule, exporter as QmdExportService);
  });

  it('reports when personal access token is required', () => {
    requiresAuthTokenMock.mockReturnValueOnce(true);
    expect(service.requiresAuthToken()).toBe(true);
    requiresAuthTokenMock.mockReturnValue(false);
    expect(service.requiresAuthToken()).toBe(false);
  });

  it('updates auth token through git module', () => {
    service.updateAuthToken('secret');
    expect(setAuthTokenMock).toHaveBeenCalledWith('secret');
  });

  it('supports Azure DevOps submissions', async () => {
    getConfigMock.mockReturnValue({
      provider: 'azure-devops',
      repository: {
        owner: 'example-org',
        name: 'docs-repo',
        baseBranch: 'main',
      },
      options: {
        project: 'Website',
      },
    });

    await expect(
      service.submitReview({
        reviewer: 'carol',
        pullRequest: {
          title: 'Review for Azure DevOps',
        },
      })
    ).resolves.toBeTruthy();

    getConfigMock.mockReturnValue(buildDefaultGitConfig());
  });

  it('requests bundles without embedded comments for git submissions', async () => {
    await service.submitReview({
      reviewer: 'grace',
      pullRequest: { title: 'Review' },
    });

    expect(createBundleMock).toHaveBeenCalledWith({
      format: 'clean',
      includeCommentsInOutput: false,
    });
  });

  it('throws for unsupported providers', async () => {
    getConfigMock.mockReturnValue({
      provider: 'local',
      repository: {
        owner: 'owner',
        name: 'repo',
        baseBranch: 'main',
      },
    });

    await expect(
      service.submitReview({
        reviewer: 'dave',
        pullRequest: { title: 'Review' },
      })
    ).rejects.toThrow(
      'Automated review submission is not yet supported for local.'
    );

    getConfigMock.mockReturnValue(buildDefaultGitConfig());
  });

  it('throws when git integration is disabled', async () => {
    isEnabledMock.mockReturnValue(false);

    await expect(() =>
      service.submitReview({
        reviewer: 'alice',
        pullRequest: { title: 'Review' },
      })
    ).rejects.toThrow('Git integration is not configured');
  });

  it('omits unchanged auxiliary files from submission payload', async () => {
    await service.submitReview({
      reviewer: 'eve',
      pullRequest: { title: 'Review' },
    });

    const payload = submitReviewMock.mock.calls[0][0] as ReviewSubmissionPayload;
    expect(payload.files).toHaveLength(1);
    expect(payload.files?.[0]?.path).toBe('document.qmd');
  });

  it('throws when no tracked operations are available', async () => {
    getOperationSnapshotsMock.mockResolvedValue([]);
    await expect(
      service.submitReview({
        reviewer: 'frank',
        pullRequest: { title: 'No changes' },
      })
    ).rejects.toThrow('No tracked document changes were found');
    getOperationSnapshotsMock.mockResolvedValue([buildOperationSnapshot()]);
  });

  it('creates review submission payload from export bundle', async () => {
    const options: SubmitReviewOptions = {
      reviewer: 'alice',
      pullRequest: {
        title: 'Review changes',
        body: 'Automated submission',
      },
      comments: [
        {
          path: 'document.qmd',
          body: 'Looks good!',
          line: 10,
        },
      ],
      commitMessage: 'Update document',
    };

    const context = await service.submitReview(options);

    expect(createBundleMock).toHaveBeenCalledWith({
      format: 'clean',
      includeCommentsInOutput: false,
    });
    expect(getOperationSnapshotsMock).toHaveBeenCalledWith('clean');

    expect(submitReviewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewer: 'alice',
        branchName: undefined,
        baseBranch: 'main',
        commitMessage: 'Update document',
        pullRequest: {
          title: 'Review changes',
          body: 'Automated submission',
          draft: undefined,
          updateExisting: undefined,
          number: undefined,
        },
        comments: [
          {
            path: 'document.qmd',
            body: 'Looks good!',
            line: 10,
          },
        ],
      })
    );

    expect(context.bundle).toEqual(bundleFixture);
    expect(context.result.pullRequest.number).toBe(101);
  });

  it('allows overriding branch and format', async () => {
    const options: SubmitReviewOptions = {
      reviewer: 'bob',
      branchName: 'feature/bob-review',
      baseBranch: 'develop',
      format: 'critic',
      pullRequest: {
        title: 'Critic review',
        draft: true,
      },
    };

    await service.submitReview(options);

    expect(createBundleMock).toHaveBeenCalledWith({
      format: 'critic',
      includeCommentsInOutput: false,
    });
    expect(getOperationSnapshotsMock).toHaveBeenCalledWith('critic');

    expect(submitReviewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewer: 'bob',
        branchName: 'feature/bob-review',
        baseBranch: 'develop',
        pullRequest: expect.objectContaining({
          title: 'Critic review',
          draft: true,
        }),
      })
    );
  });

  it('returns repository configuration when available', () => {
    const repo = service.getRepositoryConfig();
    expect(repo).toEqual({
      owner: 'owner',
      name: 'repo',
      baseBranch: 'main',
    });
  });

  it('persists fallback payload when submission fails', async () => {
    const error = new Error('Network error');
    submitReviewMock.mockRejectedValueOnce(error);

    await expect(
      service.submitReview({
        reviewer: 'alice',
        pullRequest: { title: 'Review changes' },
      })
    ).rejects.toThrow('Network error');

    expect(fallbackStoreSaveMock).toHaveBeenCalledTimes(1);
    const [filename, content] = fallbackStoreSaveMock.mock.calls[0].slice(0, 2);
    expect(filename).toMatch(/review-fallback-/);
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('supports GitLab submissions', async () => {
    getConfigMock.mockReturnValue({
      provider: 'gitlab',
      repository: {
        owner: 'group',
        name: 'repo',
        baseBranch: 'main',
      },
    });

    await expect(
      service.submitReview({
        reviewer: 'erin',
        pullRequest: { title: 'Review' },
      })
    ).resolves.toBeTruthy();
    expect(submitReviewMock).toHaveBeenCalled();

    getConfigMock.mockReturnValue(buildDefaultGitConfig());
  });

  it('creates per-operation file changes when snapshots are available', async () => {
    const operations: Operation[] = [
      {
        id: 'op-1',
        type: 'edit',
        elementId: 'para-1',
        timestamp: 1,
        userId: 'tester',
        data: {
          type: 'edit',
          oldContent: 'old',
          newContent: 'new',
          changes: [],
          newMetadata: { type: 'Para' },
        },
      },
      {
        id: 'op-2',
        type: 'insert',
        elementId: 'para-2',
        timestamp: 2,
        userId: 'tester',
        data: {
          type: 'insert',
          content: 'extra',
          metadata: { type: 'Para' },
          position: { after: 'para-1' },
        },
      },
    ];

    getOperationSnapshotsMock.mockResolvedValue([
      {
        filename: 'document.qmd',
        content: 'state-1',
        operation: operations[0],
        index: 0,
      },
      {
        filename: 'document.qmd',
        content: 'state-2',
        operation: operations[1],
        index: 1,
      },
    ]);

    await service.submitReview({
      reviewer: 'zoe',
      commitMessage: 'Review updates',
      pullRequest: { title: 'Snapshot review' },
    });

    expect(getOperationSnapshotsMock).toHaveBeenCalledWith('clean');
    const payload = submitReviewMock.mock.calls[0]?.[0];
    expect(payload?.files).toEqual([
      {
        path: 'document.qmd',
        content: 'Hello world',
        message:
          'document.qmd: edit Para (step 1); document.qmd: insert Para (step 2)',
      },
    ]);
  });
});
const buildOperationSnapshot = (
  overrides: Partial<OperationSnapshot> = {}
): OperationSnapshot => {
  const baseOperation: Operation = {
    id: 'op-1',
    type: 'edit',
    elementId: 'page-1.p1',
    timestamp: Date.now(),
    data: {
      type: 'edit',
      oldContent: 'old',
      newContent: 'new',
      changes: [],
    },
  };
  return {
    filename: 'document.qmd',
    content: 'Updated content',
    operation: baseOperation,
    index: 0,
    ...overrides,
  };
};
