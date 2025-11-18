/**
 * Translation Settings Management
 *
 * Handles persistent storage of translation preferences in LocalStorage.
 * Settings are automatically loaded on initialization and saved on changes.
 */

import { createModuleLogger } from '@utils/debug';
import type { Language } from '@modules/translation/types';
import { SafeStorage } from '@utils/security';

const logger = createModuleLogger('TranslationSettings');
const STORAGE_KEY = 'quarto-review-translation-settings';

export interface TranslationUserSettings {
  provider?: string;
  sourceLanguage?: Language;
  targetLanguage?: Language;
  autoTranslateOnEdit?: boolean;
  autoTranslateOnLoad?: boolean;
  showCorrespondenceLines?: boolean;
  highlightOnHover?: boolean;
}

export class TranslationSettings {
  private settings: TranslationUserSettings = {};

  constructor() {
    this.loadSettings();
  }

  /**
   * Load settings from SafeStorage
   */
  private loadSettings(): void {
    try {
      const stored = SafeStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.settings = stored as TranslationUserSettings;
        logger.debug('Loaded translation settings from storage', this.settings);
      }
    } catch (error) {
      logger.warn('Failed to load translation settings from storage', error);
      this.settings = {};
    }
  }

  /**
   * Save settings to SafeStorage
   */
  private saveSettings(): void {
    try {
      SafeStorage.setItem(STORAGE_KEY, this.settings);
      logger.debug('Saved translation settings to storage', this.settings);
    } catch (error) {
      logger.warn('Failed to save translation settings to storage', error);
    }
  }

  /**
   * Get a specific setting, with optional default value
   */
  getSetting<K extends keyof TranslationUserSettings>(
    key: K,
    defaultValue?: TranslationUserSettings[K]
  ): TranslationUserSettings[K] | undefined {
    const value = this.settings[key];
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Set a specific setting and persist to storage
   */
  setSetting<K extends keyof TranslationUserSettings>(
    key: K,
    value: TranslationUserSettings[K]
  ): void {
    this.settings[key] = value;
    this.saveSettings();
    logger.debug(`Updated setting: ${String(key)} = ${String(value)}`);
  }

  /**
   * Get all settings
   */
  getAll(): TranslationUserSettings {
    return { ...this.settings };
  }

  /**
   * Update multiple settings at once
   */
  setMultiple(updates: Partial<TranslationUserSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();
    logger.debug('Updated multiple settings', updates);
  }

  /**
   * Clear all settings
   */
  clearAll(): void {
    this.settings = {};
    try {
      SafeStorage.removeItem(STORAGE_KEY);
      logger.info('Cleared all translation settings');
    } catch (error) {
      logger.warn('Failed to clear translation settings', error);
    }
  }

  /**
   * Check if settings exist in storage
   */
  hasSettings(): boolean {
    return Object.keys(this.settings).length > 0;
  }
}
