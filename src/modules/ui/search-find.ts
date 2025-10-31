/**
 * Search & Find in Document Module
 * Provides find/search, navigate, and highlight functionality
 */

import { createModuleLogger } from '@utils/debug';
import type { DocumentSearchConfig } from '@/types';
import { escapeHtml } from './shared/utils';
import { UI_CONSTANTS, getAnimationDuration } from './constants';

const logger = createModuleLogger('DocumentSearch');

export interface SearchMatch {
  elementId: string;
  offset: number;
  length: number;
  preview: string;
  fullText: string;
}

export interface SearchOptions {
  query: string;
  caseSensitive: boolean;
  regex: boolean;
  wholeWord: boolean;
}

export class DocumentSearch {
  private config: DocumentSearchConfig;
  private searchPanel: HTMLElement | null = null;
  private matches: SearchMatch[] = [];
  private currentMatchIndex: number = -1;
  private highlightedElements: Set<HTMLElement> = new Set();
  private panelVisible: boolean = false;
  private debounceTimer: number | null = null;
  private removalTimer: number | null = null;
  private keyboardHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(config: DocumentSearchConfig) {
    this.config = config;
    this.setupSearchKeyboardShortcuts();
  }

  /**
   * Setup Cmd+F / Ctrl+F keyboard shortcut
   */
  private setupSearchKeyboardShortcuts(): void {
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
    }

