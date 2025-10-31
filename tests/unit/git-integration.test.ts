import { describe, it, expect, beforeEach, vi } from 'vitest';
import GitIntegrationService, {
  type ReviewSubmissionPayload,
  type ReviewSubmissionResult,
} from '@/modules/git/integration';
import type { ResolvedGitConfig } from '@/modules/git/types';
import {
  BaseProvider,
  type PullRequest,
  type Issue,
} from '@/modules/git/providers/base';
import type {
  CreateBranchResult,
  FileUpsertResult,
  GitUser,
  RepositoryFile,
  ReviewCommentInput,
  ReviewCommentResult,
} from '@/modules/git/types';

class MockProvider extends BaseProvider {
  constructor() {
    super({
      url: 'https://api.example.com',
      owner: 'owner',
      repo: 'repo',
    });
  }

  protected getAuthHeader(): string | undefined {
    return 'Bearer test-token';
  }

  getCurrentUser = vi.fn<[], Promise<GitUser>>();
  createBranch = vi.fn<
    [string, string],
    Promise<CreateBranchResult>
  >();
  getFileContent = vi.fn<
    [string, string],
    Promise<RepositoryFile | null>
  >();
  createOrUpdateFile = vi.fn<
    [string, string, string, string, string | undefined],
    Promise<FileUpsertResult>
  >();
  createPullRequest = vi.fn<
    [string, string, string, string],
    Promise<PullRequest>
  >();
  updatePullRequest = vi.fn<
    [number, Partial<Pick<PullRequest, 'title' | 'body'>>],
    Promise<PullRequest>
  >();
  getPullRequest = vi.fn<[number], Promise<PullRequest>>();
  listPullRequests = vi.fn<
    [state?: 'open' | 'closed' | 'all'],
    Promise<PullRequest[]>
  >();
  mergePullRequest = vi.fn<
    [number, 'merge' | 'squash' | 'rebase' | undefined],
    Promise<void>
  >();
  createReviewComments = vi.fn<
    [number, ReviewCommentInput[], string],
    Promise<ReviewCommentResult[]>
  >();
  createIssue = vi.fn<
    [string, string],
    Promise<Issue>
  >();
  getIssue = vi.fn<[number], Promise<Issue>>();
  listIssues = vi.fn<
    [state?: 'open' | 'closed' | 'all'],
    Promise<Issue[]>
  >();
  addPullRequestComment = vi.fn<[number, string], Promise<void>>();
  addIssueComment = vi.fn<[number, string], Promise<void>>();
  getRepository = vi.fn<
    [],
    Promise<{
      name: string;
      description: string;
      url: string;
      defaultBranch: string;
    }>
  >();
  hasWriteAccess = vi.fn<[], Promise<boolean>>();
}

const baseConfig: ResolvedGitConfig = {
  provider: 'github',
  repository: {
    owner: 'owner',
    name: 'repo',
    baseBranch: 'main',
  },
};

