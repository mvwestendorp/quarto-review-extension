import type { ReviewGitAuthConfig, ReviewGitConfig } from '@/types';

export type GitProviderType =
  | 'github'
  | 'gitlab'
  | 'gitea'
  | 'forgejo'
  | 'azure-devops'
  | 'local';

export interface GitRepositoryConfig {
  owner: string;
  name: string;
  baseBranch: string;
  sourceFile?: string;
}

export type GitAuthMode = NonNullable<ReviewGitAuthConfig['mode']>;

export interface GitAuthConfig {
  mode: GitAuthMode;
  headerName?: string;
  cookieName?: string;
  token?: string;
}

export interface ResolvedGitConfig {
  provider: GitProviderType;
  repository: GitRepositoryConfig;
  auth?: GitAuthConfig;
  options?: Record<string, unknown>;
}

/**
 * Submission payload returned by the configuration service.
 */
export interface GitConfigResolution {
  config: ResolvedGitConfig;
  /**
   * Raw config as provided through the Quarto metadata.
   * Useful for debugging or displaying back to the user.
   */
  raw: ReviewGitConfig;
}

export interface GitUser {
  login: string;
  name?: string;
  avatarUrl?: string;
}

export interface RepositoryFile {
  path: string;
  sha: string;
  content: string;
}

export interface FileUpsertResult {
  path: string;
  sha: string;
  commitSha: string;
  url?: string;
}

export interface ReviewCommentInput {
  path: string;
  body: string;
  line: number;
  side?: 'LEFT' | 'RIGHT';
}

export interface ReviewCommentResult {
  id: string | number;
  url: string;
  path: string;
  line: number;
}

export interface CreateBranchResult {
  name: string;
  sha: string;
}
