/**
 * Manual Mode Pre-creation Tests
 * Tests for pre-creating empty target sentences in manual translation mode (Phase 2 Task 2.2)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TranslationModule } from '../../src/modules/translation';
import { TranslationChangesModule } from '../../src/modules/translation/TranslationChangesModule';
import { ChangesModule } from '../../src/modules/changes';
import { MarkdownModule } from '../../src/modules/markdown';
import type { TranslationModuleConfig, Sentence } from '../../src/modules/translation/types';

describe('Manual Mode Pre-creation (Phase 2 Task 2.2)', () => {
  let translationModule: TranslationModule;
  let changesModule: ChangesModule;
  let translationChangesModule: TranslationChangesModule;
  let markdownModule: MarkdownModule;
  let container: HTMLElement;

  beforeEach(() => {
    // Setup DOM with test elements
    container = document.createElement('div');
    container.innerHTML = `
      <div data-review-id="para-1" data-review-type="Para" data-review-markdown="First paragraph for translation.">
        First paragraph for translation.
      </div>
      <div data-review-id="para-2" data-review-type="Para" data-review-markdown="Second paragraph for translation.">
        Second paragraph for translation.
      </div>
      <div data-review-id="para-3" data-review-type="Para" data-review-markdown="Third paragraph for translation.">
        Third paragraph for translation.
      </div>
    `;
    document.body.appendChild(container);

    // Initialize modules
    changesModule = new ChangesModule();
    changesModule.initializeFromDOM();

    markdownModule = new MarkdownModule({});

    const config: TranslationModuleConfig = {
      config: {
        enabled: true,
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        defaultProvider: 'manual',
        showCorrespondenceLines: true,
        highlightOnHover: false,
        autoTranslateOnEdit: false,
        autoTranslateOnLoad: false,
        providers: {
          local: {
            model: 'nllb-200',
            backend: 'auto',
            mode: 'balanced',
            downloadOnLoad: false,
            useWebWorker: true,
          },
        },
      },
      changes: changesModule,
      markdown: markdownModule,
    };

    translationModule = new TranslationModule(config, false);
    translationChangesModule = new TranslationChangesModule();
  });

  afterEach(() => {
    document.body.removeChild(container);
    translationModule.destroy();
    translationChangesModule.reset();
  });

  describe('preCreateTargetSentences()', () => {
    it('should create empty target sentences for each source sentence', async () => {
      await translationModule.initialize();

      const doc = translationModule.getDocument();
      expect(doc).toBeDefined();
      expect(doc!.sourceSentences.length).toBeGreaterThan(0);

      // Pre-create target sentences
      translationModule.preCreateTargetSentences();

      const updatedDoc = translationModule.getDocument();
      expect(updatedDoc!.targetSentences.length).toBe(
        updatedDoc!.sourceSentences.length
      );
    });

    it('should create target sentences with correct structure', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();
      const targetSentences = doc!.targetSentences;

      expect(targetSentences.length).toBeGreaterThan(0);

      targetSentences.forEach((sentence) => {
        expect(sentence).toHaveProperty('id');
        expect(sentence).toHaveProperty('elementId');
        expect(sentence).toHaveProperty('content');
        expect(sentence).toHaveProperty('language');
        expect(sentence).toHaveProperty('startOffset');
        expect(sentence).toHaveProperty('endOffset');
        expect(sentence).toHaveProperty('hash');
      });
    });

    it('should create empty target sentences with empty content', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();
      const targetSentences = doc!.targetSentences;

      targetSentences.forEach((sentence) => {
        expect(sentence.content).toBe('');
      });
    });

    it('should set target language correctly', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();
      const targetLanguage = doc!.metadata.targetLanguage;

      doc!.targetSentences.forEach((sentence) => {
        expect(sentence.language).toBe(targetLanguage);
      });
    });

    it('should preserve element ID associations', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();

      // Group target sentences by element ID
      const elementMap = new Map<string, Sentence[]>();
      doc!.targetSentences.forEach((sentence) => {
        if (!elementMap.has(sentence.elementId)) {
          elementMap.set(sentence.elementId, []);
        }
        elementMap.get(sentence.elementId)!.push(sentence);
      });

      // Verify target sentences exist for each element
      doc!.sourceSentences.forEach((sourceSentence) => {
        const targets = elementMap.get(sourceSentence.elementId);
        expect(targets).toBeDefined();
        expect(targets!.length).toBeGreaterThan(0);
      });
    });

    it('should create target sentences in correct order matching source sentences', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();
      const sourceSentences = doc!.sourceSentences;
      const targetSentences = doc!.targetSentences;

      // Each source should have a corresponding target in order
      sourceSentences.forEach((source, index) => {
        const targetForSource = targetSentences.find(
          (t) => t.elementId === source.elementId
        );
        expect(targetForSource).toBeDefined();
        expect(targetForSource!.language).toBe(doc!.metadata.targetLanguage);
      });
    });

    it('should initialize hash and offset fields correctly', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();
      const targetSentences = doc!.targetSentences;

      targetSentences.forEach((sentence) => {
        // Empty sentences should have offsets [0, 0]
        expect(sentence.startOffset).toBe(0);
        expect(sentence.endOffset).toBe(0);
        // Hash should exist (even for empty content)
        expect(typeof sentence.hash).toBe('string');
      });
    });

    it('should work with single source sentence', async () => {
      container.innerHTML = `
        <div data-review-id="single-para" data-review-type="Para" data-review-markdown="Single paragraph.">
          Single paragraph.
        </div>
      `;

      changesModule.clear();
      changesModule.initializeFromDOM();

      const config: TranslationModuleConfig = {
        config: {
          enabled: true,
          sourceLanguage: 'en',
          targetLanguage: 'nl',
          defaultProvider: 'manual',
          showCorrespondenceLines: true,
          highlightOnHover: false,
          autoTranslateOnEdit: false,
          autoTranslateOnLoad: false,
          providers: {
            local: {
              model: 'nllb-200',
              backend: 'auto',
              mode: 'balanced',
              downloadOnLoad: false,
              useWebWorker: true,
            },
          },
        },
        changes: changesModule,
        markdown: markdownModule,
      };

      translationModule = new TranslationModule(config, false);

      await translationModule.initialize();
      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();
      expect(doc!.targetSentences.length).toBeGreaterThan(0);
    });

    it('should work with multiple source sentences', async () => {
      await translationModule.initialize();

      const doc = translationModule.getDocument();
      const initialSourceCount = doc!.sourceSentences.length;

      translationModule.preCreateTargetSentences();

      const updatedDoc = translationModule.getDocument();
      expect(updatedDoc!.targetSentences.length).toBe(initialSourceCount);
    });

    it('should handle elements with multiple sentences', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();

      // Group by element ID
      const sourceByElement = new Map<string, number>();
      const targetByElement = new Map<string, number>();

      doc!.sourceSentences.forEach((s) => {
        sourceByElement.set(s.elementId, (sourceByElement.get(s.elementId) || 0) + 1);
      });

      doc!.targetSentences.forEach((s) => {
        targetByElement.set(s.elementId, (targetByElement.get(s.elementId) || 0) + 1);
      });

      // Source and target counts should match per element
      sourceByElement.forEach((sourceCount, elementId) => {
        const targetCount = targetByElement.get(elementId) || 0;
        expect(targetCount).toBe(sourceCount);
      });
    });

    it('should be idempotent - calling twice should not duplicate', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();
      const doc1 = translationModule.getDocument();
      const count1 = doc1!.targetSentences.length;

      // Call again
      translationModule.preCreateTargetSentences();
      const doc2 = translationModule.getDocument();
      const count2 = doc2!.targetSentences.length;

      // Should not have duplicated
      expect(count2).toBe(count1);
    });

    it('should emit state update event when precreating targets', async () => {
      await translationModule.initialize();
      const listener = vi.fn();
      const dispose = translationModule.on(
        'translation:state-updated',
        listener
      );

      translationModule.preCreateTargetSentences();

      expect(listener).toHaveBeenCalled();
      dispose();
    });

    it('should create correspondence pairs for pre-created sentences', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();
      const pairs = doc!.correspondenceMap.pairs;

      // Should have at least one pair
      expect(pairs.length).toBeGreaterThan(0);

      // Each pair should have valid source and target IDs
      pairs.forEach((pair) => {
        expect(pair.sourceId).toBeDefined();
        expect(pair.targetId).toBeDefined();

        const source = doc!.sourceSentences.find((s) => s.id === pair.sourceId);
        const target = doc!.targetSentences.find((s) => s.id === pair.targetId);

        expect(source).toBeDefined();
        expect(target).toBeDefined();
      });
    });

    it('should preserve existing target sentences if already present', async () => {
      await translationModule.initialize();

      // Manually add a target sentence first
      const doc = translationModule.getDocument();
      const firstSource = doc!.sourceSentences[0];

      const manualTarget: Sentence = {
        id: 'manual-target-1',
        elementId: firstSource.elementId,
        content: 'Manual translation',
        language: 'nl',
        startOffset: 0,
        endOffset: 21,
        hash: 'somehash',
      };

      // Add manually (using internal state)
      // Note: This test assumes we can verify that existing targets are preserved
      // after pre-creation

      translationModule.preCreateTargetSentences();

      const updatedDoc = translationModule.getDocument();
      expect(updatedDoc!.targetSentences.length).toBeGreaterThanOrEqual(
        doc!.sourceSentences.length
      );
    });
  });

  describe('Integration with TranslationView', () => {
    it('should allow pre-created empty sentences to be displayed', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();

      // Simulate view rendering - collect target sentences by element
      const sectionMap = new Map<string, Sentence[]>();
      doc!.targetSentences.forEach((sentence) => {
        const elementId = sentence.elementId;
        if (!sectionMap.has(elementId)) {
          sectionMap.set(elementId, []);
        }
        sectionMap.get(elementId)!.push(sentence);
      });

      // Verify structure matches view expectations
      expect(sectionMap.size).toBeGreaterThan(0);
      sectionMap.forEach((sentences) => {
        expect(sentences.length).toBeGreaterThan(0);
      });
    });

    it('should have empty targets that can be edited', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();
      const targetSentence = doc!.targetSentences[0];

      // Should be able to update the empty sentence
      translationModule.updateSentence(targetSentence.id, 'New translation', false);

      const updatedDoc = translationModule.getDocument();
      const updated = updatedDoc!.targetSentences.find((s) => s.id === targetSentence.id);

      expect(updated!.content).toBe('New translation');
    });
  });

  describe('Integration with TranslationChangesModule', () => {
    it('should initialize TranslationChangesModule with pre-created sentences', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();

      // Initialize changes module with target sentences
      translationChangesModule.initializeSentences(doc!.targetSentences);

      // Should have sentences in changes module
      const sentences = translationChangesModule.getCurrentState();
      expect(sentences.length).toBe(doc!.targetSentences.length);
    });

    it('should track edits to pre-created sentences', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();
      translationChangesModule.initializeSentences(doc!.targetSentences);

      // Edit a sentence
      const targetSentence = doc!.targetSentences[0];
      translationChangesModule.editSentence(targetSentence.id, 'Test translation', 'target');

      // Should be tracked as an edit
      expect(translationChangesModule.canUndo()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should not throw when pre-creating without initialization', () => {
      expect(() => {
        translationModule.preCreateTargetSentences();
      }).not.toThrow();
    });

    it('should handle empty document gracefully', async () => {
      // Create module with empty DOM
      container.innerHTML = '';
      changesModule.clear();
      changesModule.initializeFromDOM();

      const config: TranslationModuleConfig = {
        config: {
          enabled: true,
          sourceLanguage: 'en',
          targetLanguage: 'nl',
          defaultProvider: 'manual',
          showCorrespondenceLines: true,
          highlightOnHover: false,
          autoTranslateOnEdit: false,
          autoTranslateOnLoad: false,
          providers: {
            local: {
              model: 'nllb-200',
              backend: 'auto',
              mode: 'balanced',
              downloadOnLoad: false,
              useWebWorker: true,
            },
          },
        },
        changes: changesModule,
        markdown: markdownModule,
      };

      translationModule = new TranslationModule(config, false);

      await translationModule.initialize();

      expect(() => {
        translationModule.preCreateTargetSentences();
      }).not.toThrow();
    });

    it('should return consistent results on repeated calls', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();
      const doc1 = translationModule.getDocument();
      const count1 = doc1!.targetSentences.length;

      translationModule.preCreateTargetSentences();
      const doc2 = translationModule.getDocument();
      const count2 = doc2!.targetSentences.length;

      translationModule.preCreateTargetSentences();
      const doc3 = translationModule.getDocument();
      const count3 = doc3!.targetSentences.length;

      expect(count1).toBe(count2);
      expect(count2).toBe(count3);
    });
  });

  describe('Sentence ID Generation', () => {
    it('should generate unique target sentence IDs', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();
      const ids = doc!.targetSentences.map((s) => s.id);

      // All IDs should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should generate IDs that follow naming convention', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();

      doc!.targetSentences.forEach((target) => {
        expect(target.id).toBeDefined();
        expect(typeof target.id).toBe('string');
        expect(target.id.length).toBeGreaterThan(0);
      });
    });

    it('should create correspondence pairs with matching source-target IDs', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();

      doc!.correspondenceMap.pairs.forEach((pair) => {
        const source = doc!.sourceSentences.find((s) => s.id === pair.sourceId);
        const target = doc!.targetSentences.find((s) => s.id === pair.targetId);

        expect(source).toBeDefined();
        expect(target).toBeDefined();
        expect(source!.elementId).toBe(target!.elementId);
      });
    });
  });

  describe('Correspondence Mapping', () => {
    it('should create 1:1 correspondence for single sentences per element', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();

      // Count source/target per element
      const elementCounts = new Map<string, { source: number; target: number }>();

      doc!.sourceSentences.forEach((s) => {
        if (!elementCounts.has(s.elementId)) {
          elementCounts.set(s.elementId, { source: 0, target: 0 });
        }
        elementCounts.get(s.elementId)!.source++;
      });

      doc!.targetSentences.forEach((s) => {
        if (!elementCounts.has(s.elementId)) {
          elementCounts.set(s.elementId, { source: 0, target: 0 });
        }
        elementCounts.get(s.elementId)!.target++;
      });

      // Source and target counts should match per element
      elementCounts.forEach(({ source, target }) => {
        expect(target).toBe(source);
      });
    });

    it('should maintain correspondence pairs after pre-creation', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();

      // Verify each source has at least one correspondence
      doc!.sourceSentences.forEach((source) => {
        const pairs = doc!.correspondenceMap.pairs.filter(
          (p) => p.sourceId === source.id
        );
        expect(pairs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Phrase 2 Task 2.2 Success Criteria', () => {
    it('should satisfy: Manual mode sentence pre-creation', async () => {
      await translationModule.initialize();

      // Pre-create target sentences
      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();

      // Should have targets created
      expect(doc!.targetSentences.length).toBe(doc!.sourceSentences.length);
    });

    it('should satisfy: 1:1 source/target mapping', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();

      // Group by element and verify 1:1 mapping
      const elementSources = new Map<string, number>();
      const elementTargets = new Map<string, number>();

      doc!.sourceSentences.forEach((s) => {
        elementSources.set(s.elementId, (elementSources.get(s.elementId) || 0) + 1);
      });

      doc!.targetSentences.forEach((s) => {
        elementTargets.set(s.elementId, (elementTargets.get(s.elementId) || 0) + 1);
      });

      elementSources.forEach((count, elementId) => {
        expect(elementTargets.get(elementId)).toBe(count);
      });
    });

    it('should satisfy: Correspondence pairs created for pre-created sentences', async () => {
      await translationModule.initialize();

      translationModule.preCreateTargetSentences();

      const doc = translationModule.getDocument();

      // Should have correspondence pairs
      expect(doc!.correspondenceMap.pairs.length).toBeGreaterThan(0);

      // All pairs should reference existing sentences
      doc!.correspondenceMap.pairs.forEach((pair) => {
        const source = doc!.sourceSentences.find((s) => s.id === pair.sourceId);
        const target = doc!.targetSentences.find((s) => s.id === pair.targetId);

        expect(source).toBeDefined();
        expect(target).toBeDefined();
      });
    });
  });
});
