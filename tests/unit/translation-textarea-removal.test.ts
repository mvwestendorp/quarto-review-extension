import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TranslationView } from '@modules/ui/translation/TranslationView';
import type {
  TranslationDocument,
  Sentence,
  TranslationPair,
} from '@modules/translation/types';
import type { TranslationEditorBridge } from '@modules/ui/translation/TranslationEditorBridge';

const createSentence = (
  id: string,
  elementId: string,
  content: string,
  language: Sentence['language']
): Sentence => ({
  id,
  elementId,
  content,
  language,
  startOffset: 0,
  endOffset: content.length,
  hash: `hash-${id}`,
});

const createTranslationDocument = (): TranslationDocument => {
  const sourceSentence = createSentence('source-1', 'element-1', 'Hello world', 'en');
  const targetSentence = createSentence('target-1', 'element-1', 'Hallo wereld', 'nl');

  const pair: TranslationPair = {
    id: 'pair-1',
    sourceId: sourceSentence.id,
    targetId: targetSentence.id,
    sourceText: sourceSentence.content,
    targetText: targetSentence.content,
    sourceLanguage: sourceSentence.language,
    targetLanguage: targetSentence.language,
    method: 'manual',
    status: 'manual',
    timestamp: Date.now(),
    lastModified: Date.now(),
    isManuallyEdited: true,
  };

  return {
    id: 'doc-1',
    sourceSentences: [sourceSentence],
    targetSentences: [targetSentence],
    correspondenceMap: {
      pairs: [pair],
      forwardMapping: new Map([[sourceSentence.id, [targetSentence.id]]]),
      reverseMapping: new Map([[targetSentence.id, [sourceSentence.id]]]),
      sourceLanguage: sourceSentence.language,
      targetLanguage: targetSentence.language,
    },
    metadata: {
      sourceLanguage: sourceSentence.language,
      targetLanguage: targetSentence.language,
      createdAt: Date.now(),
      lastModified: Date.now(),
      totalSentences: 1,
      translatedCount: 1,
      manualCount: 1,
      autoCount: 0,
    },
  };
};

const createMarkdownModule = () =>
  ({
    renderElement: vi.fn((_value: string) => '<p>content</p>'),
  }) as unknown as { renderElement: (content: string, type: string) => string };

const createEditorBridge = (
  overrides: Partial<TranslationEditorBridge> = {}
): TranslationEditorBridge => {
  const base = {
    initializeSentenceEditor: vi.fn().mockResolvedValue(undefined),
    initializeSegmentEditor: vi.fn().mockResolvedValue(undefined),
    saveSentenceEdit: vi.fn().mockReturnValue(true),
    saveSegmentEdit: vi.fn().mockReturnValue(true),
    cancelEdit: vi.fn(),
    destroy: vi.fn(),
    getModule: vi.fn().mockReturnValue({
      getContent: vi.fn().mockReturnValue('Hallo wereld'),
    }),
  };

  return { ...base, ...overrides } as unknown as TranslationEditorBridge;
};

describe('TranslationView editor integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('uses the translation editor bridge without falling back to a textarea', async () => {
    const initializeSegmentEditor = vi.fn().mockResolvedValue(undefined);
    const editorBridge = createEditorBridge({ initializeSegmentEditor });
    const markdown = createMarkdownModule();

    const view = new TranslationView(
      { showCorrespondenceLines: false, highlightOnHover: false },
      {},
      markdown,
      editorBridge
    );

    const container = view.create();
    document.body.appendChild(container);

    view.loadDocument(createTranslationDocument());

    // Find and double-click a sentence to trigger editing (edit buttons were removed)
    const sentenceElement = container.querySelector(
      '.review-translation-sentence'
    ) as HTMLElement;
    expect(sentenceElement).toBeTruthy();

    // Simulate double-click
    sentenceElement.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    // Allow async editor initialization to complete
    await Promise.resolve();
    await Promise.resolve();

    expect(initializeSegmentEditor).toHaveBeenCalledTimes(1);
    expect(container.querySelector('textarea')).toBeNull();
    expect(
      container.querySelector('.review-translation-segment-editor')
    ).not.toBeNull();
  });

  it('displays an inline error when the editor fails to initialize', async () => {
    const failingEditorBridge = createEditorBridge({
      initializeSegmentEditor: vi
        .fn()
        .mockRejectedValue(new Error('Mock failure')),
    });
    const markdown = createMarkdownModule();

    const view = new TranslationView(
      { showCorrespondenceLines: false, highlightOnHover: false },
      {},
      markdown,
      failingEditorBridge
    );

    const container = view.create();
    document.body.appendChild(container);

    view.loadDocument(createTranslationDocument());

    // Find and double-click a sentence to trigger editing (edit buttons were removed)
    const sentenceElement = container.querySelector(
      '.review-translation-sentence'
    ) as HTMLElement;
    expect(sentenceElement).toBeTruthy();

    // Simulate double-click
    sentenceElement.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    await Promise.resolve();
    await Promise.resolve();

    expect(
      container.querySelector('.review-translation-editor-error')
    ).not.toBeNull();
    expect(container.querySelector('textarea')).toBeNull();
  });
});
