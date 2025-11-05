/**
 * Comments Module
 * CriticMarkup parser and renderer for comments and annotations
 */

import type { Comment } from '@/types';

/**
 * CriticMarkup patterns
 * {++ addition ++}
 * {-- deletion --}
 * {~~ substitution ~> replacement ~~}
 * {>> comment <<}
 * {== highlight ==}{>> comment <<}
 */

export interface CriticMarkupMatch {
  type: 'addition' | 'deletion' | 'substitution' | 'comment' | 'highlight';
  content: string;
  replacement?: string;
  comment?: string;
  start: number;
  end: number;
}

type MarkdownSegment = {
  type: 'text' | 'code';
  content: string;
  start: number;
};

type MarkdownRange = {
  start: number;
  end: number;
};

export class CommentsModule {
  private comments: Map<string, Comment> = new Map();

  // CriticMarkup regex patterns
  private readonly patterns = {
    addition: /\{\+\+(.+?)\+\+\}/g,
    deletion: /\{--(.+?)--\}/g,
    substitution: /\{~~(.+?)~>(.+?)~~\}/g,
    comment: /\{>>(.+?)<<\}/g,
    highlight: /\{==(.+?)==\}(?:\{>>(.+?)<<\})?/g,
  };

  /**
   * Parse CriticMarkup from markdown text
   */
  public parse(markdown: string): CriticMarkupMatch[] {
    const matches: CriticMarkupMatch[] = [];
    const segments = this.segmentMarkdown(markdown);

    segments.forEach((segment) => {
      if (segment.type !== 'text' || !segment.content) {
        return;
      }
      this.collectCriticMarkupMatches(segment.content, segment.start, matches);
    });

    return matches.sort((a, b) => a.start - b.start);
  }

  /**
   * Render CriticMarkup as HTML
   */
  public renderToHTML(markdown: string): string {
    const segments = this.segmentMarkdown(markdown);

    return segments
      .map((segment) => {
        if (segment.type === 'code') {
          return segment.content;
        }
        if (!segment.content) {
          return segment.content;
        }
        return this.renderMarkupSegment(segment.content);
      })
      .join('');
  }

  /**
   * Accept a CriticMarkup change (keep addition/replacement, remove deletion)
   */
  public accept(markdown: string, match: CriticMarkupMatch): string {
    const before = markdown.substring(0, match.start);
    const after = markdown.substring(match.end);

    switch (match.type) {
      case 'addition':
        return before + match.content + after;
      case 'deletion':
        return before + after;
      case 'substitution':
        return before + (match.replacement || '') + after;
      case 'highlight':
        return before + match.content + after;
      case 'comment':
        return before + after;
      default:
        return markdown;
    }
  }

  /**
   * Reject a CriticMarkup change (keep original, remove addition)
   */
  public reject(markdown: string, match: CriticMarkupMatch): string {
    const before = markdown.substring(0, match.start);
    const after = markdown.substring(match.end);

    switch (match.type) {
      case 'addition':
        return before + after;
      case 'deletion':
        return before + match.content + after;
      case 'substitution':
        return before + match.content + after;
      case 'highlight':
        return before + match.content + after;
      case 'comment':
        return before + after;
      default:
        return markdown;
    }
  }

  /**
   * Accept all CriticMarkup changes
   */
  public acceptAll(markdown: string): string {
    let result = markdown;
    const matches = this.parse(result);

    // Process in reverse order to maintain indices
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      if (!match) continue;
      result = this.accept(result, match);
    }

