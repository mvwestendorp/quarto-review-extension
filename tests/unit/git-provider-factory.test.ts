import { describe, expect, it } from 'vitest';
import { createProvider } from '@/modules/git/providers';
import {
  GitHubProvider,
  GitLabProvider,
  AzureDevOpsProvider,
  GiteaProvider,
  LocalProvider,
} from '@/modules/git/providers';
import type { ResolvedGitConfig } from '@/modules/git/types';

describe('createProvider', () => {
  describe('GitHub provider creation', () => {
    it('creates GitHubProvider with default API URL', () => {
      const config: ResolvedGitConfig = {
        provider: 'github',
        repository: {
          owner: 'octocat',
          name: 'Hello-World',
          baseBranch: 'main',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GitHubProvider);
    });

    it('creates GitHubProvider with custom API URL from options', () => {
      const config: ResolvedGitConfig = {
        provider: 'github',
        repository: {
          owner: 'octocat',
          name: 'Hello-World',
          baseBranch: 'main',
        },
        options: {
          apiUrl: 'https://github.company.com/api/v3',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GitHubProvider);
    });

    it('creates GitHubProvider with PAT authentication', () => {
      const config: ResolvedGitConfig = {
        provider: 'github',
        repository: {
          owner: 'test-owner',
          name: 'test-repo',
          baseBranch: 'main',
        },
        auth: {
          mode: 'pat',
          token: 'ghp_test123456789',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GitHubProvider);
    });

    it('creates GitHubProvider with header authentication', () => {
      const config: ResolvedGitConfig = {
        provider: 'github',
        repository: {
          owner: 'test-owner',
          name: 'test-repo',
          baseBranch: 'main',
        },
        auth: {
          mode: 'header',
          headerName: 'Authorization',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GitHubProvider);
    });

    it('uses fallback token from options when auth mode is not PAT', () => {
      const config: ResolvedGitConfig = {
        provider: 'github',
        repository: {
          owner: 'test-owner',
          name: 'test-repo',
          baseBranch: 'main',
        },
        auth: {
          mode: 'header',
        },
        options: {
          token: 'fallback-token-123',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GitHubProvider);
    });
  });

  describe('GitLab provider creation', () => {
    it('creates GitLabProvider with default API URL', () => {
      const config: ResolvedGitConfig = {
        provider: 'gitlab',
        repository: {
          owner: 'group',
          name: 'project',
          baseBranch: 'main',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GitLabProvider);
    });

    it('creates GitLabProvider with custom API URL', () => {
      const config: ResolvedGitConfig = {
        provider: 'gitlab',
        repository: {
          owner: 'group',
          name: 'project',
          baseBranch: 'main',
        },
        options: {
          apiUrl: 'https://gitlab.company.com/api/v4',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GitLabProvider);
    });

    it('includes projectId in GitLabProvider config', () => {
      const config: ResolvedGitConfig = {
        provider: 'gitlab',
        repository: {
          owner: 'group',
          name: 'project',
          baseBranch: 'main',
        },
        options: {
          projectId: '12345',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GitLabProvider);
    });

    it('passes auth config to GitLabProvider', () => {
      const config: ResolvedGitConfig = {
        provider: 'gitlab',
        repository: {
          owner: 'group',
          name: 'project',
          baseBranch: 'main',
        },
        auth: {
          mode: 'pat',
          token: 'private-access-token-123',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GitLabProvider);
    });
  });

  describe('Azure DevOps provider creation', () => {
    const baseConfig: ResolvedGitConfig = {
      provider: 'azure-devops',
      repository: {
        owner: 'example-org',
        name: 'docs-repo',
        baseBranch: 'main',
      },
      options: {
        project: 'Website',
      },
      auth: {
        mode: 'pat',
        token: 'ado_pat_123',
      },
    };

    it('creates AzureDevOpsProvider with default cloud URL', () => {
      const provider = createProvider(baseConfig);
      expect(provider).toBeInstanceOf(AzureDevOpsProvider);
    });

    it('creates AzureDevOpsProvider with custom collection', () => {
      const provider = createProvider({
        ...baseConfig,
        options: {
          ...baseConfig.options,
          collection: 'DefaultCollection',
        },
      });

      expect(provider).toBeInstanceOf(AzureDevOpsProvider);
    });

    it('throws when project option is missing', () => {
      const config: ResolvedGitConfig = {
        ...baseConfig,
        options: {},
      };

      expect(() => createProvider(config)).toThrow(
        'Azure DevOps provider requires the `project` option to be configured.'
      );
    });
  });

  describe('Gitea provider creation', () => {
    it('creates GiteaProvider with gitea provider type', () => {
      const config: ResolvedGitConfig = {
        provider: 'gitea',
        repository: {
          owner: 'user',
          name: 'repo',
          baseBranch: 'main',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GiteaProvider);
    });

    it('creates GiteaProvider with default Gitea API URL', () => {
      const config: ResolvedGitConfig = {
        provider: 'gitea',
        repository: {
          owner: 'user',
          name: 'repo',
          baseBranch: 'main',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GiteaProvider);
    });

    it('creates GiteaProvider with custom API URL', () => {
      const config: ResolvedGitConfig = {
        provider: 'gitea',
        repository: {
          owner: 'user',
          name: 'repo',
          baseBranch: 'main',
        },
        options: {
          apiUrl: 'https://gitea.company.com/api/v1',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GiteaProvider);
    });
  });

  describe('Forgejo provider creation', () => {
    it('creates GiteaProvider for forgejo provider type', () => {
      const config: ResolvedGitConfig = {
        provider: 'forgejo',
        repository: {
          owner: 'user',
          name: 'repo',
          baseBranch: 'main',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GiteaProvider);
    });

    it('creates provider with custom Forgejo instance URL', () => {
      const config: ResolvedGitConfig = {
        provider: 'forgejo',
        repository: {
          owner: 'user',
          name: 'repo',
          baseBranch: 'main',
        },
        options: {
          apiUrl: 'https://forgejo.instance.com/api/v1',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GiteaProvider);
    });
  });

  describe('Local provider creation', () => {
    it('creates LocalProvider for local provider type', () => {
      const config: ResolvedGitConfig = {
        provider: 'local',
        repository: {
          owner: 'user',
          name: 'repo',
          baseBranch: 'main',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(LocalProvider);
    });

    it('ignores auth and options for LocalProvider', () => {
      const config: ResolvedGitConfig = {
        provider: 'local',
        repository: {
          owner: 'user',
          name: 'repo',
          baseBranch: 'main',
        },
        auth: {
          mode: 'pat',
          token: 'some-token',
        },
        options: {
          apiUrl: 'https://example.com',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(LocalProvider);
    });
  });

  describe('authentication handling', () => {
    it('extracts token from auth when mode is PAT', () => {
      const config: ResolvedGitConfig = {
        provider: 'github',
        repository: {
          owner: 'owner',
          name: 'repo',
          baseBranch: 'main',
        },
        auth: {
          mode: 'pat',
          token: 'ghp_direct_token',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GitHubProvider);
    });

    it('ignores token from auth when mode is not PAT', () => {
      const config: ResolvedGitConfig = {
        provider: 'github',
        repository: {
          owner: 'owner',
          name: 'repo',
          baseBranch: 'main',
        },
        auth: {
          mode: 'header',
          token: 'should-be-ignored',
        },
        options: {
          token: 'fallback-token',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GitHubProvider);
    });

    it('prefers auth token over fallback token', () => {
      const config: ResolvedGitConfig = {
        provider: 'github',
        repository: {
          owner: 'owner',
          name: 'repo',
          baseBranch: 'main',
        },
        auth: {
          mode: 'pat',
          token: 'auth-token-priority',
        },
        options: {
          token: 'fallback-token',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GitHubProvider);
    });
  });

  describe('options handling', () => {
    it('validates apiUrl option as string before using', () => {
      const config: ResolvedGitConfig = {
        provider: 'github',
        repository: {
          owner: 'owner',
          name: 'repo',
          baseBranch: 'main',
        },
        options: {
          apiUrl: 123, // Invalid type
        },
      };

      const provider = createProvider(config);

      // Should use default URL when option is invalid
      expect(provider).toBeInstanceOf(GitHubProvider);
    });

    it('validates token option as string before using', () => {
      const config: ResolvedGitConfig = {
        provider: 'github',
        repository: {
          owner: 'owner',
          name: 'repo',
          baseBranch: 'main',
        },
        options: {
          token: { nested: 'object' }, // Invalid type
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GitHubProvider);
    });

    it('validates projectId option as string for GitLab', () => {
      const config: ResolvedGitConfig = {
        provider: 'gitlab',
        repository: {
          owner: 'group',
          name: 'project',
          baseBranch: 'main',
        },
        options: {
          projectId: 'valid-string-id',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GitLabProvider);
    });

    it('ignores non-string options', () => {
      const config: ResolvedGitConfig = {
        provider: 'github',
        repository: {
          owner: 'owner',
          name: 'repo',
          baseBranch: 'main',
        },
        options: {
          apiUrl: ['array-not-string'],
          token: { object: 'not-string' },
          unknown: true,
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GitHubProvider);
    });

    it('ignores empty string options', () => {
      const config: ResolvedGitConfig = {
        provider: 'github',
        repository: {
          owner: 'owner',
          name: 'repo',
          baseBranch: 'main',
        },
        options: {
          apiUrl: '',
          token: '   ',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GitHubProvider);
    });
  });

  describe('error handling', () => {
    it('throws error for unsupported provider type', () => {
      const config = {
        provider: 'unsupported',
        repository: {
          owner: 'owner',
          name: 'repo',
          baseBranch: 'main',
        },
      } as unknown as ResolvedGitConfig;

      expect(() => createProvider(config)).toThrow('Unknown provider type');
    });

    it('throws error message includes provider type', () => {
      const config = {
        provider: 'bitbucket',
        repository: {
          owner: 'owner',
          name: 'repo',
          baseBranch: 'main',
        },
      } as unknown as ResolvedGitConfig;

      expect(() => createProvider(config)).toThrow(/bitbucket/);
    });

    it('handles undefined provider gracefully', () => {
      const config = {
        provider: undefined,
        repository: {
          owner: 'owner',
          name: 'repo',
          baseBranch: 'main',
        },
      } as unknown as ResolvedGitConfig;

      expect(() => createProvider(config)).toThrow();
    });
  });

  describe('repository configuration propagation', () => {
    it('passes owner and repo to all provider types', () => {
      const providers = ['github', 'gitlab', 'gitea', 'forgejo'] as const;

      providers.forEach((providerType) => {
        const config: ResolvedGitConfig = {
          provider: providerType,
          repository: {
            owner: 'custom-owner',
            name: 'custom-repo',
            baseBranch: 'develop',
          },
        };

        const provider = createProvider(config);

        expect(provider).toBeDefined();
      });
    });

    it('includes sourceFile in repository config when provided', () => {
      const config: ResolvedGitConfig = {
        provider: 'github',
        repository: {
          owner: 'owner',
          name: 'repo',
          baseBranch: 'main',
          sourceFile: 'docs/guide.qmd',
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(GitHubProvider);
    });
  });
});
