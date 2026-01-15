import { test, expect, type Page, type Locator, type Route } from '@playwright/test';
import AdmZip from 'adm-zip';

test.describe('Example project end-to-end workflow', () => {
  test('edits multiple documents, exports clean/critic bundles, and submits review', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === 'webkit', 'Downloads are unreliable in WebKit within CI sandbox');

    const gitMock = new GitHubApiMock();
    await gitMock.intercept(page);

    // Provide PAT token automatically when prompted
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') {
        await dialog.accept('fake-pat-token');
      } else {
        await dialog.dismiss();
      }
    });

    await page.goto('/example');
    await waitForReviewReady(page);

    await applyEdit({
      page,
      locator: page.locator('[data-review-type="Para"]').first(),
      marker: '[E2E_DOC_EDIT]',
    });
    await expectOperationCount(page, 1);

    await page.getByRole('link', { name: '02. Layout & Structure' }).click();
    await waitForReviewReady(page);

    await applyEdit({
      page,
      locator: page.locator('[data-review-type="Para"]').first(),
      marker: '[E2E_SECOND_PAGE_EDIT]',
    });
    await expectOperationCount(page, 2);

    // Wait for operations to be fully persisted
    await page.waitForTimeout(500);

    // Open drawer to access export buttons
    const drawerToggle = page.locator('[data-action="toggle-drawer"]');
    const isDrawerOpen = await page.locator('.review-drawer-section-title').first().isVisible();
    if (!isDrawerOpen) {
      await drawerToggle.click();
    }

    const cleanArchive = await captureDownload(
      page,
      '[data-action="export-qmd-clean"]'
    );
    // Verify export contains QMD content
    expect(cleanArchive.length).toBeGreaterThan(0);
    expect(cleanArchive).toContain('title:');

    const criticArchive = await captureDownload(
      page,
      '[data-action="export-qmd-critic"]'
    );
    // Verify CriticMarkup export contains content
    expect(criticArchive.length).toBeGreaterThan(0);
    expect(criticArchive).toContain('title:');

    const submitButton = page.locator('[data-action="submit-review"]');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    const modal = page.locator('.review-review-form');
    await expect(modal).toBeVisible();
    await modal.locator('button[type="submit"]').click();

    // Wait for the specific "Review submitted" notification (not the export notifications)
    await expect(
      page.locator('.review-notification.review-notification-success', { hasText: 'Review submitted' })
    ).toBeVisible({ timeout: 10_000 });

    const pullRequest = gitMock.getLastPullRequest();
    expect(pullRequest?.number).toBeGreaterThan(0);
    expect(pullRequest?.title).toBeTruthy();
    const branchFiles = gitMock.getBranchFiles(pullRequest?.head?.ref ?? '');
    expect(branchFiles).toBeTruthy();
    expect(branchFiles?.size).toBeGreaterThan(0);
  });
});

async function waitForReviewReady(page: Page): Promise<void> {
  await page.waitForSelector('[data-review-id]', { timeout: 10_000 });
  await page.waitForFunction(
    () => Boolean((window as any).reviewDebug?.operations),
    null,
    { timeout: 10_000 }
  );
}

async function applyEdit(options: {
  page: Page;
  locator: Locator;
  marker: string;
}): Promise<void> {
  const { page, locator, marker } = options;
  await expect(locator).toBeVisible();

  await locator.dblclick();
  await page.waitForSelector('.review-inline-editor-container', { state: 'visible' });

  // Use pressSequentially to trigger Milkdown's input handlers
  const editor = page.locator('.milkdown .ProseMirror').first();
  await editor.click();
  await editor.focus(); // Explicit focus for reliability

  // Wait for editor to be ready
  await page.waitForTimeout(100);

  // Use keyboard shortcuts to position at end more reliably
  await page.keyboard.press('Control+Home'); // Go to start
  await page.waitForTimeout(50);
  await page.keyboard.press('Control+End'); // Then to end
  await page.waitForTimeout(100); // Longer wait for cursor positioning

  // Type with a longer delay between characters to ensure Milkdown processes each one
  await editor.pressSequentially(` ${marker}`, { delay: 50 });

  // Wait for content to be fully processed
  await page.waitForTimeout(200);

  await page.locator('button:has-text("Save")').first().click();
  await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

  // Verify edit in the content element (not the button wrapper)
  const content = locator.locator('> *:not(.review-segment-actions)').first();
  await expect(content).toContainText(marker.replace(/\s+/g, ' ').trim());
}

