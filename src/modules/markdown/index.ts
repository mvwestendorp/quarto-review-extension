/**
 * Markdown Module
 * Handles markdown-to-HTML conversion using Remark/Unified ecosystem
 */

import { toString } from 'mdast-util-to-string';
import type { Root, RootContent } from 'mdast';
import { MarkdownRenderer, type RendererOptions } from './MarkdownRenderer';
import { sanitizeHtml } from './sanitize';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

export interface MarkdownOptions {
  allowRawHtml?: boolean;
}

export class MarkdownModule {
  private options: Required<MarkdownOptions>;
  private renderer: MarkdownRenderer;
  private readonly astProcessor = unified().use(remarkParse).use(remarkGfm);

  constructor(options: MarkdownOptions = {}) {
    this.options = {
      allowRawHtml: options.allowRawHtml ?? false,
    };
    this.renderer = new MarkdownRenderer();
  }

  public getOptions(): Readonly<Required<MarkdownOptions>> {
    return { ...this.options };
  }

  public setAllowRawHtml(allow: boolean): void {
    this.options = { ...this.options, allowRawHtml: allow };
  }

  public updateOptions(update: MarkdownOptions): void {
    this.options = {
      allowRawHtml: update.allowRawHtml ?? this.options.allowRawHtml,
    };
  }

  /**
   * Get the renderer instance for extension/customization
   */
  public getRenderer(): MarkdownRenderer {
    return this.renderer;
  }

  private resolveRendererOptions(
    override?: Partial<RendererOptions>
  ): RendererOptions {
    const base: RendererOptions = {
      enableCriticMarkup: false, // CriticMarkup disabled by default
      allowRawHtml: this.options.allowRawHtml,
    };
    if (!override) {
      return base;
    }
    const resolved = { ...base };
    if (override.allowRawHtml !== undefined) {
      resolved.allowRawHtml = override.allowRawHtml;
    }
    if (override.enableCriticMarkup !== undefined) {
      resolved.enableCriticMarkup = override.enableCriticMarkup;
    }
    return resolved;
  }

  private prepareMarkdown(markdown: string): string {
    // Decode HTML entities FIRST (before any processing)
    // This is needed because markdown from data-review-markdown attributes
    // is HTML-encoded (e.g., &quot; instead of ")
    let prepared = this.decodeHtmlEntities(markdown);

    // CriticMarkup preprocessing has been removed from UI rendering
    // CriticMarkup is now only used for export/git workflows via ChangesModule

    prepared = this.preprocessPandocRawInline(prepared);
    prepared = this.preprocessPandocAttributes(prepared);
    return prepared;
  }

