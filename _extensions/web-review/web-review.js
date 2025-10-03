/**
 * Debug logging function - only logs when DEBUG mode is enabled
 * Checks for data-web-review-debug attribute on body element at call time
 * @param {...any} args - Arguments to log
 */
function debug(...args) {
  if (document.body && document.body.hasAttribute('data-web-review-debug')) {
    console.log('[Web Review]', ...args);
  }
}

debug("WEB REVIEW EXTENSION LOADED!");

// Load Wysimark from CDN if not already loaded
(function loadWysimark() {
  if (typeof createWysimark !== 'undefined') {
    debug('Wysimark already loaded');
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://unpkg.com/wysimark-standalone@1.0.0/dist/javascript/index.cjs.js';
  script.onload = () => {
    debug('Wysimark loaded successfully from CDN');
  };
  script.onerror = (error) => {
    console.error('Failed to load Wysimark from CDN:', error);
  };
  document.head.appendChild(script);
  debug('Loading Wysimark from CDN...');
})();

// Helper function to convert HTML to Markdown - defined early for use in CriticMarkupManager
function convertHtmlToMarkdown(html) {
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Pre-process: split inline headings into separate blocks
  splitInlineHeadings(tempDiv);

  // Convert HTML elements back to markdown
  let markdown = '';

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();

      // Handle inline headings - convert to proper markdown with newlines
      if (node.classList && node.classList.contains('inline-heading')) {
        const level = node.dataset.headingLevel || 'h2';
        const textContent = Array.from(node.childNodes).map(processNode).join('');
        const prefixes = { h1: '# ', h2: '## ', h3: '### ', h4: '#### ', h5: '##### ', h6: '###### ' };
        const prefix = prefixes[level] || '## ';
        // Use newlines to create proper block-level markdown
        return `\n\n${prefix}${textContent}\n\n`;
      }

      const textContent = Array.from(node.childNodes).map(processNode).join('');

      switch(tagName) {
        case 'h1':
          return '# ' + textContent;
        case 'h2':
          return '## ' + textContent;
        case 'h3':
          return '### ' + textContent;
        case 'h4':
          return '#### ' + textContent;
        case 'h5':
          return '##### ' + textContent;
        case 'h6':
          return '###### ' + textContent;
        case 'strong':
        case 'b':
          return '**' + textContent + '**';
        case 'em':
        case 'i':
          return '*' + textContent + '*';
        case 'code':
          return '`' + textContent + '`';
        case 'a':
          const href = node.getAttribute('href');
          return `[${textContent}](${href})`;
        case 'ul':
          return Array.from(node.children).map(li => '- ' + Array.from(li.childNodes).map(processNode).join('')).join('\n');
        case 'ol':
          return Array.from(node.children).map((li, index) => `${index + 1}. ` + Array.from(li.childNodes).map(processNode).join('')).join('\n');
        case 'li':
          // Handled by parent ul/ol
          return textContent;
        case 'p':
        case 'div':
          return textContent + '\n\n';
        case 'br':
          return '\n';
        case 'span':
          // Regular spans just pass through their content
          return textContent;
        default:
          return textContent;
      }
    }

    return '';
  }

  markdown = Array.from(tempDiv.childNodes).map(processNode).join('');

  // Clean up extra newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

  return markdown;
}

// Helper function to split inline headings into separate blocks
function splitInlineHeadings(container) {
  // This is a placeholder - the actual splitting happens during markdown conversion
  // The inline headings are converted to markdown with surrounding newlines
  return container;
}

/**
 * Manages CriticMarkup annotations, tracking comments and changes for export to QMD format.
 * Provides functionality to add, store, and export collaborative edits using CriticMarkup syntax.
 */
class CriticMarkupManager {
  /**
   * Initializes the CriticMarkup manager with empty comment and change arrays.
   * Attempts to extract the original QMD content from the document.
   */
  constructor() {
    this.comments = [];
    this.changes = [];
    this.originalQMD = this.extractOriginalQMD();
  }

  /**
   * Extracts the original QMD content from the document.
   * @returns {string|null} The original QMD content or null if not found
   */
  extractOriginalQMD() {
    // Try to find embedded QMD content
    const qmdScript = document.getElementById('original-qmd-content');
    if (qmdScript) {
      return qmdScript.textContent;
    }

    // Fallback: try to reconstruct from HTML
    debug('No embedded QMD found, will need to be provided by user');
    return null;
  }

  /**
   * Adds a comment annotation to the tracked comments.
   * @param {string} elementPath - DOM path identifying the element
   * @param {string} selectedText - The text that was selected for commenting
   * @param {string} comment - The comment text
   * @param {string} author - The comment author's name
   * @param {number|null} startOffset - Character offset for the start of selection
   * @param {number|null} endOffset - Character offset for the end of selection
   * @returns {Object} The created comment data object
   */
  addComment(elementPath, selectedText, comment, author, startOffset = null, endOffset = null) {
    // Clean the selected text to remove any UI elements
    const cleanSelectedText = this.cleanTextContent(selectedText);

    const commentData = {
      type: 'comment',
      elementPath: elementPath,
      selectedText: cleanSelectedText,
      comment: comment,
      author: author,
      startOffset: startOffset,
      endOffset: endOffset,
      timestamp: new Date().toISOString(),
      criticMarkup: `{>>${comment} (${author})<<}`
    };

    this.comments.push(commentData);
    this.saveToStorage();
    return commentData;
  }

  /**
   * Adds a change annotation tracking the difference between original and new text.
   * @param {string} elementPath - DOM path identifying the element
   * @param {string} originalText - The original text before editing
   * @param {string} newText - The new text after editing
   * @param {string} author - The change author's name
   * @param {number|null} startOffset - Character offset for the start of change
   * @param {number|null} endOffset - Character offset for the end of change
   * @returns {Object} The created change data object
   */
  addChange(elementPath, originalText, newText, author, startOffset = null, endOffset = null) {
    // Clean the text content to remove any UI elements
    const cleanOriginal = this.cleanTextContent(originalText);
    const cleanNew = this.cleanTextContent(newText);

    debug('Adding change to CriticMarkup:', {
      originalText: cleanOriginal.substring(0, 50),
      newText: cleanNew.substring(0, 50),
      elementPath
    });

    const changeData = {
      type: 'change',
      elementPath: elementPath,
      originalText: cleanOriginal,
      newText: cleanNew,
      author: author,
      startOffset: startOffset,
      endOffset: endOffset,
      timestamp: new Date().toISOString(),
      criticMarkup: `{--${cleanOriginal}--}{++${cleanNew}++} <!-- by ${author} -->`
    };

    this.changes.push(changeData);
    this.saveToStorage();
    debug('Total changes stored:', this.changes.length);
    return changeData;
  }

  /**
   * Cleans text content to remove UI elements while preserving markdown formatting.
   * @param {string} text - The text to clean
   * @returns {string} The cleaned text
   */
  cleanTextContent(text) {
    if (!text) return '';

    // Using DOM-based content extraction to avoid markdown corruption
    debug('cleanTextContent called - using data attribute isolation');

    // Return text as-is to avoid corrupting markdown formatting
    // Content isolation is handled by the generateBasicQMD method using data attributes
    return text.trim();
  }

  /**
   * Computes word-level differences between original and modified text using LCS algorithm.
   * @param {string} original - The original text
   * @param {string} modified - The modified text
   * @returns {Array<Object>} Array of diff operations (unchanged, delete, add)
   */
  findTextDifferences(original, modified) {
    // Word-level diff using LCS algorithm
    // Split on word boundaries while preserving spaces
    const originalTokens = original.split(/(\s+)/);
    const modifiedTokens = modified.split(/(\s+)/);

    // Compute LCS (Longest Common Subsequence)
    const lcs = this.computeLCS(originalTokens, modifiedTokens);

    // Build diff operations from LCS
    const operations = [];
    let origIndex = 0;
    let modIndex = 0;
    let lcsIndex = 0;

    while (origIndex < originalTokens.length || modIndex < modifiedTokens.length) {
      if (lcsIndex < lcs.length &&
          origIndex < originalTokens.length &&
          modIndex < modifiedTokens.length &&
          originalTokens[origIndex] === lcs[lcsIndex] &&
          modifiedTokens[modIndex] === lcs[lcsIndex]) {
        // Common token - keep as is
        operations.push({
          type: 'unchanged',
          text: originalTokens[origIndex]
        });
        origIndex++;
        modIndex++;
        lcsIndex++;
      } else {
        // Collect deleted tokens
        const deleted = [];
        while (origIndex < originalTokens.length &&
               (lcsIndex >= lcs.length || originalTokens[origIndex] !== lcs[lcsIndex])) {
          deleted.push(originalTokens[origIndex]);
          origIndex++;
        }

        // Collect added tokens
        const added = [];
        while (modIndex < modifiedTokens.length &&
               (lcsIndex >= lcs.length || modifiedTokens[modIndex] !== lcs[lcsIndex])) {
          added.push(modifiedTokens[modIndex]);
          modIndex++;
        }

        // Add operations
        if (deleted.length > 0) {
          operations.push({
            type: 'delete',
            text: deleted.join('')
          });
        }
        if (added.length > 0) {
          operations.push({
            type: 'add',
            text: added.join('')
          });
        }
      }
    }

    return operations;
  }