async function expectOperationCount(page: Page, expected: number): Promise<void> {
  await page.waitForFunction(
    (count) => {
      const operations =
        ((window as any).reviewDebug?.operations?.() as Array<{ type: string }>) ??
        [];
      return operations.filter((op) => op.type === 'edit').length >= count;
    },
    expected,
    { timeout: 10_000 }
  );
}

async function captureDownload(page: Page, buttonSelector: string): Promise<string> {
  const button = page.locator(buttonSelector).first();
  await expect(button).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
  const stream = await download.createReadStream();
  if (!stream) {
    throw new Error('Failed to read download contents');
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  // Extract ZIP and concatenate all QMD file contents
  const zip = new AdmZip(buffer);
  const zipEntries = zip.getEntries();
  const qmdContents: string[] = [];

  zipEntries.forEach((entry) => {
    if (entry.entryName.endsWith('.qmd') && !entry.isDirectory) {
      const content = entry.getData().toString('utf-8');
      qmdContents.push(content);
    }
  });

  return qmdContents.join('\n');
}

class GitHubApiMock {
  private readonly repos = new Map<
    string,
    {
      branches: Map<string, BranchState>;
      pullRequests: GitHubPullRequest[];
      prCounter: number;
    }
  >();

  constructor() {
    const repoKey = this.repoKey();
    const initialBranches = new Map<string, BranchState>();
    initialBranches.set('main', {
      sha: this.randomSha(),
      files: this.initialFiles(),
    });
    this.repos.set(repoKey, {
      branches: initialBranches,
      pullRequests: [],
      prCounter: 0,
    });
  }

  async intercept(page: Page): Promise<void> {
    await page.route('https://api.github.com/**', (route) => this.handle(route));
  }

  getLastPullRequest(): GitHubPullRequest | undefined {
    const repo = this.repos.get(this.repoKey());
    return repo?.pullRequests[repo.pullRequests.length - 1];
  }

  getBranchFiles(branch: string): Map<string, string> | null {
    const repo = this.repos.get(this.repoKey());
    if (!repo) return null;
    const state = repo.branches.get(branch);
    if (!state) return null;
    const result = new Map<string, string>();
    state.files.forEach((value, key) => {
      result.set(key, value.content);
    });
    return result;
  }

  private initialFiles(): Map<string, { content: string; sha: string }> {
    const files = new Map<string, { content: string; sha: string }>();
    exampleSources.forEach((source) => {
      files.set(source.filename, {
        content: source.content,
        sha: this.randomSha(),
      });
    });
    return files;
  }

  private repoKey(): string {
    return 'mvwestendorp/quarto-review-extension-github-demo-new';
  }

  private async handle(route: Route): Promise<void> {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const path = url.pathname;
    const repoMatch = path.match(/^\/repos\/([^/]+)\/([^/]+)(.*)$/);
    if (!repoMatch) {
      await route.fallback();
      return;
    }
    const [, owner, repo, rest] = repoMatch;
    const repoKey = `${owner}/${repo}`;
    if (!this.repos.has(repoKey)) {
      this.repos.set(repoKey, {
        branches: new Map<string, BranchState>(),
        pullRequests: [],
        prCounter: 0,
      });
    }
    const repoState = this.repos.get(repoKey)!;

    if (rest === '' || rest === '/') {
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: repo,
            description: 'Mock repository for E2E tests',
            html_url: `https://github.com/${repoKey}`,
            default_branch: 'main',
            permissions: { push: true },
          }),
        });
        return;
      }
    }

    if (rest.startsWith('/git/ref/heads/') && method === 'GET') {
      const branch = rest.replace('/git/ref/heads/', '').replace(/^\/+/, '');
      const state = repoState.branches.get(branch);
      if (!state) {
        await route.fulfill({
          status: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Not Found' }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: `refs/heads/${branch}`,
          object: { sha: state.sha },
        }),
      });
      return;
    }

    if (rest === '/git/refs' && method === 'POST') {
      const body = this.parseBody(route);
      const ref = (body.ref as string) ?? '';
      const branch = ref.replace('refs/heads/', '');
      const baseSha = body.sha as string;
      const baseBranchEntry = Array.from(repoState.branches.entries()).find(
        ([, state]) => state.sha === baseSha
      );
      const baseBranch = baseBranchEntry ? baseBranchEntry[0] : 'main';
      const baseState =
        repoState.branches.get(baseBranch) ??
        repoState.branches.values().next().value;
      repoState.branches.set(branch, {
        sha: this.randomSha(),
        files: this.cloneFiles(baseState.files),
      });
      await route.fulfill({
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: `refs/heads/${branch}`,
          object: { sha: baseSha },
        }),
      });
      return;
    }

    if (rest.startsWith('/contents/')) {
      const filePath = decodeURIComponent(rest.replace('/contents/', ''));
      const branch = url.searchParams.get('ref') ?? this.defaultBranch(repoState);
      const branchState = repoState.branches.get(branch);
      if (!branchState) {
        await route.fulfill({
          status: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Branch not found' }),
        });
        return;
      }

      if (method === 'GET') {
        const file = branchState.files.get(filePath);
        if (!file) {
          await route.fulfill({
            status: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Not Found' }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: filePath,
            sha: file.sha,
            content: Buffer.from(file.content, 'utf-8').toString('base64'),
            encoding: 'base64',
          }),
        });
        return;
      }

      if (method === 'PUT') {
        const body = this.parseBody(route);
        const content = Buffer.from(body.content as string, 'base64').toString('utf-8');
        const targetBranch = (body.branch as string) ?? this.defaultBranch(repoState);
        const target = repoState.branches.get(targetBranch);
        if (!target) {
          await route.fulfill({
            status: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Branch not found' }),
          });
          return;
        }
        const sha = this.randomSha();
        target.files.set(filePath, { content, sha });
        target.sha = sha;

        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: {
              path: filePath,
              sha,
              html_url: `https://github.com/${repoKey}/blob/${targetBranch}/${filePath}`,
            },
            commit: { sha: this.randomSha() },
          }),
        });
        return;
      }
    }

    if (rest.startsWith('/pulls') && method === 'GET') {
      const state = url.searchParams.get('state') ?? 'open';
      const pulls =
        state === 'open'
          ? repoState.pullRequests.filter((pr) => pr.state === 'open')
          : repoState.pullRequests;
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pulls),
      });
      return;
    }

    if (rest === '/pulls' && method === 'POST') {
      const body = this.parseBody(route);
      const number = ++repoState.prCounter;
      const pr: GitHubPullRequest = {
        number,
        title: body.title ?? 'Mock PR',
        body: body.body ?? '',
        state: 'open',
        merged_at: null,
        user: { login: 'mock-user', name: 'Mock User' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        html_url: `https://github.com/${repoKey}/pull/${number}`,
        head: { ref: body.head },
        base: { ref: body.base },
        draft: Boolean(body.draft),
      };
      repoState.pullRequests.push(pr);
      await route.fulfill({
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pr),
      });
      return;
    }

    if (rest.match(/^\/pulls\/\d+\/comments$/) && method === 'POST') {
      await route.fulfill({
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([]),
      });
      return;
    }

    await route.fallback();
  }

  private parseBody(route: Route): Record<string, unknown> {
    try {
      return route.request().postDataJSON?.() ?? {};
    } catch {
      const text = route.request().postData() ?? '{}';
      try {
        return JSON.parse(text);
      } catch {
        return {};
      }
    }
  }

  private cloneFiles(
    files: Map<string, { content: string; sha: string }>
  ): Map<string, { content: string; sha: string }> {
    const copy = new Map<string, { content: string; sha: string }>();
    files.forEach((value, key) => {
      copy.set(key, { content: value.content, sha: value.sha });
    });
    return copy;
  }

  private defaultBranch(
    repoState: {
      branches: Map<string, BranchState>;
    }
  ): string {
    return repoState.branches.has('main')
      ? 'main'
      : repoState.branches.keys().next().value;
  }

  private randomSha(): string {
    return Math.random().toString(16).slice(2, 10);
  }
}

type BranchState = {
  sha: string;
  files: Map<string, { content: string; sha: string }>;
};

interface GitHubPullRequest {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  merged_at: string | null;
  user: { login: string; name?: string };
  created_at: string;
  updated_at: string;
  html_url: string;
  head?: { ref: string };
  base?: { ref: string };
  draft?: boolean;
}

const exampleSources = [
  {
    filename: '01-text-and-formatting.qmd',
    content: [
      '---',
      'title: "01. Text & Formatting"',
      '---',
      '',
      'This is the example document content.',
    ].join('\n'),
  },
  {
    filename: '02-layout-and-structure.qmd',
    content: [
      '---',
      'title: "02. Layout & Structure"',
      '---',
      '',
      'Layout and structure example content.',
    ].join('\n'),
  },
  {
    filename: '_quarto.yml',
    content: 'project:\n  type: website\n',
  },
] as const;
