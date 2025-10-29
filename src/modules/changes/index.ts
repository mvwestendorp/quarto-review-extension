/**
 * Changes Module
 * Manages document operations and reconstruction
 */

import type {
  Element,
  Operation,
  OperationType,
  OperationData,
  InsertData,
  DeleteData,
  EditData,
  MoveData,
  ElementMetadata,
} from '@/types';
import {
  generateChanges,
  changesToCriticMarkup,
  stripCriticMarkup,
} from './converters';

export class ChangesModule {
  private originalElements: Element[] = [];
  private operations: Operation[] = [];
  private redoStack: Operation[] = [];
  private saved: boolean = true;

  /**
   * Initialize from DOM - parse HTML to extract original elements
   */
  public initializeFromDOM(): void {
    // Select all elements with data-review-id (includes .review-editable divs and header sections)
    const editableElements = document.querySelectorAll('[data-review-id]');

    this.originalElements = Array.from(editableElements).map((elem) => {
      const id = elem.getAttribute('data-review-id') || '';
      const type = elem.getAttribute('data-review-type') || 'Para';
      const level = elem.getAttribute('data-review-level');
      const sourceLine = elem.getAttribute('data-review-source-line');
      const sourceColumn = elem.getAttribute('data-review-source-column');

      const metadata: ElementMetadata = {
        type: type as Element['metadata']['type'],
        level: level ? parseInt(level, 10) : undefined,
        attributes: this.extractAttributes(elem),
        classes: this.extractClasses(elem),
      };

      const content = this.extractMarkdownContent(elem);

      const element: Element = {
        id,
        content,
        metadata,
      };

      if (sourceLine) {
        element.sourcePosition = {
          line: parseInt(sourceLine, 10),
          column: sourceColumn ? parseInt(sourceColumn, 10) : 0,
        };
      }

      return element;
    });
  }

  /**
   * Extract markdown content from HTML element
   *
   * This function ONLY reads from the embedded data-review-markdown attribute.
   * It does NOT parse or convert HTML to markdown.
   *
   * If the attribute is missing, it throws an error (document not rendered with extension).
   */
  private extractMarkdownContent(elem: globalThis.Element): string {
    const embeddedMarkdown = elem.getAttribute('data-review-markdown');

    if (!embeddedMarkdown) {
      const id = elem.getAttribute('data-review-id') || 'unknown';
      throw new Error(
        `Missing data-review-markdown attribute on element ${id}. ` +
          `The document was not rendered with the Quarto review extension. ` +
          `Please render with: quarto render --filter review`
      );
    }

    const markdown = this.unescapeHtml(embeddedMarkdown);
    return this.removeNestedReviewWrappers(markdown);
  }

