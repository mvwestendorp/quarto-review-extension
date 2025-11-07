import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { UIModule } from '@modules/ui';
import type { UIConfig } from '@modules/ui';

const createChangesStub = () => ({
  initializeFromDOM: vi.fn(),
  undo: vi.fn().mockReturnValue(false),
  redo: vi.fn().mockReturnValue(false),
  canUndo: vi.fn().mockReturnValue(false),
  canRedo: vi.fn().mockReturnValue(false),
  getCurrentState: vi.fn().mockReturnValue([
    {
      id: 'section-1',
      content: 'Original content',
      metadata: { type: 'Para' },
    },
  ]),
  getOperations: vi.fn().mockReturnValue([]),
  replaceElementWithSegments: vi.fn().mockReturnValue({
    elementIds: ['section-1'],
    removedIds: [],
  }),
  getElementById: vi.fn().mockReturnValue({
    id: 'section-1',
    metadata: { type: 'Para' },
  }),
  getElementContent: vi.fn().mockReturnValue('Original content'),
  getElementContentWithTrackedChanges: vi.fn().mockReturnValue('Original content'),
  toMarkdown: vi.fn().mockReturnValue('Original content'),
  hasUnsavedOperations: vi.fn().mockReturnValue(false),
  markAsSaved: vi.fn(),
} as any);

interface DraftOptions {
  comments?: Array<Record<string, unknown>>;
}

const createConfigStub = (
  draftContent: string | null,
  options: DraftOptions = {}
): UIConfig => {
  const changes = createChangesStub();

  // Phase 1 v2: persistence is now LocalDraftPersistence with git-backed storage
  const persistence = {
    getFilename: vi.fn().mockReturnValue('review-draft.json'),
    saveDraft: vi.fn(),
    clearAll: vi.fn(),
    loadDraft: vi.fn().mockResolvedValue(
      draftContent === null
        ? null
        : {
            savedAt: new Date().toISOString(),
            elements: [
              {
                id: 'section-1',
                content: draftContent,
                metadata: { type: 'Para' },
              },
            ],
            comments: options.comments ?? [],
          }
    ),
  } as any;

  const markdown = {
    render: vi.fn(),
    renderSync: vi.fn(),
    parseToAST: vi.fn().mockReturnValue({ children: [] }),
    renderElement: vi.fn(),
  } as any;

  const comments = {
    parse: vi.fn().mockReturnValue([]),
    createComment: vi.fn(),
    accept: vi.fn(),
    refresh: vi.fn(),
    getAllComments: vi.fn().mockReturnValue(options.comments ?? []),
    importComments: vi.fn(),
    getCommentsForElement: vi.fn().mockReturnValue([]),
    addComment: vi.fn(),
    updateComment: vi.fn().mockReturnValue(true),
    deleteComment: vi.fn().mockReturnValue(true),
  } as any;

  return {
    changes,
    markdown,
    comments,
    inlineEditing: false,
    persistence,
  } as UIConfig;
};

describe('Local draft restore', () => {
  let originalSessionStorage: Storage | null = null;

  beforeAll(() => {
    try {
      originalSessionStorage = window.sessionStorage;
    } catch {
      originalSessionStorage = null;
    }
  });

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(Date.now()), 0)
    );
    vi.stubGlobal('cancelAnimationFrame', (handle: number) => {
      clearTimeout(handle);
    });
    const storageMap = new Map<string, string>();
    const mockSessionStorage: Storage = {
      get length() {
        return storageMap.size;
      },
      clear() {
        storageMap.clear();
      },
      getItem(key: string) {
        return storageMap.has(key) ? storageMap.get(key) ?? null : null;
      },
      key(index: number) {
        return Array.from(storageMap.keys())[index] ?? null;
      },
      removeItem(key: string) {
        storageMap.delete(key);
      },
      setItem(key: string, value: string) {
        storageMap.set(key, value);
      },
    };

    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: mockSessionStorage,
    });
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalSessionStorage) {
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        value: originalSessionStorage,
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (window as unknown as Record<string, unknown>).sessionStorage;
    }
  });

  it('applies restored draft when content differs', async () => {
    const config = createConfigStub('Updated content');
    const ui = new UIModule(config);
    // Wait for multiple event loops to allow async restoration to complete
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(config.changes.replaceElementWithSegments).toHaveBeenCalled();
  });

  it('imports comments saved in the local draft', async () => {
    const sampleComment = {
      id: 'comment-1',
      elementId: 'section-1',
      content: 'Draft comment',
      userId: 'reviewer-1',
      timestamp: Date.now(),
      resolved: false,
      type: 'comment',
    };
    const config = createConfigStub('Updated content', {
      comments: [sampleComment],
    });
    const ui = new UIModule(config);
    // Wait for multiple event loops to allow async restoration to complete
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(config.comments.importComments).toHaveBeenCalledWith([
      sampleComment,
    ]);
  });

  it('skips restore when draft matches current content', async () => {
    const config = createConfigStub('Original content');
    const ui = new UIModule(config);
    await Promise.resolve();
    expect(config.changes.replaceElementWithSegments).not.toHaveBeenCalled();
  });

  it('skips restore when no draft exists', async () => {
    const config = createConfigStub(null);
    const ui = new UIModule(config);
    await Promise.resolve();
    expect(config.changes.replaceElementWithSegments).not.toHaveBeenCalled();
  });
});
