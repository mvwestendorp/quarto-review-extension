import type GitModule from './index';
import type {
  ReviewSubmissionResult,
  ReviewSubmissionPayload,
  ReviewFileChange,
  ReviewComment,
} from './integration';
import QmdExportService, { type ExportFormat } from '@modules/export';
import type { ResolvedGitConfig } from './types';

export interface SubmitReviewOptions {
  reviewer: string;
  branchName?: string;
  baseBranch?: string;
  commitMessage?: string;
  format?: ExportFormat;
  pullRequest: {
    title: string;
    body?: string;
    draft?: boolean;
    updateExisting?: boolean;
    number?: number;
  };
  comments?: ReviewComment[];
}

export interface ReviewSubmissionContext {
  bundle: Awaited<ReturnType<QmdExportService['createBundle']>>;
  result: ReviewSubmissionResult;
}

export class GitReviewService {
  constructor(
    private readonly git: GitModule,
    private readonly exporter: QmdExportService
  ) {}

  public getRepositoryConfig(): ResolvedGitConfig['repository'] | null {
    return this.git.getConfig()?.repository ?? null;
  }

  public async submitReview(
    options: SubmitReviewOptions
  ): Promise<ReviewSubmissionContext> {
    if (!this.git.isEnabled()) {
      throw new Error('Git integration is not configured');
    }

    const bundle = await this.exporter.createBundle({
      format: options.format,
    });

    const files = this.toReviewFiles(bundle.files, options.commitMessage);

    const payload: ReviewSubmissionPayload = {
      reviewer: options.reviewer,
      files,
      branchName: options.branchName,
      baseBranch:
        options.baseBranch ??
        this.git.getConfig()?.repository.baseBranch ??
        'main',
      commitMessage:
        options.commitMessage ?? `Update ${bundle.primaryFilename}`,
      pullRequest: {
        title: options.pullRequest.title,
        body: options.pullRequest.body,
        draft: options.pullRequest.draft,
        updateExisting: options.pullRequest.updateExisting,
        number: options.pullRequest.number,
      },
      comments: options.comments,
    };

    const result = await this.git.submitReview(payload);

    return {
      bundle,
      result,
    };
  }

  private toReviewFiles(
    files: Array<{ filename: string; content: string }>,
    commitMessage?: string
  ): ReviewFileChange[] {
    return files.map((file) => ({
      path: file.filename,
      content: file.content,
      message: commitMessage,
    }));
  }
}

export default GitReviewService;
