import { createModuleLogger } from '@utils/debug';
import type { ReviewGitConfig } from '@/types';
import type {
  GitAuthConfig,
  GitConfigResolution,
  GitProviderType,
  ResolvedGitConfig,
} from './types';

const logger = createModuleLogger('GitConfig');

const DEFAULT_BASE_BRANCH = 'main';
const DEFAULT_AUTH_MODE: GitAuthConfig['mode'] = 'header';

const VALID_PROVIDERS: GitProviderType[] = [
  'github',
  'gitlab',
  'gitea',
  'forgejo',
  'azure-devops',
  'local',
];

/**
 * Normalize raw git configuration supplied from Quarto metadata.
 */
export function resolveGitConfig(
  rawConfig?: ReviewGitConfig | null
): GitConfigResolution | null {
  console.log('[resolveGitConfig] Called with:', rawConfig);
  console.log(
    '[resolveGitConfig] Type:',
    typeof rawConfig,
    'Keys:',
    rawConfig ? Object.keys(rawConfig) : 'N/A'
  );

  if (!rawConfig) {
    console.log('[resolveGitConfig] Returning null - no config provided');
    return null;
  }

  const provider = normalizeProvider(rawConfig.provider);
  console.log('[resolveGitConfig] Normalized provider:', provider);

  if (!provider) {
    logger.warn(
      'Git integration disabled: missing or unsupported `review.git.provider` configuration'
    );
    console.log(
      '[resolveGitConfig] No valid provider. Raw provider value:',
      rawConfig.provider
    );
    return null;
  }

  const owner = (rawConfig.owner || '').trim();
  const name = (rawConfig.repo || '').trim();

  console.log('[resolveGitConfig] Owner:', owner, 'Repo:', name);

  if (!owner || !name) {
    logger.warn(
      'Git integration disabled: `review.git.owner` and `review.git.repo` are required'
    );
    console.log(
      '[resolveGitConfig] Missing owner or repo. rawConfig:',
      JSON.stringify(rawConfig, null, 2)
    );
    return null;
  }

  const baseBranch =
    (
      rawConfig.baseBranch ||
      (rawConfig['base-branch'] as string | undefined) ||
      DEFAULT_BASE_BRANCH
    ).trim() || DEFAULT_BASE_BRANCH;

  const sourceFile =
    (rawConfig.sourceFile as string | undefined) ||
    (rawConfig['source-file'] as string | undefined) ||
    undefined;

  const authConfig = normalizeAuthConfig(rawConfig.auth);

  const resolved: ResolvedGitConfig = {
    provider,
    repository: {
      owner,
      name,
      baseBranch,
      sourceFile,
    },
    auth: authConfig ?? undefined,
    options: rawConfig.options,
  };

  return {
    config: resolved,
    raw: rawConfig,
  };
}

export type { ResolvedGitConfig, GitConfigResolution } from './types';

function normalizeProvider(provider?: string): GitProviderType | null {
  if (!provider) return null;
  const normalized = provider.toLowerCase().trim();
  return VALID_PROVIDERS.includes(normalized as GitProviderType)
    ? (normalized as GitProviderType)
    : null;
}

function normalizeAuthConfig(
  config?: ReviewGitConfig['auth']
): GitAuthConfig | null {
  if (!config) {
    return null;
  }

  const mode = determineAuthMode(config);
  const record = config as Record<string, unknown> | undefined;

  const headerName =
    extractString(record, 'headerName') || extractString(record, 'header-name');
  const cookieName =
    extractString(record, 'cookieName') || extractString(record, 'cookie-name');
  const token = extractString(record, 'token');

  return {
    mode,
    headerName: headerName || 'Authorization',
    cookieName: cookieName || undefined,
    token: token || undefined,
  };
}

function determineAuthMode(
  config: ReviewGitConfig['auth']
): GitAuthConfig['mode'] {
  const modeValue = (config?.mode as string | undefined)?.toLowerCase();
  if (modeValue === 'header' || modeValue === 'cookie' || modeValue === 'pat') {
    return modeValue;
  }
  if (extractString(config as Record<string, unknown>, 'token')) {
    return 'pat';
  }
  return DEFAULT_AUTH_MODE;
}

function extractString(
  obj: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  if (!obj) return undefined;
  const value = obj[key];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}
