/**
 * Gitea/Forgejo Provider
 * Gitea and Forgejo share the same API
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

export class GiteaProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    // Ensure URL includes API path
    const rawUrl = (config.url || 'https://gitea.com/api/v1').replace(
      /\/$/,
      ''
    );
    const url = rawUrl.endsWith('/api/v1') ? rawUrl : `${rawUrl}/api/v1`;

    super({
      ...config,
      url,
    });
  }

  protected getAuthHeader(): string {
    return `token ${this.config.token}`;
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
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/pulls`;

    const response = await this.request<GiteaPullRequest>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        head,
        base,
      }),
    });

    return this.mapPullRequest(response);
  }

  async updatePullRequest(
    _number: number,
    _updates: Partial<Pick<PullRequest, 'title' | 'body'>>
  ): Promise<PullRequest> {
    return this.notImplemented();
  }

  async getPullRequest(number: number): Promise<PullRequest> {
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/pulls/${number}`;
    const response = await this.request<GiteaPullRequest>(endpoint);
    return this.mapPullRequest(response);
  }

  async listPullRequests(
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<PullRequest[]> {
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/pulls?state=${state}`;
    const response = await this.request<GiteaPullRequest[]>(endpoint);
    return response.map((pr) => this.mapPullRequest(pr));
  }

  async mergePullRequest(
    number: number,
    method: 'merge' | 'squash' | 'rebase' = 'merge'
  ): Promise<void> {
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/pulls/${number}/merge`;

    await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        Do: method,
      }),
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
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/issues`;

    const response = await this.request<GiteaIssue>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
      }),
    });

    return this.mapIssue(response);
  }

  async getIssue(number: number): Promise<Issue> {
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/issues/${number}`;
    const response = await this.request<GiteaIssue>(endpoint);
    return this.mapIssue(response);
  }

  async listIssues(
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<Issue[]> {
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/issues?state=${state}`;
    const response = await this.request<GiteaIssue[]>(endpoint);
    return response.map((issue) => this.mapIssue(issue));
  }

  async addPullRequestComment(number: number, body: string): Promise<void> {
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/issues/${number}/comments`;

    await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  }

  async addIssueComment(number: number, body: string): Promise<void> {
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/issues/${number}/comments`;

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
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}`;
    const response = await this.request<GiteaRepository>(endpoint);

    return {
      name: response.name,
      description: response.description,
      url: response.html_url,
      defaultBranch: response.default_branch,
    };
  }

  async hasWriteAccess(): Promise<boolean> {
    return this.notImplemented();
  }

  private mapPullRequest(pr: GiteaPullRequest): PullRequest {
    return {
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.merged ? 'merged' : pr.state,
      author: pr.user.login,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      url: pr.html_url,
      headRef: pr.head?.ref ?? pr.head?.label,
      baseRef: pr.base?.ref ?? pr.base?.label,
      draft: pr.draft ?? false,
    };
  }

  private mapIssue(issue: GiteaIssue): Issue {
    return {
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      author: issue.user.login,
      createdAt: issue.created_at,
      url: issue.html_url,
    };
  }

  private notImplemented<T = never>(): T {
    throw new Error('Gitea provider git integration is not implemented yet');
  }
}

// Gitea API types
interface GiteaUser {
  login: string;
}

interface GiteaPullRequest {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  merged: boolean;
  user: GiteaUser;
  created_at: string;
  updated_at: string;
  html_url: string;
  head?: {
    ref?: string;
    label?: string;
  };
  base?: {
    ref?: string;
    label?: string;
  };
  draft?: boolean;
}

interface GiteaIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  user: GiteaUser;
  created_at: string;
  html_url: string;
}

interface GiteaRepository {
  name: string;
  description: string;
  html_url: string;
  default_branch: string;
}

// ForgejoProvider is an alias for GiteaProvider (same API)
export class ForgejoProvider extends GiteaProvider {}

export default GiteaProvider;
