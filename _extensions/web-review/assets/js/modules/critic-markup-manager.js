/**
 * CriticMarkup Manager Module
 * Manages CriticMarkup annotations, comments, and element state tracking
 *
 * This class is the core of the Web Review extension, handling:
 * - Comment annotations
 * - Text change tracking (git-like commits)
 * - QMD section mapping
 * - Export to CriticMarkup format
 * - Diff generation using LCS algorithm
 */

/**
 * CriticMarkupManager class - Manages CriticMarkup annotations and element states
 */
class CriticMarkupManager {
  /**
   * Initializes the CriticMarkup manager with empty comment and element state tracking.
   * Attempts to extract the original QMD content from the document.
   */
  constructor() {
    this.comments = [];
    this.elementStates = {}; // Stores original vs reviewed state per element
    this.changes = []; // Deprecated: kept for migration only
    this.originalQMD = null; // Will be loaded from storage or extracted
    this.qmdSectionMap = {}; // NEW: Maps section IDs to QMD text
    this.nextNewSectionId = 1; // NEW: Counter for user-created sections
    this.changeHistory = []; // Track all changes for line/section offset calculation
    this.loadFromStorage();
    this.migrateFromOldFormat();
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
   * Find the original markdown for an element from the original QMD
   * This is more reliable than reconstructing from HTML
   * @param {HTMLElement} element - The element to find in QMD
   * @returns {string|null} - The original markdown text, or null if not found
   */
  findElementInOriginalQMD(element) {
    if (!this.originalQMD) {
      debugEditing('No original QMD available');
      return null;
    }

    // Get the element's text content (cleaned)
    const elementText = element.textContent.trim();
    if (!elementText) {
      debugEditing('Element has no text content');
      return null;
    }

    // Normalize whitespace and markdown formatting for better matching
    const normalizeText = (text) => {
      return text
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
        .replace(/\*([^*]+)\*/g, '$1')     // Remove italic
        .replace(/`([^`]+)`/g, '$1')       // Remove code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
        .replace(/\s+/g, ' ')              // Normalize whitespace
        .trim()
        .toLowerCase();
    };
    const normalizedElementText = normalizeText(elementText);

    // Try to find this text in the original QMD
    const qmdLines = this.originalQMD.split('\n');

    // For different element types, we need different strategies
    const tagName = element.tagName;
    debugEditing(`Finding element in QMD: ${tagName}, text length: ${elementText.length}`);

    if (tagName === 'H1' || tagName === 'H2' || tagName === 'H3' ||
        tagName === 'H4' || tagName === 'H5' || tagName === 'H6') {
      // For headings, find the line starting with # that matches the text
      const level = parseInt(tagName.charAt(1));
      const prefix = '#'.repeat(level) + ' ';

      for (const line of qmdLines) {
        if (line.trim().startsWith(prefix)) {
          const headingText = line.substring(line.indexOf(prefix) + prefix.length).trim();
          if (normalizeText(headingText) === normalizedElementText) {
            return line.trim();
          }
        }
      }
    } else if (tagName === 'OL' || tagName === 'UL') {
      // For lists, find consecutive list items that match the content
      // This is more complex - we need to find the range of lines
      const listItems = element.querySelectorAll('li');
      if (listItems.length === 0) {
        debugEditing('List has no items');
        return null;
      }

      // Get text of all list items
      const itemTexts = Array.from(listItems).map(li => normalizeText(li.textContent));
      debugEditing(`Looking for list with ${itemTexts.length} items, first item: "${itemTexts[0].substring(0, 50)}"`);

      // Find matching range in QMD
      for (let i = 0; i < qmdLines.length; i++) {
        const line = qmdLines[i].trim();
        // Check if this is a list item (starts with -, *, +, or number.)
        const listMarkerMatch = line.match(/^([-*+]|\d+\.)\s*/);
        if (listMarkerMatch) {
          const lineText = line.substring(listMarkerMatch[0].length);
          if (normalizeText(lineText) === itemTexts[0]) {
            debugEditing(`Found potential list start at line ${i}: "${line}"`);
            // Found potential start - now find all matching list items
            let matchCount = 1;
            let endLine = i;
            let currentItemIdx = 1;

            // Search forward from here to find remaining list items
            for (let k = i + 1; k < qmdLines.length && currentItemIdx < itemTexts.length; k++) {
              const testLine = qmdLines[k].trim();

              // Skip blank lines
              if (testLine === '') continue;

              // Check if this is a list item
              const testMarkerMatch = testLine.match(/^([-*+]|\d+\.)\s*/);
              if (testMarkerMatch) {
                const testLineText = testLine.substring(testMarkerMatch[0].length);
                if (normalizeText(testLineText) === itemTexts[currentItemIdx]) {
                  matchCount++;
                  endLine = k;
                  currentItemIdx++;
                  debugEditing(`Matched item ${currentItemIdx} at line ${k}`);
                } else {
                  debugEditing(`Item mismatch at line ${k}: expected "${itemTexts[currentItemIdx].substring(0, 30)}", found "${normalizeText(testLineText).substring(0, 30)}"`);
                  // Found a list item but it doesn't match - this isn't the right list
                  break;
                }
              } else {
                // Non-blank, non-list line - end of list
                debugEditing(`Non-list line at ${k}, stopping search`);
                break;
              }
            }

            if (matchCount === itemTexts.length) {
              // Found all items - return the full list range
              const result = qmdLines.slice(i, endLine + 1).join('\n');
              debugEditing(`Successfully found list in QMD (lines ${i}-${endLine})`);
              return result;
            } else {
              debugEditing(`Only matched ${matchCount}/${itemTexts.length} items, continuing search`);
            }
          }
        }
      }
      debugEditing('Could not find matching list in QMD');
    } else {
      // For paragraphs and other elements, find matching lines in QMD
      // Try to find consecutive lines that match the element's text

      // Split element text into words for more flexible matching
      const elementWords = normalizedElementText.split(/\s+/).filter(w => w.length > 0);
      if (elementWords.length === 0) return null;

      // Search for lines that contain the start of the paragraph
      const firstWords = elementWords.slice(0, Math.min(5, elementWords.length)).join(' ');

      for (let i = 0; i < qmdLines.length; i++) {
        const line = qmdLines[i].trim();

        // Skip empty lines, headings, and list items
        if (!line || line.startsWith('#') || line.match(/^[-*+]|\d+\./)) {
          continue;
        }

        // Check if this line starts with our text
        if (normalizeText(line).includes(firstWords)) {
          // Found potential start - collect consecutive non-empty lines
          let endLine = i;
          let collectedText = line;

          // Collect following lines that are part of the same paragraph
          for (let j = i + 1; j < qmdLines.length; j++) {
            const nextLine = qmdLines[j].trim();

            // Stop at empty line, heading, or list
            if (!nextLine || nextLine.startsWith('#') || nextLine.match(/^[-*+]|\d+\./)) {
              break;
            }

            collectedText += ' ' + nextLine;
            endLine = j;
          }

          // Check if the collected text matches our element
          if (normalizeText(collectedText) === normalizedElementText ||
              normalizeText(collectedText).includes(normalizedElementText)) {
            // Return the actual lines (with original formatting)
            const result = qmdLines.slice(i, endLine + 1).join('\n');
            debugEditing(`Found paragraph in QMD (lines ${i}-${endLine})`);
            return result;
          }
        }
      }

      debugEditing('Could not find paragraph in QMD');
    }

    // If we couldn't find it, return null
    debugEditing('Could not find element in original QMD:', tagName, elementText.substring(0, 50));
    return null;
  }

  /**
   * Create a mapping between editable DOM elements and their corresponding QMD sections
   * This provides a reliable 1:1 mapping that eliminates text matching errors
   *
   * Strategy: Parse QMD into sections, then match sections to DOM elements in order
   */
  createQmdSectionMap() {
    if (!this.originalQMD) {
      debug('No original QMD available for section mapping');
      return;
    }

    // Step 1: Parse QMD file into sections
    const qmdSections = this.parseQmdIntoSections(this.originalQMD);
    debugEditing(`Parsed ${qmdSections.length} sections from QMD`);

    // Step 2: Find all editable DOM elements in order
    const editableSelectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',  // Headings
      'p',                                  // Paragraphs
      'ol', 'ul',                          // Lists
      'blockquote',                        // Blockquotes
      'pre'                                // Code blocks
    ].join(', ');

    const allElements = document.querySelectorAll(editableSelectors);
    const topLevelElements = Array.from(allElements).filter(element => {
      // Skip elements inside other editable elements
      const hasEditableParent = element.parentElement?.closest(editableSelectors);
      if (hasEditableParent) return false;
      // Skip empty elements
      if (!element.textContent.trim()) return false;
      // Skip elements in the sidebar/UI (not part of main document content)
      if (element.closest('#web-review-sidebar, .web-review-ui')) return false;
      // Skip elements that are part of the extension's UI
      if (element.classList.contains('web-review-panel') ||
          element.closest('.web-review-panel')) return false;
      return true;
    });

    debugEditing(`Found ${topLevelElements.length} top-level editable elements`);

    // Step 3: Match QMD sections to DOM elements by content matching
    // Use a scoring system to find the best match for each section

    // Helper to normalize text for comparison
    const normalizeForMatch = (text) => {
      return text
        .toLowerCase()
        .replace(/[""]/g, '"')  // Normalize curly quotes to straight quotes
        .replace(/['']/g, "'")  // Normalize curly apostrophes
        .replace(/\s+/g, ' ')   // Normalize whitespace
        .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold
        .replace(/\*([^*]+)\*/g, '$1')      // Remove italic
        .replace(/`([^`]+)`/g, '$1')        // Remove code
        .trim();
    };

    // Debug: Show what we have
    debugEditing('\n=== QMD Sections ===');
    qmdSections.forEach((s, i) => {
      debugEditing(`${i}: ${s.type} - "${s.qmdText.substring(0, 60).replace(/\n/g, ' ')}..."`);
    });

    debugEditing('\n=== DOM Elements ===');
    topLevelElements.forEach((el, i) => {
      debugEditing(`${i}: ${el.tagName.toLowerCase()} - "${el.textContent.substring(0, 60).replace(/\n/g, ' ')}..."`);
    });

    // Build mapping by content matching
    let mappedCount = 0;
    const usedElements = new Set();

    qmdSections.forEach((section, sectionIdx) => {
      const sectionId = `section-${sectionIdx}`;

      // Get normalized QMD text
      let qmdNormalized = normalizeForMatch(section.qmdText);

      // Find best matching DOM element
      let bestMatch = null;
      let bestScore = 0;

      topLevelElements.forEach((element, elemIdx) => {
        if (usedElements.has(elemIdx)) return; // Already matched

        const elementText = normalizeForMatch(element.textContent);

        // Calculate match score
        let score = 0;

        // Type match bonus
        const elemType = element.tagName.toLowerCase();
        if (elemType === section.type) {
          score += 100;
        }

        // Text similarity
        const minLength = Math.min(qmdNormalized.length, elementText.length);
        const maxLength = Math.max(qmdNormalized.length, elementText.length);

        if (minLength > 0) {
          // Check if one contains the other
          if (elementText.includes(qmdNormalized) || qmdNormalized.includes(elementText)) {
            score += 50;
          }

          // Check first 50 chars match
          const qmdStart = qmdNormalized.substring(0, 50);
          const elemStart = elementText.substring(0, 50);
          if (qmdStart === elemStart) {
            score += 30;
          } else if (elemStart.includes(qmdStart.substring(0, 20))) {
            score += 15;
          }

          // Length similarity
          const lengthRatio = minLength / maxLength;
          score += lengthRatio * 10;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = { element, elemIdx };
        }
      });

      if (bestMatch && bestScore > 50) {
        const element = bestMatch.element;
        element.dataset.sectionId = sectionId;
        usedElements.add(bestMatch.elemIdx);

        this.qmdSectionMap[sectionId] = {
          sectionId: sectionId,
          sectionIndex: sectionIdx,  // Store position index for stable reference
          elementPath: this.generateElementPath(element),
          qmdText: section.qmdText,
          originalQmdText: section.qmdText,  // Never changes, even after edits
          type: section.type,
          isNew: false,
          lineStart: section.lineStart,
          lineEnd: section.lineEnd
        };

        mappedCount++;
        debugEditing(`Mapped ${sectionId}: ${section.type} (lines ${section.lineStart}-${section.lineEnd}) to ${element.tagName} [score: ${bestScore}]`);
      } else {
        debugEditing(`Could not find match for ${sectionId}: ${section.type} (best score: ${bestScore})`);
      }
    });

    debug(`Created QMD section map: ${mappedCount}/${qmdSections.length} sections mapped`);

    if (qmdSections.length !== topLevelElements.length) {
      debugEditing(`Note: QMD sections (${qmdSections.length}) != DOM elements (${topLevelElements.length}) - this is OK if Quarto added title or extension added UI elements`);
    }
  }

  /**
   * Parse QMD markdown into sections
   * Each section is a logical block: heading, paragraph, list, etc.
   * Returns array of {type, qmdText, lineStart, lineEnd}
   */
  parseQmdIntoSections(qmd) {
    const lines = qmd.split('\n');
    const sections = [];
    let i = 0;

    // Skip YAML frontmatter if present
    if (lines[i] && lines[i].trim() === '---') {
      i++; // Skip opening ---
      // Find closing ---
      while (i < lines.length && lines[i].trim() !== '---') {
        i++;
      }
      if (i < lines.length) {
        i++; // Skip closing ---
      }
    }

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        i++;
        continue;
      }

      // Heading
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        sections.push({
          type: `h${headingMatch[1].length}`,
          qmdText: line.trim(),
          lineStart: i,
          lineEnd: i
        });
        i++;
        continue;
      }

