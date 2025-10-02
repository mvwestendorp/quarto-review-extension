/**
 * Diff Viewer Component
 * Handles text diff visualization using diff2html
 */

class DiffViewer {
  constructor(style = 'side-by-side') {
    this.style = style; // 'side-by-side' or 'inline'
    this.initialized = false;
    
    this.init();
  }
  
  init() {
    // Check if diff2html is available
    if (typeof Diff2Html !== 'undefined') {
      this.initialized = true;
      console.log('DiffViewer initialized with style:', this.style);
    } else {
      console.warn('diff2html not available, using fallback diff viewer');
    }
  }
  
  /**
   * Create a unified diff string from original and modified text
   */
  createUnifiedDiff(original, modified, filename = 'text') {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    
    // Simple diff algorithm (in production, use a proper diff library)
    const diff = this.computeDiff(originalLines, modifiedLines);
    
    // Convert to unified diff format
    let unifiedDiff = `--- a/${filename}\n+++ b/${filename}\n`;
    let hunkHeader = `@@ -1,${originalLines.length} +1,${modifiedLines.length} @@\n`;
    unifiedDiff += hunkHeader;
    
    diff.forEach(line => {
      switch (line.type) {
        case 'removed':
          unifiedDiff += `-${line.content}\n`;
          break;
        case 'added':
          unifiedDiff += `+${line.content}\n`;
          break;
        case 'unchanged':
          unifiedDiff += ` ${line.content}\n`;
          break;
      }
    });
    
    return unifiedDiff;
  }
  
  /**
   * Create HTML diff using diff2html
   */
  createHtmlDiff(original, modified, filename = 'text') {
    if (!this.initialized) {
      return this.createFallbackDiff(original, modified);
    }
    
    const unifiedDiff = this.createUnifiedDiff(original, modified, filename);
    
    const configuration = {
      drawFileList: false,
      matching: 'lines',
      outputFormat: this.style === 'side-by-side' ? 'side-by-side' : 'line-by-line',
      synchronisedScroll: true,
      highlight: true,
      renderNothingWhenEmpty: false
    };
    
    try {
      return Diff2Html.html(unifiedDiff, configuration);
    } catch (error) {
      console.error('Error creating diff with diff2html:', error);
      return this.createFallbackDiff(original, modified);
    }
  }
  
  /**
   * Create inline diff display
   */
  createInlineDiff(original, modified) {
    if (!this.initialized) {
      return this.createFallbackInlineDiff(original, modified);
    }
    
    const unifiedDiff = this.createUnifiedDiff(original, modified);
    
    const configuration = {
      drawFileList: false,
      matching: 'words',
      outputFormat: 'line-by-line',
      synchronisedScroll: false,
      highlight: true,
      renderNothingWhenEmpty: false
    };
    
    try {
      return Diff2Html.html(unifiedDiff, configuration);
    } catch (error) {
      console.error('Error creating inline diff:', error);
      return this.createFallbackInlineDiff(original, modified);
    }
  }
  
