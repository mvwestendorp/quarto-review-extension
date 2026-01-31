import type GitModule from './index';
import type {
  ReviewSubmissionResult,
  ReviewSubmissionPayload,
  ReviewFileChange,
  ReviewComment,
} from './integration';
import QmdExportService, {
  type ExportFormat,
  type OperationSnapshot,
} from '@modules/export';
import type { ResolvedGitConfig, GitProviderType } from './types';
import type { PullRequest } from './providers';
import type { Operation, InsertData, EditData, DeleteData } from '@/types';

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
  private static readonly NO_CHANGES_ERROR =
    'No tracked document changes were found. Make edits in the document before submitting a review.';

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

    const projectSources = await this.git.listEmbeddedSources();
    const fallbackBase =
      options.baseBranch ??
      this.git.getConfig()?.repository.baseBranch ??
      'main';
    const repositoryState = await this.git.ensureRepositoryInitialized(
      projectSources,
      fallbackBase
    );

    const format = options.format ?? 'clean';
    const operationSnapshots =
      await this.exporter.getOperationSnapshots(format);
    const hasComments = (options.comments?.length ?? 0) > 0;
    const commentOnly = !operationSnapshots?.length;

    if (commentOnly && !hasComments) {
      throw new Error(GitReviewService.NO_CHANGES_ERROR);
    }

    // When submitting comments only (no text edits), embed the comment
    // annotations directly in the exported content so they appear in the diff.
    const bundle = await this.exporter.createBundle({
      format,
      includeCommentsInOutput: commentOnly,
    });

    let changedFiles: Array<{ filename: string; content: string }>;
    let filteredSnapshots: OperationSnapshot[];

    if (commentOnly) {
      // All files carry embedded comments – submit the full bundle.
      changedFiles = bundle.files;
      filteredSnapshots = [];
    } else {
      ({ files: changedFiles, snapshots: filteredSnapshots } =
        this.selectFilesForSubmission(bundle.files, operationSnapshots));
      if (!changedFiles.length) {
        throw new Error(GitReviewService.NO_CHANGES_ERROR);
      }
    }

    // Patch each file's original source in-place so that only the spans the
    // user actually changed are different from the seeded original.  This
    // avoids the whitespace/list-marker/table-alignment noise that appears
    // when the full document is reconstructed from pandoc.write() output.
    // Fall back to the reconstructed bundle content when patching is not
    // possible (e.g. chained inserts or missing source positions).
    const patchedFiles = changedFiles.map((file) => {
      const originalSource = projectSources.find(
        (s) => s.filename === file.filename
      )?.content;
      if (originalSource) {
        const patched =
          this.exporter.patchSourceWithTrackedChanges(originalSource);
        if (patched != null) return { ...file, content: patched };
      }
      return file;
    });

    const files = this.toReviewFiles(
      patchedFiles,
      options.commitMessage,
      filteredSnapshots
    );

    const payload: ReviewSubmissionPayload = {
      reviewer: options.reviewer,
      files,
      branchName: options.branchName,
      baseBranch: repositoryState.baseBranch,
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
    commitMessage?: string,
    snapshots?: OperationSnapshot[]
  ): ReviewFileChange[] {
    const perFileMessages = new Map<string, string>();

    if (snapshots && snapshots.length > 0) {
      const grouped = new Map<string, string[]>();
      snapshots.forEach((snapshot) => {
        const message = this.describeOperation(snapshot);
        if (!grouped.has(snapshot.filename)) {
          grouped.set(snapshot.filename, []);
        }
        grouped.get(snapshot.filename)!.push(message);
      });

      grouped.forEach((messages, filename) => {
        perFileMessages.set(filename, messages.join('; '));
      });
    }

    return files.map((file) => ({
      path: file.filename,
      content: file.content,
      message: perFileMessages.get(file.filename) ?? commitMessage,
    }));
  }

  private selectFilesForSubmission(
    files: Array<{ filename: string; content: string }>,
    snapshots: OperationSnapshot[]
  ): {
    files: Array<{ filename: string; content: string }>;
    snapshots: OperationSnapshot[];
  } {
    if (!snapshots?.length) {
      return { files: [], snapshots: [] };
    }

    const changedFilenames = new Set(
      snapshots
        .map((snapshot) => snapshot.filename?.trim())
        .filter((name): name is string => Boolean(name))
    );

    if (changedFilenames.size === 0) {
      return { files: [], snapshots: [] };
    }

    const filteredFiles = files.filter((file) =>
      changedFilenames.has(file.filename)
    );
    const filteredSnapshots = snapshots.filter((snapshot) =>
      changedFilenames.has(snapshot.filename)
    );

    return {
      files: filteredFiles,
      snapshots: filteredSnapshots,
    };
  }

  private describeOperation(snapshot: OperationSnapshot): string {
    const operation = snapshot.operation;
    const elementType = this.getOperationElementType(operation);
    const details = elementType
      ? `${operation.type} ${elementType}`
      : operation.type;
    return `${snapshot.filename}: ${details} (step ${snapshot.index + 1})`;
  }

  private getOperationElementType(operation: Operation): string | undefined {
    switch (operation.type) {
      case 'insert':
        return (operation.data as InsertData).metadata?.type;
      case 'edit':
        return (
          (operation.data as EditData).newMetadata?.type ||
          (operation.data as EditData).oldMetadata?.type
        );
      case 'delete':
        return (operation.data as DeleteData).originalMetadata?.type;
      default:
        return undefined;
    }
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

  public async getPullRequest(number: number): Promise<PullRequest | null> {
    return this.git.getPullRequest(number);
  }

  public async getRepositoryDetails(): Promise<{
    name: string;
    description: string;
    url: string;
    defaultBranch: string;
  } | null> {
    return this.git.getRepositoryMetadata();
  }
}

export default GitReviewService;
