/**
 * Markdown Module
 * Handles markdown-to-HTML conversion using Remark/Unified ecosystem
 */

import { toString } from 'mdast-util-to-string';
import type { Root } from 'mdast';
import { MarkdownRenderer, type RendererOptions } from './MarkdownRenderer';
import { sanitizeHtml } from './sanitize';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

export interface MarkdownOptions {
  enableCriticMarkup?: boolean;
  allowRawHtml?: boolean;
}

export class MarkdownModule {
  private options: Required<MarkdownOptions>;
  private renderer: MarkdownRenderer;
  private readonly astProcessor = unified().use(remarkParse).use(remarkGfm);

  constructor(options: MarkdownOptions = {}) {
    this.options = {
      enableCriticMarkup: options.enableCriticMarkup ?? true,
      allowRawHtml: options.allowRawHtml ?? false,
    };
    this.renderer = new MarkdownRenderer();
  }

  public getOptions(): Readonly<Required<MarkdownOptions>> {
    return { ...this.options };
  }

  public setEnableCriticMarkup(enabled: boolean): void {
    this.options = { ...this.options, enableCriticMarkup: enabled };
  }

  public setAllowRawHtml(allow: boolean): void {
    this.options = { ...this.options, allowRawHtml: allow };
  }

  public updateOptions(update: MarkdownOptions): void {
    this.options = {
      enableCriticMarkup:
        update.enableCriticMarkup ?? this.options.enableCriticMarkup,
      allowRawHtml: update.allowRawHtml ?? this.options.allowRawHtml,
    };
  }

  private resolveRendererOptions(
    override?: Partial<RendererOptions>
  ): RendererOptions {
    const base: RendererOptions = {
      enableCriticMarkup: this.options.enableCriticMarkup,
      allowRawHtml: this.options.allowRawHtml,
    };
    if (!override) {
      return base;
    }
    const resolved = { ...base };
    if (override.enableCriticMarkup !== undefined) {
      resolved.enableCriticMarkup = override.enableCriticMarkup;
    }
    if (override.allowRawHtml !== undefined) {
      resolved.allowRawHtml = override.allowRawHtml;
    }
    return resolved;
  }

  private prepareMarkdown(markdown: string): string {
    return this.normalizeCriticMarkupLists(markdown);
  }

  private normalizeCriticMarkupLists(markdown: string): string {
    const pattern =
      /(^|\n)([ \t]*)\{\+\+\s*((?:[*+-])|(?:\d+[.)]))\s+([\s\S]*?)\+\+\}(?=\n|$)/g;

