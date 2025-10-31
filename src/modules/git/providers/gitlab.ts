/**
 * GitLab Provider
 * GitLab-specific API implementation
 */

import {
  BaseProvider,
  type PullRequest,
  type Issue,
  type ProviderConfig,
} from './base';
import type {
  CreateBranchResult,
  FileUpsertResult,
  GitUser,
  RepositoryFile,
  ReviewCommentInput,
  ReviewCommentResult,
} from '../types';

export class GitLabProvider extends BaseProvider {
  private projectId: string;

  constructor(
    config: Omit<ProviderConfig, 'url'> & { url?: string; projectId?: string }
  ) {
    super({
      url: config.url || 'https://gitlab.com/api/v4',
      ...config,
    });
    this.projectId = config.projectId || `${config.owner}%2F${config.repo}`;
  }

  protected getAuthHeader(): string {
    return `Bearer ${this.config.token}`;
  }

  async getCurrentUser(): Promise<GitUser> {
    return this.notImplemented();
  }

  async createBranch(
    _branchName: string,
    _fromBranch: string
  ): Promise<CreateBranchResult> {
    return this.notImplemented();
  }

  async getFileContent(
    _path: string,
    _ref: string
  ): Promise<RepositoryFile | null> {
    return this.notImplemented();
  }

  async createOrUpdateFile(
    _path: string,
    _content: string,
    _message: string,
    _branch: string,
    _sha?: string
  ): Promise<FileUpsertResult> {
    return this.notImplemented();
  }

  async createPullRequest(
    title: string,
    body: string,
    head: string,
    base: string
  ): Promise<PullRequest> {
    const endpoint = `/projects/${this.projectId}/merge_requests`;

    const response = await this.request<GitLabMergeRequest>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        title,
        description: body,
        source_branch: head,
        target_branch: base,
      }),
    });

    return this.mapMergeRequest(response);
  }

  async updatePullRequest(
    _number: number,
    _updates: Partial<Pick<PullRequest, 'title' | 'body'>>
  ): Promise<PullRequest> {
    return this.notImplemented();
  }

  async getPullRequest(number: number): Promise<PullRequest> {
    const endpoint = `/projects/${this.projectId}/merge_requests/${number}`;
    const response = await this.request<GitLabMergeRequest>(endpoint);
    return this.mapMergeRequest(response);
  }

  async listPullRequests(
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<PullRequest[]> {
    const stateParam = state === 'open' ? 'opened' : state;
    const endpoint = `/projects/${this.projectId}/merge_requests?state=${stateParam}`;
    const response = await this.request<GitLabMergeRequest[]>(endpoint);
    return response.map((mr) => this.mapMergeRequest(mr));
  }

  async mergePullRequest(
    number: number,
    _method: 'merge' | 'squash' | 'rebase' = 'merge'
  ): Promise<void> {
    const endpoint = `/projects/${this.projectId}/merge_requests/${number}/merge`;

    await this.request(endpoint, {
      method: 'PUT',
    });
  }

  async createReviewComments(
    _number: number,
    _comments: ReviewCommentInput[],
    _commitSha: string
  ): Promise<ReviewCommentResult[]> {
    return this.notImplemented();
  }

  async createIssue(title: string, body: string): Promise<Issue> {
    const endpoint = `/projects/${this.projectId}/issues`;

    const response = await this.request<GitLabIssue>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        title,
        description: body,
      }),
    });

    return this.mapIssue(response);
  }

  async getIssue(number: number): Promise<Issue> {
    const endpoint = `/projects/${this.projectId}/issues/${number}`;
    const response = await this.request<GitLabIssue>(endpoint);
    return this.mapIssue(response);
  }

  async listIssues(
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<Issue[]> {
    const stateParam = state === 'open' ? 'opened' : state;
    const endpoint = `/projects/${this.projectId}/issues?state=${stateParam}`;
    const response = await this.request<GitLabIssue[]>(endpoint);
    return response.map((issue) => this.mapIssue(issue));
  }

  async addPullRequestComment(number: number, body: string): Promise<void> {
    const endpoint = `/projects/${this.projectId}/merge_requests/${number}/notes`;

    await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  }

  async addIssueComment(number: number, body: string): Promise<void> {
    const endpoint = `/projects/${this.projectId}/issues/${number}/notes`;

    await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  }

  async getRepository(): Promise<{
    name: string;
    description: string;
    url: string;
    defaultBranch: string;
  }> {
    const endpoint = `/projects/${this.projectId}`;
    const response = await this.request<GitLabProject>(endpoint);

    return {
      name: response.name,
      description: response.description,
      url: response.web_url,
      defaultBranch: response.default_branch,
    };
  }

  async hasWriteAccess(): Promise<boolean> {
    return this.notImplemented();
  }

  private mapMergeRequest(mr: GitLabMergeRequest): PullRequest {
    // Map GitLab states to our standard states
    let state: PullRequest['state'];
    if (mr.state === 'merged') {
      state = 'merged';
    } else if (mr.state === 'opened') {
      state = 'open';
    } else {
      state = 'closed';
    }

    return {
      number: mr.iid,
      title: mr.title,
      body: mr.description,
      state,
      author: mr.author.username,
      createdAt: mr.created_at,
      updatedAt: mr.updated_at,
      url: mr.web_url,
    };
  }

  private mapIssue(issue: GitLabIssue): Issue {
    // Map GitLab 'opened' to 'open'
    const state: Issue['state'] = issue.state === 'opened' ? 'open' : 'closed';

    return {
      number: issue.iid,
      title: issue.title,
      body: issue.description,
      state,
      author: issue.author.username,
      createdAt: issue.created_at,
      url: issue.web_url,
    };
  }

  private notImplemented<T = never>(): T {
    throw new Error('GitLab provider git integration is not implemented yet');
  }
}

// GitLab API types
interface GitLabUser {
  username: string;
}

interface GitLabMergeRequest {
  iid: number;
  title: string;
  description: string;
  state: 'opened' | 'closed' | 'merged';
  author: GitLabUser;
  created_at: string;
  updated_at: string;
  web_url: string;
}

interface GitLabIssue {
  iid: number;
  title: string;
  description: string;
  state: 'opened' | 'closed';
  author: GitLabUser;
  created_at: string;
  web_url: string;
}

interface GitLabProject {
  name: string;
  description: string;
  web_url: string;
  default_branch: string;
}

export default GitLabProvider;
