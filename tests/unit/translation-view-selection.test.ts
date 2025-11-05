import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TranslationView } from '@modules/ui/translation/TranslationView';
import type { TranslationDocument } from '@modules/translation/types';

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
    content: 'Doelzin.',
    language: 'nl',
    startOffset: 0,
    endOffset: 8,
    hash: 'hash-t1',
  };

  const pairs = [
    {
      id: 'pair-1',
      sourceId: 's1',
      targetId: 't1',
      sourceText: sourceSentence.content,
      targetText: targetSentence.content,
      sourceLanguage: 'en',
      targetLanguage: 'nl',
      method: 'manual',
      provider: 'manual',
      confidence: 1,
      alignmentScore: 1,
      timestamp: Date.now(),
      lastModified: Date.now(),
      status: 'manual',
      isManuallyEdited: true,
      metadata: {},
    },
  ];

  return {
    id: 'doc-1',
    sourceSentences: [sourceSentence],
    targetSentences: [targetSentence],
    correspondenceMap: {
      pairs,
      forwardMapping: new Map<string, string[]>([['s1', ['t1']]]),
      reverseMapping: new Map<string, string[]>([['t1', ['s1']]]),
      sourceLanguage: 'en',
      targetLanguage: 'nl',
    },
    metadata: {
      sourceLanguage: 'en',
      targetLanguage: 'nl',
      createdAt: Date.now(),
      lastModified: Date.now(),
      totalSentences: 1,
      translatedCount: 1,
      manualCount: 1,
      autoCount: 0,
    },
  };
};

describe('TranslationView selection persistence', () => {
  let host: HTMLElement;
  let view: TranslationView;
  let documentData: TranslationDocument;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    view = new TranslationView(
      { showCorrespondenceLines: false, highlightOnHover: false },
      {}
    );
    const element = view.create();
    host.appendChild(element);
    documentData = createDocument();
    view.loadDocument(documentData);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('restores selected sentence after re-render', () => {
    const initialTarget = host.querySelector(
      '[data-sentence-id="t1"][data-side="target"]'
    ) as HTMLElement | null;
    expect(initialTarget).toBeTruthy();
    initialTarget?.click();

    // simulate refresh cycle
    view.loadDocument(documentData);

    const reRenderedTarget = host.querySelector(
      '[data-sentence-id="t1"][data-side="target"]'
    ) as HTMLElement | null;
    expect(reRenderedTarget).toBeTruthy();
    expect(
      reRenderedTarget?.classList.contains(
        'review-translation-sentence-selected'
      )
    ).toBe(true);
  });

  it('focuses queued sentence after refresh', () => {
    view.queueFocusOnSentence('t1', 'target');
    view.refresh();

    const focusedElement = document.activeElement as HTMLElement | null;
    expect(focusedElement?.dataset.sentenceId).toBe('t1');
    expect(focusedElement?.dataset.side).toBe('target');
    expect(
      focusedElement?.classList.contains(
        'review-translation-sentence-selected'
      )
    ).toBe(true);
  });
});
