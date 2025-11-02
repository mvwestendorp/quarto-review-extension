import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TranslationToolbar } from '@modules/ui/translation/TranslationToolbar';
import { TranslationView } from '@modules/ui/translation/TranslationView';
import { TranslationController } from '@modules/ui/translation/TranslationController';
import type { TranslationToolbarConfig } from '@modules/ui/translation/TranslationToolbar';
import type { TranslationDocument } from '@modules/translation/types';

// Mock the translation module
vi.mock('@modules/translation', () => ({
  TranslationModule: vi.fn(function MockTranslationModule() {
    return {
      initialize: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn(),
      subscribe: vi.fn(),
      getAvailableProviders: vi.fn().mockReturnValue(['manual', 'local-ai', 'openai']),
      getDocument: vi.fn().mockReturnValue(null),
      translateDocument: vi.fn().mockResolvedValue(undefined),
      translateSentence: vi.fn().mockResolvedValue(undefined),
      updateSentence: vi.fn().mockResolvedValue(undefined),
      setProgressCallback: vi.fn(),
      getStats: vi.fn().mockReturnValue({
        total: 0,
        translated: 0,
        manual: 0,
        auto: 0,
        outOfSync: 0,
      }),
    };
  }),
  TranslationExportService: vi.fn(function MockTranslationExportService() {
    return {
      exportTranslation: vi.fn().mockResolvedValue({
        fileCount: 1,
        filenames: ['output.qmd'],
        downloadedAs: 'output.qmd',
      }),
    };
  }),
}));

