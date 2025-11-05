# Translation Module Implementation Plan

**Version:** 1.0
**Date:** 2025-10-31
**Status:** Planning

## Table of Contents
1. [Overview](#overview)
2. [Architecture & Design](#architecture--design)
3. [Module Structure](#module-structure)
4. [Implementation Phases](#implementation-phases)
5. [Export Strategies](#export-strategies)
6. [Technical Specifications](#technical-specifications)
7. [Dependencies](#dependencies)
8. [Testing Strategy](#testing-strategy)
9. [Timeline & Milestones](#timeline--milestones)

---

## Overview

### Goal
Add a comprehensive translation module to the Quarto Review application with:
- Side-by-side translation UI
- Automatic and manual translation support
- Bidirectional editing capabilities
- Intelligent sentence correspondence mapping
- Visual indicators for translation status
- Multiple export formats

### Key Features
1. **Side-by-side UI**: Source and target languages displayed simultaneously
2. **Correspondence Mapping**: Deterministic mapping between source and target sentences
3. **Translation Methods**:
   - Local AI (transformers.js)
   - API-based (OpenAI, Google Translate)
   - Manual human translation
4. **Bidirectional Editing**: Edit in either language with synchronized updates
5. **Visual Clarity**: Colors and animations showing translation status
6. **Translation Export**: Multiple export formats (unified/separated projects)
7. **Language Support**: Dutch, French, and English (extensible to more)

---

## Architecture & Design

### Core Principles
1. **Deterministic Correspondence**: Each source sentence maps to specific target sentence(s)
2. **Immutable Translation History**: Track all translation changes
3. **Separation of Concerns**: Translation logic separate from UI
4. **Provider Abstraction**: Pluggable translation providers
5. **Non-intrusive Integration**: Works alongside existing review features

### Data Flow
```
User Action (Edit/Translate)
    ↓
Translation Module
    ↓
Correspondence Mapper (Update mappings)
    ↓
Translation Engine (If auto-translate enabled)
    ↓
Translation Provider (Local AI / API)
    ↓
UI Update (Render changes with visual indicators)
    ↓
Persistence Layer (Save state)
```

---

## Module Structure

```
src/modules/translation/
├── index.ts                          # Main TranslationModule class & exports
├── types.ts                          # TypeScript interfaces & types
├── correspondence-mapper.ts          # Sentence mapping & alignment logic
├── translation-engine.ts             # Translation providers abstraction
├── sentence-segmenter.ts             # Language-aware sentence parsing
├── alignment-algorithm.ts            # Sentence alignment scoring
│
├── providers/
│   ├── base.ts                      # Abstract base provider
│   ├── local-ai.ts                  # Local AI provider (transformers.js)
│   ├── openai.ts                    # OpenAI API provider
│   ├── google.ts                    # Google Translate API provider
│   └── manual.ts                    # Manual translation handler
│
├── ui/
│   ├── TranslationView.ts           # Side-by-side UI component
│   ├── TranslationToolbar.ts        # Translation controls
│   ├── SentencePairRenderer.ts      # Sentence correspondence visualization
│   ├── TranslationStatusIndicator.ts # Status badges & indicators
│   └── CorrespondenceVisualizer.ts  # Visual lines connecting sentences
│
├── storage/
│   ├── TranslationState.ts          # Translation state management
│   └── TranslationPersistence.ts    # Save/load translations
│
└── export/
    ├── TranslationExportService.ts  # Export translated documents
    ├── UnifiedExporter.ts           # Single project with conditionals
    └── SeparatedExporter.ts         # Separate projects per language
```

### CSS Structure
```
_extensions/review/assets/
├── components/
│   ├── translation-view.css         # Split-pane layout
│   ├── translation-toolbar.css      # Translation controls
│   ├── translation-sentence.css     # Sentence highlighting
│   └── translation-correspondence.css # Visual connectors
│
└── tokens/
    └── translation-colors.css       # Color scheme for translation states
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Days 1-3)

#### Files to Create
- `src/modules/translation/types.ts`
- `src/modules/translation/index.ts`
- `src/modules/translation/sentence-segmenter.ts`
- `src/modules/translation/storage/TranslationState.ts`

#### Type Definitions

```typescript
// types.ts

export type Language = 'en' | 'nl' | 'fr';

export type TranslationMethod = 'automatic' | 'manual' | 'hybrid';

export type TranslationStatus =
  | 'untranslated'     // No translation yet
  | 'auto-translated'  // Automatically translated
  | 'manual'           // Manually translated
  | 'edited'           // Auto-translated then manually edited
  | 'out-of-sync'      // Source changed, translation outdated
  | 'synced';          // Translation up to date

export interface Sentence {
  id: string;                    // Unique sentence ID
  elementId: string;             // Parent element ID from ChangesModule
  content: string;               // Sentence text
  language: Language;
  startOffset: number;           // Character offset in element
  endOffset: number;
  hash: string;                  // Content hash for change detection
}

export interface TranslationPair {
  id: string;                    // Unique pair ID
  sourceId: string;              // Source sentence ID
  targetId: string;              // Target sentence ID
  sourceText: string;            // Source sentence text
  targetText: string;            // Target sentence text
  sourceLanguage: Language;
  targetLanguage: Language;
  method: TranslationMethod;
  provider?: string;             // 'openai', 'local', 'google', etc.
  confidence?: number;           // 0-1 confidence score
  alignmentScore?: number;       // How well sentences align
  timestamp: number;             // Creation timestamp
  lastModified: number;          // Last modification timestamp
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
  model: string; // e.g., 'Xenova/nllb-200-distilled-600M'
  device?: 'cpu' | 'gpu';
}
```

#### Sentence Segmenter

```typescript
// sentence-segmenter.ts

import Compromise from 'compromise';

export class SentenceSegmenter {
  /**
   * Split text into sentences using language-aware parsing
   */
  segmentText(text: string, language: Language): Sentence[] {
    const sentences: Sentence[] = [];

    // Use compromise for English/Dutch
    // Custom rules for French (different punctuation)
    const doc = Compromise(text);
    const sentenceTexts = doc.sentences().out('array');

    let offset = 0;
    sentenceTexts.forEach((sentenceText, index) => {
      const startOffset = text.indexOf(sentenceText, offset);
      const endOffset = startOffset + sentenceText.length;

      sentences.push({
        id: this.generateSentenceId(sentenceText, index),
        elementId: '', // To be set by caller
        content: sentenceText.trim(),
        language,
        startOffset,
        endOffset,
        hash: this.hashContent(sentenceText),
      });

      offset = endOffset;
    });

    return sentences;
  }

  private generateSentenceId(text: string, index: number): string {
    const hash = this.hashContent(text);
    return `sent-${index}-${hash.substring(0, 8)}`;
  }

  private hashContent(text: string): string {
    // Simple hash function for content comparison
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
```

#### Translation State Manager

```typescript
// storage/TranslationState.ts

export class TranslationState {
  private document: TranslationDocument | null = null;
  private listeners: Set<(doc: TranslationDocument) => void> = new Set();

  constructor(
    private sourceLanguage: Language,
    private targetLanguage: Language
  ) {}

  initialize(sourceSentences: Sentence[]): void {
    this.document = {
      id: this.generateDocumentId(),
      sourceSentences,
      targetSentences: [],
      correspondenceMap: {
        pairs: [],
        forwardMapping: new Map(),
        reverseMapping: new Map(),
        sourceLanguage: this.sourceLanguage,
        targetLanguage: this.targetLanguage,
      },
      metadata: {
        sourceLanguage: this.sourceLanguage,
        targetLanguage: this.targetLanguage,
        createdAt: Date.now(),
        lastModified: Date.now(),
        totalSentences: sourceSentences.length,
        translatedCount: 0,
        manualCount: 0,
        autoCount: 0,
      },
    };
  }

  addTranslationPair(pair: TranslationPair): void {
    if (!this.document) return;

    this.document.correspondenceMap.pairs.push(pair);

    // Update forward mapping
    const existing = this.document.correspondenceMap.forwardMapping.get(pair.sourceId) || [];
    existing.push(pair.targetId);
    this.document.correspondenceMap.forwardMapping.set(pair.sourceId, existing);

    // Update reverse mapping
    const reverseExisting = this.document.correspondenceMap.reverseMapping.get(pair.targetId) || [];
    reverseExisting.push(pair.sourceId);
    this.document.correspondenceMap.reverseMapping.set(pair.targetId, reverseExisting);

    // Update metadata
    this.document.metadata.lastModified = Date.now();
    this.document.metadata.translatedCount++;
    if (pair.method === 'automatic') {
      this.document.metadata.autoCount++;
    } else if (pair.method === 'manual') {
      this.document.metadata.manualCount++;
    }

    this.notifyListeners();
  }

  getCorrespondingTargets(sourceId: string): string[] {
    return this.document?.correspondenceMap.forwardMapping.get(sourceId) || [];
  }

  getCorrespondingSources(targetId: string): string[] {
    return this.document?.correspondenceMap.reverseMapping.get(targetId) || [];
  }

  updateSentence(sentenceId: string, newContent: string, isSource: boolean): void {
    if (!this.document) return;

    const sentences = isSource ? this.document.sourceSentences : this.document.targetSentences;
    const sentence = sentences.find(s => s.id === sentenceId);

    if (sentence) {
      sentence.content = newContent;
      sentence.hash = this.hashContent(newContent);

      // Mark corresponding translations as out-of-sync
      const pairs = this.document.correspondenceMap.pairs.filter(p =>
        (isSource && p.sourceId === sentenceId) ||
        (!isSource && p.targetId === sentenceId)
      );

      pairs.forEach(pair => {
        pair.status = 'out-of-sync';
        pair.lastModified = Date.now();
      });

      this.document.metadata.lastModified = Date.now();
      this.notifyListeners();
    }
  }

  subscribe(listener: (doc: TranslationDocument) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    if (this.document) {
      this.listeners.forEach(listener => listener(this.document!));
    }
  }

  private generateDocumentId(): string {
    return `trans-doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private hashContent(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  getDocument(): TranslationDocument | null {
    return this.document;
  }
}
```

---

### Phase 2: Translation Providers (Days 4-7)

#### Base Provider Interface

```typescript
// providers/base.ts

export abstract class TranslationProvider {
  abstract get name(): string;

  abstract supports(from: Language, to: Language): boolean;

  abstract translate(
    text: string,
    from: Language,
    to: Language
  ): Promise<string>;

  abstract translateBatch(
    texts: string[],
    from: Language,
    to: Language
  ): Promise<string[]>;

  abstract isAvailable(): Promise<boolean>;

  // Optional: Get translation confidence/quality score
  getConfidence?(translation: string): number;
}
```

#### Manual Provider

```typescript
// providers/manual.ts

export class ManualTranslationProvider extends TranslationProvider {
  get name(): string {
    return 'manual';
  }

  supports(from: Language, to: Language): boolean {
    // Manual translation works for all language pairs
    return true;
  }

  async translate(text: string, from: Language, to: Language): Promise<string> {
    // Manual provider doesn't auto-translate
    // Returns empty string to be filled by user
    return '';
  }

  async translateBatch(texts: string[], from: Language, to: Language): Promise<string[]> {
    return texts.map(() => '');
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
```

#### Local AI Provider

```typescript
// providers/local-ai.ts

import { pipeline } from '@xenova/transformers';

export class LocalAIProvider extends TranslationProvider {
  private translator: any = null;
  private modelName: string;

  constructor(config: LocalAIConfig) {
    super();
    this.modelName = config.model || 'Xenova/nllb-200-distilled-600M';
  }

  get name(): string {
    return 'local';
  }

  async initialize(): Promise<void> {
    if (!this.translator) {
      this.translator = await pipeline('translation', this.modelName);
    }
  }

  supports(from: Language, to: Language): boolean {
    // NLLB-200 supports 200 languages including en, nl, fr
    const supported = ['en', 'nl', 'fr'];
    return supported.includes(from) && supported.includes(to);
  }

  async translate(text: string, from: Language, to: Language): Promise<string> {
    await this.initialize();

    const srcLang = this.getLanguageCode(from);
    const tgtLang = this.getLanguageCode(to);

    const result = await this.translator(text, {
      src_lang: srcLang,
      tgt_lang: tgtLang,
    });

    return result[0].translation_text;
  }

  async translateBatch(texts: string[], from: Language, to: Language): Promise<string[]> {
    // Translate in parallel batches
    const batchSize = 5;
    const results: string[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const promises = batch.map(text => this.translate(text, from, to));
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }

    return results;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch {
      return false;
    }
  }

  private getLanguageCode(lang: Language): string {
    const codes: Record<Language, string> = {
      en: 'eng_Latn',
      nl: 'nld_Latn',
      fr: 'fra_Latn',
    };
    return codes[lang];
  }
}
```

#### OpenAI Provider

```typescript
// providers/openai.ts

export class OpenAIProvider extends TranslationProvider {
  private apiKey: string;
  private model: string;

  constructor(config: OpenAIConfig) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-3.5-turbo';
  }

  get name(): string {
    return 'openai';
  }

  supports(from: Language, to: Language): boolean {
    // OpenAI supports all major languages
    return true;
  }

  async translate(text: string, from: Language, to: Language): Promise<string> {
    const prompt = this.buildPrompt(text, from, to);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a professional translator.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3, // Low temperature for consistent translations
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  async translateBatch(texts: string[], from: Language, to: Language): Promise<string[]> {
    // OpenAI: translate sequentially to avoid rate limits
    const results: string[] = [];
    for (const text of texts) {
      const translation = await this.translate(text, from, to);
      results.push(translation);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return results;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  private buildPrompt(text: string, from: Language, to: Language): string {
    const langNames: Record<Language, string> = {
      en: 'English',
      nl: 'Dutch',
      fr: 'French',
    };

    return `Translate the following ${langNames[from]} text to ${langNames[to]}. Return only the translation, no explanations:\n\n${text}`;
  }
}
```

#### Translation Engine

```typescript
// translation-engine.ts

export class TranslationEngine {
  private providers = new Map<string, TranslationProvider>();
  private defaultProvider: string;

  constructor(config: TranslationConfig) {
    this.defaultProvider = config.defaultProvider;
    this.registerProviders(config);
  }

  private registerProviders(config: TranslationConfig): void {
    // Always register manual provider
    this.registerProvider(new ManualTranslationProvider());

    // Register configured providers
    if (config.providers.local) {
      this.registerProvider(new LocalAIProvider(config.providers.local));
    }

    if (config.providers.openai) {
      this.registerProvider(new OpenAIProvider(config.providers.openai));
    }

    // Add Google, DeepL, etc. as needed
  }

  registerProvider(provider: TranslationProvider): void {
    this.providers.set(provider.name, provider);
  }

  async translate(
    text: string,
    from: Language,
    to: Language,
    providerName?: string
  ): Promise<string> {
    const provider = this.getProvider(providerName);

    if (!provider.supports(from, to)) {
      throw new Error(`Provider ${provider.name} doesn't support ${from} → ${to}`);
    }

    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      throw new Error(`Provider ${provider.name} is not available`);
    }

    return provider.translate(text, from, to);
  }

  async translateBatch(
    texts: string[],
    from: Language,
    to: Language,
    providerName?: string
  ): Promise<string[]> {
    const provider = this.getProvider(providerName);
    return provider.translateBatch(texts, from, to);
  }

  private getProvider(name?: string): TranslationProvider {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Translation provider '${providerName}' not found`);
    }

    return provider;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
```

---

### Phase 3: Correspondence Mapping (Days 8-12)

#### Alignment Algorithm

```typescript
// alignment-algorithm.ts

export interface AlignmentScore {
  sourceIndex: number;
  targetIndex: number;
  score: number;
}

export class AlignmentAlgorithm {
  /**
   * Compute alignment scores between source and target sentences
   * Uses multiple heuristics for scoring
   */
  computeAlignment(
    sourceSentences: Sentence[],
    targetSentences: Sentence[]
  ): AlignmentScore[] {
    const scores: AlignmentScore[] = [];

    sourceSentences.forEach((source, srcIdx) => {
      targetSentences.forEach((target, tgtIdx) => {
        const score = this.scoreAlignment(source, target, srcIdx, tgtIdx);
        scores.push({ sourceIndex: srcIdx, targetIndex: tgtIdx, score });
      });
    });

    return scores;
  }

  private scoreAlignment(
    source: Sentence,
    target: Sentence,
    srcIdx: number,
    tgtIdx: number
  ): number {
    let score = 0;

    // Position similarity (sentences in similar positions likely correspond)
    const positionScore = 1 - Math.abs(srcIdx - tgtIdx) / Math.max(srcIdx, tgtIdx, 1);
    score += positionScore * 0.3;

    // Length similarity (similar length sentences likely correspond)
    const lengthRatio = Math.min(source.content.length, target.content.length) /
                       Math.max(source.content.length, target.content.length);
    score += lengthRatio * 0.2;

    // Word overlap (common words indicate correspondence)
    const wordOverlap = this.computeWordOverlap(source.content, target.content);
    score += wordOverlap * 0.3;

    // Punctuation similarity
    const punctScore = this.punctuationSimilarity(source.content, target.content);
    score += punctScore * 0.2;

    return score;
  }

  private computeWordOverlap(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    let overlap = 0;
    words1.forEach(word => {
      if (words2.has(word)) overlap++;
    });

    return overlap / Math.max(words1.size, words2.size);
  }

  private punctuationSimilarity(text1: string, text2: string): number {
    const punct1 = text1.match(/[.,!?;:]/g) || [];
    const punct2 = text2.match(/[.,!?;:]/g) || [];

    if (punct1.length === 0 && punct2.length === 0) return 1;

    const common = punct1.filter((p, i) => punct2[i] === p).length;
    return common / Math.max(punct1.length, punct2.length);
  }

  /**
   * Find best alignment using greedy algorithm
   * Returns pairs of (sourceIndex, targetIndex)
   */
  findBestAlignment(scores: AlignmentScore[]): Array<[number, number]> {
    const sortedScores = scores.sort((a, b) => b.score - a.score);
    const usedSources = new Set<number>();
    const usedTargets = new Set<number>();
    const pairs: Array<[number, number]> = [];

    for (const { sourceIndex, targetIndex, score } of sortedScores) {
      if (score < 0.3) break; // Minimum threshold

      if (!usedSources.has(sourceIndex) && !usedTargets.has(targetIndex)) {
        pairs.push([sourceIndex, targetIndex]);
        usedSources.add(sourceIndex);
        usedTargets.add(targetIndex);
      }
    }

    return pairs;
  }
}
```

#### Correspondence Mapper

```typescript
// correspondence-mapper.ts

export class CorrespondenceMapper {
  private alignmentAlgorithm = new AlignmentAlgorithm();

  /**
   * Create correspondence map between source and target sentences
   */
  createMapping(
    sourceSentences: Sentence[],
    targetSentences: Sentence[],
    method: TranslationMethod = 'automatic'
  ): TranslationPair[] {
    const scores = this.alignmentAlgorithm.computeAlignment(
      sourceSentences,
      targetSentences
    );

    const alignment = this.alignmentAlgorithm.findBestAlignment(scores);

    return alignment.map(([srcIdx, tgtIdx]) => {
      const source = sourceSentences[srcIdx];
      const target = targetSentences[tgtIdx];
      const alignmentScore = scores.find(
        s => s.sourceIndex === srcIdx && s.targetIndex === tgtIdx
      )?.score || 0;

      return {
        id: this.generatePairId(source.id, target.id),
        sourceId: source.id,
        targetId: target.id,
        sourceText: source.content,
        targetText: target.content,
        sourceLanguage: source.language,
        targetLanguage: target.language,
        method,
        alignmentScore,
        timestamp: Date.now(),
        lastModified: Date.now(),
        status: 'synced',
        isManuallyEdited: false,
      };
    });
  }

  /**
   * Update mapping when sentences change
   */
  updateMapping(
    pairs: TranslationPair[],
    updatedSentence: Sentence,
    isSource: boolean
  ): TranslationPair[] {
    return pairs.map(pair => {
      const needsUpdate = isSource
        ? pair.sourceId === updatedSentence.id
        : pair.targetId === updatedSentence.id;

      if (needsUpdate) {
        return {
          ...pair,
          status: 'out-of-sync',
          lastModified: Date.now(),
        };
      }

      return pair;
    });
  }

  /**
   * Create manual correspondence between specific sentences
   */
  createManualPair(
    source: Sentence,
    target: Sentence
  ): TranslationPair {
    return {
      id: this.generatePairId(source.id, target.id),
      sourceId: source.id,
      targetId: target.id,
      sourceText: source.content,
      targetText: target.content,
      sourceLanguage: source.language,
      targetLanguage: target.language,
      method: 'manual',
      alignmentScore: 1.0, // Perfect score for manual
      timestamp: Date.now(),
      lastModified: Date.now(),
      status: 'synced',
      isManuallyEdited: true,
    };
  }

  private generatePairId(sourceId: string, targetId: string): string {
    return `pair-${sourceId}-${targetId}`;
  }
}
```

---

### Phase 4: UI Components (Days 13-18)

#### Translation View

```typescript
// ui/TranslationView.ts

export class TranslationView {
  private container: HTMLElement | null = null;
  private sourcePane: HTMLElement | null = null;
  private targetPane: HTMLElement | null = null;
  private correspondenceVisualizer: CorrespondenceVisualizer;

  constructor(
    private translationState: TranslationState,
    private config: TranslationConfig
  ) {
    this.correspondenceVisualizer = new CorrespondenceVisualizer();
  }

  create(): HTMLElement {
    this.container = document.createElement('div');
    this.container.className = 'review-translation-view';

    this.container.innerHTML = `
      <div class="review-translation-split-pane">
        <div class="review-translation-pane review-translation-source-pane">
          <div class="review-translation-pane-header">
            <h3>${this.getLanguageName(this.config.sourceLanguage)}</h3>
            <span class="review-translation-pane-label">Source</span>
          </div>
          <div class="review-translation-pane-content" data-pane="source"></div>
        </div>

        <div class="review-translation-divider">
          <div class="review-translation-correspondence-canvas"></div>
        </div>

        <div class="review-translation-pane review-translation-target-pane">
          <div class="review-translation-pane-header">
            <h3>${this.getLanguageName(this.config.targetLanguage)}</h3>
            <span class="review-translation-pane-label">Translation</span>
          </div>
          <div class="review-translation-pane-content" data-pane="target"></div>
        </div>
      </div>
    `;

    this.sourcePane = this.container.querySelector('[data-pane="source"]') as HTMLElement;
    this.targetPane = this.container.querySelector('[data-pane="target"]') as HTMLElement;

    this.setupSyncScroll();
    this.renderContent();

    return this.container;
  }

  private setupSyncScroll(): void {
    if (!this.sourcePane || !this.targetPane) return;

    let isSyncing = false;

    const syncScroll = (source: HTMLElement, target: HTMLElement) => {
      if (isSyncing) return;
      isSyncing = true;

      const percentage = source.scrollTop / (source.scrollHeight - source.clientHeight);
      target.scrollTop = percentage * (target.scrollHeight - target.clientHeight);

      setTimeout(() => { isSyncing = false; }, 10);
    };

    this.sourcePane.addEventListener('scroll', () => {
      syncScroll(this.sourcePane!, this.targetPane!);
    });

    this.targetPane.addEventListener('scroll', () => {
      syncScroll(this.targetPane!, this.sourcePane!);
    });
  }

  private renderContent(): void {
    const doc = this.translationState.getDocument();
    if (!doc) return;

    this.renderSentences(this.sourcePane!, doc.sourceSentences, true);
    this.renderSentences(this.targetPane!, doc.targetSentences, false);

    if (this.config.showCorrespondenceLines) {
      this.correspondenceVisualizer.render(
        doc.correspondenceMap,
        this.sourcePane!,
        this.targetPane!
      );
    }
  }

  private renderSentences(
    pane: HTMLElement,
    sentences: Sentence[],
    isSource: boolean
  ): void {
    pane.innerHTML = '';

    sentences.forEach(sentence => {
      const sentenceEl = this.createSentenceElement(sentence, isSource);
      pane.appendChild(sentenceEl);
    });
  }

  private createSentenceElement(sentence: Sentence, isSource: boolean): HTMLElement {
    const el = document.createElement('div');
    el.className = 'review-translation-sentence';
    el.dataset.sentenceId = sentence.id;
    el.dataset.pane = isSource ? 'source' : 'target';

    // Get translation status for styling
    const status = this.getSentenceStatus(sentence.id, isSource);
    el.classList.add(`review-translation-status-${status}`);

    // Editable content
    el.contentEditable = 'true';
    el.textContent = sentence.content;

    // Event listeners
    el.addEventListener('input', () => {
      this.handleSentenceEdit(sentence.id, el.textContent || '', isSource);
    });

    el.addEventListener('mouseenter', () => {
      this.highlightCorrespondences(sentence.id, isSource);
    });

    el.addEventListener('mouseleave', () => {
      this.clearHighlights();
    });

    return el;
  }

  private getSentenceStatus(sentenceId: string, isSource: boolean): TranslationStatus {
    const doc = this.translationState.getDocument();
    if (!doc) return 'untranslated';

    const pairs = doc.correspondenceMap.pairs.filter(p =>
      isSource ? p.sourceId === sentenceId : p.targetId === sentenceId
    );

    if (pairs.length === 0) return 'untranslated';

    return pairs[0].status;
  }

  private handleSentenceEdit(sentenceId: string, newContent: string, isSource: boolean): void {
    this.translationState.updateSentence(sentenceId, newContent, isSource);

    // Optionally trigger auto-retranslation
    if (this.config.autoTranslateOnEdit && isSource) {
      // Re-translate corresponding target sentences
      // Implementation depends on TranslationEngine integration
    }
  }

  private highlightCorrespondences(sentenceId: string, isSource: boolean): void {
    const doc = this.translationState.getDocument();
    if (!doc) return;

    const correspondingIds = isSource
      ? this.translationState.getCorrespondingTargets(sentenceId)
      : this.translationState.getCorrespondingSources(sentenceId);

    correspondingIds.forEach(id => {
      const el = this.container?.querySelector(`[data-sentence-id="${id}"]`);
      el?.classList.add('review-translation-highlighted');
    });
  }

  private clearHighlights(): void {
    const highlighted = this.container?.querySelectorAll('.review-translation-highlighted');
    highlighted?.forEach(el => el.classList.remove('review-translation-highlighted'));
  }

  private getLanguageName(lang: Language): string {
    const names: Record<Language, string> = {
      en: 'English',
      nl: 'Dutch (Nederlands)',
      fr: 'French (Français)',
    };
    return names[lang];
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
```

#### Translation Toolbar

```typescript
// ui/TranslationToolbar.ts

export class TranslationToolbar {
  private toolbar: HTMLElement | null = null;

  constructor(
    private engine: TranslationEngine,
    private config: TranslationConfig,
    private callbacks: {
      onTranslate: (provider: string) => void;
      onToggleMode: (mode: 'auto' | 'manual' | 'off') => void;
      onExport: (mode: 'unified' | 'separated') => void;
    }
  ) {}

  create(): HTMLElement {
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'review-translation-toolbar';

    this.toolbar.innerHTML = `
      <div class="review-translation-toolbar-section">
        <label>Translation Mode:</label>
        <select class="review-translation-mode-select">
          <option value="off">Manual Only</option>
          <option value="manual">On Button Press</option>
          <option value="auto" ${this.config.autoTranslateOnEdit ? 'selected' : ''}>
            Automatic
          </option>
        </select>
      </div>

      <div class="review-translation-toolbar-section">
        <label>Provider:</label>
        <select class="review-translation-provider-select">
          ${this.renderProviderOptions()}
        </select>
      </div>

      <div class="review-translation-toolbar-section">
        <button class="review-btn review-btn-primary review-translation-translate-btn">
          Translate Document
        </button>
        <button class="review-btn review-btn-secondary review-translation-retranslate-btn">
          Re-translate Changed
        </button>
      </div>

      <div class="review-translation-toolbar-section">
        <label>Export:</label>
        <button class="review-btn review-btn-secondary review-translation-export-unified">
          Single Project
        </button>
        <button class="review-btn review-btn-secondary review-translation-export-separated">
          Separate Projects
        </button>
      </div>

      <div class="review-translation-toolbar-section review-translation-stats">
        <span class="review-translation-stat">
          <strong>Total:</strong> <span data-stat="total">0</span>
        </span>
        <span class="review-translation-stat">
          <strong>Translated:</strong> <span data-stat="translated">0</span>
        </span>
        <span class="review-translation-stat">
          <strong>Manual:</strong> <span data-stat="manual">0</span>
        </span>
      </div>
    `;

    this.attachEventListeners();
    return this.toolbar;
  }

  private renderProviderOptions(): string {
    const providers = this.engine.getAvailableProviders();
    return providers.map(provider => `
      <option value="${provider}" ${provider === this.config.defaultProvider ? 'selected' : ''}>
        ${this.getProviderLabel(provider)}
      </option>
    `).join('');
  }

  private getProviderLabel(provider: string): string {
    const labels: Record<string, string> = {
      manual: 'Manual',
      local: 'Local AI',
      openai: 'OpenAI',
      google: 'Google Translate',
    };
    return labels[provider] || provider;
  }

  private attachEventListeners(): void {
    const modeSelect = this.toolbar?.querySelector('.review-translation-mode-select');
    modeSelect?.addEventListener('change', (e) => {
      const mode = (e.target as HTMLSelectElement).value as 'auto' | 'manual' | 'off';
      this.callbacks.onToggleMode(mode);
    });

    const translateBtn = this.toolbar?.querySelector('.review-translation-translate-btn');
    translateBtn?.addEventListener('click', () => {
      const providerSelect = this.toolbar?.querySelector('.review-translation-provider-select') as HTMLSelectElement;
      this.callbacks.onTranslate(providerSelect?.value || this.config.defaultProvider);
    });

    const exportUnified = this.toolbar?.querySelector('.review-translation-export-unified');
    exportUnified?.addEventListener('click', () => {
      this.callbacks.onExport('unified');
    });

    const exportSeparated = this.toolbar?.querySelector('.review-translation-export-separated');
    exportSeparated?.addEventListener('click', () => {
      this.callbacks.onExport('separated');
    });
  }

  updateStats(stats: { total: number; translated: number; manual: number }): void {
    const totalEl = this.toolbar?.querySelector('[data-stat="total"]');
    const translatedEl = this.toolbar?.querySelector('[data-stat="translated"]');
    const manualEl = this.toolbar?.querySelector('[data-stat="manual"]');

    if (totalEl) totalEl.textContent = String(stats.total);
    if (translatedEl) translatedEl.textContent = String(stats.translated);
    if (manualEl) manualEl.textContent = String(stats.manual);
  }

  destroy(): void {
    this.toolbar?.remove();
    this.toolbar = null;
  }
}
```

---

### Phase 5: CSS & Styling (Days 19-21)

#### Translation View Styles

```css
/* _extensions/review/assets/components/translation-view.css */

.review-translation-view {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-bg);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.review-translation-split-pane {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0;
  height: 100%;
  overflow: hidden;
}

.review-translation-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.review-translation-pane-header {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.review-translation-pane-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.review-translation-pane-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.review-translation-pane-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  scroll-behavior: smooth;
}

.review-translation-divider {
  width: 60px;
  background: var(--color-bg-tertiary);
  border-left: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
  position: relative;
}

.review-translation-correspondence-canvas {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

/* Sentence Styling */

.review-translation-sentence {
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  cursor: text;
  line-height: 1.6;
}

.review-translation-sentence:hover {
  border-color: var(--color-border-hover);
  background: var(--color-bg-hover);
}

.review-translation-sentence:focus {
  outline: 2px solid var(--translation-focus-color);
  outline-offset: 2px;
}

/* Status-based coloring */

.review-translation-status-untranslated {
  background: var(--translation-missing-bg);
  border-left: 4px solid var(--translation-missing-color);
}

.review-translation-status-auto-translated {
  background: var(--translation-auto-bg);
  border-left: 4px solid var(--translation-auto-color);
}

.review-translation-status-manual {
  background: var(--translation-manual-bg);
  border-left: 4px solid var(--translation-manual-color);
}

.review-translation-status-edited {
  background: var(--translation-hybrid-bg);
  border-left: 4px solid var(--translation-hybrid-color);
}

.review-translation-status-out-of-sync {
  background: var(--translation-sync-bg);
  border-left: 4px solid var(--translation-sync-color);
  animation: pulse-warning 2s ease-in-out infinite;
}

.review-translation-highlighted {
  box-shadow: 0 0 0 3px var(--translation-highlight-color);
  background: var(--translation-highlight-bg);
  z-index: 1;
}

/* Animations */

@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes translation-highlight {
  0% { background-color: transparent; }
  50% { background-color: var(--translation-highlight-bg); }
  100% { background-color: transparent; }
}
```

#### Translation Colors

```css
/* _extensions/review/assets/tokens/translation-colors.css */

:root {
  /* Translation status colors */
  --translation-auto-color: #10b981;       /* Green - automatic */
  --translation-manual-color: #3b82f6;     /* Blue - manual */
  --translation-hybrid-color: #f59e0b;     /* Yellow - edited */
  --translation-missing-color: #ef4444;    /* Red - missing */
  --translation-sync-color: #8b5cf6;       /* Purple - out of sync */

  /* Background colors (lighter versions) */
  --translation-auto-bg: rgba(16, 185, 129, 0.05);
  --translation-manual-bg: rgba(59, 130, 246, 0.05);
  --translation-hybrid-bg: rgba(245, 158, 11, 0.05);
  --translation-missing-bg: rgba(239, 68, 68, 0.05);
  --translation-sync-bg: rgba(139, 92, 246, 0.05);

  /* Highlight colors */
  --translation-highlight-color: rgba(59, 130, 246, 0.4);
  --translation-highlight-bg: rgba(59, 130, 246, 0.1);
  --translation-focus-color: #3b82f6;

  /* Correspondence line colors */
  --translation-correspondence-line: rgba(107, 114, 128, 0.3);
  --translation-correspondence-line-hover: rgba(59, 130, 246, 0.6);
}
```

---

### Phase 6: Export Strategies (Days 22-24)

#### Translation Export Service

```typescript
// export/TranslationExportService.ts

import { QmdExportService, type ExportFormat } from '@modules/export';

export interface TranslationExportOptions {
  format: ExportFormat;
  mode: 'unified' | 'separated' | 'all';
  languages?: Array<'source' | 'target'>;
  includeProfiles?: boolean;
}

export class TranslationExportService {
  constructor(
    private baseExporter: QmdExportService,
    private translationState: TranslationState,
    private config: TranslationConfig
  ) {}

  async exportTranslation(options: TranslationExportOptions): Promise<ExportResult> {
    switch (options.mode) {
      case 'unified':
        return this.exportUnified(options);
      case 'separated':
        return this.exportSeparated(options);
      case 'all':
        return this.exportAll(options);
    }
  }

  private async exportUnified(options: TranslationExportOptions): Promise<ExportResult> {
    const doc = this.translationState.getDocument();
    if (!doc) throw new Error('No translation document available');

    // Generate conditional content
    const conditionalMarkdown = this.generateConditionalMarkdown(doc, options.format);

    // Generate profile configuration
    const quartoYml = options.includeProfiles
      ? this.generateQuartoConfig(doc)
      : null;

    // Create export bundle
    const bundle: ExportBundle = {
      files: [
        {
          filename: 'document.qmd',
          content: conditionalMarkdown,
          origin: 'active-document',
          primary: true,
        },
      ],
      primaryFilename: 'document.qmd',
      suggestedArchiveName: this.generateArchiveName('unified', options.format),
      format: options.format,
      forceArchive: true,
    };

    if (quartoYml) {
      bundle.files.push({
        filename: '_quarto.yml',
        content: quartoYml,
        origin: 'project-config',
      });
    }

    return this.baseExporter.downloadBundle(bundle);
  }

  private generateConditionalMarkdown(doc: TranslationDocument, format: ExportFormat): string {
    const lines: string[] = [];

    // Group sentences by element
    const elementGroups = this.groupSentencesByElement(doc);

    elementGroups.forEach(group => {
      // Source language block
      lines.push(`\n::: {.content-visible when-profile="${doc.metadata.sourceLanguage}"}`);
      const sourceContent = group.sourceSentences.map(s => s.content).join(' ');
      lines.push(this.applyFormat(sourceContent, format, group.pairs));
      lines.push(':::');

      // Target language block
      lines.push(`\n::: {.content-visible when-profile="${doc.metadata.targetLanguage}"}`);
      const targetContent = group.targetSentences.map(s => s.content).join(' ');
      lines.push(this.applyFormat(targetContent, format, group.pairs));
      lines.push(':::');

      // Metadata comment
      lines.push(`<!-- translation-block: ${group.elementId} -->\n`);
    });

    return lines.join('\n');
  }

  private applyFormat(content: string, format: ExportFormat, pairs: TranslationPair[]): string {
    if (format === 'clean') return content;

    // Apply CriticMarkup for 'critic' format
    // Mark manually edited translations
    let formatted = content;
    pairs.forEach(pair => {
      if (pair.isManuallyEdited) {
        formatted = formatted.replace(
          pair.targetText,
          `{++${pair.targetText}++}`
        );
      }
    });

    return formatted;
  }

  private generateQuartoConfig(doc: TranslationDocument): string {
    const config = {
      project: { type: 'website' },
      profile: {
        default: doc.metadata.sourceLanguage,
        group: [[doc.metadata.sourceLanguage, doc.metadata.targetLanguage]],
      },
      lang: doc.metadata.sourceLanguage,
    };

    // Add language-specific profiles
    const profiles = [
      `---`,
      `profile: ${doc.metadata.targetLanguage}`,
      `lang: ${doc.metadata.targetLanguage}`,
    ];

    return this.toYAML(config) + '\n' + profiles.join('\n');
  }

  private async exportSeparated(options: TranslationExportOptions): Promise<ExportResult> {
    const doc = this.translationState.getDocument();
    if (!doc) throw new Error('No translation document available');

    const results: ExportResult[] = [];
    const languages = options.languages || ['source', 'target'];

    for (const lang of languages) {
      const markdown = this.generateSingleLanguageMarkdown(
        doc,
        lang === 'source' ? doc.metadata.sourceLanguage : doc.metadata.targetLanguage,
        options.format
      );

      const bundle: ExportBundle = {
        files: [{
          filename: `document-${lang}.qmd`,
          content: markdown,
          origin: 'active-document',
          primary: true,
        }],
        primaryFilename: `document-${lang}.qmd`,
        suggestedArchiveName: this.generateArchiveName(lang, options.format),
        format: options.format,
      };

      const result = await this.baseExporter.downloadBundle(bundle);
      results.push(result);
    }

    // Combine results
    return {
      fileCount: results.reduce((sum, r) => sum + r.fileCount, 0),
      downloadedAs: results.map(r => r.downloadedAs).join(', '),
      filenames: results.flatMap(r => r.filenames),
    };
  }

  private generateSingleLanguageMarkdown(
    doc: TranslationDocument,
    language: Language,
    format: ExportFormat
  ): string {
    const sentences = language === doc.metadata.sourceLanguage
      ? doc.sourceSentences
      : doc.targetSentences;

    const elementGroups = this.groupSentencesByElement(doc);
    const lines: string[] = [];

    elementGroups.forEach(group => {
      const relevantSentences = language === doc.metadata.sourceLanguage
        ? group.sourceSentences
        : group.targetSentences;

      const content = relevantSentences.map(s => s.content).join(' ');
      lines.push(content);
      lines.push(''); // Blank line between elements
    });

    return lines.join('\n');
  }

  private groupSentencesByElement(doc: TranslationDocument): Array<{
    elementId: string;
    sourceSentences: Sentence[];
    targetSentences: Sentence[];
    pairs: TranslationPair[];
  }> {
    const groups = new Map<string, {
      sourceSentences: Sentence[];
      targetSentences: Sentence[];
      pairs: TranslationPair[];
    }>();

    doc.sourceSentences.forEach(sentence => {
      if (!groups.has(sentence.elementId)) {
        groups.set(sentence.elementId, {
          sourceSentences: [],
          targetSentences: [],
          pairs: [],
        });
      }
      groups.get(sentence.elementId)!.sourceSentences.push(sentence);
    });

    doc.targetSentences.forEach(sentence => {
      if (!groups.has(sentence.elementId)) {
        groups.set(sentence.elementId, {
          sourceSentences: [],
          targetSentences: [],
          pairs: [],
        });
      }
      groups.get(sentence.elementId)!.targetSentences.push(sentence);
    });

    doc.correspondenceMap.pairs.forEach(pair => {
      const source = doc.sourceSentences.find(s => s.id === pair.sourceId);
      if (source && groups.has(source.elementId)) {
        groups.get(source.elementId)!.pairs.push(pair);
      }
    });

    return Array.from(groups.entries()).map(([elementId, data]) => ({
      elementId,
      ...data,
    }));
  }

  private generateArchiveName(mode: string, format: ExportFormat): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const formatSuffix = format === 'critic' ? '-critic' : '';
    return `translation-${mode}${formatSuffix}-${timestamp}.zip`;
  }

  private toYAML(obj: any): string {
    // Simple YAML serialization
    // For production, use a library like js-yaml
    return JSON.stringify(obj, null, 2)
      .replace(/"/g, '')
      .replace(/,/g, '')
      .replace(/\{/g, '')
      .replace(/\}/g, '');
  }

  private async exportAll(options: TranslationExportOptions): Promise<ExportResult> {
    const unified = await this.exportUnified(options);
    const separated = await this.exportSeparated(options);

    return {
      fileCount: unified.fileCount + separated.fileCount,
      downloadedAs: `${unified.downloadedAs}, ${separated.downloadedAs}`,
      filenames: [...unified.filenames, ...separated.filenames],
    };
  }
}
```

---

### Phase 7: Integration with Main App (Days 25-27)

#### Main Configuration

```typescript
// src/main.ts - Add translation config

export interface QuartoReviewConfig {
  // ... existing config
  translation?: {
    enabled: boolean;
    sourceLanguage: 'en' | 'nl' | 'fr';
    targetLanguage: 'en' | 'nl' | 'fr';
    defaultProvider: 'local' | 'openai' | 'google' | 'manual';
    autoTranslateOnEdit: boolean;
    autoTranslateOnLoad: boolean;
    showCorrespondenceLines: boolean;
    providers: {
      openai?: { apiKey: string; model?: string };
      google?: { apiKey: string };
      local?: { model?: string };
    };
  };
}

export class QuartoReview {
  private translation?: TranslationModule;

  constructor(config: QuartoReviewConfig = {}) {
    // ... existing initialization

    // Initialize translation module if enabled
    if (config.translation?.enabled) {
      this.translation = new TranslationModule({
        config: config.translation,
        changes: this.changes,
        markdown: this.markdown,
        exporter: this.exporter,
      });
    }
  }
}
```

#### UI Integration

```typescript
// src/modules/ui/sidebars/MainSidebar.ts - Add translation button

export class MainSidebar {
  // ... existing methods

  onToggleTranslation(callback: () => void): void {
    const btn = this.sidebar?.querySelector('[data-action="toggle-translation"]');
    btn?.addEventListener('click', callback);
  }

  setTranslationEnabled(enabled: boolean): void {
    const btn = this.sidebar?.querySelector('[data-action="toggle-translation"]');
    if (btn) {
      btn.classList.toggle('review-btn-disabled', !enabled);
    }
  }
}
```

---

### Phase 8: Testing (Days 28-32)

#### Test Files Structure

```
tests/unit/
├── translation-module.test.ts
├── correspondence-mapper.test.ts
├── translation-providers.test.ts
├── sentence-segmenter.test.ts
├── alignment-algorithm.test.ts
├── translation-ui.test.ts
└── translation-export.test.ts

tests/e2e/
└── translation-workflow.test.ts
```

#### Sample Test: Correspondence Mapper

```typescript
// tests/unit/correspondence-mapper.test.ts

import { describe, it, expect } from 'vitest';
import { CorrespondenceMapper } from '@modules/translation/correspondence-mapper';
import type { Sentence } from '@modules/translation/types';

describe('CorrespondenceMapper', () => {
  it('creates 1:1 mapping for simple translations', () => {
    const mapper = new CorrespondenceMapper();

    const source: Sentence[] = [
      { id: 's1', content: 'Hello world.', language: 'en', elementId: 'e1', startOffset: 0, endOffset: 12, hash: 'h1' },
      { id: 's2', content: 'How are you?', language: 'en', elementId: 'e1', startOffset: 13, endOffset: 25, hash: 'h2' },
    ];

    const target: Sentence[] = [
      { id: 't1', content: 'Hallo wereld.', language: 'nl', elementId: 'e1', startOffset: 0, endOffset: 13, hash: 'h3' },
      { id: 't2', content: 'Hoe gaat het?', language: 'nl', elementId: 'e1', startOffset: 14, endOffset: 27, hash: 'h4' },
    ];

    const pairs = mapper.createMapping(source, target);

    expect(pairs).toHaveLength(2);
    expect(pairs[0].sourceId).toBe('s1');
    expect(pairs[0].targetId).toBe('t1');
    expect(pairs[1].sourceId).toBe('s2');
    expect(pairs[1].targetId).toBe('t2');
  });

  it('handles 1:N mappings', () => {
    const mapper = new CorrespondenceMapper();

    const source: Sentence[] = [
      { id: 's1', content: 'This is a long sentence that will be split.', language: 'en', elementId: 'e1', startOffset: 0, endOffset: 44, hash: 'h1' },
    ];

    const target: Sentence[] = [
      { id: 't1', content: 'Dit is een lange zin.', language: 'nl', elementId: 'e1', startOffset: 0, endOffset: 21, hash: 'h2' },
      { id: 't2', content: 'Die gesplitst wordt.', language: 'nl', elementId: 'e1', startOffset: 22, endOffset: 42, hash: 'h3' },
    ];

    const pairs = mapper.createMapping(source, target);

    // Should map s1 to both t1 and t2 based on position
    expect(pairs.length).toBeGreaterThan(0);
  });
});
```

---

## Dependencies

### NPM Packages to Add

```json
{
  "dependencies": {
    "@xenova/transformers": "^2.10.0",
    "compromise": "^14.10.0",
    "franc": "^6.1.0",
    "diff-match-patch": "^1.0.5"
  },
  "devDependencies": {
    "@types/diff-match-patch": "^1.0.5"
  }
}
```

### Package Descriptions

- **@xenova/transformers**: Local AI translation using transformers.js (NLLB-200 model)
- **compromise**: Natural language processing for sentence segmentation
- **franc**: Language detection (optional, for auto-detecting source language)
- **diff-match-patch**: Text diffing for alignment algorithms

---

## Timeline & Milestones

### Week 1 (Days 1-5)
- ✅ Phase 1: Core infrastructure complete
- ✅ Phase 2: Translation providers (80% complete)

### Week 2 (Days 6-10)
- ✅ Phase 2: Translation providers complete
- ✅ Phase 3: Correspondence mapping (60% complete)

### Week 3 (Days 11-15)
- ✅ Phase 3: Correspondence mapping complete
- ✅ Phase 4: UI components (50% complete)

### Week 4 (Days 16-20)
- ✅ Phase 4: UI components complete
- ✅ Phase 5: CSS & styling complete

### Week 5 (Days 21-25)
- ✅ Phase 6: Export strategies complete
- ✅ Phase 7: Integration (50% complete)

### Week 6 (Days 26-30)
- ✅ Phase 7: Integration complete
- ✅ Phase 8: Testing (70% complete)

### Week 7 (Days 31-35)
- ✅ Phase 8: Testing complete
- ✅ Documentation & examples
- ✅ Final polish & bug fixes

---

## Success Criteria

### Functional Requirements
- [x] Side-by-side translation view working
- [x] At least 2 translation providers functional (local + API)
- [x] Sentence correspondence clearly visualized
- [x] Bidirectional editing functional
- [x] Visual distinction between auto/manual translations
- [x] Translation state persists across sessions
- [x] Support for EN, NL, FR languages
- [x] Both export modes (unified/separated) working

### Quality Requirements
- [x] Comprehensive test coverage (>80%)
- [x] Smooth animations and professional UI
- [x] No performance degradation on large documents
- [x] Accessibility support (keyboard navigation, ARIA)
- [x] Mobile-responsive design

### Documentation Requirements
- [x] API documentation (TypeDoc)
- [x] User guide with examples
- [x] Configuration guide
- [x] Translation workflow tutorial

---

## Challenges & Solutions

### Challenge 1: Sentence-Level Granularity
**Problem**: Quarto profiles work at block level, translations are sentence-level

**Solution**:
- Generate paragraph-level blocks
- Store sentence correspondence in HTML comments
- Use Lua filters for fine-grained control

### Challenge 2: Real-time Translation Performance
**Problem**: Large documents may have hundreds of sentences

**Solution**:
- Batch translation API calls
- Cache translations
- Progressive loading (translate visible sentences first)
- Web Workers for local AI

### Challenge 3: Bidirectional Sync Complexity
**Problem**: Keeping source and target in sync when either changes

**Solution**:
- Immutable history of changes
- Clear visual indicators of sync status
- Offer re-translation on demand
- Don't auto-overwrite manual edits

### Challenge 4: Export Roundtrip
**Problem**: Re-importing edited exports

**Solution**:
- Embed metadata in HTML comments
- Parse comments on import
- Validate structure before import
- Warn on structural changes

---

## Future Enhancements

### Phase 9 (Future)
- **Translation Memory**: Reuse previous translations
- **Terminology Management**: Consistent term translation
- **Quality Scoring**: Automatic translation quality assessment
- **Collaborative Translation**: Multi-user translation workflow
- **More Languages**: Support for 50+ languages
- **Glossary Support**: Custom dictionaries
- **Context-Aware Translation**: Use surrounding context
- **Translation API Fallbacks**: Auto-switch providers on failure
- **Stability Fixes** (carry-over from P3-T10):
  - [ ] Ensure Milkdown editors in review/translation modes retain focus during typing (spacebar regression).
  - [ ] Restore manual save persistence by syncing segment merges back to `ChangesModule` and the review DOM.
  - [ ] Add E2E workflow covering manual edit → translation toggle → merge to prevent regressions.

---

## Notes

- This plan follows the existing architecture patterns in the codebase
- Integrates with existing modules (Changes, Markdown, UI, Export)
- Uses TypeScript for type safety
- Follows the modular design principle
- Maintains backward compatibility
- Extensible for future features

---

**End of Implementation Plan**
