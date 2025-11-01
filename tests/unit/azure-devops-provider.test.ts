import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AzureDevOpsProvider } from '@/modules/git/providers/azure-devops';
import type { ProviderConfig } from '@/modules/git/providers';

describe('AzureDevOpsProvider', () => {
  let provider: AzureDevOpsProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  const repositoryResponse = {
    id: 'repo-id-123',
    name: 'docs-repo',
    webUrl:
      'https://dev.azure.com/example-org/Website/_git/docs-repo',
    defaultBranch: 'refs/heads/main',
    project: {
      id: 'project-id-456',
      name: 'Website',
    },
  };

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const config: ProviderConfig & {
      project: string;
    } = {
      owner: 'example-org',
      repo: 'docs-repo',
      url: 'https://dev.azure.com/example-org',
      auth: {
        mode: 'pat',
        token: 'ado_pat_123',
      },
      project: 'Website',
    };

    provider = new AzureDevOpsProvider(config);
  });

  it('fetches the current user via connection data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          authenticatedUser: {
            subjectDescriptor: 'aad.ZmFrZVVzZXI=',
            providerDisplayName: 'Ada Lovelace',
            _links: {
              avatar: { href: 'https://example/avatar.png' },
            },
          },
        }),
    });

    const user = await provider.getCurrentUser();

    expect(user).toEqual({
      login: 'aad.ZmFrZVVzZXI=',
      name: 'Ada Lovelace',
      avatarUrl: 'https://example/avatar.png',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://dev.azure.com/example-org/_apis/connectionData?connectOptions=IncludeServices&lastChangeId=-1&lastChangeId64=-1&api-version=7.1-preview.1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Basic OmFkb19wYXRfMTIz',
          Accept: 'application/json',
        }),
      })
    );
  });

  it('creates a branch from an existing base branch', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(repositoryResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            value: [
              {
                name: 'refs/heads/main',
                objectId: 'base-sha-789',
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            value: [
              {
                name: 'refs/heads/feature/review',
                newObjectId: 'branch-sha-000',
              },
            ],
          }),
      });

    const result = await provider.createBranch('feature/review', 'main');

    expect(result).toEqual({
      name: 'refs/heads/feature/review',
      sha: 'branch-sha-000',
    });

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://dev.azure.com/example-org/Website/_apis/git/repositories/repo-id-123/refs?filter=heads%2Fmain&api-version=7.1-preview.1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Basic OmFkb19wYXRfMTIz',
        }),
      })
    );

    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      'https://dev.azure.com/example-org/Website/_apis/git/repositories/repo-id-123/refs?api-version=7.1-preview.1',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('reads file contents from a branch', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(repositoryResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            path: '/docs/example.qmd',
            content: 'sample content',
            isBinary: false,
            commitId: 'commit-123',
          }),
      });

    const file = await provider.getFileContent('docs/example.qmd', 'main');

    expect(file).toEqual({
      path: 'docs/example.qmd',
      content: 'sample content',
      sha: 'commit-123',
    });

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://dev.azure.com/example-org/Website/_apis/git/repositories/repo-id-123/items?path=%2Fdocs%2Fexample.qmd&includeContent=true&versionDescriptor.version=main&versionDescriptor.versionType=branch&api-version=7.1-preview.1',
      expect.any(Object)
    );
  });

  it('creates or updates files via git pushes', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(repositoryResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            value: [
              {
                name: 'refs/heads/review',
                objectId: 'branch-head-sha',
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            commits: [
              {
                commitId: 'commit-updated',
              },
            ],
          }),
      });

    const result = await provider.createOrUpdateFile(
      'docs/example.qmd',
      '# Example',
      'Update example',
      'review'
    );

    expect(result).toMatchObject({
      path: 'docs/example.qmd',
      sha: 'commit-updated',
      commitSha: 'commit-updated',
    });
    expect(result.url).toContain('%2Fdocs%2Fexample.qmd');
    expect(result.url).toContain('GBreview');

    const [, , pushRequest] = mockFetch.mock.calls;
    expect(pushRequest[0]).toEqual(
      'https://dev.azure.com/example-org/Website/_apis/git/repositories/repo-id-123/pushes?api-version=7.1-preview.1'
    );
    const pushBody = JSON.parse(
      (pushRequest[1] as RequestInit).body as string
    );
    expect(pushBody.refUpdates[0].name).toBe('refs/heads/review');
    expect(pushBody.commits[0].changes[0].newContent.content).toBe('# Example');
  });

  it('creates pull requests', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(repositoryResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            pullRequestId: 42,
            title: 'Update docs',
            description: 'Body',
            status: 'active',
            createdBy: { displayName: 'Ada', uniqueName: 'ada@example.com' },
            creationDate: '2024-01-01T12:00:00Z',
            sourceRefName: 'refs/heads/feature',
            targetRefName: 'refs/heads/main',
            _links: {
              web: { href: 'https://dev.azure.com/example-org/pr/42' },
            },
          }),
      });

    const pullRequest = await provider.createPullRequest(
      'Update docs',
      'Body',
      'feature',
      'main'
    );

    expect(pullRequest).toMatchObject({
      number: 42,
      title: 'Update docs',
      state: 'open',
      headRef: 'feature',
      baseRef: 'main',
    });
  });

  it('creates review comments as threads', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(repositoryResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            id: 7,
            comments: [{ id: 71 }],
            _links: {
              web: { href: 'https://dev.azure.com/example-org/pr/5#thread-7' },
            },
          }),
      });

    const results = await provider.createReviewComments(
      5,
      [
        {
          path: 'docs/example.qmd',
          body: 'Consider rephrasing this introduction.',
          line: 12,
        },
      ],
      'commit-xyz'
    );

    expect(results).toEqual([
      {
        id: 71,
        url: 'https://dev.azure.com/example-org/pr/5#thread-7',
        path: 'docs/example.qmd',
        line: 12,
      },
    ]);

    const [, threadCall] = mockFetch.mock.calls;
    expect(threadCall[0]).toBe(
      'https://dev.azure.com/example-org/Website/_apis/git/repositories/repo-id-123/pullRequests/5/threads?api-version=7.1-preview.1'
    );
  });

  it('evaluates write access permissions', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(repositoryResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            value: [
              {
                permissionBit: 2,
                isAllowed: true,
              },
            ],
          }),
      });

    const hasAccess = await provider.hasWriteAccess();
    expect(hasAccess).toBe(true);

    const [, permissionCall] = mockFetch.mock.calls;
    expect(permissionCall[0]).toBe(
      'https://dev.azure.com/example-org/_apis/security/permissions/evaluate?api-version=7.1-preview.1'
    );
  });
});
