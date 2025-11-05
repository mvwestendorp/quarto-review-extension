import { BaseProvider, type Issue, type PullRequest } from './base';
import type {
  CreateBranchResult,
  FileUpsertResult,
  GitUser,
  RepositoryFile,
  ReviewCommentInput,
  ReviewCommentResult,
} from '../types';

function decodeBase64(content: string): string {
  if (typeof atob === 'function') {
    return decodeURIComponent(
      Array.prototype.map
        .call(
          atob(content),
          (c: string) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`
        )
        .join('')
    );
  }

  // Fallback for environments without atob (e.g., tests)
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(content, 'base64').toString('utf-8');
  }
  throw new Error('Base64 decoding is not supported in this environment');
}

function encodeBase64(content: string): string {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(content)));
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(content, 'utf-8').toString('base64');
  }
  throw new Error('Base64 encoding is not supported in this environment');
}

export class GitHubProvider extends BaseProvider {
  protected getAuthHeader(): string | undefined {
    if (this.config.auth?.mode === 'cookie') {
      return undefined;
    }
    if (this.config.auth?.token) {
      return `Bearer ${this.config.auth.token}`;
    }
    if (this.config.token) {
      return `Bearer ${this.config.token}`;
    }
    return undefined;
  }

  async getCurrentUser(): Promise<GitUser> {
    const response = await this.request<GitHubUser>('/user');
    return {
      login: response.login,
      name: response.name ?? undefined,
      avatarUrl: response.avatar_url ?? undefined,
    };
  }

  async createBranch(
    branchName: string,
    fromBranch: string
  ): Promise<CreateBranchResult> {
    const baseRef = await this.request<GitHubRef>(
      `/repos/${this.config.owner}/${this.config.repo}/git/ref/heads/${fromBranch}`
    );

    const response = await this.request<GitHubRef>(
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
    try {
      const response = await this.request<GitHubContent>(
        `/repos/${this.config.owner}/${this.config.repo}/contents/${encodeURIComponent(
          path
        )}?ref=${encodeURIComponent(ref)}`,
        {
          headers: { Accept: 'application/vnd.github.v3+json' },
        }
      );

      return {
        path: response.path,
        sha: response.sha,
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
    const response = await this.request<GitHubFileResponse>(
      `/repos/${this.config.owner}/${this.config.repo}/contents/${encodeURIComponent(
        path
      )}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          content: encodeBase64(content),
          branch,
          sha,
        }),
      }
    );

    return {
      path: response.content.path,
      sha: response.content.sha,
      commitSha: response.commit.sha,
      url: response.content.html_url,
    };
  }

  async createPullRequest(
    title: string,
    body: string,
    head: string,
    base: string
  ): Promise<PullRequest> {
    const response = await this.request<GitHubPullRequest>(
      `/repos/${this.config.owner}/${this.config.repo}/pulls`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, head, base }),
      }
    );

    return this.mapPullRequest(response);
  }

  async updatePullRequest(
    number: number,
    updates: Partial<Pick<PullRequest, 'title' | 'body'>>
  ): Promise<PullRequest> {
    const response = await this.request<GitHubPullRequest>(
      `/repos/${this.config.owner}/${this.config.repo}/pulls/${number}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updates.title,
          body: updates.body,
        }),
      }
    );

    return this.mapPullRequest(response);
  }

  async getPullRequest(number: number): Promise<PullRequest> {
    const response = await this.request<GitHubPullRequest>(
      `/repos/${this.config.owner}/${this.config.repo}/pulls/${number}`
    );
    return this.mapPullRequest(response);
  }

  async listPullRequests(
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<PullRequest[]> {
    const response = await this.request<GitHubPullRequest[]>(
      `/repos/${this.config.owner}/${this.config.repo}/pulls?state=${state}`
    );
    return response.map((pr) => this.mapPullRequest(pr));
  }

  async mergePullRequest(
    number: number,
    method: 'merge' | 'squash' | 'rebase' = 'merge'
  ): Promise<void> {
    await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/pulls/${number}/merge`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merge_method: method }),
      }
    );
  }

  async createReviewComments(
    number: number,
    comments: ReviewCommentInput[],
    commitSha: string
  ): Promise<ReviewCommentResult[]> {
    if (!comments.length) {
      return [];
    }

    const response = await this.request<GitHubReviewResponse>(
      `/repos/${this.config.owner}/${this.config.repo}/pulls/${number}/reviews`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          commit_id: commitSha,
          event: 'COMMENT',
          comments: comments.map((comment) => ({
            path: comment.path,
            line: comment.line,
            side: comment.side ?? 'RIGHT',
            body: comment.body,
          })),
        }),
      }
    );

    return response?.comments
      ? response.comments.map((comment) => ({
          id: comment.id,
          url: comment.html_url,
          path: comment.path,
          line: comment.line,
        }))
      : [];
  }

  async createIssue(title: string, body: string): Promise<Issue> {
    const response = await this.request<GitHubIssue>(
      `/repos/${this.config.owner}/${this.config.repo}/issues`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      }
    );
    return this.mapIssue(response);
  }

  async getIssue(number: number): Promise<Issue> {
    const response = await this.request<GitHubIssue>(
      `/repos/${this.config.owner}/${this.config.repo}/issues/${number}`
    );
    return this.mapIssue(response);
  }

  async listIssues(
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<Issue[]> {
    const response = await this.request<GitHubIssue[]>(
      `/repos/${this.config.owner}/${this.config.repo}/issues?state=${state}`
    );
    return response.map((issue) => this.mapIssue(issue));
  }

  async addPullRequestComment(number: number, body: string): Promise<void> {
    await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/issues/${number}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      }
    );
  }

  async addIssueComment(number: number, body: string): Promise<void> {
    await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/issues/${number}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      }
    );
  }

  async getRepository(): Promise<{
    name: string;
    description: string;
    url: string;
    defaultBranch: string;
  }> {
    const response = await this.request<GitHubRepository>(
      `/repos/${this.config.owner}/${this.config.repo}`
    );

    return {
      name: response.name,
      description: response.description,
      url: response.html_url,
      defaultBranch: response.default_branch,
    };
  }

  async hasWriteAccess(): Promise<boolean> {
    const response = await this.request<GitHubRepository>(
      `/repos/${this.config.owner}/${this.config.repo}`
    );
    return Boolean(response.permissions?.push);
  }

  private mapPullRequest(pr: GitHubPullRequest): PullRequest {
    return {
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.merged_at ? 'merged' : pr.state,
      author: pr.user.login,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      url: pr.html_url,
      headRef: pr.head?.ref,
      baseRef: pr.base?.ref,
      draft: pr.draft ?? false,
    };
  }

  private mapIssue(issue: GitHubIssue): Issue {
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
}

interface GitHubUser {
  login: string;
  name?: string;
  avatar_url?: string;
}

interface GitHubRef {
  ref: string;
  object: {
    sha: string;
  };
}

interface GitHubContent {
  path: string;
  sha: string;
  content: string;
  encoding: 'base64';
}

interface GitHubFileResponse {
  content: {
    path: string;
    sha: string;
    html_url: string;
  };
  commit: {
    sha: string;
  };
}

interface GitHubPullRequest {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  merged_at: string | null;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  html_url: string;
  head?: {
    ref: string;
  };
  base?: {
    ref: string;
  };
  draft?: boolean;
}

interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  user: GitHubUser;
  created_at: string;
  html_url: string;
}

interface GitHubRepository {
  name: string;
  description: string;
  html_url: string;
  default_branch: string;
  permissions?: {
    push?: boolean;
  };
}

interface GitHubReviewResponse {
  id: number;
  state: string;
  body: string | null;
  html_url: string;
  comments: Array<{
    id: number;
    path: string;
    line: number;
    html_url: string;
  }>;
}

export default GitHubProvider;
