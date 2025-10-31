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
});
