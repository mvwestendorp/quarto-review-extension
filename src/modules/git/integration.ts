import { createModuleLogger } from '@utils/debug';
import type { BaseProvider, PullRequest } from './providers';
import type { ResolvedGitConfig } from './types';
import type { ReviewCommentInput } from './types';

const logger = createModuleLogger('GitIntegration');

export interface ReviewFileChange {
  path: string;
  content: string;
  message?: string;
}

export interface ReviewComment extends ReviewCommentInput {}

export interface ReviewPullRequestOptions {
  title: string;
  body?: string;
  draft?: boolean;
  /**
   * When true (default) the integration will re-use any open pull request backed by the review branch.
   */
  updateExisting?: boolean;
  /**
   * Explicit pull request number to update instead of creating a new one.
   */
  number?: number;
}

export interface ReviewSubmissionPayload {
  reviewer: string;
  files: ReviewFileChange[];
  pullRequest: ReviewPullRequestOptions;
  branchName?: string;
  baseBranch?: string;
  commitMessage?: string;
  comments?: ReviewComment[];
}

export interface ReviewSubmissionResult {
  branchName: string;
  baseBranch: string;
  pullRequest: PullRequest;
  files: ReviewFileResult[];
  reusedPullRequest: boolean;
}

export interface ReviewFileResult {
  path: string;
  sha: string;
  commitSha: string;
}

export class GitIntegrationService {
  constructor(
    private readonly provider: BaseProvider,
    private readonly config: ResolvedGitConfig
  ) {}

  public getRepositoryConfig(): ResolvedGitConfig['repository'] {
    return this.config.repository;
  }

  public getProvider(): BaseProvider {
    return this.provider;
  }

  public async submitReview(
    payload: ReviewSubmissionPayload
  ): Promise<ReviewSubmissionResult> {
    this.validatePayload(payload);

    const repository = this.config.repository;
    const baseBranch = payload.baseBranch?.trim() || repository.baseBranch;
    const branchName = this.resolveBranchName(payload);

    await this.ensureBranch(branchName, baseBranch);

    const fileResults = await this.applyFileChanges(
      branchName,
      payload.files,
      payload.commitMessage
    );

    const { pullRequest, reused } = await this.ensurePullRequest(
      branchName,
      baseBranch,
      payload.pullRequest
    );

    await this.maybeCreateReviewComments(
      pullRequest.number,
      payload.comments,
      fileResults[fileResults.length - 1]?.commitSha
    );

    return {
      branchName,
      baseBranch,
      pullRequest,
      files: fileResults,
      reusedPullRequest: reused,
    };
  }

  private validatePayload(payload: ReviewSubmissionPayload): void {
    if (!payload.reviewer || !payload.reviewer.trim()) {
      throw new Error('Reviewer information is required');
    }
    if (!Array.isArray(payload.files) || payload.files.length === 0) {
      throw new Error('At least one file change must be provided');
    }
    payload.files.forEach((file) => {
      if (!file.path || !file.path.trim()) {
        throw new Error('File path is required for each change');
      }
    });
    if (!payload.pullRequest?.title || !payload.pullRequest.title.trim()) {
      throw new Error('Pull request title is required');
    }
  }

  private resolveBranchName(payload: ReviewSubmissionPayload): string {
    if (payload.branchName?.trim()) {
      return this.sanitizeBranchName(payload.branchName);
    }

    const reviewer = payload.reviewer
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return this.sanitizeBranchName(`review/${reviewer || 'user'}-${timestamp}`);
  }

  private sanitizeBranchName(input: string): string {
    const cleaned = input
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^A-Za-z0-9._/-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    return cleaned || 'review-branch';
  }

  private async ensureBranch(
    branchName: string,
    baseBranch: string
  ): Promise<void> {
    try {
      await this.provider.createBranch(branchName, baseBranch);
      logger.debug('Created review branch', { branchName, baseBranch });
    } catch (error) {
      if (this.isBranchExistsError(error)) {
        logger.debug('Reusing existing branch', { branchName });
        return;
      }
      throw error;
    }
  }

  private isBranchExistsError(error: unknown): boolean {
    const status = (error as Error & { status?: number })?.status;
    if (status === 409 || status === 422) {
      return true;
    }
    const message = (error as Error)?.message ?? '';
    return /already exists|reference already exists/i.test(message);
  }

  private async applyFileChanges(
    branchName: string,
    files: ReviewFileChange[],
    defaultMessage?: string
  ): Promise<ReviewFileResult[]> {
    const results: ReviewFileResult[] = [];

    for (const file of files) {
      const path = file.path.trim();
      const commitMessage =
        file.message || defaultMessage || `Update ${path}`;

      const existing = await this.provider
        .getFileContent(path, branchName)
        .catch((error) => {
          logger.debug('Failed to read file from branch, assuming new file', {
            path,
            branchName,
            error,
          });
          return null;
        });

      const upsertResult = await this.provider.createOrUpdateFile(
        path,
        file.content,
        commitMessage,
        branchName,
        existing?.sha
      );

      results.push({
        path: upsertResult.path,
        sha: upsertResult.sha,
        commitSha: upsertResult.commitSha,
      });
    }

    return results;
  }

  private async ensurePullRequest(
    branchName: string,
    baseBranch: string,
    options: ReviewPullRequestOptions
  ): Promise<{ pullRequest: PullRequest; reused: boolean }> {
    if (options.number !== undefined) {
      const updated = await this.provider.updatePullRequest(options.number, {
        title: options.title,
        body: options.body,
      });
      return { pullRequest: updated, reused: true };
    }

    if (options.updateExisting !== false) {
      const existing = await this.findOpenPullRequest(branchName);
      if (existing) {
        const updated = await this.provider.updatePullRequest(existing.number, {
          title: options.title,
          body: options.body,
        });
        return { pullRequest: updated, reused: true };
      }
    }

    const created = await this.provider.createPullRequest(
      options.title,
      options.body ?? '',
      branchName,
      baseBranch
    );
    return { pullRequest: created, reused: false };
  }

  private async findOpenPullRequest(
    branchName: string
  ): Promise<PullRequest | null> {
    const pulls = await this.provider.listPullRequests('open');
    const match = pulls.find(
      (pr) => pr.headRef && pr.headRef === branchName
    );
    return match ?? null;
  }

  private async maybeCreateReviewComments(
    pullRequestNumber: number,
    comments: ReviewComment[] | undefined,
    commitSha?: string
  ): Promise<void> {
    if (!comments?.length) {
      return;
    }
    if (!commitSha) {
      logger.warn(
        'Skipping inline review comments because commit SHA is unavailable'
      );
      return;
    }
    await this.provider.createReviewComments(
      pullRequestNumber,
      comments,
      commitSha
    );
  }
}

export default GitIntegrationService;
