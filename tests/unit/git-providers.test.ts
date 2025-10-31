import { describe, expect, it, beforeEach, vi } from 'vitest';
import { GitHubProvider } from '@/modules/git/providers/github';
import type { ProviderConfig } from '@/modules/git/providers';
import type { GitUser, RepositoryFile, FileUpsertResult, CreateBranchResult } from '@/modules/git/types';

describe('GitHubProvider', () => {
  let provider: GitHubProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    const config: ProviderConfig = {
      url: 'https://api.github.com',
      owner: 'test-owner',
      repo: 'test-repo',
      auth: {
        mode: 'pat',
        token: 'test-token-123',
        headerName: 'Authorization',
      },
    };

    provider = new GitHubProvider(config);
  });

  describe('authentication', () => {
    it('uses Bearer token when in PAT mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ login: 'test-user' }),
      });

      await provider.getCurrentUser();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/user'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Bearer test-token-123'),
          }),
        })
      );
    });

    it('uses cookie credentials when in cookie mode', async () => {
      const configWithCookie: ProviderConfig = {
        url: 'https://api.github.com',
        owner: 'test-owner',
        repo: 'test-repo',
        auth: {
          mode: 'cookie',
          cookieName: 'auth_cookie',
        },
      };

      const cookieProvider = new GitHubProvider(configWithCookie);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ login: 'test-user' }),
      });

      await cookieProvider.getCurrentUser();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });

    it('throws error when URL is not configured', async () => {
      const configNoUrl: ProviderConfig = {
        owner: 'test-owner',
        repo: 'test-repo',
      };

      const badProvider = new GitHubProvider(configNoUrl);

      await expect(badProvider.getCurrentUser()).rejects.toThrow(
        'Provider URL is not configured'
      );
    });
  });

  describe('getCurrentUser', () => {
    it('fetches and maps current user correctly', async () => {
      const mockUserResponse = {
        login: 'john-doe',
        name: 'John Doe',
        avatar_url: 'https://avatars.githubusercontent.com/u/123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockUserResponse),
      });

      const user = await provider.getCurrentUser();

      expect(user).toEqual({
        login: 'john-doe',
        name: 'John Doe',
        avatarUrl: 'https://avatars.githubusercontent.com/u/123',
      });
    });

    it('handles missing name and avatar', async () => {
      const mockUserResponse = {
        login: 'minimal-user',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockUserResponse),
      });

      const user = await provider.getCurrentUser();

      expect(user).toEqual({
        login: 'minimal-user',
        name: undefined,
        avatarUrl: undefined,
      });
    });

    it('handles API errors with proper error messages', async () => {
      const errorResponse = {
        message: 'Bad credentials',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => errorResponse,
      });

      await expect(provider.getCurrentUser()).rejects.toThrow('Bad credentials');
    });
  });

  describe('createBranch', () => {
    it('creates branch from base branch successfully', async () => {
      const refResponse = {
        ref: 'refs/heads/main',
        object: { sha: 'base-sha-123' },
      };

      const createResponse = {
        ref: 'refs/heads/feature-branch',
        object: { sha: 'new-sha-456' },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(refResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: async () => JSON.stringify(createResponse),
        });

      const result = await provider.createBranch('feature-branch', 'main');

      expect(result).toEqual({
        name: 'refs/heads/feature-branch',
        sha: 'new-sha-456',
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/git/refs'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('feature-branch'),
        })
      );
    });

    it('handles branch creation failures', async () => {
      const refResponse = {
        ref: 'refs/heads/main',
        object: { sha: 'base-sha-123' },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(refResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity',
          json: async () => ({ message: 'Reference already exists' }),
        });

      await expect(provider.createBranch('existing-branch', 'main')).rejects.toThrow();
    });
  });

  describe('getFileContent', () => {
    it('fetches file content and decodes base64', async () => {
      const base64Content = Buffer.from('Hello, World!', 'utf-8').toString('base64');
      const fileResponse = {
        path: 'README.md',
        sha: 'file-sha-123',
        content: base64Content,
        encoding: 'base64',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(fileResponse),
      });

      const file = await provider.getFileContent('README.md', 'main');

      expect(file).toEqual({
        path: 'README.md',
        sha: 'file-sha-123',
        content: 'Hello, World!',
      });
    });

    it('handles unicode content correctly', async () => {
      const unicodeContent = '你好世界 🌍';
      const base64Content = Buffer.from(unicodeContent, 'utf-8').toString('base64');
      const fileResponse = {
        path: 'document.md',
        sha: 'unicode-sha',
        content: base64Content,
        encoding: 'base64',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(fileResponse),
      });

      const file = await provider.getFileContent('document.md', 'main');

      expect(file?.content).toBe(unicodeContent);
    });

    it('returns null when file not found (404)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Not Found' }),
      });

      const file = await provider.getFileContent('nonexistent.md', 'main');

      expect(file).toBeNull();
    });

    it('throws error on non-404 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Server error' }),
      });

      await expect(
        provider.getFileContent('README.md', 'main')
      ).rejects.toThrow('Server error');
    });

    it('properly encodes file paths with special characters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          path: 'special path.md',
          sha: 'special-sha',
          content: Buffer.from('content', 'utf-8').toString('base64'),
        }),
      });

      await provider.getFileContent('special path.md', 'main');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          encodeURIComponent('special path.md')
        ),
        expect.any(Object)
      );
    });
  });

  describe('createOrUpdateFile', () => {
    it('creates new file successfully', async () => {
      const fileResponse = {
        content: {
          path: 'new-file.md',
          sha: 'new-file-sha',
          html_url: 'https://github.com/test-owner/test-repo/blob/main/new-file.md',
        },
        commit: { sha: 'commit-sha-123' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: async () => JSON.stringify(fileResponse),
      });

      const result = await provider.createOrUpdateFile(
        'new-file.md',
        'File content',
        'Create new file',
        'main'
      );

      expect(result).toEqual({
        path: 'new-file.md',
        sha: 'new-file-sha',
        commitSha: 'commit-sha-123',
        url: 'https://github.com/test-owner/test-repo/blob/main/new-file.md',
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);
      expect(body.message).toBe('Create new file');
      expect(body.branch).toBe('main');
      expect(body.content).toBeDefined();
    });

    it('updates existing file when SHA is provided', async () => {
      const fileResponse = {
        content: {
          path: 'existing.md',
          sha: 'updated-sha',
          html_url: 'https://github.com/test-owner/test-repo/blob/main/existing.md',
        },
        commit: { sha: 'update-commit-sha' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(fileResponse),
      });

      const result = await provider.createOrUpdateFile(
        'existing.md',
        'Updated content',
        'Update file',
        'main',
        'old-sha-123'
      );

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);
      expect(body.sha).toBe('old-sha-123');
      expect(result.sha).toBe('updated-sha');
    });
  });

  describe('pull request operations', () => {
    it('creates pull request successfully', async () => {
      const prResponse = {
        number: 42,
        title: 'Add new feature',
        body: 'This PR adds a new feature',
        state: 'open',
        merged_at: null,
        user: { login: 'author-user' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/pull/42',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: async () => JSON.stringify(prResponse),
      });

      const pr = await provider.createPullRequest(
        'Add new feature',
        'This PR adds a new feature',
        'feature-branch',
        'main'
      );

      expect(pr).toEqual({
        number: 42,
        title: 'Add new feature',
        body: 'This PR adds a new feature',
        state: 'open',
        author: 'author-user',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        url: 'https://github.com/test-owner/test-repo/pull/42',
      });
    });

    it('lists pull requests with filter', async () => {
      const prsResponse = [
        {
          number: 1,
          title: 'First PR',
          body: 'First',
          state: 'open',
          merged_at: null,
          user: { login: 'user1' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          html_url: 'https://github.com/test-owner/test-repo/pull/1',
        },
        {
          number: 2,
          title: 'Second PR',
          body: 'Second',
          state: 'open',
          merged_at: null,
          user: { login: 'user2' },
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          html_url: 'https://github.com/test-owner/test-repo/pull/2',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(prsResponse),
      });

      const prs = await provider.listPullRequests('open');

      expect(prs).toHaveLength(2);
      expect(prs[0].number).toBe(1);
      expect(prs[1].number).toBe(2);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('state=open'),
        expect.any(Object)
      );
    });

    it('merges pull request with specified method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '',
      });

      await provider.mergePullRequest(42, 'squash');

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);
      expect(body.merge_method).toBe('squash');
    });

    it('gets specific pull request by number', async () => {
      const prResponse = {
        number: 42,
        title: 'Feature PR',
        body: 'Adds feature',
        state: 'open',
        merged_at: null,
        user: { login: 'dev' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/pull/42',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(prResponse),
      });

      const pr = await provider.getPullRequest(42);

      expect(pr.number).toBe(42);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/pulls/42'),
        expect.any(Object)
      );
    });

    it('updates pull request title and body', async () => {
      const updatedPr = {
        number: 42,
        title: 'Updated Title',
        body: 'Updated body',
        state: 'open',
        merged_at: null,
        user: { login: 'dev' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/pull/42',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(updatedPr),
      });

      const pr = await provider.updatePullRequest(42, {
        title: 'Updated Title',
        body: 'Updated body',
      });

      expect(pr.title).toBe('Updated Title');
      expect(pr.body).toBe('Updated body');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1]?.method).toBe('PATCH');
    });
  });

  describe('review comments', () => {
    it('creates review comments successfully', async () => {
      const reviewResponse = {
        id: 1,
        state: 'COMMENTED',
        body: '',
        html_url: 'https://github.com/test-owner/test-repo/pull/42',
        comments: [
          {
            id: 100,
            path: 'README.md',
            line: 5,
            html_url: 'https://github.com/test-owner/test-repo/pull/42#discussion_r100',
          },
          {
            id: 101,
            path: 'src/index.ts',
            line: 10,
            html_url: 'https://github.com/test-owner/test-repo/pull/42#discussion_r101',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(reviewResponse),
      });

      const results = await provider.createReviewComments(
        42,
        [
          { path: 'README.md', body: 'Good', line: 5 },
          { path: 'src/index.ts', body: 'Better', line: 10 },
        ],
        'commit-sha-123'
      );

      expect(results).toHaveLength(2);
      expect(results[0].path).toBe('README.md');
      expect(results[0].line).toBe(5);
      expect(results[1].path).toBe('src/index.ts');
    });

    it('returns empty array when no comments', async () => {
      const results = await provider.createReviewComments(42, [], 'commit-sha-123');

      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('issue operations', () => {
    it('creates issue successfully', async () => {
      const issueResponse = {
        number: 10,
        title: 'Bug: Something broken',
        body: 'Description of the bug',
        state: 'open',
        user: { login: 'reporter' },
        created_at: '2024-01-01T00:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/issues/10',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: async () => JSON.stringify(issueResponse),
      });

      const issue = await provider.createIssue(
        'Bug: Something broken',
        'Description of the bug'
      );

      expect(issue.number).toBe(10);
      expect(issue.title).toBe('Bug: Something broken');
      expect(issue.state).toBe('open');
    });

    it('lists issues with state filter', async () => {
      const issuesResponse = [
        {
          number: 1,
          title: 'Bug 1',
          body: 'First bug',
          state: 'open',
          user: { login: 'user1' },
          created_at: '2024-01-01T00:00:00Z',
          html_url: 'https://github.com/test-owner/test-repo/issues/1',
        },
        {
          number: 2,
          title: 'Bug 2',
          body: 'Second bug',
          state: 'open',
          user: { login: 'user2' },
          created_at: '2024-01-02T00:00:00Z',
          html_url: 'https://github.com/test-owner/test-repo/issues/2',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(issuesResponse),
      });

      const issues = await provider.listIssues('open');

      expect(issues).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('state=open'),
        expect.any(Object)
      );
    });

    it('gets specific issue by number', async () => {
      const issueResponse = {
        number: 5,
        title: 'Feature request',
        body: 'Please add this feature',
        state: 'open',
        user: { login: 'requester' },
        created_at: '2024-01-01T00:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/issues/5',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(issueResponse),
      });

      const issue = await provider.getIssue(5);

      expect(issue.number).toBe(5);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/issues/5'),
        expect.any(Object)
      );
    });
  });

  describe('repository metadata', () => {
    it('retrieves repository information', async () => {
      const repoResponse = {
        name: 'test-repo',
        description: 'A test repository',
        html_url: 'https://github.com/test-owner/test-repo',
        default_branch: 'main',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(repoResponse),
      });

      const repo = await provider.getRepository();

      expect(repo).toEqual({
        name: 'test-repo',
        description: 'A test repository',
        url: 'https://github.com/test-owner/test-repo',
        defaultBranch: 'main',
      });
    });

    it('checks write access correctly', async () => {
      const repoResponse = {
        permissions: { push: true },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(repoResponse),
      });

      const hasAccess = await provider.hasWriteAccess();

      expect(hasAccess).toBe(true);
    });

    it('returns false when no write access', async () => {
      const repoResponse = {
        permissions: { push: false },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(repoResponse),
      });

      const hasAccess = await provider.hasWriteAccess();

      expect(hasAccess).toBe(false);
    });
  });

  describe('error handling', () => {
    it('handles JSON parse errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(provider.getCurrentUser()).rejects.toThrow();
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(provider.getCurrentUser()).rejects.toThrow('Network error');
    });

    it('properly sets status property on error objects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ message: 'Access denied' }),
      });

      try {
        await provider.getCurrentUser();
      } catch (error) {
        if (error instanceof Error) {
          expect((error as Error & { status?: number }).status).toBe(403);
        }
      }
    });
  });
});
