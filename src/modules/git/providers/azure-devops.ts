/**
 * Azure DevOps Provider (cloud and on-prem)
 */

import {
  BaseProvider,
  type Issue,
  type PullRequest,
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

const DEFAULT_API_VERSION = '7.1-preview.1';
const PROFILE_API_VERSION = '7.1-preview.3';
const COMMENTS_API_VERSION = '7.1-preview.1';
const SECURITY_API_VERSION = '7.1-preview.1';
const ZERO_OBJECT_ID = '0000000000000000000000000000000000000000';
const GIT_SECURITY_NAMESPACE = '52d39943-cb85-4d7f-8fa8-c6baac873819';
const PERMISSION_GENERIC_CONTRIBUTE = 2;

interface AzureDevOpsConfig extends ProviderConfig {
  project: string;
  collection?: string;
  apiVersion?: string;
  issueType?: string;
}

export class AzureDevOpsProvider extends BaseProvider {
  private readonly organization: string;
  private readonly project: string;
  private readonly collection?: string;
  private readonly repositoryName: string;
  private readonly apiVersion: string;
  private readonly issueType: string;

  private repositoryMetadataPromise?: Promise<AzureGitRepository>;

  constructor(config: AzureDevOpsConfig) {
    if (!config.owner || !config.owner.trim()) {
      throw new Error(
        'Azure DevOps provider requires the repository owner to be set to the organization name.'
      );
    }
    if (!config.project || !config.project.trim()) {
      throw new Error(
        'Azure DevOps provider requires the `project` option to be configured.'
      );
    }
    if (!config.repo || !config.repo.trim()) {
      throw new Error(
        'Azure DevOps provider requires the repository name to be set.'
      );
    }

    const { project, collection, apiVersion, issueType, ...baseConfig } =
      config;

    const defaultUrl = `https://dev.azure.com/${config.owner}`;
    const sanitizedUrl = (baseConfig.url ?? defaultUrl).replace(/\/+$/, '');

    super({
      ...baseConfig,
      url: sanitizedUrl,
    });

    this.organization = config.owner;
    this.project = project;
    this.collection = collection;
    this.repositoryName = config.repo;
    this.apiVersion = apiVersion ?? DEFAULT_API_VERSION;
    this.issueType = issueType ?? 'Issue';
  }

  protected getAuthHeader(): string | undefined {
    const token =
      this.config.auth?.token ??
      (this.config.auth?.mode === 'pat' ? this.config.token : undefined) ??
      this.config.token;

    if (!token) {
      return undefined;
    }

    if (typeof btoa === 'function') {
      return `Basic ${btoa(`:${token}`)}`;
    }

    if (typeof Buffer !== 'undefined') {
      return `Basic ${Buffer.from(`:${token}`, 'utf-8').toString('base64')}`;
    }

    throw new Error(
      'Azure DevOps authentication requires a PAT token, but the environment cannot generate a Basic auth header.'
    );
  }

  async getCurrentUser(): Promise<GitUser> {
    const endpoint = this.buildOrganizationApiPath('_apis/connectionData', {
      connectOptions: 'IncludeServices',
      lastChangeId: '-1',
      lastChangeId64: '-1',
    });

    const response = await this.request<AzureConnectionData>(endpoint);
    const user = response?.authenticatedUser;

    return {
      login: user?.subjectDescriptor ?? this.organization,
      name: user?.providerDisplayName ?? undefined,
      avatarUrl: user?._links?.avatar?.href ?? undefined,
    };
  }

  async createBranch(
    branchName: string,
    fromBranch: string
  ): Promise<CreateBranchResult> {
    const repo = await this.ensureRepositoryMetadata();
    const baseRef = await this.getBranchObjectId(repo.id, fromBranch);

    const endpoint = this.buildProjectApiPath(
      `_apis/git/repositories/${repo.id}/refs`
    );

    const response = await this.request<AzureGitRefUpdateResponse>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        {
          name: this.toRef(branchName),
          oldObjectId: ZERO_OBJECT_ID,
          newObjectId: baseRef,
        },
      ]),
    });

    const created = Array.isArray(response?.value) ? response.value[0] : null;
    const objectId = created?.newObjectId ?? created?.objectId ?? baseRef;

    return {
      name: this.toRef(branchName),
      sha: objectId,
    };
  }

  async getFileContent(
    path: string,
    ref: string
  ): Promise<RepositoryFile | null> {
    const repo = await this.ensureRepositoryMetadata();

    const endpoint = this.buildProjectApiPath(
      `_apis/git/repositories/${repo.id}/items`,
      {
        path: this.normalizeItemPath(path),
        includeContent: 'true',
        'versionDescriptor.version': ref,
        'versionDescriptor.versionType': 'branch',
      }
    );

    try {
      const response = await this.request<AzureGitItem>(endpoint);
      const content = this.extractItemContent(response);

      return {
        path: response.path?.replace(/^\//, '') ?? path,
        sha: response.commitId ?? '',
        content,
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
    _sha?: string
  ): Promise<FileUpsertResult> {
    const repo = await this.ensureRepositoryMetadata();
    const branchObjectId = await this.getBranchObjectId(repo.id, branch);
    const endpoint = this.buildProjectApiPath(
      `_apis/git/repositories/${repo.id}/pushes`
    );

    const pushPayload: AzureGitPushRequest = {
      refUpdates: [
        {
          name: this.toRef(branch),
          oldObjectId: branchObjectId,
        },
      ],
      commits: [
        {
          comment: message,
          changes: [
            {
              changeType: 'edit',
              item: {
                path: this.normalizeItemPath(path),
              },
              newContent: {
                content,
                contentType: 'rawtext',
              },
            },
          ],
        },
      ],
    };

    const response = await this.request<AzureGitPushResponse>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pushPayload),
    });

    const commit = response?.commits?.[0];
    const commitSha = commit?.commitId ?? '';

    return {
      path,
      sha: commitSha,
      commitSha,
      url: this.buildFileUrl(repo, branch, path),
    };
  }

  async createPullRequest(
    title: string,
    body: string,
    head: string,
    base: string
  ): Promise<PullRequest> {
    const repo = await this.ensureRepositoryMetadata();
    const endpoint = this.buildProjectApiPath(
      `_apis/git/repositories/${repo.id}/pullrequests`
    );

    const response = await this.request<AzurePullRequest>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: body,
        sourceRefName: this.toRef(head),
        targetRefName: this.toRef(base),
      }),
    });

    return this.mapPullRequest(response);
  }

  async updatePullRequest(
    number: number,
    updates: Partial<Pick<PullRequest, 'title' | 'body'>>
  ): Promise<PullRequest> {
    const repo = await this.ensureRepositoryMetadata();
    const endpoint = this.buildProjectApiPath(
      `_apis/git/repositories/${repo.id}/pullrequests/${number}`
    );

    const response = await this.request<AzurePullRequest>(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: updates.title,
        description: updates.body,
      }),
    });

    return this.mapPullRequest(response);
  }

  async getPullRequest(number: number): Promise<PullRequest> {
    const repo = await this.ensureRepositoryMetadata();
    const endpoint = this.buildProjectApiPath(
      `_apis/git/repositories/${repo.id}/pullrequests/${number}`
    );
    const response = await this.request<AzurePullRequest>(endpoint);
    return this.mapPullRequest(response);
  }

  async listPullRequests(
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<PullRequest[]> {
    const repo = await this.ensureRepositoryMetadata();
    const status = this.mapPullRequestState(state);
    const endpoint = this.buildProjectApiPath(
      `_apis/git/repositories/${repo.id}/pullrequests`,
      {
        'searchCriteria.status': status,
      }
    );

    const response = await this.request<AzurePullRequestList>(endpoint);
    return (response?.value ?? []).map((pr) => this.mapPullRequest(pr));
  }

  async mergePullRequest(
    number: number,
    method: 'merge' | 'squash' | 'rebase' = 'merge'
  ): Promise<void> {
    const repo = await this.ensureRepositoryMetadata();
    const pr = await this.getAzurePullRequest(repo.id, number);

    const endpoint = this.buildProjectApiPath(
      `_apis/git/repositories/${repo.id}/pullrequests/${number}`
    );

    const mergeStrategy = this.mapMergeStrategy(method);

    await this.request(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        lastMergeSourceCommit: pr.lastMergeSourceCommit,
        completionOptions: {
          mergeStrategy,
        },
      }),
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

    const repo = await this.ensureRepositoryMetadata();
    const results: ReviewCommentResult[] = [];

    for (const comment of comments) {
      const endpoint = this.buildProjectApiPath(
        `_apis/git/repositories/${repo.id}/pullRequests/${number}/threads`,
        {},
        COMMENTS_API_VERSION
      );

      const response = await this.request<AzurePullRequestThread>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comments: [
            {
              content: comment.body,
              commentType: 'text',
            },
          ],
          status: 'active',
          threadContext: {
            filePath: this.normalizeItemPath(comment.path),
            rightFileStart: {
              line: comment.line,
              offset: 1,
            },
            rightFileEnd: {
              line: comment.line,
              offset: 1,
            },
          },
        }),
      });

      const createdComment = response?.comments?.[0];
      const url =
        response?._links?.web?.href ??
        response?._links?.self?.href ??
        this.buildPullRequestUrl(repo, number) ??
        '';

      results.push({
        id: createdComment?.id ?? response?.id ?? '',
        url,
        path: comment.path,
        line: comment.line,
      });
    }

    return results;
  }

  async createIssue(title: string, body: string): Promise<Issue> {
    const endpoint = this.buildProjectApiPath(
      `_apis/wit/workitems/$${encodeURIComponent(this.issueType)}`,
      {},
      this.apiVersion
    );

    const response = await this.request<AzureWorkItem>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json-patch+json' },
      body: JSON.stringify([
        { op: 'add', path: '/fields/System.Title', value: title },
        { op: 'add', path: '/fields/System.Description', value: body },
      ]),
    });

    return this.mapWorkItem(response);
  }

  async getIssue(number: number): Promise<Issue> {
    const endpoint = this.buildProjectApiPath(
      `_apis/wit/workitems/${number}`,
      {},
      this.apiVersion
    );
    const response = await this.request<AzureWorkItem>(endpoint);
    return this.mapWorkItem(response);
  }

  async listIssues(
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<Issue[]> {
    const query = this.buildWiql(state);
    const wiqlEndpoint = this.buildProjectApiPath(
      '_apis/wit/wiql',
      {},
      this.apiVersion
    );

    const wiqlResponse = await this.request<AzureWiqlResponse>(wiqlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const ids = wiqlResponse?.workItems?.map((item) => item.id) ?? [];
    if (!ids.length) {
      return [];
    }

    const itemsEndpoint = this.buildProjectApiPath(
      '_apis/wit/workitems',
      {
        ids: ids.join(','),
      },
      this.apiVersion
    );

    const itemsResponse = await this.request<AzureWorkItemList>(itemsEndpoint);
    return (itemsResponse?.value ?? []).map((item) => this.mapWorkItem(item));
  }

  async addPullRequestComment(number: number, body: string): Promise<void> {
    const repo = await this.ensureRepositoryMetadata();
    const endpoint = this.buildProjectApiPath(
      `_apis/git/repositories/${repo.id}/pullRequests/${number}/threads`,
      {},
      COMMENTS_API_VERSION
    );

    await this.request(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comments: [
          {
            content: body,
            commentType: 'text',
          },
        ],
        status: 'active',
      }),
    });
  }

  async addIssueComment(number: number, body: string): Promise<void> {
    const endpoint = this.buildProjectApiPath(
      `_apis/wit/workItems/${number}/comments`,
      {},
      PROFILE_API_VERSION
    );

    await this.request(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: body }),
    });
  }

  async getRepository(): Promise<{
    name: string;
    description: string;
    url: string;
    defaultBranch: string;
  }> {
    const repo = await this.ensureRepositoryMetadata();
    return {
      name: repo.name,
      description: repo.description ?? '',
      url:
        repo.webUrl ??
        `${this.config.url}/_git/${encodeURIComponent(repo.name)}`,
      defaultBranch: this.fromRef(repo.defaultBranch ?? 'refs/heads/main'),
    };
  }

  async hasWriteAccess(): Promise<boolean> {
    const repo = await this.ensureRepositoryMetadata();
    if (!repo.id || !repo.project?.id) {
      return false;
    }

    const endpoint = this.buildOrganizationApiPath(
      '_apis/security/permissions/evaluate',
      {},
      SECURITY_API_VERSION
    );

    const response = await this.request<AzurePermissionEvaluationResponse>(
      endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          securityNamespaceId: GIT_SECURITY_NAMESPACE,
          token: `repoV2/${repo.project.id}/${repo.id}`,
          permissions: [PERMISSION_GENERIC_CONTRIBUTE],
          evaluateUp: true,
        }),
      }
    );

    const evaluation = response?.value?.find(
      (item) => item.permissionBit === PERMISSION_GENERIC_CONTRIBUTE
    );

    return Boolean(evaluation?.isAllowed ?? evaluation?.accessControlEntries);
  }

  private async ensureRepositoryMetadata(): Promise<AzureGitRepository> {
    if (!this.repositoryMetadataPromise) {
      const endpoint = this.buildProjectApiPath(
        `_apis/git/repositories/${encodeURIComponent(this.repositoryName)}`
      );
      this.repositoryMetadataPromise =
        this.request<AzureGitRepository>(endpoint);
    }
    return this.repositoryMetadataPromise;
  }

  private async getAzurePullRequest(
    repositoryId: string,
    number: number
  ): Promise<AzurePullRequest> {
    const endpoint = this.buildProjectApiPath(
      `_apis/git/repositories/${repositoryId}/pullrequests/${number}`
    );
    return this.request<AzurePullRequest>(endpoint);
  }

  private async getBranchObjectId(
    repositoryId: string,
    branch: string
  ): Promise<string> {
    const endpoint = this.buildProjectApiPath(
      `_apis/git/repositories/${repositoryId}/refs`,
      { filter: `heads/${branch}` }
    );

    const response = await this.request<AzureGitRefList>(endpoint);
    const ref = response?.value?.[0];
    if (!ref?.objectId) {
      throw new Error(`Branch ${branch} not found in Azure DevOps repository.`);
    }
    return ref.objectId;
  }

  private mapPullRequest(pr: AzurePullRequest): PullRequest {
    return {
      number: pr.pullRequestId,
      title: pr.title,
      body: pr.description ?? '',
      state: this.mapAzurePullRequestState(pr.status),
      author: pr.createdBy?.uniqueName ?? pr.createdBy?.displayName ?? '',
      createdAt: pr.creationDate,
      updatedAt: pr.closedDate ?? pr.creationDate,
      url: pr._links?.web?.href ?? '',
      headRef: this.fromRef(pr.sourceRefName),
      baseRef: this.fromRef(pr.targetRefName),
      draft: pr.isDraft ?? false,
    };
  }

  private mapWorkItem(item: AzureWorkItem): Issue {
    const fields = item.fields ?? {};
    const state = fields['System.State'] ?? 'open';

    return {
      number: item.id,
      title: fields['System.Title'] ?? `Work item ${item.id}`,
      body: fields['System.Description'] ?? '',
      state: /closed|done|resolved/i.test(state) ? 'closed' : 'open',
      author: fields['System.CreatedBy'] ?? '',
      createdAt: fields['System.CreatedDate'] ?? '',
      url: item._links?.html?.href ?? item.url ?? '',
    };
  }

  private extractItemContent(item: AzureGitItem): string {
    if (item.content) {
      return item.isBinary ? this.decodeBase64(item.content) : item.content;
    }
    if (item.contentBytes) {
      return this.decodeBase64(item.contentBytes);
    }
    return '';
  }

  private decodeBase64(content: string): string {
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
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(content, 'base64').toString('utf-8');
    }
    throw new Error('Base64 decoding is not supported in this environment');
  }

  private toRef(branch: string): string {
    return branch.startsWith('refs/') ? branch : `refs/heads/${branch}`;
  }

  private fromRef(ref: string): string {
    return ref?.replace(/^refs\/heads\//, '') ?? ref;
  }

  private mapPullRequestState(
    state: 'open' | 'closed' | 'all'
  ): 'active' | 'abandoned' | 'all' {
    if (state === 'open') {
      return 'active';
    }
    if (state === 'closed') {
      return 'abandoned';
    }
    return 'all';
  }

  private mapAzurePullRequestState(
    status: AzurePullRequest['status']
  ): PullRequest['state'] {
    if (status === 'completed') {
      return 'merged';
    }
    if (status === 'active') {
      return 'open';
    }
    return 'closed';
  }

  private mapMergeStrategy(
    method: 'merge' | 'squash' | 'rebase'
  ): AzureMergeStrategy {
    switch (method) {
      case 'squash':
        return 'squash';
      case 'rebase':
        return 'rebase';
      default:
        return 'noFastForward';
    }
  }

  private buildWiql(state: 'open' | 'closed' | 'all'): string {
    const projectClause = `[System.TeamProject] = '${this.project.replace(/'/g, "''")}'`;
    const typeClause = `[System.WorkItemType] = '${this.issueType.replace(
      /'/g,
      "''"
    )}'`;

    let stateClause = '';
    if (state === 'open') {
      stateClause = `[System.State] <> 'Closed'`;
    } else if (state === 'closed') {
      stateClause = `[System.State] = 'Closed'`;
    }

    const whereClauses = [projectClause, typeClause]
      .concat(stateClause ? [stateClause] : [])
      .join(' AND ');

    return `SELECT [System.Id] FROM WorkItems WHERE ${whereClauses} ORDER BY [System.ChangedDate] DESC`;
  }

  private buildFileUrl(
    repo: AzureGitRepository,
    branch: string,
    path: string
  ): string | undefined {
    if (!repo.webUrl) {
      return undefined;
    }
    const url = new URL(repo.webUrl);
    url.searchParams.set('path', this.normalizeItemPath(path));
    url.searchParams.set('version', `GB${branch}`);
    return url.toString();
  }

  private buildPullRequestUrl(
    repo: AzureGitRepository,
    number: number
  ): string | undefined {
    if (!repo.webUrl) {
      return undefined;
    }
    const url = new URL(repo.webUrl);
    url.pathname = url.pathname.replace(/\/_git\/[^/]+$/, '/_git/' + repo.name);
    url.search = '';
    url.hash = '';
    url.pathname = `${url.pathname}/pullrequest/${number}`;
    return url.toString();
  }

  private normalizeItemPath(path: string): string {
    return path.startsWith('/') ? path : `/${path}`;
  }

  private buildOrganizationApiPath(
    path: string,
    query: Record<string, string | undefined> = {},
    apiVersion: string = this.apiVersion
  ): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const search = this.buildQueryString(query, apiVersion);
    return `${normalizedPath}${search}`;
  }

  private buildProjectApiPath(
    path: string,
    query: Record<string, string | undefined> = {},
    apiVersion: string = this.apiVersion
  ): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const search = this.buildQueryString(query, apiVersion);

    return `${this.getProjectPath()}${normalizedPath}${search}`;
  }

  private getProjectPath(): string {
    const segments: string[] = [];
    if (this.collection) {
      segments.push(encodeURIComponent(this.collection));
    }
    segments.push(encodeURIComponent(this.project));

    return segments.length ? `/${segments.join('/')}` : '';
  }

  private buildQueryString(
    query: Record<string, string | undefined>,
    apiVersion: string
  ): string {
    const params = new URLSearchParams();
    const providedVersion = query['api-version'];

    Object.entries(query).forEach(([key, value]) => {
      if (key === 'api-version') {
        return;
      }
      if (value !== undefined) {
        params.append(key, value);
      }
    });

    params.set('api-version', providedVersion ?? apiVersion);

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }
}

