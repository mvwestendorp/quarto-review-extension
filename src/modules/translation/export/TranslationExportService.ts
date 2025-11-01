/**
 * Translation Export Service
 * Base service for exporting translated documents
 */

import { createModuleLogger } from '@utils/debug';
import ZipArchiveBuilder from '@utils/zip';
import type {
  TranslationDocument,
  Sentence,
  TranslationPair,
  Language,
} from '../types';
import type {
  TranslationExportOptions,
  TranslationExportBundle,
  TranslationExportFile,
  TranslationExportMetadata,
  ExportResult,
  TranslationMetadataFile,
  CorrespondenceMappingFile,
  SentenceExport,
  TranslationPairExport,
} from './types';

const logger = createModuleLogger('TranslationExportService');

export interface TranslationExportServiceConfig {
  primaryFilename?: string;
  projectName?: string;
}

/**
 * Base Translation Export Service
 * Provides common functionality for all export strategies
 */
export class TranslationExportService {
  private readonly primaryFilename: string;
  private readonly projectName: string;

  constructor(private config: TranslationExportServiceConfig = {}) {
    this.primaryFilename = config.primaryFilename || 'document.qmd';
    this.projectName = config.projectName || this.deriveProjectName();
  }

  /**
   * Create export bundle from translation document
   */
  async createBundle(
    document: TranslationDocument,
    options: TranslationExportOptions = {}
  ): Promise<TranslationExportBundle> {
    const strategy = options.strategy || 'unified';
    const includeMetadata = options.includeMetadata ?? true;
    const includeMapping = options.includeMapping ?? false;

    const files: TranslationExportFile[] = [];

    // Add QMD files based on strategy
    if (strategy === 'unified') {
      files.push(...this.createUnifiedFiles(document, options));
    } else {
      files.push(...this.createSeparatedFiles(document, options));
    }

    // Add metadata file if requested
    if (includeMetadata) {
      files.push(this.createMetadataFile(document));
    }

    // Add correspondence mapping if requested
    if (includeMapping) {
      files.push(this.createMappingFile(document));
    }

    const metadata = this.createExportMetadata(document, strategy);
    const suggestedArchiveName = this.generateArchiveName(
      strategy,
      document.metadata.sourceLanguage,
      document.metadata.targetLanguage,
      options.archivePrefix
    );

    return {
      files,
      strategy,
      languages: [
        document.metadata.sourceLanguage,
        document.metadata.targetLanguage,
      ],
      suggestedArchiveName,
      metadata,
    };
  }

  /**
   * Download the export bundle
   */
  downloadBundle(bundle: TranslationExportBundle): ExportResult {
    if (!bundle.files.length) {
      throw new Error('No files to export');
    }

    if (typeof document === 'undefined') {
      throw new Error('Export is only supported in a browser environment');
    }

    const shouldArchive = bundle.files.length > 1;

    if (!shouldArchive) {
      // Single file - download directly
      const file = bundle.files[0];
      if (!file) {
        throw new Error('Export bundle missing file data');
      }
      const blob = new Blob([file.content], { type: 'text/markdown' });
      this.triggerDownload(blob, file.filename);

      logger.info('Exported single translation file', {
        filename: file.filename,
        strategy: bundle.strategy,
      });

      return {
        fileCount: 1,
        downloadedAs: file.filename,
        filenames: [file.filename],
        strategy: bundle.strategy,
      };
    }

    // Multiple files - create ZIP archive
    const archive = new ZipArchiveBuilder();
    bundle.files.forEach((file) => {
      archive.addFile({
        filename: file.filename,
        content: file.content,
      });
    });

    const blob = archive.buildBlob();
    this.triggerDownload(blob, bundle.suggestedArchiveName);

    logger.info('Exported translation archive', {
      filename: bundle.suggestedArchiveName,
      files: bundle.files.map((f) => f.filename),
      strategy: bundle.strategy,
    });

    return {
      fileCount: bundle.files.length,
      downloadedAs: bundle.suggestedArchiveName,
      filenames: bundle.files.map((f) => f.filename),
      strategy: bundle.strategy,
    };
  }

  /**
   * Export and download in one step
   */
  async exportTranslation(
    document: TranslationDocument,
    options: TranslationExportOptions = {}
  ): Promise<ExportResult> {
    const bundle = await this.createBundle(document, options);
    return this.downloadBundle(bundle);
  }

