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
 *
 * Logs warnings to console if oauth2-proxy is configured but headers are missing,
 * which usually indicates a misconfiguration in your Istio/oauth2-proxy setup.
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
      // Check if oauth2-proxy is configured but failed to authenticate
      if (userModule.getOAuth2ProxyConfig()?.mode === 'oauth2-proxy') {
        // oauth2-proxy is configured but we couldn't authenticate
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
        // oauth2-proxy is not configured - this is normal
        logger.debug(
          'oauth2-proxy auth mode not enabled (not an error - falling back to other auth methods)'
        );
      }
    }

    return success;
  } catch (error) {
    const errorMsg = `[Quarto Review] Error during oauth2-proxy authentication: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
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
