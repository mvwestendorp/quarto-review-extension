/**
 * Translation Merge Tests
 * Tests merging translation edits back to review mode (Phase 1 Task 1.1)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TranslationModule } from '../../src/modules/translation';
import { ChangesModule } from '../../src/modules/changes';
import type { TranslationModuleConfig } from '../../src/modules/translation/types';
import { MarkdownModule } from '../../src/modules/markdown';

describe('Translation Merge (Phase 1 Task 1.1)', () => {
  let translationModule: TranslationModule;
  let changesModule: ChangesModule;
  let markdownModule: MarkdownModule;
  let container: HTMLElement;

  beforeEach(() => {
    // Setup DOM with test elements
    container = document.createElement('div');
    container.innerHTML = `
      <div data-review-id="para-1" data-review-type="Para" data-review-markdown="This is the first paragraph. It has multiple sentences. Really!">
        This is the first paragraph. It has multiple sentences. Really!
      </div>
      <div data-review-id="para-2" data-review-type="Para" data-review-markdown="Another paragraph here. With content.">
        Another paragraph here. With content.
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

    // Create translation module with persistence disabled for testing
    translationModule = new TranslationModule(config, false);
  });

  afterEach(() => {
    document.body.removeChild(container);
    translationModule.destroy();
  });

  describe('mergeToElements()', () => {
    it('should return empty map if translation document is not initialized', () => {
      const result = translationModule.mergeToElements();
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should reconstruct element content from target sentences', async () => {
      // Initialize translation
      await translationModule.initialize();

      // Translate a simple document
      await translationModule.translateDocument('manual');

      // Merge to get element updates
      const result = translationModule.mergeToElements();

      // Should have updates for at least one element
      expect(result.size).toBeGreaterThan(0);
    });

    it('should group sentences by element ID correctly', async () => {
      await translationModule.initialize();

      // Get document for manual manipulation
      const doc = translationModule.getDocument();
      if (!doc) throw new Error('Document not initialized');

      // Manually add target sentences for para-1
      doc.targetSentences.push(
        {
          id: 'trans-sent-1',
          elementId: 'para-1',
          content: 'Dit is de eerste zin.',
          language: 'nl',
          startOffset: 0,
          endOffset: 23,
          hash: 'abc123',
        },
        {
          id: 'trans-sent-2',
          elementId: 'para-1',
          content: 'Het heeft meerdere zinnen.',
          language: 'nl',
          startOffset: 23,
          endOffset: 50,
          hash: 'def456',
        }
      );

      const result = translationModule.mergeToElements();

      // para-1 should have merged content with sentences joined by \n\n
      expect(result.has('para-1')).toBe(true);
      const merged = result.get('para-1');
      expect(merged).toContain('Dit is de eerste zin.');
      expect(merged).toContain('Het heeft meerdere zinnen.');
      expect(merged).toContain('\n\n'); // Double newline separator
    });

    it('should handle single sentence per element', async () => {
      await translationModule.initialize();

      const doc = translationModule.getDocument();
      if (!doc) throw new Error('Document not initialized');

      doc.targetSentences.push({
        id: 'trans-sent-single',
        elementId: 'para-2',
        content: 'Enige vertaalde zin.',
        language: 'nl',
        startOffset: 0,
        endOffset: 20,
        hash: 'xyz789',
      });

      const result = translationModule.mergeToElements();

      expect(result.has('para-2')).toBe(true);
      const merged = result.get('para-2');
      expect(merged).toBe('Enige vertaalde zin.');
    });

    it('should handle multiple sentences per element correctly', async () => {
      await translationModule.initialize();

      const doc = translationModule.getDocument();
      if (!doc) throw new Error('Document not initialized');

      // Add 3 sentences for para-1
      doc.targetSentences.push(
        {
          id: 'trans-1-a',
          elementId: 'para-1',
          content: 'Eerste.',
          language: 'nl',
          startOffset: 0,
          endOffset: 7,
          hash: 'h1',
        },
        {
          id: 'trans-1-b',
          elementId: 'para-1',
          content: 'Tweede.',
          language: 'nl',
          startOffset: 7,
          endOffset: 14,
          hash: 'h2',
        },
        {
          id: 'trans-1-c',
          elementId: 'para-1',
          content: 'Derde.',
          language: 'nl',
          startOffset: 14,
          endOffset: 20,
          hash: 'h3',
        }
      );

      const result = translationModule.mergeToElements();
      const merged = result.get('para-1');

      expect(merged).toBe('Eerste.\n\nTweede.\n\nDerde.');
    });

    it('should return map even if some elements have no translations', async () => {
      await translationModule.initialize();

      const doc = translationModule.getDocument();
      if (!doc) throw new Error('Document not initialized');

      // Only add translation for para-1, not para-2
      doc.targetSentences.push({
        id: 'trans-1',
        elementId: 'para-1',
        content: 'Vertaald.',
        language: 'nl',
        startOffset: 0,
        endOffset: 9,
        hash: 'h1',
      });

      const result = translationModule.mergeToElements();

      expect(result.has('para-1')).toBe(true);
      expect(result.has('para-2')).toBe(false); // para-2 not in translations
    });
  });

  describe('applyMergeToChanges()', () => {
    it('should return false for empty updates', () => {
      const emptyMap = new Map<string, string>();
      const result = translationModule.applyMergeToChanges(
        emptyMap,
        changesModule
      );

      expect(result).toBe(false);
    });

    it('should apply edits to ChangesModule', () => {
      const updates = new Map<string, string>([
        ['para-1', 'Dit is vertalingen voor paragraaf 1.'],
        ['para-2', 'En dit voor paragraaf 2.'],
      ]);

      const result = translationModule.applyMergeToChanges(updates, changesModule);

      expect(result).toBe(true);

      // Verify changes were applied
      const state = changesModule.getCurrentState();
      const para1 = state.find((el) => el.id === 'para-1');
      const para2 = state.find((el) => el.id === 'para-2');

      expect(para1?.content).toBe('Dit is vertalingen voor paragraaf 1.');
      expect(para2?.content).toBe('En dit voor paragraaf 2.');
    });

    it('should skip elements that do not exist in ChangesModule', () => {
      const updates = new Map<string, string>([
        ['para-1', 'Translated content'],
        ['non-existent-para', 'This element does not exist'],
      ]);

      const result = translationModule.applyMergeToChanges(updates, changesModule);

      expect(result).toBe(true); // At least one was applied

      // Only para-1 should be updated
      const state = changesModule.getCurrentState();
      const para1 = state.find((el) => el.id === 'para-1');

      expect(para1?.content).toBe('Translated content');
    });

    it('should skip updates with identical content', () => {
      const originalContent = changesModule.getElementContent('para-1');

      // Try to update with same content
      const updates = new Map<string, string>([
        ['para-1', originalContent],
      ]);

      const result = translationModule.applyMergeToChanges(updates, changesModule);

      // Should return false since no actual changes
      expect(result).toBe(false);
    });

    it('should only apply actual content changes', () => {
      const originalPara2 = changesModule.getElementContent('para-2');

      const updates = new Map<string, string>([
        ['para-1', 'New content for para-1'], // Will change
        ['para-2', originalPara2], // Will NOT change (same content)
      ]);

      const result = translationModule.applyMergeToChanges(updates, changesModule);

      // Should succeed (para-1 changed)
      expect(result).toBe(true);

      const state = changesModule.getCurrentState();
      expect(state.find((el) => el.id === 'para-1')?.content).toBe(
        'New content for para-1'
      );
    });

    it('should create undoable ChangesModule operations', () => {
      const updates = new Map<string, string>([
        ['para-1', 'Translated para 1'],
      ]);

      translationModule.applyMergeToChanges(updates, changesModule);

      // Verify undo is possible
      expect(changesModule.canUndo()).toBe(true);

      // Perform undo
      changesModule.undo();

      // Content should revert
      const state = changesModule.getCurrentState();
      expect(state.find((el) => el.id === 'para-1')?.content).toBe(
        'This is the first paragraph. It has multiple sentences. Really!'
      );
    });

    it('should handle multiple content changes', () => {
      const updates = new Map<string, string>([
        ['para-1', 'Nederlandse tekst voor paragraaf een.'],
        ['para-2', 'Nederlandse tekst voor paragraaf twee.'],
      ]);

      const result = translationModule.applyMergeToChanges(updates, changesModule);

      expect(result).toBe(true);

      // Verify both were updated
      const state = changesModule.getCurrentState();
      expect(state.find((el) => el.id === 'para-1')?.content).toBe(
        'Nederlandse tekst voor paragraaf een.'
      );
      expect(state.find((el) => el.id === 'para-2')?.content).toBe(
        'Nederlandse tekst voor paragraaf twee.'
      );
    });
  });

  describe('Full Merge Workflow', () => {
    it('should merge translation edits back to review mode end-to-end', async () => {
      // Initialize and prepare manual translations
      await translationModule.initialize();

      const doc = translationModule.getDocument();
      if (!doc) throw new Error('Document not initialized');

      // Manually add translated sentences (since manual provider doesn't auto-translate)
      doc.targetSentences.push({
        id: 'trans-manual-1',
        elementId: 'para-1',
        content: 'Dit is de eerste paragraaf. Het heeft meerdere zinnen. Echt!',
        language: 'nl',
        startOffset: 0,
        endOffset: 57,
        hash: 'manual1',
      });

      // Get merge updates
      const elementUpdates = translationModule.mergeToElements();

      // Apply to changes module
      const applied = translationModule.applyMergeToChanges(
        elementUpdates,
        changesModule
      );

      expect(applied).toBe(true);

      // Verify undo works
      expect(changesModule.canUndo()).toBe(true);

      // Undo should restore original
      changesModule.undo();
      const undoneState = changesModule.getCurrentState();

      expect(undoneState.find((el) => el.id === 'para-1')?.content).toContain(
        'This is the first paragraph'
      );
    });

    it('should not lose data during merge process', async () => {
      const originalState = changesModule
        .getCurrentState()
        .map((el) => ({ id: el.id, content: el.content }));

      await translationModule.initialize();

      const doc = translationModule.getDocument();
      if (!doc) throw new Error('Document not initialized');

      // Manually add translated sentences
      doc.targetSentences.push({
        id: 'trans-data-1',
        elementId: 'para-1',
        content: 'Gegevens verlies test.',
        language: 'nl',
        startOffset: 0,
        endOffset: 21,
        hash: 'data1',
      });

      const elementUpdates = translationModule.mergeToElements();
      translationModule.applyMergeToChanges(elementUpdates, changesModule);

      // Undo to restore original
      changesModule.undo();

      const restoredState = changesModule
        .getCurrentState()
        .map((el) => ({ id: el.id, content: el.content }));

      expect(restoredState).toEqual(originalState);
    });
  });
});
