/**
 * TranslationToolbar Component
 * Controls for translation operations (translate, provider selection, settings)
 */

import { createModuleLogger } from '@utils/debug';
import type { Language } from '@modules/translation/types';

const logger = createModuleLogger('TranslationToolbar');

export interface TranslationToolbarConfig {
  availableProviders: string[];
  defaultProvider: string;
  sourceLanguage: Language;
  targetLanguage: Language;
  availableLanguages: Language[];
}

export interface TranslationToolbarCallbacks {
  onTranslateDocument?: () => void;
  onTranslateSentence?: () => void;
  onProviderChange?: (provider: string) => void;
  onSourceLanguageChange?: (language: Language) => void;
  onTargetLanguageChange?: (language: Language) => void;
  onSwapLanguages?: () => void;
  onToggleAutoTranslate?: (enabled: boolean) => void;
  onToggleCorrespondenceLines?: (enabled: boolean) => void;
}

export class TranslationToolbar {
  private element: HTMLElement | null = null;
  private config: TranslationToolbarConfig;
  private callbacks: TranslationToolbarCallbacks;

  // State
  private currentProvider: string;
  private isTranslating: boolean = false;
  private autoTranslateEnabled: boolean = false;
  private correspondenceLinesEnabled: boolean = true;

  constructor(
    config: TranslationToolbarConfig,
    callbacks: TranslationToolbarCallbacks
  ) {
    this.config = config;
    this.callbacks = callbacks;
    this.currentProvider = config.defaultProvider;
  }

  /**
   * Create and initialize the toolbar
   */
  create(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'review-translation-toolbar';

    // Translation actions section
    const actions = this.createActionsSection();
    toolbar.appendChild(actions);

    // Provider selection section
    const providers = this.createProviderSection();
    toolbar.appendChild(providers);

    // Language selection section
    const languages = this.createLanguageSection();
    toolbar.appendChild(languages);

    // Settings section
    const settings = this.createSettingsSection();
    toolbar.appendChild(settings);

    this.element = toolbar;
    return toolbar;
  }

  /**
   * Create translation actions section
   */
  private createActionsSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'review-translation-toolbar-section';

    const label = document.createElement('span');
    label.className = 'review-translation-toolbar-label';
    label.textContent = 'Actions:';
    section.appendChild(label);

    // Translate document button
    const translateDocBtn = document.createElement('button');
    translateDocBtn.className = 'review-btn review-btn-primary';
    translateDocBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M7 0h2v2H7V0zm0 14h2v2H7v-2zM0 7h2v2H0V7zm14 0h2v2h-2V7zM3.05 2.636l1.414 1.414L3.05 5.464 1.636 4.05 3.05 2.636zm9.9 9.9l1.414 1.414-1.414 1.414-1.414-1.414 1.414-1.414zM2.636 12.95l1.414-1.414L5.464 12.95 4.05 14.364 2.636 12.95zM12.95 3.05l1.414 1.414-1.414 1.414-1.414-1.414L12.95 3.05z"/>
      </svg>
      <span>Translate All</span>
    `;
    translateDocBtn.dataset.action = 'translate-document';
    section.appendChild(translateDocBtn);

    // Translate selected button
    const translateSentenceBtn = document.createElement('button');
    translateSentenceBtn.className = 'review-btn review-btn-secondary';
    translateSentenceBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0a1 1 0 011 1v6h6a1 1 0 110 2H9v6a1 1 0 11-2 0V9H1a1 1 0 010-2h6V1a1 1 0 011-1z"/>
      </svg>
      <span>Translate Selected</span>
    `;
    translateSentenceBtn.dataset.action = 'translate-sentence';
    section.appendChild(translateSentenceBtn);

    // Progress indicator
    const progress = document.createElement('div');
    progress.className = 'review-translation-progress';
    progress.style.display = 'none';
    progress.innerHTML = `
      <div class="review-translation-progress-spinner"></div>
      <span class="review-translation-progress-text">Translating...</span>
    `;
    section.appendChild(progress);