  /**
   * Preprocess Pandoc raw inline syntax: `content`{=format}
   * Converts `<mark>`{=html} to <mark> (unwraps from code and processes as raw HTML)
   * Supports any format, but only =html is commonly used
   */
  private preprocessPandocRawInline(markdown: string): string {
    // Pattern: `content`{=format}
    // Example: `<mark>`{=html}highlighted text`</mark>`{=html}
    // Captures: backtick-wrapped content followed by {=format} attribute
    return markdown.replace(
      /`([^`]+)`\{=([^}]+)\}/g,
      (_match, content, _format) => {
        // Simply unwrap the content from backticks
        // The content is raw HTML/LaTeX/etc that should pass through
        return content;
      }
    );
  }

  /**
   * Decode HTML entities to actual characters
   * Needed because data-review-markdown attributes store HTML-encoded text
   */
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&'); // Must be last to avoid double-decoding
  }

  /**
   * Preprocess Pandoc attribute syntax to HTML before Remark parsing
   * Converts [text]{.class #id key=value} to <span class="class" id="id" key="value">text</span>
   * Excludes code blocks to preserve literal syntax
   * Note: Does NOT exclude math - Pandoc attributes can wrap math expressions like [$\beta$]{.highlight}
   */
  private preprocessPandocAttributes(markdown: string): string {
    // Split by fenced code blocks to exclude them (but NOT math - see note above)
    const excludePattern = /(^```[\s\S]*?^```|^~~~[\s\S]*?^~~~)/gm;
    const parts: Array<{ isCode: boolean; content: string }> = [];

    let lastIndex = 0;
    let match;

    while ((match = excludePattern.exec(markdown)) !== null) {
      // Add text before excluded region (code block)
      if (match.index > lastIndex) {
        parts.push({
          isCode: false,
          content: markdown.substring(lastIndex, match.index),
        });
      }

      // Add excluded region (preserve as-is)
      parts.push({
        isCode: true,
        content: match[0],
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last excluded region
    if (lastIndex < markdown.length) {
      parts.push({
        isCode: false,
        content: markdown.substring(lastIndex),
      });
    }

    // If no excluded regions found, process all content
    if (parts.length === 0) {
      parts.push({ isCode: false, content: markdown });
    }

    // Process Pandoc attributes only in non-excluded parts (not in code blocks)
    const processed = parts.map((part) => {
      if (part.isCode) {
        return part.content; // Preserve code blocks unchanged
      }

      let content = part.content;

      // Pattern: [text]{attributes} or \[text]{attributes} (escaped brackets)
      // Matches: [text]{.class #id key="value" key2=value2}
      // Also matches: \[text]{style="color: red;"} (with escaped opening bracket)
      content = content.replace(
        /\\?\[([^\]]+)\]\{([^}]+)\}/g,
        (_match, text, attrs) => {
          // Parse attributes
          const classes: string[] = [];
          let id = '';
          const styles: string[] = [];
          const otherAttrs: Array<{ key: string; value: string }> = [];

          // Split attributes by whitespace, but preserve quoted values
          const attrParts = attrs.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

          for (const attr of attrParts) {
            if (attr.startsWith('.')) {
              // Class attribute
              classes.push(attr.substring(1));
            } else if (attr.startsWith('#')) {
              // ID attribute
              id = attr.substring(1);
            } else if (attr.includes('=')) {
              // Key=value attribute
              const [key, ...valueParts] = attr.split('=');
              let value = valueParts.join('=');

              // Remove quotes if present
              if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
              }

              if (key === 'style') {
                styles.push(value);
              } else {
                otherAttrs.push({ key, value });
              }
            }
          }

          // Build HTML span with attributes
          const htmlAttrs: string[] = [];

          if (classes.length > 0) {
            htmlAttrs.push(`class="${classes.join(' ')}"`);
          }

          if (id) {
            htmlAttrs.push(`id="${id}"`);
          }

          if (styles.length > 0) {
            htmlAttrs.push(`style="${styles.join('; ')}"`);
          }

          for (const { key, value } of otherAttrs) {
            htmlAttrs.push(`${key}="${value}"`);
          }

          return `<span ${htmlAttrs.join(' ')}>${text}</span>`;
        }
      );

      return content;
    });

    return processed.join('');
  }

  /**
   * Convert markdown to HTML using Remark/Unified pipeline (async)
   */
  public async render(markdown: string): Promise<string> {
    const options = this.resolveRendererOptions();
    const prepared = this.prepareMarkdown(markdown);
    const html = await this.renderer.renderAsync(prepared, options);
    return this.sanitizeOutput(html, options);
  }

  /**
   * Convert markdown to HTML using Remark/Unified pipeline (synchronous)
   */
  public renderSync(
    markdown: string,
    options?: Partial<RendererOptions>
  ): string {
    const resolvedOptions = this.resolveRendererOptions(options);
    const prepared = this.prepareMarkdown(markdown);
    const html = this.renderer.render(prepared, resolvedOptions);
    return this.sanitizeOutput(html, resolvedOptions);
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
      .map((child: RootContent) => toString(child).trim())
      .filter((segment: string) => segment.length > 0)
      .join('\n');
  }

  /**
   * Convert a single element to HTML based on its type
   */
  public renderElement(
    content: string,
    type: string,
    level?: number,
    enableCriticMarkup = false
  ): string {
    const renderOptions = enableCriticMarkup
      ? { enableCriticMarkup: true, allowRawHtml: true }
      : undefined;

    if (type === 'FigureCaption' || type === 'TableCaption') {
      return this.renderInline(content);
    }

    if (type === 'DocumentTitle') {
      return this.renderInline(content);
    }

    // For headers, strip existing # and attributes, then render
    if (type === 'Header' && level) {
      return this.renderHeading(content, level, enableCriticMarkup);
    }

    // For block quotes, ensure proper formatting
    if (type === 'BlockQuote') {
      // If content doesn't start with >, add it
      if (!content.trim().startsWith('>')) {
        const lines = content.split('\n');
        const quotedLines = lines.map((line) => `> ${line}`);
        const options = this.resolveRendererOptions(renderOptions);
        const prepared = this.prepareMarkdown(quotedLines.join('\n'));
        const html = this.renderer.render(prepared, options);
        return this.sanitizeOutput(html, options);
      }
    }

    if (type === 'CodeBlock') {
      const options = this.resolveRendererOptions(renderOptions);
      const prepared = this.prepareMarkdown(content);
      let html = this.renderer.render(prepared, options);
      if (!html.includes('<code>')) {
        html = html.replace(/<code[^>]*>/, '<code>');
      }
      return this.sanitizeOutput(html, options);
    }

    // For all other types, render as-is
    const options = this.resolveRendererOptions(renderOptions);
    const prepared = this.prepareMarkdown(content);
    const html = this.renderer.render(prepared, options);
    return this.sanitizeOutput(html, options);
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

  private renderHeading(
    content: string,
    level: number,
    enableCriticMarkup = false
  ): string {
    const cleaned = this.stripPandocHeadingAttributes(content);

    // Check if content is wrapped in HTML diff tags (<ins>, <del>)
    // If so, extract the content, render it properly, then wrap the heading with the diff tags
    const htmlDiffMatch = cleaned.match(/^<(ins|del)([^>]*)>([\s\S]*?)<\/\1>$/);
    if (htmlDiffMatch && enableCriticMarkup) {
      const tagName = htmlDiffMatch[1]; // 'ins' or 'del'
      const tagAttrs = htmlDiffMatch[2] || ''; // attributes
      const innerContent = htmlDiffMatch[3]?.trim() || ''; // content inside tags

      // Strip heading markers from inner content to get just the text
      const headingText = this.stripHeadingMarkers(innerContent);

      // Render the heading with just the text (no markers)
      const headingMarkdown = headingText
        ? `${'#'.repeat(level)} ${headingText}`
        : `${'#'.repeat(level)}`;

      const renderOptions = { enableCriticMarkup: false, allowRawHtml: true };
      const headingHtml = this.renderSync(headingMarkdown, renderOptions);

      // Extract the heading content (everything between <hN> and </hN>)
      const headingContentMatch = headingHtml.match(
        /<h\d[^>]*>([\s\S]*?)<\/h\d>/
      );
      if (headingContentMatch) {
        const headingContent = headingContentMatch[1] || '';
        // Wrap the heading content with the diff tag and put it inside the heading
        return `<h${level}><${tagName}${tagAttrs}>${headingContent}</${tagName}></h${level}>`;
      }
    }

    // Try to detect CriticMarkup wrappers using specific patterns
    let criticMarkupPrefix = '';
    let criticMarkupSuffix = '';
    let plainContent = '';
    let isSubstitution = false;
    let oldText = '';

    // Check for addition {++...++}
    const additionMatch = cleaned.match(/^\{\+\+(.+?)\+\+\}$/);
    if (additionMatch) {
      criticMarkupPrefix = '{++';
      criticMarkupSuffix = '++}';
      // Extract and clean the content, removing any heading markers
      const extractedText = additionMatch[1]?.trim() || '';
      plainContent = this.stripHeadingMarkers(extractedText);
    } else {
      // Check for deletion {--...--}
      const deletionMatch = cleaned.match(/^\{--(.+?)--\}$/);
      if (deletionMatch) {
        criticMarkupPrefix = '{--';
        criticMarkupSuffix = '--}';
        // Extract and clean the content, removing any heading markers
        const extractedText = deletionMatch[1]?.trim() || '';
        plainContent = this.stripHeadingMarkers(extractedText);
      } else {
        // Check for substitution {~~...~>...~~}
        const substitutionMatch = cleaned.match(/^\{~~(.+?)~>(.+?)~~\}$/);
        if (substitutionMatch) {
          isSubstitution = true;
          criticMarkupPrefix = '{~~';
          criticMarkupSuffix = '~~}';
          // Extract and clean both parts, removing any heading markers
          oldText = this.stripHeadingMarkers(
            substitutionMatch[1]?.trim() || ''
          );
          plainContent = this.stripHeadingMarkers(
            substitutionMatch[2]?.trim() || ''
          );
        } else {
          // No CriticMarkup wrapper - extract plain text normally
          plainContent = this.extractPlainHeadingText(cleaned);
        }
      }
    }

    // Reconstruct the markdown with heading markers (without CriticMarkup)
    const headingMarkdown = plainContent
      ? `${'#'.repeat(level)} ${plainContent}`
      : `${'#'.repeat(level)}`;

    // Prepare render options for CriticMarkup if enabled
    const renderOptions = enableCriticMarkup
      ? { enableCriticMarkup: true, allowRawHtml: true }
      : undefined;

    // Render the heading first to get proper HTML
    const headingHtml = this.renderSync(headingMarkdown, renderOptions);

    // If we detected CriticMarkup, we need to wrap the heading content with it
    // For headings, we wrap just the content inside the heading tags
    if (criticMarkupPrefix && criticMarkupSuffix) {
      if (isSubstitution) {
        // For substitutions, render the CriticMarkup substitution and extract the content
        // Use just the plain text (without heading markers) for the substitution
        const substitutionMarkdown = `${criticMarkupPrefix}${oldText}~>${plainContent}${criticMarkupSuffix}`;
        const substitutionHtml = this.renderSync(
          substitutionMarkdown,
          renderOptions
        );

        // Extract the content from the paragraph (which contains the substitution markup)
        const substitutionMatch = substitutionHtml.match(/<p>(.*?)<\/p>/);
        const substitutionContent = substitutionMatch?.[1] || substitutionHtml;

        // Wrap in heading tags
        return `<h${level}>${substitutionContent}</h${level}>`;
      } else {
        // For additions and deletions, wrap the entire heading content
        const headingMatch = headingHtml.match(/<h\d[^>]*>(.*?)<\/h\d>/);
        if (headingMatch) {
          const headingContent = headingMatch[1] || '';
          const headingTag =
            headingMatch[0]?.match(/<h\d[^>]*>/)?.[0] || `<h${level}>`;
          const closingTag = `</h${level}>`;

          // Render the CriticMarkup wrapping
          const wrappedMarkup = this.renderSync(
            `${criticMarkupPrefix}${headingContent}${criticMarkupSuffix}`,
            renderOptions
          );

          // Extract the content from the wrapped markup
          const wrappedMatch = wrappedMarkup.match(/<p>(.*?)<\/p>/);
          const wrappedContent = wrappedMatch?.[1] || wrappedMarkup;

          return `${headingTag}${wrappedContent}${closingTag}`;
        }
      }
    }

    return headingHtml;
  }

  private extractPlainHeadingText(source: string): string {
    const trimmed = source.trim();

    const stripLeadingMarkers = (value: string): string => {
      if (value.startsWith('\\#')) {
        return value;
      }
      return value.replace(/^#+\s+/, '').trim();
    };

    // If the entire source is wrapped in CriticMarkup, extract the text first
    // This handles cases like {++New Heading++} from newly inserted sections
    const criticWrappers = [
      /^\{\+\+([\s\S]*?)\+\+\}$/, // {++...++}
      /^\{--([\s\S]*?)--\}$/, // {--...--}
      /^\{~~([\s\S]*?)~>[^]*~~\}$/, // {~~...~>...~~}
    ];

    let workingText = trimmed;
    for (const pattern of criticWrappers) {
      const match = workingText.match(pattern);
      if (match && match[1]) {
        workingText = match[1].trim();
        break;
      }
    }

    const atxMatch = workingText.match(/^#+\s*(.*)$/);
    if (atxMatch) {
      const candidate = atxMatch[1]?.trim() ?? '';
      return stripLeadingMarkers(candidate);
    }

    const lines = workingText.split(/\r?\n/);
    if (lines.length >= 2) {
      const underline = lines[1]?.trim() ?? '';
      if (/^=+$|^-+$/.test(underline)) {
        const candidate = lines[0]?.trim() ?? '';
        return stripLeadingMarkers(candidate);
      }
    }

    return stripLeadingMarkers(workingText);
  }

  /**
   * Strip heading markdown markers (# or ## etc) from text
   * Handles both ATX-style (#) and escaped markers (\#)
   */
  private stripHeadingMarkers(text: string): string {
    const trimmed = text.trim();

    // If starts with escaped hash, preserve it
    if (trimmed.startsWith('\\#')) {
      return trimmed;
    }

    // Remove leading hash markers
    return trimmed.replace(/^#+\s+/, '').trim();
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