export default AzureDevOpsProvider;

type AzureMergeStrategy = 'noFastForward' | 'squash' | 'rebase';

interface AzureGitRepository {
  id: string;
  name: string;
  description?: string;
  webUrl?: string;
  defaultBranch?: string;
  project?: {
    id: string;
    name: string;
  };
}

interface AzureGitRefList {
  value: Array<{
    name: string;
    objectId: string;
  }>;
}

interface AzureGitRefUpdateResponse {
  value: Array<{
    name: string;
    objectId: string;
    newObjectId: string;
  }>;
}

interface AzureGitItem {
  path: string;
  content?: string;
  contentBytes?: string;
  isBinary?: boolean;
  encoding?: string;
  commitId?: string;
}

interface AzureGitPushRequest {
  refUpdates: Array<{
    name: string;
    oldObjectId: string;
  }>;
  commits: Array<{
    comment: string;
    changes: Array<{
      changeType: 'edit' | 'add' | 'delete';
      item: {
        path: string;
      };
      newContent: {
        content: string;
        contentType: 'rawtext';
      };
    }>;
  }>;
}

interface AzureGitPushResponse {
  commits?: Array<{
    commitId: string;
    treeId?: string;
  }>;
}

interface AzurePullRequest {
  pullRequestId: number;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'abandoned';
  createdBy?: {
    displayName?: string;
    uniqueName?: string;
  };
  creationDate: string;
  closedDate?: string;
  sourceRefName: string;
  targetRefName: string;
  isDraft?: boolean;
  _links?: {
    web?: { href: string };
  };
  lastMergeSourceCommit?: {
    commitId: string;
  };
}

interface AzurePullRequestList {
  value: AzurePullRequest[];
}

interface AzurePullRequestThread {
  id?: number;
  comments?: Array<{
    id?: number;
    content?: string;
  }>;
  _links?: {
    self?: { href: string };
    web?: { href: string };
  };
}

interface AzureWorkItem {
  id: number;
  url?: string;
  fields?: Record<string, string>;
  _links?: {
    html?: { href: string };
  };
}

interface AzureWorkItemList {
  value: AzureWorkItem[];
}

interface AzureWiqlResponse {
  workItems?: Array<{
    id: number;
  }>;
}

interface AzureConnectionData {
  authenticatedUser?: {
    subjectDescriptor?: string;
    providerDisplayName?: string;
    _links?: {
      avatar?: { href: string };
    };
  };
}

interface AzurePermissionEvaluationResponse {
  value?: Array<{
    permissionBit: number;
    isAllowed?: boolean;
    accessControlEntries?: unknown;
  }>;
}