    return result;
  }

  /**
   * Reject all CriticMarkup changes
   */
  public rejectAll(markdown: string): string {
    let result = markdown;
    const matches = this.parse(result);

    // Process in reverse order to maintain indices
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      if (!match) continue;
      result = this.reject(result, match);
    }

    return result;
  }

  /**
   * Add a comment to an element
   */
  public addComment(
    elementId: string,
    content: string,
    userId: string,
    type: Comment['type'] = 'comment'
  ): Comment {
    const comment: Comment = {
      id: this.generateCommentId(),
      elementId,
      userId,
      timestamp: Date.now(),
      content,
      resolved: false,
      type,
    };

    this.comments.set(comment.id, comment);
    return comment;
  }

  /**
   * Get comment by ID
   */
  public getComment(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  /**
   * Get all comments for an element
   */
  public getCommentsForElement(elementId: string): Comment[] {
    return Array.from(this.comments.values()).filter(
      (c) => c.elementId === elementId
    );
  }

  /**
   * Get all comments
   */
  public getAllComments(): Comment[] {
    return Array.from(this.comments.values());
  }

  public importComments(comments: Comment[]): void {
    this.comments.clear();
    comments.forEach((comment) => {
      if (!comment?.id) {
        return;
      }
      this.comments.set(comment.id, { ...comment });
    });
  }

  /**
   * Update comment content
   */
  public updateComment(id: string, content: string): boolean {
    const comment = this.comments.get(id);
    if (!comment) return false;

    comment.content = content;
    comment.timestamp = Date.now(); // Update timestamp
    return true;
  }

  /**
   * Resolve a comment
   */
  public resolveComment(id: string): boolean {
    const comment = this.comments.get(id);
    if (!comment) return false;

    comment.resolved = true;
    return true;
  }

  /**
   * Unresolve a comment
   */
  public unresolveComment(id: string): boolean {
    const comment = this.comments.get(id);
    if (!comment) return false;

    comment.resolved = false;
    return true;
  }

  /**
   * Get all comments for an element formatted as CriticMarkup
   * Returns empty string if no comments exist
   */
  public getCommentsAsCriticMarkup(elementId: string): string {
    const comments = this.getCommentsForElement(elementId);
    if (comments.length === 0) {
      return '';
    }

    // Format each comment as CriticMarkup and join with space
    return comments
      .map((comment) => this.createComment(comment.content))
      .join(' ');
  }

  /**
   * Delete a comment
   */
  public deleteComment(id: string): boolean {
    return this.comments.delete(id);
  }

  private segmentMarkdown(markdown: string): MarkdownSegment[] {
    const codeRanges = this.collectCodeRanges(markdown);
    if (codeRanges.length === 0) {
      return [{ type: 'text', content: markdown, start: 0 }];
    }

    const segments: MarkdownSegment[] = [];
    let cursor = 0;

    codeRanges.forEach((range) => {
      if (range.start > cursor) {
        segments.push({
          type: 'text',
          content: markdown.slice(cursor, range.start),
          start: cursor,
        });
      }
      segments.push({
        type: 'code',
        content: markdown.slice(range.start, range.end),
        start: range.start,
      });
      cursor = range.end;
    });

    if (cursor < markdown.length) {
      segments.push({
        type: 'text',
        content: markdown.slice(cursor),
        start: cursor,
      });
    }

    return segments;
  }

  private collectCodeRanges(markdown: string): MarkdownRange[] {
    const ranges: MarkdownRange[] = [];
    let match: RegExpExecArray | null;

    const fencePattern = /(```+[\s\S]*?```+|~~~+[\s\S]*?~~~+)/g;
    while ((match = fencePattern.exec(markdown)) !== null) {
      const fullMatch = match?.[0] ?? '';
      const startIndex = match?.index ?? 0;
      ranges.push({
        start: startIndex,
        end: startIndex + fullMatch.length,
      });
    }

    const inlinePattern = /(`+)([\s\S]*?)(\1)/g;
    while ((match = inlinePattern.exec(markdown)) !== null) {
      const fullMatch = match?.[0] ?? '';
      const start = match?.index ?? 0;
      const end = start + fullMatch.length;

      if (ranges.some((range) => start >= range.start && end <= range.end)) {
        continue;
      }

      ranges.push({ start, end });
    }

    ranges.sort((a, b) => a.start - b.start);
    return this.mergeRanges(ranges);
  }

  private mergeRanges(ranges: MarkdownRange[]): MarkdownRange[] {
    if (ranges.length === 0) {
      return [];
    }

    const firstRange = ranges[0];
    if (!firstRange) {
      return [];
    }
    const merged: MarkdownRange[] = [{ ...firstRange }];

    for (let i = 1; i < ranges.length; i++) {
      const current = ranges[i];
      if (!current) continue;
      const last = merged[merged.length - 1];
      if (!last) {
        merged.push({ ...current });
        continue;
      }
      const currentStart = current.start ?? 0;
      const currentEnd = current.end ?? currentStart;
      const lastStart = last.start ?? 0;
      const lastEnd = last.end ?? lastStart;
      if (currentStart <= lastEnd) {
        last.end = Math.max(lastEnd, currentEnd);
      } else {
        merged.push({ ...current });
      }
    }

    return merged;
  }

  private collectCriticMarkupMatches(
    segment: string,
    offset: number,
    matches: CriticMarkupMatch[]
  ): void {
    let match: RegExpExecArray | null;

    const additionPattern = new RegExp(this.patterns.addition);
    while ((match = additionPattern.exec(segment)) !== null) {
      const content = match?.[1] ?? '';
      const fullMatch = match?.[0] ?? '';
      const startIndex = match?.index ?? 0;
      matches.push({
        type: 'addition',
        content,
        start: offset + startIndex,
        end: offset + startIndex + fullMatch.length,
      });
    }

    const deletionPattern = new RegExp(this.patterns.deletion);
    while ((match = deletionPattern.exec(segment)) !== null) {
      const content = match?.[1] ?? '';
      const fullMatch = match?.[0] ?? '';
      const startIndex = match?.index ?? 0;
      matches.push({
        type: 'deletion',
        content,
        start: offset + startIndex,
        end: offset + startIndex + fullMatch.length,
      });
    }

    const substitutionPattern = new RegExp(this.patterns.substitution);
    while ((match = substitutionPattern.exec(segment)) !== null) {
      const content = match?.[1] ?? '';
      const replacement = match?.[2] ?? '';
      const fullMatch = match?.[0] ?? '';
      const startIndex = match?.index ?? 0;
      matches.push({
        type: 'substitution',
        content,
        replacement,
        start: offset + startIndex,
        end: offset + startIndex + fullMatch.length,
      });
    }

    const highlightPattern = new RegExp(this.patterns.highlight);
    while ((match = highlightPattern.exec(segment)) !== null) {
      const content = match?.[1] ?? '';
      const comment = match?.[2] ?? '';
      const fullMatch = match?.[0] ?? '';
      const startIndex = match?.index ?? 0;
      matches.push({
        type: 'highlight',
        content,
        comment,
        start: offset + startIndex,
        end: offset + startIndex + fullMatch.length,
      });
    }

    const commentPattern = new RegExp(this.patterns.comment);
    while ((match = commentPattern.exec(segment)) !== null) {
      const fullMatch = match?.[0] ?? '';
      const content = match?.[1] ?? '';
      const startIndex = match?.index ?? 0;
      const start = offset + startIndex;
      const end = start + fullMatch.length;

      const isPartOfHighlight = matches.some(
        (m) =>
          m.type === 'highlight' &&
          m.comment &&
          start >= m.start &&
          start < m.end
      );

      if (!isPartOfHighlight) {
        matches.push({
          type: 'comment',
          content,
          start,
          end,
        });
      }
    }
  }

  private renderMarkupSegment(segment: string): string {
    let html = segment;

    html = html.replace(
      new RegExp(this.patterns.addition),
      '<span class="critic-addition" data-critic-type="addition">$1</span>'
    );

    html = html.replace(
      new RegExp(this.patterns.deletion),
      '<span class="critic-deletion" data-critic-type="deletion">$1</span>'
    );

    html = html.replace(
      new RegExp(this.patterns.substitution),
      '<span class="critic-substitution" data-critic-type="substitution" data-critic-original="$1">$2</span>'
    );

    html = html.replace(
      new RegExp(this.patterns.highlight),
      (_match, content: string, comment: string) => {
        if (comment) {
          return `<span class="critic-highlight" data-critic-type="highlight" data-critic-comment="${this.escapeHtml(comment)}">${content}</span>`;
        }
        return `<span class="critic-highlight" data-critic-type="highlight">${content}</span>`;
      }
    );

    html = html.replace(
      new RegExp(this.patterns.comment),
      '<span class="critic-comment" data-critic-type="comment">$1</span>'
    );

    return html;
  }

  /**
   * Create CriticMarkup addition
   */
  public createAddition(text: string): string {
    return `{++${text}++}`;
  }

  /**
   * Create CriticMarkup deletion
   */
  public createDeletion(text: string): string {
    return `{--${text}--}`;
  }

  /**
   * Create CriticMarkup substitution
   */
  public createSubstitution(original: string, replacement: string): string {
    return `{~~${original}~>${replacement}~~}`;
  }

  /**
   * Create CriticMarkup comment
   */
  public createComment(text: string): string {
    const trimmed = text.replace(/\s+/g, ' ').trim();
    return `{>>${trimmed}<<}`;
  }

  /**
   * Create CriticMarkup highlight with optional comment
   */
  public createHighlight(text: string, comment?: string): string {
    if (comment) {
      const trimmed = comment.replace(/\s+/g, ' ').trim();
      return `{==${text}==}{>>${trimmed}<<}`;
    }
    return `{==${text}==}`;
  }

  /**
   * Check if markdown contains CriticMarkup
   */
  public hasCriticMarkup(markdown: string): boolean {
    return (
      this.patterns.addition.test(markdown) ||
      this.patterns.deletion.test(markdown) ||
      this.patterns.substitution.test(markdown) ||
      this.patterns.comment.test(markdown) ||
      this.patterns.highlight.test(markdown)
    );
  }

  /**
   * Strip all CriticMarkup (accept all changes)
   */
  public stripCriticMarkup(markdown: string): string {
    return this.acceptAll(markdown);
  }

  /**
   * Generate unique comment ID
   */
  private generateCommentId(): string {
    return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char] ?? char);
  }

  /**
   * Clear all comments
   */
  public clear(): void {
    this.comments.clear();
  }
}

export default CommentsModule;
