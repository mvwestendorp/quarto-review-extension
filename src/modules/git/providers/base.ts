import type {
  CreateBranchResult,
  FileUpsertResult,
  GitAuthConfig,
  GitUser,
  RepositoryFile,
  ReviewCommentInput,
  ReviewCommentResult,
} from '../types';

export interface RepositoryInitOptions {
  name: string;
  description?: string;
  private?: boolean;
  defaultBranch?: string;
}

export interface ProviderConfig {
  url?: string;
  token?: string;
  owner?: string;
  repo?: string;
  auth?: GitAuthConfig;
}

export interface PullRequest {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  headRef?: string;
  baseRef?: string;
  draft?: boolean;
}

export interface Issue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  author: string;
  createdAt: string;
  url: string;
}

/**
 * Base class for all remote git providers. Concrete implementations should
 * add provider-specific request logic by overriding the abstract methods.
 */
export abstract class BaseProvider {
  protected readonly config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  /**
   * Authenticated user associated with the current credentials.
   */
  abstract getCurrentUser(): Promise<GitUser>;

  /**
   * Create a new branch derived from the given base branch.
   */
  abstract createBranch(
    branchName: string,
    fromBranch: string
  ): Promise<CreateBranchResult>;

  /**
   * Retrieve the content of a file at a specific ref.
   */
  abstract getFileContent(
    path: string,
    ref: string
  ): Promise<RepositoryFile | null>;

  /**
   * Create or update the contents of a file on a branch.
   */
  abstract createOrUpdateFile(
    path: string,
    content: string,
    message: string,
    branch: string,
    sha?: string
  ): Promise<FileUpsertResult>;

  /**
   * Create a pull request.
   */
  abstract createPullRequest(
    title: string,
    body: string,
    head: string,
    base: string
  ): Promise<PullRequest>;

  /**
   * Update an existing pull request.
   */
  abstract updatePullRequest(
    number: number,
    updates: Partial<Pick<PullRequest, 'title' | 'body'>>
  ): Promise<PullRequest>;

  /**
   * Retrieve a pull request by number.
   */
  abstract getPullRequest(number: number): Promise<PullRequest>;

  /**
   * List pull requests filtered by state.
   */
  abstract listPullRequests(
    state?: 'open' | 'closed' | 'all'
  ): Promise<PullRequest[]>;

  /**
   * Merge a pull request using the given method.
   */
  abstract mergePullRequest(
    number: number,
    method?: 'merge' | 'squash' | 'rebase'
  ): Promise<void>;

  /**
   * Create review comments for a pull request.
   */
  abstract createReviewComments(
    number: number,
    comments: ReviewCommentInput[],
    commitSha: string
  ): Promise<ReviewCommentResult[]>;

  /**
   * Create an issue in the repository.
   */
  abstract createIssue(title: string, body: string): Promise<Issue>;

  /**
   * Retrieve an issue by number.
   */
  abstract getIssue(number: number): Promise<Issue>;

  /**
   * List issues filtered by state.
   */
  abstract listIssues(state?: 'open' | 'closed' | 'all'): Promise<Issue[]>;

  /**
   * Add a comment to a pull request.
   */
  abstract addPullRequestComment(number: number, body: string): Promise<void>;

  /**
   * Add a comment to an issue.
   */
  abstract addIssueComment(number: number, body: string): Promise<void>;

  /**
   * Retrieve repository metadata.
   */
  abstract getRepository(): Promise<{
    name: string;
    description: string;
    url: string;
    defaultBranch: string;
  }>;

  /**
   * Create the configured repository if it does not already exist.
   * Implementations should return the default branch name for the new repository.
   */
  public async createRepository(
    _options: RepositoryInitOptions
  ): Promise<{ defaultBranch: string }> {
    throw new Error(
      'Repository creation is not supported for this git provider.'
    );
  }

  /**
   * Determine whether the authenticated user has push/write access to the repository.
   */
  abstract hasWriteAccess(): Promise<boolean>;

  /**
   * Update the active authentication token (e.g. PAT provided at runtime).
   */
  public updateAuthToken(token?: string): void {
    if (this.config.auth?.mode === 'pat') {
      this.config.auth.token = token;
    } else {
      this.config.token = token;
    }
  }

  /**
   * Perform a raw API request.
   */
  protected async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.config.url) {
      throw new Error('Provider URL is not configured');
    }

    const headers: Record<string, string> = {};
    const authHeader = this.getAuthHeader();
    const headerName = this.config.auth?.headerName || 'Authorization';

    if (authHeader) {
      headers[headerName] = authHeader;
    }

    // Merge headers without overwriting provided values
    const finalHeaders: HeadersInit = {
      Accept: 'application/json',
      ...(authHeader ? { [headerName]: authHeader } : {}),
      ...(options.headers ?? {}),
    };

    const requestInit: RequestInit = {
      ...options,
      headers: finalHeaders,
    };

    if (this.config.auth?.mode === 'cookie') {
      requestInit.credentials = requestInit.credentials ?? 'include';
    }

    const url =
      endpoint.startsWith('http') || endpoint.startsWith('https')
        ? endpoint
        : `${this.config.url}${endpoint}`;

    const response = await fetch(url, requestInit);

    if (!response.ok) {
      const error = await this.toApiError(response);
      throw error;
    }

    if (response.status === 204) {
      // No content
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch (error) {
      throw new Error(
        `Failed to parse provider response: ${(error as Error).message}`
      );
    }
  }

  /**
   * Convert a non-OK response to an informative error.
   */
  protected async toApiError(response: Response): Promise<Error> {
    let message = `${response.status} ${response.statusText}`;

    try {
      const body = await response.json();
      if (body && typeof body.message === 'string') {
        message = body.message;
      }
    } catch {
      // Ignore JSON parse errors and fall back to status text
    }

    const error = new Error(message);
    (error as Error & { status?: number }).status = response.status;
    return error;
  }

  /**
   * Build the authorization header. Return `undefined` if the provider relies on cookies.
   */
  protected abstract getAuthHeader(): string | undefined;

  protected isNotFoundError(error: unknown): boolean {
    const status = (error as Error & { status?: number })?.status;
    if (status === 404) {
      return true;
    }
    const message = (error as Error)?.message ?? '';
    return /not found/i.test(message);
  }
}

export default BaseProvider;
