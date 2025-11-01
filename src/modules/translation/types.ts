/**
 * Core type definitions for Translation Module
 */

export type Language = 'en' | 'nl' | 'fr';

export type TranslationMethod = 'automatic' | 'manual' | 'hybrid';

export type TranslationStatus =
  | 'untranslated' // No translation yet
  | 'auto-translated' // Automatically translated
  | 'manual' // Manually translated
  | 'edited' // Auto-translated then manually edited
  | 'out-of-sync' // Source changed, translation outdated
  | 'synced'; // Translation up to date

export interface Sentence {
  id: string; // Unique sentence ID
  elementId: string; // Parent element ID from ChangesModule
  content: string; // Sentence text
  language: Language;
  startOffset: number; // Character offset in element
  endOffset: number;
  hash: string; // Content hash for change detection
}

export interface TranslationPair {
  id: string; // Unique pair ID
  sourceId: string; // Source sentence ID
  targetId: string; // Target sentence ID
  sourceText: string; // Source sentence text
  targetText: string; // Target sentence text
  sourceLanguage: Language;
  targetLanguage: Language;
  method: TranslationMethod;
  provider?: string; // 'openai', 'local', 'google', etc.
  confidence?: number; // 0-1 confidence score
  alignmentScore?: number; // How well sentences align
  timestamp: number; // Creation timestamp
  lastModified: number; // Last modification timestamp
  status: TranslationStatus;
  isManuallyEdited: boolean;
  metadata?: Record<string, any>; // Extensible metadata
}

export interface CorrespondenceMap {
  pairs: TranslationPair[];
  // Maps: source sentence ID → array of target sentence IDs
  forwardMapping: Map<string, string[]>;
  // Maps: target sentence ID → array of source sentence IDs
  reverseMapping: Map<string, string[]>;
  sourceLanguage: Language;
  targetLanguage: Language;
}

export interface TranslationDocument {
  id: string;
  sourceSentences: Sentence[];
  targetSentences: Sentence[];
  correspondenceMap: CorrespondenceMap;
  metadata: {
    sourceLanguage: Language;
    targetLanguage: Language;
    createdAt: number;
    lastModified: number;
    totalSentences: number;
    translatedCount: number;
    manualCount: number;
    autoCount: number;
  };
}

export interface TranslationConfig {
  enabled: boolean;
  sourceLanguage: Language;
  targetLanguage: Language;
  defaultProvider: string;
  autoTranslateOnEdit: boolean;
  autoTranslateOnLoad: boolean;
  showCorrespondenceLines: boolean;
  highlightOnHover: boolean;
  providers: {
    openai?: OpenAIConfig;
    google?: GoogleTranslateConfig;
    local?: LocalAIConfig;
  };
}

export interface OpenAIConfig {
  apiKey: string;
  model?: string; // default: 'gpt-3.5-turbo'
  maxTokens?: number;
}

export interface GoogleTranslateConfig {
  apiKey: string;
  endpoint?: string;
}

export interface LocalAIConfig {
  model?: string; // 'nllb-200' | 'opus-mt'
  backend?: 'auto' | 'webgpu' | 'wasm';
  mode?: 'fast' | 'balanced' | 'quality';
  // fast = Opus-MT (300MB, fastest)
  // balanced = NLLB-200-600M (600MB, good quality)
  // quality = NLLB-200-1.3B (1.3GB, best quality)
  downloadOnLoad?: boolean;
  useWebWorker?: boolean;
}

export interface TranslationProgress {
  stage: 'downloading' | 'initializing' | 'translating' | 'complete';
  progress: number; // 0-1
  message: string;
  current?: number;
  total?: number;
}

export type TranslationProviderType = 'local' | 'openai' | 'google' | 'manual';

export interface TranslationModuleConfig {
  config: TranslationConfig;
  changes: any; // ChangesModule
  markdown: any; // MarkdownModule
  exporter?: any; // QmdExportService
}
