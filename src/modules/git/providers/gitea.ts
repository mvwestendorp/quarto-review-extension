/**
 * Gitea/Forgejo Provider
 * Gitea and Forgejo share the same API surface.
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
import { decodeBase64, encodeBase64 } from '../../../utils/encoding';

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
    const response = await this.request<GiteaCurrentUser>('/user');
    return {
      login: response.login,
      name: response.full_name ?? undefined,
      avatarUrl: response.avatar_url ?? undefined,
    };
  }

  async createBranch(
    branchName: string,
    fromBranch: string
  ): Promise<CreateBranchResult> {
    const baseRef = await this.request<GiteaRef>(
      `/repos/${this.config.owner}/${this.config.repo}/git/refs/heads/${encodeURIComponent(
        fromBranch
      )}`
    );

    const response = await this.request<GiteaRef>(
      `/repos/${this.config.owner}/${this.config.repo}/git/refs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: baseRef.object.sha,
        }),
      }
    );

    return {
      name: response.ref,
      sha: response.object.sha,
    };
  }

  async getFileContent(
    path: string,
    ref: string
  ): Promise<RepositoryFile | null> {
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/contents/${encodeURIComponent(
      path
    )}?ref=${encodeURIComponent(ref)}`;

    try {
      const response = await this.request<GiteaFileContent>(endpoint);

      return {
        path: response.path,
        sha: response.sha ?? response.git_url ?? '',
        content: decodeBase64(response.content),
      };
    } catch (error) {
      if (
        error instanceof Error &&
        (error as Error & { status?: number }).status === 404
      ) {
        return null;
      }
      throw error;
    }
  }

  async createOrUpdateFile(
    path: string,
    content: string,
    message: string,
    branch: string,
    sha?: string
  ): Promise<FileUpsertResult> {
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/contents/${encodeURIComponent(
      path
    )}`;

    const response = await this.request<GiteaFileResponse>(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        content: encodeBase64(content),
        branch,
        sha,
      }),
    });

    const fileUrl =
      response.content.html_url ?? this.buildFileUrl(branch, path);

    return {
      path: response.content.path,
      sha: response.content.sha,
      commitSha: response.commit.sha,
      ...(fileUrl ? { url: fileUrl } : {}),
    };
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
    number: number,
    updates: Partial<Pick<PullRequest, 'title' | 'body'>>
  ): Promise<PullRequest> {
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/pulls/${number}`;

    const response = await this.request<GiteaPullRequest>(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: updates.title,
        body: updates.body,
      }),
    });

    return this.mapPullRequest(response);
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
    number: number,
    comments: ReviewCommentInput[],
    commitSha: string
  ): Promise<ReviewCommentResult[]> {
    if (!comments.length) {
      return [];
    }

    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/pulls/${number}/reviews`;

    const response = await this.request<GiteaReviewResponse>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'COMMENT',
        body: '',
        commit_id: commitSha,
        comments: comments.map((comment) => ({
          path: comment.path,
          line: comment.line,
          side: comment.side ?? 'RIGHT',
          body: comment.body,
        })),
      }),
    });

    return response.comments.map((comment) => {
      const url = comment.html_url ?? this.buildPullRequestUrl(number) ?? '';

      return {
        id: comment.id,
        url,
        path: comment.path,
        line: comment.line,
      };
    });
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
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}`;
    const response = await this.request<GiteaRepository>(endpoint);
    return Boolean(response.permissions?.push);
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

  private buildFileUrl(branch: string, path: string): string | undefined {
    const baseUrl = this.getWebBaseUrl();
    if (!baseUrl || !this.config.owner || !this.config.repo) {
      return undefined;
    }
    return `${baseUrl}/${this.config.owner}/${this.config.repo}/src/branch/${encodeURIComponent(
      branch
    )}/${path}`;
  }

  private buildPullRequestUrl(number: number): string | undefined {
    const baseUrl = this.getWebBaseUrl();
    if (!baseUrl || !this.config.owner || !this.config.repo) {
      return undefined;
    }
    return `${baseUrl}/${this.config.owner}/${this.config.repo}/pulls/${number}`;
  }

  private getWebBaseUrl(): string | undefined {
    if (!this.config.url) {
      return undefined;
    }
    return this.config.url.replace(/\/api\/v1\/?$/, '');
  }
}

// Gitea API types
interface GiteaUser {
  login: string;
}

interface GiteaCurrentUser extends GiteaUser {
  full_name?: string;
  avatar_url?: string;
}

interface GiteaRef {
  ref: string;
  node_id?: string;
  url?: string;
  object: {
    sha: string;
    type: string;
    url?: string;
  };
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

interface GiteaFileContent {
  path: string;
  sha?: string;
  git_url?: string;
  content: string;
}

interface GiteaFileResponse {
  content: {
    path: string;
    sha: string;
    html_url?: string;
  };
  commit: {
    sha: string;
  };
}

interface GiteaReviewResponse {
  id: number;
  body: string;
  commit_id: string;
  comments: Array<{
    id: number;
    path: string;
    line: number;
    side?: 'LEFT' | 'RIGHT';
    body: string;
    html_url?: string;
  }>;
}

interface GiteaRepository {
  name: string;
  description: string;
  html_url: string;
  default_branch: string;
  permissions?: {
    admin?: boolean;
    push?: boolean;
    pull?: boolean;
  };
}

// ForgejoProvider is an alias for GiteaProvider (same API)
export class ForgejoProvider extends GiteaProvider {}

export default GiteaProvider;
