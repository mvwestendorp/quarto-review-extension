/**
 * Git Providers
 * Exports all provider implementations
 */

export { BaseProvider } from './base';
export { GitHubProvider } from './github';
export { GitLabProvider } from './gitlab';
export { GiteaProvider, ForgejoProvider } from './gitea';
export { LocalProvider } from './local';

export type { PullRequest, Issue, ProviderConfig } from './base';

import { GitHubProvider } from './github';
import { GitLabProvider } from './gitlab';
import { GiteaProvider } from './gitea';
import { LocalProvider } from './local';
import type { BaseProvider, ProviderConfig } from './base';
import type { ResolvedGitConfig } from '../types';

/**
 * Create a provider instance based on type
 */
export function createProvider(resolved: ResolvedGitConfig): BaseProvider {
  const { provider, repository, auth, options } = resolved;

  const apiUrl = isString(options?.apiUrl)
    ? (options?.apiUrl as string)
    : undefined;

  const fallbackToken = isString(options?.token)
    ? (options?.token as string)
    : undefined;

  const baseConfig: ProviderConfig = {
    url: apiUrl,
    token: auth?.mode === 'pat' ? auth.token : fallbackToken,
    owner: repository.owner,
    repo: repository.name,
    auth,
  };

  switch (provider) {
    case 'github':
      return new GitHubProvider({
        ...baseConfig,
        url: baseConfig.url || 'https://api.github.com',
      });
    case 'gitlab':
      return new GitLabProvider({
        ...baseConfig,
        url: baseConfig.url || 'https://gitlab.com/api/v4',
        projectId: isString(options?.projectId)
          ? (options?.projectId as string)
          : undefined,
      });
    case 'gitea':
    case 'forgejo':
      return new GiteaProvider({
        ...baseConfig,
        url: baseConfig.url || 'https://gitea.com/api/v1',
      });
    case 'local':
      return new LocalProvider();
    default:
      throw new Error(`Unknown provider type: ${provider as string}`);
  }
}

export default createProvider;

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
