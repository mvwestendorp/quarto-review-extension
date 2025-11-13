/**
 * OAuth2-Proxy Auto-Login Initialization
 * Attempts to automatically log in users based on oauth2-proxy headers
 * Call this early in your application bootstrap (e.g., in main.ts or app init)
 */

import type { UserModule } from './index';
import { createModuleLogger } from '@utils/debug';

const logger = createModuleLogger('OAuth2ProxyInit');

/**
 * Attempt to auto-login user from oauth2-proxy headers
 * Safe to call even if oauth2-proxy auth is not configured
 */
export function initializeOAuth2ProxyAuth(userModule: UserModule): boolean {
  try {
    // Only attempt login if user is not already authenticated
    if (userModule.isAuthenticated()) {
      logger.debug('User already authenticated, skipping oauth2-proxy login');
      return false;
    }

    // Attempt to login from headers
    const success = userModule.loginFromOAuth2ProxyHeaders();

    if (success) {
      logger.debug('Successfully logged in user from oauth2-proxy headers');
    } else {
      logger.debug(
        'Could not authenticate from oauth2-proxy headers (not configured or headers missing)'
      );
    }

    return success;
  } catch (error) {
    logger.error('Error during oauth2-proxy auto-login initialization', error);
    return false;
  }
}

/**
 * Wrap initializeOAuth2ProxyAuth with a delay
 * Useful if DOM is not fully ready when script loads
 * Default delay is 100ms
 */
export function initializeOAuth2ProxyAuthAsync(
  userModule: UserModule,
  delayMs: number = 100
): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(initializeOAuth2ProxyAuth(userModule));
    }, delayMs);
  });
}