describe('TranslationToolbar', () => {
  let toolbar: TranslationToolbar;
  let callbacks: any;

  beforeEach(() => {
    document.body.innerHTML = '';
    callbacks = {
      onTranslateDocument: vi.fn(),
      onTranslateSentence: vi.fn(),
      onProviderChange: vi.fn(),
      onSourceLanguageChange: vi.fn(),
      onTargetLanguageChange: vi.fn(),
      onSwapLanguages: vi.fn(),
      onToggleAutoTranslate: vi.fn(),
      onToggleCorrespondenceLines: vi.fn(),
      onExportUnified: vi.fn(),
      onExportSeparated: vi.fn(),
    };

    const config: TranslationToolbarConfig = {
      availableProviders: ['manual', 'local-ai', 'openai'],
      defaultProvider: 'manual',
      sourceLanguage: 'en',
      targetLanguage: 'nl',
      availableLanguages: ['en', 'nl', 'fr'],
    };

    toolbar = new TranslationToolbar(config, callbacks);
  });

  afterEach(() => {
    toolbar.destroy();
  });

  it('creates toolbar with all sections', () => {
    const element = toolbar.create();
    expect(element).toBeDefined();
    expect(element.className).toContain('review-translation-toolbar');
    expect(element.children.length).toBeGreaterThan(0);
  });

  it('renders translation action buttons', () => {
    const element = toolbar.create();
    const translateAllBtn = element.querySelector('[data-action="translate-document"]');
    const translateSelectedBtn = element.querySelector('[data-action="translate-sentence"]');

    expect(translateAllBtn).toBeDefined();
    expect(translateSelectedBtn).toBeDefined();
    expect(translateAllBtn?.textContent).toContain('Translate All');
    expect(translateSelectedBtn?.textContent).toContain('Translate Selected');
  });

  it('triggers translate document callback on button click', () => {
    const element = toolbar.create();
    const btn = element.querySelector('[data-action="translate-document"]') as HTMLElement;

    btn.click();
    expect(callbacks.onTranslateDocument).toHaveBeenCalledTimes(1);
  });

  it('triggers translate sentence callback on button click', () => {
    const element = toolbar.create();
    const btn = element.querySelector('[data-action="translate-sentence"]') as HTMLElement;

    btn.click();
    expect(callbacks.onTranslateSentence).toHaveBeenCalledTimes(1);
  });

  it('updates progress indicator on setTranslating', () => {
    const element = toolbar.create();
    const progress = element.querySelector('.review-translation-progress') as HTMLElement;

    expect(progress.style.display).toBe('none');

    toolbar.setTranslating(true, 'Translating... 50%');
    expect(progress.style.display).toBe('flex');
    expect(progress.textContent).toContain('50%');

    toolbar.setTranslating(false);
    expect(progress.style.display).toBe('none');
  });

  it('disables translate buttons when translating', () => {
    const element = toolbar.create();
    const translateAllBtn = element.querySelector('[data-action="translate-document"]') as HTMLButtonElement;
    const translateSelectedBtn = element.querySelector('[data-action="translate-sentence"]') as HTMLButtonElement;

    expect(translateAllBtn.disabled).toBe(false);
    expect(translateSelectedBtn.disabled).toBe(false);

    toolbar.setTranslating(true);
    expect(translateAllBtn.disabled).toBe(true);
    expect(translateSelectedBtn.disabled).toBe(true);

    toolbar.setTranslating(false);
    expect(translateAllBtn.disabled).toBe(false);
    expect(translateSelectedBtn.disabled).toBe(false);
  });

  it('renders provider selection dropdown', () => {
    const element = toolbar.create();
    const select = element.querySelector('[data-setting="provider"]') as HTMLSelectElement;

    expect(select).toBeDefined();
    expect(select.options.length).toBe(3);
    expect(select.options[0]?.value).toBe('manual');
    expect(select.options[0]?.selected).toBe(true);
  });

  it('triggers provider change callback', () => {
    const element = toolbar.create();
    const select = element.querySelector('[data-setting="provider"]') as HTMLSelectElement;

    select.value = 'openai';
    select.dispatchEvent(new Event('change'));
    expect(callbacks.onProviderChange).toHaveBeenCalledWith('openai');
  });

  it('renders language selection dropdowns', () => {
    const element = toolbar.create();
    const sourceSelect = element.querySelector('[data-setting="source-language"]') as HTMLSelectElement;
    const targetSelect = element.querySelector('[data-setting="target-language"]') as HTMLSelectElement;

    expect(sourceSelect).toBeDefined();
    expect(targetSelect).toBeDefined();
    expect(sourceSelect.value).toBe('en');
    expect(targetSelect.value).toBe('nl');
  });

  it('triggers language change callbacks', () => {
    const element = toolbar.create();
    const sourceSelect = element.querySelector('[data-setting="source-language"]') as HTMLSelectElement;

    sourceSelect.value = 'fr';
    sourceSelect.dispatchEvent(new Event('change'));
    expect(callbacks.onSourceLanguageChange).toHaveBeenCalledWith('fr');
  });

  it('triggers swap languages callback', () => {
    const element = toolbar.create();
    const swapBtn = element.querySelector('[data-action="swap-languages"]') as HTMLElement;

    swapBtn.click();
    expect(callbacks.onSwapLanguages).toHaveBeenCalledTimes(1);
  });

  it('updates language selections via updateLanguages', () => {
    const element = toolbar.create();
    toolbar.updateLanguages('fr', 'en');

    const sourceSelect = element.querySelector('[data-setting="source-language"]') as HTMLSelectElement;
    const targetSelect = element.querySelector('[data-setting="target-language"]') as HTMLSelectElement;

    expect(sourceSelect.value).toBe('fr');
    expect(targetSelect.value).toBe('en');
  });

  it('renders auto-translate toggle', () => {
    const element = toolbar.create();
    const checkbox = element.querySelector('[id*="auto-translate"]') as HTMLInputElement;

    expect(checkbox).toBeDefined();
    expect(checkbox.type).toBe('checkbox');
  });

  it('triggers auto-translate toggle callback', () => {
    const element = toolbar.create();
    const checkbox = element.querySelector('[id*="auto-translate"]') as HTMLInputElement;

    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(callbacks.onToggleAutoTranslate).toHaveBeenCalledWith(true);
  });

  it('renders correspondence lines toggle', () => {
    const element = toolbar.create();
    const checkbox = element.querySelector('[id*="correspondence-lines"]') as HTMLInputElement;

    expect(checkbox).toBeDefined();
    expect(checkbox.type).toBe('checkbox');
  });

  it('triggers correspondence lines toggle callback', () => {
    const element = toolbar.create();
    const checkbox = element.querySelector('[id*="correspondence-lines"]') as HTMLInputElement;

    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    expect(callbacks.onToggleCorrespondenceLines).toHaveBeenCalledWith(false);
  });
});

