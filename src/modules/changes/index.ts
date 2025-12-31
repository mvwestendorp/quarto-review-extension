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
  changesToHtmlDiff,
  stripCriticMarkup,
} from './converters';
import {
  ChangesExtensionRegistry,
  type ChangesExtension,
  type ExtensionChange,
} from './extensions';
import { createModuleLogger } from '@utils/debug';

const logger = createModuleLogger('ChangesModule');

export class ChangesModule {
  private originalElements: Element[] = [];
  private operations: Operation[] = [];
  private redoStack: Operation[] = [];
  private saved: boolean = true;
  // Track the baseline (content before current edit session) for each element
  private elementBaselines: Map<string, string> = new Map();
  private readonly extensionRegistry = new ChangesExtensionRegistry(this);

  /**
   * Initialize with existing operations (for restore/reload from persistence)
   * This allows restoring the operation history without recalculating diffs
   */
  public initializeWithOperations(operations: readonly Operation[]): void {
    // Create a mutable copy of the operations array
    this.operations = [...operations];
    this.redoStack = [];
    this.saved = false;
    logger.info('Operations restored from draft', {
      count: this.operations.length,
      types: this.operations.map((op) => op.type),
    });
  }

  /**
   * Verify all data-review-id values are unique
   * Throws an error if duplicates are found
   */
  private verifyUniqueIds(elements: NodeListOf<globalThis.Element>): void {
    const idMap = new Map<string, number>();
    const duplicates: string[] = [];

    elements.forEach((elem) => {
      const id = elem.getAttribute('data-review-id');
      if (id) {
        const count = (idMap.get(id) || 0) + 1;
        idMap.set(id, count);
        if (count > 1 && !duplicates.includes(id)) {
          duplicates.push(id);
        }
      }
    });

    if (duplicates.length > 0) {
      const errorMessage = `
Found duplicate data-review-id values in document:
${duplicates.map((id) => `  - "${id}" (appears ${idMap.get(id)} times)`).join('\n')}

This indicates a problem with the Quarto review extension filter.
Each element must have a unique ID across the entire document.

Possible causes:
- The review extension filter is resetting element counters incorrectly
- Multiple elements were assigned the same ID during document processing

Please report this issue with your Quarto document structure.
      `.trim();

      logger.error('Duplicate data-review-id values detected', { duplicates });
      throw new Error(errorMessage);
    }

    logger.debug(`Verified ${idMap.size} unique data-review-id values`);
  }

