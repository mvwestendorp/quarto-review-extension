import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TranslationView } from '@modules/ui/translation/TranslationView';
import type { TranslationDocument } from '@modules/translation/types';
import type { TranslationEditorBridge } from '@modules/ui/translation/TranslationEditorBridge';

const createDocument = (): TranslationDocument => {
  const sourceSentence = {
    id: 's1',
    elementId: 'el1',
    content: 'Source sentence.',
    language: 'en',
    startOffset: 0,
    endOffset: 16,
    hash: 'hash-s1',
  };
  const targetSentence = {
    id: 't1',
    elementId: 'el1',
    content: '',
    language: 'nl',
    startOffset: 0,
    endOffset: 0,
    hash: 'hash-t1',
  };

  const pairs = [
    {
      id: 'pair-1',
      sourceId: sourceSentence.id,
      targetId: targetSentence.id,
      sourceText: sourceSentence.content,
      targetText: targetSentence.content,
      sourceLanguage: sourceSentence.language,
      targetLanguage: targetSentence.language,
      method: 'manual',
      provider: 'manual',
      confidence: 1,
      alignmentScore: 1,
      timestamp: Date.now(),
      lastModified: Date.now(),
      status: 'untranslated',
      isManuallyEdited: false,
      metadata: {},
    },
  ];

  return {
    id: 'doc-1',
    sourceSentences: [sourceSentence],
    targetSentences: [targetSentence],
    correspondenceMap: {
      pairs,
      forwardMapping: new Map<string, string[]>([[sourceSentence.id, [targetSentence.id]]]),
      reverseMapping: new Map<string, string[]>([[targetSentence.id, [sourceSentence.id]]]),
      sourceLanguage: sourceSentence.language,
      targetLanguage: targetSentence.language,
    },
    metadata: {
      sourceLanguage: sourceSentence.language,
      targetLanguage: targetSentence.language,
      createdAt: Date.now(),
      lastModified: Date.now(),
      totalSentences: 1,
      translatedCount: 0,
      manualCount: 0,
      autoCount: 0,
    },
  };
};

describe('TranslationView inline editing', () => {
  let host: HTMLElement;
  let view: TranslationView;
  let documentData: TranslationDocument;

  const callbacks = {
    onTargetSentenceEdit: vi.fn(),
    onSourceSentenceEdit: vi.fn(),
  };

  const editorModule = {
    getContent: vi.fn().mockReturnValue('Manual translation.'),
  };

const editorBridgeMock = {
  initializeSentenceEditor: vi.fn().mockResolvedValue(undefined),
  getModule: vi.fn().mockReturnValue(editorModule),
  saveSentenceEdit: vi.fn().mockReturnValue(true),
  cancelEdit: vi.fn(),
  destroy: vi.fn(),
  getCurrentSentenceId: vi.fn().mockReturnValue('t1'),
  getCurrentLanguage: vi.fn().mockReturnValue('target'),
};

  beforeEach(() => {
    document.body.innerHTML = '';
    callbacks.onTargetSentenceEdit.mockClear();
    callbacks.onSourceSentenceEdit.mockClear();
    (editorModule.getContent as vi.Mock).mockReturnValue('Manual translation.');
    editorBridgeMock.initializeSentenceEditor.mockClear();
    editorBridgeMock.saveSentenceEdit.mockClear();
    editorBridgeMock.destroy.mockClear();

    host = document.createElement('div');
    document.body.appendChild(host);

    view = new TranslationView(
      { showCorrespondenceLines: false, highlightOnHover: false },
      callbacks,
      undefined,
      editorBridgeMock as unknown as TranslationEditorBridge
    );
    const element = view.create();
    host.appendChild(element);

    documentData = createDocument();
    view.loadDocument(documentData);
  });

  afterEach(() => {
    view.destroy();
    document.body.innerHTML = '';
  });

  it('opens Milkdown editor with review inline classes and saves target edits', async () => {
    const targetSentence = host.querySelector(
      '[data-sentence-id="t1"][data-side="target"]'
    ) as HTMLElement | null;

    expect(targetSentence).toBeTruthy();

    targetSentence?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const editorContainer = targetSentence?.querySelector(
      '.review-translation-milkdown-editor'
    ) as HTMLElement | null;
    expect(editorContainer).toBeTruthy();
    expect(
      editorContainer?.classList.contains('review-inline-editor-container')
    ).toBe(true);

    const actions = targetSentence?.querySelector(
      '.review-inline-editor-actions'
    ) as HTMLElement | null;
    expect(actions).toBeTruthy();

    const saved = view.saveActiveEditor();
    expect(saved).toBe(true);

    expect(editorBridgeMock.saveSentenceEdit).toHaveBeenCalledTimes(1);
    expect(callbacks.onTargetSentenceEdit).toHaveBeenCalledWith(
      't1',
      'Manual translation.'
    );
    expect(documentData.targetSentences[0].content).toBe('Manual translation.');

    const renderedContent = targetSentence?.querySelector(
      '.review-translation-sentence-content'
    ) as HTMLElement | null;
    expect(renderedContent?.textContent?.trim()).toBe('Manual translation.');

    expect(
      targetSentence?.querySelector('.review-translation-milkdown-editor')
    ).toBeNull();
    expect(editorBridgeMock.destroy).toHaveBeenCalledTimes(1);
  });
});
