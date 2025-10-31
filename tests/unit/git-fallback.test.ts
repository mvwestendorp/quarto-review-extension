import { describe, it, expect, beforeEach } from 'vitest';
import { EmbeddedSourceStore } from '@modules/git/fallback';

describe('EmbeddedSourceStore', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.localStorage.clear();
  });

  it('loads embedded sources from the DOM when present', async () => {
    const script = document.createElement('script');
    script.id = 'embedded-sources';
    script.type = 'application/json';
    script.textContent = JSON.stringify({
      timestamp: '2024-01-01T00:00:00.000Z',
      sources: {
        'document.qmd': {
          content: 'Hello world',
          originalContent: 'Hello world',
          lastModified: '2024-01-01T00:00:00.000Z',
          version: 'abc123',
        },
      },
    });
    document.body.appendChild(script);

    const store = new EmbeddedSourceStore();
    await store.ready;

    const source = await store.getSource('document.qmd');
    expect(source).toBeDefined();
    expect(source?.content).toBe('Hello world');
  });

  it('persists changes back to the embedded script and localStorage', async () => {
    const store = new EmbeddedSourceStore({ storageKey: 'test::embedded-sources' });
    await store.ready;

    await store.saveFile('document.qmd', 'Updated content', 'Test commit');

    const script = document.getElementById('embedded-sources');
    expect(script).not.toBeNull();
    const payload = JSON.parse(script!.textContent ?? '{}');
    expect(payload.sources['document.qmd'].content).toBe('Updated content');

    const raw = window.localStorage.getItem('test::embedded-sources');
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw ?? '{}');
    expect(stored.sources['document.qmd'].content).toBe('Updated content');
  });
});
