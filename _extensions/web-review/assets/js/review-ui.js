/**
 * Web Review Extension - Main UI Controller
 * Handles commenting, text selection, and review interface
 */

class WebReview {
  constructor(config = {}) {
    this.config = {
      mode: 'review',
      features: {
        comments: true,
        editing: true,
        versioning: true,
        diffView: true
      },
      ui: {
        theme: 'default',
        sidebarPosition: 'right',
        diffStyle: 'side-by-side'
      },
      storage: {
        embedSources: true,
        autoSave: true
      },
      ...config
    };
    
    this.comments = new Map();
    this.changes = new Map();
    this.selectedElement = null;
    this.highlighter = null;
    this.diffViewer = null;
    this.versionControl = null;
    
    this.init();
  }
  
  init() {
    this.setupUI();
    this.setupEventListeners();
    this.initializeComponents();
    this.loadStoredData();
    
    console.log('Web Review Extension initialized', this.config);
  }
  
  setupUI() {
    // Create mode indicator
    this.createModeIndicator();
    
    // Create toolbar
    this.createToolbar();
    
    // Create sidebar
    this.createSidebar();
    
    // Add body class for theming
    document.body.classList.add(`web-review-${this.config.mode}`);
    document.body.classList.add(`theme-${this.config.ui.theme}`);
  }
  
  createModeIndicator() {
    const indicator = document.createElement('div');
    indicator.className = `review-mode-indicator ${this.config.mode}-mode`;
    indicator.innerHTML = `
      <span>Review Mode: ${this.config.mode.charAt(0).toUpperCase() + this.config.mode.slice(1)}</span>
    `;
    document.body.prepend(indicator);
  }
  
  createToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = `review-toolbar ${this.config.ui.sidebarPosition}`;
    toolbar.innerHTML = `
      <button id="toggle-sidebar" title="Toggle Review Panel">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
      </button>
      ${this.config.features.comments ? `
        <button id="add-comment" title="Add Comment">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.99 4c0-1.1-.89-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.89 2 2 2h14l4 4-.01-18z"/>
          </svg>
        </button>
      ` : ''}
      ${this.config.features.editing ? `
        <button id="edit-text" title="Edit Text">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        </button>
      ` : ''}
      ${this.config.features.diffView ? `
        <button id="view-changes" title="View Changes">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </button>
      ` : ''}
      <button id="save-review" title="Save Review">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
        </svg>
      </button>
    `;
    document.body.appendChild(toolbar);
  }
  
  createSidebar() {
    const sidebar = document.createElement('div');
    sidebar.className = `review-sidebar ${this.config.ui.sidebarPosition}`;
    sidebar.innerHTML = `
      <div class="review-sidebar-header">
        <h3 class="review-sidebar-title">Review Panel</h3>
      </div>
      <div class="review-sidebar-content">
        <div id="comments-section">
          <h4>Comments</h4>
          <div id="comments-list"></div>
        </div>
        <div id="changes-section">
          <h4>Changes</h4>
          <div id="changes-list"></div>
        </div>
      </div>
    `;
    document.body.appendChild(sidebar);
    this.sidebar = sidebar;
  }
  
  setupEventListeners() {
    // Toolbar events
    document.getElementById('toggle-sidebar')?.addEventListener('click', () => {
      this.toggleSidebar();
    });
    
    document.getElementById('add-comment')?.addEventListener('click', () => {
      this.startCommentMode();
    });
    
    document.getElementById('edit-text')?.addEventListener('click', () => {
      this.startEditMode();
    });
    
    document.getElementById('view-changes')?.addEventListener('click', () => {
      this.viewChanges();
    });
    
    document.getElementById('save-review')?.addEventListener('click', () => {
      this.saveReview();
    });
    
    // Document events
    document.addEventListener('mouseup', (e) => {
      if (this.config.features.comments) {
        this.handleTextSelection(e);
      }
    });
    
    // Reviewable element events
    document.querySelectorAll('.reviewable').forEach(element => {
      element.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey) {
          this.selectElement(element);
        }
      });
      
      element.addEventListener('dblclick', (e) => {
        if (this.config.features.editing) {
          this.editElement(element);
        }
      });
    });
  }
  
  initializeComponents() {
    // Initialize text highlighter
    if (typeof rangy !== 'undefined' && this.config.features.comments) {
      rangy.init();
      this.highlighter = rangy.createHighlighter();
      this.highlighter.addClassApplier(rangy.createClassApplier('text-highlight comment-highlight'));
    }
    
    // Initialize diff viewer
    if (typeof Diff2Html !== 'undefined' && this.config.features.diffView) {
      this.diffViewer = new DiffViewer(this.config.ui.diffStyle);
    }
    
    // Initialize version control
    if (typeof git !== 'undefined' && this.config.features.versioning) {
      this.versionControl = new VersionControl();
    }
  }
  
  handleTextSelection(event) {
    const selection = window.getSelection();
    if (selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Show comment button near selection
      this.showCommentPrompt(rect, range);
    }
  }
  
  showCommentPrompt(rect, range) {
    // Remove existing prompt
    const existingPrompt = document.querySelector('.comment-prompt');
    if (existingPrompt) {
      existingPrompt.remove();
    }
    
    const prompt = document.createElement('div');
    prompt.className = 'comment-prompt';
    prompt.style.cssText = `
      position: absolute;
      top: ${rect.bottom + window.scrollY + 5}px;
      left: ${rect.left + window.scrollX}px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
    `;
    
    prompt.innerHTML = `
      <button onclick="webReview.addComment('${this.encodeRange(range)}')">
        Add Comment
      </button>
    `;
    
    document.body.appendChild(prompt);
    
    // Remove prompt after 3 seconds if not used
    setTimeout(() => {
      if (document.body.contains(prompt)) {
        prompt.remove();
      }
    }, 3000);
  }
  
  addComment(rangeId, text = '') {
    const commentId = `comment-${Date.now()}`;
    const range = this.decodeRange(rangeId);
    
    if (!text) {
      // Show comment form
      this.showCommentForm(commentId, range);
    } else {
      // Save comment
      this.comments.set(commentId, {
        id: commentId,
        range: rangeId,
        text: text,
        author: 'Reviewer',
        timestamp: new Date().toISOString(),
        resolved: false
      });
      
      // Highlight text
      if (this.highlighter && range) {
        this.highlighter.highlightRange(range);
      }
      
      this.updateCommentsUI();
      this.saveToStorage();
    }
    
    // Remove comment prompt
    const prompt = document.querySelector('.comment-prompt');
    if (prompt) prompt.remove();
  }
  
  showCommentForm(commentId, range) {
    const form = document.createElement('div');
    form.className = 'comment-form-overlay';
    form.innerHTML = `
      <div class="comment-form-dialog">
        <h4>Add Comment</h4>
        <textarea placeholder="Enter your comment..." rows="4"></textarea>
        <div class="comment-form-actions">
          <button onclick="webReview.submitComment('${commentId}', this)">Submit</button>
          <button onclick="this.closest('.comment-form-overlay').remove()">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(form);
  }
  
  submitComment(commentId, button) {
    const form = button.closest('.comment-form-overlay');
    const textarea = form.querySelector('textarea');
    const text = textarea.value.trim();
    
    if (text) {
      // Find the range for this comment
      const range = window.getSelection().getRangeAt(0);
      this.addComment(this.encodeRange(range), text);
    }
    
    form.remove();
  }
  
  editElement(element) {
    if (this.config.mode === 'read-only') return;

    const originalHtml = element.innerHTML;
    this.showEditDialog(element, originalHtml);
  }
  
  showEditDialog(element, originalHtml) {
    const dialog = document.createElement('div');
    dialog.className = 'edit-overlay';
    dialog.innerHTML = `
      <div class="edit-dialog">
        <div class="edit-dialog-header">
          <h3 class="edit-dialog-title">Edit Text</h3>
        </div>
        <div class="edit-dialog-content">
          <div class="edit-richtext" contenteditable="true">${originalHtml}</div>
        </div>
        <div class="edit-dialog-actions">
          <button class="btn-primary" onclick="webReview.saveEdit(this)">Save</button>
          <button class="btn-secondary" onclick="webReview.cancelEdit(this)">Cancel</button>
        </div>
      </div>
    `;

    dialog.style.display = 'block';
    document.body.appendChild(dialog);

    // Store reference to element being edited
    dialog.dataset.elementId = element.dataset.reviewId;

    // Focus the contenteditable div
    const editableDiv = dialog.querySelector('.edit-richtext');
    if (editableDiv) {
      editableDiv.focus();
      // Place cursor at the end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editableDiv);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
  
  saveEdit(button) {
    const dialog = button.closest('.edit-overlay');
    const editableDiv = dialog.querySelector('.edit-richtext');
    const newHtml = editableDiv.innerHTML;
    const elementId = dialog.dataset.elementId;
    const element = document.querySelector(`[data-review-id="${elementId}"]`);

    if (element) {
      const originalHtml = element.innerHTML;

      // Check if content has actually changed
      if (newHtml !== originalHtml) {
        // Check if there's already a pending change for this element
        let existingChangeId = null;
        this.changes.forEach((change, id) => {
          if (change.elementId === elementId && change.status === 'pending') {
            existingChangeId = id;
          }
        });

        if (existingChangeId) {
          // Update existing change
          const existingChange = this.changes.get(existingChangeId);
          existingChange.modified = newHtml;
          existingChange.timestamp = new Date().toISOString();
        } else {
          // Create new change record
          const changeId = `change-${Date.now()}`;
          this.changes.set(changeId, {
            id: changeId,
            elementId: elementId,
            type: 'text-edit',
            original: originalHtml,
            modified: newHtml,
            timestamp: new Date().toISOString(),
            status: 'pending'
          });
        }

        // Apply change visually
        if (this.config.mode === 'review') {
          element.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
          element.dataset.hasChanges = 'true';
        } else {
          element.innerHTML = newHtml;
        }

        this.updateChangesUI();
        this.saveToStorage();
      }
    }

    dialog.remove();
  }
  
  cancelEdit(button) {
    const dialog = button.closest('.edit-overlay');
    dialog.remove();
  }
  
  updateCommentsUI() {
    const commentsList = document.getElementById('comments-list');
    commentsList.innerHTML = '';
    
    this.comments.forEach(comment => {
      const commentEl = document.createElement('div');
      commentEl.className = 'comment-thread';
      commentEl.innerHTML = `
        <div class="comment-header">
          Comment #${comment.id.split('-')[1]}
        </div>
        <div class="comment">
          <div class="comment-meta">
            <span class="comment-author">${comment.author}</span>
            <span class="comment-timestamp">${new Date(comment.timestamp).toLocaleString()}</span>
          </div>
          <div class="comment-content">${comment.text}</div>
        </div>
        ${this.config.mode === 'author' ? `
          <div class="comment-form">
            <textarea placeholder="Reply to comment..."></textarea>
            <div class="comment-form-actions">
              <button class="btn-primary" onclick="webReview.replyToComment('${comment.id}', this)">Reply</button>
              <button class="btn-secondary" onclick="webReview.resolveComment('${comment.id}')">Resolve</button>
            </div>
          </div>
        ` : ''}
      `;
      commentsList.appendChild(commentEl);
    });
  }
  
  updateChangesUI() {
    const changesList = document.getElementById('changes-list');
    changesList.innerHTML = '';

    this.changes.forEach(change => {
      const changeEl = document.createElement('div');
      changeEl.className = 'change-item';
      changeEl.innerHTML = `
        <div class="change-header">
          <strong>${change.type}</strong>
          <span class="change-status status-${change.status}">${change.status}</span>
        </div>
        <div class="change-content">
          ${this.diffViewer ? this.diffViewer.createInlineDiff(change.original, change.modified) : ''}
        </div>
        ${this.config.mode === 'author' ? `
          <div class="change-actions">
            ${change.status === 'pending' ? `
              <button onclick="webReview.acceptChange('${change.id}')">Accept</button>
              <button onclick="webReview.rejectChange('${change.id}')">Reject</button>
            ` : `
              <button onclick="webReview.removeChange('${change.id}')">Remove</button>
            `}
          </div>
        ` : ''}
      `;
      changesList.appendChild(changeEl);
    });
  }
  
  acceptChange(changeId) {
    const change = this.changes.get(changeId);
    if (change) {
      change.status = 'accepted';
      const element = document.querySelector(`[data-review-id="${change.elementId}"]`);
      if (element) {
        element.innerHTML = change.modified;
        element.style.backgroundColor = '';

        // Update embedded source files
        this.updateEmbeddedSources(change);
      }
      this.updateChangesUI();
      this.saveToStorage();
    }
  }
  
  rejectChange(changeId) {
    const change = this.changes.get(changeId);
    if (change) {
      change.status = 'rejected';
      const element = document.querySelector(`[data-review-id="${change.elementId}"]`);
      if (element) {
        element.style.backgroundColor = '';
        element.dataset.hasChanges = 'false';
      }
      this.updateChangesUI();
      this.saveToStorage();
    }
  }

  removeChange(changeId) {
    const change = this.changes.get(changeId);
    if (change && (change.status === 'accepted' || change.status === 'rejected')) {
      // Remove the change from the map
      this.changes.delete(changeId);

      // Update UI and storage
      this.updateChangesUI();
      this.saveToStorage();
    }
  }
  
  updateEmbeddedSources(change) {
    // Update the embedded Quarto source files to reflect accepted changes
    const sourcesScript = document.getElementById('embedded-sources');
    if (sourcesScript) {
      try {
        const sources = JSON.parse(sourcesScript.textContent);
        
        // This is a simplified approach - in a real implementation,
        // you'd need to map HTML elements back to their original Quarto source
        if (!sources.changes) {
          sources.changes = [];
        }
        
        sources.changes.push({
          elementId: change.elementId,
          original: change.original,
          modified: change.modified,
          timestamp: change.timestamp,
          status: change.status
        });
        
        sourcesScript.textContent = JSON.stringify(sources, null, 2);
      } catch (e) {
        console.error('Failed to update embedded sources:', e);
      }
    }
  }
  
  toggleSidebar() {
    this.sidebar.classList.toggle('open');
  }
  
  startCommentMode() {
    document.body.classList.add('comment-mode');
    // Additional comment mode logic
  }
  
  startEditMode() {
    document.body.classList.add('edit-mode');
    // Additional edit mode logic
  }
  
  viewChanges() {
    // Show changes overview
    if (this.diffViewer) {
      this.diffViewer.showChangesOverview(this.changes);
    }
  }
  
  async saveReview() {
    this.saveToStorage();

    // Get clean review data using exportReview method
    const reviewData = await this.exportReview();

    // Create a clean export with only essential data
    const cleanExport = {
      comments: reviewData.comments.map(comment => ({
        id: comment.id,
        text: comment.text,
        author: comment.author,
        timestamp: comment.timestamp,
        resolved: comment.resolved,
        replies: comment.replies || []
      })),
      changes: reviewData.changes.map(change => ({
        id: change.id,
        elementId: change.elementId,
        type: change.type,
        original: change.original,
        modified: change.modified,
        timestamp: change.timestamp,
        status: change.status
      })),
      timestamp: reviewData.timestamp
    };

    const blob = new Blob([JSON.stringify(cleanExport, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `review-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  saveToStorage() {
    if (this.config.storage.autoSave) {
      const data = {
        comments: Array.from(this.comments.entries()),
        changes: Array.from(this.changes.entries()),
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('web-review-data', JSON.stringify(data));
    }
  }
  
  loadStoredData() {
    try {
      const stored = localStorage.getItem('web-review-data');
      if (stored) {
        const data = JSON.parse(stored);
        this.comments = new Map(data.comments || []);
        this.changes = new Map(data.changes || []);
        this.updateCommentsUI();
        this.updateChangesUI();
      }
    } catch (e) {
      console.error('Failed to load stored review data:', e);
    }
  }
  
  // Utility methods
  encodeRange(range) {
    // Simple range encoding - in production, use a more robust method
    return btoa(JSON.stringify({
      startContainer: range.startContainer.nodeValue || range.startContainer.tagName,
      startOffset: range.startOffset,
      endContainer: range.endContainer.nodeValue || range.endContainer.tagName,
      endOffset: range.endOffset
    }));
  }
  
  decodeRange(encoded) {
    try {
      const data = JSON.parse(atob(encoded));
      // Simple decoding - in production, implement proper range restoration
      return window.getSelection().getRangeAt(0);
    } catch (e) {
      return null;
    }
  }
  
  selectElement(element) {
    // Remove previous selection
    document.querySelectorAll('.reviewable.selected').forEach(el => {
      el.classList.remove('selected');
    });
    
    // Select new element
    element.classList.add('selected');
    this.selectedElement = element;
  }
  
  replyToComment(commentId, button) {
    const textarea = button.parentElement.querySelector('textarea');
    const replyText = textarea.value.trim();
    
    if (replyText) {
      const comment = this.comments.get(commentId);
      if (comment) {
        if (!comment.replies) {
          comment.replies = [];
        }
        comment.replies.push({
          text: replyText,
          author: 'Author',
          timestamp: new Date().toISOString()
        });
        
        textarea.value = '';
        this.updateCommentsUI();
        this.saveToStorage();
      }
    }
  }
  
  resolveComment(commentId) {
    const comment = this.comments.get(commentId);
    if (comment) {
      comment.resolved = true;
      this.updateCommentsUI();
      this.saveToStorage();
    }
  }
  
  /**
   * Enhanced review mode functionality
   */
  switchMode(newMode) {
    if (['review', 'author', 'read-only'].includes(newMode)) {
      this.config.mode = newMode;
      
      // Update body classes
      document.body.className = document.body.className.replace(/web-review-\w+/g, '');
      document.body.classList.add(`web-review-${newMode}`);
      
      // Update mode indicator
      const indicator = document.querySelector('.review-mode-indicator');
      if (indicator) {
        indicator.className = `review-mode-indicator ${newMode}-mode`;
        indicator.innerHTML = `<span>Review Mode: ${newMode.charAt(0).toUpperCase() + newMode.slice(1)}</span>`;
      }
      
      // Update UI based on mode
      this.updateUIForMode(newMode);
      
      // Update toolbar visibility
      this.updateToolbarForMode(newMode);
      
      // Re-render comments and changes
      this.updateCommentsUI();
      this.updateChangesUI();
    }
  }
  
  updateUIForMode(mode) {
    const toolbar = document.querySelector('.review-toolbar');
    if (!toolbar) return;
    
    const buttons = {
      'add-comment': ['review'],
      'edit-text': ['review', 'author'],
      'view-changes': ['review', 'author'],
      'save-review': ['review', 'author']
    };
    
    Object.entries(buttons).forEach(([buttonId, allowedModes]) => {
      const button = document.getElementById(buttonId);
      if (button) {
        button.style.display = allowedModes.includes(mode) ? 'block' : 'none';
      }
    });
    
    // Add mode switcher if not present
    if (!document.getElementById('mode-switcher')) {
      this.addModeSwitcher();
    }
  }
  
  addModeSwitcher() {
    const toolbar = document.querySelector('.review-toolbar');
    if (toolbar) {
      const switcher = document.createElement('select');
      switcher.id = 'mode-switcher';
      switcher.innerHTML = `
        <option value="review" ${this.config.mode === 'review' ? 'selected' : ''}>Review</option>
        <option value="author" ${this.config.mode === 'author' ? 'selected' : ''}>Author</option>
        <option value="read-only" ${this.config.mode === 'read-only' ? 'selected' : ''}>Read Only</option>
      `;
      switcher.addEventListener('change', (e) => {
        this.switchMode(e.target.value);
      });
      toolbar.appendChild(switcher);
    }
  }
  
  updateToolbarForMode(mode) {
    // Add specific styling or behavior changes for different modes
    const toolbar = document.querySelector('.review-toolbar');
    if (toolbar) {
      toolbar.className = toolbar.className.replace(/mode-\w+/g, '');
      toolbar.classList.add(`mode-${mode}`);
    }
  }
  
  /**
   * Batch operations for review workflow
   */
  acceptAllChanges() {
    if (this.config.mode !== 'author') return;
    
    this.changes.forEach((change, changeId) => {
      if (change.status === 'pending') {
        this.acceptChange(changeId);
      }
    });
  }
  
  rejectAllChanges() {
    if (this.config.mode !== 'author') return;
    
    this.changes.forEach((change, changeId) => {
      if (change.status === 'pending') {
        this.rejectChange(changeId);
      }
    });
  }
  
  resolveAllComments() {
    if (this.config.mode !== 'author') return;
    
    this.comments.forEach((comment, commentId) => {
      if (!comment.resolved) {
        this.resolveComment(commentId);
      }
    });
  }
  
  /**
   * Import/Export functionality
   */
  async importReview(file) {
    try {
      const text = await file.text();
      const reviewData = JSON.parse(text);
      
      // Load comments
      if (reviewData.comments) {
        this.comments.clear();
        reviewData.comments.forEach(comment => {
          this.comments.set(comment.id, comment);
        });
      }
      
      // Load changes
      if (reviewData.changes) {
        this.changes.clear();
        reviewData.changes.forEach(change => {
          this.changes.set(change.id, change);
        });
      }
      
      // Update embedded sources if available
      if (reviewData.sources && this.versionControl) {
        await this.versionControl.importReviewPackage(reviewData);
      }
      
      this.updateCommentsUI();
      this.updateChangesUI();
      this.saveToStorage();
      
      return { success: true };
      
    } catch (error) {
      console.error('Failed to import review:', error);
      return { success: false, error: error.message };
    }
  }
  
  async exportReview() {
    let reviewData = {
      comments: Array.from(this.comments.values()),
      changes: Array.from(this.changes.values()),
      timestamp: new Date().toISOString(),
      config: this.config
    };
    
    // Include source data if version control is available
    if (this.versionControl) {
      const versionData = await this.versionControl.exportReviewPackage(
        this.comments, 
        this.changes
      );
      reviewData = { ...reviewData, ...versionData };
    }
    
    return reviewData;
  }
  
  /**
   * Advanced diff and change tracking
   */
  previewChange(changeId) {
    const change = this.changes.get(changeId);
    if (!change) return;
    
    const modal = document.createElement('div');
    modal.className = 'change-preview-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Preview Change</h3>
          <button onclick="this.closest('.change-preview-modal').remove()">×</button>
        </div>
        <div class="modal-body">
          ${this.diffViewer ? this.diffViewer.createHtmlDiff(change.original, change.modified) : ''}
        </div>
        <div class="modal-footer">
          ${this.config.mode === 'author' ? `
            <button onclick="webReview.acceptChange('${changeId}'); this.closest('.change-preview-modal').remove()">Accept</button>
            <button onclick="webReview.rejectChange('${changeId}'); this.closest('.change-preview-modal').remove()">Reject</button>
          ` : ''}
          <button onclick="this.closest('.change-preview-modal').remove()">Close</button>
        </div>
      </div>
    `;
    
    // Style the modal
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); z-index: 2000;
      display: flex; align-items: center; justify-content: center;
    `;
    
    document.body.appendChild(modal);
  }
}

// Global instance
let webReview;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    webReview = new WebReview(window.WebReviewConfig);
  });
} else {
  webReview = new WebReview(window.WebReviewConfig);
}

// Export for external use
window.WebReview = WebReview;