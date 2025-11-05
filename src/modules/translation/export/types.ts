/**
 * Translation Export Service Types
 * Defines interfaces for exporting translated documents
 */

import type { Language } from '../types';

export type ExportStrategy = 'unified' | 'separated';

export type ExportLanguageMode = 'source' | 'target' | 'both';

export interface TranslationExportOptions {
  /** Export strategy: unified (single project) or separated (multiple projects) */
  strategy?: ExportStrategy;
  /** Which language(s) to export */
  languageMode?: ExportLanguageMode;
  /** Include metadata files (.translation.json) */
  includeMetadata?: boolean;
  /** Include correspondence mapping visualization */
  includeMapping?: boolean;
  /** Format for export (clean or critic markup) */
  format?: 'clean' | 'critic';
  /** Custom archive name prefix */
  archivePrefix?: string;
}

export interface TranslationExportFile {
  filename: string;
  content: string;
  language: Language;
  type: 'qmd' | 'metadata' | 'config' | 'mapping';
  primary?: boolean;
}

export interface TranslationExportBundle {
  files: TranslationExportFile[];
  strategy: ExportStrategy;
  languages: Language[];
  suggestedArchiveName: string;
  metadata: TranslationExportMetadata;
}

export interface TranslationExportMetadata {
  exportedAt: string; // ISO timestamp
  exportStrategy: ExportStrategy;
  sourceLanguage: Language;
  targetLanguage: Language;
  totalSentences: number;
  translatedCount: number;
  exportedBy: string; // 'quarto-review-extension'
  version: string; // export format version
}

export interface UnifiedExportOptions {
  /** Use Quarto conditionals for language-specific content */
  useConditionals?: boolean;
  /** Conditional syntax style */
  conditionalStyle?: 'shortcodes' | 'divs';
  /** Include both languages in same document */
  includeBothLanguages?: boolean;
}

export interface SeparatedExportOptions {
  /** Create separate _quarto.yml for each language */
  separateProjects?: boolean;
  /** Create a shared _quarto.yml with language variants */
  sharedProject?: boolean;
  /** Directory structure: flat or nested */
  directoryStructure?: 'flat' | 'nested';
}

export interface CorrespondenceMappingFile {
  version: string;
  sourceLanguage: Language;
  targetLanguage: Language;
  pairs: TranslationPairExport[];
  statistics: {
    totalPairs: number;
    manualPairs: number;
    automaticPairs: number;
    averageAlignment: number;
  };
}

export interface TranslationPairExport {
  sourceId: string;
  targetId: string;
  sourceText: string;
  targetText: string;
  method: string;
  provider?: string;
  alignmentScore?: number;
  status: string;
}

export interface SentenceExport {
  id: string;
  content: string;
  elementId: string;
  startOffset: number;
  endOffset: number;
}

export interface TranslationMetadataFile {
  version: string;
  document: {
    sourceLanguage: Language;
    targetLanguage: Language;
    createdAt: string;
    lastModified: string;
  };
  sentences: {
    source: SentenceExport[];
    target: SentenceExport[];
  };
  correspondenceMap: CorrespondenceMappingFile;
}

export interface ExportResult {
  fileCount: number;
  downloadedAs: string;
  filenames: string[];
  strategy: ExportStrategy;
}
