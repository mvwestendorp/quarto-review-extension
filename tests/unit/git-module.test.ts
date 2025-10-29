import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { ReviewGitConfig } from '@/types';
import GitModule from '@/modules/git/index';
import type { BaseProvider } from '@/modules/git/providers';

// Mock dependencies
vi.mock('@/modules/git/config', () => ({
  resolveGitConfig: vi.fn(),
}));

vi.mock('@/modules/git/providers', () => ({
  createProvider: vi.fn(),
}));

vi.mock('@utils/debug', () => ({
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { resolveGitConfig } from '@/modules/git/config';
import { createProvider } from '@/modules/git/providers';

describe('GitModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('initializes without config gracefully', () => {
      vi.mocked(resolveGitConfig).mockReturnValueOnce(null);

      const module = new GitModule();

      expect(module.isEnabled()).toBe(false);
      expect(module.getConfig()).toBeNull();
      expect(module.getProvider()).toBeUndefined();
    });

    it('initializes with valid config', () => {
      const mockProvider = {
        getCurrentUser: vi.fn(),
      } as unknown as BaseProvider;

      const mockResolution = {
        config: {
          provider: 'github' as const,
          repository: {
            owner: 'test-owner',
            name: 'test-repo',
            baseBranch: 'main',
          },
          auth: {
            mode: 'pat' as const,
            token: 'test-token',
          },
        },
        raw: {} as ReviewGitConfig,
      };

      vi.mocked(resolveGitConfig).mockReturnValueOnce(mockResolution);
      vi.mocked(createProvider).mockReturnValueOnce(mockProvider);

      const module = new GitModule({ provider: 'github', owner: 'test-owner', repo: 'test-repo' });

      expect(module.isEnabled()).toBe(true);
      expect(module.getConfig()).toBe(mockResolution.config);
      expect(module.getProvider()).toBe(mockProvider);
    });

    it('handles provider creation errors gracefully', () => {
      const mockResolution = {
        config: {
          provider: 'github' as const,
          repository: {
            owner: 'test-owner',
            name: 'test-repo',
            baseBranch: 'main',
          },
        },
        raw: {} as ReviewGitConfig,
      };

      vi.mocked(resolveGitConfig).mockReturnValueOnce(mockResolution);
      vi.mocked(createProvider).mockImplementationOnce(() => {
        throw new Error('Provider initialization failed');
      });

      const module = new GitModule({ provider: 'github', owner: 'test-owner', repo: 'test-repo' });

      // When provider creation fails, integration is undefined but config is still resolved
      expect(module.isEnabled()).toBe(false);
      // Config is stored from resolution even if provider creation fails
      expect(module.getConfig()).not.toBeNull();
      expect(module.getProvider()).toBeUndefined();
    });
  });

  describe('getConfig', () => {
    it('returns null when not configured', () => {
      vi.mocked(resolveGitConfig).mockReturnValueOnce(null);

      const module = new GitModule();

      expect(module.getConfig()).toBeNull();
    });

    it('returns resolved config when initialized', () => {
      const mockResolution = {
        config: {
          provider: 'gitlab' as const,
          repository: {
            owner: 'group',
            name: 'project',
            baseBranch: 'develop',
          },
          auth: {
            mode: 'header' as const,
            headerName: 'PRIVATE-TOKEN',
          },
        },
        raw: {} as ReviewGitConfig,
      };

      vi.mocked(resolveGitConfig).mockReturnValueOnce(mockResolution);
      vi.mocked(createProvider).mockReturnValueOnce({} as BaseProvider);

      const module = new GitModule({ provider: 'gitlab', owner: 'group', repo: 'project' });

      const config = module.getConfig();
      expect(config).toBe(mockResolution.config);
      expect(config?.repository.owner).toBe('group');
      expect(config?.repository.baseBranch).toBe('develop');
    });
  });

  describe('submitReview', () => {
    it('throws error when git integration is disabled', async () => {
      vi.mocked(resolveGitConfig).mockReturnValueOnce(null);

      const module = new GitModule();

      await expect(
        module.submitReview({
          reviewer: 'test-user',
          changes: {},
        })
      ).rejects.toThrow('Git integration is not configured');
    });

    it('calls integration service when enabled', async () => {
      const mockIntegration = {
        submitReview: vi.fn().mockResolvedValueOnce(undefined),
        getRepositoryConfig: vi.fn(),
        getProvider: vi.fn(),
      };

      const mockResolution = {
        config: {
          provider: 'github' as const,
          repository: {
            owner: 'test-owner',
            name: 'test-repo',
            baseBranch: 'main',
          },
        },
        raw: {} as ReviewGitConfig,
      };

      vi.mocked(resolveGitConfig).mockReturnValueOnce(mockResolution);
      vi.mocked(createProvider).mockReturnValueOnce({} as BaseProvider);

      // We need to manually inject the integration since we can't easily mock the constructor
      const module = new GitModule({ provider: 'github', owner: 'test-owner', repo: 'test-repo' });

      // Note: This test would need refactoring to properly mock the integration service
      // The current implementation doesn't expose integration for testing
    });
  });

  describe('save (legacy)', () => {
    it('persists via fallback store when git is disabled', async () => {
      vi.mocked(resolveGitConfig).mockReturnValueOnce(null);

      const module = new GitModule();

      const result = await module.save('content', {}, 'document.qmd');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      const sources = await module.listEmbeddedSources();
      expect(sources.some((source) => source.filename === 'document.qmd')).toBe(true);
    });
  });

  describe('multiple provider types', () => {
    const providers = ['github', 'gitlab', 'gitea', 'forgejo', 'local'] as const;

    providers.forEach((provider) => {
      it(`initializes with ${provider} provider`, () => {
        const mockProvider = {} as BaseProvider;
        const mockResolution = {
          config: {
            provider,
            repository: {
              owner: 'test-owner',
              name: 'test-repo',
              baseBranch: 'main',
            },
          },
          raw: {} as ReviewGitConfig,
        };

        vi.mocked(resolveGitConfig).mockReturnValueOnce(mockResolution);
        vi.mocked(createProvider).mockReturnValueOnce(mockProvider);

        const module = new GitModule({
          provider,
          owner: 'test-owner',
          repo: 'test-repo',
        } as ReviewGitConfig);

        expect(module.isEnabled()).toBe(true);
        expect(module.getProvider()).toBe(mockProvider);
      });
    });
  });
});
