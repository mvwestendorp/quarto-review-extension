/**
 * Test Utilities & Helpers
 *
 * Common utilities for consistent test structure across the project.
 * Provides mocks, fixtures, and helper functions for testing.
 */

/**
 * Git Provider Mock Data
 */
export const mockGitConfig = {
  provider: 'github' as const,
  baseUrl: 'https://api.github.com',
  owner: 'test-owner',
  repo: 'test-repo',
  branch: 'main',
  authMode: 'token' as const,
  token: 'test-token-12345',
};

export const mockGitlabConfig = {
  provider: 'gitlab' as const,
  baseUrl: 'https://gitlab.com/api/v4',
  projectId: '12345',
  branch: 'main',
  authMode: 'token' as const,
  token: 'test-token',
};

export const mockGiteaConfig = {
  provider: 'gitea' as const,
  baseUrl: 'https://gitea.example.com/api/v1',
  owner: 'test-owner',
  repo: 'test-repo',
  branch: 'main',
  authMode: 'token' as const,
  token: 'test-token',
};

/**
 * Mock API Responses
 */
export const mockGitHubResponses = {
  getCurrentUser: {
    login: 'test-user',
    id: 12345,
    name: 'Test User',
    email: 'test@example.com',
  },
  createBranch: {
    ref: 'refs/heads/feature-branch',
    sha: 'abc123def456',
    url: 'https://api.github.com/repos/test-owner/test-repo/git/refs/heads/feature-branch',
  },
  createCommit: {
    sha: 'commit123abc',
    url: 'https://api.github.com/repos/test-owner/test-repo/git/commits/commit123abc',
  },
  createPullRequest: {
    id: 1,
    number: 1,
    title: 'Test PR',
    body: 'Test PR body',
    head: { ref: 'feature-branch' },
    base: { ref: 'main' },
    html_url: 'https://github.com/test-owner/test-repo/pull/1',
  },
  mergePullRequest: {
    sha: 'merge123',
    merged: true,
    message: 'Pull Request successfully merged',
  },
  getUser: {
    login: 'test-user',
    id: 12345,
    avatar_url: 'https://avatars.githubusercontent.com/u/12345',
    profile_url: 'https://github.com/test-user',
  },
};

/**
 * Mock Editor State
 */
export const mockEditorState = {
  activeEditor: null as HTMLElement | null,
  activeEditorToolbar: null as HTMLElement | null,
  currentElementId: null as string | null,
  milkdownEditor: null,
  currentEditorContent: '',
  showTrackedChanges: true,
};

export const mockUIState = {
  undoButton: null as HTMLButtonElement | null,
  redoButton: null as HTMLButtonElement | null,
  trackedChangesToggle: null as HTMLInputElement | null,
  isSidebarCollapsed: false,
};

export const mockCommentState = {
  activeCommentComposer: null as HTMLElement | null,
  activeComposerInsertionAnchor: null as HTMLElement | null,
  activeComposerOriginalItem: null as HTMLElement | null,
  activeHighlightedSection: null as HTMLElement | null,
  highlightedBy: null as 'hover' | 'composer' | null,
};

/**
 * Mock History Entry
 */
export interface MockHistoryEntry {
  id: string;
  content: string;
  timestamp: number;
}

export const createMockHistoryEntry = (
  id: string,
  content: string,
  timestamp = Date.now()
): MockHistoryEntry => ({
  id,
  content,
  timestamp,
});

/**
 * Mock Change Entry
 */
export interface MockChangeEntry {
  type: 'addition' | 'deletion' | 'substitution';
  elementId: string;
  elementLabel: string;
  content: string;
  timestamp: number;
}

export const createMockChange = (
  type: 'addition' | 'deletion' | 'substitution',
  elementId: string,
  elementLabel: string,
  content: string
): MockChangeEntry => ({
  type,
  elementId,
  elementLabel,
  content,
  timestamp: Date.now(),
});

/**
 * Mock Comment Entry
 */
export interface MockComment {
  id: string;
  elementId: string;
  elementLabel: string;
  author: string;
  content: string;
  timestamp: number;
  resolved: boolean;
}

export const createMockComment = (
  id: string,
  elementId: string,
  elementLabel: string,
  content: string
): MockComment => ({
  id,
  elementId,
  elementLabel,
  author: 'Test User',
  content,
  timestamp: Date.now(),
  resolved: false,
});

/**
 * Fetch Mock Helper
 */
export function createFetchMock(
  responses: Record<string, { status: number; body: unknown }>
) {
  return async (url: string, options?: RequestInit) => {
    const key = url.split('?')[0]; // Remove query params
    const response = responses[key];

    if (!response) {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Not found' }),
        text: async () => 'Not found',
      };
    }

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.status === 200 ? 'OK' : 'Error',
      json: async () => response.body,
      text: async () => JSON.stringify(response.body),
    };
  };
}

/**
 * Mock DOM Element Helper
 */
export function createMockElement(
  tag: string = 'div',
  attributes: Record<string, string> = {}
): HTMLElement {
  const el = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    el.setAttribute(key, value);
  });
  return el;
}

/**
 * Mock Event Emitter Helper
 */
export class MockEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  emit(event: string, data?: unknown) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach((handler) => handler(data));
  }

  off(event: string, handler: Function) {
    const handlers = this.listeners.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  clear() {
    this.listeners.clear();
  }
}

/**
 * Wait Helper for Async Tests
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounce Helper for Testing
 */
export function createTestDebounce(fn: Function, delay: number) {
  let timeout: NodeJS.Timeout;
  return function (...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Base64 Encoding Helper
 */
export function encodeToBase64(str: string): string {
  return Buffer.from(str).toString('base64');
}

/**
 * Base64 Decoding Helper
 */
export function decodeFromBase64(str: string): string {
  return Buffer.from(str, 'base64').toString('utf-8');
}

/**
 * Assert Helper for Deep Equality
 */
export function assertDeepEqual(actual: unknown, expected: unknown, message?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      message ||
        `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`
    );
  }
}

/**
 * Test Data Generators
 */
export const generators = {
  randomId: () => Math.random().toString(36).substring(2, 11),
  randomEmail: () => `test-${Math.random().toString(36).substring(7)}@example.com`,
  randomString: (length: number = 10) =>
    Math.random().toString(36).substring(2, 2 + length),
};