  /**
   * Create unified export files (single project with conditionals or both languages)
   */
  protected createUnifiedFiles(
    document: TranslationDocument,
    options: TranslationExportOptions
  ): TranslationExportFile[] {
    const files: TranslationExportFile[] = [];
    const languageMode = options.languageMode || 'both';

    if (languageMode === 'both' || languageMode === 'source') {
      // Reconstruct source document
      const sourceContent = this.reconstructDocument(
        document.sourceSentences,
        document.metadata.sourceLanguage
      );

      files.push({
        filename: this.primaryFilename,
        content: sourceContent,
        language: document.metadata.sourceLanguage,
        type: 'qmd',
        primary: true,
      });
    }

    if (languageMode === 'both' || languageMode === 'target') {
      // Reconstruct target document
      const targetContent = this.reconstructDocument(
        document.targetSentences,
        document.metadata.targetLanguage
      );

      const targetFilename =
        languageMode === 'both'
          ? this.getTranslatedFilename(
              this.primaryFilename,
              document.metadata.targetLanguage
            )
          : this.primaryFilename;

      files.push({
        filename: targetFilename,
        content: targetContent,
        language: document.metadata.targetLanguage,
        type: 'qmd',
        primary: languageMode === 'target',
      });
    }

    return files;
  }

  /**
   * Create separated export files (separate projects for each language)
   */
  protected createSeparatedFiles(
    document: TranslationDocument,
    options: TranslationExportOptions
  ): TranslationExportFile[] {
    const files: TranslationExportFile[] = [];
    const languageMode = options.languageMode || 'both';

    if (languageMode === 'both' || languageMode === 'source') {
      const sourceContent = this.reconstructDocument(
        document.sourceSentences,
        document.metadata.sourceLanguage
      );

      files.push({
        filename: `${document.metadata.sourceLanguage}/${this.primaryFilename}`,
        content: sourceContent,
        language: document.metadata.sourceLanguage,
        type: 'qmd',
        primary: true,
      });

      // Add _quarto.yml for source language
      files.push(
        this.createQuartoConfig(
          document.metadata.sourceLanguage,
          `${document.metadata.sourceLanguage}/_quarto.yml`
        )
      );
    }

    if (languageMode === 'both' || languageMode === 'target') {
      const targetContent = this.reconstructDocument(
        document.targetSentences,
        document.metadata.targetLanguage
      );

      files.push({
        filename: `${document.metadata.targetLanguage}/${this.primaryFilename}`,
        content: targetContent,
        language: document.metadata.targetLanguage,
        type: 'qmd',
        primary: languageMode === 'target',
      });

      // Add _quarto.yml for target language
      files.push(
        this.createQuartoConfig(
          document.metadata.targetLanguage,
          `${document.metadata.targetLanguage}/_quarto.yml`
        )
      );
    }

    return files;
  }

  /**
   * Reconstruct a document from sentences
   */
  protected reconstructDocument(
    sentences: Sentence[],
    _language: Language
  ): string {
    // Group sentences by element ID
    const elementMap = new Map<string, Sentence[]>();

    sentences.forEach((sentence) => {
      const existing = elementMap.get(sentence.elementId) || [];
      existing.push(sentence);
      elementMap.set(sentence.elementId, existing);
    });

    // Reconstruct each element's content
    const elements: string[] = [];

    elementMap.forEach((sentenceGroup) => {
      // Sort by start offset
      sentenceGroup.sort((a, b) => a.startOffset - b.startOffset);

      // Combine sentences into paragraph
      const content = sentenceGroup.map((s) => s.content).join(' ');
      elements.push(content);
    });

    return elements.join('\n\n');
  }

  /**
   * Create metadata file
   */
  protected createMetadataFile(
    document: TranslationDocument
  ): TranslationExportFile {
    const metadata: TranslationMetadataFile = {
      version: '1.0.0',
      document: {
        sourceLanguage: document.metadata.sourceLanguage,
        targetLanguage: document.metadata.targetLanguage,
        createdAt: new Date(document.metadata.createdAt).toISOString(),
        lastModified: new Date(document.metadata.lastModified).toISOString(),
      },
      sentences: {
        source: document.sourceSentences.map(this.sentenceToExport),
        target: document.targetSentences.map(this.sentenceToExport),
      },
      correspondenceMap: this.createCorrespondenceMapping(document),
    };

    return {
      filename: '.translation-metadata.json',
      content: JSON.stringify(metadata, null, 2),
      language: document.metadata.sourceLanguage,
      type: 'metadata',
    };
  }

