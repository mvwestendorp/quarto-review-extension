/**
 * Unified Authentication Initialization
 *
 * Handles multiple authentication methods:
 * - oauth2-proxy (Kubernetes/Istio deployment)
 * - databricks-app (Databricks App deployment)
 *
 * Automatically detects which method to use based on configuration.
 * This module unifies the auth initialization across different deployment targets.
 */

import type { UserModule } from './index';
import { createModuleLogger } from '@utils/debug';
import {
  loginFromDatabricksAPI,
  type DatabricksAuthConfig,
} from './databricks-auth';
import type { UserAuthConfig } from '@/types';

const logger = createModuleLogger('AuthInit');

/**
 * Initialize authentication based on configuration
 *
 * Supports multiple authentication modes:
 * - 'oauth2-proxy': Headers injected by nginx/Istio (default for Kubernetes)
 * - 'databricks-app': Fetch from backend API (for Databricks App deployments)
 * - 'manual': No auto-authentication
 *
 * @param userModule - UserModule instance
 * @param config - User authentication configuration
 * @returns true if authentication succeeded, false otherwise
 *
 * @example
 * ```typescript
 * // In main.ts during initialization
 * const success = await initializeAuthentication(userModule, config.user?.auth);
 * ```
 */
export async function initializeAuthentication(
  userModule: UserModule,
  config?: UserAuthConfig
): Promise<boolean> {
  const mode = config?.mode || 'oauth2-proxy'; // Default to oauth2-proxy

  if (config?.debug) {
    logger.info('Initializing authentication', { mode });
  }

  // Check if already authenticated (e.g., from localStorage)
  if (userModule.isAuthenticated()) {
    if (config?.debug) {
      logger.debug('User already authenticated, skipping auth initialization');
    }
    return true;
  }

  try {
    switch (mode) {
      case 'databricks-app':
        return await initializeDatabricksAuth(userModule, config);

      case 'oauth2-proxy':
        return initializeOAuth2ProxyAuth(userModule, config);

      case 'manual':
        logger.info('Manual authentication mode: no auto-login attempted');
        return false;

      default:
        logger.warn(`Unknown authentication mode: ${mode}`);
        return false;
    }
  } catch (error) {
    logger.error('Error during authentication initialization', error);
    return false;
  }
}

/**
 * Initialize OAuth2-proxy authentication (for Kubernetes/Istio)
 *
 * Attempts to login using headers injected by nginx (via Istio oauth2-proxy).
 * This is the default method for on-premise Kubernetes deployments.
 *
 * @param userModule - UserModule instance
 * @param config - User authentication configuration
 * @returns true if authentication succeeded, false otherwise
 */
function initializeOAuth2ProxyAuth(
  userModule: UserModule,
  config?: UserAuthConfig
): boolean {
  if (config?.debug) {
    logger.info('Attempting OAuth2-proxy authentication');
  }

  const success = userModule.loginFromOAuth2ProxyHeaders();

  if (success) {
    logger.info('✓ OAuth2-proxy authentication successful');
    return true;
  }

  // Check if oauth2-proxy is configured but failed
  if (config?.userHeader) {
    const warning =
      '[Quarto Review] Warning: oauth2-proxy authentication is enabled but headers are missing. ' +
      'This usually means: 1) oauth2-proxy is not running, 2) Istio AuthorizationPolicy is not applied, ' +
      '3) Headers are not being forwarded to your app, or 4) You are not authenticated yet. ' +
      'Check browser DevTools -> Network tab for request headers like x-auth-request-user.';
    console.warn(warning);
    logger.warn(
      'oauth2-proxy configured but headers missing - check Istio config'
    );
  } else {
    logger.debug(
      'oauth2-proxy auth mode not explicitly configured (this is normal for Databricks deployments)'
    );
  }

  return false;
}

/**
 * Initialize Databricks App authentication
 *
 * Fetches user info from a backend API endpoint that reads Databricks headers.
 * This method is used for deployments as Databricks Apps.
 *
 * @param userModule - UserModule instance
 * @param config - User authentication configuration
 * @returns true if authentication succeeded, false otherwise
 */
async function initializeDatabricksAuth(
  userModule: UserModule,
  config?: UserAuthConfig
): Promise<boolean> {
  if (config?.debug) {
    logger.info('Attempting Databricks App authentication');
  }

  const databricksConfig: DatabricksAuthConfig = {
    endpoint: config?.databricks?.endpoint || '/api/userinfo',
    timeout: config?.databricks?.timeout || 5000,
    debug: config?.debug,
  };

  const user = await loginFromDatabricksAPI(databricksConfig);

  if (user) {
    logger.info('✓ Databricks App authentication successful', {
      userId: user.userId,
    });
    userModule.login(user);
    return true;
  }

  logger.warn('Databricks App authentication failed', {
    endpoint: databricksConfig.endpoint,
  });

  return false;
}

/**
 * Wrap authentication initialization with a delay
 *
 * Useful when DOM might not be fully ready when script loads.
 * Default delay is 100ms.
 *
 * @param userModule - UserModule instance
 * @param config - User authentication configuration
 * @param delayMs - Delay in milliseconds before attempting auth
 * @returns Promise that resolves to true if authentication succeeded
 *
 * @example
 * ```typescript
 * // In main.ts
 * await initializeAuthenticationAsync(userModule, config.user?.auth, 100);
 * ```
 */
export async function initializeAuthenticationAsync(
  userModule: UserModule,
  config?: UserAuthConfig,
  delayMs: number = 100
): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      initializeAuthentication(userModule, config).then(resolve);
    }, delayMs);
  });
}

/**
 * Backward compatibility: Keep oauth2-proxy-init exports
 *
 * These functions are kept for backward compatibility with existing code
 * that imports from oauth2-proxy-init.ts directly.
 * New code should use initializeAuthentication() instead.
 */

export function initializeOAuth2ProxyAuth_compat(
  userModule: UserModule
): boolean {
  return initializeOAuth2ProxyAuth(userModule);
}

export async function initializeOAuth2ProxyAuthAsync_compat(
  userModule: UserModule,
  delayMs?: number
): Promise<boolean> {
  return initializeAuthenticationAsync(
    userModule,
    { mode: 'oauth2-proxy' },
    delayMs
  );
}
