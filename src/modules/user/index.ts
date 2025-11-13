/**
 * User Module
 * Authentication and permission management
 */

import { createModuleLogger } from '@utils/debug';
import type { User, UserAuthConfig } from '@/types';
import {
  getHeaderProvider,
  BrowserHeaderProvider,
  type IHeaderProvider,
} from './HeaderProvider';

const logger = createModuleLogger('UserModule');

export interface AuthConfig {
  storageKey?: string;
  sessionTimeout?: number; // in milliseconds
  userAuthConfig?: UserAuthConfig;
  headerProvider?: IHeaderProvider;
}

export class UserModule {
  private currentUser: User | null = null;
  private config: Required<AuthConfig>;
  private sessionTimer: ReturnType<typeof setTimeout> | null = null;
  private headerProvider: IHeaderProvider;

  constructor(config: AuthConfig = {}) {
    this.config = {
      storageKey: config.storageKey || 'quarto-review-user',
      sessionTimeout: config.sessionTimeout || 3600000, // 1 hour default
      userAuthConfig: config.userAuthConfig || undefined,
      headerProvider: config.headerProvider || undefined,
    } as Required<AuthConfig>;

    this.headerProvider = config.headerProvider || getHeaderProvider();

    // Log received configuration for debugging
    if (config.userAuthConfig?.debug) {
      console.debug('[UserModule] Constructor received userAuthConfig:', {
        mode: config.userAuthConfig?.mode,
        debug: config.userAuthConfig?.debug,
        userHeader: config.userAuthConfig?.userHeader,
        emailHeader: config.userAuthConfig?.emailHeader,
        usernameHeader: config.userAuthConfig?.usernameHeader,
        defaultRole: config.userAuthConfig?.defaultRole,
      });
    }

    // Enable debug mode on header provider if configured
    if (
      this.config.userAuthConfig?.debug &&
      this.headerProvider instanceof BrowserHeaderProvider
    ) {
      (this.headerProvider as BrowserHeaderProvider).setDebugMode(true);
      console.debug('[UserModule] Debug mode enabled on HeaderProvider');
    }

    this.loadFromStorage();
  }

  /**
   * Get the current oauth2-proxy configuration
   * Used for debugging and conditional behavior
   */
  public getOAuth2ProxyConfig(): UserAuthConfig | undefined {
    return this.config.userAuthConfig;
  }

  /**
   * Authenticate a user from oauth2-proxy headers
   * Reads user identity from x-auth-request-user, x-auth-request-email headers
   * Returns true if user was successfully authenticated, false otherwise
   *
   * Logs detailed debug info about which headers were checked and why auth failed
   */
  public loginFromOAuth2ProxyHeaders(): boolean {
    const authConfig = this.config.userAuthConfig;

    if (!authConfig || authConfig.mode !== 'oauth2-proxy') {
      logger.debug('OAuth2-proxy auth mode not configured');
      if (authConfig?.debug) {
        console.debug('[UserModule] OAuth2-proxy auth mode not configured', {
          configuredMode: authConfig?.mode,
          expectedMode: 'oauth2-proxy',
        });
      }
      return false;
    }

    // Get header names with defaults
    const userHeaderName = authConfig.userHeader || 'x-auth-request-user';
    const emailHeaderName = authConfig.emailHeader || 'x-auth-request-email';
    const usernameHeaderName =
      authConfig.usernameHeader || 'x-auth-request-preferred-username';

    const debugMode = authConfig.debug === true;
    if (debugMode) {
      console.debug('[UserModule] === OAUTH2-PROXY AUTHENTICATION START ===', {
        mode: authConfig.mode,
        debugMode: true,
      });
      console.debug('[UserModule] Configured header names:', {
        userHeader: userHeaderName,
        emailHeader: emailHeaderName,
        usernameHeader: usernameHeaderName,
      });
    }

    logger.debug('Attempting oauth2-proxy authentication', {
      checking: [userHeaderName, usernameHeaderName],
      emailHeader: emailHeaderName,
    });

    // Try to get user identifier
    if (debugMode) {
      console.debug(
        '[UserModule] Attempting to read user header:',
        userHeaderName
      );
    }
    let userId = this.headerProvider.getHeader(userHeaderName);
    let headerSource = userHeaderName;

    if (!userId) {
      if (debugMode) {
        console.debug(
          `[UserModule] "${userHeaderName}" not found, trying fallback:`,
          usernameHeaderName
        );
      }
      userId = this.headerProvider.getHeader(usernameHeaderName);
      headerSource = usernameHeaderName;
    } else if (debugMode) {
      console.debug(`[UserModule] ✓ User ID found from "${userHeaderName}"`, {
        userId,
      });
    }

    if (!userId) {
      const errorMsg =
        'Neither primary nor fallback header contained a value. ' +
        'Verify: 1) oauth2-proxy is configured in Istio, 2) User is authenticated to oauth2-proxy, ' +
        '3) Headers are forwarded in headersToUpstreamOnAllow, ' +
        '4) Header names match your oauth2-proxy configuration';

      logger.debug(
        'oauth2-proxy authentication failed: no user identifier found',
        {
          attemptedHeaders: [userHeaderName, usernameHeaderName],
          reason: errorMsg,
        }
      );

      if (debugMode) {
        console.error(
          '[UserModule] ✗ AUTHENTICATION FAILED: No user identifier found',
          {
            attemptedHeaders: [userHeaderName, usernameHeaderName],
            troubleshooting: errorMsg,
          }
        );
      }
      return false;
    }

    // Get email if available
    if (debugMode) {
      console.debug(
        '[UserModule] Attempting to read email header:',
        emailHeaderName
      );
    }
    const email = this.headerProvider.getHeader(emailHeaderName);
    if (debugMode && email) {
      console.debug('[UserModule] ✓ Email found:', { email });
    } else if (debugMode) {
      console.debug('[UserModule] Email header not found (optional)');
    }

    // Get default role from config, fall back to 'editor'
    const role = authConfig.defaultRole || 'editor';

    // Create and login user
    const user: User = {
      id: userId,
      name: userId, // Use userId as name if not available separately
      email,
      role,
    };

    logger.debug('Successfully authenticated user from oauth2-proxy headers', {
      userId: user.id,
      email: user.email,
      role: user.role,
      headerSource,
      authMode: authConfig.mode,
    });

    if (debugMode) {
      console.debug('[UserModule] ✓ AUTHENTICATION SUCCESSFUL', {
        userId: user.id,
        email: user.email,
        role: user.role,
        headerSource,
      });
      console.debug('[UserModule] === OAUTH2-PROXY AUTHENTICATION END ===');
    }

    this.login(user);
    return true;
  }

