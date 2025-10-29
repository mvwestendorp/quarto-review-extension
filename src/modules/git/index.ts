import { createModuleLogger } from '@utils/debug';
import type { ReviewGitConfig } from '@/types';
import { resolveGitConfig } from './config';
import { createProvider } from './providers';
import type { BaseProvider } from './providers';
import GitIntegrationService, {
  type ReviewSubmissionPayload,
} from './integration';
import type { ResolvedGitConfig } from './types';

const logger = createModuleLogger('GitModule');

export class GitModule {
  private readonly resolution: ReturnType<typeof resolveGitConfig>;
  private readonly provider?: BaseProvider;
  private readonly integration?: GitIntegrationService;

  constructor(rawConfig?: ReviewGitConfig) {
    this.resolution = resolveGitConfig(rawConfig);

    if (!this.resolution) {
      logger.info('Git integration disabled (no configuration provided)');
      return;
    }

    try {
      this.provider = createProvider(this.resolution.config);
      this.integration = new GitIntegrationService(
        this.provider,
        this.resolution.config
      );
      const repo = this.resolution.config.repository;
      logger.debug(
        `Git integration configured for ${repo.owner}/${repo.name} (base: ${repo.baseBranch})`
      );
    } catch (error) {
      logger.error('Failed to initialize git provider:', error);
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

  public async submitReview(
    payload: ReviewSubmissionPayload
  ): Promise<void> {
    if (!this.integration) {
      throw new Error('Git integration is not configured');
    }

    await this.integration.submitReview(payload);
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
    logger.warn('Direct git saves are not supported yet. Submit a review instead.');
    return '';
  }
}

export default GitModule;
