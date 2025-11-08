import { describe, it, expect, vi } from 'vitest';
import LocalDraftPersistence from '@modules/storage/LocalDraftPersistence';

const createStoreStub = () => ({
  saveFile: vi.fn().mockResolvedValue({ version: 'v1', timestamp: 'now' }),
  clearAll: vi.fn().mockResolvedValue(undefined),
  getSource: vi.fn().mockResolvedValue(null),
});

describe('LocalDraftPersistence', () => {
  it('saves drafts via embedded source store', async () => {
    const store = createStoreStub();
    const persistence = new LocalDraftPersistence(store as any, {
      filename: 'test.qmd',
      defaultMessage: 'Draft',
    });

    await persistence.saveDraft(
      [
        {
          id: 'section-1',
          content: 'Updated content',
          metadata: { type: 'Para' },
        },
      ],
      {
        message: 'Custom message',
        comments: [
          {
            id: 'comment-1',
            elementId: 'section-1',
            content: 'Note',
            userId: 'alice',
            timestamp: 1,
            resolved: false,
            type: 'comment',
          },
        ],
      }
    );

    expect(store.saveFile).toHaveBeenCalledWith(
      'test.qmd',
      expect.stringContaining('Updated content'),
      'Custom message'
    );

    const serialized = store.saveFile.mock.calls[0]?.[1] ?? '';
    expect(serialized).toContain('"comments"');
  });

  it('clears drafts via embedded source store', async () => {
    const store = createStoreStub();
    const persistence = new LocalDraftPersistence(store as any, {});

    await persistence.clearAll();

    expect(store.clearAll).toHaveBeenCalled();
  });

  it('loads draft payload from configured filename', async () => {
    const payload = {
      savedAt: '2024-01-01T00:00:00.000Z',
      elements: [{ id: 'section-1', content: 'Saved content' }],
    };
    const store = createStoreStub();
    store.getSource = vi
      .fn()
      .mockImplementation(async (filename: string) =>
        filename === 'review-draft.json'
          ? { content: JSON.stringify(payload) }
          : null
      );
    const persistence = new LocalDraftPersistence(store as any, {});

    const result = await persistence.loadDraft();

    expect(result).toEqual(payload);
    expect(store.saveFile).not.toHaveBeenCalled();
  });

  it('returns null when draft file does not exist', async () => {
    const store = createStoreStub();
    store.getSource = vi.fn().mockResolvedValue(null);
    const persistence = new LocalDraftPersistence(store as any, {});

    const result = await persistence.loadDraft();

    expect(result).toBeNull();
  });

  it('returns null when stored draft is malformed', async () => {
    const store = createStoreStub();
    store.getSource = vi.fn().mockResolvedValue({ content: '{not valid json}' });
    const persistence = new LocalDraftPersistence(store as any, {});

    await expect(persistence.loadDraft()).resolves.toBeNull();
  });

  it('swallows errors from store.saveFile when persisting drafts', async () => {
    const store = createStoreStub();
    store.saveFile = vi.fn().mockRejectedValue(new Error('write failed'));
    const persistence = new LocalDraftPersistence(store as any, {});

    await expect(
      persistence.saveDraft([{ id: 'a', content: 'b' }])
    ).resolves.toBeUndefined();

    expect(store.saveFile).toHaveBeenCalled();
  });

  describe('git review session persistence', () => {
    it('saves git session metadata to dedicated file', async () => {
      const store = createStoreStub();
      const persistence = new LocalDraftPersistence(store as any, {
        filename: 'review-draft.json',
      });

      await persistence.saveGitSession({
        branchName: 'feature/review-session',
        pullRequestNumber: 42,
      });

      expect(store.saveFile).toHaveBeenCalledWith(
        'review-draft.json.git-session',
        JSON.stringify({
          branchName: 'feature/review-session',
          pullRequestNumber: 42,
        }),
        'Update git review session'
      );
    });

    it('loads git session metadata when available', async () => {
      const store = createStoreStub();
      store.getSource = vi.fn().mockResolvedValue({
        content: JSON.stringify({
          branchName: 'feature/reuse',
          pullRequestNumber: 7,
        }),
      });
      const persistence = new LocalDraftPersistence(store as any, {
        filename: 'review-draft.json',
      });

      const session = await persistence.loadGitSession();

      expect(session).toEqual({
        branchName: 'feature/reuse',
        pullRequestNumber: 7,
      });
      expect(store.getSource).toHaveBeenCalledWith(
        'review-draft.json.git-session'
      );
    });

    it('returns null when git session metadata is missing or invalid', async () => {
      const store = createStoreStub();
      store.getSource = vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ content: '{invalid}' });
      const persistence = new LocalDraftPersistence(store as any, {});

      expect(await persistence.loadGitSession()).toBeNull();
      expect(await persistence.loadGitSession()).toBeNull();
    });

    it('clears git session metadata by writing empty payload', async () => {
      const store = createStoreStub();
      const persistence = new LocalDraftPersistence(store as any, {
        filename: 'review-draft.json',
      });

      await persistence.clearGitSession();

      expect(store.saveFile).toHaveBeenCalledWith(
        'review-draft.json.git-session',
        '',
        'Clear git review session'
      );
    });
  });
});