describe('GitIntegrationService', () => {
  let provider: MockProvider;
  let service: GitIntegrationService;

  beforeEach(() => {
    provider = new MockProvider();
    service = new GitIntegrationService(provider, baseConfig);
  });

  const createPayload = (
    overrides: Partial<ReviewSubmissionPayload> = {}
  ): ReviewSubmissionPayload => ({
    reviewer: 'reviewer',
    branchName: 'feature/review',
    files: [
      {
        path: 'document.qmd',
        content: 'Updated content',
        message: 'Update document',
      },
    ],
    pullRequest: {
      title: 'Review updates',
      body: 'Automated review submission',
    },
    ...overrides,
  });

  const createPullRequestStub = (overrides: Partial<PullRequest> = {}): PullRequest => ({
    number: 42,
    title: 'Review updates',
    body: 'Automated review submission',
    state: 'open',
    author: 'robot',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    url: 'https://example.com/pr/42',
    headRef: 'feature/review',
    baseRef: 'main',
    draft: false,
    ...overrides,
  });

  it('creates branch, commits files, and opens pull request', async () => {
    provider.createBranch.mockResolvedValue({
      name: 'feature/review',
      sha: 'base-sha',
    });
    provider.getFileContent.mockResolvedValue(null);
    provider.createOrUpdateFile.mockResolvedValue({
      path: 'document.qmd',
      sha: 'new-sha',
      commitSha: 'commit-sha',
    });
    provider.listPullRequests.mockResolvedValue([]);
    provider.createPullRequest.mockResolvedValue(
      createPullRequestStub()
    );
    provider.createReviewComments.mockResolvedValue([]);

    const payload = createPayload();
    const result = (await service.submitReview(payload)) as ReviewSubmissionResult;

    expect(provider.createBranch).toHaveBeenCalledWith(
      'feature/review',
      'main'
    );
    expect(provider.createOrUpdateFile).toHaveBeenCalledWith(
      'document.qmd',
      'Updated content',
      'Update document',
      'feature/review',
      undefined
    );
    expect(provider.createPullRequest).toHaveBeenCalledWith(
      'Review updates',
      'Automated review submission',
      'feature/review',
      'main'
    );
    expect(result.branchName).toBe('feature/review');
    expect(result.pullRequest.number).toBe(42);
    expect(result.files[0]).toEqual({
      path: 'document.qmd',
      sha: 'new-sha',
      commitSha: 'commit-sha',
    });
  });

  it('reuses branch when it already exists', async () => {
    const existsError = Object.assign(new Error('Reference already exists'), {
      status: 422,
    });

    provider.createBranch.mockRejectedValue(existsError);
    provider.getFileContent.mockResolvedValue(null);
    provider.createOrUpdateFile.mockResolvedValue({
      path: 'document.qmd',
      sha: 'new-sha',
      commitSha: 'commit-sha',
    });
    provider.listPullRequests.mockResolvedValue([]);
    provider.createPullRequest.mockResolvedValue(
      createPullRequestStub()
    );
    provider.createReviewComments.mockResolvedValue([]);

    await expect(service.submitReview(createPayload())).resolves.toBeTruthy();
    expect(provider.createPullRequest).toHaveBeenCalled();
  });

  it('updates existing pull request when branch already has an open PR', async () => {
    provider.createBranch.mockResolvedValue({
      name: 'feature/review',
      sha: 'base-sha',
    });
    provider.getFileContent.mockResolvedValue(null);
    provider.createOrUpdateFile.mockResolvedValue({
      path: 'document.qmd',
      sha: 'new-sha',
      commitSha: 'commit-sha',
    });

    const existing = createPullRequestStub({ number: 99 });
    provider.listPullRequests.mockResolvedValue([existing]);
    provider.updatePullRequest.mockResolvedValue({
      ...existing,
      title: 'Review updates',
    });
    provider.createReviewComments.mockResolvedValue([]);

    const result = await service.submitReview(createPayload());

    expect(provider.createPullRequest).not.toHaveBeenCalled();
    expect(provider.updatePullRequest).toHaveBeenCalledWith(99, {
      title: 'Review updates',
      body: 'Automated review submission',
    });
    expect(result.reusedPullRequest).toBe(true);
  });

  it('posts inline review comments when commit SHA is available', async () => {
    provider.createBranch.mockResolvedValue({
      name: 'feature/review',
      sha: 'base-sha',
    });
    provider.getFileContent.mockResolvedValue(null);
    provider.createOrUpdateFile.mockResolvedValue({
      path: 'document.qmd',
      sha: 'new-sha',
      commitSha: 'commit-sha',
    });
    provider.listPullRequests.mockResolvedValue([]);
    provider.createPullRequest.mockResolvedValue(
      createPullRequestStub()
    );
    provider.createReviewComments.mockResolvedValue([]);

    const payload = createPayload({
      comments: [
        {
          path: 'document.qmd',
          body: 'Consider rephrasing this paragraph.',
          line: 12,
        },
      ],
    });

    await service.submitReview(payload);

    expect(provider.createReviewComments).toHaveBeenCalledWith(
      42,
      [
        {
          path: 'document.qmd',
          body: 'Consider rephrasing this paragraph.',
          line: 12,
        },
      ],
      'commit-sha'
    );
  });

  it('skips inline comments when no commit SHA is available', async () => {
    provider.createBranch.mockResolvedValue({
      name: 'feature/review',
      sha: 'base-sha',
    });
    provider.getFileContent.mockResolvedValue(null);
    provider.createOrUpdateFile.mockResolvedValue({
      path: 'document.qmd',
      sha: 'new-sha',
      commitSha: '',
    });
    provider.listPullRequests.mockResolvedValue([]);
    provider.createPullRequest.mockResolvedValue(
      createPullRequestStub()
    );
    provider.createReviewComments.mockResolvedValue([]);

    const payload = createPayload({
      comments: [
        {
          path: 'document.qmd',
          body: 'Consider rephrasing this paragraph.',
          line: 12,
        },
      ],
    });

    await service.submitReview(payload);

    expect(provider.createReviewComments).not.toHaveBeenCalled();
  });

  it('validates required payload fields', async () => {
    await expect(
      service.submitReview(
        createPayload({
          reviewer: '',
        })
      )
    ).rejects.toThrow('Reviewer information is required');

    await expect(
      service.submitReview(
        createPayload({
          files: [],
        })
      )
    ).rejects.toThrow('At least one file change must be provided');

    await expect(
      service.submitReview(
        createPayload({
          files: [{ path: '', content: 'abc' }],
        })
      )
    ).rejects.toThrow('File path is required for each change');

    await expect(
      service.submitReview(
        createPayload({
          pullRequest: {
            title: '',
          },
        })
      )
    ).rejects.toThrow('Pull request title is required');
  });
});
