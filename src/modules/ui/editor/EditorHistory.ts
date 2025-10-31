/**
 * Editor History Manager
 *
 * Manages undo/redo history for individual editor sessions (not document-level changes).
 * This is the session-level history for the Milkdown editor, separate from document-level changes.
 *
 * Consolidated from original editor-history.ts
 */

import { createModuleLogger } from '@utils/debug';

const logger = createModuleLogger('EditorHistory');

export interface HistoryState {
  content: string;
  timestamp: number;
}

/**
 * EditorHistory manages undo/redo states for a single editor session
 */
export class EditorHistory {
  private history: HistoryState[] = [];
  private currentIndex: number = -1;
  private maxStates: number = 50;

  constructor(maxStates = 50) {
    this.maxStates = maxStates;
  }

  /**
   * Push a new state to history
   */
  push(content: string): void {
    // Remove any states after current index (when redo states exist)
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new state
    this.history.push({
      content,
      timestamp: Date.now(),
    });

    this.currentIndex++;

    // Limit history size
    if (this.history.length > this.maxStates) {
      this.history.shift();
      this.currentIndex--;
    }

    logger.debug('History state pushed', {
      stateCount: this.history.length,
      currentIndex: this.currentIndex,
    });
  }

  /**
   * Get previous state (undo)
   */
  undo(): HistoryState | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const state = this.history[this.currentIndex];
      if (!state) {
        logger.debug('Undo state missing', { currentIndex: this.currentIndex });
        return null;
      }
      logger.debug('Undo performed', { currentIndex: this.currentIndex });
      return state;
    }
    logger.debug('Undo not available');
    return null;
  }

  /**
   * Get next state (redo)
   */
  redo(): HistoryState | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      const state = this.history[this.currentIndex];
      if (!state) {
        logger.debug('Redo state missing', { currentIndex: this.currentIndex });
        return null;
      }
      logger.debug('Redo performed', { currentIndex: this.currentIndex });
      return state;
    }
    logger.debug('Redo not available');
    return null;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get current state
   */
  getCurrentState(): HistoryState | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex] ?? null;
    }
    return null;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    logger.debug('History cleared');
  }

  /**
   * Get history statistics
   */
  getStats() {
    return {
      totalStates: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      oldestTimestamp: this.history[0]?.timestamp || null,
      newestTimestamp: this.history[this.history.length - 1]?.timestamp || null,
    };
  }

  /**
   * Export history as JSON (for persistent storage)
   */
  export(): string {
    return JSON.stringify({
      history: this.history,
      currentIndex: this.currentIndex,
    });
  }

  /**
   * Import history from JSON
   */
  import(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      this.history = parsed.history || [];
      this.currentIndex = parsed.currentIndex ?? -1;
      logger.debug('History imported', {
        stateCount: this.history.length,
        currentIndex: this.currentIndex,
      });
      return true;
    } catch (error) {
      logger.error('Failed to import history:', error);
      return false;
    }
  }
}

export default EditorHistory;
