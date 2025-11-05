import { createModuleLogger } from '@utils/debug';
import type { ReviewGitConfig } from '@/types';
import { resolveGitConfig } from './config';
import { createProvider } from './providers';
import type { BaseProvider } from './providers';
import GitIntegrationService, {
  type ReviewSubmissionPayload,
  type ReviewSubmissionResult,
} from './integration';
import type { ResolvedGitConfig } from './types';
import { EmbeddedSourceStore, type EmbeddedSourceRecord } from './fallback';

const logger = createModuleLogger('GitModule');

export class GitModule {
  private readonly resolution: ReturnType<typeof resolveGitConfig>;
  private readonly provider?: BaseProvider;
  private readonly integration?: GitIntegrationService;
  private readonly fallbackStore: EmbeddedSourceStore;
  private authToken?: string;

  constructor(rawConfig?: ReviewGitConfig) {
    this.resolution = resolveGitConfig(rawConfig);
    this.fallbackStore = new EmbeddedSourceStore();

    if (!this.resolution) {
      logger.warn('Git integration disabled (no configuration provided)');
      logger.info('To enable git integration, add review.git configuration to your document metadata');
      return;
    }

    try {
      const initialToken =
        this.resolution?.config.auth?.mode === 'pat'
          ? this.resolution.config.auth?.token
          : undefined;
      this.authToken = initialToken;

      logger.info(`Initializing git integration with provider: ${this.resolution.config.provider}`);
      logger.debug(`Repository: ${this.resolution.config.repository.owner}/${this.resolution.config.repository.name}`);
      logger.debug(`Auth mode: ${this.resolution.config.auth?.mode || 'none'}`);

      this.provider = createProvider(this.resolution.config);
      if (initialToken) {
        this.provider.updateAuthToken(initialToken);
        logger.debug('Auth token provided in configuration');
      } else if (this.resolution.config.auth?.mode === 'pat') {
        logger.info('PAT auth mode enabled - token will be requested when submitting review');
      }

      this.integration = new GitIntegrationService(
        this.provider,
        this.resolution.config
      );
      const repo = this.resolution.config.repository;
      logger.info(
        `✓ Git integration enabled for ${repo.owner}/${repo.name} (base: ${repo.baseBranch})`
      );
    } catch (error) {
      logger.error('Failed to initialize git provider:', error);
      logger.error('Git integration will be disabled. Check your configuration.');
    }
  }

  public isEnabled(): boolean {
    return Boolean(this.integration);
  }

  public getConfig(): ResolvedGitConfig | null {
    return this.resolution?.config ?? null;
  }

  public getProvider(): BaseProvider | undefined {
    return this.provider;
  }

  public requiresAuthToken(): boolean {
    const authMode = this.resolution?.config.auth?.mode;
    return authMode === 'pat' && !this.authToken;
  }

  public setAuthToken(token?: string): void {
    this.authToken = token;
    if (this.provider) {
      this.provider.updateAuthToken(token);
    }
  }

  public getFallbackStore(): EmbeddedSourceStore {
    return this.fallbackStore;
  }

  public submitReview(
    payload: ReviewSubmissionPayload
  ): Promise<ReviewSubmissionResult> {
    if (!this.integration) {
      throw new Error('Git integration is not configured');
    }

    return this.integration.submitReview(payload);
  }

  /**
   * Backwards compatible placeholder for the legacy `save` workflow.
   * The new git integration operates via pull requests instead of direct saves.
   */
  public async save(
    _content: string,
    _summary: unknown,
    _filepath = 'document.qmd'
  ): Promise<string> {
    const message = typeof _summary === 'string' ? _summary : 'Update file';

    if (!this.integration) {
      const result = await this.fallbackStore.saveFile(
        _filepath,
        _content,
        message
      );
      return result.version;
    }

    logger.warn(
      'Direct git saves are not supported yet. Submit a review instead.'
    );
    return '';
  }

  public async listEmbeddedSources(): Promise<EmbeddedSourceRecord[]> {
    return this.fallbackStore.listSources();
  }

  public async getEmbeddedSource(
    filename: string
  ): Promise<EmbeddedSourceRecord | undefined> {
    return this.fallbackStore.getSource(filename);
  }
}

export { EmbeddedSourceStore } from './fallback';

export type {
  ReviewSubmissionPayload,
  ReviewSubmissionResult,
} from './integration';

export type { ReviewFileChange, ReviewComment } from './integration';

export default GitModule;
