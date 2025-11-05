import type GitModule from './index';
import type {
  ReviewSubmissionResult,
  ReviewSubmissionPayload,
  ReviewFileChange,
  ReviewComment,
} from './integration';
import QmdExportService, { type ExportFormat } from '@modules/export';
import type { ResolvedGitConfig, GitProviderType } from './types';

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
  private static readonly SUPPORTED_PROVIDERS: GitProviderType[] = [
    'github',
    'gitlab',
    'gitea',
    'forgejo',
    'azure-devops',
  ];

  constructor(
    private readonly git: GitModule,
    private readonly exporter: QmdExportService
  ) {}

  public getRepositoryConfig(): ResolvedGitConfig['repository'] | null {
    return this.git.getConfig()?.repository ?? null;
  }

  public requiresAuthToken(): boolean {
    if (typeof this.git.requiresAuthToken === 'function') {
      return this.git.requiresAuthToken();
    }
    return false;
  }

  public updateAuthToken(token?: string): void {
    if (typeof this.git.setAuthToken === 'function') {
      this.git.setAuthToken(token);
    }
  }

  public async submitReview(
    options: SubmitReviewOptions
  ): Promise<ReviewSubmissionContext> {
    if (!this.git.isEnabled()) {
      throw new Error('Git integration is not configured');
    }

    const providerType = this.git.getConfig()?.provider;
    if (
      providerType &&
      !GitReviewService.SUPPORTED_PROVIDERS.includes(providerType)
    ) {
      throw new Error(
        `Automated review submission is not yet supported for ${providerType}.`
      );
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

    try {
      const result = await this.git.submitReview(payload);
      return {
        bundle,
        result,
      };
    } catch (error) {
      await this.persistFallback(bundle, payload, error as Error);
      throw error;
    }
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

  private async persistFallback(
    bundle: Awaited<ReturnType<QmdExportService['createBundle']>>,
    payload: ReviewSubmissionPayload,
    error: Error
  ): Promise<void> {
    const store = this.git.getFallbackStore?.();
    if (!store || typeof store.saveFile !== 'function') {
      return;
    }
    try {
      const timestamp = new Date().toISOString();
      const filename = `review-fallback-${timestamp}.json`;
      const record = {
        timestamp,
        error: error.message ?? String(error),
        payload,
        files: bundle.files.map((file) => ({
          filename: file.filename,
          origin: file.origin,
        })),
      };
      await store.saveFile(
        filename,
        JSON.stringify(record, null, 2),
        `Fallback review payload (${payload.pullRequest.title})`
      );
    } catch (persistError) {
      console.warn('Failed to persist fallback review payload:', persistError);
    }
  }
}

export default GitReviewService;
