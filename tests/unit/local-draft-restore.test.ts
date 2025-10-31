import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UIModule } from '@modules/ui';
import type { UIConfig } from '@modules/ui';

const createChangesStub = () => ({
  initializeFromDOM: vi.fn(),
  undo: vi.fn().mockReturnValue(false),
  redo: vi.fn().mockReturnValue(false),
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

const createConfigStub = (draftContent: string | null): UIConfig => {
  const changes = createChangesStub();
  const persistence = {
    saveDraft: vi.fn(),
    clearAll: vi.fn(),
    loadDraft: vi.fn().mockResolvedValue(draftContent),
  };

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
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('applies restored draft when content differs', async () => {
    const config = createConfigStub('Updated content');
    const ui = new UIModule(config);
    await Promise.resolve();
    expect(config.changes.replaceElementWithSegments).toHaveBeenCalled();
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
