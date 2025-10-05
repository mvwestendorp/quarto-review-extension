/**
 * Markdown Utilities Module
 * Provides functions for converting between markdown and HTML, and handling CriticMarkup
 */

/**
 * Placeholder for splitting inline headings
 * @param {HTMLElement} container - Container element
 * @returns {HTMLElement} The container (unchanged)
 */
function splitInlineHeadings(container) {
  // This is a placeholder - the actual splitting happens during markdown conversion
  // The inline headings are converted to markdown with surrounding newlines
  return container;
}

/**
 * Converts jsdiff output to CriticMarkup format
 * @param {Array} diffResult - Output from Diff.diffWords() or Diff.diffLines()
 * @returns {string} Text with CriticMarkup annotations
 * @example
 * const diff = Diff.diffWords('old text', 'new text');
 * const criticMarkup = convertToCriticMarkup(diff);
 * // Returns: "{--old--}{++new++} text"
 */
function convertToCriticMarkup(diffResult) {
  return diffResult.map(part => {
    // Skip whitespace-only additions/deletions
    if ((part.added || part.removed) && part.value.trim().length === 0) {
      return part.value;
    }

    if (part.added) {
      return `{++${part.value}++}`;
    } else if (part.removed) {
      return `{--${part.value}--}`;
    }
    return part.value;
  }).join('');
}

/**
 * Converts markdown text to HTML with support for headers, lists, and inline formatting
 * Strips CriticMarkup annotations during conversion
 * @param {string} markdown - Markdown text to convert
 * @returns {string} HTML representation
 * @example
 * convertMarkdownToHtml('## Hello **World**')
 * // Returns: "<h2>Hello <strong>World</strong></h2>"
 */
function convertMarkdownToHtml(markdown) {
  // Enhanced markdown to HTML conversion with proper list support
  let html = markdown;

  // Strip CriticMarkup comments (they'll be rendered separately as visual indicators)
  // First strip highlight+comment pairs: {==text==}{>>comment<<}
  html = html.replace(/\{==([^=]+)==\}\{>>([^<>]+?)<<\}/g, '$1');
  // Then strip any remaining standalone comments
  html = html.replace(/\{>>(.+?)<<\}/g, '');

  // Unescape markdown escape sequences from Wysimark
  // Remove ALL unnecessary escapes that Wysimark adds
  html = html.replace(/\\([:\-.,!?()\/;.()\/\[\]{}_*`])/g, '$1');

  // Process inline formatting (bold, italic, code)
  // Do this before line processing to preserve formatting within lists
  const processInlineFormatting = (text) => {
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/`(.*?)`/g, '<code>$1</code>');
    return text;
  };

  // Split into lines for better processing
  const lines = html.split('\n');
  const processedLines = [];
  let inList = false;
  let listType = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Check for list items
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    const numberMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);

    if (bulletMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) processedLines.push(`</${listType}>`);
        processedLines.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      processedLines.push(`<li>${processInlineFormatting(bulletMatch[2])}</li>`);
    } else if (numberMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) processedLines.push(`</${listType}>`);
        processedLines.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      processedLines.push(`<li>${processInlineFormatting(numberMatch[2])}</li>`);
    } else {
      // Don't close list for empty lines - keep it open for blank lines between items
      if (line.trim() === '' && inList) {
        // Skip empty lines within lists
        continue;
      }

      // Close any open list only for non-empty, non-list lines
      if (inList) {
        processedLines.push(`</${listType}>`);
        inList = false;
        listType = null;
      }

      // Process other markdown
      if (line.trim()) {
        // Headers (check from most specific to least specific)
        if (line.match(/^###### /)) {
          line = line.replace(/^###### (.*)/, (_, content) => '<h6>' + processInlineFormatting(content) + '</h6>');
        } else if (line.match(/^##### /)) {
          line = line.replace(/^##### (.*)/, (_, content) => '<h5>' + processInlineFormatting(content) + '</h5>');
        } else if (line.match(/^#### /)) {
          line = line.replace(/^#### (.*)/, (_, content) => '<h4>' + processInlineFormatting(content) + '</h4>');
        } else if (line.match(/^### /)) {
          line = line.replace(/^### (.*)/, (_, content) => '<h3>' + processInlineFormatting(content) + '</h3>');
        } else if (line.match(/^## /)) {
          line = line.replace(/^## (.*)/, (_, content) => '<h2>' + processInlineFormatting(content) + '</h2>');
        } else if (line.match(/^# /)) {
          line = line.replace(/^# (.*)/, (_, content) => '<h1>' + processInlineFormatting(content) + '</h1>');
        } else {
          // Regular text - wrap in paragraph for proper block structure
          line = '<p>' + processInlineFormatting(line) + '</p>';
        }
      }

      processedLines.push(line);
    }
  }

  // Close any remaining list
  if (inList) {
    processedLines.push(`</${listType}>`);
  }

  html = processedLines.join('');

  return html;
}

/**
 * Converts markdown to plain text by stripping formatting and CriticMarkup
 * @param {string} markdown - Markdown text to convert
 * @returns {string} Plain text without formatting
 * @example
 * convertMarkdownToText('## Hello **World**')
 * // Returns: "Hello World"
 */
function convertMarkdownToText(markdown) {
  // Convert markdown back to plain text for display
  let text = markdown;

  // Remove CriticMarkup comments
  // First strip highlight+comment pairs: {==text==}{>>comment<<}
  text = text.replace(/\{==([^=]+)==\}\{>>([^<>]+?)<<\}/g, '$1');
  // Then strip any remaining standalone comments
  text = text.replace(/\{>>(.+?)<<\}/g, '');

  // Remove headers
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Remove bold and italic
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/\*(.*?)\*/g, '$1');

  // Remove code
  text = text.replace(/`(.*?)`/g, '$1');

  // Remove links, keep text - simplified approach
  // Will handle basic [text](url) patterns in a future update

  // Remove list markers
  text = text.replace(/^[-*+]\s+/gm, '');

  return text;
}