  /**
   * Initialize from DOM - parse HTML to extract original elements
   */
  public initializeFromDOM(): void {
    // Select all elements with data-review-id (includes .review-editable divs and header sections)
    const allElements = document.querySelectorAll('[data-review-id]');

    // Filter out elements inside modals, dialogs, or other excluded containers
    const editableElements = Array.from(allElements).filter((elem) => {
      const htmlElem = elem as HTMLElement;
      return !htmlElem.closest(
        '.modal, .dialog, [role="dialog"], [aria-modal="true"]'
      );
    });

    // Verify all IDs are unique before proceeding
    const nodeList =
      editableElements as unknown as NodeListOf<globalThis.Element>;
    this.verifyUniqueIds(nodeList);

    this.originalElements = Array.from(editableElements).map((elem) => {
      const id = elem.getAttribute('data-review-id') || '';
      const type = elem.getAttribute('data-review-type') || 'Para';
      const level = elem.getAttribute('data-review-level');
      const sourceLine = elem.getAttribute('data-review-source-line');
      const sourceColumn = elem.getAttribute('data-review-source-column');
      const sourceFile = elem.getAttribute('data-review-source-file');

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

      if (sourceFile) {
        element.sourceFile = sourceFile;
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

    this.extensionRegistry.emit('beforeOperation', { operation });

    this.operations.push(operation);
    this.redoStack = []; // Clear redo stack when new operation is added
    this.saved = false;

    this.extensionRegistry.emit('afterOperation', { operation });
  }

  /**
   * Insert a new element
   */
  public insert(
    content: string,
    metadata: ElementMetadata,
    position: InsertData['position'],
    source?: string
  ): string {
    const elementId = `temp-${this.generateOperationId()}`;
    const data: InsertData = {
      type: 'insert',
      content,
      metadata,
      position,
      source,
    };

    this.addOperation('insert', elementId, data, source);
    return elementId;
  }

  public replaceElementWithSegments(
    elementId: string,
    segments: { content: string; metadata: ElementMetadata }[]
  ): { elementIds: string[] } {
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

    const resultIds: string[] = [];

    const [firstSegment, ...tailSegments] = normalizedSegments;
    if (!firstSegment) {
      return { elementIds: resultIds };
    }

    // Update the first element
    this.edit(
      elementId,
      firstSegment.content,
      undefined,
      firstSegment.metadata
    );
    resultIds.push(elementId);

    // Insert remaining segments after the first
    let lastId = elementId;
    for (const segment of tailSegments) {
      const newId = this.insert(
        segment.content,
        segment.metadata,
        { after: lastId },
        undefined
      );
      resultIds.push(newId);
      lastId = newId;
    }

    return { elementIds: resultIds };
  }

  /**
   * Delete an element
   */
  public delete(elementId: string, source?: string): void {
    const element = this.findElement(elementId);
    if (!element) {
      throw new Error(`Element ${elementId} not found`);
    }

    const data: DeleteData = {
      type: 'delete',
      originalContent: element.content,
      originalMetadata: element.metadata,
      source,
    };

    this.addOperation('delete', elementId, data, source);
  }

  /**
   * Edit an element
   *
   * BUG FIX: Only create operation if content or metadata actually changed.
   * This prevents "ghost edits" where oldContent === newContent but metadata changed.
   * See: https://github.com/quarto-dev/quarto-review-extension/issues/XXX
   */
  public edit(
    elementId: string,
    newContent: string,
    source?: string,
    newMetadata?: ElementMetadata
  ): void {
    const element = this.findElement(elementId);
    if (!element) {
      throw new Error(`Element ${elementId} not found`);
    }

    const oldContent = element.content;
    const contentChanged = oldContent !== newContent;

    // Check if metadata actually changed (comparing all metadata fields)
    const metadataChanged = newMetadata
      ? newMetadata.type !== element.metadata.type ||
        newMetadata.level !== element.metadata.level ||
        JSON.stringify(newMetadata.attributes ?? {}) !==
          JSON.stringify(element.metadata.attributes ?? {}) ||
        JSON.stringify(newMetadata.classes ?? []) !==
          JSON.stringify(element.metadata.classes ?? [])
      : false;

    // Skip operation if nothing actually changed (prevents ghost edits)
    if (!contentChanged && !metadataChanged) {
      logger.debug('Edit would not change element, skipping operation', {
        elementId,
        contentSame: true,
        metadataSame: true,
      });
      return;
    }

    // Generate character-level changes
    const changes = generateChanges(oldContent, newContent);

    const data: EditData = {
      type: 'edit',
      oldContent,
      newContent,
      changes,
      source,
    };

    if (metadataChanged) {
      data.oldMetadata = element.metadata;
      data.newMetadata = newMetadata;
    }

    this.addOperation('edit', elementId, data, source);
  }

  /**
   * Move an element
   */
  public move(
    elementId: string,
    fromPosition: number,
    toPosition: number,
    source?: string
  ): void {
    const data: MoveData = {
      type: 'move',
      fromPosition,
      toPosition,
      source,
    };

    this.addOperation('move', elementId, data, source);
  }

  /**
   * Undo last operation
   */
  public undo(): boolean {
    const operation = this.operations.pop();
    if (!operation) return false;

    this.redoStack.push(operation);
    this.saved = false;
    // Clear baselines when undoing to ensure tracked changes are recalculated
    this.clearAllBaselines();
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
    // Clear baselines when redoing to ensure tracked changes are recalculated
    this.clearAllBaselines();
    return true;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get current state by applying operations to original elements
   */
  public getCurrentState(): Element[] {
    return this.getStateAfterOperations();
  }

  public getStateAfterOperations(operationCount?: number): Element[] {
    let elements = [...this.originalElements];
    const limit =
      typeof operationCount === 'number'
        ? Math.min(Math.max(operationCount, 0), this.operations.length)
        : this.operations.length;

    for (let i = 0; i < limit; i++) {
      const operation = this.operations[i];
      if (!operation) continue;
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
   * Register an extension that hooks into the change lifecycle.
   */
  public registerExtension(extension: ChangesExtension): () => void {
    return this.extensionRegistry.registerExtension(extension);
  }

  /**
   * Apply a change originating from an extension.
   */
  public applyExtensionChange(change: ExtensionChange): string | void {
    switch (change.type) {
      case 'edit':
        this.edit(
          change.elementId,
          change.newContent,
          change.source,
          change.metadata
        );
        return;
      case 'insert':
        return this.insert(
          change.content,
          change.metadata,
          change.position,
          change.source
        );
      case 'delete':
        this.delete(change.elementId, change.source);
        return;
      case 'move':
        this.move(
          change.elementId,
          change.fromPosition,
          change.toPosition,
          change.source
        );
        return;
      default: {
        const exhaustive: never = change;
        return exhaustive;
      }
    }
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
   * Get element content with tracked changes as inline HTML diff tags
   * Returns markdown with inline <ins> and <del> tags for diff formatting
   * This bypasses CriticMarkup intermediate format for simpler, more reliable rendering
   */
  public getElementContentWithHtmlDiffs(id: string): string {
    const element = this.getElementById(id);
    if (!element) {
      throw new Error(`Element ${id} not found`);
    }
    const baseline = this.getElementBaseline(id);
    const targetContent = element.content;

    const relevantOperations = this.operations.filter(
      (op) => op.elementId === id
    );

    // If no operations touched this element and baseline matches current, return plain content
    if (relevantOperations.length === 0 && baseline === targetContent) {
      return targetContent;
    }

    // Normalize escaped brackets in Pandoc attribute syntax before diffing
    // This prevents \[text]{attr} and [text]{attr} from being treated as different
    const normalizedBaseline = this.normalizePandocBrackets(baseline);
    const normalizedTarget = this.normalizePandocBrackets(targetContent);

    const changes = generateChanges(normalizedBaseline, normalizedTarget);
    if (changes.length === 0) {
      return targetContent;
    }

    // Generate markdown with inline HTML diff tags
    // This is simpler and more reliable than using CriticMarkup as intermediate format
    return changesToHtmlDiff(normalizedBaseline, changes);
  }

  /**
   * Normalize escaped brackets in Pandoc attribute syntax
   * Converts \[text]{attr} to [text]{attr} for consistent diffing
   */
  private normalizePandocBrackets(content: string): string {
    // Pattern: \[text]{attributes}
    // Replace escaped opening bracket with regular bracket
    return content.replace(/\\(\[([^\]]+)\]\{[^}]+\})/g, '$1');
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
    return this.toMarkdownSnapshot();
  }

  public toMarkdownSnapshot(operationCount?: number): string {
    const elements = this.getStateAfterOperations(operationCount);
    return this.renderMarkdown(elements);
  }

  /**
   * Convert current state to markdown with comments appended
   * @param commentsMap - Map of elementId to CriticMarkup comment string
   */
  public toMarkdownWithComments(commentsMap: Map<string, string>): string {
    const elements = this.getCurrentState();
    return elements
      .map((e) => {
        const commentMarkup = commentsMap.get(e.id);
        if (commentMarkup && commentMarkup.trim()) {
          // Append comments to content with proper spacing
          const content = e.content.replace(/\s+$/u, '');
          return `${content} ${commentMarkup}`;
        }
        return e.content;
      })
      .join('\n\n');
  }

  /**
   * Convert current state to clean markdown suitable for Git commits
   * Strips all CriticMarkup annotations (comments, highlights, etc.)
   * and applies tracked changes in accept mode.
   */
  public toCleanMarkdown(): string {
    const markdown = this.toMarkdown();
    return stripCriticMarkup(markdown, true, {
      preserveCommentsAsHtml: true,
    });
  }

  public toCleanMarkdownSnapshot(operationCount?: number): string {
    const markdown = this.toMarkdownSnapshot(operationCount);
    return stripCriticMarkup(markdown, true, {
      preserveCommentsAsHtml: true,
    });
  }

  /**
   * Convert current state to markdown with CriticMarkup annotations applied.
   * This uses the element baselines to render tracked insertions/deletions.
   */
  public toTrackedMarkdown(): string {
    const elements = this.getCurrentState();
    return elements
      .map((element) => this.getElementContentWithTrackedChanges(element.id))
      .join('\n\n');
  }

  /**
   * Remove nested review-editable wrappers (Pandoc div fences) that appear inside lists.
   * These wrappers are only present to keep Lua filter metadata and should not surface in the editor.
   */
  private removeNestedReviewWrappers(markdown: string): string {
    // Check if there are any review-editable artifacts to clean
    if (!markdown.includes(':::') && !markdown.includes('review-editable')) {
      return markdown;
    }

    let cleaned = markdown;
    let previous: string;

    // Remove valid nested wrapper fences first
    do {
      previous = cleaned;
      cleaned = this.removeOneNestedWrapper(cleaned);
    } while (cleaned !== previous);

    // Remove malformed attribute blocks on their own lines
    // Pattern: lines containing only {data-review-... class="review-editable" ...}
    cleaned = cleaned.replace(
      /^[ \t]*\{[^}]*review-editable[^}]*\}[ \t]*$/gm,
      ''
    );

    // Remove inline malformed attribute blocks (not on their own line)
    cleaned = cleaned.replace(/\{[^}]*review-editable[^}]*\}/g, '');

    // Clean up any stray ::: markers that aren't part of valid fences
    cleaned = cleaned.replace(/^[ \t]*:::[ \t]*$/gm, '');

    // Clean up multiple consecutive blank lines left by removals
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned;
  }

  /**
   * Remove one nested review wrapper fence from markdown
   * Handles complex cases with quoted attributes containing special characters
   */
  private removeOneNestedWrapper(markdown: string): string {
    // Find opening ::: {
    const openingPattern = /:::\s*\{/;
    const openingMatch = openingPattern.exec(markdown);

    if (!openingMatch) {
      return markdown;
    }

    const startPos = openingMatch.index;
    const attrsStartPos = openingMatch.index + openingMatch[0].length;

    // Find the closing } of the attributes block, accounting for quoted strings
    const closingBracePos = this.findClosingBrace(markdown, attrsStartPos);
    if (closingBracePos === -1) {
      return markdown;
    }

    // Extract the attributes block
    const attrsBlock = markdown.substring(attrsStartPos, closingBracePos);

    // Check if this fence has review-editable class
    if (!attrsBlock.includes('review-editable')) {
      return markdown;
    }

    // Find the closing ::: fence
    const afterAttrs = closingBracePos + 1;
    const closingPattern = /(?:\r?\n)?[ \t]*:::[^\S\r\n]*(?:\r?\n)?/;
    const remainingText = markdown.substring(afterAttrs);
    const closingMatch = closingPattern.exec(remainingText);

    if (!closingMatch) {
      return markdown;
    }

    const closingPos = afterAttrs + closingMatch.index;
    const closingEndPos =
      afterAttrs + closingMatch.index + closingMatch[0].length;

    // Extract the content between opening and closing fences
    const innerContent = markdown.substring(afterAttrs, closingPos);

    // Determine indentation from the line before the fence
    const beforeFence = markdown.substring(0, startPos);
    const indentMatch = beforeFence.match(/[ \t]*$/);
    const indent = indentMatch ? indentMatch[0] : '';

    // Reindent the inner content
    const lines = innerContent.split(/\r?\n/);
    let minIndent = Number.POSITIVE_INFINITY;

    for (const line of lines) {
      const match = line.match(/^([ \t]*)(\S)/);
      if (match && match[1]) {
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

    // Replace the fence with the reindented content
    return (
      markdown.substring(0, startPos) +
      reindented +
      markdown.substring(closingEndPos)
    );
  }

  /**
   * Find the closing brace } that matches the opening brace {
   * Accounts for quoted strings that may contain braces
   */
  private findClosingBrace(text: string, startPos: number): number {
    let depth = 1; // We've already seen the opening {
    let inQuotes = false;
    let quoteChar = '';
    let i = startPos;

    while (i < text.length && depth > 0) {
      const char = text[i];
      const prevChar = i > 0 ? text[i - 1] : '';

      // Handle escape sequences
      if (prevChar === '\\') {
        i++;
        continue;
      }

      // Handle quotes
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
      }

      // Only count braces outside of quotes
      if (!inQuotes) {
        if (char === '{') {
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0) {
            return i;
          }
        }
      }

      i++;
    }

    return -1; // No matching closing brace found
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

  /**
   * Get the baseline content for an element (content before current edit session)
   * This is used to display tracked changes in CriticMarkup format
   *
   * For newly inserted elements, returns empty string so all content appears as additions.
   * For elements with edits, returns the original content from before the edit.
   * For existing elements, returns the original content from the DOM.
   */
  private getElementBaseline(id: string): string {
    // If a baseline was explicitly set for this element, use it
    if (this.elementBaselines.has(id)) {
      return this.elementBaselines.get(id) || '';
    }

    // Otherwise, use the original element content if it exists
    const original = this.findOriginalElement(id);
    if (original) return original.content;

    // For newly inserted elements, the baseline should be empty so all content
    // appears as additions with green line formatting ({++...++})
    const firstInsert = this.operations.find(
      (op) => op.type === 'insert' && op.elementId === id
    );
    if (firstInsert) {
      // Return empty baseline for new sections - this makes the entire content
      // appear as an addition, which displays with the green line styling
      return '';
    }

    return '';
  }

  /**
   * Set or update the baseline for an element
   * This is called when opening an element for editing to preserve the current state
   * as the "baseline" for diff calculations
   */
  public setElementBaseline(id: string, content: string): void {
    this.elementBaselines.set(id, content);
  }

  /**
   * Clear the baseline for an element (called when closing the editor)
   * This allows the module to revert to using original/insert content as baseline
   */
  public clearElementBaseline(id: string): void {
    this.elementBaselines.delete(id);
  }

  /**
   * Clear all element baselines (called on undo/redo to reset tracking)
   */
  public clearAllBaselines(): void {
    this.elementBaselines.clear();
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
    this.elementBaselines.clear();
  }

  private renderMarkdown(elements: Element[]): string {
    return elements
      .map((e) => e.content.replace(/\s+$/, '')) // Trim trailing whitespace
      .join('\n\n'); // Consistent double newline separator
  }
}

export type {
  ChangesExtension,
  ChangesExtensionContext,
  ChangesExtensionEvent,
  ExtensionChange,
  ExtensionEventHandler,
  ExtensionEventPayload,
} from './extensions';

export default ChangesModule;
