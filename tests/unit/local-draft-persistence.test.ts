import { describe, it, expect, vi } from 'vitest';
import LocalDraftPersistence from '@modules/storage/LocalDraftPersistence';

const createStoreStub = () => ({
  saveFile: vi.fn().mockResolvedValue({ version: 'v1', timestamp: 'now' }),
  clearAll: vi.fn().mockResolvedValue(undefined),
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
      'Custom message'
    );

    expect(store.saveFile).toHaveBeenCalledWith(
      'test.qmd',
      expect.stringContaining('Updated content'),
      'Custom message'
    );
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
  const store = {
    saveFile: vi.fn(),
    clearAll: vi.fn(),
    getSource: vi
      .fn()
      .mockImplementation(async (filename: string) =>
        filename === 'review-draft.json'
          ? { content: JSON.stringify(payload) }
          : null
      ),
  };
  const persistence = new LocalDraftPersistence(store as any, {});

  const result = await persistence.loadDraft();

  expect(result).toEqual(payload);
  expect(store.saveFile).not.toHaveBeenCalled();
});

it('migrates legacy draft files when new filename missing', async () => {
  const legacyPayload = {
    savedAt: 'legacy',
    elements: [{ id: 'legacy', content: 'legacy content' }],
  };
  const store = {
    saveFile: vi.fn().mockResolvedValue(undefined),
    clearAll: vi.fn(),
    getSource: vi
      .fn()
      .mockImplementation(async (filename: string) => {
        if (filename === 'review-draft.json') {
          return null;
        }
        if (filename === 'document.qmd') {
          return {
            content: JSON.stringify(legacyPayload),
            commitMessage: 'legacy message',
          };
        }
        return null;
      }),
  };
  const persistence = new LocalDraftPersistence(store as any, {});

  const result = await persistence.loadDraft();

  expect(result).toEqual(legacyPayload);
  expect(store.saveFile).toHaveBeenCalledWith(
    'review-draft.json',
    JSON.stringify(legacyPayload),
    'legacy message'
  );
});

it('returns null when stored draft is malformed', async () => {
  const store = {
    saveFile: vi.fn(),
    clearAll: vi.fn(),
    getSource: vi
      .fn()
      .mockResolvedValue({ content: '{not valid json}' }),
  };
  const persistence = new LocalDraftPersistence(store as any, {});

  await expect(persistence.loadDraft()).resolves.toBeNull();
});

it('swallows errors from store.saveFile when persisting drafts', async () => {
  const store = {
    saveFile: vi.fn().mockRejectedValue(new Error('write failed')),
    clearAll: vi.fn(),
  };
  const persistence = new LocalDraftPersistence(store as any, {});

  await expect(
    persistence.saveDraft([{ id: 'a', content: 'b' }])
  ).resolves.toBeUndefined();

  expect(store.saveFile).toHaveBeenCalled();
});
});
