/**
 * Tests for Databricks App Authentication Module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loginFromDatabricksAPI,
  isDatabricksAppEnvironment,
  type DatabricksAuthConfig,
  type DatabricksUserInfo,
} from '@modules/user/databricks-auth';

describe('DatabricksAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loginFromDatabricksAPI', () => {
    it('should successfully fetch user info from Databricks API', async () => {
      const mockResponse: DatabricksUserInfo = {
        authenticated: true,
        userId: 'alice@example.com',
        email: 'alice@example.com',
        displayName: 'Alice Smith',
        role: 'editor',
        source: 'databricks-app',
      };

      vi.global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValueOnce(mockResponse),
      });

      const user = await loginFromDatabricksAPI({
        endpoint: '/api/userinfo',
      });

      expect(user).toBeDefined();
      expect(user?.userId).toBe('alice@example.com');
      expect(user?.email).toBe('alice@example.com');
      expect(user?.role).toBe('editor');
    });

    it('should use default endpoint if not specified', async () => {
      const mockResponse: DatabricksUserInfo = {
        authenticated: true,
        userId: 'bob@example.com',
        email: 'bob@example.com',
      };

      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce(mockResponse),
      });

      vi.global.fetch = fetchMock;

      await loginFromDatabricksAPI();

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/userinfo',
        expect.objectContaining({
          headers: { Accept: 'application/json' },
        })
      );
    });

    it('should use custom endpoint if specified', async () => {
      const mockResponse: DatabricksUserInfo = {
        authenticated: true,
        userId: 'charlie@example.com',
        email: 'charlie@example.com',
      };

      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce(mockResponse),
      });

      vi.global.fetch = fetchMock;

      await loginFromDatabricksAPI({
        endpoint: '/custom/auth/endpoint',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/custom/auth/endpoint',
        expect.any(Object)
      );
    });

    it('should return null when authenticated=false', async () => {
      const mockResponse: DatabricksUserInfo = {
        authenticated: false,
        error: 'User not found',
      };

      vi.global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce(mockResponse),
      });

      const user = await loginFromDatabricksAPI();

      expect(user).toBeNull();
    });

    it('should return null when userId is missing', async () => {
      const mockResponse: DatabricksUserInfo = {
        authenticated: true,
        // userId intentionally missing
        email: 'invalid@example.com',
      };

      vi.global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce(mockResponse),
      });

      const user = await loginFromDatabricksAPI();

      expect(user).toBeNull();
    });

    it('should return null when HTTP response is not ok', async () => {
      vi.global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const user = await loginFromDatabricksAPI();

      expect(user).toBeNull();
    });

    it('should handle timeout correctly', async () => {
      vi.global.fetch = vi.fn().mockImplementationOnce(
        () =>
          new Promise((_resolve, _reject) => {
            // Never resolves, will timeout
          })
      );

      const user = await loginFromDatabricksAPI({
        timeout: 100, // Very short timeout
      });

      expect(user).toBeNull();
    });

    it('should return null when fetch fails', async () => {
      vi.global.fetch = vi.fn().mockRejectedValueOnce(
        new Error('Network error')
      );

      const user = await loginFromDatabricksAPI();

      expect(user).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      vi.global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValueOnce(new Error('Invalid JSON')),
      });

      const user = await loginFromDatabricksAPI();

      expect(user).toBeNull();
    });

    it('should use custom role if provided', async () => {
      const mockResponse: DatabricksUserInfo = {
        authenticated: true,
        userId: 'dave@example.com',
        email: 'dave@example.com',
        role: 'admin',
      };

      vi.global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce(mockResponse),
      });

      const user = await loginFromDatabricksAPI();

      expect(user?.role).toBe('admin');
    });

    it('should default to editor role if not provided', async () => {
      const mockResponse: DatabricksUserInfo = {
        authenticated: true,
        userId: 'eve@example.com',
        email: 'eve@example.com',
        // role intentionally missing
      };

      vi.global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce(mockResponse),
      });

      const user = await loginFromDatabricksAPI();

      expect(user?.role).toBe('editor');
    });

    it('should use userId as email if email not provided', async () => {
      const mockResponse: DatabricksUserInfo = {
        authenticated: true,
        userId: 'frank@example.com',
        // email intentionally missing
      };

      vi.global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce(mockResponse),
      });

      const user = await loginFromDatabricksAPI();

      expect(user?.email).toBe('frank@example.com');
    });

    it('should respect custom timeout configuration', async () => {
      const mockResponse: DatabricksUserInfo = {
        authenticated: true,
        userId: 'grace@example.com',
      };

      vi.global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce(mockResponse),
      });

      const config: DatabricksAuthConfig = {
        endpoint: '/api/userinfo',
        timeout: 10000,
      };

      const user = await loginFromDatabricksAPI(config);

      expect(user).toBeDefined();
      expect(user?.userId).toBe('grace@example.com');
    });

    it('should include Accept header in request', async () => {
      const mockResponse: DatabricksUserInfo = {
        authenticated: true,
        userId: 'henry@example.com',
      };

      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce(mockResponse),
      });

      vi.global.fetch = fetchMock;

      await loginFromDatabricksAPI();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            Accept: 'application/json',
          },
        })
      );
    });

    it('should handle AbortError from timeout', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      vi.global.fetch = vi.fn().mockRejectedValueOnce(abortError);

      const user = await loginFromDatabricksAPI({
        timeout: 100,
      });

      expect(user).toBeNull();
    });
  });

  describe('isDatabricksAppEnvironment', () => {
    it('should return false in browser environment by default', () => {
      const result = isDatabricksAppEnvironment();
      expect(result).toBe(false);
    });

    it('should return true if DATABRICKS_HOST env var exists', () => {
      // Mock process.env.DATABRICKS_HOST (Node.js environment)
      const originalEnv = process.env.DATABRICKS_HOST;
      process.env.DATABRICKS_HOST = 'https://databricks.example.com';

      const result = isDatabricksAppEnvironment();
      expect(result).toBe(true);

      // Restore original
      if (originalEnv === undefined) {
        delete process.env.DATABRICKS_HOST;
      } else {
        process.env.DATABRICKS_HOST = originalEnv;
      }
    });
  });
});
