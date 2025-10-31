import { createModuleLogger } from '@utils/debug';
import type { BaseProvider } from './providers';
import type { ResolvedGitConfig } from './types';

const logger = createModuleLogger('GitIntegration');

export interface ReviewSubmissionPayload {
  reviewer: string;
  changes: unknown;
  comments?: unknown;
  metadata?: Record<string, unknown>;
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

  public async submitReview(_payload: ReviewSubmissionPayload): Promise<void> {
    logger.warn('Git integration submitReview is not implemented yet');
    throw new Error('Git integration workflow is not implemented yet');
  }
}

export default GitIntegrationService;