      // List (ordered or unordered)
      const listMatch = trimmed.match(/^([-*+]|\d+\.)\s+/);
      if (listMatch) {
        const startLine = i;
        const listLines = [line];
        i++;

        // Collect all consecutive list items
        while (i < lines.length) {
          const nextLine = lines[i];
          const nextTrimmed = nextLine.trim();

          // Continue if it's a list item or empty line within list
          if (!nextTrimmed) {
            // Empty line - could be part of list or end of list
            // Look ahead to see if list continues
            if (i + 1 < lines.length && lines[i + 1].trim().match(/^([-*+]|\d+\.)\s+/)) {
              i++; // Skip empty line, list continues
              continue;
            } else {
              break; // End of list
            }
          } else if (nextTrimmed.match(/^([-*+]|\d+\.)\s+/)) {
            listLines.push(nextLine);
            i++;
          } else {
            break; // End of list
          }
        }

        sections.push({
          type: trimmed.match(/^\d+\./) ? 'ol' : 'ul',
          qmdText: listLines.join('\n'),
          lineStart: startLine,
          lineEnd: i - 1
        });
        continue;
      }

      // Code block
      if (trimmed.startsWith('```')) {
        const startLine = i;
        const codeLines = [line];
        i++;

        // Find closing ```
        while (i < lines.length) {
          codeLines.push(lines[i]);
          if (lines[i].trim().startsWith('```')) {
            i++;
            break;
          }
          i++;
        }

        sections.push({
          type: 'pre',
          qmdText: codeLines.join('\n'),
          lineStart: startLine,
          lineEnd: i - 1
        });
        continue;
      }

