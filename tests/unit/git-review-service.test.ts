import { describe, it, expect, beforeEach, vi } from 'vitest';
import GitReviewService, {
  type SubmitReviewOptions,
} from '@/modules/git/review-service';
import type GitModule from '@/modules/git';
import type QmdExportService from '@/modules/export';
import type { ReviewSubmissionResult } from '@/modules/git';

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
>;
type MockExportService = Pick<QmdExportService, 'createBundle'>;

describe('GitReviewService', () => {
  let git: MockGitModule;
  let exporter: MockExportService;
  let service: GitReviewService;
  let bundleFixture: ReturnType<typeof buildBundle>;
  let isEnabledMock: ReturnType<typeof vi.fn>;
  let submitReviewMock: ReturnType<typeof vi.fn>;
  let getConfigMock: ReturnType<typeof vi.fn>;
  let createBundleMock: ReturnType<typeof vi.fn>;
  let getFallbackStoreMock: ReturnType<typeof vi.fn>;
  let fallbackStoreSaveMock: ReturnType<typeof vi.fn>;
  let requiresAuthTokenMock: ReturnType<typeof vi.fn>;
  let setAuthTokenMock: ReturnType<typeof vi.fn>;

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

    git = {
      isEnabled: isEnabledMock,
      submitReview: submitReviewMock,
      getConfig: getConfigMock,
      getFallbackStore: getFallbackStoreMock,
      requiresAuthToken: requiresAuthTokenMock,
      setAuthToken: setAuthTokenMock,
    };

    createBundleMock = vi.fn().mockResolvedValue(bundleFixture);
    exporter = {
      createBundle: createBundleMock,
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
      format: undefined,
    });

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

    expect(createBundleMock).toHaveBeenCalledWith({ format: 'critic' });

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
});
