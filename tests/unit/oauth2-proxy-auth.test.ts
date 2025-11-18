import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserModule } from '@/modules/user';
import {
  MockHeaderProvider,
  setHeaderProvider,
  resetHeaderProvider,
  type IHeaderProvider,
} from '@/modules/user/HeaderProvider';
import {
  initializeOAuth2ProxyAuth,
  initializeOAuth2ProxyAuthAsync,
} from '@/modules/user/oauth2-proxy-init';
import type { UserAuthConfig } from '@/types';
import { SafeStorage } from '@utils/security';

describe('OAuth2Proxy Authentication', () => {
  let mockHeaderProvider: MockHeaderProvider;

  beforeEach(() => {
    mockHeaderProvider = new MockHeaderProvider();
    setHeaderProvider(mockHeaderProvider);
    // Clear any persisted user data from localStorage
    localStorage.removeItem('quarto-review-user');
  });

  afterEach(() => {
    resetHeaderProvider();
    localStorage.removeItem('quarto-review-user');
  });

  describe('UserModule.loginFromOAuth2ProxyHeaders', () => {
    it('should extract user from oauth2-proxy headers with default header names', () => {
      mockHeaderProvider.setHeader('x-auth-request-user', 'john.doe');
      mockHeaderProvider.setHeader('x-auth-request-email', 'john@example.com');

      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
        defaultRole: 'editor',
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });
      const success = userModule.loginFromOAuth2ProxyHeaders();

      expect(success).toBe(true);

      const user = userModule.getCurrentUser();
      expect(user).toBeDefined();
      expect(user?.id).toBe('john.doe');
      expect(user?.name).toBe('john.doe');
      expect(user?.email).toBe('john@example.com');
      expect(user?.role).toBe('editor');
    });

    it('should use custom header names when configured', () => {
      mockHeaderProvider.setHeader('custom-user-header', 'alice');
      mockHeaderProvider.setHeader('custom-email-header', 'alice@example.com');

      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
        userHeader: 'custom-user-header',
        emailHeader: 'custom-email-header',
        defaultRole: 'admin',
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });
      const success = userModule.loginFromOAuth2ProxyHeaders();

      expect(success).toBe(true);

      const user = userModule.getCurrentUser();
      expect(user?.id).toBe('alice');
      expect(user?.email).toBe('alice@example.com');
      expect(user?.role).toBe('admin');
    });

    it('should fall back to usernameHeader if userHeader is not available', () => {
      mockHeaderProvider.setHeader('x-auth-request-preferred-username', 'bob');
      mockHeaderProvider.setHeader('x-auth-request-email', 'bob@example.com');

      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
        defaultRole: 'viewer',
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });
      const success = userModule.loginFromOAuth2ProxyHeaders();

      expect(success).toBe(true);

      const user = userModule.getCurrentUser();
      expect(user?.id).toBe('bob');
      expect(user?.role).toBe('viewer');
    });

    it('should return false and not login if user identifier is missing', () => {
      mockHeaderProvider.setHeader('x-auth-request-email', 'nouser@example.com');

      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });
      const success = userModule.loginFromOAuth2ProxyHeaders();

      expect(success).toBe(false);
      expect(userModule.isAuthenticated()).toBe(false);
    });

    it('should return false if oauth2-proxy mode is not configured', () => {
      mockHeaderProvider.setHeader('x-auth-request-user', 'john');

      const authConfig: UserAuthConfig = {
        mode: 'manual', // Not oauth2-proxy
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });
      const success = userModule.loginFromOAuth2ProxyHeaders();

      expect(success).toBe(false);
      expect(userModule.isAuthenticated()).toBe(false);
    });

    it('should return false if no userAuthConfig is provided', () => {
      mockHeaderProvider.setHeader('x-auth-request-user', 'john');

      const userModule = new UserModule({});
      const success = userModule.loginFromOAuth2ProxyHeaders();

      expect(success).toBe(false);
      expect(userModule.isAuthenticated()).toBe(false);
    });

    it('should handle header names with underscores and hyphens interchangeably', () => {
      mockHeaderProvider.setHeader('x-auth-request-user', 'userWithUnderscores');
      mockHeaderProvider.setHeader('x-auth-request-email', 'user@example.com');

      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
        // Request headers with dashes
        userHeader: 'x-auth-request-user',
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });
      const success = userModule.loginFromOAuth2ProxyHeaders();

      expect(success).toBe(true);
      expect(userModule.getCurrentUser()?.id).toBe('userWithUnderscores');
    });

    it('should assign default role (editor) if defaultRole is not specified', () => {
      mockHeaderProvider.setHeader('x-auth-request-user', 'john');

      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
        // No defaultRole specified
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });
      const success = userModule.loginFromOAuth2ProxyHeaders();

      expect(success).toBe(true);
      expect(userModule.getCurrentUser()?.role).toBe('editor');
    });

    it('should persist user to localStorage after login', () => {
      mockHeaderProvider.setHeader('x-auth-request-user', 'john');
      mockHeaderProvider.setHeader('x-auth-request-email', 'john@example.com');

      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });
      userModule.loginFromOAuth2ProxyHeaders();

      // Use SafeStorage to read the persisted user
      const storedUser = SafeStorage.getItem('quarto-review-user');
      expect(storedUser).toBeDefined();
      expect(storedUser?.id).toBe('john');
      expect(storedUser?.email).toBe('john@example.com');
    });
  });

  describe('initializeOAuth2ProxyAuth', () => {
    it('should return true if user is successfully authenticated', () => {
      mockHeaderProvider.setHeader('x-auth-request-user', 'alice');

      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });
      const success = initializeOAuth2ProxyAuth(userModule);

      expect(success).toBe(true);
      expect(userModule.isAuthenticated()).toBe(true);
    });

    it('should return false if headers are not available', () => {
      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });
      const success = initializeOAuth2ProxyAuth(userModule);

      expect(success).toBe(false);
      expect(userModule.isAuthenticated()).toBe(false);
    });

    it('should not overwrite existing authenticated user', () => {
      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });

      // Manually login first
      const manualUser = {
        id: 'existing-user',
        name: 'Existing User',
        role: 'admin' as const,
      };
      userModule.login(manualUser);

      // Try oauth2-proxy login
      mockHeaderProvider.setHeader('x-auth-request-user', 'new-user');
      const success = initializeOAuth2ProxyAuth(userModule);

      // Should return false and not overwrite
      expect(success).toBe(false);
      expect(userModule.getCurrentUser()?.id).toBe('existing-user');
    });
  });

  describe('initializeOAuth2ProxyAuthAsync', () => {
    it('should return true after async initialization', async () => {
      mockHeaderProvider.setHeader('x-auth-request-user', 'bob');

      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });
      const success = await initializeOAuth2ProxyAuthAsync(userModule, 10);

      expect(success).toBe(true);
      expect(userModule.isAuthenticated()).toBe(true);
    });

    it('should wait for specified delay before attempting login', async () => {
      mockHeaderProvider.setHeader('x-auth-request-user', 'carol');

      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });

      const start = Date.now();
      await initializeOAuth2ProxyAuthAsync(userModule, 50);
      const elapsed = Date.now() - start;

      // Should have waited approximately 50ms
      expect(elapsed).toBeGreaterThanOrEqual(40);
      expect(userModule.isAuthenticated()).toBe(true);
    });
  });

  describe('Header case-insensitivity', () => {
    it('should work with header names in different cases', () => {
      // oauth2-proxy uses lowercase with hyphens
      mockHeaderProvider.setHeader('x-auth-request-user', 'user123');
      mockHeaderProvider.setHeader('x-auth-request-email', 'user@test.com');

      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });
      const success = userModule.loginFromOAuth2ProxyHeaders();

      expect(success).toBe(true);
      expect(userModule.getCurrentUser()?.id).toBe('user123');
    });
  });

  describe('Console warnings and fallback behavior', () => {
    it('should log console warning when oauth2-proxy is configured but headers missing', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });
      initializeOAuth2ProxyAuth(userModule);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Quarto Review] Warning: oauth2-proxy authentication is enabled')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('headers are missing')
      );

      consoleSpy.mockRestore();
    });

    it('should not warn when oauth2-proxy is not configured', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // No auth config
      const userModule = new UserModule({});
      initializeOAuth2ProxyAuth(userModule);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[Quarto Review] Warning')
      );

      consoleSpy.mockRestore();
    });

    it('should provide detailed debug info when headers are missing', () => {
      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
        userHeader: 'x-auth-request-user',
        usernameHeader: 'x-auth-request-preferred-username',
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });
      const success = userModule.loginFromOAuth2ProxyHeaders();

      expect(success).toBe(false);
    });

    it('should gracefully handle errors during authentication', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock header provider that throws an error
      const errorProvider: IHeaderProvider = {
        getHeader: () => {
          throw new Error('Header read failed');
        },
      };

      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
      };

      const userModule = new UserModule({
        userAuthConfig: authConfig,
        headerProvider: errorProvider,
      });

      const success = initializeOAuth2ProxyAuth(userModule);

      expect(success).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Quarto Review] Error during oauth2-proxy authentication')
      );

      consoleErrorSpy.mockRestore();
    });

    it('should return detailed error reasons in debug logs', () => {
      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
      };

      // Clear any headers
      mockHeaderProvider.clear();

      const userModule = new UserModule({ userAuthConfig: authConfig });
      userModule.loginFromOAuth2ProxyHeaders();

      // The debug logs should contain detailed troubleshooting info
      // In production, check the browser console logs
    });
  });

  describe('Permission checks after oauth2-proxy login', () => {
    it('should correctly report permissions based on assigned role', () => {
      mockHeaderProvider.setHeader('x-auth-request-user', 'john');

      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
        defaultRole: 'editor',
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });
      userModule.loginFromOAuth2ProxyHeaders();

      expect(userModule.canView()).toBe(true);
      expect(userModule.canEdit()).toBe(true);
      expect(userModule.canComment()).toBe(true);
      expect(userModule.isAdmin()).toBe(false);
    });

    it('should allow admin permissions when defaultRole is admin', () => {
      mockHeaderProvider.setHeader('x-auth-request-user', 'admin-user');

      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
        defaultRole: 'admin',
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });
      userModule.loginFromOAuth2ProxyHeaders();

      expect(userModule.isAdmin()).toBe(true);
      expect(userModule.canMerge()).toBe(true);
    });

    it('should limit permissions for viewer role', () => {
      mockHeaderProvider.setHeader('x-auth-request-user', 'viewer-user');

      const authConfig: UserAuthConfig = {
        mode: 'oauth2-proxy',
        defaultRole: 'viewer',
      };

      const userModule = new UserModule({ userAuthConfig: authConfig });
      userModule.loginFromOAuth2ProxyHeaders();

      expect(userModule.canView()).toBe(true);
      expect(userModule.canEdit()).toBe(false);
      expect(userModule.isAdmin()).toBe(false);
    });
  });
});
