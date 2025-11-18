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
    onTargetSegmentEdit: vi.fn(),
    onSourceSegmentEdit: vi.fn(),
  };

  const editorModule = {
    getContent: vi.fn().mockReturnValue('Manual translation.'),
  };

const editorBridgeMock = {
  initializeSentenceEditor: vi.fn().mockResolvedValue(undefined),
  initializeSegmentEditor: vi.fn().mockResolvedValue(undefined),
  getModule: vi.fn().mockReturnValue(editorModule),
  saveSentenceEdit: vi.fn().mockReturnValue(true),
  saveSegmentEdit: vi.fn().mockReturnValue(true),
  cancelEdit: vi.fn(),
  destroy: vi.fn(),
  getCurrentSentenceId: vi.fn().mockReturnValue('t1'),
  getCurrentLanguage: vi.fn().mockReturnValue('target'),
};

  beforeEach(() => {
    document.body.innerHTML = '';
    callbacks.onTargetSentenceEdit.mockClear();
    callbacks.onSourceSentenceEdit.mockClear();
    callbacks.onTargetSegmentEdit.mockClear();
    callbacks.onSourceSegmentEdit.mockClear();
    (editorModule.getContent as vi.Mock).mockReturnValue('Manual translation.');
    editorBridgeMock.initializeSentenceEditor.mockClear();
    editorBridgeMock.initializeSegmentEditor.mockClear();
    editorBridgeMock.saveSentenceEdit.mockClear();
    editorBridgeMock.saveSegmentEdit.mockClear();
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
    // Find a target sentence to double-click (edit buttons were removed)
    const targetSection = host.querySelector(
      '[data-element-id="el1"][data-side="target"]'
    ) as HTMLElement | null;
    expect(targetSection).toBeTruthy();

    const sentenceElement = targetSection?.querySelector(
      '.review-translation-sentence'
    ) as HTMLElement | null;

    expect(sentenceElement).toBeTruthy();

    // Simulate double-click to trigger editing
    sentenceElement?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    // Wait for async editor initialization
    await new Promise((resolve) => setTimeout(resolve, 10));
    await Promise.resolve();
    await Promise.resolve();

    const editorContainer = host.querySelector(
      '.review-translation-segment-editor'
    ) as HTMLElement | null;
    expect(editorContainer).toBeTruthy();
    expect(
      editorContainer?.classList.contains('review-inline-editor-container')
    ).toBe(true);

    const actions = host.querySelector(
      '.review-inline-editor-actions'
    ) as HTMLElement | null;
    expect(actions).toBeTruthy();

    const saved = await view.saveActiveEditor();
    expect(saved).toBe(true);

    expect(editorBridgeMock.saveSegmentEdit).toHaveBeenCalledTimes(1);
    expect(callbacks.onTargetSegmentEdit).toHaveBeenCalledWith(
      'el1',
      'Manual translation.'
    );

    expect(
      host.querySelector('.review-translation-segment-editor')
    ).toBeNull();
    expect(editorBridgeMock.destroy).toHaveBeenCalledTimes(1);
  });
});
