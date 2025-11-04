import type { ChangesModule } from '@modules/changes';
import type { TranslationSegment } from '../types';
import { createModuleLogger } from '@utils/debug';

export interface TranslationSentenceUpdate {
  elementId: string;
  segments: TranslationSegment[];
}

const logger = createModuleLogger('TranslationChangeAdapter');

export class TranslationChangeAdapter {
  constructor(private readonly changes: ChangesModule) {}

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
      this.changes.edit(update.elementId, mergedContent);
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