  /**
   * Create correspondence mapping file
   */
  protected createMappingFile(
    document: TranslationDocument
  ): TranslationExportFile {
    const mapping = this.createCorrespondenceMapping(document);

    return {
      filename: '.translation-mapping.json',
      content: JSON.stringify(mapping, null, 2),
      language: document.metadata.sourceLanguage,
      type: 'mapping',
    };
  }

  /**
   * Create correspondence mapping data
   */
  protected createCorrespondenceMapping(
    document: TranslationDocument
  ): CorrespondenceMappingFile {
    const pairs = document.correspondenceMap.pairs;

    const totalAlignment =
      pairs.reduce((sum, p) => sum + (p.alignmentScore || 0), 0) /
      (pairs.length || 1);

    return {
      version: '1.0.0',
      sourceLanguage: document.metadata.sourceLanguage,
      targetLanguage: document.metadata.targetLanguage,
      pairs: pairs.map(this.pairToExport),
      statistics: {
        totalPairs: pairs.length,
        manualPairs: pairs.filter((p) => p.method === 'manual').length,
        automaticPairs: pairs.filter((p) => p.method === 'automatic').length,
        averageAlignment: totalAlignment,
      },
    };
  }

  /**
   * Create Quarto config file for language
   */
  protected createQuartoConfig(
    language: Language,
    filename: string
  ): TranslationExportFile {
    const languageNames: Record<Language, string> = {
      en: 'English',
      nl: 'Nederlands',
      fr: 'Français',
    };

    const config = `project:
  type: website
  output-dir: _site

lang: ${language}

website:
  title: "${this.projectName} (${languageNames[language]})"
  navbar:
    left:
      - text: Home
        href: index.qmd

format:
  html:
    theme: cosmo
    css: styles.css
    toc: true
`;

    return {
      filename,
      content: config,
      language,
      type: 'config',
    };
  }

  /**
   * Convert sentence to export format
   */
  protected sentenceToExport(sentence: Sentence): SentenceExport {
    return {
      id: sentence.id,
      content: sentence.content,
      elementId: sentence.elementId,
      startOffset: sentence.startOffset,
      endOffset: sentence.endOffset,
    };
  }

  /**
   * Convert pair to export format
   */
  protected pairToExport(pair: TranslationPair): TranslationPairExport {
    return {
      sourceId: pair.sourceId,
      targetId: pair.targetId,
      sourceText: pair.sourceText,
      targetText: pair.targetText,
      method: pair.method,
      provider: pair.provider,
      alignmentScore: pair.alignmentScore,
      status: pair.status,
    };
  }

  /**
   * Create export metadata
   */
  protected createExportMetadata(
    document: TranslationDocument,
    strategy: 'unified' | 'separated'
  ): TranslationExportMetadata {
    return {
      exportedAt: new Date().toISOString(),
      exportStrategy: strategy,
      sourceLanguage: document.metadata.sourceLanguage,
      targetLanguage: document.metadata.targetLanguage,
      totalSentences: document.metadata.totalSentences,
      translatedCount: document.metadata.translatedCount,
      exportedBy: 'quarto-review-extension',
      version: '1.0.0',
    };
  }

  /**
   * Get translated filename with language suffix
   */
  protected getTranslatedFilename(
    filename: string,
    language: Language
  ): string {
    const parts = filename.split('.');
    const ext = parts.pop();
    const base = parts.join('.');
    return `${base}-${language}.${ext}`;
  }

  /**
   * Generate archive name
   */
  protected generateArchiveName(
    strategy: 'unified' | 'separated',
    sourceLanguage: Language,
    targetLanguage: Language,
    prefix?: string
  ): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');

    const projectSlug = prefix || this.projectName.replace(/\s+/g, '-');
    const strategyPrefix =
      strategy === 'separated' ? 'multilang' : 'translation';
    const langPair = `${sourceLanguage}-${targetLanguage}`;

    return `${projectSlug}-${strategyPrefix}-${langPair}-${timestamp}.zip`;
  }

  /**
   * Derive project name from filename
   */
  protected deriveProjectName(): string {
    const base = this.primaryFilename.replace(/\.qmd$/i, '');
    return base
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Trigger browser download
   */
  protected triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      document.body?.removeChild(anchor);
      URL.revokeObjectURL(url);
    }, 0);
  }
}

export default TranslationExportService;
