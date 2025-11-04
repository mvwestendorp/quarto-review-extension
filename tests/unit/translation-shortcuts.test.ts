import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TranslationController } from '@modules/ui/translation/TranslationController';
import type { TranslationModule } from '@modules/translation';
import type { TranslationModuleConfig } from '@modules/translation/types';
import type { TranslationView } from '@modules/ui/translation/TranslationView';

const createViewStub = (): TranslationView => {
  return {
    isEditorActive: vi.fn().mockReturnValue(false),
    saveActiveEditor: vi.fn().mockReturnValue(false),
    cancelActiveEditor: vi.fn(),
    setSentenceLoading: vi.fn(),
    setDocumentProgress: vi.fn(),
    queueFocusOnSentence: vi.fn(),
    refresh: vi.fn(),
    loadDocument: vi.fn(),
    destroy: vi.fn(),
    getElement: vi.fn(() => null),
  } as unknown as TranslationView;
};

const createController = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const translationModuleStub = {
    initialize: vi.fn(),
    preCreateTargetSentences: vi.fn(),
    getDocument: vi.fn(() => null),
    subscribe: vi.fn(() => () => {}),
    setProgressCallback: vi.fn(),
    translateDocument: vi.fn(),
    translateSentence: vi.fn(),
    hasSourceChanged: vi.fn(() => false),
    mergeToElements: vi.fn(() => new Map()),
    applyMergeToChanges: vi.fn(() => false),
    updateSentence: vi.fn(),
    saveToStorageNow: vi.fn(),
    clearProviderCache: vi.fn(),
    destroy: vi.fn(),
  } as unknown as TranslationModule;

  const config: TranslationModuleConfig = {
    config: {
      enabled: true,
      sourceLanguage: 'en',
      targetLanguage: 'nl',
      defaultProvider: 'manual',
      autoTranslateOnEdit: false,
      autoTranslateOnLoad: false,
      showCorrespondenceLines: true,
      highlightOnHover: true,
      providers: {},
    },
    changes: {
      subscribe: vi.fn(() => () => {}),
      initializeSentences: vi.fn(),
      editSentence: vi.fn(),
      getSentence: vi.fn(),
      undo: vi.fn(() => false),
      redo: vi.fn(() => false),
    } as any,
    markdown: {} as any,
  };

  const controller = new TranslationController({
    container,
    translationModuleConfig: config,
    translationModuleInstance: translationModuleStub,
    onNotification: vi.fn(),
    onProgressUpdate: vi.fn(),
    onBusyChange: vi.fn(),
  });

  return { controller, container };
};

describe('TranslationController keyboard shortcuts', () => {
  let controller: TranslationController;
  let container: HTMLElement;
  let viewStub: TranslationView;

  beforeEach(() => {
    document.body.innerHTML = '';
    const setup = createController();
    controller = setup.controller;
    container = setup.container;
    viewStub = createViewStub();
    (controller as any).view = viewStub;
    (controller as any).setupKeyboardShortcuts();
  });

  afterEach(() => {
    controller.destroy();
    container.remove();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('saves active editor on Ctrl/Cmd+S', () => {
    (viewStub.isEditorActive as unknown as vi.Mock).mockReturnValue(true);
    (viewStub.saveActiveEditor as unknown as vi.Mock).mockReturnValue(true);

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect((viewStub.saveActiveEditor as unknown as vi.Mock).mock.calls.length).toBe(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not intercept Ctrl/Cmd+S when editor inactive', () => {
    (viewStub.isEditorActive as unknown as vi.Mock).mockReturnValue(false);
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    expect((viewStub.saveActiveEditor as unknown as vi.Mock).mock.calls.length).toBe(0);
    expect(event.defaultPrevented).toBe(false);
  });

  it('routes Ctrl/Cmd+Z to translation undo when editor inactive', () => {
    (viewStub.isEditorActive as unknown as vi.Mock).mockReturnValue(false);
    const undoSpy = vi.spyOn(controller, 'undo').mockReturnValue(true);

    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(undoSpy).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('keeps Ctrl/Cmd+Z inside editor when active', () => {
    (viewStub.isEditorActive as unknown as vi.Mock).mockReturnValue(true);
    const undoSpy = vi.spyOn(controller, 'undo').mockReturnValue(true);

    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(undoSpy).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('routes Ctrl/Cmd+Shift+Z to translation redo', () => {
    (viewStub.isEditorActive as unknown as vi.Mock).mockReturnValue(false);
    const redoSpy = vi.spyOn(controller, 'redo').mockReturnValue(true);

    const event = new KeyboardEvent('keydown', {
      key: 'Z',
      ctrlKey: true,
      shiftKey: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(redoSpy).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('routes Ctrl/Cmd+Y to translation redo', () => {
    (viewStub.isEditorActive as unknown as vi.Mock).mockReturnValue(false);
    const redoSpy = vi.spyOn(controller, 'redo').mockReturnValue(true);

    const event = new KeyboardEvent('keydown', {
      key: 'y',
      ctrlKey: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(redoSpy).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });
});
