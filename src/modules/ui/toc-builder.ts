/**
 * Table of Contents Builder
 * Builds and maintains a table of contents with change tracking
 */

import { createModuleLogger } from '@utils/debug';
import type { Element as ReviewElement } from '@/types';

const logger = createModuleLogger('TOCBuilder');

export interface TocEntry {
  id: string;
  title: string;
  level: number;
  elementId: string;
  hasChanges: boolean;
  children: TocEntry[];
}

export interface TocSection {
  elementId: string;
  level: number;
}

export class TOCBuilder {
  private tocRoot: TocEntry[] = [];
  private elementIdToTocEntry = new Map<string, TocEntry>();
  private sectionStack: TocEntry[] = [];
  private changedElements = new Set<string>();

  /**
   * Build table of contents from document state
   */
  buildTOC(elements: ReviewElement[]): TocEntry[] {
    this.tocRoot = [];
    this.elementIdToTocEntry.clear();
    this.sectionStack = [];

    elements.forEach((element) => {
      if (element.metadata.type === 'Header') {
        const level = element.metadata.level || 1;
        const title = this.extractTitle(element.content);

        const entry: TocEntry = {
          id: `toc-${element.id}`,
          title,
          level,
          elementId: element.id,
          hasChanges: this.changedElements.has(element.id),
          children: [],
        };

        this.elementIdToTocEntry.set(element.id, entry);

        // Adjust section stack based on level
        while (this.sectionStack.length > 0) {
          const top = this.sectionStack[this.sectionStack.length - 1];
          if (!top || top.level < level) {
            break;
          }
          this.sectionStack.pop();
        }

        const parent = this.sectionStack[this.sectionStack.length - 1];
        if (parent) {
          parent.children.push(entry);
        } else {
          this.tocRoot.push(entry);
        }

        this.sectionStack.push(entry);
      }
    });

    logger.debug('Built TOC with entries', {
      count: this.countEntries(this.tocRoot),
    });
    return this.tocRoot;
  }

  /**
   * Mark an element as changed
   */
  markAsChanged(elementId: string): void {
    this.changedElements.add(elementId);

    // Update TOC entry
    const entry = this.elementIdToTocEntry.get(elementId);
    if (entry) {
      entry.hasChanges = true;
      // Also mark all parent entries as having changes
      this.markParentsAsChanged(entry);
    }
  }

  /**
   * Mark an element as unchanged
   */
  clearChange(elementId: string): void {
    this.changedElements.delete(elementId);

    // Update TOC entry
    const entry = this.elementIdToTocEntry.get(elementId);
    if (entry) {
      entry.hasChanges = false;
    }
  }

  /**
   * Get all sections with changes
   */
  getChangedSections(): TocSection[] {
    const sections: TocSection[] = [];

    const collect = (entries: TocEntry[], depth = 0) => {
      entries.forEach((entry) => {
        if (entry.hasChanges) {
          sections.push({
            elementId: entry.elementId,
            level: entry.level,
          });
        }
        if (entry.children.length > 0) {
          collect(entry.children, depth + 1);
        }
      });
    };

    collect(this.tocRoot);
    return sections;
  }

  /**
   * Render TOC as HTML
   */
  renderTOC(): HTMLElement {
    const container = document.createElement('nav');
    container.className = 'review-toc';
    container.setAttribute('role', 'navigation');
    container.setAttribute('aria-label', 'Table of contents');

    const list = document.createElement('ul');
    list.className = 'review-toc-list';

    this.renderEntries(this.tocRoot, list);
    container.appendChild(list);

    return container;
  }

  /**
   * Clear all changes
   */
  clearAllChanges(): void {
    this.changedElements.clear();
    const clearMarks = (entries: TocEntry[]) => {
      entries.forEach((entry) => {
        entry.hasChanges = false;
        if (entry.children.length > 0) {
          clearMarks(entry.children);
        }
      });
    };
    clearMarks(this.tocRoot);
  }

  /**
   * Sync TOC with current changes
   */
  syncWithChanges(changedElementIds: string[]): void {
    this.clearAllChanges();
    changedElementIds.forEach((id) => this.markAsChanged(id));
  }

  // Private methods

  private extractTitle(content: string): string {
    // Remove markdown formatting and extract plain text
    const source = content ?? '';
    const [firstLine = ''] = source
      .replace(/^#+\s+/, '') // Remove heading markers
      .replace(/\{[^}]*\}/g, '') // Remove attributes like {#id}
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/__(.+?)__/g, '$1') // Remove bold (alt)
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/_(.+?)_/g, '$1') // Remove italic (alt)
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
      .split('\n'); // Take first line only
    const plainText = firstLine.trim();

    return plainText || '(Untitled)';
  }

  private markParentsAsChanged(entry: TocEntry): void {
    // Find and mark parent entries
    const findParent = (entries: TocEntry[]): TocEntry | null => {
      for (const e of entries) {
        if (e.children.includes(entry)) {
          return e;
        }
        const parent = findParent(e.children);
        if (parent) {
          return parent;
        }
      }
      return null;
    };

    let parent = findParent(this.tocRoot);
    while (parent) {
      parent.hasChanges = true;
      parent = findParent(this.tocRoot);
    }
  }

  private countEntries(entries: TocEntry[]): number {
    return entries.reduce(
      (sum, entry) => 1 + this.countEntries(entry.children) + sum,
      0
    );
  }

  private renderEntries(
    entries: TocEntry[],
    container: HTMLUListElement
  ): void {
    entries.forEach((entry) => {
      const li = document.createElement('li');
      li.className = 'review-toc-item';

      const link = document.createElement('a');
      link.href = `#${entry.elementId}`;
      link.className = 'review-toc-link';
      link.textContent = entry.title;

      if (entry.hasChanges) {
        li.classList.add('review-toc-changed');
        const badge = document.createElement('span');
        badge.className = 'review-toc-change-badge';
        badge.setAttribute('aria-label', 'This section has changes');
        badge.textContent = '●';
        link.appendChild(badge);
      }

      li.appendChild(link);

      if (entry.children.length > 0) {
        const childList = document.createElement('ul');
        childList.className = 'review-toc-sublist';
        this.renderEntries(entry.children, childList);
        li.appendChild(childList);
      }

      container.appendChild(li);
    });
  }
}

export default TOCBuilder;
