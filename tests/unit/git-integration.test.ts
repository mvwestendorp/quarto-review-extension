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
    describe('validation', () => {
      it('throws error when reviewer name is missing', async () => {
        const payload: ReviewSubmissionPayload = {
          reviewer: '',
          documentContent: 'content',
          pullRequest: {
            title: 'Test PR',
            body: 'Test body',
          },
        };

        await expect(service.submitReview(payload)).rejects.toThrow(
          'Reviewer name is required'
        );
      });

      it('throws error when document content is missing', async () => {
        const payload: ReviewSubmissionPayload = {
          reviewer: 'test-user',
          documentContent: '',
          pullRequest: {
            title: 'Test PR',
            body: 'Test body',
          },
        };

        await expect(service.submitReview(payload)).rejects.toThrow(
          'Document content is required'
        );
      });

      it('throws error when pull request title is missing', async () => {
        const payload: ReviewSubmissionPayload = {
          reviewer: 'test-user',
          documentContent: 'content',
          pullRequest: {
            title: '',
            body: 'Test body',
          },
        };

        await expect(service.submitReview(payload)).rejects.toThrow(
          'Pull request title is required'
        );
      });

      it('throws error when pull request body is missing', async () => {
        const payload: ReviewSubmissionPayload = {
          reviewer: 'test-user',
          documentContent: 'content',
          pullRequest: {
            title: 'Test PR',
            body: '',
          },
        };

        await expect(service.submitReview(payload)).rejects.toThrow(
          'Pull request body is required'
        );
      });

      it('throws error for invalid branch name', async () => {
        const payload: ReviewSubmissionPayload = {
          reviewer: 'test-user',
          documentContent: 'content',
          branchName: 'invalid branch name!',
          pullRequest: {
            title: 'Test PR',
            body: 'Test body',
          },
        };

        await expect(service.submitReview(payload)).rejects.toThrow(
          'Invalid branch name'
        );
      });

      it('throws error when source file is not specified', async () => {
        const configWithoutSourceFile: ResolvedGitConfig = {
          provider: 'github',
          repository: {
            owner: 'test-owner',
            name: 'test-repo',
            baseBranch: 'main',
          },
        };

        const serviceWithoutSourceFile = new GitIntegrationService(
          mockProvider,
          configWithoutSourceFile
        );

        const payload: ReviewSubmissionPayload = {
          reviewer: 'test-user',
          documentContent: 'content',
          pullRequest: {
            title: 'Test PR',
            body: 'Test body',
          },
        };

        await expect(serviceWithoutSourceFile.submitReview(payload)).rejects.toThrow(
          'No source file specified in payload or configuration'
        );
      });
    });

    describe('successful workflow', () => {
      it('creates branch, commits, and opens PR', async () => {
        const payload: ReviewSubmissionPayload = {
          reviewer: 'test-user',
          documentContent: '# Reviewed Document\n\nContent here',
          pullRequest: {
            title: 'Review by test-user',
            body: 'This is my review',
          },
        };

        vi.mocked(mockProvider.createBranch).mockResolvedValue({
          name: 'refs/heads/review/test-user/20231104',
          sha: 'abc123',
        });

        vi.mocked(mockProvider.getFileContent).mockResolvedValue({
          path: 'document.qmd',
          sha: 'def456',
          content: '# Original Document',
        });

        vi.mocked(mockProvider.createOrUpdateFile).mockResolvedValue({
          path: 'document.qmd',
          sha: 'ghi789',
          commitSha: 'commit123',
          url: 'https://github.com/test-owner/test-repo/blob/commit123/document.qmd',
        });

        vi.mocked(mockProvider.createPullRequest).mockResolvedValue({
          number: 42,
          url: 'https://github.com/test-owner/test-repo/pull/42',
          title: 'Review by test-user',
          body: 'This is my review',
          state: 'open',
          author: 'test-user',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        vi.mocked(mockProvider.createReviewComments).mockResolvedValue([]);

        const result = await service.submitReview(payload);

        expect(result.pullRequest.number).toBe(42);
        expect(result.pullRequest.url).toBe(
          'https://github.com/test-owner/test-repo/pull/42'
        );
        expect(result.commit.sha).toBe('commit123');
        expect(result.comments).toEqual([]);

        expect(mockProvider.createBranch).toHaveBeenCalled();
        expect(mockProvider.getFileContent).toHaveBeenCalled();
        expect(mockProvider.createOrUpdateFile).toHaveBeenCalled();
        expect(mockProvider.createPullRequest).toHaveBeenCalled();
      });

      it('includes review comments when provided', async () => {
        const payload: ReviewSubmissionPayload = {
          reviewer: 'test-user',
          documentContent: '# Reviewed Document',
          pullRequest: {
            title: 'Review by test-user',
            body: 'This is my review',
          },
          comments: [
            {
              path: 'document.qmd',
              line: 10,
              body: 'Great point!',
            },
          ],
        };

        vi.mocked(mockProvider.createBranch).mockResolvedValue({
          name: 'refs/heads/review/test-user/20231104',
          sha: 'abc123',
        });

        vi.mocked(mockProvider.getFileContent).mockResolvedValue({
          path: 'document.qmd',
          sha: 'def456',
          content: '# Original Document',
        });

        vi.mocked(mockProvider.createOrUpdateFile).mockResolvedValue({
          path: 'document.qmd',
          sha: 'ghi789',
          commitSha: 'commit123',
          url: 'https://github.com/test-owner/test-repo/blob/commit123/document.qmd',
        });

        vi.mocked(mockProvider.createPullRequest).mockResolvedValue({
          number: 42,
          url: 'https://github.com/test-owner/test-repo/pull/42',
          title: 'Review by test-user',
          body: 'This is my review',
          state: 'open',
          author: 'test-user',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        vi.mocked(mockProvider.createReviewComments).mockResolvedValue([
          {
            id: 'comment123',
            url: 'https://github.com/test-owner/test-repo/pull/42#discussion_r123',
            path: 'document.qmd',
            line: 10,
          },
        ]);

        const result = await service.submitReview(payload);

        expect(result.comments).toHaveLength(1);
        expect(result.comments[0].id).toBe('comment123');
        expect(mockProvider.createReviewComments).toHaveBeenCalledWith(
          42,
          payload.comments,
          'commit123'
        );
      });

      it('gracefully handles comment creation failure', async () => {
        const payload: ReviewSubmissionPayload = {
          reviewer: 'test-user',
          documentContent: '# Reviewed Document',
          pullRequest: {
            title: 'Review by test-user',
            body: 'This is my review',
          },
          comments: [
            {
              path: 'document.qmd',
              line: 10,
              body: 'Great point!',
            },
          ],
        };

        vi.mocked(mockProvider.createBranch).mockResolvedValue({
          name: 'refs/heads/review/test-user/20231104',
          sha: 'abc123',
        });

        vi.mocked(mockProvider.getFileContent).mockResolvedValue({
          path: 'document.qmd',
          sha: 'def456',
          content: '# Original Document',
        });

        vi.mocked(mockProvider.createOrUpdateFile).mockResolvedValue({
          path: 'document.qmd',
          sha: 'ghi789',
          commitSha: 'commit123',
        });

        vi.mocked(mockProvider.createPullRequest).mockResolvedValue({
          number: 42,
          url: 'https://github.com/test-owner/test-repo/pull/42',
          title: 'Review by test-user',
          body: 'This is my review',
          state: 'open',
          author: 'test-user',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Simulate comment creation failure
        vi.mocked(mockProvider.createReviewComments).mockRejectedValue(
          new Error('GitHub API error')
        );

        // Should still succeed even if comments fail
        const result = await service.submitReview(payload);

        expect(result.pullRequest.number).toBe(42);
        expect(result.comments).toEqual([]);
      });
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
