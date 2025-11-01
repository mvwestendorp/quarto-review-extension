/**
 * Translation Export Service Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  TranslationExportService,
  UnifiedExporter,
  SeparatedExporter,
} from '@/modules/translation/export';
import type {
  TranslationDocument,
  Sentence,
  TranslationPair,
} from '@/modules/translation/types';

describe('TranslationExportService', () => {
  let service: TranslationExportService;
  let mockDocument: TranslationDocument;

  beforeEach(() => {
    service = new TranslationExportService({
      primaryFilename: 'article.qmd',
      projectName: 'Test Article',
    });

    // Create mock translation document
    const sourceSentences: Sentence[] = [
      {
        id: 'src-1',
        elementId: 'elem-1',
        content: 'This is the first sentence.',
        language: 'en',
        startOffset: 0,
        endOffset: 27,
        hash: 'hash1',
      },
      {
        id: 'src-2',
        elementId: 'elem-1',
        content: 'This is the second sentence.',
        language: 'en',
        startOffset: 28,
        endOffset: 56,
        hash: 'hash2',
      },
      {
        id: 'src-3',
        elementId: 'elem-2',
        content: 'This is a third sentence.',
        language: 'en',
        startOffset: 0,
        endOffset: 25,
        hash: 'hash3',
      },
    ];

    const targetSentences: Sentence[] = [
      {
        id: 'tgt-1',
        elementId: 'elem-1',
        content: 'Dit is de eerste zin.',
        language: 'nl',
        startOffset: 0,
        endOffset: 21,
        hash: 'hash4',
      },
      {
        id: 'tgt-2',
        elementId: 'elem-1',
        content: 'Dit is de tweede zin.',
        language: 'nl',
        startOffset: 22,
        endOffset: 43,
        hash: 'hash5',
      },
      {
        id: 'tgt-3',
        elementId: 'elem-2',
        content: 'Dit is een derde zin.',
        language: 'nl',
        startOffset: 0,
        endOffset: 21,
        hash: 'hash6',
      },
    ];

    const pairs: TranslationPair[] = [
      {
        id: 'pair-1',
        sourceId: 'src-1',
        targetId: 'tgt-1',
        sourceText: sourceSentences[0]!.content,
        targetText: targetSentences[0]!.content,
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        method: 'automatic',
        provider: 'openai',
        alignmentScore: 0.95,
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'synced',
        isManuallyEdited: false,
      },
      {
        id: 'pair-2',
        sourceId: 'src-2',
        targetId: 'tgt-2',
        sourceText: sourceSentences[1]!.content,
        targetText: targetSentences[1]!.content,
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        method: 'automatic',
        provider: 'openai',
        alignmentScore: 0.93,
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'synced',
        isManuallyEdited: false,
      },
      {
        id: 'pair-3',
        sourceId: 'src-3',
        targetId: 'tgt-3',
        sourceText: sourceSentences[2]!.content,
        targetText: targetSentences[2]!.content,
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        method: 'manual',
        alignmentScore: 1.0,
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'synced',
        isManuallyEdited: true,
      },
    ];

    mockDocument = {
      id: 'doc-1',
      sourceSentences,
      targetSentences,
      correspondenceMap: {
        pairs,
        forwardMapping: new Map([
          ['src-1', ['tgt-1']],
          ['src-2', ['tgt-2']],
          ['src-3', ['tgt-3']],
        ]),
        reverseMapping: new Map([
          ['tgt-1', ['src-1']],
          ['tgt-2', ['src-2']],
          ['tgt-3', ['src-3']],
        ]),
        sourceLanguage: 'en',
        targetLanguage: 'nl',
      },
      metadata: {
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        createdAt: Date.now(),
        lastModified: Date.now(),
        totalSentences: 3,
        translatedCount: 3,
        manualCount: 1,
        autoCount: 2,
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('Bundle Creation', () => {
    it('should create unified export bundle', async () => {
      const bundle = await service.createBundle(mockDocument, {
        strategy: 'unified',
        languageMode: 'both',
      });

      expect(bundle.strategy).toBe('unified');
      expect(bundle.languages).toEqual(['en', 'nl']);
      expect(bundle.files.length).toBeGreaterThan(0);
      expect(bundle.suggestedArchiveName).toContain('translation');
      expect(bundle.metadata.exportStrategy).toBe('unified');
    });

    it('should create separated export bundle', async () => {
      const bundle = await service.createBundle(mockDocument, {
        strategy: 'separated',
        languageMode: 'both',
      });

      expect(bundle.strategy).toBe('separated');
      expect(bundle.files.length).toBeGreaterThan(2); // At least source + target + configs
      const filenames = bundle.files.map((f) => f.filename);
      expect(filenames.some((f) => f.startsWith('en/'))).toBe(true);
      expect(filenames.some((f) => f.startsWith('nl/'))).toBe(true);
    });

    it('should include metadata file when requested', async () => {
      const bundle = await service.createBundle(mockDocument, {
        includeMetadata: true,
      });

      const metadataFile = bundle.files.find(
        (f) => f.filename === '.translation-metadata.json'
      );
      expect(metadataFile).toBeDefined();
      expect(metadataFile?.type).toBe('metadata');

      const metadata = JSON.parse(metadataFile!.content);
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.sentences.source).toHaveLength(3);
      expect(metadata.sentences.target).toHaveLength(3);
    });

    it('should include correspondence mapping when requested', async () => {
      const bundle = await service.createBundle(mockDocument, {
        includeMapping: true,
      });

      const mappingFile = bundle.files.find(
        (f) => f.filename === '.translation-mapping.json'
      );
      expect(mappingFile).toBeDefined();
      expect(mappingFile?.type).toBe('mapping');

      const mapping = JSON.parse(mappingFile!.content);
      expect(mapping.pairs).toHaveLength(3);
      expect(mapping.statistics.totalPairs).toBe(3);
      expect(mapping.statistics.manualPairs).toBe(1);
      expect(mapping.statistics.automaticPairs).toBe(2);
    });

    it('should export only source language when requested', async () => {
      const bundle = await service.createBundle(mockDocument, {
        languageMode: 'source',
      });

      const qmdFiles = bundle.files.filter((f) => f.type === 'qmd');
      expect(qmdFiles.length).toBe(1);
      expect(qmdFiles[0]?.language).toBe('en');
    });

    it('should export only target language when requested', async () => {
      const bundle = await service.createBundle(mockDocument, {
        languageMode: 'target',
      });

      const qmdFiles = bundle.files.filter((f) => f.type === 'qmd');
      expect(qmdFiles.length).toBe(1);
      expect(qmdFiles[0]?.language).toBe('nl');
    });
  });

  describe('Document Reconstruction', () => {
    it('should reconstruct document from sentences', async () => {
      const bundle = await service.createBundle(mockDocument, {
        languageMode: 'source',
      });

      const sourceFile = bundle.files.find((f) => f.type === 'qmd');
      expect(sourceFile).toBeDefined();

      // Should have both paragraphs (elem-1 and elem-2)
      const paragraphs = sourceFile!.content.split('\n\n');
      expect(paragraphs.length).toBe(2);

      // First paragraph should combine first two sentences
      expect(paragraphs[0]).toContain('first sentence');
      expect(paragraphs[0]).toContain('second sentence');

      // Second paragraph should have third sentence
      expect(paragraphs[1]).toContain('third sentence');
    });

    it('should preserve sentence order within elements', async () => {
      const bundle = await service.createBundle(mockDocument, {
        languageMode: 'source',
      });

      const sourceFile = bundle.files.find((f) => f.type === 'qmd');
      const firstParagraph = sourceFile!.content.split('\n\n')[0];

      // First sentence should come before second
      const firstIndex = firstParagraph!.indexOf('first');
      const secondIndex = firstParagraph!.indexOf('second');
      expect(firstIndex).toBeLessThan(secondIndex);
    });
  });

  describe('Download Bundle', () => {
    it('should download single file directly', () => {
      vi.useFakeTimers();
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => void 0);
      const createURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test');
      const revokeURLSpy = vi
        .spyOn(URL, 'revokeObjectURL')
        .mockImplementation(() => void 0);

      const bundle = {
        files: [
          {
            filename: 'test.qmd',
            content: 'test content',
            language: 'en' as const,
            type: 'qmd' as const,
            primary: true,
          },
        ],
        strategy: 'unified' as const,
        languages: ['en' as const],
        suggestedArchiveName: 'test.zip',
        metadata: {
          exportedAt: new Date().toISOString(),
          exportStrategy: 'unified' as const,
          sourceLanguage: 'en' as const,
          targetLanguage: 'nl' as const,
          totalSentences: 3,
          translatedCount: 3,
          exportedBy: 'quarto-review-extension',
          version: '1.0.0',
        },
      };

      const result = service.downloadBundle(bundle);

      expect(result.fileCount).toBe(1);
      expect(result.downloadedAs).toBe('test.qmd');
      expect(result.filenames).toEqual(['test.qmd']);
      expect(clickSpy).toHaveBeenCalledTimes(1);

      vi.runAllTimers();
      expect(revokeURLSpy).toHaveBeenCalledWith('blob:test');

      vi.useRealTimers();
    });

    it('should create ZIP archive for multiple files', () => {
      vi.useFakeTimers();
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => void 0);
      const createURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:zip');

      const bundle = {
        files: [
          {
            filename: 'en/test.qmd',
            content: 'English',
            language: 'en' as const,
            type: 'qmd' as const,
          },
          {
            filename: 'nl/test.qmd',
            content: 'Nederlands',
            language: 'nl' as const,
            type: 'qmd' as const,
          },
        ],
        strategy: 'separated' as const,
        languages: ['en' as const, 'nl' as const],
        suggestedArchiveName: 'test-multilang.zip',
        metadata: {
          exportedAt: new Date().toISOString(),
          exportStrategy: 'separated' as const,
          sourceLanguage: 'en' as const,
          targetLanguage: 'nl' as const,
          totalSentences: 3,
          translatedCount: 3,
          exportedBy: 'quarto-review-extension',
          version: '1.0.0',
        },
      };

      const result = service.downloadBundle(bundle);

      expect(result.fileCount).toBe(2);
      expect(result.downloadedAs).toBe('test-multilang.zip');
      expect(result.strategy).toBe('separated');
      expect(clickSpy).toHaveBeenCalledTimes(1);

      // Verify ZIP was created
      const blobArg = createURLSpy.mock.calls[0]?.[0];
      expect(blobArg).toBeInstanceOf(Blob);

      vi.useRealTimers();
    });
  });
});

describe('UnifiedExporter', () => {
  let exporter: UnifiedExporter;
  let mockDocument: TranslationDocument;

  beforeEach(() => {
    exporter = new UnifiedExporter({
      primaryFilename: 'article.qmd',
      projectName: 'Test Article',
    });

    // Create simple mock document
    const sourceSentences: Sentence[] = [
      {
        id: 'src-1',
        elementId: 'elem-1',
        content: 'Hello world.',
        language: 'en',
        startOffset: 0,
        endOffset: 12,
        hash: 'hash1',
      },
    ];

    const targetSentences: Sentence[] = [
      {
        id: 'tgt-1',
        elementId: 'elem-1',
        content: 'Hallo wereld.',
        language: 'nl',
        startOffset: 0,
        endOffset: 13,
        hash: 'hash2',
      },
    ];

    const pairs: TranslationPair[] = [
      {
        id: 'pair-1',
        sourceId: 'src-1',
        targetId: 'tgt-1',
        sourceText: sourceSentences[0]!.content,
        targetText: targetSentences[0]!.content,
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        method: 'automatic',
        alignmentScore: 1.0,
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'synced',
        isManuallyEdited: false,
      },
    ];

    mockDocument = {
      id: 'doc-1',
      sourceSentences,
      targetSentences,
      correspondenceMap: {
        pairs,
        forwardMapping: new Map([['src-1', ['tgt-1']]]),
        reverseMapping: new Map([['tgt-1', ['src-1']]]),
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
  });

  it('should create unified bundle with conditionals', async () => {
    const bundle = await exporter.createBundle(mockDocument, {
      strategy: 'unified',
      languageMode: 'both',
    });

    expect(bundle.strategy).toBe('unified');

    const qmdFile = bundle.files.find((f) => f.type === 'qmd');
    expect(qmdFile).toBeDefined();

    // Should contain YAML header
    expect(qmdFile!.content).toContain('---');
    expect(qmdFile!.content).toContain('title:');
  });

  it('should include Quarto config for language switching', async () => {
    const bundle = await exporter.createBundle(mockDocument, {
      strategy: 'unified',
      languageMode: 'both',
    });

    const configFile = bundle.files.find((f) => f.filename === '_quarto.yml');
    expect(configFile).toBeDefined();
    expect(configFile!.content).toContain('lang: en');
    expect(configFile!.content).toContain('website:');
  });
});

describe('SeparatedExporter', () => {
  let exporter: SeparatedExporter;
  let mockDocument: TranslationDocument;

  beforeEach(() => {
    exporter = new SeparatedExporter({
      primaryFilename: 'article.qmd',
      projectName: 'Test Article',
    });

    // Create simple mock document
    const sourceSentences: Sentence[] = [
      {
        id: 'src-1',
        elementId: 'elem-1',
        content: 'Hello world.',
        language: 'en',
        startOffset: 0,
        endOffset: 12,
        hash: 'hash1',
      },
    ];

    const targetSentences: Sentence[] = [
      {
        id: 'tgt-1',
        elementId: 'elem-1',
        content: 'Hallo wereld.',
        language: 'nl',
        startOffset: 0,
        endOffset: 13,
        hash: 'hash2',
      },
    ];

    const pairs: TranslationPair[] = [
      {
        id: 'pair-1',
        sourceId: 'src-1',
        targetId: 'tgt-1',
        sourceText: sourceSentences[0]!.content,
        targetText: targetSentences[0]!.content,
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        method: 'automatic',
        alignmentScore: 1.0,
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'synced',
        isManuallyEdited: false,
      },
    ];

    mockDocument = {
      id: 'doc-1',
      sourceSentences,
      targetSentences,
      correspondenceMap: {
        pairs,
        forwardMapping: new Map([['src-1', ['tgt-1']]]),
        reverseMapping: new Map([['tgt-1', ['src-1']]]),
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
  });

  it('should create separate directories for each language', async () => {
    const bundle = await exporter.createBundle(mockDocument, {
      strategy: 'separated',
      languageMode: 'both',
    });

    expect(bundle.strategy).toBe('separated');

    const filenames = bundle.files.map((f) => f.filename);
    expect(filenames.some((f) => f.startsWith('en/'))).toBe(true);
    expect(filenames.some((f) => f.startsWith('nl/'))).toBe(true);
  });

  it('should create Quarto config for each language', async () => {
    const bundle = await exporter.createBundle(mockDocument, {
      strategy: 'separated',
      languageMode: 'both',
    });

    const enConfig = bundle.files.find((f) => f.filename === 'en/_quarto.yml');
    const nlConfig = bundle.files.find((f) => f.filename === 'nl/_quarto.yml');

    expect(enConfig).toBeDefined();
    expect(nlConfig).toBeDefined();

    expect(enConfig!.content).toContain('lang: en');
    expect(nlConfig!.content).toContain('lang: nl');
  });

  it('should create README for each language project', async () => {
    const bundle = await exporter.createBundle(mockDocument, {
      strategy: 'separated',
      languageMode: 'both',
    });

    const enReadme = bundle.files.find((f) => f.filename === 'en/README.md');
    const nlReadme = bundle.files.find((f) => f.filename === 'nl/README.md');

    expect(enReadme).toBeDefined();
    expect(nlReadme).toBeDefined();

    expect(enReadme!.content).toContain('English');
    expect(nlReadme!.content).toContain('Nederlands');
  });

  it('should create root README for multilingual project', async () => {
    const bundle = await exporter.createBundle(mockDocument, {
      strategy: 'separated',
      languageMode: 'both',
    });

    const rootReadme = bundle.files.find((f) => f.filename === 'README.md');
    expect(rootReadme).toBeDefined();
    expect(rootReadme!.content).toMatch(/multilingual/i); // Case insensitive
    expect(rootReadme!.content).toContain('Available Languages');
  });

  it('should create index.qmd for each language', async () => {
    const bundle = await exporter.createBundle(mockDocument, {
      strategy: 'separated',
      languageMode: 'both',
    });

    const enIndex = bundle.files.find((f) => f.filename === 'en/index.qmd');
    const nlIndex = bundle.files.find((f) => f.filename === 'nl/index.qmd');

    expect(enIndex).toBeDefined();
    expect(nlIndex).toBeDefined();
  });

  it('should create styles for each language', async () => {
    const bundle = await exporter.createBundle(mockDocument, {
      strategy: 'separated',
      languageMode: 'both',
    });

    const enStyles = bundle.files.find((f) => f.filename === 'en/styles.css');
    const nlStyles = bundle.files.find((f) => f.filename === 'nl/styles.css');

    expect(enStyles).toBeDefined();
    expect(nlStyles).toBeDefined();
  });

  it('should create shared styles', async () => {
    const bundle = await exporter.createBundle(mockDocument, {
      strategy: 'separated',
      languageMode: 'both',
    });

    const sharedStyles = bundle.files.find(
      (f) => f.filename === 'styles-shared.css'
    );
    expect(sharedStyles).toBeDefined();
    expect(sharedStyles!.content).toContain('language-switcher');
  });
});
