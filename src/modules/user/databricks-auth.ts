/**
 * Databricks App Authentication Module
 *
 * Optional authentication method for deployments as a Databricks App.
 * Only used when mode is set to 'databricks-app' in configuration.
 *
 * Databricks automatically forwards the authenticated user's information
 * via HTTP headers to apps running in the Databricks workspace.
 */

import { createModuleLogger } from '@utils/debug';
import type { User } from '@/types';

const logger = createModuleLogger('DatabricksAuth');

export interface DatabricksAuthConfig {
  /** API endpoint for user info (default: /api/userinfo) */
  endpoint?: string;
  /** Timeout for API call in milliseconds (default: 5000) */
  timeout?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

export interface DatabricksUserInfo {
  authenticated: boolean;
  userId?: string;
  email?: string;
  displayName?: string;
  role?: string;
  source?: string;
  error?: string;
}

/**
 * Fetch user info from Databricks App backend API
 *
 * The backend endpoint should read the following headers set by Databricks:
 * - x-forwarded-access-token: OAuth token for the authenticated user
 * - x-forwarded-user: Username/email of the authenticated user
 *
 * @param config - Databricks authentication configuration
 * @returns User object if authenticated, null otherwise
 *
 * @example
 * ```typescript
 * const user = await loginFromDatabricksAPI({
 *   endpoint: '/api/userinfo',
 *   timeout: 5000
 * });
 * if (user) {
 *   userModule.login(user.userId, user.email, user.role);
 * }
 * ```
 */
export async function loginFromDatabricksAPI(
  config: DatabricksAuthConfig = {}
): Promise<User | null> {
  const endpoint = config.endpoint || '/api/userinfo';
  const timeout = config.timeout || 5000;
  const debug = config.debug || false;

  if (debug) {
    logger.info('Attempting Databricks App authentication', {
      endpoint,
      timeout,
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    if (debug) {
      logger.debug('Sending request to Databricks API endpoint', { endpoint });
    }

    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (debug) {
      logger.debug('Databricks API response received', {
        status: response.status,
        statusText: response.statusText,
      });
    }

    if (!response.ok) {
      logger.warn('Databricks API authentication failed', {
        status: response.status,
        statusText: response.statusText,
        endpoint,
      });
      return null;
    }

    let data: DatabricksUserInfo;
    try {
      data = await response.json();
    } catch (parseError) {
      logger.error(
        'Failed to parse Databricks API response as JSON',
        parseError
      );
      return null;
    }

    if (debug) {
      logger.debug('Databricks API response parsed', {
        authenticated: data.authenticated,
        userId: data.userId,
        source: data.source,
      });
    }

    if (data.authenticated && data.userId) {
      // Validate role is one of the allowed types
      const validRoles = ['viewer', 'editor', 'admin'];
      const role = validRoles.includes(data.role?.toLowerCase() || '')
        ? (data.role?.toLowerCase() as 'viewer' | 'editor' | 'admin')
        : 'editor';

      const user: User = {
        id: data.userId,
        userId: data.userId,
        email: data.email || data.userId,
        role,
      };

      logger.info('✓ Databricks authentication successful', {
        userId: user.userId,
        source: data.source || 'databricks-app',
      });

      return user;
    }

    if (debug) {
      logger.warn('Databricks API returned authenticated=false', {
        error: data.error,
      });
    }

    return null;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        logger.error('Databricks API request timed out', {
          timeout,
          endpoint,
        });
      } else {
        logger.error('Databricks API request failed', {
          error: error.message,
          endpoint,
        });
      }
    } else {
      logger.error('Databricks API request failed with unknown error', {
        endpoint,
      });
    }
    return null;
  }
}

/**
 * Check if we're running in a Databricks App environment
 *
 * This is a heuristic check that looks for signs of Databricks App runtime:
 * - Presence of x-forwarded-access-token header in requests
 * - Environment variables set by Databricks
 *
 * @returns true if likely running in Databricks App, false otherwise
 */
export function isDatabricksAppEnvironment(): boolean {
  // Check for Databricks-specific environment variables (if in Node.js/backend)
  if (typeof process !== 'undefined' && process.env.DATABRICKS_HOST) {
    return true;
  }

  // In browser, we can't easily detect, so we rely on explicit configuration
  return false;
}
