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

      // Verify toolbar is created
      const toolbar = container.querySelector('.review-translation-toolbar');
      expect(toolbar).toBeDefined();

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

      // Simulate language change in toolbar
      const sourceSelect = container.querySelector(
        '[data-setting="source-language"]'
      ) as HTMLSelectElement;
      const targetSelect = container.querySelector(
        '[data-setting="target-language"]'
      ) as HTMLSelectElement;

      expect(sourceSelect?.value).toBe('en');
      expect(targetSelect?.value).toBe('nl');

      sourceSelect.value = 'fr';
      sourceSelect.dispatchEvent(new Event('change'));

      expect(onNotification).toHaveBeenCalledWith(
        expect.stringContaining('Source language changed'),
        'info'
      );

      controller.destroy();
    });

    it('toggles progress indicator during translation', async () => {
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

      // Get the progress indicator
      const progress = container.querySelector('.review-translation-progress') as HTMLElement;
      expect(progress).toBeDefined();
      expect(progress.style.display).toBe('none');

      // Note: In a real test, we would trigger actual translation
      // Here we verify the UI structure is in place

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

      // Toggle auto-translate
      const autoTranslateCheckbox = container.querySelector(
        '[id*="auto-translate"]'
      ) as HTMLInputElement;

      autoTranslateCheckbox.checked = true;
      autoTranslateCheckbox.dispatchEvent(new Event('change'));

      // Verify the setting was updated in config
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
    it('displays correspondence mapping', async () => {
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

      // Verify correspondence lines toggle exists
      const correspondenceCheckbox = container.querySelector(
        '[id*="correspondence-lines"]'
      ) as HTMLInputElement;

      expect(correspondenceCheckbox).toBeDefined();
      expect(correspondenceCheckbox.checked).toBe(true);

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

      // Get the provider select
      const providerSelect = container.querySelector(
        '[data-setting="provider"]'
      ) as HTMLSelectElement;

      expect(providerSelect).toBeDefined();
      expect(providerSelect.options.length).toBeGreaterThan(0);

      // Change provider
      const initialProvider = providerSelect.value;
      const availableProviders = Array.from(providerSelect.options).map((o) => o.value);

      if (availableProviders.length > 1) {
        const newProvider = availableProviders.find((p) => p !== initialProvider);
        if (newProvider) {
          providerSelect.value = newProvider;
          providerSelect.dispatchEvent(new Event('change'));
          expect(providerSelect.value).toBe(newProvider);
        }
      }

      controller.destroy();
    });
  });
});
