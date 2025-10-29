/**
 * Local Git Provider
 * For local-only git operations without remote API
 */

import { BaseProvider, type PullRequest, type Issue } from './base';
import type {
  CreateBranchResult,
  FileUpsertResult,
  GitUser,
  RepositoryFile,
  ReviewCommentInput,
  ReviewCommentResult,
} from '../types';

export class LocalProvider extends BaseProvider {
  constructor() {
    super({
      url: '',
      owner: 'local',
      repo: 'local',
    });
  }

  protected getAuthHeader(): string | undefined {
    return undefined;
  }

  getCurrentUser(): Promise<GitUser> {
    return Promise.resolve({ login: 'local' });
  }

  createBranch(): Promise<CreateBranchResult> {
    return Promise.reject(
      new Error('Branches are not supported for local provider')
    );
  }

  getFileContent(): Promise<RepositoryFile | null> {
    return Promise.reject(
      new Error('File access is not supported for local provider')
    );
  }

  createOrUpdateFile(): Promise<FileUpsertResult> {
    return Promise.reject(
      new Error('File writes are not supported for local provider')
    );
  }

  createPullRequest(): Promise<PullRequest> {
    return Promise.reject(
      new Error('Pull requests not supported for local provider')
    );
  }

  getPullRequest(): Promise<PullRequest> {
    return Promise.reject(
      new Error('Pull requests not supported for local provider')
    );
  }

  updatePullRequest(): Promise<PullRequest> {
    return Promise.reject(
      new Error('Pull requests not supported for local provider')
    );
  }

  listPullRequests(): Promise<PullRequest[]> {
    return Promise.resolve([]);
  }

  mergePullRequest(): Promise<void> {
    return Promise.reject(
      new Error('Pull requests not supported for local provider')
    );
  }

  createReviewComments(
    _number: number,
    _comments: ReviewCommentInput[],
    _commitSha: string
  ): Promise<ReviewCommentResult[]> {
    return Promise.resolve([]);
  }

  createIssue(): Promise<Issue> {
    return Promise.reject(new Error('Issues not supported for local provider'));
  }

  getIssue(): Promise<Issue> {
    return Promise.reject(new Error('Issues not supported for local provider'));
  }

  listIssues(): Promise<Issue[]> {
    return Promise.resolve([]);
  }

  addPullRequestComment(): Promise<void> {
    return Promise.reject(
      new Error('Comments not supported for local provider')
    );
  }

  addIssueComment(): Promise<void> {
    return Promise.reject(
      new Error('Comments not supported for local provider')
    );
  }

  getRepository(): Promise<{
    name: string;
    description: string;
    url: string;
    defaultBranch: string;
  }> {
    return Promise.resolve({
      name: 'local',
      description: 'Local repository',
      url: '',
      defaultBranch: 'main',
    });
  }

  hasWriteAccess(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

export default LocalProvider;