  /**
   * Unescape HTML entities
   */
  private unescapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
    };
    return text.replace(
      /&amp;|&lt;|&gt;|&quot;|&#39;/g,
      (entity) => map[entity] ?? entity
    );
  }

  /**
   * Extract attributes from element
   */
  private extractAttributes(elem: globalThis.Element): Record<string, string> {
    const attrs: Record<string, string> = {};
    const child = elem.querySelector(':scope > *:not([data-review-id])');

    if (child) {
      Array.from(child.attributes).forEach((attr) => {
        if (!attr.name.startsWith('data-review-')) {
          attrs[attr.name] = attr.value;
        }
      });
    }

    return attrs;
  }

  /**
   * Extract classes from element
   */
  private extractClasses(elem: globalThis.Element): string[] {
    const child = elem.querySelector(':scope > *:not([data-review-id])');
    if (!child) return [];

    return Array.from(child.classList).filter(
      (cls) => !cls.startsWith('review-')
    );
  }

  /**
   * Add an operation
   */
  public addOperation(
    type: OperationType,
    elementId: string,
    data: OperationData,
    userId?: string
  ): void {
    const operation: Operation = {
      id: this.generateOperationId(),
      type,
      elementId,
      timestamp: Date.now(),
      userId,
      data,
    };

    this.operations.push(operation);
    this.redoStack = []; // Clear redo stack when new operation is added
    this.saved = false;
  }

  /**
   * Insert a new element
   */
  public insert(
    content: string,
    metadata: ElementMetadata,
    position: InsertData['position'],
    userId?: string,
    options?: { parentId?: string; generated?: boolean }
  ): string {
    const elementId = `temp-${this.generateOperationId()}`;
    const data: InsertData = {
      type: 'insert',
      content,
      metadata,
      position,
      parentId: options?.parentId,
      generated: options?.generated,
    };

    this.addOperation('insert', elementId, data, userId);
    return elementId;
  }

  public replaceElementWithSegments(
    elementId: string,
    segments: { content: string; metadata: ElementMetadata }[]
  ): { elementIds: string[]; removedIds: string[] } {
    const element = this.findElement(elementId);
    if (!element) {
      throw new Error(`Element ${elementId} not found`);
    }

    const normalizedSegments =
      segments.length > 0
        ? segments
        : [
            {
              content: '',
              metadata: element.metadata,
            },
          ];

    const existingGeneratedIds = this.getGeneratedSegmentIds(elementId);
    const resultIds: string[] = [];
    const removedIds: string[] = [];

    const [firstSegment, ...tailSegments] = normalizedSegments;
    if (!firstSegment) {
      return { elementIds: resultIds, removedIds };
    }
    this.edit(elementId, firstSegment.content, undefined, firstSegment.metadata);
    resultIds.push(elementId);

    let lastId = elementId;

    const reuseCount = Math.min(tailSegments.length, existingGeneratedIds.length);

    for (let i = 0; i < reuseCount; i++) {
      const segment = tailSegments[i];
      if (!segment) {
        continue;
      }
      const existingId = existingGeneratedIds[i];
      if (!existingId) {
        continue;
      }
      this.edit(existingId, segment.content, undefined, segment.metadata);
      resultIds.push(existingId);
      lastId = existingId;
    }

    for (let i = reuseCount; i < tailSegments.length; i++) {
      const segment = tailSegments[i];
      if (!segment) {
        continue;
      }
      const newId = this.insert(
        segment.content,
        segment.metadata,
        { after: lastId },
        undefined,
        { parentId: elementId, generated: true }
      );
      resultIds.push(newId);
      lastId = newId;
    }

    for (let i = reuseCount; i < existingGeneratedIds.length; i++) {
      const id = existingGeneratedIds[i];
      if (!id) continue;
      this.delete(id);
      removedIds.push(id);
    }

    return { elementIds: resultIds, removedIds };
  }

  /**
   * Delete an element
   */
  public delete(elementId: string, userId?: string): void {
    const element = this.findElement(elementId);
    if (!element) {
      throw new Error(`Element ${elementId} not found`);
    }

    const data: DeleteData = {
      type: 'delete',
      originalContent: element.content,
      originalMetadata: element.metadata,
    };

    this.addOperation('delete', elementId, data, userId);
  }

  /**
   * Edit an element
   */
  public edit(
    elementId: string,
    newContent: string,
    userId?: string,
    newMetadata?: ElementMetadata
  ): void {
    const element = this.findElement(elementId);
    if (!element) {
      throw new Error(`Element ${elementId} not found`);
    }

    const oldContent = element.content;
    const metadataChanged =
      newMetadata &&
      (newMetadata.type !== element.metadata.type ||
        newMetadata.level !== element.metadata.level ||
        JSON.stringify(newMetadata.attributes ?? {}) !==
          JSON.stringify(element.metadata.attributes ?? {}) ||
        JSON.stringify(newMetadata.classes ?? []) !==
          JSON.stringify(element.metadata.classes ?? []));

    if (!metadataChanged && oldContent === newContent) return;

    // Generate character-level changes
    const changes = generateChanges(oldContent, newContent);

    const data: EditData = {
      type: 'edit',
      oldContent,
      newContent,
      changes,
    };

    if (metadataChanged) {
      data.oldMetadata = element.metadata;
      data.newMetadata = newMetadata;
    }

    this.addOperation('edit', elementId, data, userId);
  }

  /**
   * Move an element
   */
  public move(
    elementId: string,
    fromPosition: number,
    toPosition: number,
    userId?: string
  ): void {
    const data: MoveData = {
      type: 'move',
      fromPosition,
      toPosition,
    };

    this.addOperation('move', elementId, data, userId);
  }

  /**
   * Undo last operation
   */
  public undo(): boolean {
    const operation = this.operations.pop();
    if (!operation) return false;

    this.redoStack.push(operation);
    this.saved = false;
    return true;
  }

  public canUndo(): boolean {
    return this.operations.length > 0;
  }

  /**
   * Redo last undone operation
   */
  public redo(): boolean {
    const operation = this.redoStack.pop();
    if (!operation) return false;

    this.operations.push(operation);
    this.saved = false;
    return true;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get current state by applying operations to original elements
   */
  public getCurrentState(): Element[] {
    let elements = [...this.originalElements];

    for (const operation of this.operations) {
      elements = this.applyOperation(elements, operation);
    }

    return elements;
  }

  /**
   * Get element by ID from current state
   * Returns the element with all operations applied
   */
  public getElementById(id: string): Element | null {
    const element = this.findElement(id);
    return element || null;
  }

  /**
   * Get element content by ID from current state
   * Returns the markdown content with all operations applied
   */
  public getElementContent(id: string): string {
    const element = this.getElementById(id);
    if (!element) {
      throw new Error(`Element ${id} not found`);
    }
    return element.content;
  }

  /**
   * Get element content with tracked changes as CriticMarkup
   * Shows edits as {++additions++} and {--deletions--}
   */
  public getElementContentWithTrackedChanges(id: string): string {
    const element = this.getElementById(id);
    if (!element) {
      throw new Error(`Element ${id} not found`);
    }
    const baseline = this.getElementBaseline(id);
    const targetContent = element.content;

    const relevantOperations = this.operations.filter(
      (op) => op.elementId === id
    );

    // If no operations touched this element and baseline matches current, return content
    if (relevantOperations.length === 0 && baseline === targetContent) {
      return targetContent;
    }

    const changes = generateChanges(baseline, targetContent);
    if (changes.length === 0) {
      return targetContent;
    }

    return changesToCriticMarkup(baseline, changes);
  }

  /**
   * Apply a single operation to element array
   */
  private applyOperation(elements: Element[], operation: Operation): Element[] {
    switch (operation.type) {
      case 'insert':
        return this.applyInsert(elements, operation);
      case 'delete':
        return this.applyDelete(elements, operation);
      case 'edit':
        return this.applyEdit(elements, operation);
      case 'move':
        return this.applyMove(elements, operation);
      default:
        return elements;
    }
  }

  /**
   * Apply insert operation
   */
  private applyInsert(elements: Element[], operation: Operation): Element[] {
    const data = operation.data as InsertData;
    const newElement: Element = {
      id: operation.elementId,
      content: data.content,
      metadata: data.metadata,
    };

    // Find insertion point
    if (data.position.after) {
      const index = elements.findIndex((e) => e.id === data.position.after);
      if (index !== -1) {
        elements.splice(index + 1, 0, newElement);
      }
    } else if (data.position.before) {
      const index = elements.findIndex((e) => e.id === data.position.before);
      if (index !== -1) {
        elements.splice(index, 0, newElement);
      }
    } else {
      elements.push(newElement);
    }

    return elements;
  }

  private getGeneratedSegmentIds(parentId: string): string[] {
    if (!parentId) {
      return [];
    }

    const activeIds = new Set<string>();

    for (const op of this.operations) {
      if (op.type === 'insert') {
        const insertData = op.data as InsertData;
        if (insertData.parentId === parentId) {
          activeIds.add(op.elementId);
        }
      } else if (op.type === 'delete') {
        if (activeIds.has(op.elementId)) {
          activeIds.delete(op.elementId);
        }
      }
    }

    if (activeIds.size === 0) {
      return [];
    }

    const state = this.getCurrentState();
    const parentIndex = state.findIndex((el) => el.id === parentId);
    if (parentIndex === -1) {
      return [];
    }

    const orderedIds: string[] = [];
    for (let i = parentIndex + 1; i < state.length; i++) {
      const candidate = state[i];
      if (!candidate) {
        break;
      }
      const candidateId = candidate.id;
      if (!activeIds.has(candidateId)) {
        break;
      }
      orderedIds.push(candidateId);
    }

    return orderedIds;
  }

  /**
   * Apply delete operation
   */
  private applyDelete(elements: Element[], operation: Operation): Element[] {
    return elements.filter((e) => e.id !== operation.elementId);
  }

  /**
   * Apply edit operation
   */
  private applyEdit(elements: Element[], operation: Operation): Element[] {
    const data = operation.data as EditData;
    return elements.map((e) => {
      if (e.id === operation.elementId) {
        const updated: Element = { ...e, content: data.newContent };
        if (data.newMetadata) {
          updated.metadata = data.newMetadata;
        }
        return updated;
      }
      return e;
    });
  }

  /**
   * Apply move operation
   */
  private applyMove(elements: Element[], operation: Operation): Element[] {
    const data = operation.data as MoveData;
    const element = elements[data.fromPosition];

    if (!element) return elements;

    elements.splice(data.fromPosition, 1);
    elements.splice(data.toPosition, 0, element);

    return elements;
  }

  /**
   * Convert current state to markdown
   *
   * This function reconstructs the full document markdown by:
   * 1. Getting current state (original elements + applied operations)
   * 2. Using the embedded markdown from each element (stored in e.content)
   * 3. Joining elements with blank lines
   *
   * NO HTML parsing or conversion happens here - all content is already markdown.
   * The markdown comes from:
   * - Original: data-review-markdown attributes (set by Lua filter)
   * - Edits: User-provided markdown strings
   *
   * NOTE: This may include CriticMarkup annotations from comments/highlights.
   * Use toCleanMarkdown() for Git exports to strip CriticMarkup.
   */
  public toMarkdown(): string {
    const elements = this.getCurrentState();
    return elements.map((e) => e.content).join('\n\n');
  }

  /**
   * Convert current state to clean markdown suitable for Git commits
   * Strips all CriticMarkup annotations (comments, highlights, etc.)
   * and applies tracked changes in accept mode.
   */
  public toCleanMarkdown(): string {
    const elements = this.getCurrentState();
    return elements
      .map((e) => stripCriticMarkup(e.content, true))
      .join('\n\n');
  }

  /**
   * Remove nested review-editable wrappers (Pandoc div fences) that appear inside lists.
   * These wrappers are only present to keep Lua filter metadata and should not surface in the editor.
   */
  private removeNestedReviewWrappers(markdown: string): string {
    if (!markdown.includes(':::')) {
      return markdown;
    }

    const pattern =
      /((?:\r?\n)?)([ \t]*):::\s*\{[^}]*review-editable[^}]*\}[ \t]*(?:\r?\n)?([\s\S]*?)(?:\r?\n)?[ \t]*:::[^\S\r\n]*(?:\r?\n)?/g;

    let cleaned = markdown;
    let previous: string;
    do {
      previous = cleaned;
      cleaned = cleaned.replace(pattern, (_match, leading, indent, inner) => {
        const lines = inner.split(/\r?\n/);
        let minIndent = Number.POSITIVE_INFINITY;

        for (const line of lines) {
          const match = line.match(/^([ \t]*)(\S)/);
          if (match) {
            minIndent = Math.min(minIndent, match[1].length);
          }
        }

        if (!Number.isFinite(minIndent)) {
          minIndent = 0;
        }

        const reindented = lines
          .map((line: string) => {
            if (!line.trim()) {
              return '';
            }
            const stripped = line.slice(minIndent);
            return `${indent}${stripped}`;
          })
          .join('\n');

        return `${leading}${reindented}`;
      });
    } while (cleaned !== previous);

    return cleaned;
  }

  /**
   * Get summary of operations
   */
  public summarizeOperations(): string {
    const counts: Record<string, number> = {};

    for (const op of this.operations) {
      counts[op.type] = (counts[op.type] || 0) + 1;
    }

    const parts: string[] = [];
    if (counts.insert) parts.push(`Added ${counts.insert} element(s)`);
    if (counts.delete) parts.push(`Deleted ${counts.delete} element(s)`);
    if (counts.edit) parts.push(`Edited ${counts.edit} element(s)`);
    if (counts.move) parts.push(`Moved ${counts.move} element(s)`);

    return parts.length > 0 ? parts.join(', ') : 'No changes';
  }

  /**
   * Find element by ID in current or original state
   */
  private findElement(id: string): Element | undefined {
    const current = this.getCurrentState();
    return current.find((e) => e.id === id);
  }

  private getElementBaseline(id: string): string {
    const original = this.findOriginalElement(id);
    if (original) return original.content;

    const firstInsert = this.operations.find(
      (op) => op.type === 'insert' && op.elementId === id
    );
    if (firstInsert) {
      const data = firstInsert.data as InsertData;
      return data.content;
    }

    return '';
  }

  private findOriginalElement(id: string): Element | undefined {
    return this.originalElements.find((e) => e.id === id);
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if there are unsaved operations
   */
  public hasUnsavedOperations(): boolean {
    return !this.saved && this.operations.length > 0;
  }

  /**
   * Mark as saved
   */
  public markAsSaved(): void {
    this.saved = true;
  }

  /**
   * Get operation history
   */
  public getOperations(): Readonly<Operation[]> {
    return this.operations;
  }

  /**
   * Clear all operations
   */
  public clear(): void {
    this.operations = [];
    this.redoStack = [];
    this.saved = true;
  }
}

export default ChangesModule;