      // Blockquote
      if (trimmed.startsWith('>')) {
        const startLine = i;
        const quoteLines = [line];
        i++;

        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i]);
          i++;
        }

        sections.push({
          type: 'blockquote',
          qmdText: quoteLines.join('\n'),
          lineStart: startLine,
          lineEnd: i - 1
        });
        continue;
      }

      // Paragraph (default - collect consecutive non-empty, non-special lines)
      const startLine = i;
      const paraLines = [line];
      i++;

      while (i < lines.length) {
        const nextLine = lines[i];
        const nextTrimmed = nextLine.trim();

        // End paragraph if: empty line, heading, list, code block, blockquote
        if (!nextTrimmed ||
            nextTrimmed.match(/^#{1,6}\s+/) ||
            nextTrimmed.match(/^([-*+]|\d+\.)\s+/) ||
            nextTrimmed.startsWith('```') ||
            nextTrimmed.startsWith('>')) {
          break;
        }

        paraLines.push(nextLine);
        i++;
      }

      sections.push({
        type: 'p',
        qmdText: paraLines.join('\n'),
        lineStart: startLine,
        lineEnd: i - 1
      });
    }

    return sections;
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
  addComment(elementPath, selectedText, comment, author, sectionId = null, offsetWithinSection = 0, userColor = null, startOffset = 0, endOffset = 0, commentId = null) {
    // Clean the selected text to remove any UI elements
    const cleanSelectedText = this.cleanTextContent(selectedText);

    const commentData = {
      id: commentId || 'comment-' + Date.now(),
      type: 'comment',
      elementPath: elementPath,
      sectionId: sectionId,  // Section ID (line number will be resolved at submission time)
      selectedText: cleanSelectedText,
      offsetWithinSection: offsetWithinSection,  // Line offset from section start (0-indexed)
      comment: comment,
      author: author,
      userColor: userColor,  // Store user color for consistent highlighting
      startOffset: startOffset,  // Character offset for precise selection highlighting
      endOffset: endOffset,     // Character offset for precise selection highlighting
      timestamp: new Date().toISOString(),
      criticMarkup: `{>>${comment} (${author})<<}`
    };

    this.comments.push(commentData);
    this.saveToStorage();
    return commentData;
  }

  /**
   * Updates or creates element state tracking original vs reviewed markdown.
   * Multiple edits to the same element update the reviewed version while keeping the original.
   * @param {string} elementPath - DOM path identifying the element
   * @param {string} originalMarkdown - The original markdown (stored on first edit)
   * @param {string} reviewedMarkdown - The current reviewed markdown
   * @param {string} author - The reviewer's name
   * @returns {Object} The element state object
   */
  updateElementState(elementPath, originalMarkdown, reviewedMarkdown, author) {
    debug('updateElementState called with:');
    debug('  originalMarkdown:', originalMarkdown);
    debug('  reviewedMarkdown:', reviewedMarkdown);

    // Clean both versions
    const cleanOriginal = this.cleanTextContent(originalMarkdown);
    const cleanReviewed = this.cleanTextContent(reviewedMarkdown);

    debug('After cleaning:');
    debug('  cleanOriginal:', cleanOriginal);
    debug('  cleanReviewed:', cleanReviewed);

    debug('Updating element state:', {
      path: elementPath,
      original: cleanOriginal.substring(0, 50),
      reviewed: cleanReviewed.substring(0, 50)
    });

    // Check if this element already has state
    if (!this.elementStates[elementPath]) {
      // First edit - create initial state with original as base (git-like initial commit)
      debug('Creating new element state with initial commit');
      this.elementStates[elementPath] = {
        originalMarkdown: cleanOriginal,  // Immutable original
        commits: [
          {
            timestamp: new Date().toISOString(),
            author: author,
            reviewedMarkdown: cleanReviewed,
            message: 'Initial edit'
          }
        ],
        status: 'pending'
      };
    } else {
      // Subsequent edit - add new commit to history (git-like)
      debug('Adding new commit to existing element state');
      this.elementStates[elementPath].commits.push({
        timestamp: new Date().toISOString(),
        author: author,
        reviewedMarkdown: cleanReviewed,
        message: 'Edit by ' + author
      });
    }

    // Record the change in history for offset tracking
    this.recordChange(elementPath, cleanOriginal, cleanReviewed);

    this.saveToStorage();
    debug('Element states count:', Object.keys(this.elementStates).length);
    debug('Commits for this element:', this.elementStates[elementPath].commits.length);
    return this.elementStates[elementPath];
  }

  /**
   * Record a change in the change history for line/section offset tracking
   * @param {string} elementPath - The element identifier (usually section ID)
   * @param {string} originalMarkdown - Original markdown before change
   * @param {string} reviewedMarkdown - New markdown after change
   */
  recordChange(elementPath, originalMarkdown, reviewedMarkdown) {
    // Calculate line count delta
    const originalLines = originalMarkdown.split('\n').length;
    const reviewedLines = reviewedMarkdown.split('\n').length;
    const lineDelta = reviewedLines - originalLines;

    // Get section info if available
    const section = this.qmdSectionMap[elementPath];
    const sectionIndex = section ? section.sectionIndex : null;
    const lineStart = section ? section.lineStart : null;

    const changeRecord = {
      timestamp: new Date().toISOString(),
      elementPath: elementPath,
      sectionIndex: sectionIndex,
      lineStart: lineStart,
      lineDelta: lineDelta,  // How many lines were added/removed
      type: 'edit'  // 'edit', 'add-section', 'delete-section'
    };

    this.changeHistory.push(changeRecord);
    debug('Recorded change:', changeRecord);
  }

  /**
   * Calculate the current line number for a section, accounting for all changes
   * that occurred after a given timestamp
   * @param {number} originalSectionIndex - Original section index
   * @param {number} originalLineStart - Original line number
   * @param {string} sinceTimestamp - Only apply changes after this timestamp (null = apply all)
   * @returns {number} Current line number
   */
  calculateCurrentLineNumber(originalSectionIndex, originalLineStart, sinceTimestamp = null) {
    let currentLine = originalLineStart;

    // Filter changes that happened after the timestamp (or all if sinceTimestamp is null)
    const relevantChanges = sinceTimestamp
      ? this.changeHistory.filter(change => change.timestamp > sinceTimestamp)
      : this.changeHistory;

    // Apply changes that affect this line
    for (const change of relevantChanges) {
      // If the change was to a section before this one, apply the line delta
      if (change.sectionIndex !== null && change.sectionIndex < originalSectionIndex) {
        currentLine += change.lineDelta;
        debug(`Applying offset from section ${change.sectionIndex}: ${change.lineDelta} lines`);
      } else if (change.lineStart !== null && change.lineStart < currentLine) {
        currentLine += change.lineDelta;
        debug(`Applying offset from line ${change.lineStart}: ${change.lineDelta} lines`);
      }
    }

    return currentLine;
  }

  /**
   * DEPRECATED: Old method kept for backwards compatibility
   * Use updateElementState instead
   */
  addChange(elementPath, originalText, newText, author, startOffset = null, endOffset = null) {
    return this.updateElementState(elementPath, originalText, newText, author);
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

    let cleaned = text.trim();

    // Remove unnecessary escape sequences added by Wysimark
    // Wysimark escapes many characters that don't need escaping in markdown
    // Keep ONLY escapes that are genuinely needed: \* \_ \` \[ \] for markdown syntax
    // Remove escapes from: : - . , ! ? ( ) / etc.
    cleaned = cleaned.replace(/\\([:\-.,!?()\/])/g, '$1');

    // Also remove escapes from periods and other punctuation
    cleaned = cleaned.replace(/\\([.;])/g, '$1');

    // Fix broken bold formatting from Wysimark editor
    // Pattern: **word**** ****word** should become **word word**
    // This restores the original single bold phrase that got broken during editing
    cleaned = cleaned.replace(/\*\*(\w+)\*{4}\s+\*{4}(\w+)\*\*/g, '**$1 $2**');

    // More general case: any sequence of 4+ asterisks with spaces should be collapsed
    // e.g., "text**** ****more" -> "text more" (removing broken markers entirely)
    cleaned = cleaned.replace(/\*{4}\s+\*{4}/g, ' ');

    // Remove Quarto anchor links from headings [](#anchor-id)
    cleaned = cleaned.replace(/\[]\(#[a-z0-9-]+\)/gi, '');

    // Normalize list formatting: remove extra blank lines between list items added by Wysimark
    // Replace double newlines followed by list markers with single newlines
    cleaned = cleaned.replace(/\n\n([-*+] )/g, '\n$1');

    // Remove double newlines that Wysimark adds after list items
    cleaned = cleaned.replace(/\n\n\n/g, '\n\n');

    return cleaned;
  }

  /**
   * Computes line-level differences for multi-line text (like lists)
   * @param {string} original - The original text
   * @param {string} modified - The modified text
   * @returns {Array<Object>} Array of diff operations (unchanged, delete, add)
   */
  findLineDifferences(original, modified) {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');

    // Use LCS on lines to properly match them
    const lcs = this.computeLCS(originalLines, modifiedLines);

    const operations = [];
    let origIndex = 0;
    let modIndex = 0;
    let lcsIndex = 0;

    while (origIndex < originalLines.length || modIndex < modifiedLines.length) {
      if (lcsIndex < lcs.length &&
          origIndex < originalLines.length &&
          modIndex < modifiedLines.length &&
          originalLines[origIndex] === lcs[lcsIndex] &&
          modifiedLines[modIndex] === lcs[lcsIndex]) {
        // Line is common - keep as is
        operations.push({
          type: 'unchanged',
          text: originalLines[origIndex]
        });
        if (origIndex < originalLines.length - 1 || modIndex < modifiedLines.length - 1) {
          operations.push({ type: 'unchanged', text: '\n' });
        }
        origIndex++;
        modIndex++;
        lcsIndex++;
      } else {
        // Collect deleted lines
        const deletedLines = [];
        while (origIndex < originalLines.length &&
               (lcsIndex >= lcs.length || originalLines[origIndex] !== lcs[lcsIndex])) {
          deletedLines.push(originalLines[origIndex]);
          origIndex++;
        }

        // Collect added lines
        const addedLines = [];
        while (modIndex < modifiedLines.length &&
               (lcsIndex >= lcs.length || modifiedLines[modIndex] !== lcs[lcsIndex])) {
          addedLines.push(modifiedLines[modIndex]);
          modIndex++;
        }

        // Check if we have exactly one deleted and one added line
        // Or if one is a prefix/suffix of the other, treat as modification
        let usedWordDiff = false;
        if (deletedLines.length === 1 && addedLines.length === 1) {
          // Always do word-level diff for single line changes
          const lineDiff = this.findWordDifferences(deletedLines[0], addedLines[0]);
          operations.push(...lineDiff);
          usedWordDiff = true;
        } else if (deletedLines.length === 0 && addedLines.length === 1) {
          // Pure addition
          operations.push({ type: 'add', text: addedLines[0] });
        } else if (deletedLines.length === 1 && addedLines.length === 0) {
          // Pure deletion
          operations.push({ type: 'delete', text: deletedLines[0] });
        } else {
          // Multiple lines changed - treat as block delete/add
          if (deletedLines.length > 0) {
            deletedLines.forEach((line, idx) => {
              operations.push({ type: 'delete', text: line });
              if (idx < deletedLines.length - 1 || addedLines.length > 0) {
                operations.push({ type: 'delete', text: '\n' });
              }
            });
          }
          if (addedLines.length > 0) {
            addedLines.forEach((line, idx) => {
              operations.push({ type: 'add', text: line });
              if (idx < addedLines.length - 1) {
                operations.push({ type: 'add', text: '\n' });
              }
            });
          }
        }

        // Add newline after the changed section if there are more lines
        if ((origIndex < originalLines.length || modIndex < modifiedLines.length) &&
            (deletedLines.length > 0 || addedLines.length > 0 || usedWordDiff)) {
          operations.push({ type: 'unchanged', text: '\n' });
        }
      }
    }

    return operations;
  }

  /**
   * Computes word-level differences for a single line
   * @param {string} original - The original text
   * @param {string} modified - The modified text
   * @returns {Array<Object>} Array of diff operations (unchanged, delete, add)
   */
  findWordDifferences(original, modified) {
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

        // Add operations only if they have actual content (not just empty strings)
        const deletedText = deleted.join('');
        const addedText = added.join('');

        if (deletedText.length > 0) {
          operations.push({
            type: 'delete',
            text: deletedText
          });
        }
        if (addedText.length > 0) {
          operations.push({
            type: 'add',
            text: addedText
          });
        }
      }
    }

    return operations;
  }

  /**
   * Computes word-level differences between original and modified text using LCS algorithm.
   * @param {string} original - The original text
   * @param {string} modified - The modified text
   * @returns {Array<Object>} Array of diff operations (unchanged, delete, add)
   */
  findTextDifferences(original, modified) {
    // For multi-line content (like lists), process line-by-line to avoid
    // creating empty change markers for unchanged lines
    if (original.includes('\n') && modified.includes('\n')) {
      return this.findLineDifferences(original, modified);
    }

    // Word-level diff using LCS algorithm - delegate to findWordDifferences
    const operations = this.findWordDifferences(original, modified);

    // Consolidate consecutive operations of the same type
    const consolidated = [];
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];

      // Check if we can merge with the previous operation
      if (consolidated.length > 0 &&
          consolidated[consolidated.length - 1].type === op.type) {
        // Merge with previous operation
        consolidated[consolidated.length - 1].text += op.text;
      } else {
        // Add as new operation
        consolidated.push({...op});
      }
    }

    return consolidated;
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
   * Saves comments and element states to browser localStorage.
   */
  saveToStorage() {
    localStorage.setItem('webReviewCriticMarkup', JSON.stringify({
      comments: this.comments,
      elementStates: this.elementStates,
      changes: this.changes, // Kept for migration
      originalQMD: this.originalQMD, // Store immutable original QMD
      qmdSectionMap: this.qmdSectionMap, // NEW: Store section mapping
      nextNewSectionId: this.nextNewSectionId, // NEW: Store counter for new sections
      changeHistory: this.changeHistory, // NEW: Track changes for offset calculation
      lastModified: new Date().toISOString()
    }));
  }

  /**
   * Loads comments and element states from browser localStorage.
   */
  loadFromStorage() {
    const stored = localStorage.getItem('webReviewCriticMarkup');
    if (stored) {
      const data = JSON.parse(stored);
      this.comments = data.comments || [];
      this.elementStates = data.elementStates || {};
      this.changes = data.changes || []; // For migration
      this.originalQMD = data.originalQMD || null; // Load stored original QMD
      this.qmdSectionMap = data.qmdSectionMap || {}; // NEW: Load section map
      this.nextNewSectionId = data.nextNewSectionId || 1; // NEW: Load counter
      this.changeHistory = data.changeHistory || []; // NEW: Load change history
    }

    // If no original QMD in storage, extract it from the page and save it
    if (!this.originalQMD) {
      this.originalQMD = this.extractOriginalQMD();
      debug('Extracted and storing original QMD for first time, length:', this.originalQMD?.length);
      this.saveToStorage();
    } else {
      debug('Loaded original QMD from storage, length:', this.originalQMD?.length);
    }

    // NEW: Create section map if not loaded from storage or if it's empty
    if (Object.keys(this.qmdSectionMap).length === 0 && this.originalQMD) {
      debug('Creating QMD section map...');
      this.createQmdSectionMap();
      this.saveToStorage();
    } else {
      debug(`Loaded QMD section map with ${Object.keys(this.qmdSectionMap).length} sections`);
    }
  }

  /**
   * Migrates old formats to new git-like commit format.
   * Handles:
   * 1. Old changes array -> elementStates with commits
   * 2. Old elementStates without commits -> elementStates with commits
   */
  migrateFromOldFormat() {
    let migrated = false;

    // Migration 1: Old changes array to elementStates with commits
    if (this.changes && this.changes.length > 0 && Object.keys(this.elementStates).length === 0) {
      debug('Migrating from old changes format to elementStates with commits...');

      const statesByPath = {};
      this.changes.forEach(change => {
        const path = change.elementPath;
        statesByPath[path] = {
          originalMarkdown: change.originalText,
          commits: [
            {
              timestamp: change.timestamp,
              author: change.author,
              reviewedMarkdown: change.newText,
              message: 'Migrated from old format'
            }
          ],
          status: 'pending'
        };
      });

      this.elementStates = statesByPath;
      this.changes = [];
      migrated = true;
    }

    // Migration 2: Old elementStates without commits to new format with commits
    Object.entries(this.elementStates).forEach(([path, state]) => {
      if (!state.commits && state.reviewedMarkdown) {
        debug('Migrating element state to commit format:', path);
        state.commits = [
          {
            timestamp: state.timestamp || new Date().toISOString(),
            author: state.author || 'Unknown',
            reviewedMarkdown: state.reviewedMarkdown,
            message: 'Migrated from old format'
          }
        ];
        // Clean up old fields
        delete state.reviewedMarkdown;
        delete state.author;
        delete state.timestamp;
        migrated = true;
      }
    });

    if (migrated) {
      this.saveToStorage();
      debug('Migration complete. Total elements:', Object.keys(this.elementStates).length);
    }
  }

  /**
   * Restores element states to the DOM on page load by marking them as modified.
   * Stores data attributes so the edit flow can access the commit history.
   * Note: Visual changes are not applied until user opens the element for editing.
   */
  restoreElementStates() {
    debug('Restoring element states...', Object.keys(this.elementStates).length, 'elements');

    Object.entries(this.elementStates).forEach(([path, state]) => {
      // Find the element in the DOM
      const element = this.findElementByPath(path);
      if (!element) {
        debug('Could not find element for path:', path);
        return;
      }

      // Get the latest commit
      const latestCommit = state.commits && state.commits.length > 0
        ? state.commits[state.commits.length - 1]
        : null;

      if (!latestCommit) {
        debug('No commits found for element:', path);
        return;
      }

      // Mark element as modified and store state in data attributes
      element.classList.add('web-review-modified');
      element.dataset.originalMarkdown = state.originalMarkdown;
      element.dataset.newMarkdown = latestCommit.reviewedMarkdown;
      element.dataset.reviewStatus = 'pending';

      // Add a visual indicator (subtle outline) to show this element has changes
      element.style.outline = '1px dashed #28a745';
      element.style.outlineOffset = '2px';
      element.title = `Modified by ${latestCommit.author} (${state.commits.length} commit${state.commits.length > 1 ? 's' : ''})`;

      debug('Restored state for element:', path, 'with', state.commits.length, 'commits');
    });

    debug('Element state restoration complete');
  }

  /**
   * Finds an element in the DOM by its path.
   * @param {string} path - The element path generated by generateElementPath
   * @returns {Element|null} The found element or null
   */
  findElementByPath(path) {
    try {
      return document.querySelector(path);
    } catch (e) {
      debug('Error finding element by path:', path, e);
      return null;
    }
  }

  /**
   * Exports all comments and element states as CriticMarkup annotations in the QMD content.
   * Uses jsdiff for reliable diffing and processes changes per-element.
   * @returns {string} The QMD content with CriticMarkup annotations applied
   */
  exportToCriticMarkup() {
    let qmdContent = this.originalQMD;

    if (!qmdContent) {
      // If no original QMD, create a basic structure
      qmdContent = this.generateBasicQMD();
    }

    // Clean the QMD content to remove Quarto-generated artifacts
    qmdContent = this.cleanTextContent(qmdContent);

    debug('Exporting CriticMarkup - comments:', this.comments.length, 'element states:', Object.keys(this.elementStates).length);
    debug('Original QMD content length:', qmdContent.length);

    // Debug: check where Hover effects line actually is in the cleaned QMD
    const hoverIndex = qmdContent.indexOf('- **Hover effects**');
    debug('Hover effects line found at position in cleaned QMD:', hoverIndex);
    if (hoverIndex !== -1) {
      debug('Full hover line in QMD:', qmdContent.substring(hoverIndex, hoverIndex + 60));
    }
    debug('QMD sample at 520-580:', qmdContent.substring(520, 580));

    // Collect all annotations (comments and element states) with their positions
    const annotations = [];

    //Process element states using jsdiff
    Object.entries(this.elementStates).forEach(([path, state]) => {
      const original = state.originalMarkdown;

      // Get the latest commit's reviewed markdown (git-like: current HEAD)
      const reviewed = state.commits && state.commits.length > 0
        ? state.commits[state.commits.length - 1].reviewedMarkdown
        : state.reviewedMarkdown; // Fallback for old format

      // Skip if no actual change
      if (original === reviewed) {
        debug('Skipping element - no change:', path);
        return;
      }

      debug('Using commit', state.commits?.length || 0, 'of', state.commits?.length || 0);

      debug('Processing element state:', path);
      debug('Original has newlines:', original.includes('\n'));
      debug('Reviewed has newlines:', reviewed.includes('\n'));
      debug('Original length:', original.length);
      debug('Reviewed length:', reviewed.length);

      // Handle multi-line content (like lists)
      if (original.includes('\n') && reviewed.includes('\n')) {
        debug('Taking multi-line path');
        // Use line-level diff first
        const lineDiff = Diff.diffLines(original, reviewed);
        debug('Line diff result:', lineDiff);

        // Process each changed line
        lineDiff.forEach((part, idx) => {
          debug('Processing diff part:', idx, part);
          if (part.added || part.removed) {
            // For changed lines, try to find them in QMD and do word-level diff
            const lines = part.value.split('\n').filter(l => l.trim());
            debug('Lines to process:', lines);

            lines.forEach(line => {
              const trimmedLine = line.trim();
              if (!trimmedLine) return;

              debug('Looking for line in QMD:', trimmedLine);
              // Try to find this line in QMD
              let index = qmdContent.indexOf(trimmedLine);
              debug('indexOf result:', index);

              // Try with list markers
              if (index === -1) {
                const withMarkers = ['- ', '* ', '+ '].map(m => m + trimmedLine);
                for (const marked of withMarkers) {
                  index = qmdContent.indexOf(marked);
                  if (index !== -1) {
                    index = index + marked.indexOf(trimmedLine);
                    break;
                  }
                }
              }

              if (index !== -1 && !part.added) {
                // Found the original line - we need to diff it against the new version
                // Find corresponding line in reviewed
                const reviewedLines = reviewed.split('\n');
                const matchingReviewed = reviewedLines.find(rl =>
                  rl.includes(trimmedLine.substring(0, Math.min(20, trimmedLine.length)))
                );

                debug('Found line at index:', index);
                debug('TrimmedLine (from localStorage original):', trimmedLine);
                debug('MatchingReviewed (from localStorage reviewed):', matchingReviewed);

                if (matchingReviewed) {
                  // Use localStorage as source of truth:
                  // - trimmedLine is what we believe is the original
                  // - matchingReviewed is what it should become
                  // - Replace trimmedLine.length chars in QMD with the CriticMarkup

                  const wordDiff = Diff.diffWords(trimmedLine, matchingReviewed.trim());
                  const criticMarkup = convertToCriticMarkup(wordDiff);

                  debug('Word diff for line:', wordDiff);
                  debug('CriticMarkup for line:', criticMarkup);
                  debug('Will replace', trimmedLine.length, 'chars at position', index);

                  annotations.push({
                    type: 'change',
                    index: index,
                    length: trimmedLine.length,
                    text: trimmedLine,
                    markup: criticMarkup,
                    author: state.author
                  });
                }
              }
            });
          }
        });
      } else {
        debug('Taking single-line path');
        // Single-line content - use word-level diff
        // Try to find either original or reviewed in QMD
        let index = qmdContent.indexOf(original);
        let foundInQMD = original;

        if (index === -1) {
          // Original not found, try reviewed
          index = qmdContent.indexOf(reviewed);
          foundInQMD = reviewed;
        }

        if (index !== -1) {
          // Check what's actually at this position in QMD - might be different from both original and reviewed
          // due to QMD file being edited outside the app
          let actualQmdText = qmdContent.substring(index, index + Math.max(original.length, reviewed.length) + 20);

          // Find where this line/segment ends (newline or end of content)
          let endIndex = actualQmdText.indexOf('\n');
          if (endIndex === -1) endIndex = actualQmdText.length;
          actualQmdText = actualQmdText.substring(0, endIndex);

          debug('=== Single-line diff debug ===');
          debug('Original from state:', original);
          debug('Reviewed from state:', reviewed);
          debug('Actually found in QMD:', actualQmdText);

          // Determine what to replace: if QMD has reviewed version, replace all of it
          let lengthToReplace;
          if (actualQmdText === reviewed || actualQmdText.startsWith(reviewed)) {
            lengthToReplace = reviewed.length;
            debug('QMD contains reviewed version - replacing entire reviewed text');
          } else if (actualQmdText === original || actualQmdText.startsWith(original)) {
            lengthToReplace = original.length;
            debug('QMD contains original version - replacing original text');
          } else {
            lengthToReplace = actualQmdText.length;
            debug('QMD contains different text - replacing what we found');
          }

          const wordDiff = Diff.diffWords(original, reviewed);
          const criticMarkup = convertToCriticMarkup(wordDiff);

          debug('Word diff result:', wordDiff);
          debug('CriticMarkup output:', criticMarkup);
          debug('Length to replace:', lengthToReplace);

          annotations.push({
            type: 'change',
            index: index,
            length: lengthToReplace,
            text: actualQmdText,
            markup: criticMarkup,
            author: state.author
          });
        } else {
          debug('Could not find original or reviewed text in QMD');
          debug('Original:', original.substring(0, 50));
          debug('Reviewed:', reviewed.substring(0, 50));
        }
      }
    });

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
            // Clean the original markdown to remove Wysimark artifacts
            return criticMarkupManager.cleanTextContent(element.dataset.originalMarkdown);
          }

          // Get innerHTML, but exclude diff wrapper if present
          let htmlContent = element.innerHTML;
          const diffWrapper = element.querySelector('[data-web-review-diff]');
          if (diffWrapper) {
            htmlContent = diffWrapper.innerHTML;
          }

          // For unmodified content, extract plain text
          // Note: formatting is lost for unmodified elements without stored markdown
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent;
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

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CriticMarkupManager };
}