  /**
   * Show changes overview in a modal
   */
  showChangesOverview(changes) {
    const modal = document.createElement('div');
    modal.className = 'diff-modal-overlay';
    modal.innerHTML = `
      <div class="diff-modal">
        <div class="diff-modal-header">
          <h3>Changes Overview</h3>
          <button class="diff-modal-close" onclick="this.closest('.diff-modal-overlay').remove()">×</button>
        </div>
        <div class="diff-modal-content">
          ${this.createChangesOverviewContent(changes)}
        </div>
      </div>
    `;
    
    // Add modal styles
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const modalContent = modal.querySelector('.diff-modal');
    modalContent.style.cssText = `
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 1200px;
      height: 80%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;
    
    const modalHeader = modal.querySelector('.diff-modal-header');
    modalHeader.style.cssText = `
      padding: 16px 24px;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const modalBody = modal.querySelector('.diff-modal-content');
    modalBody.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    `;
    
    document.body.appendChild(modal);
  }
  
  /**
   * Create content for changes overview
   */
  createChangesOverviewContent(changes) {
    let content = '';
    
    if (changes.size === 0) {
      return '<p>No changes to display.</p>';
    }
    
    changes.forEach((change, id) => {
      content += `
        <div class="change-overview-item" style="margin-bottom: 32px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div class="change-overview-header" style="padding: 16px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
            <h4 style="margin: 0; font-size: 16px;">
              ${change.type} - Element ${change.elementId}
              <span class="change-status" style="float: right; padding: 4px 8px; border-radius: 4px; font-size: 12px; background: ${this.getStatusColor(change.status)};">
                ${change.status}
              </span>
            </h4>
          </div>
          <div class="change-overview-diff" style="background: white;">
            ${this.createHtmlDiff(change.original, change.modified, change.elementId)}
          </div>
        </div>
      `;
    });
    
    return content;
  }
  
  /**
   * Get color for change status
   */
  getStatusColor(status) {
    switch (status) {
      case 'pending': return '#fef3c7';
      case 'accepted': return '#d1fae5';
      case 'rejected': return '#fee2e2';
      default: return '#f3f4f6';
    }
  }
  
  /**
   * Simple diff algorithm (Myers' algorithm simplified)
   */
  computeDiff(originalLines, modifiedLines) {
    const diff = [];
    const originalLength = originalLines.length;
    const modifiedLength = modifiedLines.length;
    
    // Simple line-by-line comparison
    let i = 0, j = 0;
    
    while (i < originalLength || j < modifiedLength) {
      if (i < originalLength && j < modifiedLength) {
        if (originalLines[i] === modifiedLines[j]) {
          diff.push({
            type: 'unchanged',
            content: originalLines[i],
            originalLineNumber: i + 1,
            modifiedLineNumber: j + 1
          });
          i++;
          j++;
        } else {
          // Look ahead to find matches
          let foundMatch = false;
          
          // Check if next original line matches current modified line
          if (i + 1 < originalLength && originalLines[i + 1] === modifiedLines[j]) {
            diff.push({
              type: 'removed',
              content: originalLines[i],
              originalLineNumber: i + 1
            });
            i++;
            foundMatch = true;
          }
          // Check if current original line matches next modified line
          else if (j + 1 < modifiedLength && originalLines[i] === modifiedLines[j + 1]) {
            diff.push({
              type: 'added',
              content: modifiedLines[j],
              modifiedLineNumber: j + 1
            });
            j++;
            foundMatch = true;
          }
          
          if (!foundMatch) {
            // Both lines are different - mark as removal and addition
            diff.push({
              type: 'removed',
              content: originalLines[i],
              originalLineNumber: i + 1
            });
            diff.push({
              type: 'added',
              content: modifiedLines[j],
              modifiedLineNumber: j + 1
            });
            i++;
            j++;
          }
        }
      } else if (i < originalLength) {
        // Remaining original lines are removals
        diff.push({
          type: 'removed',
          content: originalLines[i],
          originalLineNumber: i + 1
        });
        i++;
      } else {
        // Remaining modified lines are additions
        diff.push({
          type: 'added',
          content: modifiedLines[j],
          modifiedLineNumber: j + 1
        });
        j++;
      }
    }
    
    return diff;
  }
  
  /**
   * Fallback diff viewer when diff2html is not available
   */
  createFallbackDiff(original, modified) {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    const diff = this.computeDiff(originalLines, modifiedLines);
    
    let html = '<div class="fallback-diff">';
    
    if (this.style === 'side-by-side') {
      html += this.createSideBySideFallback(diff);
    } else {
      html += this.createInlineFallback(diff);
    }
    
    html += '</div>';
    return html;
  }
  
  createFallbackInlineDiff(original, modified) {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    const diff = this.computeDiff(originalLines, modifiedLines);
    
    return this.createInlineFallback(diff);
  }
  
  createSideBySideFallback(diff) {
    let html = `
      <div class="diff-container side-by-side">
        <div class="diff-side original">
          <div class="diff-side-header">Original</div>
          <div class="diff-content">
    `;
    
    diff.forEach(line => {
      if (line.type === 'unchanged' || line.type === 'removed') {
        const lineClass = line.type === 'removed' ? 'removed' : '';
        html += `
          <div class="diff-line ${lineClass}">
            <span class="diff-line-number">${line.originalLineNumber || ''}</span>
            <span class="diff-line-content">${this.escapeHtml(line.content)}</span>
          </div>
        `;
      } else if (line.type === 'added') {
        html += `
          <div class="diff-line empty">
            <span class="diff-line-number"></span>
            <span class="diff-line-content"></span>
          </div>
        `;
      }
    });
    
    html += `
          </div>
        </div>
        <div class="diff-side modified">
          <div class="diff-side-header">Modified</div>
          <div class="diff-content">
    `;
    
    diff.forEach(line => {
      if (line.type === 'unchanged' || line.type === 'added') {
        const lineClass = line.type === 'added' ? 'added' : '';
        html += `
          <div class="diff-line ${lineClass}">
            <span class="diff-line-number">${line.modifiedLineNumber || ''}</span>
            <span class="diff-line-content">${this.escapeHtml(line.content)}</span>
          </div>
        `;
      } else if (line.type === 'removed') {
        html += `
          <div class="diff-line empty">
            <span class="diff-line-number"></span>
            <span class="diff-line-content"></span>
          </div>
        `;
      }
    });
    
    html += `
          </div>
        </div>
      </div>
    `;
    
    return html;
  }
  
  createInlineFallback(diff) {
    let html = '<div class="diff-container inline">';
    
    diff.forEach(line => {
      const lineClass = line.type;
      const lineNumber = line.originalLineNumber || line.modifiedLineNumber || '';
      const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
      
      html += `
        <div class="diff-line ${lineClass}">
          <span class="diff-line-number">${lineNumber}</span>
          <span class="diff-line-prefix">${prefix}</span>
          <span class="diff-line-content">${this.escapeHtml(line.content)}</span>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }
  
  /**
   * Escape HTML characters
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Set diff style
   */
  setStyle(style) {
    this.style = style;
  }
  
  /**
   * Get current style
   */
  getStyle() {
    return this.style;
  }
}

// Export for use in other modules
window.DiffViewer = DiffViewer;