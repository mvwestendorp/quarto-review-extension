import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GiteaProvider } from '@/modules/git/providers/gitea';
import type { ProviderConfig } from '@/modules/git/providers';

describe('GiteaProvider', () => {
  let provider: GiteaProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const config: ProviderConfig & { token: string; owner: string; repo: string } =
      {
        url: 'https://gitea.example/api/v1',
        token: 'gitea-token',
        owner: 'example',
        repo: 'demo',
      };

    provider = new GiteaProvider(config);
  });

  describe('authentication', () => {
    it('sends token-based authentication header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            login: 'octocat',
            full_name: 'Octo Cat',
            avatar_url: 'https://gitea.example/avatar.png',
          }),
      });

      const user = await provider.getCurrentUser();

      expect(user).toEqual({
        login: 'octocat',
        name: 'Octo Cat',
        avatarUrl: 'https://gitea.example/avatar.png',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gitea.example/api/v1/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token gitea-token',
          }),
        })
      );
    });
  });

  describe('branch operations', () => {
    it('creates a branch using git refs API', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              ref: 'refs/heads/main',
              object: { sha: 'base-sha' },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: async () =>
            JSON.stringify({
              ref: 'refs/heads/feature/new-ui',
              object: { sha: 'branch-sha' },
            }),
        });

      const result = await provider.createBranch('feature/new-ui', 'main');

      expect(result).toEqual({
        name: 'refs/heads/feature/new-ui',
        sha: 'branch-sha',
      });

      const [firstUrl, firstOptions] = mockFetch.mock.calls[0] as [
        string,
        RequestInit
      ];
      expect(firstUrl).toBe(
        'https://gitea.example/api/v1/repos/example/demo/git/refs/heads/main'
      );
      expect(firstOptions?.method).toBeUndefined();

      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://gitea.example/api/v1/repos/example/demo/git/refs',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            ref: 'refs/heads/feature/new-ui',
            sha: 'base-sha',
          }),
        })
      );
    });
  });

  describe('file operations', () => {
    it('decodes content when retrieving files', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            path: 'README.md',
            sha: 'sha-123',
            content: 'aGVsbG8gZ2l0ZWE=',
          }),
      });

      const file = await provider.getFileContent('README.md', 'main');

      expect(file).toEqual({
        path: 'README.md',
        sha: 'sha-123',
        content: 'hello gitea',
      });
    });

    it('returns null for missing files', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Not Found' }),
      });

      const file = await provider.getFileContent('missing.md', 'main');
      expect(file).toBeNull();
    });

    it('creates or updates files with encoded payloads', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            content: {
              path: 'docs/demo.qmd',
              sha: 'sha-file',
              html_url: 'https://gitea.example/example/demo/src/branch/main/docs/demo.qmd',
            },
            commit: {
              sha: 'commit-123',
            },
          }),
      });

      const result = await provider.createOrUpdateFile(
        'docs/demo.qmd',
        'content',
        'Add demo',
        'main'
      );

      expect(result).toEqual({
        path: 'docs/demo.qmd',
        sha: 'sha-file',
        commitSha: 'commit-123',
        url: 'https://gitea.example/example/demo/src/branch/main/docs/demo.qmd',
      });

      const [, options] = mockFetch.mock.calls[0];
      expect(options).toEqual(
        expect.objectContaining({
          method: 'PUT',
        })
      );

      const payload = JSON.parse((options as RequestInit).body as string);
      expect(payload.content).toBe('Y29udGVudA==');
    });
  });

  describe('pull request operations', () => {
    it('updates pull requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            number: 7,
            title: 'Update docs',
            body: 'Updated body',
            state: 'open',
            merged: false,
            user: { login: 'octocat' },
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-02T00:00:00Z',
            html_url: 'https://gitea.example/example/demo/pulls/7',
          }),
      });

      const result = await provider.updatePullRequest(7, {
        title: 'Update docs',
        body: 'Updated body',
      });

      expect(result.title).toBe('Update docs');
      expect(result.body).toBe('Updated body');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gitea.example/api/v1/repos/example/demo/pulls/7',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            title: 'Update docs',
            body: 'Updated body',
          }),
        })
      );
    });

    it('creates review comments via reviews API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: async () =>
          JSON.stringify({
            id: 1,
            body: '',
            commit_id: 'commit-abc',
            comments: [
              {
                id: 55,
                path: 'README.md',
                line: 10,
                body: 'Nitpick',
                html_url: 'https://gitea.example/example/demo/pulls/5#comment-55',
              },
            ],
          }),
      });

      const result = await provider.createReviewComments(
        5,
        [
          {
            path: 'README.md',
            line: 10,
            body: 'Nitpick',
          },
        ],
        'commit-abc'
      );

      expect(result).toEqual([
        {
          id: 55,
          url: 'https://gitea.example/example/demo/pulls/5#comment-55',
          path: 'README.md',
          line: 10,
        },
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gitea.example/api/v1/repos/example/demo/pulls/5/reviews',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('repository access', () => {
    it('checks push permission to determine write access', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            name: 'demo',
            description: 'Demo repository',
            html_url: 'https://gitea.example/example/demo',
            default_branch: 'main',
            permissions: {
              admin: false,
              push: true,
              pull: true,
            },
          }),
      });

      const hasAccess = await provider.hasWriteAccess();
      expect(hasAccess).toBe(true);
    });
  });
});
