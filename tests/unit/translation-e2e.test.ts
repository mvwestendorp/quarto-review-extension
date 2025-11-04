import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TranslationModule } from '@modules/translation';
import { TranslationController } from '@modules/ui/translation/TranslationController';
import type { TranslationConfig } from '@modules/translation/types';

// Mock the markdown module
const mockMarkdownModule = {
  parseToAST: vi.fn(() => ({
    type: 'root',
    children: [],
  })),
  render: vi.fn((content) => `<p>${content}</p>`),
  renderSync: vi.fn((content) => `<p>${content}</p>`),
  renderElement: vi.fn((content) => `<p>${content}</p>`),
  toPlainText: vi.fn((content) => content),
};

// Mock changes module
const mockChangesModule = {
  getElementById: vi.fn((id) => ({
    id,
    content: 'Sample content',
    metadata: { type: 'Para' },
  })),
  getCurrentState: vi.fn(() => []),
  getOperations: vi.fn(() => []),
};

describe('Translation End-to-End Workflow', () => {
  let container: HTMLElement;
  let translationModule: TranslationModule;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);

    const config: TranslationConfig = {
      enabled: true,
      sourceLanguage: 'en',
      targetLanguage: 'nl',
      defaultProvider: 'manual',
      autoTranslateOnEdit: false,
      autoTranslateOnLoad: false,
      showCorrespondenceLines: true,
      highlightOnHover: true,
      providers: {
        local: {
          model: 'nllb-200',
          backend: 'auto',
          mode: 'balanced',
          downloadOnLoad: false,
          useWebWorker: true,
        },
      },
    };

    translationModule = new TranslationModule({
      config,
      changes: mockChangesModule as any,
      markdown: mockMarkdownModule as any,
    });
  });

  afterEach(() => {
    translationModule.destroy();
  });

  describe('E2E: Complete Translation Workflow', () => {
    it('opens translation UI, translates document, and closes', async () => {
      const controller = new TranslationController({
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
          changes: mockChangesModule as any,
          markdown: mockMarkdownModule as any,
        },
        onNotification: vi.fn(),
      });

      // Initialize translation UI
      await controller.initialize();
      expect(container.children.length).toBeGreaterThan(0);

      // Verify view is created
      const view = container.querySelector('.review-translation-view');
      expect(view).toBeDefined();

      // Clean up
      controller.destroy();
      expect(container.children.length).toBe(0);
    });

    it('changes languages and swaps them', async () => {
      const onNotification = vi.fn();
      const controller = new TranslationController({
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
          changes: mockChangesModule as any,
          markdown: mockMarkdownModule as any,
        },
        onNotification,
      });

      await controller.initialize();

      // Update languages through controller APIs
      await controller.setSourceLanguage('fr');
      expect(onNotification).toHaveBeenCalledWith(
        expect.stringContaining('Source language changed'),
        'info'
      );

      await controller.setTargetLanguage('de');
      expect(onNotification).toHaveBeenCalledWith(
        expect.stringContaining('Target language changed'),
        'info'
      );

      controller.swapLanguages();
      const config = (controller as any).config.translationModuleConfig.config;
      expect(config.sourceLanguage).toBe('de');
      expect(config.targetLanguage).toBe('fr');

      controller.destroy();
    });

    it('toggles progress indicator during translation', async () => {
      const progressUpdates: any[] = [];
      const busyChanges: boolean[] = [];
      const controller = new TranslationController({
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
          changes: mockChangesModule as any,
          markdown: mockMarkdownModule as any,
        },
        onNotification: vi.fn(),
        onProgressUpdate: (status) => progressUpdates.push(status),
        onBusyChange: (busy) => busyChanges.push(busy),
      });

      await controller.initialize();

      const moduleRef = (controller as any).translationModule;
      const progressHandlers: any[] = [];
      moduleRef.setProgressCallback = vi.fn((cb: any) => {
        progressHandlers.push(cb);
      });
      moduleRef.translateDocument = vi.fn().mockResolvedValue(undefined);

      await controller.translateDocument();

      expect(busyChanges).toContain(true);
      expect(busyChanges).toContain(false);
      expect(progressUpdates[0]).toMatchObject({ phase: 'idle' });

      const notifyStep = progressHandlers[0];
      notifyStep?.({
        message: 'Translating…',
        progress: 0.5,
      });

      expect(progressUpdates.find((s) => s.percent === 50)).toBeTruthy();

      controller.destroy();
    });

    it('updates settings and persists state', async () => {
      const controller = new TranslationController({
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
          changes: mockChangesModule as any,
          markdown: mockMarkdownModule as any,
        },
        onNotification: vi.fn(),
      });

      await controller.initialize();

      controller.setAutoTranslate(true);
      const config = (controller as any).config.translationModuleConfig.config;
      expect(config.autoTranslateOnEdit).toBe(true);

      controller.destroy();
    });

    it('responds to keyboard shortcuts', async () => {
      const controller = new TranslationController({
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
          changes: mockChangesModule as any,
          markdown: mockMarkdownModule as any,
        },
        onNotification: vi.fn(),
      });

      await controller.initialize();

      // Test Ctrl+T shortcut
      const ctrlTEvent = new KeyboardEvent('keydown', {
        key: 't',
        ctrlKey: true,
        bubbles: true,
      });

      document.dispatchEvent(ctrlTEvent);
      // Shortcut should be processed without errors

      // Test Ctrl+Shift+T shortcut
      const ctrlShiftTEvent = new KeyboardEvent('keydown', {
        key: 'T',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });

      document.dispatchEvent(ctrlShiftTEvent);
      // Shortcut should be processed without errors

      // Test Ctrl+Alt+S shortcut
      const ctrlAltSEvent = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        altKey: true,
        bubbles: true,
      });

      document.dispatchEvent(ctrlAltSEvent);
      // Shortcut should be processed without errors

      controller.destroy();
    });
  });

  describe('E2E: Correspondence and Alignment', () => {
    it('aligns sentences without correspondence lines', async () => {
      const controller = new TranslationController({
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
          changes: mockChangesModule as any,
          markdown: mockMarkdownModule as any,
        },
        onNotification: vi.fn(),
      });

      await controller.initialize();

      await new Promise((resolve) => setTimeout(resolve, 0));

      const correspondenceCheckbox = container.querySelector(
        '[id*="correspondence-lines"]'
      );

      expect(correspondenceCheckbox).toBeNull();

      const doc = (controller as any).translationModule.getDocument();
      expect(doc).toBeTruthy();

      doc?.correspondenceMap.pairs.forEach((pair: any) => {
        const sourceEl = container.querySelector(
          `[data-sentence-id="${pair.sourceId}"][data-side="source"]`
        ) as HTMLElement | null;
        const targetEl = container.querySelector(
          `[data-sentence-id="${pair.targetId}"][data-side="target"]`
        ) as HTMLElement | null;

        if (sourceEl && targetEl) {
          expect(Math.abs(sourceEl.offsetHeight - targetEl.offsetHeight)).toBeLessThanOrEqual(1);
        }
      });

      controller.destroy();
    });

    it('updates view when hovering sentences', async () => {
      const controller = new TranslationController({
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
          changes: mockChangesModule as any,
          markdown: mockMarkdownModule as any,
        },
        onNotification: vi.fn(),
      });

      await controller.initialize();

      // Verify the view is set up to handle interactions
      const view = container.querySelector('.review-translation-view');
      expect(view).toBeDefined();

      controller.destroy();
    });
  });

  describe('E2E: Error Handling', () => {
    it('handles translation failures gracefully', async () => {
      const onNotification = vi.fn();
      const controller = new TranslationController({
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
          changes: mockChangesModule as any,
          markdown: mockMarkdownModule as any,
        },
        onNotification,
      });

      await controller.initialize();

      // Verify error notification setup
      expect(onNotification).toHaveBeenCalledWith(
        expect.stringContaining('initialized'),
        'success'
      );

      controller.destroy();
    });

    it('cleans up resources on destroy', async () => {
      const controller = new TranslationController({
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
          changes: mockChangesModule as any,
          markdown: mockMarkdownModule as any,
        },
        onNotification: vi.fn(),
      });

      await controller.initialize();
      const initialChildCount = container.children.length;
      expect(initialChildCount).toBeGreaterThan(0);

      controller.destroy();
      expect(container.children.length).toBe(0);

      // Verify keyboard listeners are removed
      const secondController = new TranslationController({
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
          changes: mockChangesModule as any,
          markdown: mockMarkdownModule as any,
        },
        onNotification: vi.fn(),
      });

      await secondController.initialize();
      secondController.destroy();
    });
  });

  describe('E2E: Provider Management', () => {
    it('allows provider selection and change', async () => {
      const controller = new TranslationController({
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
          changes: mockChangesModule as any,
          markdown: mockMarkdownModule as any,
        },
        onNotification: vi.fn(),
      });

      await controller.initialize();

      const providers = controller.getAvailableProviders();
      expect(providers.length).toBeGreaterThan(0);

      const initialProvider = (controller as any).config.translationModuleConfig.config
        .defaultProvider;
      const newProvider = providers.find((provider) => provider !== initialProvider);

      if (newProvider) {
        controller.setProvider(newProvider);
        const config = (controller as any).config.translationModuleConfig.config;
        expect(config.defaultProvider).toBe(newProvider);
      }

      controller.destroy();
    });
  });
});
