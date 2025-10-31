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

type MockGitModule = Pick<GitModule, 'isEnabled' | 'getConfig' | 'submitReview'>;
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
    getConfigMock = vi.fn().mockReturnValue({
      provider: 'github',
      repository: {
        owner: 'owner',
        name: 'repo',
        baseBranch: 'main',
      },
    });

    git = {
      isEnabled: isEnabledMock,
      submitReview: submitReviewMock,
      getConfig: getConfigMock,
    };

    createBundleMock = vi.fn().mockResolvedValue(bundleFixture);
    exporter = {
      createBundle: createBundleMock,
    } as MockExportService;

    service = new GitReviewService(git as GitModule, exporter as QmdExportService);
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
});