  /**
   * Authenticate a user
   */
  public login(user: User): void {
    this.currentUser = user;
    this.saveToStorage();
    this.startSessionTimer();
  }

  /**
   * Log out the current user
   */
  public logout(): void {
    this.currentUser = null;
    this.clearStorage();
    this.clearSessionTimer();
  }

  /**
   * Get current user
   */
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Check if user has a specific role
   */
  public hasRole(role: User['role']): boolean {
    return this.currentUser?.role === role;
  }

  /**
   * Check if user can edit
   */
  public canEdit(): boolean {
    if (!this.currentUser) return false;
    return (
      this.currentUser.role === 'editor' || this.currentUser.role === 'admin'
    );
  }

  /**
   * Check if user can view
   */
  public canView(): boolean {
    return this.isAuthenticated();
  }

  /**
   * Check if user is admin
   */
  public isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  /**
   * Check if user can comment
   */
  public canComment(): boolean {
    return this.isAuthenticated();
  }

  /**
   * Check if user can delete comments
   */
  public canDeleteComment(commentUserId: string): boolean {
    if (!this.currentUser) return false;

    // Admins can delete any comment
    if (this.currentUser.role === 'admin') return true;

    // Users can delete their own comments
    return this.currentUser.id === commentUserId;
  }

  /**
   * Check if user can resolve comments
   */
  public canResolveComment(): boolean {
    return this.canEdit();
  }

  /**
   * Check if user can push to git
   */
  public canPush(): boolean {
    return this.canEdit();
  }

  /**
   * Check if user can merge pull requests
   */
  public canMerge(): boolean {
    return this.isAdmin();
  }

  /**
   * Update user information
   */
  public updateUser(updates: Partial<User>): void {
    if (!this.currentUser) return;

    this.currentUser = {
      ...this.currentUser,
      ...updates,
    };

    this.saveToStorage();
  }

  /**
   * Save user to storage
   */
  private saveToStorage(): void {
    if (!this.currentUser) return;

    try {
      localStorage.setItem(
        this.config.storageKey,
        JSON.stringify(this.currentUser)
      );
    } catch (error) {
      logger.error('Failed to save user to storage:', error);
    }
  }

  /**
   * Load user from storage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        this.currentUser = JSON.parse(stored) as User;
        this.startSessionTimer();
      }
    } catch (error) {
      logger.error('Failed to load user from storage:', error);
    }
  }

  /**
   * Clear storage
   */
  private clearStorage(): void {
    try {
      localStorage.removeItem(this.config.storageKey);
    } catch (error) {
      logger.error('Failed to clear storage:', error);
    }
  }

  /**
   * Start session timeout timer
   */
  private startSessionTimer(): void {
    this.clearSessionTimer();

    this.sessionTimer = setTimeout(() => {
      this.logout();
    }, this.config.sessionTimeout);
  }

  /**
   * Clear session timer
   */
  private clearSessionTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  /**
   * Refresh session (reset timer)
   */
  public refreshSession(): void {
    if (this.isAuthenticated()) {
      this.startSessionTimer();
    }
  }

  /**
   * Create a guest user
   */
  public static createGuest(name?: string): User {
    return {
      id: `guest-${Date.now()}`,
      name: name || 'Guest',
      role: 'viewer',
    };
  }

  /**
   * Create an editor user
   */
  public static createEditor(id: string, name: string, email?: string): User {
    return {
      id,
      name,
      email,
      role: 'editor',
    };
  }

  /**
   * Create an admin user
   */
  public static createAdmin(id: string, name: string, email?: string): User {
    return {
      id,
      name,
      email,
      role: 'admin',
    };
  }

  /**
   * Get permission summary for current user
   */
  public getPermissions(): {
    canView: boolean;
    canEdit: boolean;
    canComment: boolean;
    canPush: boolean;
    canMerge: boolean;
    isAdmin: boolean;
  } {
    return {
      canView: this.canView(),
      canEdit: this.canEdit(),
      canComment: this.canComment(),
      canPush: this.canPush(),
      canMerge: this.canMerge(),
      isAdmin: this.isAdmin(),
    };
  }
}

export default UserModule;
