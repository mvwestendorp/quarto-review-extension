import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TranslationController } from '@modules/ui/translation/TranslationController';
import { ChangesModule } from '@modules/changes';
import { MarkdownModule } from '@modules/markdown';

describe('TranslationController integration', () => {
  const DOCUMENT_ID = 'translation-controller-test-doc';
  const ORIGINAL_CONTENT = 'Hello world.';
  let container: HTMLElement;
  let reviewContainer: HTMLElement;
  let controller: TranslationController;
  let changesModule: ChangesModule;
  let markdownModule: MarkdownModule;

  beforeEach(async () => {
    localStorage.clear();
    document.body.innerHTML = '';
    reviewContainer = document.createElement('div');
    reviewContainer.innerHTML = `
      <div data-review-id="para-1" data-review-type="Para" data-review-markdown="${ORIGINAL_CONTENT}">
        ${ORIGINAL_CONTENT}
      </div>
    `;
    document.body.appendChild(reviewContainer);

    container = document.createElement('div');
    document.body.appendChild(container);

    changesModule = new ChangesModule();
    changesModule.initializeFromDOM();

    markdownModule = new MarkdownModule({});

    controller = new TranslationController({
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
        changes: changesModule,
        markdown: markdownModule,
        documentId: DOCUMENT_ID,
      },
      onNotification: () => {
        /* no-op in tests */
      },
    });

    await controller.initialize();
  });

  afterEach(() => {
    controller.destroy();
    reviewContainer.remove();
    container.remove();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('resets translation edits with undo/redo', async () => {
    const translationModule = controller['translationModule'];
    const doc = translationModule.getDocument();
    expect(doc).toBeTruthy();
    const targetSentence = doc?.targetSentences[0];
    expect(targetSentence).toBeTruthy();
    if (!targetSentence) {
      return;
    }

    const sentenceId = targetSentence.id;
    const editedContent = 'Dit is een handmatige vertaling.';
    expect(controller.getChangesModule().getSentence(sentenceId)).toBeDefined();

    // Perform edit via controller hook
    // @ts-expect-error accessing private method for controlled test
    await controller.handleTargetSentenceEdit(sentenceId, editedContent);

    const updatedDoc = translationModule.getDocument();
    const updatedTarget = updatedDoc?.targetSentences.find(
      (s) => s.id === sentenceId
    );
    expect(updatedTarget?.content).toBe(editedContent);
    expect(controller.getChangesModule().isSentenceEdited(sentenceId)).toBe(true);
    const elementBeforeUndo = controller['config'].translationModuleConfig.changes.getElementById(
      'para-1'
    );
    expect(elementBeforeUndo?.content).toContain('Dit is een handmatige vertaling.');

    const undoResult = controller.undo();
    expect(undoResult).toBe(true);

    const afterUndo = translationModule.getDocument();
    const undoneTarget = afterUndo?.targetSentences.find(
      (s) => s.id === sentenceId
    );
    expect(undoneTarget?.content).toBe('');
    expect(controller.getChangesModule().isSentenceEdited(sentenceId)).toBe(
      false
    );
    const elementAfterUndo =
      controller['config'].translationModuleConfig.changes.getElementById(
        'para-1'
      );
    expect(elementAfterUndo?.content).toBe('');

    const redoResult = controller.redo();
    expect(redoResult).toBe(true);

    const afterRedo = translationModule.getDocument();
    const redoneTarget = afterRedo?.targetSentences.find(
      (s) => s.id === sentenceId
    );
    expect(redoneTarget?.content).toBe(editedContent);
    const elementAfterRedo = controller['config'].translationModuleConfig.changes.getElementById(
      'para-1'
    );
    expect(elementAfterRedo?.content).toContain('Dit is een handmatige vertaling.');
  });

  it('restores saved translations on subsequent initialization', async () => {
    const translationModule = controller['translationModule'];
    const doc = translationModule.getDocument();
    const targetSentence = doc?.targetSentences[0];
    expect(targetSentence).toBeDefined();
    if (!targetSentence) {
      return;
    }

    const sentenceId = targetSentence.id;
    const editedContent = 'Bewaar deze vertaling.';

    // @ts-expect-error accessing private method for controlled test
    await controller.handleTargetSentenceEdit(sentenceId, editedContent);
    translationModule.saveToStorageNow();

    // Reset review document to original content to simulate fresh load
    controller['config'].translationModuleConfig.changes.edit(
      'para-1',
      ORIGINAL_CONTENT
    );

    controller.destroy();
    reviewContainer.remove();
    container.remove();

    // Recreate DOM for second initialization
    container = document.createElement('div');
    document.body.appendChild(container);

    reviewContainer = document.createElement('div');
    reviewContainer.innerHTML = `
      <div data-review-id="para-1" data-review-type="Para" data-review-markdown="${ORIGINAL_CONTENT}">
        ${ORIGINAL_CONTENT}
      </div>
    `;
    document.body.appendChild(reviewContainer);

    const freshChangesModule = new ChangesModule();
    freshChangesModule.initializeFromDOM();
    const freshMarkdownModule = new MarkdownModule({});

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
        changes: freshChangesModule,
        markdown: freshMarkdownModule,
        documentId: DOCUMENT_ID,
      },
      onNotification: () => {
        /* no-op */
      },
    });

    await secondController.initialize();

    const restoredDoc = secondController['translationModule'].getDocument();
    const restoredSentence = restoredDoc?.targetSentences.find(
      (s) => s.id === sentenceId
    );
    expect(restoredSentence?.content).toBe(editedContent);

    secondController['translationModule'].clearStoredTranslation();
    controller = secondController;
  });

  it('persists source sentence edits to the review document', async () => {
    const translationModule = controller['translationModule'];
    const doc = translationModule.getDocument();
    expect(doc?.sourceSentences.length).toBeGreaterThan(0);
    const sourceSentence = doc?.sourceSentences[0];
    expect(sourceSentence).toBeDefined();
    if (!sourceSentence) {
      return;
    }

    const updatedSourceContent = 'Updated source sentence content.';
    const initialElement =
      controller['config'].translationModuleConfig.changes.getElementById(
        sourceSentence.elementId
      );
    expect(initialElement?.content).toBe(ORIGINAL_CONTENT);

    // @ts-expect-error accessing private method for controlled test
    await controller.handleSourceSentenceEdit(
      sourceSentence.id,
      updatedSourceContent
    );

    const updatedElement =
      controller['config'].translationModuleConfig.changes.getElementById(
        sourceSentence.elementId
      );
    expect(updatedElement?.content).toContain(updatedSourceContent);
  });
});
