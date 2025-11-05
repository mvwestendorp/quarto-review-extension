import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GitLabProvider } from '@/modules/git/providers/gitlab';
import type { ProviderConfig } from '@/modules/git/providers';

describe('GitLabProvider', () => {
  let provider: GitLabProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const config: ProviderConfig & { token: string; owner: string; repo: string } =
      {
        url: 'https://gitlab.example/api/v4',
        token: 'gitlab-token',
        owner: 'example',
        repo: 'demo',
      };

    provider = new GitLabProvider({
      ...config,
      projectId: 'example%2Fdemo',
    });
  });

  describe('authentication', () => {
    it('includes bearer token when performing requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            username: 'octocat',
            name: 'Octo Cat',
            avatar_url: 'https://gitlab.example/avatar.png',
          }),
      });

      const user = await provider.getCurrentUser();

      expect(user).toEqual({
        login: 'octocat',
        name: 'Octo Cat',
        avatarUrl: 'https://gitlab.example/avatar.png',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gitlab.example/api/v4/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer gitlab-token',
          }),
        })
      );
    });
  });

  describe('branch operations', () => {
    it('creates a branch from the given base branch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            name: 'feature/new-ui',
            commit: { id: 'branch-sha-123' },
          }),
      });

      const result = await provider.createBranch('feature/new-ui', 'main');

      expect(result).toEqual({
        name: 'feature/new-ui',
        sha: 'branch-sha-123',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gitlab.example/api/v4/projects/example%2Fdemo/repository/branches',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            branch: 'feature/new-ui',
            ref: 'main',
          }),
        })
      );
    });
  });

  describe('file operations', () => {
    it('returns decoded file contents for an existing file', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            file_path: 'README.md',
            content: 'c2FtcGxlIGNvbnRlbnQ=',
            last_commit_id: 'commit-sha',
          }),
      });

      const file = await provider.getFileContent('README.md', 'main');

      expect(file).toEqual({
        path: 'README.md',
        content: 'sample content',
        sha: 'commit-sha',
      });
    });

    it('returns null when the file does not exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: '404 File Not Found' }),
      });

      const file = await provider.getFileContent('missing.md', 'main');
      expect(file).toBeNull();
    });

    it('creates and updates files with encoded content', async () => {
      const createResponse = {
        file_path: 'docs/example.qmd',
        branch: 'feature',
        commit_id: 'commit-123',
        content_sha256: 'sha256-abc',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: async () => JSON.stringify(createResponse),
      });

      const created = await provider.createOrUpdateFile(
        'docs/example.qmd',
        'content',
        'Add example',
        'feature'
      );

      expect(created).toEqual({
        path: 'docs/example.qmd',
        sha: 'sha256-abc',
        commitSha: 'commit-123',
        url: expect.stringContaining('/blob/feature/docs/example.qmd'),
      });

      const [, createOptions] = mockFetch.mock.calls[0];
      expect(createOptions).toEqual(
        expect.objectContaining({
          method: 'POST',
        })
      );

      const createPayload = JSON.parse(
        (createOptions as RequestInit).body as string
      );
      expect(createPayload.encoding).toBe('base64');
      expect(createPayload.content).toBe('Y29udGVudA==');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            ...createResponse,
            last_commit_id: 'commit-456',
            commit_id: 'commit-789',
          }),
      });

      const updated = await provider.createOrUpdateFile(
        'docs/example.qmd',
        'updated-content',
        'Update example',
        'feature',
        'commit-456'
      );

      expect(updated).toEqual({
        path: 'docs/example.qmd',
        sha: 'sha256-abc',
        commitSha: 'commit-789',
        url: expect.stringContaining('/blob/feature/docs/example.qmd'),
      });

      const [, updateOptions] = mockFetch.mock.calls[1];
      expect(updateOptions).toEqual(
        expect.objectContaining({
          method: 'PUT',
        })
      );

      const updatePayload = JSON.parse(
        (updateOptions as RequestInit).body as string
      );
      expect(updatePayload.last_commit_id).toBe('commit-456');
      expect(updatePayload.content).toBe('dXBkYXRlZC1jb250ZW50');
    });
  });

  describe('pull request operations', () => {
    it('updates merge requests using provided fields', async () => {
      const mergeRequest = {
        iid: 42,
        title: 'Update docs',
        description: 'Updated body',
        state: 'opened' as const,
        author: { username: 'maintainer' },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        web_url: 'https://gitlab.example/demo/merge_requests/42',
        source_branch: 'feature',
        target_branch: 'main',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mergeRequest),
      });

      const result = await provider.updatePullRequest(42, {
        title: 'Update docs',
        body: 'Updated body',
      });

      expect(result.title).toBe('Update docs');
      expect(result.body).toBe('Updated body');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gitlab.example/api/v4/projects/example%2Fdemo/merge_requests/42',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            title: 'Update docs',
            description: 'Updated body',
          }),
        })
      );
    });

    it('creates review comments by posting merge request notes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        text: async () =>
          JSON.stringify({
            id: 99,
            web_url:
              'https://gitlab.example/demo/-/merge_requests/5#note_99',
          }),
      });

      const results = await provider.createReviewComments(
        5,
        [
          {
            path: 'README.md',
            line: 12,
            body: 'Consider renaming this section',
          },
        ],
        'commit-sha'
      );

      expect(results).toEqual([
        {
          id: 99,
          url: 'https://gitlab.example/demo/-/merge_requests/5#note_99',
          path: 'README.md',
          line: 12,
        },
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gitlab.example/api/v4/projects/example%2Fdemo/merge_requests/5/notes',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            body: 'Consider renaming this section',
          }),
        })
      );
    });
  });

  describe('repository access', () => {
    it('determines write access based on permissions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            name: 'demo',
            description: 'Demo repo',
            web_url: 'https://gitlab.example/demo',
            default_branch: 'main',
            permissions: {
              project_access: { access_level: 40 },
              group_access: null,
            },
          }),
      });

      const hasAccess = await provider.hasWriteAccess();
      expect(hasAccess).toBe(true);
    });
  });
});
