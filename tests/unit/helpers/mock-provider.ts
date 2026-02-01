import { vi } from 'vitest';
import {
  BaseProvider,
  type PullRequest,
  type Issue,
  type RepositoryInitOptions,
} from '@/modules/git/providers/base';
import type {
  CreateBranchResult,
  FileUpsertResult,
  GitUser,
  RepositoryFile,
  ReviewCommentInput,
  ReviewCommentResult,
} from '@/modules/git/types';

export class MockProvider extends BaseProvider {
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
  createRepository = vi.fn<
    [RepositoryInitOptions],
    Promise<{ defaultBranch: string }>
  >();
  hasWriteAccess = vi.fn<[], Promise<boolean>>();
}
