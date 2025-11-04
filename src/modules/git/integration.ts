import { createModuleLogger } from '@utils/debug';
import type { BaseProvider } from './providers';
import type { ResolvedGitConfig, ReviewCommentInput } from './types';

const logger = createModuleLogger('GitIntegration');

/**
 * Payload for submitting a review via Git integration
 */
export interface ReviewSubmissionPayload {
  /** Name or identifier of the reviewer */
  reviewer: string;
  /** Full content of the reviewed document */
  documentContent: string;
  /** Path to the file in the repository (optional, defaults to config.repository.sourceFile) */
  sourcePath?: string;
  /** Custom branch name (optional, auto-generated if not provided) */
  branchName?: string;
  /** Pull request details */
  pullRequest: {
    title: string;
    body: string;
  };
  /** Optional line-level review comments */
  comments?: ReviewCommentInput[];
  /** Custom commit message (optional) */
  commitMessage?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of submitting a review
 */
export interface SubmitReviewResult {
  /** Created pull request details */
  pullRequest: {
    number: number;
    url: string;
    branch: string;
  };
  /** Created commit details */
  commit: {
    sha: string;
    url?: string;
  };
  /** Created review comments (if any) */
  comments: Array<{
    id: string | number;
    url: string;
    path: string;
    line: number;
  }>;
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

  /**
   * Submit a review by creating a branch, committing changes, and opening a PR
   */
  public async submitReview(payload: ReviewSubmissionPayload): Promise<SubmitReviewResult> {
    logger.info(`Starting review submission from ${payload.reviewer}`);

    // Step 1: Validate payload
    this.validatePayload(payload);

    // Step 2: Determine source file path
    const sourcePath = payload.sourcePath ?? this.config.repository.sourceFile;
    if (!sourcePath) {
      const error = 'No source file specified in payload or configuration';
      logger.error(error);
      throw new Error(error);
    }

    // Step 3: Generate branch name
    const branchName = payload.branchName ?? this.generateBranchName(payload.reviewer);
    logger.debug(`Creating review branch: ${branchName}`);

    try {
      // Step 4: Create branch from base
      const branch = await this.provider.createBranch(
        branchName,
        this.config.repository.baseBranch
      );
      logger.debug(`Branch created: ${branch.name} (SHA: ${branch.sha})`);

      // Step 5: Get current file SHA (required for update operation)
      const currentFile = await this.provider.getFileContent(
        sourcePath,
        this.config.repository.baseBranch
      );

      if (!currentFile) {
        const error = `Source file not found: ${sourcePath} on branch ${this.config.repository.baseBranch}`;
        logger.error(error);
        throw new Error(error);
      }

      // Step 6: Commit changes to new branch
      const commitMessage =
        payload.commitMessage ??
        this.generateCommitMessage(payload.reviewer);

      const fileResult = await this.provider.createOrUpdateFile(
        sourcePath,
        payload.documentContent,
        commitMessage,
        branchName,
        currentFile.sha
      );

      logger.debug(`File committed: ${fileResult.commitSha}`);

      // Step 7: Create pull request
      const pullRequest = await this.provider.createPullRequest(
        payload.pullRequest.title,
        payload.pullRequest.body,
        branchName,
        this.config.repository.baseBranch
      );

      logger.info(`Pull request created: #${pullRequest.number} - ${pullRequest.url}`);

      // Step 8: Add review comments (optional)
      const reviewComments = await this.addReviewComments(
        pullRequest.number,
        payload.comments,
        fileResult.commitSha
      );

      // Step 9: Return result
      return {
        pullRequest: {
          number: pullRequest.number,
          url: pullRequest.url,
          branch: branchName,
        },
        commit: {
          sha: fileResult.commitSha,
          url: fileResult.url,
        },
        comments: reviewComments,
      };
    } catch (error) {
      logger.error('Failed to submit review:', error);
      throw error;
    }
  }

  /**
   * Validate the review submission payload
   */
  private validatePayload(payload: ReviewSubmissionPayload): void {
    if (!payload.reviewer || payload.reviewer.trim() === '') {
      throw new Error('Reviewer name is required');
    }

    if (!payload.documentContent || payload.documentContent.trim() === '') {
      throw new Error('Document content is required');
    }

    if (!payload.pullRequest) {
      throw new Error('Pull request details are required');
    }

    if (!payload.pullRequest.title || payload.pullRequest.title.trim() === '') {
      throw new Error('Pull request title is required');
    }

    if (!payload.pullRequest.body || payload.pullRequest.body.trim() === '') {
      throw new Error('Pull request body is required');
    }

    // Validate branch name if provided
    if (payload.branchName) {
      const validBranchName = /^[a-zA-Z0-9/_-]+$/;
      if (!validBranchName.test(payload.branchName)) {
        throw new Error(
          `Invalid branch name: ${payload.branchName}. Must contain only alphanumeric characters, hyphens, underscores, and slashes.`
        );
      }
    }

    // Validate comments if provided
    if (payload.comments) {
      for (const comment of payload.comments) {
        if (!comment.path || comment.path.trim() === '') {
          throw new Error('Comment path is required');
        }
        if (!comment.body || comment.body.trim() === '') {
          throw new Error('Comment body is required');
        }
        if (!comment.line || comment.line < 1) {
          throw new Error('Comment line must be a positive integer');
        }
      }
    }
  }

  /**
   * Generate a unique branch name for the review
   */
  private generateBranchName(reviewer: string): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '');
    const sanitizedReviewer = reviewer
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return `review/${sanitizedReviewer}/${timestamp}`;
  }

  /**
   * Generate a commit message for the review
   */
  private generateCommitMessage(reviewer: string): string {
    return `Review by ${reviewer}

Submitted via Quarto Review Extension`;
  }

  /**
   * Add review comments to the pull request
   * Returns empty array if no comments provided or if adding comments fails
   */
  private async addReviewComments(
    pullRequestNumber: number,
    comments: ReviewCommentInput[] | undefined,
    commitSha: string
  ): Promise<Array<{ id: string | number; url: string; path: string; line: number }>> {
    if (!comments || comments.length === 0) {
      return [];
    }

    try {
      const reviewComments = await this.provider.createReviewComments(
        pullRequestNumber,
        comments,
        commitSha
      );
      logger.debug(`Added ${reviewComments.length} review comments`);
      return reviewComments;
    } catch (error) {
      logger.warn('Failed to add review comments:', error);
      // Don't fail the entire submission if comments fail
      return [];
    }
  }
}

export default GitIntegrationService;
