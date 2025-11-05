import type { ChangesModule, ChangesExtensionContext } from '@modules/changes';
import type { TranslationSegment } from '../types';
import { createModuleLogger } from '@utils/debug';

export interface TranslationSentenceUpdate {
  elementId: string;
  segments: TranslationSegment[];
}

const logger = createModuleLogger('TranslationChangeAdapter');

export class TranslationChangeAdapter {
  private extensionContext: ChangesExtensionContext | null = null;

  constructor(private readonly changes: ChangesModule) {}

  /**
   * Set the extension context for applying changes through the extension API
   */
  setExtensionContext(context: ChangesExtensionContext): void {
    this.extensionContext = context;
    logger.debug('Extension context set for TranslationChangeAdapter');
  }

  applySentenceUpdate(update: TranslationSentenceUpdate): void {
    if (!update.elementId) {
      logger.warn('applySentenceUpdate called without elementId');
      return;
    }

    const mergedContent = this.mergeSegments(update.segments);
    logger.debug('Applying translation sentence update', {
      elementId: update.elementId,
      sentenceCount: update.segments.length,
      mergedLength: mergedContent.length,
    });

    try {
      // Use extension API if available, otherwise fall back to direct edit
      if (this.extensionContext) {
        this.extensionContext.applyChange({
          type: 'edit',
          elementId: update.elementId,
          newContent: mergedContent,
          source: 'translation-extension',
        });
      } else {
        // Fallback for backwards compatibility
        logger.warn('No extension context available, using direct edit');
        this.changes.edit(update.elementId, mergedContent);
      }
    } catch (error) {
      logger.error('Failed to apply translation update to ChangesModule', {
        elementId: update.elementId,
        error,
      });
    }
  }

  applyBatch(updates: TranslationSentenceUpdate[]): void {
    updates.forEach((update) => this.applySentenceUpdate(update));
  }

  private mergeSegments(segments: TranslationSegment[]): string {
    if (!segments.length) {
      return '';
    }

    const ordered = [...segments].sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.id.localeCompare(b.id);
    });
    return ordered.map((segment) => segment.content).join('\n\n');
  }
}
