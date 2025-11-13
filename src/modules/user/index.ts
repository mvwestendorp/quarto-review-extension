/**
 * User Module
 * Authentication and permission management
 */

import { createModuleLogger } from '@utils/debug';
import type { User, UserAuthConfig } from '@/types';
import { getHeaderProvider, type IHeaderProvider } from './HeaderProvider';

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
      userAuthConfig: config.userAuthConfig,
      headerProvider: config.headerProvider,
    };

    this.headerProvider = config.headerProvider || getHeaderProvider();
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
      return false;
    }

    // Get header names with defaults
    const userHeaderName = authConfig.userHeader || 'x-auth-request-user';
    const emailHeaderName = authConfig.emailHeader || 'x-auth-request-email';
    const usernameHeaderName =
      authConfig.usernameHeader || 'x-auth-request-preferred-username';

    logger.debug('Attempting oauth2-proxy authentication', {
      checking: [userHeaderName, usernameHeaderName],
      emailHeader: emailHeaderName,
    });

    // Try to get user identifier
    let userId = this.headerProvider.getHeader(userHeaderName);
    let headerSource = userHeaderName;

    if (!userId) {
      userId = this.headerProvider.getHeader(usernameHeaderName);
      headerSource = usernameHeaderName;
    }

    if (!userId) {
      logger.debug(
        'oauth2-proxy authentication failed: no user identifier found',
        {
          attemptedHeaders: [userHeaderName, usernameHeaderName],
          reason:
            'Neither primary nor fallback header contained a value. ' +
            'Verify: 1) oauth2-proxy is configured in Istio, 2) User is authenticated to oauth2-proxy, ' +
            '3) Headers are forwarded in headersToUpstreamOnAllow, ' +
            '4) Header names match your oauth2-proxy configuration',
        }
      );
      return false;
    }

    // Get email if available
    const email = this.headerProvider.getHeader(emailHeaderName);

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