    this.keyboardHandler = (e: KeyboardEvent) => {
      // Check if user is in an editable context where find shouldn't be triggered
      if (this.isEditableTarget(e.target as HTMLElement)) {
        return;
      }

      // Cmd+F or Ctrl+F
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        this.toggleSearchPanel();
      }
    };

    document.addEventListener('keydown', this.keyboardHandler);
  }

  /**
   * Open or close the search panel
   */
  toggleSearchPanel(): void {
    if (this.panelVisible) {
      this.closeSearchPanel();
    } else {
      this.openSearchPanel();
    }
  }

  /**
   * Open the search panel
   */
  openSearchPanel(): void {
    if (this.panelVisible) return;

    this.panelVisible = true;

    if (!this.searchPanel) {
      this.searchPanel = this.createSearchPanel();
    }

    document.body.appendChild(this.searchPanel);

    // Focus input and select all text if any
    requestAnimationFrame(() => {
      const input = this.searchPanel?.querySelector(
        '.review-search-input'
      ) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    });
  }

  /**
   * Close the search panel
   */
  closeSearchPanel(): void {
    if (!this.panelVisible) return;

    this.panelVisible = false;
    this.clearHighlights();

    if (this.searchPanel) {
      this.searchPanel.classList.add('review-search-closing');
      if (this.removalTimer) {
        clearTimeout(this.removalTimer);
      }
      this.removalTimer = window.setTimeout(() => {
        this.searchPanel?.remove();
        this.searchPanel = null;
        this.removalTimer = null;
      }, getAnimationDuration('MEDIUM'));
    }
  }

  /**
   * Create the search panel UI
   */
  private createSearchPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'review-search-panel';
    panel.setAttribute('role', 'search');
    panel.setAttribute('aria-label', 'Search in document');

    panel.innerHTML = `
      <div class="review-search-container">
        <div class="review-search-input-wrapper">
          <input
            type="text"
            class="review-search-input"
            placeholder="Find in document..."
            autocomplete="off"
            spellcheck="false"
            aria-label="Search query"
            aria-describedby="search-counter"
          />
          <button
            class="review-search-btn review-search-close"
            data-action="close"
            title="Close (ESC)"
            aria-label="Close search panel"
          >
            ✕
          </button>
        </div>

        <div class="review-search-controls" aria-label="Search options">
          <label class="review-search-checkbox">
            <input
              type="checkbox"
              data-option="caseSensitive"
              aria-label="Case sensitive search"
            />
            <span aria-hidden="true">Aa</span>
          </label>
          <label class="review-search-checkbox">
            <input
              type="checkbox"
              data-option="wholeWord"
              aria-label="Whole word search"
            />
            <span aria-hidden="true">Ab|</span>
          </label>
          <label class="review-search-checkbox">
            <input
              type="checkbox"
              data-option="regex"
              aria-label="Regular expression search"
            />
            <span aria-hidden="true">.*</span>
          </label>
        </div>

        <div class="review-search-navigation" aria-label="Search navigation">
          <button
            class="review-search-nav-btn"
            data-action="prev"
            title="Previous match (Shift+Enter)"
            aria-label="Go to previous match"
          >
            ▲
          </button>
          <span
            class="review-search-counter"
            id="search-counter"
            role="status"
            aria-live="polite"
            aria-label="Match counter"
          >0/0</span>
          <button
            class="review-search-nav-btn"
            data-action="next"
            title="Next match (Enter)"
            aria-label="Go to next match"
          >
            ▼
          </button>
        </div>

        <div class="review-search-results" aria-live="polite" aria-label="Search results"></div>
      </div>
    `;

    this.attachSearchHandlers(panel);
    return panel;
  }

  /**
   * Attach event handlers to search panel
   */
  private attachSearchHandlers(panel: HTMLElement): void {
    const input = panel.querySelector(
      '.review-search-input'
    ) as HTMLInputElement;
    const closeBtn = panel.querySelector('[data-action="close"]');
    const nextBtn = panel.querySelector('[data-action="next"]');
    const prevBtn = panel.querySelector('[data-action="prev"]');

    // Close button
    closeBtn?.addEventListener('click', () => this.closeSearchPanel());

    // Search input - debounced
    input?.addEventListener('input', () => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = window.setTimeout(() => {
        this.performSearch();
      }, UI_CONSTANTS.SEARCH_DEBOUNCE_DELAY_MS);
    });

    // Keyboard navigation
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          this.previousMatch();
        } else {
          this.nextMatch();
        }
      } else if (e.key === 'Escape') {
        this.closeSearchPanel();
      }
    });

    // Navigation buttons
    nextBtn?.addEventListener('click', () => this.nextMatch());
    prevBtn?.addEventListener('click', () => this.previousMatch());

    // Search options
    panel.querySelectorAll('[data-option]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => this.performSearch());
    });
  }

  /**
   * Perform search with current query and options
   */
  private performSearch(): void {
    try {
      if (!this.searchPanel) return;

      const input = this.searchPanel.querySelector(
        '.review-search-input'
      ) as HTMLInputElement;
      const query = input?.value.trim();

      if (!query) {
        this.matches = [];
        this.currentMatchIndex = -1;
        this.clearHighlights();
        this.updateSearchUI();
        return;
      }

      // Get search options
      const options: SearchOptions = {
        query,
        caseSensitive:
          (
            this.searchPanel.querySelector(
              '[data-option="caseSensitive"]'
            ) as HTMLInputElement
          )?.checked || false,
        regex:
          (
            this.searchPanel.querySelector(
              '[data-option="regex"]'
            ) as HTMLInputElement
          )?.checked || false,
        wholeWord:
          (
            this.searchPanel.querySelector(
              '[data-option="wholeWord"]'
            ) as HTMLInputElement
          )?.checked || false,
      };

      this.matches = this.findMatches(options);
      this.currentMatchIndex = this.matches.length > 0 ? 0 : -1;

      this.clearHighlights();
      this.highlightMatches();
      this.updateSearchUI();

      // Jump to first match
      if (this.matches.length > 0) {
        this.jumpToMatch(0);
      }
    } catch (error) {
      logger.error('Search operation failed:', error);
      this.matches = [];
      this.currentMatchIndex = -1;
      this.updateSearchUI();
    }
  }

  /**
   * Find all matches in document
   */
  private findMatches(options: SearchOptions): SearchMatch[] {
    const matches: SearchMatch[] = [];
    const currentState = this.config.changes.getCurrentState();

    let pattern: RegExp;

    if (options.regex) {
      try {
        pattern = new RegExp(options.query, options.caseSensitive ? 'g' : 'gi');
      } catch (regexError) {
        logger.warn('Invalid regex', {
          query: options.query,
          error: regexError,
        });
        return [];
      }
    } else {
      let escaped = options.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (options.wholeWord) {
        escaped = `\\b${escaped}\\b`;
      }
      pattern = new RegExp(escaped, options.caseSensitive ? 'g' : 'gi');
    }

    // Search through all elements
    currentState.forEach((element: any) => {
      const plainText = this.config.markdown.toPlainText(element.content);
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(plainText)) !== null) {
        const preview = plainText
          .substring(
            Math.max(0, match.index - 30),
            match.index + match[0].length + 30
          )
          .replace(/\n/g, ' ');

        matches.push({
          elementId: element.id,
          offset: match.index,
          length: match[0].length,
          preview,
          fullText: match[0],
        });
      }
    });

    return matches;
  }

  /**
   * Navigate to next match
   */
  nextMatch(): void {
    if (this.matches.length === 0) return;

    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matches.length;
    this.jumpToMatch(this.currentMatchIndex);
  }

  /**
   * Navigate to previous match
   */
  previousMatch(): void {
    if (this.matches.length === 0) return;

    this.currentMatchIndex =
      (this.currentMatchIndex - 1 + this.matches.length) % this.matches.length;
    this.jumpToMatch(this.currentMatchIndex);
  }

  /**
   * Jump to specific match
   */
  private jumpToMatch(index: number): void {
    if (index < 0 || index >= this.matches.length) return;

    const match = this.matches[index];
    if (!match) {
      return;
    }
    const element = document.querySelector(
      `[data-review-id="${match.elementId}"]`
    );

    if (element instanceof HTMLElement) {
      // Scroll into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Flash highlight
      element.classList.add('review-highlight-flash');
      setTimeout(() => {
        element.classList.remove('review-highlight-flash');
      }, UI_CONSTANTS.SEARCH_HIGHLIGHT_DURATION_MS);

      // Highlight the specific match within element
      this.highlightMatchInElement(element, match);
    }

    this.updateSearchUI();
  }

  /**
   * Highlight specific match text in element
   */
  private highlightMatchInElement(
    element: HTMLElement,
    match: SearchMatch
  ): void {
    try {
      // Find text nodes and wrap the match
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node: Text | null;
      let charCount = 0;

      while ((node = walker.nextNode() as Text)) {
        const nodeLength = node.textContent?.length || 0;
        const nodeStart = charCount;
        const nodeEnd = charCount + nodeLength;

        // Check if match overlaps with this node
        if (match.offset < nodeEnd && match.offset + match.length > nodeStart) {
          const startOffset = Math.max(0, match.offset - nodeStart);
          const endOffset = Math.min(
            nodeLength,
            match.offset + match.length - nodeStart
          );

          if (startOffset < endOffset) {
            const before = node.textContent?.substring(0, startOffset) || '';
            const highlighted =
              node.textContent?.substring(startOffset, endOffset) || '';
            const after = node.textContent?.substring(endOffset) || '';

            const span = document.createElement('span');
            span.innerHTML = `${escapeHtml(before)}<mark class="review-search-highlight">${escapeHtml(highlighted)}</mark>${escapeHtml(after)}`;

            node.parentNode?.replaceChild(span, node);
          }
        }

        charCount += nodeLength;
      }
    } catch (error) {
      logger.warn('Failed to highlight match in element:', error);
      // Continue without highlighting if there's an error
    }
  }

  /**
   * Highlight all matches
   */
  private highlightMatches(): void {
    this.matches.forEach((match: SearchMatch, index: number) => {
      const element = document.querySelector(
        `[data-review-id="${match.elementId}"]`
      );
      if (element instanceof HTMLElement) {
        element.classList.add('review-search-has-match');
        if (index === this.currentMatchIndex) {
          element.classList.add('review-search-current-match');
        }
        this.highlightedElements.add(element);
      }
    });
  }

  /**
   * Clear all highlights
   */
  private clearHighlights(): void {
    // Remove highlight marks
    document.querySelectorAll('.review-search-highlight').forEach((mark) => {
      const parent = mark.parentNode;
      while (mark.firstChild) {
        parent?.insertBefore(mark.firstChild, mark);
      }
      parent?.removeChild(mark);
    });

    // Remove CSS classes
    this.highlightedElements.forEach((element) => {
      element.classList.remove('review-search-has-match');
      element.classList.remove('review-search-current-match');
    });

    this.highlightedElements.clear();
  }

  /**
   * Update search UI (counter, buttons, etc.)
   */
  private updateSearchUI(): void {
    if (!this.searchPanel) return;

    const counter = this.searchPanel.querySelector('.review-search-counter');
    if (counter) {
      if (this.matches.length === 0) {
        counter.textContent = '0/0';
        this.searchPanel.classList.add('review-search-no-results');
      } else {
        counter.textContent = `${this.currentMatchIndex + 1}/${this.matches.length}`;
        this.searchPanel.classList.remove('review-search-no-results');
      }
    }

    // Update button states
    const prevBtn = this.searchPanel.querySelector(
      '[data-action="prev"]'
    ) as HTMLButtonElement;
    const nextBtn = this.searchPanel.querySelector(
      '[data-action="next"]'
    ) as HTMLButtonElement;

    if (prevBtn && nextBtn) {
      prevBtn.disabled = this.matches.length === 0;
      nextBtn.disabled = this.matches.length === 0;
    }
  }

  /**
   * Check if target is editable (shouldn't trigger search)
   */
  private isEditableTarget(target: HTMLElement): boolean {
    const editableTypes = ['INPUT', 'TEXTAREA', 'SELECT'];
    if (editableTypes.includes(target.tagName)) {
      return true;
    }

    // Check contenteditable or Milkdown editor
    if (target.contentEditable === 'true' || target.closest('.milkdown')) {
      return true;
    }

    return false;
  }

  /**
   * Destroy the search module and clean up resources
   */
  destroy(): void {
    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
    // Close search panel
    this.closeSearchPanel();
    if (this.removalTimer) {
      clearTimeout(this.removalTimer);
      this.removalTimer = null;
    }
    if (this.searchPanel) {
      this.searchPanel.remove();
      this.searchPanel = null;
    }
    // Clear matches
    this.matches = [];
    this.highlightedElements.clear();
  }
}