    // Bind events
    translateDocBtn.addEventListener('click', () => {
      this.callbacks.onTranslateDocument?.();
    });

    translateSentenceBtn.addEventListener('click', () => {
      this.callbacks.onTranslateSentence?.();
    });

    return section;
  }

  /**
   * Create provider selection section
   */
  private createProviderSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'review-translation-toolbar-section';

    const label = document.createElement('span');
    label.className = 'review-translation-toolbar-label';
    label.textContent = 'Provider:';
    section.appendChild(label);

    const select = document.createElement('select');
    select.className = 'review-translation-provider-select';
    select.dataset.setting = 'provider';

    this.config.availableProviders.forEach((provider) => {
      const option = document.createElement('option');
      option.value = provider;
      option.textContent = this.getProviderLabel(provider);
      if (provider === this.currentProvider) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener('change', () => {
      this.currentProvider = select.value;
      this.callbacks.onProviderChange?.(select.value);
      logger.info('Provider changed', { provider: select.value });
    });

    section.appendChild(select);
    return section;
  }

  /**
   * Get human-readable provider label
   */
  private getProviderLabel(provider: string): string {
    const labels: Record<string, string> = {
      manual: 'Manual',
      'local-ai': 'Local AI (WebGPU)',
      openai: 'OpenAI',
      google: 'Google Translate',
      deepl: 'DeepL',
    };
    return (
      labels[provider] || provider.charAt(0).toUpperCase() + provider.slice(1)
    );
  }

  /**
   * Create language selection section
   */
  private createLanguageSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'review-translation-toolbar-section';

    const label = document.createElement('span');
    label.className = 'review-translation-toolbar-label';
    label.textContent = 'Languages:';
    section.appendChild(label);

    // Source language select
    const sourceSelect = document.createElement('select');
    sourceSelect.className = 'review-translation-lang-select';
    sourceSelect.dataset.setting = 'source-language';

    this.config.availableLanguages.forEach((lang) => {
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = this.getLanguageLabel(lang);
      if (lang === this.config.sourceLanguage) {
        option.selected = true;
      }
      sourceSelect.appendChild(option);
    });

    sourceSelect.addEventListener('change', () => {
      this.callbacks.onSourceLanguageChange?.(sourceSelect.value as Language);
      logger.info('Source language changed', { language: sourceSelect.value });
    });

    section.appendChild(sourceSelect);

    // Swap languages button
    const swapBtn = document.createElement('button');
    swapBtn.className = 'review-btn review-btn-icon';
    swapBtn.title = 'Swap languages';
    swapBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M11.5 3.5a.5.5 0 01.5.5v2a.5.5 0 01-.5.5H10a.5.5 0 010-1h.293l-1.647-1.646a.5.5 0 01.708-.708L11 4.793V4.5a.5.5 0 01.5-.5zm-7 6a.5.5 0 00-.5.5v.707l-1.646-1.647a.5.5 0 00-.708.708L3.293 11H3a.5.5 0 000 1h1.5a.5.5 0 00.5-.5v-2a.5.5 0 00-.5-.5z"/>
      </svg>
    `;
    swapBtn.dataset.action = 'swap-languages';

    swapBtn.addEventListener('click', () => {
      this.callbacks.onSwapLanguages?.();
      logger.info('Swapping languages');
    });

    section.appendChild(swapBtn);

    // Target language select
    const targetSelect = document.createElement('select');
    targetSelect.className = 'review-translation-lang-select';
    targetSelect.dataset.setting = 'target-language';

    this.config.availableLanguages.forEach((lang) => {
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = this.getLanguageLabel(lang);
      if (lang === this.config.targetLanguage) {
        option.selected = true;
      }
      targetSelect.appendChild(option);
    });

    targetSelect.addEventListener('change', () => {
      this.callbacks.onTargetLanguageChange?.(targetSelect.value as Language);
      logger.info('Target language changed', { language: targetSelect.value });
    });

    section.appendChild(targetSelect);

    return section;
  }

  /**
   * Get human-readable language label
   */
  private getLanguageLabel(language: Language): string {
    const labels: Record<Language, string> = {
      en: 'English',
      nl: 'Nederlands',
      fr: 'Français',
    };
    return labels[language];
  }

  /**
   * Create settings section
   */
  private createSettingsSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'review-translation-toolbar-section';

    const label = document.createElement('span');
    label.className = 'review-translation-toolbar-label';
    label.textContent = 'Settings:';
    section.appendChild(label);

    // Auto-translate toggle
    const autoTranslateCheckbox = this.createCheckbox(
      'auto-translate',
      'Auto-translate on edit',
      this.autoTranslateEnabled,
      (checked) => {
        this.autoTranslateEnabled = checked;
        this.callbacks.onToggleAutoTranslate?.(checked);
        logger.info('Auto-translate toggled', { enabled: checked });
      }
    );
    section.appendChild(autoTranslateCheckbox);

    // Correspondence lines toggle
    const correspondenceCheckbox = this.createCheckbox(
      'correspondence-lines',
      'Show correspondence lines',
      this.correspondenceLinesEnabled,
      (checked) => {
        this.correspondenceLinesEnabled = checked;
        this.callbacks.onToggleCorrespondenceLines?.(checked);
        logger.info('Correspondence lines toggled', { enabled: checked });
      }
    );
    section.appendChild(correspondenceCheckbox);

    return section;
  }

  /**
   * Create a checkbox with label
   */
  private createCheckbox(
    id: string,
    labelText: string,
    checked: boolean,
    onChange: (checked: boolean) => void
  ): HTMLElement {
    const container = document.createElement('label');
    container.className = 'review-checkbox-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `review-translation-${id}`;
    checkbox.checked = checked;
    checkbox.addEventListener('change', () => {
      onChange(checkbox.checked);
    });

    const label = document.createElement('span');
    label.textContent = labelText;

    container.appendChild(checkbox);
    container.appendChild(label);

    return container;
  }

  /**
   * Update provider options
   */
  updateProviders(providers: string[]): void {
    if (!this.element) return;

    const select = this.element.querySelector(
      '[data-setting="provider"]'
    ) as HTMLSelectElement;
    if (!select) return;

    select.innerHTML = '';
    providers.forEach((provider) => {
      const option = document.createElement('option');
      option.value = provider;
      option.textContent = this.getProviderLabel(provider);
      if (provider === this.currentProvider) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    this.config.availableProviders = providers;
  }

  /**
   * Set translation progress state
   */
  setTranslating(translating: boolean, progressText?: string): void {
    this.isTranslating = translating;

    if (!this.element) return;

    const progress = this.element.querySelector(
      '.review-translation-progress'
    ) as HTMLElement;
    const translateBtn = this.element.querySelector(
      '[data-action="translate-document"]'
    ) as HTMLButtonElement;
    const translateSentenceBtn = this.element.querySelector(
      '[data-action="translate-sentence"]'
    ) as HTMLButtonElement;

    if (progress) {
      progress.style.display = translating ? 'flex' : 'none';
      if (progressText) {
        const text = progress.querySelector(
          '.review-translation-progress-text'
        ) as HTMLElement;
        if (text) {
          text.textContent = progressText;
        }
      }
    }

    if (translateBtn) {
      translateBtn.disabled = translating;
    }

    if (translateSentenceBtn) {
      translateSentenceBtn.disabled = translating;
    }
  }

  /**
   * Update language selections
   */
  updateLanguages(source: Language, target: Language): void {
    if (!this.element) return;

    const sourceSelect = this.element.querySelector(
      '[data-setting="source-language"]'
    ) as HTMLSelectElement;
    if (sourceSelect) {
      sourceSelect.value = source;
    }

    const targetSelect = this.element.querySelector(
      '[data-setting="target-language"]'
    ) as HTMLSelectElement;
    if (targetSelect) {
      targetSelect.value = target;
    }

    this.config.sourceLanguage = source;
    this.config.targetLanguage = target;
  }

  /**
   * Get the underlying DOM element
   */
  getElement(): HTMLElement | null {
    return this.element;
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}