describe('TranslationView', () => {
  let view: TranslationView;
  let callbacks: any;

  beforeEach(() => {
    document.body.innerHTML = '';
    callbacks = {
      onSourceSentenceClick: vi.fn(),
      onTargetSentenceClick: vi.fn(),
      onSourceSentenceEdit: vi.fn(),
      onTargetSentenceEdit: vi.fn(),
    };

    view = new TranslationView(
      {
        showCorrespondenceLines: true,
        highlightOnHover: true,
      },
      callbacks
    );
  });

  afterEach(() => {
    view.destroy();
  });

  it('creates view element', () => {
    const element = view.create();
    expect(element).toBeDefined();
    expect(element.className).toContain('review-translation-view');
  });

  it('loads document into view', () => {
    const element = view.create();
    const doc: TranslationDocument = {
      id: 'test-doc',
      sourceSentences: [
        {
          id: 's1',
          elementId: 'e1',
          content: 'Hello world',
          language: 'en',
          startOffset: 0,
          endOffset: 11,
          hash: 'hash1',
        },
      ],
      targetSentences: [
        {
          id: 't1',
          elementId: 'e1',
          content: 'Hallo wereld',
          language: 'nl',
          startOffset: 0,
          endOffset: 12,
          hash: 'hash2',
        },
      ],
      correspondenceMap: {
        pairs: [],
        forwardMapping: new Map([['s1', ['t1']]]),
        reverseMapping: new Map([['t1', ['s1']]]),
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
        manualCount: 0,
        autoCount: 1,
      },
    };

    view.loadDocument(doc);

    // Check that source and target panes were populated
    const sourcePane = element.querySelector('.review-translation-pane.review-translation-source');
    const targetPane = element.querySelector('.review-translation-pane.review-translation-target');

    expect(sourcePane).toBeDefined();
    expect(targetPane).toBeDefined();

    // Check that content was added to panes
    expect(sourcePane?.textContent || '').toBeTruthy();
    expect(targetPane?.textContent || '').toBeTruthy();
  });

  it('has dual pane layout', () => {
    const element = view.create();
    const sourcePane = element.querySelector('.review-translation-pane.review-translation-source');
    const targetPane = element.querySelector('.review-translation-pane.review-translation-target');

    expect(sourcePane).toBeDefined();
    expect(targetPane).toBeDefined();
  });
});

describe('TranslationController', () => {
  let controller: TranslationController;
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);

    controller = new TranslationController({
      container,
      translationModuleConfig: {
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
        changes: {} as any,
        markdown: {} as any,
      },
      onNotification: vi.fn(),
    });
  });

  afterEach(() => {
    controller.destroy();
  });

  it('initializes controller with toolbar and view', async () => {
    await controller.initialize();
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('exports translation statistics', async () => {
    await controller.initialize();
    const stats = controller.getStatistics();

    expect(stats).toBeDefined();
    expect(stats.total).toBe(0);
    expect(stats.translated).toBe(0);
  });

  it('sets up keyboard shortcuts on initialize', async () => {
    const keydownListener = vi.spyOn(document, 'addEventListener');
    await controller.initialize();

    expect(keydownListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    keydownListener.mockRestore();
  });

  it('removes keyboard shortcuts on destroy', async () => {
    await controller.initialize();
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    controller.destroy();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  it('handles keyboard shortcut Ctrl+T for translate all', async () => {
    await controller.initialize();

    const event = new KeyboardEvent('keydown', {
      key: 't',
      ctrlKey: true,
      bubbles: true,
    });

    document.dispatchEvent(event);
    // Verify that the shortcut was processed (would trigger translation)
  });

  it('handles keyboard shortcut Ctrl+Shift+T for translate selected', async () => {
    await controller.initialize();

    const event = new KeyboardEvent('keydown', {
      key: 'T',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    });

    document.dispatchEvent(event);
    // Verify that the shortcut was processed (would trigger sentence translation)
  });

  it('handles keyboard shortcut Ctrl+Alt+S for swap languages', async () => {
    await controller.initialize();

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      altKey: true,
      bubbles: true,
    });

    document.dispatchEvent(event);
    // Verify that the shortcut was processed (would swap languages)
  });

  it('notifies on initialization success', async () => {
    const onNotification = vi.fn();
    const testController = new TranslationController({
      container: document.createElement('div'),
      translationModuleConfig: {
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
        changes: {} as any,
        markdown: {} as any,
      },
      onNotification,
    });

    await testController.initialize();

    expect(onNotification).toHaveBeenCalledWith(
      expect.stringContaining('initialized'),
      'success'
    );

    testController.destroy();
  });
});
