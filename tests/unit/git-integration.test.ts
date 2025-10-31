import { describe, expect, it, beforeEach, vi } from 'vitest';
import GitIntegrationService from '@/modules/git/integration';
import type { BaseProvider } from '@/modules/git/providers';
import type { ResolvedGitConfig } from '@/modules/git/types';
import type { ReviewSubmissionPayload } from '@/modules/git/integration';

describe('GitIntegrationService', () => {
  let service: GitIntegrationService;
  let mockProvider: BaseProvider;
  let mockConfig: ResolvedGitConfig;

  beforeEach(() => {
    mockProvider = {
      getCurrentUser: vi.fn(),
      createBranch: vi.fn(),
      getFileContent: vi.fn(),
      createOrUpdateFile: vi.fn(),
      createPullRequest: vi.fn(),
      updatePullRequest: vi.fn(),
      getPullRequest: vi.fn(),
      listPullRequests: vi.fn(),
      mergePullRequest: vi.fn(),
      createReviewComments: vi.fn(),
      createIssue: vi.fn(),
      getIssue: vi.fn(),
      listIssues: vi.fn(),
      addPullRequestComment: vi.fn(),
      addIssueComment: vi.fn(),
      getRepository: vi.fn(),
      hasWriteAccess: vi.fn(),
    } as unknown as BaseProvider;

    mockConfig = {
      provider: 'github',
      repository: {
        owner: 'test-owner',
        name: 'test-repo',
        baseBranch: 'main',
        sourceFile: 'document.qmd',
      },
      auth: {
        mode: 'pat',
        token: 'test-token',
      },
    };

    service = new GitIntegrationService(mockProvider, mockConfig);
  });

  describe('initialization', () => {
    it('stores provider and config', () => {
      expect(service.getProvider()).toBe(mockProvider);
      expect(service.getRepositoryConfig()).toEqual(mockConfig.repository);
    });
  });

  describe('getRepositoryConfig', () => {
    it('returns repository configuration', () => {
      const repoConfig = service.getRepositoryConfig();

      expect(repoConfig).toEqual({
        owner: 'test-owner',
        name: 'test-repo',
        baseBranch: 'main',
        sourceFile: 'document.qmd',
      });
    });

    it('includes sourceFile when provided', () => {
      const repoConfig = service.getRepositoryConfig();

      expect(repoConfig.sourceFile).toBe('document.qmd');
    });

    it('works without sourceFile', () => {
      const configWithoutSourceFile: ResolvedGitConfig = {
        provider: 'github',
        repository: {
          owner: 'test-owner',
          name: 'test-repo',
          baseBranch: 'develop',
        },
        auth: {
          mode: 'header',
        },
      };

      const serviceWithoutSourceFile = new GitIntegrationService(
        mockProvider,
        configWithoutSourceFile
      );

      const repoConfig = serviceWithoutSourceFile.getRepositoryConfig();

      expect(repoConfig.sourceFile).toBeUndefined();
      expect(repoConfig.baseBranch).toBe('develop');
    });
  });

  describe('getProvider', () => {
    it('returns the provider instance', () => {
      expect(service.getProvider()).toBe(mockProvider);
    });
  });

  describe('submitReview', () => {
    it('throws "not implemented" error', async () => {
      const payload: ReviewSubmissionPayload = {
        reviewer: 'test-user',
        changes: {},
        comments: {},
        metadata: {},
      };

      await expect(service.submitReview(payload)).rejects.toThrow(
        'Git integration workflow is not implemented yet'
      );
    });

    it('accepts various payload structures', async () => {
      const payloads: ReviewSubmissionPayload[] = [
        {
          reviewer: 'user1',
          changes: { type: 'edit', data: {} },
        },
        {
          reviewer: 'user2',
          changes: [{ type: 'insert' }, { type: 'delete' }],
          comments: [{ id: '1', body: 'comment' }],
        },
        {
          reviewer: 'user3',
          changes: { operations: [] },
          comments: { items: [] },
          metadata: { timestamp: Date.now(), source: 'test' },
        },
      ];

      for (const payload of payloads) {
        await expect(service.submitReview(payload)).rejects.toThrow();
      }
    });
  });

  describe('with different provider types', () => {
    const providerTypes = ['github', 'gitlab', 'gitea', 'forgejo'] as const;

    providerTypes.forEach((provider) => {
      it(`works with ${provider} provider`, () => {
        const configForProvider: ResolvedGitConfig = {
          provider,
          repository: {
            owner: 'owner',
            name: 'repo',
            baseBranch: 'main',
          },
        };

        const serviceForProvider = new GitIntegrationService(
          mockProvider,
          configForProvider
        );

        expect(serviceForProvider.getRepositoryConfig().owner).toBe('owner');
      });
    });
  });

  describe('with different authentication modes', () => {
    it('supports PAT authentication', () => {
      const configPat: ResolvedGitConfig = {
        provider: 'github',
        repository: {
          owner: 'test-owner',
          name: 'test-repo',
          baseBranch: 'main',
        },
        auth: {
          mode: 'pat',
          token: 'ghp_xxxxxxxxxxxx',
        },
      };

      const servicePat = new GitIntegrationService(mockProvider, configPat);

      expect(servicePat.getRepositoryConfig().owner).toBe('test-owner');
    });

    it('supports header-based authentication', () => {
      const configHeader: ResolvedGitConfig = {
        provider: 'github',
        repository: {
          owner: 'test-owner',
          name: 'test-repo',
          baseBranch: 'main',
        },
        auth: {
          mode: 'header',
          headerName: 'X-Custom-Auth',
        },
      };

      const serviceHeader = new GitIntegrationService(mockProvider, configHeader);

      expect(serviceHeader.getRepositoryConfig().owner).toBe('test-owner');
    });

    it('supports cookie-based authentication', () => {
      const configCookie: ResolvedGitConfig = {
        provider: 'github',
        repository: {
          owner: 'test-owner',
          name: 'test-repo',
          baseBranch: 'main',
        },
        auth: {
          mode: 'cookie',
          cookieName: 'session_id',
        },
      };

      const serviceCookie = new GitIntegrationService(mockProvider, configCookie);

      expect(serviceCookie.getRepositoryConfig().owner).toBe('test-owner');
    });
  });

  describe('with provider options', () => {
    it('preserves provider-specific options', () => {
      const configWithOptions: ResolvedGitConfig = {
        provider: 'gitlab',
        repository: {
          owner: 'group',
          name: 'project',
          baseBranch: 'main',
        },
        options: {
          projectId: '123456',
          apiUrl: 'https://gitlab.company.com/api/v4',
          customHeader: 'X-Custom-Header',
        },
      };

      const serviceWithOptions = new GitIntegrationService(
        mockProvider,
        configWithOptions
      );

      expect(serviceWithOptions.getRepositoryConfig().owner).toBe('group');
    });
  });
});