    return markdown.replace(
      pattern,
      (
        _match,
        lineBreak: string,
        indent: string,
        marker: string,
        body: string
      ) => {
        const cleanedBody = body.replace(/^\s+/, '').replace(/\s+$/, '');
        const normalizedMarker = marker.trim();
        return `${lineBreak}${indent}${normalizedMarker} {++${cleanedBody}++}`;
      }
    );
  }

  /**
   * Convert markdown to HTML using Remark/Unified pipeline (async)
   */
  public async render(
    markdown: string,
    enableCriticMarkup?: boolean
  ): Promise<string> {
    const options = this.resolveRendererOptions({ enableCriticMarkup });
    const prepared = this.prepareMarkdown(markdown);
    const html = await this.renderer.renderAsync(prepared, options);
    return this.sanitizeOutput(html, options);
  }

  /**
   * Convert markdown to HTML using Remark/Unified pipeline (synchronous)
   */
  public renderSync(markdown: string, enableCriticMarkup?: boolean): string {
    const options = this.resolveRendererOptions({ enableCriticMarkup });
    const prepared = this.prepareMarkdown(markdown);
    const html = this.renderer.render(prepared, options);
    return this.sanitizeOutput(html, options);
  }

  /**
   * Convert markdown inline content to HTML
   */
  public renderInline(markdown: string): string {
    // For inline content, just render and strip the outer <p> tags
    const html = this.renderSync(markdown);
    return html.replace(/^<p>|<\/p>$/g, '').trim();
  }

  private sanitizeOutput(html: string, options: RendererOptions): string {
    return options.allowRawHtml ? html : sanitizeHtml(html);
  }

  /**
   * Parse markdown to MDAST (Markdown Abstract Syntax Tree)
   */
  public parseToAST(markdown: string): Root {
    const prepared = this.prepareMarkdown(markdown);
    return this.astProcessor.parse(prepared) as Root;
  }

  /**
   * Extract plain text from markdown using Remark
   */
  public toPlainText(markdown: string): string {
    const ast = this.parseToAST(markdown);
    return ast.children
      .map((child) => toString(child).trim())
      .filter((segment) => segment.length > 0)
      .join('\n');
  }

  /**
   * Convert a single element to HTML based on its type
   */
  public renderElement(content: string, type: string, level?: number): string {
    // For headers, strip existing # and attributes, then render
    if (type === 'Header' && level) {
      return this.renderHeading(content, level);
    }

    // For block quotes, ensure proper formatting
    if (type === 'BlockQuote') {
      // If content doesn't start with >, add it
      if (!content.trim().startsWith('>')) {
        const lines = content.split('\n');
        const quotedLines = lines.map((line) => `> ${line}`);
        return this.renderSync(quotedLines.join('\n'));
      }
    }

    if (type === 'CodeBlock') {
      let html = this.renderSync(content);
      if (!html.includes('<code>')) {
        html = html.replace(/<code[^>]*>/, '<code>');
      }
      return html;
    }

    // For all other types, render as-is
    return this.renderSync(content);
  }

  /**
   * Sanitize HTML to prevent XSS
   */
  public sanitize(html: string): string {
    return sanitizeHtml(html);
  }

  /**
   * Remove trailing Pandoc attribute blocks (e.g. {#id .class}) from heading source
   * while leaving CriticMarkup blocks like {++addition++} untouched.
   */
  private stripPandocHeadingAttributes(source: string): string {
    let working = source.trimEnd();
    const attributePattern = /\s+\{([^}]+)\}\s*$/;

    while (true) {
      const matchResult = attributePattern.exec(working);
      if (!matchResult) {
        break;
      }

      const rawAttribute = matchResult[1]?.trim() ?? '';
      if (!rawAttribute || !this.isPandocAttributeBlock(rawAttribute)) {
        break;
      }

      const fullMatch = matchResult[0] ?? '';
      working = working
        .slice(0, Math.max(0, working.length - fullMatch.length))
        .trimEnd();
    }

    return working;
  }

  private renderHeading(content: string, level: number): string {
    const cleaned = this.stripPandocHeadingAttributes(content);
    const textContent = this.extractHeadingText(cleaned);
    const markdown = textContent
      ? `${'#'.repeat(level)} ${textContent}`
      : `${'#'.repeat(level)}`;
    return this.renderSync(markdown);
  }

  private extractHeadingText(source: string): string {
    const trimmed = source.trim();

    const stripLeadingMarkers = (value: string): string => {
      if (value.startsWith('\\#')) {
        return value;
      }
      return value.replace(/^#+\s+/, '').trim();
    };

    const atxMatch = trimmed.match(/^#+\s*(.*)$/);
    if (atxMatch) {
      const candidate = atxMatch[1]?.trim() ?? '';
      return stripLeadingMarkers(candidate);
    }

    const lines = trimmed.split(/\r?\n/);
    if (lines.length >= 2) {
      const underline = lines[1]?.trim() ?? '';
      if (/^=+$|^-+$/.test(underline)) {
        const candidate = lines[0]?.trim() ?? '';
        return stripLeadingMarkers(candidate);
      }
    }

    return stripLeadingMarkers(trimmed);
  }

  private isPandocAttributeBlock(content: string): boolean {
    if (!content) {
      return false;
    }

    // Pandoc attributes are sequences of tokens separated by spaces.
    // Tokens can be:
    // - #id
    // - .class
    // - key=value
    // CriticMarkup uses braces but different prefixes ({++ ... ++}, {== ... ==}, etc.)
    const tokens = content.split(/\s+/);
    if (tokens.length === 0) {
      return false;
    }

    return tokens.every((token) => {
      if (!token) return false;
      if (token.startsWith('#') && token.length > 1) return true;
      if (token.startsWith('.') && token.length > 1) return true;
      if (
        token.includes('=') &&
        !token.startsWith('{') &&
        !token.startsWith('}')
      )
        return true;
      return false;
    });
  }
}

export default MarkdownModule;
