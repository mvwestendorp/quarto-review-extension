import { describe, expect, it } from 'vitest';

import { resolveGitConfig } from '@/modules/git/config';

describe('resolveGitConfig', () => {
  it('returns null when config is missing', () => {
    expect(resolveGitConfig(undefined)).toBeNull();
    expect(resolveGitConfig(null)).toBeNull();
  });

  it('requires provider, owner and repo', () => {
    expect(resolveGitConfig({ provider: 'github' })).toBeNull();
    expect(
      resolveGitConfig({ provider: 'github', owner: 'quarto' })
    ).toBeNull();
  });

  it('normalizes base branch and source file keys', () => {
    const resolution = resolveGitConfig({
      provider: 'github',
      owner: 'quarto-dev',
      repo: 'review',
      ['base-branch']: 'develop',
      ['source-file']: 'example/document.qmd',
      auth: {
        mode: 'pat',
        token: 'dev-token',
      },
    });

    expect(resolution).not.toBeNull();
    expect(resolution?.config.provider).toBe('github');
    expect(resolution?.config.repository.owner).toBe('quarto-dev');
    expect(resolution?.config.repository.name).toBe('review');
    expect(resolution?.config.repository.baseBranch).toBe('develop');
    expect(resolution?.config.repository.sourceFile).toBe(
      'example/document.qmd'
    );
    expect(resolution?.config.auth?.mode).toBe('pat');
    expect(resolution?.config.auth?.token).toBe('dev-token');
  });

  it('falls back to defaults when optional fields are absent', () => {
    const resolution = resolveGitConfig({
      provider: 'github',
      owner: 'example',
      repo: 'docs',
    });

    expect(resolution).not.toBeNull();
    expect(resolution?.config.repository.baseBranch).toBe('main');
    expect(resolution?.config.auth).toBeUndefined();
  });
});
