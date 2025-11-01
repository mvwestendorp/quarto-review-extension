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

function encodeBase64(content: string): string {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(content)));
  }
  return Buffer.from(content, 'utf-8').toString('base64');
}

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
  return Buffer.from(content, 'base64').toString('utf-8');
}

function encodePath(path: string): string {
  return encodeURIComponent(path).replace(/%2F/g, '/');
}

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
    const endpoint = '/user';
    const response = await this.request<GitLabCurrentUser>(endpoint);

    return {
      login: response.username,
      name: response.name ?? undefined,
      avatarUrl: response.avatar_url ?? undefined,
    };
  }

  async createBranch(
    branchName: string,
    fromBranch: string
  ): Promise<CreateBranchResult> {
    const endpoint = `/projects/${this.projectId}/repository/branches`;

    const response = await this.request<GitLabBranch>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branch: branchName,
        ref: fromBranch,
      }),
    });

    return {
      name: response.name,
      sha: response.commit.id,
    };
  }

  async getFileContent(
    path: string,
    ref: string
  ): Promise<RepositoryFile | null> {
    const endpoint = `/projects/${this.projectId}/repository/files/${encodePath(
      path
    )}?ref=${encodeURIComponent(ref)}`;

    try {
      const response = await this.request<GitLabFile>(endpoint, {
        headers: { Accept: 'application/json' },
      });

      const sha =
        response.last_commit_id ?? response.commit_id ?? response.blob_id ?? '';

      return {
        path: response.file_path,
        sha,
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
    const endpoint = `/projects/${this.projectId}/repository/files/${encodePath(
      path
    )}`;

    const method = sha ? 'PUT' : 'POST';
    const payload: GitLabFileUpsertRequest = {
      branch,
      content: encodeBase64(content),
      commit_message: message,
      encoding: 'base64',
    };

    if (sha) {
      payload.last_commit_id = sha;
    }

    const response = await this.request<GitLabFileUpsertResponse>(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const fileUrl = this.buildFileUrl(branch, path);

    return {
      path: response.file_path,
      sha:
        response.content_sha256 ??
        response.last_commit_id ??
        payload.last_commit_id ??
        '',
      commitSha: response.commit_id,
      ...(fileUrl ? { url: fileUrl } : {}),
    };
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
    number: number,
    updates: Partial<Pick<PullRequest, 'title' | 'body'>>
  ): Promise<PullRequest> {
    const endpoint = `/projects/${this.projectId}/merge_requests/${number}`;

    const response = await this.request<GitLabMergeRequest>(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: updates.title,
        description: updates.body,
      }),
    });

    return this.mapMergeRequest(response);
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
    number: number,
    comments: ReviewCommentInput[],
    _commitSha: string
  ): Promise<ReviewCommentResult[]> {
    if (!comments.length) {
      return [];
    }

    const endpoint = `/projects/${this.projectId}/merge_requests/${number}/notes`;

    const responses = await Promise.all(
      comments.map((comment) =>
        this.request<GitLabNote>(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: comment.body }),
        }).then((note) => ({
          input: comment,
          note,
        }))
      )
    );

    return responses.map(({ input, note }) => {
      const url =
        note.web_url ??
        note.noteable_note_url ??
        this.buildMergeRequestUrl(number, note.id) ??
        '';

      return {
        id: note.id,
        url,
        path: input.path,
        line: input.line,
      };
    });
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
    const endpoint = `/projects/${this.projectId}`;
    const project = await this.request<GitLabProject>(endpoint);

    const projectAccess =
      project.permissions?.project_access?.access_level ?? 0;
    const groupAccess = project.permissions?.group_access?.access_level ?? 0;

    return projectAccess >= 30 || groupAccess >= 30;
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
      headRef: mr.source_branch,
      baseRef: mr.target_branch,
      draft: mr.draft,
    };
  }

  private buildFileUrl(branch: string, path: string): string | undefined {
    const baseUrl = this.getWebBaseUrl();
    if (!baseUrl || !this.config.owner || !this.config.repo) {
      return undefined;
    }
    return `${baseUrl}/${this.config.owner}/${this.config.repo}/-/blob/${encodeURIComponent(
      branch
    )}/${path}`;
  }

  private buildMergeRequestUrl(
    number: number,
    noteId?: number | string
  ): string | undefined {
    const baseUrl = this.getWebBaseUrl();
    if (!baseUrl || !this.config.owner || !this.config.repo) {
      return undefined;
    }
    const noteFragment = noteId ? `#note_${noteId}` : '';
    return `${baseUrl}/${this.config.owner}/${this.config.repo}/-/merge_requests/${number}${noteFragment}`;
  }

  private getWebBaseUrl(): string | undefined {
    if (!this.config.url) {
      return undefined;
    }
    return this.config.url.replace(/\/api\/v4\/?$/, '');
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
  source_branch: string;
  target_branch: string;
  draft?: boolean;
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
  permissions?: {
    project_access?: {
      access_level: number | null;
    } | null;
    group_access?: {
      access_level: number | null;
    } | null;
  };
}

interface GitLabCurrentUser {
  username: string;
  name?: string;
  avatar_url?: string;
}

interface GitLabBranch {
  name: string;
  commit: {
    id: string;
  };
}

interface GitLabFile {
  file_path: string;
  content: string;
  blob_id?: string;
  commit_id?: string;
  last_commit_id?: string;
}

interface GitLabFileUpsertRequest {
  branch: string;
  content: string;
  commit_message: string;
  encoding: 'base64';
  last_commit_id?: string;
}

interface GitLabFileUpsertResponse {
  file_path: string;
  branch: string;
  commit_id: string;
  content_sha256?: string;
  last_commit_id?: string;
}

interface GitLabNote {
  id: number;
  body: string;
  web_url?: string;
  noteable_note_url?: string;
}

export default GitLabProvider;