  computeLCS(arr1, arr2) {
    // Dynamic programming LCS algorithm
    const m = arr1.length;
    const n = arr2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to find LCS
    const lcs = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (arr1[i - 1] === arr2[j - 1]) {
        lcs.unshift(arr1[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return lcs;
  }
  
  generateElementPath(element) {
    // Create a unique path to identify the element in the QMD structure
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      if (current.tagName) {
        let selector = current.tagName.toLowerCase();
        
        // Add ID if available
        if (current.id) {
          selector += `#${current.id}`;
        }
        
        // Add classes if available (excluding our extension classes)
        const classes = Array.from(current.classList)
          .filter(cls => !cls.startsWith('web-review-'))
          .join('.');
        if (classes) {
          selector += `.${classes}`;
        }
        
        // Add nth-child if no unique identifier
        if (!current.id && !classes) {
          const siblings = Array.from(current.parentElement?.children || [])
            .filter(el => el.tagName === current.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            selector += `:nth-child(${index})`;
          }
        }
        
        path.unshift(selector);
      }
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }

  /**
   * Saves comments and changes to browser localStorage.
   */
  saveToStorage() {
    localStorage.setItem('webReviewCriticMarkup', JSON.stringify({
      comments: this.comments,
      changes: this.changes,
      lastModified: new Date().toISOString()
    }));
  }

  /**
   * Loads comments and changes from browser localStorage.
   */
  loadFromStorage() {
    const stored = localStorage.getItem('webReviewCriticMarkup');
    if (stored) {
      const data = JSON.parse(stored);
      this.comments = data.comments || [];
      this.changes = data.changes || [];
    }
  }

  /**
   * Exports all comments and changes as CriticMarkup annotations in the QMD content.
   * Processes annotations in reverse order and handles overlapping comments within changes.
   * @returns {string} The QMD content with CriticMarkup annotations applied
   */
  exportToCriticMarkup() {
    let qmdContent = this.originalQMD;

    if (!qmdContent) {
      // If no original QMD, create a basic structure
      qmdContent = this.generateBasicQMD();
    }

    debug('Exporting CriticMarkup - comments:', this.comments.length, 'changes:', this.changes.length);
    debug('Original QMD content length:', qmdContent.length);

    // Collect all annotations (comments and changes) with their positions
    const annotations = [];

    // Add comments with positions
    this.comments.forEach(comment => {
      const selectedText = comment.selectedText.trim();
      if (!selectedText || selectedText.length < 2) return;

      // Find position in content
      const index = qmdContent.indexOf(selectedText);
      if (index !== -1) {
        annotations.push({
          type: 'comment',
          index: index,
          length: 0,  // Zero length because we insert AFTER the text, not replace
          text: selectedText,
          markup: `${selectedText}{>>${comment.comment} (${comment.author})<<}`,
          author: comment.author,
          comment: comment.comment,
          insertAfter: true  // Flag to indicate this inserts after the position
        });
      } else {
        // Could not find exact match - add as HTML comment at end
        annotations.push({
          type: 'comment-fallback',
          index: qmdContent.length,
          length: 0,
          text: selectedText,
          markup: `\n<!-- COMMENT on "${selectedText}": ${comment.comment} (${comment.author}) -->\n`,
          author: comment.author,
          comment: comment.comment
        });
      }
    });

    // Add changes with positions
    this.changes.forEach(change => {
      const originalText = change.originalText.trim();
      const newText = change.newText.trim();

      debug('Processing change:', originalText.substring(0, 30), '->', newText.substring(0, 30));

      if (!originalText || !newText || originalText === newText) {
        debug('Skipping change - empty or identical');
        return;
      }

      // Find position in content
      const index = qmdContent.indexOf(originalText);
      debug('Found change at index:', index);
      if (index !== -1) {
        // Use word-level diff to create granular CriticMarkup
        const diffOps = this.findTextDifferences(originalText, newText);

        // Build CriticMarkup from diff operations
        let criticMarkup = '';
        diffOps.forEach(op => {
          if (op.type === 'unchanged') {
            criticMarkup += op.text;
          } else if (op.type === 'delete') {
            criticMarkup += `{--${op.text}--}`;
          } else if (op.type === 'add') {
            criticMarkup += `{++${op.text}++}`;
          }
        });

        annotations.push({
          type: 'change',
          index: index,
          length: originalText.length,
          text: originalText,
          markup: criticMarkup,
          author: change.author,
          diffOps: diffOps  // Store for comment merging
        });
        debug('Added granular change annotation');
      } else {
        debug('Could not find original text in QMD content');
      }
    });

    // Sort annotations by position (descending) so we apply from end to start
    // This prevents earlier positions from being invalidated
    annotations.sort((a, b) => b.index - a.index);

    debug('Total annotations to apply:', annotations.length);
    debug('Annotations:', annotations.map(a => ({type: a.type, index: a.index, length: a.length, text: a.text?.substring(0, 20)})));

    // Group overlapping annotations - if a comment falls within a change region, embed it
    const processedAnnotations = [];

    // FIRST PASS: Process all changes and mark overlapping comments
    for (let i = 0; i < annotations.length; i++) {
      const annotation = annotations[i];

      if (annotation.type === 'change') {
        // Check if any comments fall within this change region
        const changeStart = annotation.index;
        const changeEnd = annotation.index + annotation.length;
        const overlappingComments = [];

        for (let j = 0; j < annotations.length; j++) {
          const other = annotations[j];
          if (other.type === 'comment' && other.index >= changeStart && other.index < changeEnd) {
            overlappingComments.push(other);
            debug('Found overlapping comment at', other.index, 'within change', changeStart, '-', changeEnd);
          }
        }

        if (overlappingComments.length > 0) {
          // Embed comments in the granular diff markup
          let updatedMarkup = annotation.markup;

          overlappingComments.forEach(comment => {
            // Find the comment's selected text in the markup
            const commentTextIndex = updatedMarkup.indexOf(comment.text);
            if (commentTextIndex !== -1) {
              // Insert comment annotation after the commented text
              const commentAnnotation = `{>>${comment.comment} (${comment.author})<<}`;
              updatedMarkup = updatedMarkup.substring(0, commentTextIndex + comment.text.length) +
                             commentAnnotation +
                             updatedMarkup.substring(commentTextIndex + comment.text.length);
              debug('Embedded comment on:', comment.text);
            }
          });

          annotation.markup = updatedMarkup;
          debug('Merged change with', overlappingComments.length, 'comments');

          // Mark overlapping comments as processed
          overlappingComments.forEach(c => c.processed = true);
        }

        processedAnnotations.push(annotation);
      }
    }

    // SECOND PASS: Add standalone comments (not embedded in changes)
    for (let i = 0; i < annotations.length; i++) {
      const annotation = annotations[i];

      if (annotation.type === 'comment' && !annotation.processed) {
        debug('Adding standalone comment at', annotation.index);
        processedAnnotations.push(annotation);
      } else if (annotation.type === 'comment' && annotation.processed) {
        debug('Skipping processed comment (embedded in change)');
      }
    }

    debug('Processed annotations count:', processedAnnotations.length);

    // Apply all processed annotations in reverse order
    let processedContent = qmdContent;
    processedAnnotations.forEach(annotation => {
      const before = processedContent.substring(0, annotation.index);
      const originalSegment = processedContent.substring(annotation.index, annotation.index + annotation.length);
      const after = processedContent.substring(annotation.index + annotation.length);

      debug(`Applying ${annotation.type} at ${annotation.index}, length ${annotation.length}`);
      debug('Original segment:', originalSegment.substring(0, 60));
      debug('Replacing with:', annotation.markup.substring(0, 80));
      debug('After text:', after.substring(0, 40));

      processedContent = before + annotation.markup + after;
    });

    return processedContent;
  }
  
  extractTextFromDiff(diffHtml) {
    // Create a temporary element to parse the diff HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = diffHtml;
    
    // Extract text by looking for diff content - prioritize new content over old
    const newSpans = tempDiv.querySelectorAll('.diff-added');
    const unchangedSpans = tempDiv.querySelectorAll('.diff-unchanged');
    
    // If there are new/changed parts, combine unchanged + new
    if (newSpans.length > 0) {
      const parts = [];
      // Get all spans in order and combine text
      const allSpans = tempDiv.querySelectorAll('.diff-unchanged, .diff-added');
      for (const span of allSpans) {
        parts.push(span.textContent);
      }
      return parts.join('');
    }
    
    // Fallback: just get all text content
    return tempDiv.textContent;
  }

  generateBasicQMD() {
    // Extract basic content structure from the HTML, avoiding UI elements
    const title = document.querySelector('h1')?.textContent || 'Untitled Document';
    const content = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol, blockquote'))
      .filter(el => {
        // Skip web review UI elements completely
        if (el.closest('#web-review-container')) return false;
        if (el.hasAttribute('data-web-review-ui')) return false;
        if (el.hasAttribute('data-web-review-ui-container')) return false;
        return true;
      })
      .map(el => {
        // Get clean markdown content, preserving formatting
        const getCleanContent = (element) => {
          // If element has been modified, ALWAYS use original markdown for export base
          // The CriticMarkup annotations will show the changes
          if (element.dataset.originalMarkdown) {
            return element.dataset.originalMarkdown;
          }

          // Get innerHTML, but exclude diff wrapper if present
          let htmlContent = element.innerHTML;
          const diffWrapper = element.querySelector('[data-web-review-diff]');
          if (diffWrapper) {
            htmlContent = diffWrapper.innerHTML;
          }

          // For unmodified content, convert HTML to markdown to preserve formatting
          // Check if element has formatting (bold, italic, etc.)
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent;
          if (tempDiv.innerHTML !== tempDiv.textContent) {
            return convertHtmlToMarkdown(htmlContent);
          }

          // Plain text content
          return tempDiv.textContent;
        };
        
        const cleanText = getCleanContent(el);
        
        switch(el.tagName.toLowerCase()) {
          case 'h1': return `# ${cleanText}`;
          case 'h2': return `## ${cleanText}`;
          case 'h3': return `### ${cleanText}`;
          case 'h4': return `#### ${cleanText}`;
          case 'h5': return `##### ${cleanText}`;
          case 'h6': return `###### ${cleanText}`;
          case 'p': return cleanText;
          case 'ul':
            return Array.from(el.querySelectorAll('li'))
              .map(li => {
                const content = getCleanContent(li);
                // Check if content already has a list marker (from markdown)
                if (content.match(/^[-*+]\s/)) {
                  return content;
                }
                return `- ${content}`;
              })
              .join('\n');
          case 'ol':
            return Array.from(el.querySelectorAll('li'))
              .map((li, i) => {
                const content = getCleanContent(li);
                // Check if content already has a list marker (from markdown)
                if (content.match(/^\d+\.\s/)) {
                  return content;
                }
                return `${i+1}. ${content}`;
              })
              .join('\n');
          default: return cleanText;
        }
      })
      .join('\n\n');
    
    // Include basic YAML frontmatter that preserves important metadata
    return `---
title: "${title}"
format: 
  html:
    filters:
      - _extensions/web-review/web-review.lua
web-review:
  enabled: true
  mode: "review"
---

${content}`;
  }
  
  downloadQMDWithCriticMarkup() {
    const content = this.exportToCriticMarkup();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document-with-annotations.qmd';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * Manages user identification and authentication for the Web Review extension.
 * Handles user profiles, avatar colors, and provides foundation for future OAuth2 integration.
 */
class UserManager {
  /**
   * Initializes the UserManager with stored user data and predefined color palette.
   */
  constructor() {
    this.currentUser = localStorage.getItem('webReviewUser') || '';
    this.userColors = JSON.parse(localStorage.getItem('webReviewUserColors') || '{}');
    this.predefinedColors = [
      '#007acc', '#28a745', '#dc3545', '#6f42c1', '#fd7e14',
      '#20c997', '#e83e8c', '#6c757d', '#17a2b8', '#ffc107'
    ];
    this.setupUserInterface();
  }

  /**
   * Sets the current user and assigns a color if not already assigned.
   * @param {string} username - The username to set (empty to clear user)
   */
  setUser(username) {
    if (!username || username.trim() === '') {
      this.currentUser = '';
      localStorage.removeItem('webReviewUser');
      this.updateUserInterface();
      return;
    }
    
    this.currentUser = username.trim();
    localStorage.setItem('webReviewUser', this.currentUser);
    
    // Assign color if not exists
    if (!this.userColors[this.currentUser]) {
      const usedColors = Object.values(this.userColors);
      const availableColors = this.predefinedColors.filter(color => !usedColors.includes(color));
      const selectedColor = availableColors.length > 0 
        ? availableColors[0] 
        : this.predefinedColors[Object.keys(this.userColors).length % this.predefinedColors.length];
      
      this.userColors[this.currentUser] = selectedColor;
      localStorage.setItem('webReviewUserColors', JSON.stringify(this.userColors));
    }
    
    this.updateUserInterface();
  }

  /**
   * Gets the current username or 'Anonymous' if not set.
   * @returns {string} The current username
   */
  getCurrentUser() {
    return this.currentUser || 'Anonymous';
  }

  /**
   * Gets the color assigned to a specific user.
   * @param {string} username - The username
   * @returns {string} Hex color code for the user
   */
  getUserColor(username) {
    return this.userColors[username] || '#666';
  }

  /**
   * Generates user initials from username for avatar display.
   * @param {string} username - The username
   * @returns {string} 1-2 character initials in uppercase
   */
  getUserInitials(username) {
    if (!username) return '?';
    const parts = username.split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Sets up event listener to initialize user interface when DOM is ready.
   */
  setupUserInterface() {
    // Will be called after DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
      this.initializeUserInterface();
    });
  }

  /**
   * Initializes user interface elements and sets up event handlers for username input.
   */
  initializeUserInterface() {
    const usernameInput = document.getElementById('username-input');
    const userAvatar = document.getElementById('user-avatar');
    const userStatus = document.getElementById('user-status');
    
    if (!usernameInput || !userAvatar || !userStatus) return;
    
    // Set initial values
    usernameInput.value = this.currentUser;
    this.updateUserInterface();
    
    // Handle username changes
    usernameInput.addEventListener('blur', () => {
      this.setUser(usernameInput.value);
    });
    
    usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.setUser(usernameInput.value);
        usernameInput.blur();
      }
    });
  }

  /**
   * Updates the user interface elements (avatar and status) based on current user state.
   */
  updateUserInterface() {
    const userAvatar = document.getElementById('user-avatar');
    const userStatus = document.getElementById('user-status');
    
    if (!userAvatar || !userStatus) return;
    
    if (this.currentUser) {
      const initials = this.getUserInitials(this.currentUser);
      const color = this.getUserColor(this.currentUser);
      
      userAvatar.textContent = initials;
      userAvatar.style.background = color;
      userStatus.textContent = `Logged in as ${this.currentUser}`;
      userStatus.style.color = '#28a745';
    } else {
      userAvatar.textContent = '?';
      userAvatar.style.background = '#666';
      userStatus.textContent = 'Guest User';
      userStatus.style.color = '#666';
    }
  }

  /**
   * Placeholder for future OAuth2 authentication integration.
   * @param {string} provider - OAuth2 provider (e.g., 'google', 'github')
   * @returns {Promise<null>} Currently returns null, will return user data when implemented
   */
  async authenticateWithOAuth2(provider = 'google') {
    // This will be implemented when deploying to a web server
    debug(`OAuth2 authentication with ${provider} - Coming soon!`);
    return Promise.resolve(null);
  }
}

// Initialize managers
const userManager = new UserManager();
const criticMarkupManager = new CriticMarkupManager();

document.addEventListener('DOMContentLoaded', function() {
  debug("Initializing Web Review...");

  // Load existing CriticMarkup data
  criticMarkupManager.loadFromStorage();
  
  const toggle = document.getElementById('web-review-toggle');
  const sidebar = document.getElementById('web-review-sidebar');
  const closeBtn = document.getElementById('web-review-close');
  const popup = document.getElementById('web-review-popup');
  const content = document.getElementById('web-review-content');
  
  // Helper function to check if an element is part of the original Quarto document
  function isOriginalContent(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    // Exclude extension elements
    if (element.closest('#web-review-container') ||
        element.closest('#web-review-sidebar') ||
        element.closest('#web-review-popup') ||
        element.id === 'web-review-toggle') {
      return false;
    }

    // Exclude text editor and UI elements
    if (element.classList.contains('web-review-visual-editor') ||
        element.classList.contains('web-review-ui-element') ||
        element.classList.contains('web-review-action-bar') ||
        element.closest('.web-review-visual-editor') ||
        element.closest('.web-review-action-bar')) {
      return false;
    }

    // Exclude elements currently being edited
    if (element.closest('.web-review-editing')) {
      return false;
    }

    // Exclude fixed position high z-index overlays (modals)
    const style = window.getComputedStyle(element);
    if (style.position === 'fixed' && parseInt(style.zIndex) >= 9999) {
      return false;
    }

    // Exclude code blocks and pre-formatted text
    if (element.closest('pre, code')) {
      return false;
    }

    // Exclude navigation, header, footer, and sidebar elements
    if (element.closest('nav, header, footer, aside, .sidebar, .navbar, .navigation')) {
      return false;
    }

    // Only allow content within main content areas
    // Look for common Quarto/article content containers
    const mainContent = element.closest('main, article, #quarto-document-content, .page-columns, [role="main"]');
    if (!mainContent) {
      return false;
    }

    // Allow editable elements: paragraphs, headings, list items
    const editableParent = element.closest('p, h1, h2, h3, h4, h5, h6, li, div');
    if (!editableParent) {
      return false;
    }

    return true;
  }
  
  let sidebarOpen = false;
  let currentSelection = null;

  // ========================================
  // Helper functions for character offsets and DOM ranges
  // ========================================

  // Helper function to position cursor at a character offset in the editor
  function positionCursorAtOffset(editor, charOffset) {
    try {
      // Walk through text nodes to find the position
      const treeWalker = document.createTreeWalker(
        editor,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let currentOffset = 0;
      let targetNode = null;
      let targetOffset = 0;
      let node;

      while ((node = treeWalker.nextNode())) {
        const nodeLength = node.textContent.length;
        if (currentOffset + nodeLength >= charOffset) {
          targetNode = node;
          targetOffset = charOffset - currentOffset;
          break;
        }
        currentOffset += nodeLength;
      }

      if (targetNode) {
        // Create a range and set cursor position
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(targetNode, Math.min(targetOffset, targetNode.length));
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        debug('Positioned cursor at character offset:', charOffset);
      } else {
        debug('Could not find target node for offset:', charOffset);
      }
    } catch (e) {
      debug('Error positioning cursor:', e);
    }
  }

  // Helper to get last text node in an element
  function getLastTextNode(element) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    let lastNode = null;
    let node;
    while ((node = walker.nextNode())) {
      lastNode = node;
    }
    return lastNode;
  }

  // Helper function to get character offset within an element
  function getCharacterOffsetWithin(node, offset, container) {
    const treeWalker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let charCount = 0;
    let currentNode;

    while ((currentNode = treeWalker.nextNode())) {
      if (currentNode === node) {
        return charCount + offset;
      }
      charCount += currentNode.textContent.length;
    }

    return charCount;
  }

  // Helper function to create a range from character offsets
  function createRangeFromOffsets(element, startOffset, endOffset) {
    const treeWalker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let charCount = 0;
    let currentNode;
    let startNode = null;
    let startNodeOffset = 0;
    let endNode = null;
    let endNodeOffset = 0;

    while ((currentNode = treeWalker.nextNode())) {
      const nodeLength = currentNode.textContent.length;

      // Find start position
      if (startNode === null && charCount + nodeLength >= startOffset) {
        startNode = currentNode;
        startNodeOffset = startOffset - charCount;
      }

      // Find end position
      if (endNode === null && charCount + nodeLength >= endOffset) {
        endNode = currentNode;
        endNodeOffset = endOffset - charCount;
        break;
      }

      charCount += nodeLength;
    }

    if (startNode && endNode) {
      const range = document.createRange();
      range.setStart(startNode, startNodeOffset);
      range.setEnd(endNode, endNodeOffset);
      return range;
    }

    return null;
  }

  // ========================================

  // Toggle sidebar
  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    sidebar.style.right = sidebarOpen ? '0px' : '-400px';
    toggle.style.transform = sidebarOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  }
  
  toggle.addEventListener('click', toggleSidebar);
  closeBtn.addEventListener('click', toggleSidebar);
  
  // Export button functionality
  const exportBtn = document.getElementById('export-criticmarkup-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      debug('Exporting CriticMarkup...');
      criticMarkupManager.downloadQMDWithCriticMarkup();
    });
  }

  // Inline diff toggle functionality
  const inlineDiffToggle = document.getElementById('toggle-inline-diff');
  if (inlineDiffToggle) {
    inlineDiffToggle.addEventListener('change', function() {
      window.showInlineDiffVisualization = this.checked;

      // Refresh all modified elements to show/hide diff
      document.querySelectorAll('.web-review-modified').forEach(element => {
        const originalText = element.dataset.originalText;
        const newText = element.dataset.newText;
        const originalMarkdown = element.dataset.originalMarkdown;
        const newMarkdown = element.dataset.newMarkdown;
        const originalHtml = element.dataset.originalHtml;
        const newHtml = element.dataset.newHtml;

        if (this.checked) {
          // Show diff visualization - pass markdown for accurate spacing
          const diffHtml = createInlineDiffVisualization(originalHtml || originalText, newHtml || newText, originalMarkdown, newMarkdown);
          const wrapper = document.createElement('span');
          wrapper.setAttribute('data-web-review-diff', 'true');
          wrapper.innerHTML = diffHtml;
          element.innerHTML = '';
          element.appendChild(wrapper);
        } else {
          // Show just the new content
          const newHtmlContent = newHtml || convertMarkdownToHtml(newMarkdown);
          element.innerHTML = newHtmlContent;
        }
      });
    });
  }

  // Filter functionality
  let currentFilter = 'all';
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      // Update active filter button
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'white';
        b.style.color = '#007acc';
      });
      
      this.classList.add('active');
      this.style.background = '#007acc';
      this.style.color = 'white';
      
      currentFilter = this.dataset.filter;
      filterContent();
    });
  });
  
  function filterContent() {
    const items = content.querySelectorAll('.review-item');
    let visibleCount = 0;
    
    items.forEach(item => {
      const type = item.dataset.type;
      const status = item.dataset.status;
      
      let show = false;
      switch(currentFilter) {
        case 'all':
          show = true;
          break;
        case 'comments':
          show = type === 'comment';
          break;
        case 'changes':
          show = type === 'change';
          break;
        case 'pending':
          show = status === 'pending';
          break;
        case 'accepted':
          show = status === 'accepted';
          break;
      }
      
      if (show) {
        item.style.display = 'block';
        visibleCount++;
      } else {
        item.style.display = 'none';
      }
    });
    
    // Show/hide empty state
    const emptyState = document.getElementById('empty-state');
    if (visibleCount === 0 && items.length > 0) {
      emptyState.textContent = `No ${currentFilter === 'all' ? 'items' : currentFilter} to show.`;
      emptyState.style.display = 'block';
    } else if (visibleCount === 0) {
      emptyState.textContent = 'Select text to add comments or suggestions.';
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
    }
  }
  
  // Text selection handling
  document.addEventListener('mouseup', function(e) {
    const selection = window.getSelection();
    debug('Mouseup event:', {
      target: e.target.tagName,
      targetId: e.target.id,
      targetClass: e.target.className,
      selectionText: selection.toString(),
      isOriginalContent: isOriginalContent(e.target)
    });
    
    // Don't interfere if clicking on popup buttons or extension UI
    if (e.target.closest('#web-review-popup') || 
        e.target.closest('#web-review-container') ||
        e.target.closest('#web-review-sidebar')) {
      debug('Clicked on extension UI, not processing mouseup');
      return;
    }
    
    // Only allow text selection in original Quarto content
    if (!isOriginalContent(e.target)) {
      debug('Target not original content, clearing selection');
      // Clear selection and hide popup if clicking on non-content area
      popup.style.display = 'none';
      currentSelection = null;
      clearTimeout(window.commentPopupTimeout);
      return;
    }
    
    // If there's a text selection
    if (selection.toString().trim().length > 0) {
      // Also check if the selected range is within original content
      const range = selection.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer.nodeType === Node.TEXT_NODE ? 
                           range.commonAncestorContainer.parentElement :
                           range.commonAncestorContainer;
      
      if (!isOriginalContent(commonAncestor)) {
        popup.style.display = 'none';
        currentSelection = null;
        clearTimeout(window.commentPopupTimeout);
        return;
      }
      
      // Clear any existing timeout
      clearTimeout(window.commentPopupTimeout);
      
      // Calculate character offsets for this selection
      const selText = selection.toString();
      const selectionRange = selection.getRangeAt(0);
      const parentEl = selectionRange.commonAncestorContainer.nodeType === Node.TEXT_NODE ?
                      selectionRange.commonAncestorContainer.parentElement :
                      selectionRange.commonAncestorContainer;

      // Get character offsets from the start of the parent element
      const startOffset = getCharacterOffsetWithin(selectionRange.startContainer, selectionRange.startOffset, parentEl);
      const endOffset = getCharacterOffsetWithin(selectionRange.endContainer, selectionRange.endOffset, parentEl);

      debug('Selection offsets:', startOffset, '-', endOffset, 'for text:', selText);
      debug('Parent element:', parentEl.tagName, parentEl.textContent.substring(0, 100));

      // Update current selection (this handles new selections properly)
      currentSelection = {
        text: selection.toString(),
        range: selection.getRangeAt(0).cloneRange(),
        startOffset: startOffset,
        endOffset: endOffset,
        element: selection.getRangeAt(0).commonAncestorContainer.nodeType === Node.TEXT_NODE ?
                 selection.getRangeAt(0).commonAncestorContainer.parentElement :
                 selection.getRangeAt(0).commonAncestorContainer
      };
      
      // Position popup near new selection (always repositions for new selections)
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      popup.style.display = 'block';
      
      // Calculate position relative to document (accounting for scroll)
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      popup.style.left = Math.min(rect.left + scrollLeft, window.innerWidth - 200) + 'px';
      popup.style.top = (rect.bottom + scrollTop + 5) + 'px';
      
      // Update button tooltips with current selection preview
      const selectedText = currentSelection.text;
      const preview = selectedText.length > 30 ? selectedText.substring(0, 30) + '...' : selectedText;
      const addCommentBtn = document.getElementById('add-comment-btn');
      const suggestEditBtn = document.getElementById('suggest-edit-btn');
      
      if (addCommentBtn) {
        addCommentBtn.title = `Add a comment to: "${preview}"`;
      }
      if (suggestEditBtn) {
        suggestEditBtn.title = `Edit text: "${preview}"`;
      }
      
      // Add a subtle animation when repositioning
      popup.style.opacity = '0';
      popup.style.transform = 'translateY(-5px)';
      
      // Animate in with a subtle pulse to show it's updated
      setTimeout(() => {
        popup.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        popup.style.opacity = '1';
        popup.style.transform = 'translateY(0)';
        
        // Add a subtle pulse effect to show the popup is updated
        popup.style.animation = 'web-review-pulse 0.4s ease-in-out';
      }, 10);
      
      // Reset transition and animation after animation
      setTimeout(() => {
        popup.style.transition = '';
        popup.style.animation = '';
      }, 450);
      
      // Hide popup after 8 seconds if not used (longer for better UX)
      window.commentPopupTimeout = setTimeout(() => {
        popup.style.display = 'none';
        currentSelection = null;
      }, 8000);
      
    } else if (!popup.contains(e.target)) {
      // No selection and not clicking on popup - hide it
      popup.style.display = 'none';
      currentSelection = null;
      clearTimeout(window.commentPopupTimeout);
    }
  });
  
  // Handle Escape key to clear selection and hide popup
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && currentSelection) {
      popup.style.display = 'none';
      currentSelection = null;
      clearTimeout(window.commentPopupTimeout);
      
      // Clear any text selection
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
    }
  });
  
  // Hover effects for editable elements
  document.addEventListener('mouseover', function(e) {
    const target = e.target;
    if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(target.tagName) && 
        !target.classList.contains('web-review-editing') && 
        !target.classList.contains('web-review-modified') &&
        isOriginalContent(target)) {
      target.classList.add('web-review-editable-hover');
      target.title = 'Click to edit this text';
    }
  });
  
  document.addEventListener('mouseout', function(e) {
    const target = e.target;
    if (target.classList.contains('web-review-editable-hover')) {
      target.classList.remove('web-review-editable-hover');
      target.title = '';
    }
  });
  
  // Click-to-edit functionality for paragraphs and headers
  document.addEventListener('click', function(e) {
    const target = e.target;

    debug('Click detected on:', target.tagName, target.className, target.textContent?.substring(0, 50));

    // Don't interfere with extension UI clicks - check FIRST before any other logic
    if (target.closest('#web-review-popup') ||
        target.closest('#web-review-container') ||
        target.closest('#web-review-sidebar')) {
      debug('Click on extension UI, not processing for editing');
      return;
    }

    // Only allow editing of original Quarto content
    if (!isOriginalContent(target)) {
      debug('Target not original content, not allowing edit');
      debug('Target element details:', {
        tagName: target.tagName,
        classList: Array.from(target.classList),
        id: target.id,
        parentElement: target.parentElement?.tagName
      });
      return;
    }

    // Find the nearest editable parent element (for cases where user clicks on bold text, etc.)
    let editableElement = target;
    while (editableElement && !['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'UL', 'OL', 'DIV'].includes(editableElement.tagName)) {
      editableElement = editableElement.parentElement;
      // Stop if we've gone too far up (past reasonable content)
      if (!editableElement || editableElement === document.body ||
          editableElement.closest('#web-review-container') ||
          editableElement.closest('#web-review-sidebar')) {
        editableElement = null;
        break;
      }
    }

    // If we found an LI, climb up to the UL/OL parent to edit the whole list
    if (editableElement && editableElement.tagName === 'LI') {
      const listParent = editableElement.closest('ul, ol');
      if (listParent) {
        editableElement = listParent;
        debug('Clicked on LI, editing parent list instead:', listParent.tagName);
        debug('List parent element:', listParent.outerHTML.substring(0, 200));
      }
    }

    // Double-check that the found element is also valid content
    if (editableElement && !isOriginalContent(editableElement)) {
      debug('Found element is not original content, aborting');
      debug('Element that failed isOriginalContent check:', editableElement);
      return;
    }

    debug('Valid editable element found:', editableElement.tagName, editableElement.className);

    // Additional check: Reject DIV elements that contain code blocks or multiple block elements
    if (editableElement && editableElement.tagName === 'DIV') {
      // Check if DIV contains code blocks
      if (editableElement.querySelector('pre, code')) {
        debug('DIV contains code blocks, not allowing edit');
        return;
      }

      // Check if DIV contains multiple paragraphs or headings (structural container, not content)
      const blockChildren = editableElement.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol');
      if (blockChildren.length > 1) {
        debug('DIV is a structural container with multiple blocks, not allowing edit');
        return;
      }

      // Only allow editing DIVs that were created by multi-block changes (have web-review classes)
      if (!editableElement.classList.contains('web-review-modified') &&
          !editableElement.dataset.reviewStatus) {
        debug('DIV is not a review-created element, not allowing edit');
        return;
      }
    }

    debug('Click event for editing:', {
      target: target.tagName,
      editableElement: editableElement?.tagName,
      targetId: target.id,
      targetClass: target.className,
      isOriginalContent: isOriginalContent(target),
      isEditableElement: editableElement !== null,
      hasEditingClass: editableElement?.classList.contains('web-review-editing'),
      hasModifiedClass: editableElement?.classList.contains('web-review-modified')
    });

    // Check if we found an editable parent element
    if (editableElement) {
      // Allow editing if NOT currently being edited
      // (modified elements can be re-edited)
      if (!editableElement.classList.contains('web-review-editing')) {
        debug('Setting up edit timer for element:', editableElement.tagName);
        // Add small delay to distinguish from text selection for comments
        // Calculate click position BEFORE the element is replaced
        let clickCharOffset = null;
        try {
          const x = e.clientX;
          const y = e.clientY;
          let range;

          if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(x, y);
          } else if (document.caretPositionFromPoint) {
            const caretPos = document.caretPositionFromPoint(x, y);
            if (caretPos) {
              range = document.createRange();
              range.setStart(caretPos.offsetNode, caretPos.offset);
            }
          }

          if (range && editableElement.contains(range.startContainer)) {
            clickCharOffset = getCharacterOffsetWithin(range.startContainer, range.startOffset, editableElement);
            debug('Calculated click offset:', clickCharOffset);
          }
        } catch (err) {
          debug('Could not calculate click offset:', err);
        }

        setTimeout(() => {
          const selection = window.getSelection();
          if (!selection || selection.toString().length === 0) {
            debug('No text selection, making element editable');
            makeElementEditable(editableElement, clickCharOffset);
          } else {
            debug('Text selected, not making editable');
          }
        }, 150); // Slightly longer delay for better reliability
      }
    }
  });
  
  // Prevent interference with popup button events
  const addCommentBtn = document.getElementById('add-comment-btn');
  const suggestEditBtn = document.getElementById('suggest-edit-btn');
  
  // Prevent mouseup/mousedown from interfering with button clicks
  [addCommentBtn, suggestEditBtn].forEach(btn => {
    btn.addEventListener('mousedown', function(e) {
      e.stopPropagation();
    });
    btn.addEventListener('mouseup', function(e) {
      e.stopPropagation();
    });
  });
  
  // Add comment functionality
  addCommentBtn.addEventListener('click', function(e) {
    debug('Add comment button clicked', {currentSelection});
    e.preventDefault();
    e.stopPropagation();
    
    // Store current selection before any potential clearing
    const storedSelection = currentSelection;
    
    if (storedSelection) {
      debug('Current selection exists:', storedSelection.text.substring(0, 50));
      // Hide the popup immediately
      popup.style.display = 'none';
      clearTimeout(window.commentPopupTimeout);
      
      showCommentModal(storedSelection.text, function(comment, status) {
        if (comment) {
          addCommentToSidebar(storedSelection.text, comment, status, storedSelection.element, storedSelection.startOffset, storedSelection.endOffset);
          if (!sidebarOpen) toggleSidebar();
        }
        // Clear selection after modal is handled
        currentSelection = null;
      });
    } else {
      debug('No current selection when button clicked');
    }
  });
  
  // Suggest edit functionality
  suggestEditBtn.addEventListener('click', function(e) {
    debug('Suggest edit button clicked', {currentSelection});
    e.preventDefault();
    e.stopPropagation();
    
    // Store current selection before any potential clearing
    const storedSelection = currentSelection;
    
    if (storedSelection && storedSelection.element) {
      // Hide the popup immediately
      popup.style.display = 'none';
      clearTimeout(window.commentPopupTimeout);
      
      // Find the paragraph/header containing the selection
      let targetElement = storedSelection.element;
      while (targetElement && !['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(targetElement.tagName)) {
        targetElement = targetElement.parentElement;
      }
      
      if (targetElement) {
        debug('Making element editable:', targetElement.tagName);
        makeElementEditable(targetElement);
      }
      
      // Clear selection after edit is started
      currentSelection = null;
    } else {
      debug('No current selection or element when suggest edit button clicked');
    }
  });
  
  function makeElementEditable(element, clickCharOffset = null) {
    // Check if there's already an element being edited
    const currentlyEditing = document.querySelector('.web-review-editing');
    if (currentlyEditing && currentlyEditing !== element) {
      debug('Another element is already being edited, showing visual feedback');
      // Show visual feedback on the already open editor
      currentlyEditing.style.animation = 'web-review-pulse 0.8s ease-in-out';
      currentlyEditing.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.3)';
      
      // Remove the effect after animation
      setTimeout(() => {
        currentlyEditing.style.animation = '';
        currentlyEditing.style.boxShadow = '';
      }, 800);
      
      // Scroll to the currently editing element
      currentlyEditing.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return; // Don't open a new editor
    }
    
    // If the same element is already being edited, don't do anything
    if (element.classList.contains('web-review-editing')) {
      debug('Element is already being edited');
      return;
    }
    
    debug('Making element editable:', element.tagName);
    
    // Use stored content for editing and comparison
    let originalText, originalHTML, originalMarkdown;
    let currentText, currentHTML, currentMarkdown;
    let beforeEditHTML; // HTML state before opening editor (to restore if no changes)

    if (element.dataset.originalText && element.dataset.originalMarkdown) {
      // Element has been edited before - get ORIGINAL for comparison, CURRENT for editing
      originalText = element.dataset.originalText;
      originalMarkdown = element.dataset.originalMarkdown;
      originalHTML = element.dataset.originalHtml || convertMarkdownToHtml(originalMarkdown);

      // Get current (last saved) content for editing
      currentText = element.dataset.newText;
      currentMarkdown = element.dataset.newMarkdown;
      currentHTML = convertMarkdownToHtml(currentMarkdown);

      // Store the current HTML state (with diff) to restore if no changes
      beforeEditHTML = element.innerHTML;
      debug('Using original for comparison, current for editing (2nd+ edit)');
    } else {
      // First time editing - current content IS the original
      originalText = element.textContent;
      originalHTML = element.innerHTML; // Preserve original HTML including formatting
      originalMarkdown = getElementMarkdown(element, originalText);

      currentText = originalText;
      currentHTML = originalHTML;
      currentMarkdown = originalMarkdown;
      beforeEditHTML = originalHTML;
      debug('First time editing - using current as original');
      debug('Element type:', element.tagName);
      debug('Original markdown:', originalMarkdown);
    }
    
    const originalStyles = window.getComputedStyle(element);
    
    element.classList.add('web-review-editing');

    // Store original styles for restoration
    element.dataset.originalBackground = element.style.background || '';
    element.dataset.originalBorder = element.style.border || '';
    element.dataset.originalPadding = element.style.padding || '';
    element.dataset.originalMargin = element.style.margin || '';
    element.dataset.originalPaddingLeft = element.style.paddingLeft || '';
    element.dataset.originalMarginLeft = element.style.marginLeft || '';

    // Apply editing styles that preserve the original appearance
    element.style.outline = '2px solid #007acc';
    element.style.background = 'rgba(240, 248, 255, 0.8)';
    element.style.borderRadius = '4px';
    element.style.position = 'relative';

    // Remove default list indentation when editing UL/OL
    if (element.tagName === 'UL' || element.tagName === 'OL') {
      element.style.paddingLeft = '0';
      element.style.marginLeft = '0';
    }
    
    // Create editing container with reset styles to prevent inheritance
    const editContainer = document.createElement('div');
    editContainer.style.cssText =
      'background: white; border: 1px solid #007acc; border-radius: 4px; padding: 8px; ' +
      'font-size: 14px !important; line-height: 1.4 !important; ' +
      'color: #333 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;';
    
    // Create Wysimark editor container
    const wysimarkContainer = document.createElement('div');
    wysimarkContainer.className = 'web-review-wysimark-container';
    wysimarkContainer.style.cssText =
      'width: 100%; min-height: 200px; margin-bottom: 8px;';

    // Will hold the Wysimark instance
    let wysimarkInstance = null;

    // Create source textarea (hidden initially) - use CURRENT content for editing
    const textarea = document.createElement('textarea');
    textarea.value = currentMarkdown;
    textarea.style.cssText =
      'width: 100%; min-height: 80px; padding: 8px; border: 1px solid #ddd; border-radius: 3px; ' +
      'font-family: "Courier New", monospace !important; font-size: 13px !important; line-height: 1.4 !important; ' +
      'color: #333 !important; resize: vertical; display: none;';
    
    let isVisualMode = true;
    let pendingHeadingLevel = null; // Track if user clicked heading button and is about to type
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 
      'margin-top: 8px; display: flex; gap: 8px; justify-content: space-between; align-items: center;';
    
    const leftButtons = document.createElement('div');
    leftButtons.style.cssText = 'display: flex; gap: 8px;';
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Changes';
    saveBtn.title = 'Save your changes and apply them to the document';
    saveBtn.style.cssText = 
      'background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer;';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.title = 'Cancel editing and discard changes';
    cancelBtn.style.cssText = 
      'background: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer;';
    
    // Create segmented mode toggle
    const modeToggleContainer = document.createElement('div');
    modeToggleContainer.className = 'web-review-mode-toggle';
    
    const visualModeBtn = document.createElement('button');
    visualModeBtn.className = 'web-review-mode-btn active';
    visualModeBtn.innerHTML = '<span>📝</span> Visual Editor';
    visualModeBtn.title = 'Visual Editor - WYSIWYG editing with formatting toolbar';
    
    const sourceModeBtn = document.createElement('button');
    sourceModeBtn.className = 'web-review-mode-btn';
    sourceModeBtn.innerHTML = '<span>💻</span> Source Code';
    sourceModeBtn.title = 'Source Code - Edit raw Markdown syntax';
    
    modeToggleContainer.appendChild(visualModeBtn);
    modeToggleContainer.appendChild(sourceModeBtn);
    
    const helpText = document.createElement('small');
    helpText.textContent = 'Visual markdown editing';
    helpText.style.color = '#666';
    
    leftButtons.appendChild(saveBtn);
    leftButtons.appendChild(cancelBtn);
    leftButtons.appendChild(modeToggleContainer);
    
    buttonContainer.appendChild(leftButtons);
    buttonContainer.appendChild(helpText);
    
    editContainer.appendChild(wysimarkContainer);
    editContainer.appendChild(textarea);
    editContainer.appendChild(buttonContainer);

    element.innerHTML = '';
    element.appendChild(editContainer);

    // Initialize Wysimark editor (with retry for CDN loading)
    function initializeWysimark(retryCount = 0) {
      if (typeof createWysimark !== 'undefined') {
        try {
          wysimarkInstance = createWysimark(wysimarkContainer, {
            initialMarkdown: currentMarkdown,
            placeholder: 'Edit your content here...',
            minHeight: '200px',
            onChange: (markdown) => {
              // Sync with textarea for source mode toggle
              textarea.value = markdown;
            }
          });
          console.log('Wysimark editor initialized successfully');
        } catch (error) {
          console.error('Wysimark initialization error:', error);
          wysimarkContainer.innerHTML = '<p style="color: red;">Error initializing editor: ' + error.message + '</p>';
        }
      } else if (retryCount < 20) {
        // Wysimark not loaded yet, wait and retry (max 20 retries = 10 seconds)
        wysimarkContainer.innerHTML = '<p style="color: #666; text-align: center; padding: 40px;">Loading editor...</p>';
        setTimeout(() => initializeWysimark(retryCount + 1), 500);
      } else {
        console.error('Wysimark failed to load after multiple retries');
        wysimarkContainer.innerHTML = '<p style="color: red;">Error: Wysimark editor failed to load. Please refresh the page.</p>';
      }
    }

    initializeWysimark();

    // Mode toggle functions (Wysimark handles all formatting internally)
    function switchToVisualMode() {
      isVisualMode = true;
      if (wysimarkInstance) {
        const sourceMarkdown = textarea.value;
        wysimarkInstance.setMarkdown(sourceMarkdown);
        wysimarkContainer.style.display = 'block';
        textarea.style.display = 'none';
      }

      visualModeBtn.classList.add('active');
      sourceModeBtn.classList.remove('active');
      helpText.textContent = 'Visual markdown editing (powered by Wysimark)';
    }

    function switchToSourceMode() {
      isVisualMode = false;
      if (wysimarkInstance) {
        const visualMarkdown = wysimarkInstance.getMarkdown();
        textarea.value = visualMarkdown;
        wysimarkContainer.style.display = 'none';
        textarea.style.display = 'block';
      }

      visualModeBtn.classList.remove('active');
      sourceModeBtn.classList.add('active');
      helpText.textContent = 'Markdown source editing';
      textarea.focus();
    }

    visualModeBtn.addEventListener('click', switchToVisualMode);
    sourceModeBtn.addEventListener('click', switchToSourceMode);

    saveBtn.addEventListener('click', function() {
      // Get current content based on mode
      let newMarkdown;
      if (isVisualMode && wysimarkInstance) {
        newMarkdown = wysimarkInstance.getMarkdown();
      } else {
        newMarkdown = textarea.value;
      }

      const newText = convertMarkdownToText(newMarkdown);
      const newHtml = convertMarkdownToHtml(newMarkdown);
      const originalHtml = convertMarkdownToHtml(originalMarkdown);

      // Compare normalized text content, not markdown (to avoid false positives from formatting changes)
      const cleanOriginalText = originalText.replace(/\s+/g, ' ').trim();
      const cleanNewText = newText.replace(/\s+/g, ' ').trim();

      // Only save if there are actual content changes
      if (cleanNewText !== cleanOriginalText) {
        // Save to persistence layer
        saveElementChange(element, originalMarkdown, newMarkdown);

        // Store the clean versions for later use in export
        element.dataset.cleanOriginalText = cleanOriginalText;
        element.dataset.cleanNewText = cleanNewText;

        // showInlineDiff now handles adding to sidebar
        showInlineDiff(element, cleanOriginalText, cleanNewText, originalMarkdown, newMarkdown, originalHtml, newHtml);
      } else {
        // No actual content changes - restore to state before editing (preserves diff if it existed)
        element.innerHTML = beforeEditHTML;
        element.classList.remove('web-review-editing');
        element.style.outline = '';
        element.style.background = '';

        // Restore list padding/margin if this was a list
        if (element.tagName === 'UL' || element.tagName === 'OL') {
          element.style.paddingLeft = element.dataset.originalPaddingLeft || '';
          element.style.marginLeft = element.dataset.originalMarginLeft || '';
        }
      }
    });
    
    cancelBtn.addEventListener('click', function() {
      element.classList.remove('web-review-editing');

      // Restore to state before editing (preserves diff if it existed)
      element.innerHTML = beforeEditHTML;
      
      // Restore original styles
      element.style.outline = '';
      element.style.background = element.dataset.originalBackground;
      element.style.border = element.dataset.originalBorder;
      element.style.padding = element.dataset.originalPadding;
      element.style.margin = element.dataset.originalMargin;
      element.style.paddingLeft = element.dataset.originalPaddingLeft;
      element.style.marginLeft = element.dataset.originalMarginLeft;
      element.style.borderRadius = '';
      element.style.position = '';

      // Clean up data attributes
      delete element.dataset.originalBackground;
      delete element.dataset.originalBorder;
      delete element.dataset.originalPadding;
      delete element.dataset.originalMargin;
      delete element.dataset.originalPaddingLeft;
      delete element.dataset.originalMarginLeft;
    });
  }
  
  // Helper functions for markdown conversion
  function getElementMarkdown(element, text) {
    // Convert HTML element back to markdown based on tag type and context
    switch(element.tagName) {
      case 'H1': return '# ' + text;
      case 'H2': return '## ' + text;
      case 'H3': return '### ' + text;
      case 'H4': return '#### ' + text;
      case 'H5': return '##### ' + text;
      case 'H6': return '###### ' + text;
      case 'UL':
        // Convert unordered list to markdown
        return convertHtmlToMarkdown(element.outerHTML);
      case 'OL':
        // Convert ordered list to markdown
        return convertHtmlToMarkdown(element.outerHTML);
      case 'LI':
        // For list items, return just the content WITHOUT list markers
        // The list structure is part of the parent, not the LI content
        // Convert inner HTML to markdown to preserve formatting
        if (element.innerHTML !== element.textContent) {
          return convertHtmlToMarkdown(element.innerHTML);
        } else {
          return text;
        }
      default:
        // Preserve existing formatting if element already has HTML structure
        if (element.innerHTML !== element.textContent) {
          return convertHtmlToMarkdown(element.innerHTML);
        }
        return text;
    }
  }
  
  function convertMarkdownToHtml(markdown) {
    // Enhanced markdown to HTML conversion with proper list support
    let html = markdown;

    // Unescape markdown escape sequences from Wysimark
    html = html.replace(/\\([()\/\[\]{}\-_*`])/g, '$1');

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
  
  function convertMarkdownToText(markdown) {
    // Convert markdown back to plain text for display
    let text = markdown;
    
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
  
  function saveElementChange(element, originalMarkdown, newMarkdown) {
    // Get or create document changes storage
    if (!window.webReviewChanges) {
      window.webReviewChanges = {
        comments: [],
        textChanges: [],
        metadata: {
          documentTitle: document.title,
          timestamp: new Date().toISOString()
        }
      };
    }

    // Create element identifier
    const elementId = getElementIdentifier(element);

    // Check if there's already a pending change for this element
    const existingChangeIndex = window.webReviewChanges.textChanges.findIndex(
      change => change.elementId === elementId && change.status === 'pending'
    );

    if (existingChangeIndex !== -1) {
      // Update existing pending change (keep original, update new)
      const existingChange = window.webReviewChanges.textChanges[existingChangeIndex];
      existingChange.newMarkdown = newMarkdown;
      existingChange.timestamp = new Date().toISOString();
      existingChange.user = userManager.getCurrentUser();
      existingChange.userColor = userManager.getUserColor(userManager.getCurrentUser());
      debug('Updated existing change for element:', elementId);
    } else {
      // Create new change
      window.webReviewChanges.textChanges.push({
        id: 'change-' + Date.now(),
        elementId: elementId,
        originalMarkdown: originalMarkdown,
        newMarkdown: newMarkdown,
        timestamp: new Date().toISOString(),
        status: 'pending',
        user: userManager.getCurrentUser(),
        userColor: userManager.getUserColor(userManager.getCurrentUser())
      });
      debug('Created new change for element:', elementId);
    }

    // Save to localStorage
    localStorage.setItem('webReviewChanges', JSON.stringify(window.webReviewChanges));

    debug('Saved change for element:', elementId, 'by user:', userManager.getCurrentUser());
  }
  
  function getElementIdentifier(element) {
    // Create a unique identifier for the element
    const tagName = element.tagName.toLowerCase();
    const text = element.textContent.substring(0, 50).replace(/\s+/g, ' ').trim();
    const siblings = Array.from(element.parentNode.children);
    const index = siblings.indexOf(element);
    
    return tagName + '[' + index + ']:"' + text + '"';
  }

  // Global setting for inline diff visualization
  window.showInlineDiffVisualization = true;

  function showInlineDiff(element, originalText, newText, originalMarkdown, newMarkdown, originalHtml, newHtml) {
    // Store existing comment data before updating
    const existingComments = element.dataset.comments ? JSON.parse(element.dataset.comments) : [];

    // Check if the new markdown contains multiple blocks
    const blocks = newMarkdown.split(/\n\n+/).filter(block => block.trim());

    // For lists, check if blocks contain non-list content (headings, paragraphs, etc.)
    let hasMultipleBlocks = blocks.length > 1;
    if ((element.tagName === 'UL' || element.tagName === 'OL') && blocks.length > 1) {
      // Check if all blocks are list items (start with - or number.)
      const allListItems = blocks.every(block =>
        block.match(/^[-*+]\s/) || block.match(/^\d+\.\s/)
      );
      // If all blocks are list items, it's still single-block (just list with blank lines)
      hasMultipleBlocks = !allListItems;
    }

    debug('showInlineDiff called:', {
      elementTag: element.tagName,
      hasMultipleBlocks,
      newMarkdown: newMarkdown,
      blocks: blocks,
      blockCount: blocks.length
    });

    // Check if inline diff is enabled
    if (window.showInlineDiffVisualization) {
      // Create inline diff visualization with color coding - pass markdown for accurate space comparison
      const diffHtml = createInlineDiffVisualization(originalHtml || originalText, newHtml || newText, originalMarkdown, newMarkdown);

      if (hasMultipleBlocks) {
        // Multi-block content: need to replace the element with a container
        debug('Multi-block path: creating container DIV');
        debug('diffHtml:', diffHtml);
        const container = document.createElement('div');
        container.setAttribute('data-web-review-diff', 'true');
        container.innerHTML = diffHtml;

        // Copy only non-data attributes and classes from the original element
        Array.from(element.attributes).forEach(attr => {
          if (!attr.name.startsWith('data-')) {
            container.setAttribute(attr.name, attr.value);
          }
        });
        container.className = element.className;

        // Replace the element with the container
        element.replaceWith(container);
        element = container;
      } else if (element.tagName === 'UL' || element.tagName === 'OL') {
        // For lists, replace innerHTML directly to preserve the list element itself
        // Extract just the list items from the diff HTML (which includes the ul/ol wrapper)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = diffHtml;
        const innerList = tempDiv.querySelector('ul, ol');
        const listItemsHtml = innerList ? innerList.innerHTML : diffHtml;

        debug('List diff - diffHtml:', diffHtml.substring(0, 300));
        debug('List diff - innerList found:', !!innerList, innerList?.tagName);
        debug('List diff - extracted listItemsHtml:', listItemsHtml.substring(0, 300));
        debug('List diff - element before:', element.outerHTML.substring(0, 300));

        element.setAttribute('data-web-review-diff', 'true');
        element.innerHTML = listItemsHtml;

        debug('List diff - element after:', element.outerHTML.substring(0, 300));
        debug('List diff - element children count:', element.children.length);
      } else {
        // Single block: check if element type changed
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = diffHtml;
        const firstChild = tempDiv.firstElementChild;

        // If diff contains a different block type (e.g., p changed to h3), replace element
        if (firstChild && firstChild.tagName !== element.tagName &&
            ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P'].includes(firstChild.tagName)) {
          debug('Block type changed from', element.tagName, 'to', firstChild.tagName, '- replacing element');

          // Create new element with correct type
          const newElement = document.createElement(firstChild.tagName);
          newElement.setAttribute('data-web-review-diff', 'true');
          newElement.innerHTML = firstChild.innerHTML;

          // Copy classes and attributes
          Array.from(element.attributes).forEach(attr => {
            if (!attr.name.startsWith('data-') && attr.name !== 'class') {
              newElement.setAttribute(attr.name, attr.value);
            }
          });
          newElement.className = element.className.replace('web-review-editing', 'web-review-modified');

          // Replace element
          element.replaceWith(newElement);
          element = newElement;
        } else {
          // Same type or inline diff - wrap in a span as before
          const wrapper = document.createElement('span');
          wrapper.setAttribute('data-web-review-diff', 'true');
          wrapper.innerHTML = diffHtml;

          element.innerHTML = '';
          element.appendChild(wrapper);
        }
      }
    } else {
      // Just show the new content without diff visualization
      const newHtmlContent = newHtml || convertMarkdownToHtml(newMarkdown);

      if (hasMultipleBlocks) {
        // Multi-block content: replace element with container
        const container = document.createElement('div');
        container.innerHTML = newHtmlContent;

        // Copy only non-data attributes and classes from the original element
        Array.from(element.attributes).forEach(attr => {
          if (!attr.name.startsWith('data-')) {
            container.setAttribute(attr.name, attr.value);
          }
        });
        container.className = element.className;

        // Replace the element with the container
        element.replaceWith(container);
        element = container;
      } else if (element.tagName === 'UL' || element.tagName === 'OL') {
        // For lists, extract just the list items from the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newHtmlContent;
        const innerList = tempDiv.querySelector('ul, ol');
        const listItemsHtml = innerList ? innerList.innerHTML : newHtmlContent;

        element.innerHTML = listItemsHtml;
      } else {
        // Check if element type changed (e.g., p to heading)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newHtmlContent;
        const firstChild = tempDiv.firstElementChild;

        if (firstChild && firstChild.tagName !== element.tagName &&
            ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P'].includes(firstChild.tagName)) {
          debug('Block type changed (no diff) from', element.tagName, 'to', firstChild.tagName);

          // Replace with correct element type
          const newElement = document.createElement(firstChild.tagName);
          newElement.innerHTML = firstChild.innerHTML;

          // Copy classes and attributes
          Array.from(element.attributes).forEach(attr => {
            if (!attr.name.startsWith('data-') && attr.name !== 'class') {
              newElement.setAttribute(attr.name, attr.value);
            }
          });
          newElement.className = element.className.replace('web-review-editing', 'web-review-modified');

          element.replaceWith(newElement);
          element = newElement;
        } else {
          element.innerHTML = newHtmlContent;
        }
      }
    }

    // Now set the data attributes and styles (after potential element replacement)
    element.classList.remove('web-review-editing');
    element.classList.add('web-review-modified');
    element.style.outline = '';
    element.style.background = '';

    // Restore list padding/margin if this was a list
    if (element.tagName === 'UL' || element.tagName === 'OL') {
      element.style.paddingLeft = element.dataset.originalPaddingLeft || '';
      element.style.marginLeft = element.dataset.originalMarginLeft || '';
    }

    // Store the change data on the element for sidebar access
    element.dataset.originalText = originalText;
    element.dataset.newText = newText;
    element.dataset.originalMarkdown = originalMarkdown;
    element.dataset.newMarkdown = newMarkdown;
    element.dataset.originalHtml = originalHtml || '';
    element.dataset.newHtml = newHtml || '';
    element.dataset.reviewStatus = 'pending';

    // Restore comment highlights if they existed
    if (existingComments.length > 0) {
      element.dataset.comments = JSON.stringify(existingComments);
      existingComments.forEach(commentData => {
        reapplyCommentHighlight(element, commentData.text, commentData.id, commentData.userColor, commentData.startOffset || 0, commentData.endOffset || 0, commentData.commentText || '');
      });
    }

    // Update the sidebar to show this change
    updateSidebarWithChange(element, originalText, newText, originalMarkdown, newMarkdown);
  }

  function reapplyCommentHighlight(element, text, commentId, userColor, startOffset = 0, endOffset = 0, commentText = '') {
    // Re-apply comment highlight after content has been updated
    // Check if this comment isn't already highlighted
    if (element.querySelector(`[data-comment="${commentId}"]`)) {
      return; // Already highlighted
    }

    // Use DOM range to highlight at the exact character offsets
    const range = createRangeFromOffsets(element, startOffset, endOffset);

    if (range) {
      const highlightColor = userColor + '40';
      const borderColor = userColor;

      const highlightSpan = document.createElement('mark');
      highlightSpan.setAttribute('data-comment', commentId);
      highlightSpan.setAttribute('data-comment-id', commentId);
      highlightSpan.className = 'comment-highlight';
      highlightSpan.style.cssText = `background: ${highlightColor}; border: 2px solid ${borderColor}; padding: 1px 2px; border-radius: 3px; cursor: pointer; font-weight: bold;`;
      highlightSpan.title = commentText || 'Click to view/edit comment';

      // Add click handler to show comment
      highlightSpan.addEventListener('click', function(e) {
        e.stopPropagation();
        showCommentEditDialog(commentId);
      });

      try {
        range.surroundContents(highlightSpan);
      } catch (e) {
        // Fallback: try extracting and wrapping
        try {
          const contents = range.extractContents();
          highlightSpan.appendChild(contents);
          range.insertNode(highlightSpan);
        } catch (e2) {
          console.error('Failed to reapply comment highlight:', e2);
        }
      }
    }
  }

  function createListDiff(originalHtml, newHtml) {
    // Extract list items from both versions
    const originalDiv = document.createElement('div');
    originalDiv.innerHTML = originalHtml;
    const originalList = originalDiv.querySelector('ul, ol');
    const originalItems = originalList ? Array.from(originalList.querySelectorAll('li')) : [];

    const newDiv = document.createElement('div');
    newDiv.innerHTML = newHtml;
    const newList = newDiv.querySelector('ul, ol');
    const newItems = newList ? Array.from(newList.querySelectorAll('li')) : [];
    const listType = newList ? newList.tagName.toLowerCase() : 'ul';

    // Compare items by their text content to find matching pairs
    const maxItems = Math.max(originalItems.length, newItems.length);
    let resultHtml = `<${listType}>`;

    for (let i = 0; i < maxItems; i++) {
      const originalItem = originalItems[i];
      const newItem = newItems[i];

      if (originalItem && newItem) {
        // Both items exist - check if content changed
        const originalHtml = originalItem.innerHTML.trim();
        const newHtml = newItem.innerHTML.trim();

        if (originalHtml === newHtml) {
          // No change
          resultHtml += `<li>${newItem.innerHTML}</li>`;
        } else {
          // Changed - use the inline diff visualization for this item
          // Extract text for markdown context (helps with formatting preservation)
          const originalItemText = originalItem.textContent.trim();
          const newItemText = newItem.textContent.trim();
          const itemDiff = createInlineDiffVisualization(originalHtml, newHtml, originalItemText, newItemText);
          resultHtml += `<li>${itemDiff}</li>`;
        }
      } else if (newItem) {
        // New item added
        resultHtml += `<li style="background-color: rgba(16, 185, 129, 0.2); color: #047857;">${newItem.innerHTML}</li>`;
      } else if (originalItem) {
        // Item removed
        resultHtml += `<li style="background-color: rgba(239, 68, 68, 0.2); text-decoration: line-through; color: #dc2626;">${originalItem.innerHTML}</li>`;
      }
    }

    resultHtml += `</${listType}>`;
    return resultHtml;
  }

  function createInlineDiffVisualization(originalHtml, newHtml, originalMarkdown, newMarkdown) {
    // Check if the HTML contains multiple block elements
    const newDiv = document.createElement('div');
    newDiv.innerHTML = newHtml;
    const blockElements = newDiv.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol, li');

    // If there are multiple block elements, check if it's ONLY a list
    if (blockElements.length > 1) {
      const list = newDiv.querySelector('ul, ol');
      const isList = list !== null;

      if (isList) {
        // Check if ALL content is within the list (no other siblings)
        const listOnly = newDiv.children.length === 1 && newDiv.children[0] === list;

        if (listOnly) {
          // It's only a list (possibly with blank lines between items) - do list diff
          return createListDiff(originalHtml, newHtml);
        }
      }

      // Multiple different block types (list + heading, etc.)
      // Compare blocks and highlight added/removed elements
      debug('Multiple different block types detected, doing block-level diff');

      const originalDiv = document.createElement('div');
      originalDiv.innerHTML = originalHtml;
      const originalBlocks = Array.from(originalDiv.children);

      const newBlocks = Array.from(newDiv.children);

      let resultHtml = '';

      // Compare blocks intelligently
      const maxBlocks = Math.max(originalBlocks.length, newBlocks.length);

      for (let i = 0; i < maxBlocks; i++) {
        const origBlock = originalBlocks[i];
        const newBlock = newBlocks[i];

        if (origBlock && newBlock) {
          // Both exist - check if same type
          if (origBlock.tagName === newBlock.tagName) {
            // Same type - check if content changed
            const origContent = origBlock.innerHTML.trim();
            const newContent = newBlock.innerHTML.trim();

            if (origContent === newContent) {
              // No change - use new block as-is
              resultHtml += newBlock.outerHTML;
            } else {
              // Content changed - create diff for this block
              if (newBlock.tagName === 'UL' || newBlock.tagName === 'OL') {
                // List - use list diff
                const listDiff = createListDiff(origBlock.outerHTML, newBlock.outerHTML);
                resultHtml += listDiff;
              } else {
                // Other block types - show with change indicator
                resultHtml += `<div style="border-left: 3px solid #3b82f6; padding-left: 8px;">${newBlock.outerHTML}</div>`;
              }
            }
          } else {
            // Different type - show as removed + added
            resultHtml += `<div style="background-color: rgba(239, 68, 68, 0.2); padding: 8px; margin: 4px 0; border-left: 3px solid #dc2626;">${origBlock.outerHTML}</div>`;
            resultHtml += `<div style="background-color: rgba(16, 185, 129, 0.2); padding: 8px; margin: 4px 0; border-left: 3px solid #047857;">${newBlock.outerHTML}</div>`;
          }
        } else if (newBlock) {
          // Added block - highlight it
          resultHtml += `<div style="background-color: rgba(16, 185, 129, 0.2); padding: 8px; margin: 4px 0; border-left: 3px solid #047857;">${newBlock.outerHTML}</div>`;
        } else if (origBlock) {
          // Removed block
          resultHtml += `<div style="background-color: rgba(239, 68, 68, 0.2); padding: 8px; margin: 4px 0; border-left: 3px solid #dc2626; text-decoration: line-through;">${origBlock.outerHTML}</div>`;
        }
      }

      return resultHtml;
    }

    // Extract plain text from HTML, normalizing whitespace
    const originalDiv = document.createElement('div');
    originalDiv.innerHTML = originalHtml;
    let originalPlainText = (originalDiv.textContent || '').replace(/\s+/g, ' ').trim();

    let newPlainText = (newDiv.textContent || '').replace(/\s+/g, ' ').trim();

    // Check if only formatting changed (same text, different HTML)
    if (originalPlainText === newPlainText && originalHtml !== newHtml) {
      // Only formatting changed - highlight specific formatted parts
      return highlightFormattingChanges(originalHtml, newHtml, originalPlainText);
    }

    // Text content changed - do word-level diff
    // Split by spaces but preserve single spaces between words
    const originalWords = originalPlainText.split(/(\s+)/);
    const newWords = newPlainText.split(/(\s+)/);
    const lcs = computeLCS(originalWords, newWords);
    const diffItems = generateDiffFromLCS(originalWords, newWords, lcs);

    // Build result HTML with color coding
    let resultHtml = '';

    diffItems.forEach(item => {
      if (item.type === 'added') {
        // Green for added text
        resultHtml += `<ins style="background: #d4edda; color: #155724; text-decoration: none; padding: 2px 4px; border-radius: 2px; font-weight: 500;">${escapeHtml(item.value)}</ins>`;
      } else if (item.type === 'deleted') {
        // Red strikethrough for removed text
        resultHtml += `<del style="background: #f8d7da; color: #721c24; text-decoration: line-through; padding: 2px 4px; border-radius: 2px; opacity: 0.8;">${escapeHtml(item.value)}</del>`;
      } else {
        // Unchanged text
        resultHtml += escapeHtml(item.value);
      }
    });

    // If new HTML has formatting tags or headers, try to apply them to the diff result
    if (newHtml.includes('<strong>') || newHtml.includes('<em>') || newHtml.includes('<code>') ||
        newHtml.includes('<h1>') || newHtml.includes('<h2>') || newHtml.includes('<h3>') ||
        newHtml.includes('<h4>') || newHtml.includes('<h5>') || newHtml.includes('<h6>') ||
        newHtml.includes('inline-heading')) {
      // Try to merge formatting - for now, show the diff with basic formatting preserved
      // More sophisticated: parse and map formatting to diff ranges
      return applyFormattingToDiff(newHtml, resultHtml, diffItems, newPlainText);
    }

    return resultHtml;
  }

  function highlightFormattingChanges(originalHtml, newHtml, plainText) {
    // Build a character-level map of formatting for both versions
    const originalFormatMap = buildFormattingMap(originalHtml);
    const newFormatMap = buildFormattingMap(newHtml);

    // Find ranges where formatting differs
    const words = plainText.split(/(\s+)/);
    let charIndex = 0;
    let result = '';

    words.forEach(word => {
      const wordStart = charIndex;
      const wordEnd = charIndex + word.length;

      // Check if formatting changed for this word
      let formattingChanged = false;
      for (let i = wordStart; i < wordEnd; i++) {
        const originalFormat = (originalFormatMap[i] || []).sort().join(',');
        const newFormat = (newFormatMap[i] || []).sort().join(',');
        if (originalFormat !== newFormat) {
          formattingChanged = true;
          break;
        }
      }

      // Get the formatted version of this word from newHtml
      const wordHtml = extractFormattedWord(newHtml, word, charIndex);

      if (formattingChanged) {
        // Highlight with blue background to show formatting changed
        result += `<span style="background: rgba(173, 216, 230, 0.3); padding: 1px 3px; border-radius: 2px;">${wordHtml}</span>`;
      } else {
        // No formatting change, just add the word
        result += wordHtml;
      }

      charIndex += word.length;
    });

    return result;
  }

  function buildFormattingMap(html) {
    const div = document.createElement('div');
    div.innerHTML = html;

    const formatMap = [];
    let charIndex = 0;

    function traverse(node, activeFormats = []) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        for (let i = 0; i < text.length; i++) {
          formatMap[charIndex++] = [...activeFormats];
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        const newFormats = [...activeFormats];

        // Check for inline-heading spans
        if (node.classList && node.classList.contains('inline-heading')) {
          const level = node.dataset.headingLevel || 'h2';
          newFormats.push('inline-heading-' + level);
        } else if (['strong', 'b', 'em', 'i', 'code'].includes(tagName)) {
          newFormats.push(tagName);
        }

        Array.from(node.childNodes).forEach(child => traverse(child, newFormats));
      }
    }

    traverse(div);
    return formatMap;
  }

  function extractFormattedWord(html, word, wordStartIndex) {
    const div = document.createElement('div');
    div.innerHTML = html;

    let charIndex = 0;
    let found = false;
    let result = '';

    function traverse(node) {
      if (found) return;

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        const nodeStart = charIndex;
        const nodeEnd = charIndex + text.length;

        if (wordStartIndex >= nodeStart && wordStartIndex < nodeEnd) {
          // This text node contains the start of our word
          const relativeStart = wordStartIndex - nodeStart;
          const relativeEnd = Math.min(relativeStart + word.length, text.length);
          const wordPart = text.substring(relativeStart, relativeEnd);

          // Need to preserve the parent formatting
          let currentNode = node.parentElement;
          const tags = [];
          let inlineHeading = null;

          while (currentNode && currentNode !== div) {
            const tag = currentNode.tagName.toLowerCase();
            if (currentNode.classList && currentNode.classList.contains('inline-heading')) {
              // Store inline heading info
              const level = currentNode.dataset.headingLevel || 'h2';
              const fontSize = level === 'h1' ? '1.8em' : level === 'h2' ? '1.5em' : '1.3em';
              inlineHeading = { level, fontSize };
            } else if (['strong', 'b', 'em', 'i', 'code'].includes(tag)) {
              tags.unshift(tag);
            }
            currentNode = currentNode.parentElement;
          }

          result = wordPart;
          tags.forEach(tag => {
            result = `<${tag}>${result}</${tag}>`;
          });

          // Apply inline heading if present
          if (inlineHeading) {
            result = `<span class="inline-heading inline-${inlineHeading.level}" data-heading-level="${inlineHeading.level}" style="font-size: ${inlineHeading.fontSize}; font-weight: bold; display: inline-block; background: rgba(173, 216, 230, 0.2); padding: 2px 4px; border-radius: 3px;">${result}</span>`;
          }

          found = true;
        }

        charIndex += text.length;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        Array.from(node.childNodes).forEach(child => traverse(child));
      }
    }

    traverse(div);
    return result || escapeHtml(word);
  }

  function applyFormattingToDiff(formattedHtml, diffHtml, diffItems, plainText) {
    // Extract formatting information from the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = formattedHtml;

    // Build a map of character positions to formatting tags
    const formatMap = [];
    let charIndex = 0;

    function mapFormatting(node, activeFormats = []) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        for (let i = 0; i < text.length; i++) {
          formatMap[charIndex++] = [...activeFormats];
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        const newFormats = [...activeFormats];

        // Check for inline-heading spans
        if (node.classList && node.classList.contains('inline-heading')) {
          const level = node.dataset.headingLevel || 'h2';
          newFormats.push('inline-heading-' + level);
        } else if (['strong', 'b', 'em', 'i', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          newFormats.push(tagName);
        }

        Array.from(node.childNodes).forEach(child => mapFormatting(child, newFormats));
      }
    }

    mapFormatting(tempDiv);

    // Apply formatting to the diff result
    // For simplicity, if there are changes, show the diff highlights
    // If only formatting changed, show with blue background
    const hasTextChanges = diffItems.some(item => item.type === 'added' || item.type === 'deleted');

    if (!hasTextChanges) {
      // Only formatting changed - show the formatted version
      return `<span style="background: rgba(173, 216, 230, 0.3); padding: 2px 4px; border-radius: 2px;">${formattedHtml}</span>`;
    }

    // Has text changes - rebuild diff with formatting preserved
    let resultHtml = '';
    let plainTextIndex = 0;

    diffItems.forEach(item => {
      const itemLength = item.value.replace(/\s+/g, ' ').length;
      const formats = formatMap[plainTextIndex] || [];

      // Apply formatting tags
      let formattedValue = escapeHtml(item.value);

      // Check for inline-heading format first
      const inlineHeadingFormat = formats.find(f => f.startsWith('inline-heading-'));
      // Also check for block-level heading formats (h1, h2, h3, etc.)
      const blockHeadingFormat = formats.find(f => ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(f));

      if (formats.includes('strong') || formats.includes('b')) {
        formattedValue = `<strong>${formattedValue}</strong>`;
      }
      if (formats.includes('em') || formats.includes('i')) {
        formattedValue = `<em>${formattedValue}</em>`;
      }
      if (formats.includes('code')) {
        formattedValue = `<code>${formattedValue}</code>`;
      }

      // Wrap in inline-heading span if needed (either from inline-heading or block heading)
      const headingLevel = inlineHeadingFormat ? inlineHeadingFormat.replace('inline-heading-', '') : blockHeadingFormat;
      if (headingLevel) {
        const fontSize = headingLevel === 'h1' ? '1.8em' : headingLevel === 'h2' ? '1.5em' : '1.3em';
        formattedValue = `<span class="inline-heading inline-${headingLevel}" data-heading-level="${headingLevel}" style="font-size: ${fontSize}; font-weight: bold; display: inline-block; background: rgba(173, 216, 230, 0.2); padding: 2px 4px; border-radius: 3px;">${formattedValue}</span>`;
      }

      if (item.type === 'added') {
        resultHtml += `<ins style="background: #d4edda; color: #155724; text-decoration: none; padding: 2px 4px; border-radius: 2px; font-weight: 500;">${formattedValue}</ins>`;
      } else if (item.type === 'deleted') {
        resultHtml += `<del style="background: #f8d7da; color: #721c24; text-decoration: line-through; padding: 2px 4px; border-radius: 2px; opacity: 0.8;">${formattedValue}</del>`;
      } else {
        resultHtml += formattedValue;
      }

      plainTextIndex += itemLength;
    });

    return resultHtml;
  }

  function updateSidebarWithChange(element, originalText, newText, originalMarkdown, newMarkdown) {
    // Simply add to sidebar - all interaction happens there
    addChangeToSidebar(element, originalText, newText, originalMarkdown, newMarkdown);
  }

  function createInlineDiff(originalText, newText, preserveHtml = false) {
    if (!preserveHtml) {
      // Original behavior for plain text
      const originalWords = originalText.split(/(\s+)/);
      const newWords = newText.split(/(\s+)/);
      const lcs = computeLCS(originalWords, newWords);
      const diff = generateDiffFromLCS(originalWords, newWords, lcs);

      return diff.map(item => {
        const value = escapeHtml(item.value);
        if (item.type === 'unchanged') {
          return `<span class="diff-unchanged">${value}</span>`;
        } else if (item.type === 'deleted') {
          return `<del class="diff-deleted" style="background: #f8d7da; text-decoration: line-through; opacity: 0.7;">${value}</del>`;
        } else if (item.type === 'added') {
          return `<ins class="diff-added" style="background: #d4edda; text-decoration: none; font-weight: bold;">${value}</ins>`;
        }
        return value;
      }).join('');
    }

    // For HTML content with inline highlighting of specific changes
    // Parse HTML to extract structure
    const originalDiv = document.createElement('div');
    originalDiv.innerHTML = originalText;
    const originalPlainText = originalDiv.textContent || '';

    const newDiv = document.createElement('div');
    newDiv.innerHTML = newText;
    const newPlainText = newDiv.textContent || '';

    // Do word-level diff on plain text
    const originalWords = originalPlainText.split(/(\s+)/);
    const newWords = newPlainText.split(/(\s+)/);
    const lcs = computeLCS(originalWords, newWords);
    const textDiff = generateDiffFromLCS(originalWords, newWords, lcs);

    // Build inline result showing only new content with highlighted changes
    // Strategy: Parse HTML and apply highlights based on text diff
    let result = '';
    let newTextIndex = 0;

    // Simpler approach: Build result by reconstructing HTML with highlights
    // Group diff items and apply appropriate styling
    let htmlResult = '';

    textDiff.forEach(item => {
      if (item.type === 'added') {
        // Highlight added text in green
        htmlResult += `<mark style="background: #a7f3d0; padding: 2px 4px; border-radius: 2px; font-weight: 500; box-decoration-break: clone; -webkit-box-decoration-break: clone;">${escapeHtml(item.value)}</mark>`;
      } else if (item.type === 'deleted') {
        // Show deleted text with strikethrough but subtle
        htmlResult += `<del style="background: #fecaca; text-decoration: line-through; opacity: 0.6; padding: 2px 4px; box-decoration-break: clone; -webkit-box-decoration-break: clone;">${escapeHtml(item.value)}</del>`;
      } else {
        // Unchanged text - just add it
        htmlResult += escapeHtml(item.value);
      }
    });

    // Now we need to reapply HTML formatting from newText
    // This is complex, so let's use a hybrid approach:
    // If the text has formatting differences, show a simpler view

    // Check if only text changed or if formatting also changed
    const hasFormattingChange = originalText !== newText && originalPlainText === newPlainText;

    if (hasFormattingChange) {
      // Only formatting changed (e.g., bold added), show the new formatted version
      // Don't add a badge inline - just return the formatted content
      // The wrapper will show it's modified visually
      return newText;
    }

    // Text content changed - show word-level diff with HTML formatting preserved
    // Need to map the diff back to the HTML structure
    // For simplicity, if there are HTML differences, show the new HTML with highlights

    // Try to preserve HTML while highlighting changes
    // This is complex, so for now use a simpler approach:
    // Show the final HTML with changed words highlighted

    let finalResult = '';
    let plainTextIndex = 0;

    // Create a map of which parts of the plain text are added/deleted/unchanged
    const changeMap = [];
    textDiff.forEach(item => {
      changeMap.push({
        start: plainTextIndex,
        end: plainTextIndex + item.value.length,
        type: item.type,
        value: item.value
      });
      plainTextIndex += item.value.length;
    });

    // For now, show the new HTML directly with word highlights
    // More sophisticated: parse HTML and apply highlights at text nodes
    // Simple approach: show new HTML as-is if it has formatting, otherwise show word diff

    if (originalText !== newText && originalText.includes('<')) {
      // Has HTML tags, just show the new version
      return newText;
    }

    // Plain text changes - show word-level diff
    textDiff.forEach(item => {
      if (item.type === 'added') {
        finalResult += `<mark style="background: #a7f3d0; padding: 1px 3px; border-radius: 2px;">${escapeHtml(item.value)}</mark>`;
      } else if (item.type === 'deleted') {
        finalResult += `<del style="background: #fecaca; text-decoration: line-through; opacity: 0.6; padding: 1px 3px;">${escapeHtml(item.value)}</del>`;
      } else {
        finalResult += escapeHtml(item.value);
      }
    });

    return finalResult;
  }
  
  function computeLCS(seq1, seq2) {
    const m = seq1.length;
    const n = seq2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    // Fill the DP table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (seq1[i - 1] === seq2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    // Backtrack to find the LCS
    const lcs = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (seq1[i - 1] === seq2[j - 1]) {
        lcs.unshift({ i: i - 1, j: j - 1, value: seq1[i - 1] });
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    
    return lcs;
  }
  
  function generateDiffFromLCS(seq1, seq2, lcs) {
    const diff = [];
    let i = 0, j = 0, lcsIndex = 0;
    
    while (i < seq1.length || j < seq2.length || lcsIndex < lcs.length) {
      if (lcsIndex < lcs.length && i === lcs[lcsIndex].i && j === lcs[lcsIndex].j) {
        // Common element
        diff.push({ type: 'unchanged', value: lcs[lcsIndex].value });
        i++;
        j++;
        lcsIndex++;
      } else if (lcsIndex < lcs.length && i < lcs[lcsIndex].i) {
        // Deleted element
        diff.push({ type: 'deleted', value: seq1[i] });
        i++;
      } else if (lcsIndex < lcs.length && j < lcs[lcsIndex].j) {
        // Added element
        diff.push({ type: 'added', value: seq2[j] });
        j++;
      } else {
        // Handle remaining elements
        if (i < seq1.length) {
          diff.push({ type: 'deleted', value: seq1[i] });
          i++;
        } else if (j < seq2.length) {
          diff.push({ type: 'added', value: seq2[j] });
          j++;
        }
      }
    }
    
    return diff;
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function truncateHtml(html, maxLength) {
    // Truncate HTML while preserving tags
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || '';

    if (text.length <= maxLength) {
      return html;
    }

    // If text is too long, truncate and add ellipsis
    // Simple approach: get text length and truncate HTML proportionally
    const ratio = maxLength / text.length;
    let truncated = html.substring(0, Math.floor(html.length * ratio));

    // Make sure we don't break tags - find last complete tag
    const lastOpen = truncated.lastIndexOf('<');
    const lastClose = truncated.lastIndexOf('>');

    if (lastOpen > lastClose) {
      // We're in the middle of a tag, remove it
      truncated = truncated.substring(0, lastOpen);
    }

    // Close any unclosed tags
    const openTags = [];
    const tagRegex = /<(\w+)[^>]*>|<\/(\w+)>/g;
    let match;
    while ((match = tagRegex.exec(truncated)) !== null) {
      if (match[1]) {
        // Opening tag
        openTags.push(match[1]);
      } else if (match[2]) {
        // Closing tag
        const lastTag = openTags[openTags.length - 1];
        if (lastTag === match[2]) {
          openTags.pop();
        }
      }
    }

    // Close unclosed tags in reverse order
    for (let i = openTags.length - 1; i >= 0; i--) {
      truncated += '</' + openTags[i] + '>';
    }

    return truncated + '...';
  }

  function showCommentModal(selectedText, callback) {
    // Create modal dialog for comments
    const modal = document.createElement('div');
    
    // Calculate position based on current selection, avoiding popup area
    let modalLeft = '50%';
    let modalTop = '50%';
    let transform = 'translate(-50%, -50%)';
    
    if (currentSelection && currentSelection.range) {
      const rect = currentSelection.range.getBoundingClientRect();
      const modalWidth = 400; // Approximate modal width
      const modalHeight = 340; // Approximate modal height (increased for draggable header)
      
      // Get popup position to avoid overlap
      const popup = document.getElementById('web-review-popup');
      const popupRect = popup ? popup.getBoundingClientRect() : null;
      const popupBottom = popupRect ? popupRect.bottom + 10 : rect.bottom + 5;
      const popupRight = popupRect ? popupRect.right + 10 : rect.right;
      
      // Try to position to the right of selection, avoiding popup
      if (rect.right + modalWidth + 20 < window.innerWidth) {
        modalLeft = Math.max(popupRight + 10, rect.right + 20) + 'px';
        modalTop = Math.max(20, rect.top) + 'px';
        transform = 'none';
      }
      // Try to position to the left of selection
      else if (rect.left - modalWidth - 20 > 0) {
        modalLeft = (rect.left - modalWidth - 20) + 'px';
        modalTop = Math.max(20, rect.top) + 'px';
        transform = 'none';
      }
      // Position below selection and popup if there's space
      else if (popupBottom + modalHeight + 20 < window.innerHeight) {
        modalLeft = Math.max(20, Math.min(rect.left, window.innerWidth - modalWidth - 20)) + 'px';
        modalTop = (popupBottom + 20) + 'px';
        transform = 'none';
      }
      // Position above selection if there's space
      else if (rect.top - modalHeight - 20 > 0) {
        modalLeft = Math.max(20, Math.min(rect.left, window.innerWidth - modalWidth - 20)) + 'px';
        modalTop = (rect.top - modalHeight - 20) + 'px';
        transform = 'none';
      }
      // Fallback: position to the right side of screen
      else {
        modalLeft = Math.max(20, window.innerWidth - modalWidth - 20) + 'px';
        modalTop = '20px';
        transform = 'none';
      }
    }
    
    modal.style.cssText = 
      'position: fixed; left: ' + modalLeft + '; top: ' + modalTop + '; ' +
      'transform: ' + transform + '; z-index: 10000;';
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 
      'background: white; border-radius: 8px; ' +
      'box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08); ' +
      'border: 1px solid #e0e0e0; width: 380px; max-height: 80vh; overflow: hidden; ' +
      'display: flex; flex-direction: column;';
    
    // Create draggable header
    const header = document.createElement('div');
    header.style.cssText = 
      'padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #e0e0e0; ' +
      'cursor: move; user-select: none; border-radius: 8px 8px 0 0;';
    header.innerHTML = 
      '<div style="display: flex; justify-content: space-between; align-items: center;">' +
        '<h3 style="margin: 0; color: #333; font-size: 16px;">💬 Add Comment</h3>' +
        '<div style="color: #999; font-size: 12px; user-select: none;">⋮⋮</div>' +
      '</div>';
    
    // Create content area
    const contentArea = document.createElement('div');
    contentArea.style.cssText = 'padding: 20px; overflow-y: auto; flex: 1;';
    
    contentArea.innerHTML = 
      '<div style="margin-bottom: 15px;">' +
        '<strong>Selected text:</strong><br>' +
        '<em style="color: #666; font-size: 14px;">"' + selectedText.substring(0, 100) + (selectedText.length > 100 ? '...' : '') + '"</em>' +
      '</div>' +
      '<textarea id="comment-input" placeholder="Enter your comment..." style="' +
        'width: 100%; height: 100px; padding: 10px; border: 1px solid #ddd; ' +
        'border-radius: 4px; font-family: inherit; font-size: 14px; resize: vertical; ' +
        'outline: none; box-sizing: border-box;' +
      '"></textarea>' +
      '<div style="margin: 15px 0;">' +
        '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Comment Status:</label>' +
        '<select id="comment-status" style="' +
          'width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; ' +
          'font-size: 14px; background: white; outline: none;' +
        '">' +
          '<option value="open">Open (needs review)</option>' +
          '<option value="suggestion">Suggestion</option>' +
          '<option value="question">Question</option>' +
          '<option value="accepted">Accepted</option>' +
          '<option value="rejected">Rejected</option>' +
          '<option value="partially-accepted">Partially Accepted</option>' +
        '</select>' +
      '</div>' +
      '<div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">' +
        '<button id="cancel-comment" style="' +
          'padding: 8px 16px; border: 1px solid #ddd; background: white; ' +
          'border-radius: 4px; cursor: pointer; font-size: 14px;' +
        '">Cancel</button>' +
        '<button id="save-comment" style="' +
          'padding: 8px 16px; border: none; background: #007acc; color: white; ' +
          'border-radius: 4px; cursor: pointer; font-size: 14px;' +
        '">Save Comment</button>' +
      '</div>';
    
    // Assemble the modal
    modalContent.appendChild(header);
    modalContent.appendChild(contentArea);
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Create invisible backdrop for click-outside detection
    const backdrop = document.createElement('div');
    backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999;';
    document.body.appendChild(backdrop);
    
    // Add drag functionality
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    function handleMouseDown(e) {
      isDragging = true;
      const rect = modal.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      header.style.cursor = 'grabbing';
      e.preventDefault();
    }
    
    function handleMouseMove(e) {
      if (!isDragging) return;
      
      const newLeft = e.clientX - dragOffset.x;
      const newTop = e.clientY - dragOffset.y;
      
      // Keep modal within viewport bounds
      const maxLeft = window.innerWidth - modal.offsetWidth;
      const maxTop = window.innerHeight - modal.offsetHeight;
      
      const constrainedLeft = Math.max(0, Math.min(newLeft, maxLeft));
      const constrainedTop = Math.max(0, Math.min(newTop, maxTop));
      
      modal.style.left = constrainedLeft + 'px';
      modal.style.top = constrainedTop + 'px';
      modal.style.transform = 'none';
    }
    
    function handleMouseUp() {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = 'move';
      }
    }
    
    header.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    const commentInput = document.getElementById('comment-input');
    const statusSelect = document.getElementById('comment-status');
    
    // Focus on textarea
    commentInput.focus();
    
    function closeModal() {
      // Clean up event listeners
      header.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Remove DOM elements
      document.body.removeChild(modal);
      document.body.removeChild(backdrop);
    }
    
    // Handle save
    document.getElementById('save-comment').addEventListener('click', function() {
      const comment = commentInput.value.trim();
      const status = statusSelect.value;
      closeModal();
      callback(comment, status);
    });
    
    // Handle cancel
    document.getElementById('cancel-comment').addEventListener('click', function() {
      closeModal();
      callback(null, null);
    });
    
    // Handle click outside to close (click on backdrop)
    backdrop.addEventListener('click', function() {
      closeModal();
      callback(null, null);
    });
    
    // Handle Enter to save (Ctrl+Enter or Shift+Enter) and Escape to close
    commentInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
        e.preventDefault();
        document.getElementById('save-comment').click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
        callback(null, null);
      }
    });
  }
  
  function getElementChangeDescription(element, originalText, newText) {
    const tagName = element.tagName.toLowerCase();
    const shortOriginal = originalText.substring(0, 30).replace(/\s+/g, ' ').trim();
    const shortNew = newText.substring(0, 30).replace(/\s+/g, ' ').trim();
    
    if (originalText.length === 0 && newText.length > 0) {
      return 'added ' + getElementTypeDescription(tagName) + ' "' + shortNew + (newText.length > 30 ? '...' : '') + '"';
    } else if (originalText.length > 0 && newText.length === 0) {
      return 'deleted ' + getElementTypeDescription(tagName) + ' "' + shortOriginal + (originalText.length > 30 ? '...' : '') + '"';
    } else {
      return 'edited ' + getElementTypeDescription(tagName) + ' "' + shortOriginal + (originalText.length > 30 ? '...' : '') + '" → "' + shortNew + (newText.length > 30 ? '...' : '') + '"';
    }
  }
  
  function getElementTypeDescription(tagName) {
    switch(tagName) {
      case 'h1': return 'heading level 1';
      case 'h2': return 'heading level 2';
      case 'h3': return 'heading level 3';
      case 'h4': return 'heading level 4';
      case 'h5': return 'heading level 5';
      case 'h6': return 'heading level 6';
      case 'p': return 'paragraph';
      case 'li': return 'list item';
      case 'blockquote': return 'quote';
      case 'code': return 'code block';
      case 'pre': return 'code block';
      default: return tagName;
    }
  }

  function addCommentToSidebar(originalText, comment, status = 'open', element = null, startOffset = null, endOffset = null) {
    const commentId = 'comment-' + Date.now();
    const currentUser = userManager.getCurrentUser();
    const userColor = userManager.getUserColor(currentUser);
    const userInitials = userManager.getUserInitials(currentUser);

    // Use provided element or fall back to currentSelection
    const targetElement = element || (currentSelection && currentSelection.element);

    // Use provided offsets or fall back to currentSelection
    const selStartOffset = startOffset !== null ? startOffset : (currentSelection ? currentSelection.startOffset : 0);
    const selEndOffset = endOffset !== null ? endOffset : (currentSelection ? currentSelection.endOffset : 0);

    // Save comment to storage
    if (targetElement) {
      saveComment(targetElement, originalText, comment, commentId, status);
      // Highlight the commented text with character offsets
      debug('Using offsets for highlight:', selStartOffset, selEndOffset);
      highlightCommentedText(targetElement, originalText, commentId, userColor, selStartOffset, selEndOffset, comment);
      
      // Add to CriticMarkup manager with offsets
      const elementPath = criticMarkupManager.generateElementPath(targetElement);
      criticMarkupManager.addComment(elementPath, originalText, comment, currentUser, selStartOffset, selEndOffset);
    }
    
    const commentDiv = document.createElement('div');
    commentDiv.id = commentId + '-sidebar';
    commentDiv.className = 'review-item';
    commentDiv.dataset.type = 'comment';
    commentDiv.dataset.status = 'active';
    commentDiv.dataset.user = currentUser;
    commentDiv.style.cssText = 
      'border-left: 3px solid ' + userColor + '; padding: 10px; margin: 10px 0; background: #f8f9fa; border-radius: 0 4px 4px 0; cursor: pointer;';
    const statusColors = {
      'open': '#007acc',
      'suggestion': '#28a745', 
      'question': '#6f42c1',
      'accepted': '#28a745',
      'rejected': '#dc3545',
      'partially-accepted': '#fd7e14'
    };
    
    const statusLabels = {
      'open': 'Open',
      'suggestion': 'Suggestion', 
      'question': 'Question',
      'accepted': 'Accepted',
      'rejected': 'Rejected',
      'partially-accepted': 'Partially Accepted'
    };
    
    commentDiv.innerHTML = 
      '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">' +
        '<div style="' +
          'width: 20px; height: 20px; border-radius: 50%; background: ' + userColor + '; ' +
          'color: white; display: flex; align-items: center; justify-content: center; ' +
          'font-size: 10px; font-weight: bold;' +
        '">' + userInitials + '</div>' +
        '<div style="font-size: 12px; color: #666; flex: 1;">' +
          currentUser + ' commented on: "' + originalText.substring(0, 30) + (originalText.length > 30 ? '...' : '') + '"' +
        '</div>' +
        '<div style="' +
          'background: ' + (statusColors[status] || '#007acc') + '; color: white; ' +
          'padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;' +
        '">' + (statusLabels[status] || status) + '</div>' +
      '</div>' +
      '<div style="color: #333; margin-left: 28px;">' + comment + '</div>' +
      '<div style="font-size: 11px; color: #999; margin-top: 8px; margin-left: 28px; display: flex; justify-content: space-between; align-items: center;">' +
        '<span>' + new Date().toLocaleString() + '</span>' +
        '<div style="display: flex; gap: 4px;">' +
          '<select onchange="updateCommentStatus(\'' + commentId + '\', this.value)" style="' +
            'background: white; border: 1px solid #ddd; border-radius: 3px; ' +
            'padding: 2px 4px; font-size: 10px; cursor: pointer;' +
          '">' +
            '<option value="open"' + (status === 'open' ? ' selected' : '') + '>Open</option>' +
            '<option value="suggestion"' + (status === 'suggestion' ? ' selected' : '') + '>Suggestion</option>' +
            '<option value="question"' + (status === 'question' ? ' selected' : '') + '>Question</option>' +
            '<option value="accepted"' + (status === 'accepted' ? ' selected' : '') + '>Accepted</option>' +
            '<option value="rejected"' + (status === 'rejected' ? ' selected' : '') + '>Rejected</option>' +
            '<option value="partially-accepted"' + (status === 'partially-accepted' ? ' selected' : '') + '>Partially Accepted</option>' +
          '</select>' +
          '<button onclick="resolveComment(\'' + commentId + '\')" style="background: #28a745; color: white; border: none; padding: 2px 6px; border-radius: 2px; font-size: 10px; cursor: pointer;">Resolve</button>' +
        '</div>' +
      '</div>';
    
    // Click to highlight the commented text
    commentDiv.addEventListener('click', function(e) {
      if (e.target.tagName !== 'BUTTON') {
        const highlightedElement = document.getElementById(commentId);
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          highlightedElement.style.animation = 'web-review-pulse 1s ease-in-out';
        }
      }
    });
    
    // Add click handler to highlight the referenced text
    commentDiv.addEventListener('click', function() {
      highlightReferencedText(commentId);
    });

    // Add hover tooltip to show full comment text
    let tooltipTimeout;
    let tooltip = null;

    commentDiv.addEventListener('mouseenter', function(e) {
      // Delay tooltip appearance slightly
      tooltipTimeout = setTimeout(() => {
        tooltip = document.createElement('div');
        tooltip.className = 'web-review-comment-tooltip';
        tooltip.textContent = comment;
        document.body.appendChild(tooltip);

        // Position tooltip above the comment box
        const rect = commentDiv.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';

        // Adjust if tooltip goes off-screen
        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.left < 10) {
          tooltip.style.left = '10px';
        }
        if (tooltipRect.right > window.innerWidth - 10) {
          tooltip.style.left = (window.innerWidth - tooltipRect.width - 10) + 'px';
        }
        if (tooltipRect.top < 10) {
          // Show below if not enough space above
          tooltip.style.top = (rect.bottom + 10) + 'px';
          // Flip arrow direction
          const arrowStyle = document.createElement('style');
          arrowStyle.textContent = '.web-review-comment-tooltip::before { top: auto !important; bottom: -6px !important; border-bottom: none !important; border-top: 6px solid rgba(0, 0, 0, 0.9) !important; }';
          document.head.appendChild(arrowStyle);
          tooltip.dataset.arrowFlipped = 'true';
        }
      }, 500); // 500ms delay before showing tooltip
    });

    commentDiv.addEventListener('mouseleave', function() {
      clearTimeout(tooltipTimeout);
      if (tooltip) {
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
        // Clean up arrow style if flipped
        if (tooltip.dataset.arrowFlipped) {
          const styles = document.querySelectorAll('style');
          styles.forEach(style => {
            if (style.textContent.includes('web-review-comment-tooltip::before')) {
              style.parentNode.removeChild(style);
            }
          });
        }
        tooltip = null;
      }
    });

    // Insert in document order
    if (targetElement) {
      insertInDocumentOrder(content, commentDiv, targetElement);
    } else {
      content.appendChild(commentDiv);
    }
    filterContent(); // Apply current filter
  }
  
  function saveComment(element, originalText, comment, commentId, status = 'open') {
    // Get or create document changes storage
    if (!window.webReviewChanges) {
      window.webReviewChanges = {
        comments: [],
        textChanges: [],
        metadata: {
          documentTitle: document.title,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Store the comment with user attribution
    window.webReviewChanges.comments.push({
      id: commentId,
      elementId: getElementIdentifier(element),
      text: originalText,
      comment: comment,
      timestamp: new Date().toISOString(),
      status: status,
      user: userManager.getCurrentUser(),
      userColor: userManager.getUserColor(userManager.getCurrentUser())
    });
    
    // Save to localStorage
    localStorage.setItem('webReviewChanges', JSON.stringify(window.webReviewChanges));
  }
  
  window.updateCommentStatus = function(commentId, newStatus) {
    // Update storage
    if (window.webReviewChanges) {
      const comment = window.webReviewChanges.comments.find(c => c.id === commentId);
      if (comment) {
        comment.status = newStatus;
      }
      localStorage.setItem('webReviewChanges', JSON.stringify(window.webReviewChanges));
    }
    
    // Update the visual indicator
    const commentElement = document.querySelector('[data-comment-id="' + commentId + '"]');
    if (commentElement) {
      // Find and update the status badge
      const statusBadge = commentElement.querySelector('[style*="border-radius: 10px"]');
      if (statusBadge) {
        const statusColors = {
          'open': '#007acc',
          'suggestion': '#28a745', 
          'question': '#6f42c1',
          'accepted': '#28a745',
          'rejected': '#dc3545',
          'partially-accepted': '#fd7e14'
        };
        
        const statusLabels = {
          'open': 'Open',
          'suggestion': 'Suggestion', 
          'question': 'Question',
          'accepted': 'Accepted',
          'rejected': 'Rejected',
          'partially-accepted': 'Partially Accepted'
        };
        
        statusBadge.style.background = statusColors[newStatus] || '#007acc';
        statusBadge.textContent = statusLabels[newStatus] || newStatus;
      }
    }
  };
  
  window.resolveComment = function(commentId) {
    // Update storage
    if (window.webReviewChanges) {
      const comment = window.webReviewChanges.comments.find(c => c.id === commentId);
      if (comment) {
        comment.status = 'resolved';
        localStorage.setItem('webReviewChanges', JSON.stringify(window.webReviewChanges));
      }
    }
    
    // Update UI
    const sidebarComment = document.getElementById(commentId + '-sidebar');
    const highlightedText = document.getElementById(commentId);
    
    if (sidebarComment) {
      sidebarComment.style.opacity = '0.5';
      sidebarComment.dataset.status = 'resolved';
      sidebarComment.querySelector('button').textContent = 'Resolved';
      sidebarComment.querySelector('button').style.background = '#6c757d';
    }
    
    if (highlightedText) {
      highlightedText.style.background = '#e9ecef';
      highlightedText.style.borderBottom = '2px solid #6c757d';
    }
    
    filterContent();
  };

  function highlightCommentedText(element, text, commentId, userColor = '#007acc', startOffset = 0, endOffset = 0, commentText = '') {
    debug('Adding VISIBLE comment highlight at offsets', startOffset, '-', endOffset, ':', text.substring(0, 50));

    // Store comment data with character offsets
    if (!element.dataset.comments) {
      element.dataset.comments = JSON.stringify([]);
    }

    const comments = JSON.parse(element.dataset.comments);
    comments.push({
      id: commentId,
      text: text,
      userColor: userColor,
      startOffset: startOffset,
      endOffset: endOffset,
      commentText: commentText
    });
    element.dataset.comments = JSON.stringify(comments);

    // Use DOM range to highlight at the exact character offsets
    debug('Creating range for element:', element.tagName, 'text:', element.textContent.substring(0, 100));
    const range = createRangeFromOffsets(element, startOffset, endOffset);
    debug('Created range:', range);

    if (range) {
      debug('Range text content:', range.toString());
      // Create a highlight span
      const highlightColor = userColor + '40';
      const borderColor = userColor;

      const highlightSpan = document.createElement('mark');
      highlightSpan.setAttribute('data-comment', commentId);
      highlightSpan.setAttribute('data-comment-id', commentId);
      highlightSpan.className = 'comment-highlight';
      highlightSpan.style.cssText = `background: ${highlightColor}; border: 2px solid ${borderColor}; padding: 1px 2px; border-radius: 3px; cursor: pointer; font-weight: bold;`;
      highlightSpan.title = commentText || 'Click to view/edit comment';

      // Add click handler to show comment
      highlightSpan.addEventListener('click', function(e) {
        e.stopPropagation();
        showCommentEditDialog(commentId);
      });

      try {
        range.surroundContents(highlightSpan);
        debug('Successfully highlighted text at offsets', startOffset, '-', endOffset);
      } catch (e) {
        console.error('Failed to surround contents with highlight:', e);
        // Fallback: try extracting and wrapping
        try {
          const contents = range.extractContents();
          highlightSpan.appendChild(contents);
          range.insertNode(highlightSpan);
        } catch (e2) {
          console.error('Fallback also failed:', e2);
          addFallbackHighlight(element, userColor);
        }
      }
    } else {
      debug('Could not create range, using fallback border highlight');
      addFallbackHighlight(element, userColor);
    }
    
    // Update title
    const commentCount = comments.length;
    element.title = `${commentCount} comment${commentCount > 1 ? 's' : ''} - Click highlighted text to view`;
  }
  
  function addFallbackHighlight(element, userColor) {
    element.style.borderLeft = `4px solid ${userColor}`;
    element.style.paddingLeft = '8px';
    element.style.backgroundColor = `${userColor}10`;
    element.addEventListener('click', function(e) {
      if (e.target === element) {
        // Find the first comment for this element
        const comments = JSON.parse(element.dataset.comments || '[]');
        if (comments.length > 0) {
          showCommentInSidebar(comments[0].id);
        }
      }
    });
  }
  
  function showCommentEditDialog(commentId) {
    // Find the comment in storage
    const commentData = window.webReviewChanges?.comments.find(c => c.id === commentId);
    if (!commentData) {
      console.error('Comment not found:', commentId);
      return;
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10002; display: flex; align-items: center; justify-content: center;';

    // Create dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = 'background: white; max-width: 600px; max-height: 80vh; overflow: auto; border-radius: 8px; padding: 0;';

    dialog.innerHTML = `
      <div style="padding: 16px 24px; border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Edit Comment</h3>
      </div>
      <div style="padding: 24px;">
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; color: #374151;">Selected text:</label>
          <div style="background: #f3f4f6; padding: 12px; border-radius: 4px; font-size: 14px; color: #6b7280;">${escapeHtml(commentData.text)}</div>
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; color: #374151;">Comment:</label>
          <textarea id="edit-comment-text" style="width: 100%; min-height: 100px; padding: 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; resize: vertical; font-family: inherit;">${escapeHtml(commentData.comment)}</textarea>
        </div>
      </div>
      <div style="padding: 16px 24px; border-top: 1px solid #e5e7eb; background: #f9fafb; display: flex; gap: 8px; justify-content: flex-end;">
        <button id="cancel-edit-comment" style="padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 14px; background: white; color: #374151;">Cancel</button>
        <button id="save-edit-comment" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; background: #3b82f6; color: white; font-weight: 500;">Save Changes</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Focus the textarea
    const textarea = dialog.querySelector('#edit-comment-text');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    // Handle cancel
    const cancelBtn = dialog.querySelector('#cancel-edit-comment');
    cancelBtn.addEventListener('click', () => {
      overlay.remove();
    });

    // Handle save
    const saveBtn = dialog.querySelector('#save-edit-comment');
    saveBtn.addEventListener('click', () => {
      const newComment = textarea.value.trim();
      if (newComment) {
        // Update comment in storage
        commentData.comment = newComment;
        localStorage.setItem('webReviewChanges', JSON.stringify(window.webReviewChanges));

        // Update sidebar display
        const sidebarComment = document.getElementById(commentId + '-sidebar');
        if (sidebarComment) {
          const commentContentDiv = sidebarComment.querySelector('div[style*="margin-left: 28px"]');
          if (commentContentDiv && commentContentDiv.textContent !== '') {
            commentContentDiv.textContent = newComment;
          }
        }

        overlay.remove();
      }
    });

    // Close on outside click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  function showCommentInSidebar(commentId) {
    const sidebarComment = document.getElementById(commentId + '-sidebar');
    if (sidebarComment) {
      if (!sidebarOpen) toggleSidebar();
      sidebarComment.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      sidebarComment.style.animation = 'web-review-pulse 1s ease-in-out';

      // Also highlight the referenced text temporarily
      highlightReferencedText(commentId);
    }
  }
  
  function highlightReferencedText(commentId) {
    // Find the highlighted text for this comment
    const commentHighlight = document.querySelector(`[data-comment="${commentId}"]`);
    if (commentHighlight) {
      // Add temporary bright highlighting
      const originalStyle = commentHighlight.style.cssText;
      commentHighlight.style.backgroundColor = '#ffff00';
      commentHighlight.style.animation = 'web-review-pulse 1.5s ease-in-out';
      
      // Restore original style after animation
      setTimeout(() => {
        commentHighlight.style.cssText = originalStyle;
        commentHighlight.style.animation = '';
      }, 1500);
    }
  }
  
  function addChangeToSidebar(element, originalText, newText, originalMarkdown, newMarkdown) {
    const currentUser = userManager.getCurrentUser();
    const userColor = userManager.getUserColor(currentUser);
    const userInitials = userManager.getUserInitials(currentUser);

    // Add to CriticMarkup manager - use MARKDOWN versions for proper export
    const elementPath = criticMarkupManager.generateElementPath(element);

    // Use the markdown stored in dataset (this matches the QMD source)
    // Fallback to parameters if not available
    const markdownOriginal = element.dataset.originalMarkdown || originalMarkdown;
    const markdownNew = element.dataset.newMarkdown || newMarkdown;

    criticMarkupManager.addChange(elementPath, markdownOriginal, markdownNew, currentUser);

    // Convert markdown to HTML for display in sidebar to preserve formatting
    const originalHtml = element.dataset.originalHtml || convertMarkdownToHtml(originalMarkdown);
    const newHtml = element.dataset.newHtml || convertMarkdownToHtml(newMarkdown);

    // Check if there's already a pending change for this element
    if (element.dataset.changeId) {
      const existingChangeDiv = document.querySelector(`.review-item[data-element-id="${element.dataset.changeId}"][data-status="pending"]`);
      if (existingChangeDiv) {
        // Update existing change instead of creating a duplicate
        debug('Updating existing sidebar change:', element.dataset.changeId);
        existingChangeDiv.dataset.originalMarkdown = originalMarkdown;
        existingChangeDiv.dataset.newMarkdown = newMarkdown;

        // Update the display - DON'T update original, only update new
        const newDiv = existingChangeDiv.querySelector('[style*="#d4edda"] div[style*="line-height"]');
        if (newDiv) newDiv.innerHTML = newHtml;

        // Update timestamp
        const timestampDiv = existingChangeDiv.querySelector('[style*="font-size: 11px"][style*="color: #999"]');
        if (timestampDiv) {
          timestampDiv.innerHTML = '<span>' + new Date().toLocaleString() + '</span>';
        }

        return; // Exit early, don't create a new change div
      } else {
        debug('No existing sidebar change found for:', element.dataset.changeId);
      }
    } else {
      debug('No changeId on element, creating new change');
    }

    const changeDiv = document.createElement('div');
    changeDiv.className = 'review-item';
    changeDiv.dataset.type = 'change';
    changeDiv.dataset.status = 'pending';
    changeDiv.dataset.user = currentUser;
    changeDiv.style.cssText =
      'border-left: 3px solid ' + userColor + '; padding: 10px; margin: 10px 0; background: #f8f9fa; border-radius: 0 4px 4px 0;';

    // Show detailed side-by-side comparison in sidebar
    changeDiv.innerHTML =
      '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">' +
        '<div style="' +
          'width: 20px; height: 20px; border-radius: 50%; background: ' + userColor + '; ' +
          'color: white; display: flex; align-items: center; justify-content: center; ' +
          'font-size: 10px; font-weight: bold;' +
        '">' + userInitials + '</div>' +
        '<div style="font-size: 12px; color: #666;">' +
          currentUser + ' ' + getElementChangeDescription(element, originalText, newText) +
        '</div>' +
      '</div>' +
      '<div style="margin-left: 28px;">' +
        '<div style="background: #f8d7da; padding: 8px; border-radius: 4px; margin-bottom: 4px;">' +
          '<div style="font-size: 10px; color: #721c24; font-weight: bold; margin-bottom: 4px;">ORIGINAL:</div>' +
          '<div style="color: #721c24; font-size: 13px; line-height: 1.4;">' + originalHtml + '</div>' +
        '</div>' +
        '<div style="background: #d4edda; padding: 8px; border-radius: 4px;">' +
          '<div style="font-size: 10px; color: #155724; font-weight: bold; margin-bottom: 4px;">CHANGED TO:</div>' +
          '<div style="color: #155724; font-size: 13px; line-height: 1.4;">' + newHtml + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="font-size: 11px; color: #999; margin-top: 8px; margin-left: 28px;">' +
        '<span>' + new Date().toLocaleString() + '</span>' +
      '</div>' +
      '<div style="margin-top: 8px; margin-left: 28px; display: flex; gap: 4px; flex-wrap: wrap;">' +
        '<button class="accept-change-btn" style="background: #28a745; color: white; border: none; padding: 4px 10px; border-radius: 3px; font-size: 11px; cursor: pointer; font-weight: 500;">Accept</button>' +
        '<button class="reject-change-btn" style="background: #dc3545; color: white; border: none; padding: 4px 10px; border-radius: 3px; font-size: 11px; cursor: pointer; font-weight: 500;">Reject</button>' +
        '<button class="edit-again-btn" style="background: #6c757d; color: white; border: none; padding: 4px 10px; border-radius: 3px; font-size: 11px; cursor: pointer; font-weight: 500;">Edit Again</button>' +
        '<button onclick="viewFullDiff(this)" style="background: #007acc; color: white; border: none; padding: 4px 10px; border-radius: 3px; font-size: 11px; cursor: pointer; font-weight: 500;">View Full</button>' +
      '</div>';

    // Store full markdown for export and reference to the element
    changeDiv.dataset.originalMarkdown = originalMarkdown;
    changeDiv.dataset.newMarkdown = newMarkdown;

    // Store reference to element (use a unique ID)
    if (!element.dataset.changeId) {
      element.dataset.changeId = 'change-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    changeDiv.dataset.elementId = element.dataset.changeId;

    // Add event listeners for the buttons
    const acceptBtn = changeDiv.querySelector('.accept-change-btn');
    const rejectBtn = changeDiv.querySelector('.reject-change-btn');
    const editAgainBtn = changeDiv.querySelector('.edit-again-btn');

    acceptBtn.addEventListener('click', function() {
      acceptChangeFromSidebar(element, newMarkdown, changeDiv);
    });

    rejectBtn.addEventListener('click', function() {
      rejectChangeFromSidebar(element, originalMarkdown, changeDiv);
    });

    editAgainBtn.addEventListener('click', function() {
      makeElementEditable(element);
    });

    // Insert in document order instead of just appending
    insertInDocumentOrder(content, changeDiv, element);
    filterContent(); // Apply current filter
  }

  function insertInDocumentOrder(container, newItem, newElement) {
    // Get all existing items in the sidebar
    const existingItems = Array.from(container.querySelectorAll('.review-item'));

    // Get all reviewable elements in document order
    const allElements = Array.from(document.querySelectorAll('.reviewable'));

    // Find the position of the new element in the document
    const newElementIndex = allElements.indexOf(newElement);

    // Find where to insert the new item
    let insertBefore = null;

    for (const existingItem of existingItems) {
      // Get the element associated with this sidebar item
      let existingElement = null;

      if (existingItem.dataset.type === 'change') {
        const elementId = existingItem.dataset.elementId;
        existingElement = document.querySelector(`[data-change-id="${elementId}"]`);
      } else if (existingItem.dataset.type === 'comment') {
        const commentId = existingItem.id.replace('-sidebar', '');
        existingElement = document.querySelector(`[data-comment-id="${commentId}"]`);
      }

      if (existingElement) {
        const existingElementIndex = allElements.indexOf(existingElement);
        if (existingElementIndex > newElementIndex) {
          insertBefore = existingItem;
          break;
        }
      }
    }

    if (insertBefore) {
      container.insertBefore(newItem, insertBefore);
    } else {
      container.appendChild(newItem);
    }
  }

  function acceptChangeFromSidebar(element, newMarkdown, changeDiv) {
    // Update element with new content
    const newHtmlContent = convertMarkdownToHtml(newMarkdown);

    // Check if the markdown contains multiple blocks (split by double newlines)
    const blocks = newMarkdown.split(/\n\n+/).filter(block => block.trim());

    if (blocks.length > 1) {
      // Multiple blocks - need to split into separate elements
      const parent = element.parentElement;
      const newElements = [];

      blocks.forEach((block, index) => {
        block = block.trim();
        const blockHtml = convertMarkdownToHtml(block);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = blockHtml;

        // Get the first block-level element or create a paragraph
        let newElement = tempDiv.querySelector('h1, h2, h3, h4, h5, h6, p, ul, ol');
        if (!newElement) {
          newElement = document.createElement('p');
          newElement.innerHTML = blockHtml;
        } else {
          newElement = newElement.cloneNode(true);
        }

        // Copy attributes from original only to first element
        if (index === 0) {
          Array.from(element.attributes).forEach(attr => {
            if (attr.name !== 'class') {
              newElement.setAttribute(attr.name, attr.value);
            }
          });
          // Mark as accepted
          newElement.classList.add('web-review-accepted');
          newElement.dataset.reviewStatus = 'accepted';
        }

        newElements.push(newElement);
      });

      // Insert all new elements after the original element
      newElements.forEach((newEl, index) => {
        if (index === 0) {
          element.replaceWith(newEl);
          element = newEl; // Update reference for status updates
        } else {
          element.parentElement.insertBefore(newEl, element.nextSibling);
          element = newEl; // Move reference forward
        }
      });
    } else {
      // Single block - handle as before
      const headerMatch = newMarkdown.match(/^(#{1,6})\s+/);
      const isListItem = newMarkdown.match(/^[-*+]\s+/) || newMarkdown.match(/^\d+\.\s+/);

      if (headerMatch) {
        // Convert to header element
        const level = headerMatch[1].length;
        const newElement = document.createElement(`h${level}`);

        // Extract the inner content from the converted HTML (remove outer header tags)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newHtmlContent;
        const headerElement = tempDiv.querySelector(`h${level}`);
        if (headerElement) {
          newElement.innerHTML = headerElement.innerHTML;
        } else {
          newElement.innerHTML = newHtmlContent;
        }

        // Copy attributes and classes
        Array.from(element.attributes).forEach(attr => {
          newElement.setAttribute(attr.name, attr.value);
        });
        newElement.className = element.className;

        // Replace the element
        element.replaceWith(newElement);
        element = newElement;
      } else if (element.tagName === 'LI' && !isListItem) {
      // List item is being converted to paragraph - replace LI with P
      const newElement = document.createElement('p');
      newElement.innerHTML = newHtmlContent;

      // Copy attributes and classes
      Array.from(element.attributes).forEach(attr => {
        newElement.setAttribute(attr.name, attr.value);
      });
      newElement.className = element.className;

      // Get the parent list
      const parentList = element.parentElement;

      // Replace the element
      element.replaceWith(newElement);
      element = newElement;

      // If the list is now empty, remove it
      if (parentList && (parentList.tagName === 'UL' || parentList.tagName === 'OL') && parentList.children.length === 0) {
        parentList.remove();
      }
      } else if (isListItem && element.tagName !== 'LI') {
        // Don't allow converting to list item outside a list context
        // Just update innerHTML as-is
        element.innerHTML = newHtmlContent;
      } else {
        element.innerHTML = newHtmlContent;
      }
    }

    // Update element status
    element.classList.remove('web-review-modified');
    element.classList.add('web-review-accepted');
    element.dataset.reviewStatus = 'accepted';

    // Update sidebar item to show accepted status
    changeDiv.dataset.status = 'accepted';
    changeDiv.style.borderLeft = '3px solid #28a745';
    changeDiv.style.background = '#d4edda';

    // Replace action buttons with status indicator, revert and remove buttons
    const actionDiv = changeDiv.querySelector('div[style*="display: flex; gap: 4px"]');
    if (actionDiv) {
      actionDiv.innerHTML = '<span style="color: #155724; font-weight: 600; font-size: 12px;">✓ Accepted</span>' +
        '<button class="revert-change-btn" style="background: #ffc107; color: #000; border: none; padding: 4px 10px; border-radius: 3px; font-size: 11px; cursor: pointer; font-weight: 500; margin-left: auto;">Revert</button>' +
        '<button class="remove-change-btn" style="background: #6c757d; color: white; border: none; padding: 4px 10px; border-radius: 3px; font-size: 11px; cursor: pointer; font-weight: 500;">Remove</button>';

      // Add event listener for revert button
      const revertBtn = actionDiv.querySelector('.revert-change-btn');
      revertBtn.addEventListener('click', function() {
        revertChangeStatus(element, changeDiv);
      });

      // Add event listener for remove button
      const removeBtn = actionDiv.querySelector('.remove-change-btn');
      removeBtn.addEventListener('click', function() {
        removeChangeFromSidebar(changeDiv);
      });
    }
  }

  function rejectChangeFromSidebar(element, originalMarkdown, changeDiv) {
    // Restore original content
    const originalHtmlContent = convertMarkdownToHtml(originalMarkdown);
    element.innerHTML = originalHtmlContent;

    // Update element status
    element.classList.remove('web-review-modified');
    element.classList.add('web-review-rejected');
    element.dataset.reviewStatus = 'rejected';

    // Update sidebar item to show rejected status
    changeDiv.dataset.status = 'rejected';
    changeDiv.style.borderLeft = '3px solid #dc3545';
    changeDiv.style.background = '#f8d7da';

    // Replace action buttons with status indicator, revert and remove buttons
    const actionDiv = changeDiv.querySelector('div[style*="display: flex; gap: 4px"]');
    if (actionDiv) {
      actionDiv.innerHTML = '<span style="color: #721c24; font-weight: 600; font-size: 12px;">✗ Rejected</span>' +
        '<button class="revert-change-btn" style="background: #ffc107; color: #000; border: none; padding: 4px 10px; border-radius: 3px; font-size: 11px; cursor: pointer; font-weight: 500; margin-left: auto;">Revert</button>' +
        '<button class="remove-change-btn" style="background: #6c757d; color: white; border: none; padding: 4px 10px; border-radius: 3px; font-size: 11px; cursor: pointer; font-weight: 500;">Remove</button>';

      // Add event listener for revert button
      const revertBtn = actionDiv.querySelector('.revert-change-btn');
      revertBtn.addEventListener('click', function() {
        revertChangeStatus(element, changeDiv);
      });

      // Add event listener for remove button
      const removeBtn = actionDiv.querySelector('.remove-change-btn');
      removeBtn.addEventListener('click', function() {
        removeChangeFromSidebar(changeDiv);
      });
    }
  }

  function revertChangeStatus(element, changeDiv) {
    // Get original data
    const originalMarkdown = changeDiv.dataset.originalMarkdown;
    const newMarkdown = changeDiv.dataset.newMarkdown;
    const currentStatus = changeDiv.dataset.status;

    // Restore element to modified state (show the new content visually)
    if (currentStatus === 'rejected') {
      const newHtmlContent = convertMarkdownToHtml(newMarkdown);
      element.innerHTML = newHtmlContent;
    }

    // Reset element status
    element.classList.remove('web-review-accepted', 'web-review-rejected');
    element.classList.add('web-review-modified');
    element.dataset.reviewStatus = 'modified';

    // Reset sidebar item to pending status
    const userColor = userManager.getUserColor(changeDiv.dataset.user || userManager.getCurrentUser());
    changeDiv.dataset.status = 'pending';
    changeDiv.style.borderLeft = '3px solid ' + userColor;
    changeDiv.style.background = '#f8f9fa';

    // Restore action buttons
    const actionDiv = changeDiv.querySelector('div[style*="display: flex; gap: 4px"]');
    if (actionDiv) {
      actionDiv.innerHTML =
        '<button class="accept-change-btn" style="background: #28a745; color: white; border: none; padding: 4px 10px; border-radius: 3px; font-size: 11px; cursor: pointer; font-weight: 500;">Accept</button>' +
        '<button class="reject-change-btn" style="background: #dc3545; color: white; border: none; padding: 4px 10px; border-radius: 3px; font-size: 11px; cursor: pointer; font-weight: 500;">Reject</button>' +
        '<button class="edit-again-btn" style="background: #6c757d; color: white; border: none; padding: 4px 10px; border-radius: 3px; font-size: 11px; cursor: pointer; font-weight: 500;">Edit Again</button>' +
        '<button onclick="viewFullDiff(this)" style="background: #007acc; color: white; border: none; padding: 4px 10px; border-radius: 3px; font-size: 11px; cursor: pointer; font-weight: 500;">View Full</button>';

      // Re-attach event listeners
      const acceptBtn = actionDiv.querySelector('.accept-change-btn');
      const rejectBtn = actionDiv.querySelector('.reject-change-btn');
      const editAgainBtn = actionDiv.querySelector('.edit-again-btn');

      acceptBtn.addEventListener('click', function() {
        acceptChangeFromSidebar(element, newMarkdown, changeDiv);
      });

      rejectBtn.addEventListener('click', function() {
        rejectChangeFromSidebar(element, originalMarkdown, changeDiv);
      });

      editAgainBtn.addEventListener('click', function() {
        makeElementEditable(element);
      });
    }
  }

  function removeChangeFromSidebar(changeDiv) {
    // Remove the change div from the sidebar with a fade out animation
    changeDiv.style.transition = 'opacity 0.3s ease, max-height 0.3s ease, margin 0.3s ease';
    changeDiv.style.opacity = '0';
    changeDiv.style.maxHeight = '0';
    changeDiv.style.marginTop = '0';
    changeDiv.style.marginBottom = '0';
    changeDiv.style.overflow = 'hidden';

    setTimeout(() => {
      changeDiv.remove();

      // Update empty state if no items left
      const content = document.getElementById('web-review-content');
      const remainingItems = content.querySelectorAll('.review-item');
      if (remainingItems.length === 0) {
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
          emptyState.style.display = 'block';
        }
      }
    }, 300);
  }
  
  window.viewFullDiff = function(button) {
    const changeDiv = button.closest('.review-item');
    const originalMarkdown = changeDiv.dataset.originalMarkdown;
    const newMarkdown = changeDiv.dataset.newMarkdown;

    // Convert markdown to HTML for preview
    const originalHtml = convertMarkdownToHtml(originalMarkdown);
    const newHtml = convertMarkdownToHtml(newMarkdown);

    // Create modal-like overlay
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10002; display: flex; align-items: center; justify-content: center;';

    const modal = document.createElement('div');
    modal.style.cssText =
      'background: white; max-width: 90%; max-height: 90%; overflow: auto; border-radius: 8px; padding: 20px;';

    modal.innerHTML =
      '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px;">' +
        '<h3 style="margin: 0;">Full Diff View</h3>' +
        '<div>' +
          '<button id="toggle-view-mode" style="background: #007acc; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-right: 8px;">Show Markdown</button>' +
          '<button onclick="this.closest(\'.modal-overlay\').remove()" style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Close</button>' +
        '</div>' +
      '</div>' +
      '<div id="rendered-view" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">' +
        '<div>' +
          '<h4 style="margin: 0 0 10px 0; color: #dc3545;">Original (Rendered)</h4>' +
          '<div style="background: #f8d7da; padding: 15px; border-radius: 4px; font-size: 14px; line-height: 1.6;">' + originalHtml + '</div>' +
        '</div>' +
        '<div>' +
          '<h4 style="margin: 0 0 10px 0; color: #28a745;">Modified (Rendered)</h4>' +
          '<div style="background: #d4edda; padding: 15px; border-radius: 4px; font-size: 14px; line-height: 1.6;">' + newHtml + '</div>' +
        '</div>' +
      '</div>' +
      '<div id="markdown-view" style="display: none; grid-template-columns: 1fr 1fr; gap: 15px;">' +
        '<div>' +
          '<h4 style="margin: 0 0 10px 0; color: #dc3545;">Original (Markdown)</h4>' +
          '<pre style="background: #f8d7da; padding: 10px; border-radius: 4px; font-size: 12px; white-space: pre-wrap; overflow-x: auto;">' + escapeHtml(originalMarkdown) + '</pre>' +
        '</div>' +
        '<div>' +
          '<h4 style="margin: 0 0 10px 0; color: #28a745;">Modified (Markdown)</h4>' +
          '<pre style="background: #d4edda; padding: 10px; border-radius: 4px; font-size: 12px; white-space: pre-wrap; overflow-x: auto;">' + escapeHtml(newMarkdown) + '</pre>' +
        '</div>' +
      '</div>';

    overlay.className = 'modal-overlay';
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Toggle between rendered and markdown view
    const toggleBtn = modal.querySelector('#toggle-view-mode');
    const renderedView = modal.querySelector('#rendered-view');
    const markdownView = modal.querySelector('#markdown-view');
    let showingMarkdown = false;

    toggleBtn.addEventListener('click', function() {
      showingMarkdown = !showingMarkdown;
      if (showingMarkdown) {
        renderedView.style.display = 'none';
        markdownView.style.display = 'grid';
        toggleBtn.textContent = 'Show Rendered';
      } else {
        renderedView.style.display = 'grid';
        markdownView.style.display = 'none';
        toggleBtn.textContent = 'Show Markdown';
      }
    });

    // Close on outside click
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  };
  
  window.exportChange = function(button) {
    const changeDiv = button.closest('.review-item');
    const originalMarkdown = changeDiv.dataset.originalMarkdown;
    const newMarkdown = changeDiv.dataset.newMarkdown;
    
    const exportData = {
      type: 'text-change',
      timestamp: new Date().toISOString(),
      originalMarkdown: originalMarkdown,
      newMarkdown: newMarkdown,
      elementType: changeDiv.querySelector('div').textContent.split(':')[1].trim()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'change-' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  window.showAcceptedChange = function(button) {
    // Find the element and show details of the accepted change
    const element = button.closest('[class*="web-review-accepted"]');
    if (element) {
      // Create a temporary modal showing the change details
      const overlay = document.createElement('div');
      overlay.style.cssText = 
        'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10002; display: flex; align-items: center; justify-content: center;';
      
      const modal = document.createElement('div');
      modal.style.cssText = 
        'background: white; max-width: 70%; max-height: 70%; overflow: auto; border-radius: 8px; padding: 20px;';
      
      modal.innerHTML = 
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">' +
          '<h3 style="margin: 0; color: #28a745;">✓ Accepted Change Details</h3>' +
          '<button onclick="this.parentElement.parentElement.remove()" style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Close</button>' +
        '</div>' +
        '<div style="margin-bottom: 15px;">' +
          '<strong>Element:</strong> ' + element.tagName.toLowerCase() +
        '</div>' +
        '<div style="margin-bottom: 15px;">' +
          '<strong>Current Content:</strong>' +
          '<div style="background: #d4edda; padding: 10px; border-radius: 4px; margin-top: 5px;">' +
            element.innerHTML.replace(/<button[^>]*>.*?<\/button>/g, '').replace(/<span[^>]*>.*?<\/span>/g, '') +
          '</div>' +
        '</div>' +
        '<div style="font-size: 12px; color: #666;">' +
          'This change has been accepted and applied to the document.' +
        '</div>';
      
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      // Close on outside click
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          overlay.remove();
        }
      });
    }
  };
  
  
  debug("Web Review initialized successfully!");
});