import { createModuleLogger } from '@utils/debug';
import { getBuildString, getFullBuildInfo } from '../../../version';
import type { Comment } from '@/types';
import type { SectionCommentSnapshot } from '../comments/CommentController';
import type { UserModule } from '../../user';
import {
  createButton,
  createDiv,
  createIcon,
  setAttributes,
  toggleClass,
} from '@utils/dom-helpers';

const logger = createModuleLogger('BottomDrawer');

interface TranslationDrawerProgress {
  phase: 'idle' | 'running' | 'success' | 'error';
  message: string;
  percent?: number;
}

export interface CommentsSidebarCallbacks {
  onNavigate: (elementId: string, commentKey: string) => void;
  onRemove: (elementId: string, comment: Comment) => void;
  onEdit: (elementId: string, comment: Comment) => void;
  onHover: (elementId: string, commentKey: string) => void;
  onLeave: () => void;
}

/**
 * BottomDrawer consolidates review tools, comments, and translation tools
 * into a single expandable drawer panel at the bottom of the screen.
 * This provides better mobile support and dedicated space for comments.
 */
export class BottomDrawer {
  private element: HTMLElement | null = null;
  private translationMode = false;
  private debugMode = false; // Controls visibility of debug tools
  private userModule?: UserModule;

  // Header elements
  private toggleBtn: HTMLButtonElement | null = null;
  private drawerTitle: HTMLElement | null = null;

  // Review Tools elements
  private reviewToolsSection: HTMLElement | null = null;
  private undoBtn: HTMLButtonElement | null = null;
  private redoBtn: HTMLButtonElement | null = null;
  private trackedChangesToggle: HTMLInputElement | null = null;

  // Export section elements
  private exportSection: HTMLElement | null = null;
  private exportCleanBtn: HTMLButtonElement | null = null;
  private exportCriticBtn: HTMLButtonElement | null = null;
  private submitReviewBtn: HTMLButtonElement | null = null;
  private readonly submitReviewLabel = '🚀 Submit Review';
  private submitReviewEnabled = false;
  private submitReviewPending = false;

  // Comments section elements
  private commentsSection: HTMLElement | null = null;
  private commentsContent: HTMLElement | null = null;
  private commentSections: SectionCommentSnapshot[] = [];
  private commentsCallbacks: CommentsSidebarCallbacks | null = null;

  // Translation section elements
  private translationSection: HTMLElement | null = null;
  private translationBtn: HTMLButtonElement | null = null;
  private translationEnabled = false;

  // Translation Tools elements
  private translationToolsSection: HTMLElement | null = null;
  private translateDocumentBtn: HTMLButtonElement | null = null;
  private translateSentenceBtn: HTMLButtonElement | null = null;
  private providerSelector: HTMLSelectElement | null = null;
  private sourceLanguageSelector: HTMLSelectElement | null = null;
  private targetLanguageSelector: HTMLSelectElement | null = null;
  private swapLanguagesBtn: HTMLButtonElement | null = null;
  private autoTranslateToggle: HTMLInputElement | null = null;
  private translationExportUnifiedBtn: HTMLButtonElement | null = null;
  private translationExportSeparatedBtn: HTMLButtonElement | null = null;
  private exitTranslationBtn: HTMLButtonElement | null = null;
  private clearModelCacheBtn: HTMLButtonElement | null = null;
  private translationProgressContainer: HTMLElement | null = null;
  private translationProgressBar: HTMLElement | null = null;
  private translationProgressText: HTMLElement | null = null;
  private translateDocumentDefaultLabel = 'Translate Document';
  private translateSentenceDefaultLabel = 'Translate Selected';

  // Storage/Debug section
  private debugSection: HTMLElement | null = null;

  // Unsaved changes indicator
  private unsavedIndicator: HTMLElement | null = null;

  // Callbacks
  private onUndoCallback: (() => void) | null = null;
  private onRedoCallback: (() => void) | null = null;
  private onTranslationUndoCallback: (() => void) | null = null;
  private onTranslationRedoCallback: (() => void) | null = null;
  private onTrackedChangesCallback: ((enabled: boolean) => void) | null = null;
  private onToggleDrawerCallback: (() => void) | null = null;
  private onClearDraftsCallback: (() => void) | null = null;
  private onExportCleanCallback: (() => void) | null = null;
  private onExportCriticCallback: (() => void) | null = null;
  private onSubmitReviewCallback: (() => void) | null = null;
  private onToggleTranslationCallback: (() => void) | null = null;
  private onTranslateDocumentCallback: (() => void) | null = null;
  private onTranslateSentenceCallback: (() => void) | null = null;
  private onProviderChangeCallback: ((provider: string) => void) | null = null;
  private onSourceLanguageChangeCallback: ((lang: string) => void) | null =
    null;
  private onTargetLanguageChangeCallback: ((lang: string) => void) | null =
    null;
  private onSwapLanguagesCallback: (() => void) | null = null;
  private onAutoTranslateChangeCallback: ((enabled: boolean) => void) | null =
    null;
  private onTranslationExportUnifiedCallback: (() => void) | null = null;
  private onTranslationExportSeparatedCallback: (() => void) | null = null;
  private onClearLocalModelCacheCallback: (() => void) | null = null;

  /**
   * Create the bottom drawer element
   */
  create(): HTMLElement {
    if (this.element) {
      return this.element;
    }

    const container = createDiv('review-bottom-drawer');
    setAttributes(container, {
      role: 'complementary',
      'aria-label': 'Review tools and comments',
    });

    // Header (collapsed bar)
    const header = this.createHeader();
    container.appendChild(header);

    // Expandable body
    const body = createDiv('review-drawer-body');
    body.style.display = 'none'; // Initially collapsed

    const bodyInner = createDiv('review-drawer-body-inner');

    // Create three-column layout for expanded state
    const leftColumn = createDiv(
      'review-drawer-column review-drawer-column-left'
    );
    const centerColumn = createDiv(
      'review-drawer-column review-drawer-column-center'
    );
    const rightColumn = createDiv(
      'review-drawer-column review-drawer-column-right'
    );

    // Left column: Review Tools and Export
    this.reviewToolsSection = this.createReviewToolsSection();
    leftColumn.appendChild(this.reviewToolsSection);

    this.exportSection = this.createExportSection();
    leftColumn.appendChild(this.exportSection);

    this.translationSection = this.createTranslationToggleSection();
    leftColumn.appendChild(this.translationSection);

    // Center column: Comments
    this.commentsSection = this.createCommentsSection();
    centerColumn.appendChild(this.commentsSection);

    // Right column: Translation Tools (when in translation mode) and Debug/Storage
    this.translationToolsSection = this.createTranslationToolsSection();
    this.translationToolsSection.style.display = 'none';
    rightColumn.appendChild(this.translationToolsSection);

    this.debugSection = this.createDebugSection();
    rightColumn.appendChild(this.debugSection);

    // Build info at bottom of right column
    const buildInfo = this.createBuildInfo();
    rightColumn.appendChild(buildInfo);

    bodyInner.appendChild(leftColumn);
    bodyInner.appendChild(centerColumn);
    bodyInner.appendChild(rightColumn);

    body.appendChild(bodyInner);
    container.appendChild(body);

    this.element = container;
    document.body.appendChild(container);

    // Check debug mode from localStorage or URL
    this.debugMode = this.checkDebugMode();
    this.updateDebugVisibility();

    logger.debug('Bottom drawer created');
    return container;
  }

  getElement(): HTMLElement | null {
    return this.element;
  }

  /**
   * Set the user module for displaying user status
   */
  setUserModule(userModule: UserModule): void {
    this.userModule = userModule;
  }

  /**
   * Update user display in the build info section
   */
  updateUserDisplay(): void {
    if (!this.element) return;

    const buildInfoSection = this.element.querySelector('.review-build-info');
    if (!buildInfoSection) return;

    const oldUserSection = buildInfoSection.querySelector('[data-user-info]');
    if (oldUserSection) {
      oldUserSection.remove();
    }

    const currentUser = this.userModule?.getCurrentUser?.();
    if (!currentUser) return;

    const userSection = createDiv();
    setAttributes(userSection, {
      'data-user-info': 'true',
    });
    userSection.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: rgba(79, 70, 229, 0.05);
      border-radius: 6px;
      margin-bottom: 8px;
    `;

    const userIcon = createIcon('👤');
    userIcon.style.fontSize = '14px';
    userSection.appendChild(userIcon);

    const userNameSpan = document.createElement('span');
    const displayName =
      currentUser.name?.trim() ||
      currentUser.email?.trim() ||
      currentUser.id?.trim() ||
      'User';
    userNameSpan.textContent = displayName;
    userNameSpan.style.userSelect = 'text';
    userNameSpan.style.fontSize = '12px';
    userNameSpan.style.fontWeight = '500';
    userSection.appendChild(userNameSpan);

    const tooltipText = `Logged in as:
Name: ${currentUser.name || '(not set)'}
Email: ${currentUser.email || '(not set)'}
ID: ${currentUser.id}
Role: ${currentUser.role}`;
    userSection.title = tooltipText;

    buildInfoSection.insertBefore(userSection, buildInfoSection.firstChild);

    logger.debug('User display updated', {
      userId: currentUser.id,
      displayName,
    });
  }

  /**
   * Check if debug mode should be enabled
   */
  private checkDebugMode(): boolean {
    // Check localStorage
    const stored = localStorage.getItem('quarto-review-debug-mode');
    if (stored === 'true') return true;

    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug-ui') === 'true') return true;

    return false;
  }

  /**
   * Toggle debug mode
   */
  toggleDebugMode(): void {
    this.debugMode = !this.debugMode;
    localStorage.setItem('quarto-review-debug-mode', String(this.debugMode));
    this.updateDebugVisibility();
    logger.debug('Debug mode toggled', { debugMode: this.debugMode });
  }

  /**
   * Update visibility of debug tools
   */
  private updateDebugVisibility(): void {
    if (this.debugSection) {
      this.debugSection.style.display = this.debugMode ? '' : 'none';
    }
  }

  /**
   * Create header with title and toggle button
   */
  private createHeader(): HTMLElement {
    const header = createDiv('review-drawer-header');

    this.drawerTitle = document.createElement('h3');
    this.drawerTitle.textContent = 'Review Tools';
    this.drawerTitle.style.cssText = `
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--review-color-text);
    `;
    header.appendChild(this.drawerTitle);

    const headerActions = createDiv('review-drawer-header-actions');

    // Debug mode toggle (small icon button)
    const debugToggleBtn = createButton(
      '',
      'review-btn review-btn-icon review-btn-sm'
    );
    setAttributes(debugToggleBtn, {
      'data-action': 'toggle-debug',
      title: 'Toggle developer tools (debug mode)',
      'aria-label': 'Toggle developer tools',
    });
    const debugIcon = createIcon('⚙️');
    debugIcon.style.fontSize = '12px';
    debugToggleBtn.appendChild(debugIcon);
    debugToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDebugMode();
    });
    headerActions.appendChild(debugToggleBtn);

    this.toggleBtn = createButton('', 'review-btn review-btn-icon');
    setAttributes(this.toggleBtn, {
      'data-action': 'toggle-drawer',
      title: 'Expand review tools (Alt+R)',
      'aria-label': 'Toggle drawer visibility',
      'aria-expanded': 'false',
    });

    const chevron = createIcon('∧', 'review-icon-chevron');
    this.toggleBtn.appendChild(chevron);

    this.toggleBtn.addEventListener('click', () => {
      this.onToggleDrawerCallback?.();
    });
    headerActions.appendChild(this.toggleBtn);

    header.appendChild(headerActions);

    // Make header clickable to toggle
    header.style.cursor = 'pointer';
    header.addEventListener('click', (e) => {
      // Only toggle if clicking on the header itself, not buttons
      if (e.target === header || e.target === this.drawerTitle) {
        this.onToggleDrawerCallback?.();
      }
    });

    return header;
  }

  /**
   * Create Review Tools section
   */
  private createReviewToolsSection(): HTMLElement {
    const section = createDiv('review-drawer-section');
    section.setAttribute('data-section', 'review-tools');

    const title = document.createElement('h4');
    title.textContent = 'Actions';
    title.className = 'review-drawer-section-title';
    section.appendChild(title);

    const buttonGroup = createDiv('review-drawer-button-group');

    this.undoBtn = createButton('↶ Undo', 'review-btn review-btn-secondary');
    setAttributes(this.undoBtn, {
      'data-action': 'undo',
      title: 'Undo last change (Ctrl+Z)',
      'aria-label': 'Undo (Ctrl+Z)',
    });
    this.undoBtn.disabled = true;
    this.undoBtn.addEventListener('click', () => {
      this.onUndoCallback?.();
    });
    buttonGroup.appendChild(this.undoBtn);

    this.redoBtn = createButton('↷ Redo', 'review-btn review-btn-secondary');
    setAttributes(this.redoBtn, {
      'data-action': 'redo',
      title: 'Redo last undone change (Ctrl+Y)',
      'aria-label': 'Redo (Ctrl+Y)',
    });
    this.redoBtn.disabled = true;
    this.redoBtn.addEventListener('click', () => {
      this.onRedoCallback?.();
    });
    buttonGroup.appendChild(this.redoBtn);

    section.appendChild(buttonGroup);

    // Tracked changes toggle
    const trackedLabel = document.createElement('label');
    trackedLabel.className = 'review-checkbox-label';
    trackedLabel.style.marginTop = '12px';
    trackedLabel.style.display = 'flex';

    this.trackedChangesToggle = document.createElement('input');
    this.trackedChangesToggle.type = 'checkbox';
    setAttributes(this.trackedChangesToggle, {
      'data-action': 'toggle-tracked-changes',
      'aria-label': 'Show tracked changes',
      title: 'Toggle visibility of tracked changes',
    });
    this.trackedChangesToggle.className = 'review-checkbox';
    this.trackedChangesToggle.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      this.onTrackedChangesCallback?.(target.checked);
    });
    trackedLabel.appendChild(this.trackedChangesToggle);

    const trackedText = document.createElement('span');
    trackedText.className = 'review-checkbox-label-text';
    trackedText.textContent = 'Show tracked changes';
    trackedLabel.appendChild(trackedText);

    section.appendChild(trackedLabel);

    return section;
  }

  /**
   * Create Export section
   */
  private createExportSection(): HTMLElement {
    const section = createDiv('review-drawer-section');
    section.setAttribute('data-section', 'export');

    const title = document.createElement('h4');
    title.textContent = 'Export';
    title.className = 'review-drawer-section-title';
    section.appendChild(title);

    const buttonGroup = createDiv('review-drawer-button-group');

    this.exportCleanBtn = createButton(
      '📄 Clean QMD',
      'review-btn review-btn-primary'
    );
    setAttributes(this.exportCleanBtn, {
      'data-action': 'export-qmd-clean',
      title: 'Export clean QMD file with all accepted changes applied',
      'aria-label': 'Export QMD with accepted changes',
    });
    this.exportCleanBtn.disabled = true;
    this.exportCleanBtn.addEventListener('click', () => {
      this.onExportCleanCallback?.();
    });
    buttonGroup.appendChild(this.exportCleanBtn);

    this.exportCriticBtn = createButton(
      '📝 CriticMarkup',
      'review-btn review-btn-secondary'
    );
    setAttributes(this.exportCriticBtn, {
      'data-action': 'export-qmd-critic',
      title: 'Export QMD file with CriticMarkup annotations for review',
      'aria-label': 'Export QMD with CriticMarkup',
    });
    this.exportCriticBtn.disabled = true;
    this.exportCriticBtn.addEventListener('click', () => {
      this.onExportCriticCallback?.();
    });
    buttonGroup.appendChild(this.exportCriticBtn);

    section.appendChild(buttonGroup);

    this.submitReviewBtn = createButton(
      this.submitReviewLabel,
      'review-btn review-btn-primary review-btn-block'
    );
    setAttributes(this.submitReviewBtn, {
      'data-action': 'submit-review',
      title: 'Submit your review changes to Git (push to repository)',
      'aria-label': 'Submit review to Git',
    });
    this.submitReviewBtn.disabled = true;
    this.submitReviewBtn.style.marginTop = '8px';
    this.submitReviewBtn.addEventListener('click', () => {
      this.onSubmitReviewCallback?.();
    });
    section.appendChild(this.submitReviewBtn);

    this.updateSubmitReviewButtonState();

    return section;
  }

  /**
   * Create Comments section
   */
  private createCommentsSection(): HTMLElement {
    const section = createDiv('review-drawer-section review-comments-section');
    section.setAttribute('data-section', 'comments');

    const header = createDiv('review-drawer-section-header');

    const title = document.createElement('h4');
    title.textContent = 'Comments';
    title.className = 'review-drawer-section-title';
    header.appendChild(title);

    section.appendChild(header);

    this.commentsContent = createDiv('review-comments-content');
    this.commentsContent.style.cssText = 'max-height: 250px; overflow-y: auto;';
    section.appendChild(this.commentsContent);

    return section;
  }

  /**
   * Create Translation Toggle section
   */
  private createTranslationToggleSection(): HTMLElement {
    const section = createDiv('review-drawer-section');
    section.setAttribute('data-section', 'translation-toggle');

    const title = document.createElement('h4');
    title.textContent = 'Translation';
    title.className = 'review-drawer-section-title';
    section.appendChild(title);

    this.translationBtn = createButton(
      '🌐 Translation',
      'review-btn review-btn-secondary review-btn-block'
    );
    setAttributes(this.translationBtn, {
      'data-action': 'toggle-translation',
      title: 'Open translation interface for multilingual document editing',
      'aria-label': 'Toggle translation mode',
    });
    this.translationBtn.disabled = true;
    this.translationBtn.addEventListener('click', () => {
      this.onToggleTranslationCallback?.();
    });
    section.appendChild(this.translationBtn);

    return section;
  }

  /**
   * Create Debug section (only visible when debug mode is enabled)
   */
  private createDebugSection(): HTMLElement {
    const section = createDiv('review-drawer-section review-debug-section');
    section.setAttribute('data-section', 'debug');

    const title = document.createElement('h4');
    title.textContent = 'Developer Tools';
    title.className = 'review-drawer-section-title';
    section.appendChild(title);

    const description = document.createElement('p');
    description.style.cssText = `
      font-size: 11px;
      color: var(--review-color-muted);
      margin: 0 0 8px 0;
      line-height: 1.4;
    `;
    description.textContent = 'Advanced tools for debugging and development';
    section.appendChild(description);

    const buttonGroup = createDiv('review-drawer-button-group');

    const clearBtn = createButton(
      '🗑 Clear Drafts',
      'review-btn review-btn-danger review-btn-sm'
    );
    setAttributes(clearBtn, {
      'data-action': 'clear-local-drafts',
      title: 'Clear all local draft data from browser storage',
      'aria-label': 'Clear local drafts',
    });
    clearBtn.addEventListener('click', () => {
      this.onClearDraftsCallback?.();
    });
    buttonGroup.appendChild(clearBtn);

    section.appendChild(buttonGroup);

    return section;
  }

  /**
   * Create Translation Tools section
   */
  private createTranslationToolsSection(): HTMLElement {
    const section = createDiv('review-drawer-section');
    section.setAttribute('data-section', 'translation-tools');

    const title = document.createElement('h4');
    title.textContent = 'Translation Tools';
    title.className = 'review-drawer-section-title';
    section.appendChild(title);

    // Translate buttons
    const buttonGroup = createDiv('review-drawer-button-group');

    this.translateDocumentBtn = createButton(
      'Translate Document',
      'review-btn review-btn-primary'
    );
    setAttributes(this.translateDocumentBtn, {
      'data-action': 'translate-document',
      title: 'Translate the entire document (Ctrl+T)',
      'aria-label': 'Translate entire document',
    });
    this.translateDocumentBtn.disabled = true;
    this.translateDocumentBtn.addEventListener('click', () => {
      this.onTranslateDocumentCallback?.();
    });
    buttonGroup.appendChild(this.translateDocumentBtn);

    this.translateSentenceBtn = createButton(
      'Translate Selected',
      'review-btn review-btn-secondary'
    );
    setAttributes(this.translateSentenceBtn, {
      'data-action': 'translate-sentence',
      title: 'Translate the selected text (Ctrl+Shift+T)',
      'aria-label': 'Translate selection',
    });
    this.translateSentenceBtn.disabled = true;
    this.translateSentenceBtn.addEventListener('click', () => {
      this.onTranslateSentenceCallback?.();
    });
    buttonGroup.appendChild(this.translateSentenceBtn);

    section.appendChild(buttonGroup);

    this.translateDocumentDefaultLabel =
      this.translateDocumentBtn.textContent ??
      this.translateDocumentDefaultLabel;
    this.translateSentenceDefaultLabel =
      this.translateSentenceBtn.textContent ??
      this.translateSentenceDefaultLabel;

    // Progress container
    const progressContainer = createDiv(
      'review-translation-progress-container'
    );
    progressContainer.style.display = 'none';
    progressContainer.style.marginTop = '12px';
    progressContainer.setAttribute('aria-live', 'polite');
    progressContainer.innerHTML = `
      <div class="review-translation-progress-track">
        <div class="review-translation-progress-bar"></div>
      </div>
      <div class="review-translation-progress-text"></div>
    `;

    this.translationProgressContainer = progressContainer;
    this.translationProgressBar = progressContainer.querySelector(
      '.review-translation-progress-bar'
    ) as HTMLElement | null;
    this.translationProgressText = progressContainer.querySelector(
      '.review-translation-progress-text'
    ) as HTMLElement | null;
    section.appendChild(progressContainer);

    // Language/Provider selectors
    const controlsDiv = createDiv();
    controlsDiv.style.marginTop = '12px';

    const providerLabel = document.createElement('label');
    providerLabel.className = 'review-label';
    providerLabel.htmlFor = 'translation-provider-select';
    providerLabel.textContent = 'Provider:';
    providerLabel.style.display = 'block';
    providerLabel.style.marginBottom = '4px';
    providerLabel.style.fontSize = '12px';
    controlsDiv.appendChild(providerLabel);

    this.providerSelector = document.createElement('select');
    this.providerSelector.id = 'translation-provider-select';
    this.providerSelector.className = 'review-select';
    this.providerSelector.style.width = '100%';
    this.providerSelector.setAttribute(
      'title',
      'Select translation provider/service'
    );
    this.providerSelector.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.onProviderChangeCallback?.(target.value);
    });
    controlsDiv.appendChild(this.providerSelector);
    section.appendChild(controlsDiv);

    // Language selectors in a compact layout
    const languagesDiv = createDiv();
    languagesDiv.style.marginTop = '12px';

    const sourceLabel = document.createElement('label');
    sourceLabel.className = 'review-label';
    sourceLabel.htmlFor = 'translation-source-lang-select';
    sourceLabel.textContent = 'Source:';
    sourceLabel.style.display = 'block';
    sourceLabel.style.marginBottom = '4px';
    sourceLabel.style.fontSize = '12px';
    languagesDiv.appendChild(sourceLabel);

    this.sourceLanguageSelector = document.createElement('select');
    this.sourceLanguageSelector.id = 'translation-source-lang-select';
    this.sourceLanguageSelector.className = 'review-select';
    this.sourceLanguageSelector.style.width = '100%';
    this.sourceLanguageSelector.style.marginBottom = '8px';
    this.sourceLanguageSelector.setAttribute(
      'title',
      'Source language of the document'
    );
    this.sourceLanguageSelector.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.onSourceLanguageChangeCallback?.(target.value);
    });
    languagesDiv.appendChild(this.sourceLanguageSelector);

    const targetLabel = document.createElement('label');
    targetLabel.className = 'review-label';
    targetLabel.htmlFor = 'translation-target-lang-select';
    targetLabel.textContent = 'Target:';
    targetLabel.style.display = 'block';
    targetLabel.style.marginBottom = '4px';
    targetLabel.style.fontSize = '12px';
    languagesDiv.appendChild(targetLabel);

    this.targetLanguageSelector = document.createElement('select');
    this.targetLanguageSelector.id = 'translation-target-lang-select';
    this.targetLanguageSelector.className = 'review-select';
    this.targetLanguageSelector.style.width = '100%';
    this.targetLanguageSelector.setAttribute(
      'title',
      'Target language for translation'
    );
    this.targetLanguageSelector.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.onTargetLanguageChangeCallback?.(target.value);
    });
    languagesDiv.appendChild(this.targetLanguageSelector);

    this.swapLanguagesBtn = createButton(
      '⇄ Swap',
      'review-btn review-btn-secondary review-btn-sm review-btn-block'
    );
    setAttributes(this.swapLanguagesBtn, {
      'data-action': 'swap-languages',
      title: 'Swap source and target languages (Ctrl+Alt+S)',
      'aria-label': 'Swap languages',
    });
    this.swapLanguagesBtn.style.marginTop = '6px';
    this.swapLanguagesBtn.addEventListener('click', () => {
      this.onSwapLanguagesCallback?.();
    });
    languagesDiv.appendChild(this.swapLanguagesBtn);

    section.appendChild(languagesDiv);

    // Auto-translate toggle
    const settingsDiv = createDiv();
    settingsDiv.style.marginTop = '12px';

    const autoTranslateLabel = document.createElement('label');
    autoTranslateLabel.className = 'review-checkbox-label';

    this.autoTranslateToggle = document.createElement('input');
    this.autoTranslateToggle.type = 'checkbox';
    setAttributes(this.autoTranslateToggle, {
      'data-action': 'toggle-auto-translate',
      'aria-label': 'Auto-translate on edit',
      title: 'Automatically translate changes as you edit',
    });
    this.autoTranslateToggle.className = 'review-checkbox';
    this.autoTranslateToggle.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      this.onAutoTranslateChangeCallback?.(target.checked);
    });
    autoTranslateLabel.appendChild(this.autoTranslateToggle);

    const autoTranslateText = document.createElement('span');
    autoTranslateText.className = 'review-checkbox-label-text';
    autoTranslateText.textContent = 'Auto-translate on edit';
    autoTranslateLabel.appendChild(autoTranslateText);

    settingsDiv.appendChild(autoTranslateLabel);
    section.appendChild(settingsDiv);

    // Export and exit buttons
    const actionsDiv = createDiv();
    actionsDiv.style.marginTop = '12px';

    const exportGroup = createDiv('review-drawer-button-group');

    this.translationExportUnifiedBtn = createButton(
      'Export Unified',
      'review-btn review-btn-primary review-btn-sm'
    );
    setAttributes(this.translationExportUnifiedBtn, {
      'data-action': 'export-translation-unified',
      title: 'Export unified translation (both languages combined)',
      'aria-label': 'Export unified translation',
    });
    this.translationExportUnifiedBtn.disabled = true;
    this.translationExportUnifiedBtn.addEventListener('click', () => {
      this.onTranslationExportUnifiedCallback?.();
    });
    exportGroup.appendChild(this.translationExportUnifiedBtn);

    this.translationExportSeparatedBtn = createButton(
      'Export Separated',
      'review-btn review-btn-secondary review-btn-sm'
    );
    setAttributes(this.translationExportSeparatedBtn, {
      'data-action': 'export-translation-separated',
      title: 'Export translation as separate files',
      'aria-label': 'Export separated translation',
    });
    this.translationExportSeparatedBtn.disabled = true;
    this.translationExportSeparatedBtn.addEventListener('click', () => {
      this.onTranslationExportSeparatedCallback?.();
    });
    exportGroup.appendChild(this.translationExportSeparatedBtn);

    actionsDiv.appendChild(exportGroup);

    this.clearModelCacheBtn = createButton(
      'Clear Model Cache',
      'review-btn review-btn-secondary review-btn-block review-btn-sm'
    );
    setAttributes(this.clearModelCacheBtn, {
      'data-action': 'clear-local-model-cache',
      title: 'Clear cached local translation models to free up space',
      'aria-label': 'Clear model cache',
    });
    this.clearModelCacheBtn.disabled = true;
    this.clearModelCacheBtn.style.marginTop = '8px';
    this.clearModelCacheBtn.addEventListener('click', () => {
      this.onClearLocalModelCacheCallback?.();
    });
    actionsDiv.appendChild(this.clearModelCacheBtn);

    this.exitTranslationBtn = createButton(
      'Exit Translation',
      'review-btn review-btn-danger review-btn-block'
    );
    setAttributes(this.exitTranslationBtn, {
      'data-action': 'exit-translation',
      title: 'Exit translation mode and return to review mode',
      'aria-label': 'Exit translation mode',
    });
    this.exitTranslationBtn.style.marginTop = '8px';
    this.exitTranslationBtn.addEventListener('click', () => {
      this.onToggleTranslationCallback?.();
    });
    actionsDiv.appendChild(this.exitTranslationBtn);

    section.appendChild(actionsDiv);

    return section;
  }

  /**
   * Create build info section
   */
  private createBuildInfo(): HTMLElement {
    const buildInfoSection = createDiv(
      'review-drawer-section review-build-info'
    );
    buildInfoSection.style.cssText = `
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid var(--review-color-border);
      font-size: 11px;
      color: var(--review-color-muted);
      cursor: help;
    `;

    const currentUser = this.userModule?.getCurrentUser?.();
    if (currentUser) {
      const userSection = createDiv();
      setAttributes(userSection, {
        'data-user-info': 'true',
      });
      userSection.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        background: rgba(79, 70, 229, 0.05);
        border-radius: 6px;
        margin-bottom: 8px;
      `;

      const userIcon = createIcon('👤');
      userIcon.style.fontSize = '14px';
      userSection.appendChild(userIcon);

      const userNameSpan = document.createElement('span');
      const displayName =
        currentUser.name?.trim() ||
        currentUser.email?.trim() ||
        currentUser.id?.trim() ||
        'User';
      userNameSpan.textContent = displayName;
      userNameSpan.style.userSelect = 'text';
      userNameSpan.style.fontSize = '12px';
      userNameSpan.style.fontWeight = '500';
      userSection.appendChild(userNameSpan);

      const tooltipText = `Logged in as:
Name: ${currentUser.name || '(not set)'}
Email: ${currentUser.email || '(not set)'}
ID: ${currentUser.id}
Role: ${currentUser.role}`;
      userSection.title = tooltipText;

      buildInfoSection.appendChild(userSection);
    }

    const buildDiv = createDiv();
    buildDiv.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
    `;

    const infoIcon = createIcon('ℹ️');
    infoIcon.style.fontSize = '12px';

    const buildText = document.createElement('span');
    buildText.textContent = `v${getBuildString()}`;
    buildText.style.userSelect = 'text';

    buildDiv.appendChild(infoIcon);
    buildDiv.appendChild(buildText);
    buildDiv.title = getFullBuildInfo();

    buildInfoSection.appendChild(buildDiv);

    return buildInfoSection;
  }

  /**
   * Set translation mode
   */
  setTranslationMode(active: boolean): void {
    this.translationMode = active;

    if (this.drawerTitle) {
      this.drawerTitle.textContent = active
        ? 'Translation Tools'
        : 'Review Tools';
    }

    // Show/hide review sections
    if (this.reviewToolsSection) {
      this.reviewToolsSection.style.display = active ? 'none' : '';
    }
    if (this.exportSection) {
      this.exportSection.style.display = active ? 'none' : '';
    }
    if (this.commentsSection) {
      this.commentsSection.style.display = active ? 'none' : '';
    }
    if (this.translationSection) {
      this.translationSection.style.display = active ? 'none' : '';
    }

    // Show/hide translation tools
    if (this.translationToolsSection) {
      this.translationToolsSection.style.display = active ? '' : 'none';
    }

    // Update undo/redo button handlers for translation mode
    if (active && this.undoBtn && this.redoBtn) {
      // In translation mode, use translation-specific undo/redo
      this.undoBtn.textContent = '↶ Undo Edit';
      this.redoBtn.textContent = '↷ Redo Edit';
      this.undoBtn.onclick = () => {
        this.onTranslationUndoCallback?.();
      };
      this.redoBtn.onclick = () => {
        this.onTranslationRedoCallback?.();
      };
    } else if (!active && this.undoBtn && this.redoBtn) {
      // Back to review mode
      this.undoBtn.textContent = '↶ Undo';
      this.redoBtn.textContent = '↷ Redo';
      this.undoBtn.onclick = () => {
        this.onUndoCallback?.();
      };
      this.redoBtn.onclick = () => {
        this.onRedoCallback?.();
      };
    }

    if (!active) {
      this.setTranslationProgress({ phase: 'idle', message: '' });
    }

    logger.debug('Translation mode set', { active });
  }

  /**
   * Update comments list
   */
  updateComments(
    sections: SectionCommentSnapshot[],
    callbacks: CommentsSidebarCallbacks
  ): void {
    this.commentSections = sections;
    this.commentsCallbacks = callbacks;
    this.refreshComments();
  }

  /**
   * Refresh comments display
   */
  private refreshComments(): void {
    if (!this.commentsContent) return;

    this.commentsContent.innerHTML = '';

    if (this.commentSections.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'review-comments-empty';
      emptyMsg.textContent = 'No comments yet. Click on text to add comments.';
      emptyMsg.style.cssText = `
        text-align: center;
        padding: 24px 12px;
        color: var(--review-color-muted);
        background: rgba(248, 250, 252, 0.5);
        border: 1px dashed rgba(148, 163, 184, 0.3);
        border-radius: 8px;
        font-size: 12px;
      `;
      this.commentsContent.appendChild(emptyMsg);
      return;
    }

    this.commentSections.forEach((snapshot) => {
      const section = document.createElement('div');
      section.className = 'review-comments-section-group';
      section.dataset.sectionId = snapshot.element.id;

      const list = document.createElement('div');
      list.className = 'review-comments-list';

      snapshot.comments.forEach((comment) => {
        const item = this.renderComment(snapshot, comment);
        list.appendChild(item);
      });

      section.appendChild(list);
      this.commentsContent?.appendChild(section);
    });

    logger.debug('Comments refreshed', { count: this.commentSections.length });
  }

  /**
   * Render a single comment item
   */
  private renderComment(
    snapshot: SectionCommentSnapshot,
    comment: Comment
  ): HTMLElement {
    const item = createDiv('review-comment-item');
    item.dataset.elementId = snapshot.element.id;
    item.dataset.commentKey = comment.id;

    item.addEventListener('click', () => {
      this.commentsCallbacks?.onNavigate(snapshot.element.id, comment.id);
    });

    item.addEventListener('mouseenter', () => {
      this.commentsCallbacks?.onHover(snapshot.element.id, comment.id);
    });

    item.addEventListener('mouseleave', () => {
      this.commentsCallbacks?.onLeave();
    });

    const header = createDiv('review-comment-header');

    const author = createDiv('review-comment-author');
    author.textContent = comment.userId || 'Anonymous';
    header.appendChild(author);

    const date = createDiv('review-comment-date');
    date.textContent = new Date(comment.timestamp).toLocaleDateString();
    header.appendChild(date);

    item.appendChild(header);

    const text = createDiv('review-comment-text');
    text.textContent = comment.content;
    item.appendChild(text);

    const actions = createDiv('review-comment-actions');

    const editBtn = createButton('✏️ Edit', 'review-btn review-btn-sm');
    editBtn.setAttribute('title', 'Edit this comment');
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.commentsCallbacks?.onEdit(snapshot.element.id, comment);
    });
    actions.appendChild(editBtn);

    const removeBtn = createButton(
      '🗑 Remove',
      'review-btn review-btn-sm review-btn-danger'
    );
    removeBtn.setAttribute('title', 'Delete this comment');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.commentsCallbacks?.onRemove(snapshot.element.id, comment);
    });
    actions.appendChild(removeBtn);

    item.appendChild(actions);

    return item;
  }

  // ============================================
  // PUBLIC API - Callbacks and State Updates
  // ============================================

  setExpanded(expanded: boolean): void {
    if (!this.element) return;

    const body = this.element.querySelector(
      '.review-drawer-body'
    ) as HTMLElement;
    if (body) {
      body.style.display = expanded ? '' : 'none';
    }

    toggleClass(this.element, 'review-drawer-expanded', expanded);

    if (this.toggleBtn) {
      const chevron = this.toggleBtn.querySelector('.review-icon-chevron');
      if (chevron) {
        (chevron as HTMLElement).textContent = expanded ? '∨' : '∧';
      }

      setAttributes(this.toggleBtn, {
        title: expanded
          ? 'Collapse review tools (Alt+R)'
          : 'Expand review tools (Alt+R)',
        'aria-expanded': expanded ? 'true' : 'false',
      });
    }

    logger.debug('Drawer expanded state changed', { expanded });
  }

  // Backward compatibility method (maps to setExpanded)
  setCollapsed(collapsed: boolean): void {
    this.setExpanded(!collapsed);
  }

  updateUndoRedoState(canUndo: boolean, canRedo: boolean): void {
    if (this.undoBtn) {
      this.undoBtn.disabled = !canUndo;
      toggleClass(this.undoBtn, 'review-btn-disabled', !canUndo);
    }
    if (this.redoBtn) {
      this.redoBtn.disabled = !canRedo;
      toggleClass(this.redoBtn, 'review-btn-disabled', !canRedo);
    }
  }

  updateTranslationUndoRedoState(canUndo: boolean, canRedo: boolean): void {
    if (!this.translationMode) return;
    this.updateUndoRedoState(canUndo, canRedo);
  }

  setTrackedChangesVisible(visible: boolean): void {
    if (this.trackedChangesToggle) {
      this.trackedChangesToggle.checked = visible;
      const label = this.trackedChangesToggle.closest(
        '.review-checkbox-label'
      ) as HTMLElement | null;
      if (label) {
        toggleClass(label, 'review-checkbox-active', visible);
      }
    }
  }

  getTrackedChangesEnabled(): boolean {
    return this.trackedChangesToggle?.checked ?? false;
  }

  setTranslationBusy(busy: boolean): void {
    if (this.translateDocumentBtn) {
      this.translateDocumentBtn.textContent = busy
        ? 'Translating…'
        : this.translateDocumentDefaultLabel;
    }

    if (this.translateSentenceBtn) {
      this.translateSentenceBtn.textContent = busy
        ? 'Translating…'
        : this.translateSentenceDefaultLabel;
    }
  }

  setTranslationProgress(status: TranslationDrawerProgress): void {
    if (
      !this.translationProgressContainer ||
      !this.translationProgressBar ||
      !this.translationProgressText
    ) {
      return;
    }

    if (status.phase === 'idle') {
      this.translationProgressContainer.style.display = 'none';
      this.translationProgressContainer.removeAttribute('data-phase');
      this.translationProgressBar.style.width = '0%';
      this.translationProgressText.textContent = '';
      return;
    }

    const percent =
      typeof status.percent === 'number'
        ? Math.max(0, Math.min(100, status.percent))
        : null;

    this.translationProgressContainer.style.display = '';
    this.translationProgressContainer.setAttribute('data-phase', status.phase);

    if (percent !== null) {
      this.translationProgressBar.style.width = `${percent}%`;
    } else if (status.phase === 'success') {
      this.translationProgressBar.style.width = '100%';
    } else {
      this.translationProgressBar.style.width = '15%';
    }

    this.translationProgressText.textContent =
      status.message || (status.phase === 'running' ? 'Translating…' : '');
  }

  updateTranslationProviders(providers: string[]): void {
    if (!this.providerSelector) return;
    this.providerSelector.innerHTML = '';
    providers.forEach((provider) => {
      const option = document.createElement('option');
      option.value = provider;
      option.textContent = provider;
      this.providerSelector!.appendChild(option);
    });
  }

  updateTranslationLanguages(
    sourceLanguages: string[],
    targetLanguages: string[]
  ): void {
    if (this.sourceLanguageSelector) {
      this.sourceLanguageSelector.innerHTML = '';
      sourceLanguages.forEach((lang) => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang.toUpperCase();
        this.sourceLanguageSelector!.appendChild(option);
      });
    }

    if (this.targetLanguageSelector) {
      this.targetLanguageSelector.innerHTML = '';
      targetLanguages.forEach((lang) => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang.toUpperCase();
        this.targetLanguageSelector!.appendChild(option);
      });
    }
  }

  setAutoTranslateEnabled(enabled: boolean): void {
    if (this.autoTranslateToggle) {
      this.autoTranslateToggle.checked = enabled;
      const label = this.autoTranslateToggle.closest(
        '.review-checkbox-label'
      ) as HTMLElement | null;
      if (label) {
        toggleClass(label, 'review-checkbox-active', enabled);
      }
    }
  }

  setTranslationEnabled(enabled: boolean): void {
    this.translationEnabled = enabled;
    if (this.translationBtn) {
      this.translationBtn.disabled = !enabled;
      toggleClass(this.translationBtn, 'review-btn-disabled', !enabled);
    }
  }

  setTranslationActive(active: boolean): void {
    if (!this.translationBtn) return;

    if (active) {
      this.translationBtn.textContent = '🌐 Close Translation';
      this.translationBtn.setAttribute(
        'title',
        'Close translation mode and return to review'
      );
      toggleClass(this.translationBtn, 'review-btn-active', true);
    } else {
      this.translationBtn.textContent = '🌐 Translation';
      this.translationBtn.setAttribute(
        'title',
        'Open translation interface for multilingual document editing'
      );
      toggleClass(this.translationBtn, 'review-btn-active', false);
    }
  }

  setSubmitReviewEnabled(enabled: boolean): void {
    this.submitReviewEnabled = enabled;
    this.updateSubmitReviewButtonState();
  }

  setSubmitReviewPending(pending: boolean): void {
    if (!this.submitReviewBtn) return;
    this.submitReviewPending = pending;
    if (pending) {
      this.submitReviewBtn.dataset.loading = 'true';
      this.submitReviewBtn.textContent = 'Submitting…';
    } else {
      delete this.submitReviewBtn.dataset.loading;
      this.submitReviewBtn.textContent = this.submitReviewLabel;
    }
    this.updateSubmitReviewButtonState();
  }

  setHasUnsavedChanges(hasUnsaved: boolean): void {
    if (!this.element) {
      return;
    }
    if (hasUnsaved) {
      if (!this.unsavedIndicator) {
        const indicator = document.createElement('div');
        indicator.className = 'review-unsaved-indicator';
        indicator.setAttribute('title', 'You have unsaved changes');
        indicator.style.cssText = `
          position: absolute;
          top: 8px;
          right: 80px;
          width: 8px;
          height: 8px;
          background: var(--review-color-warning);
          border-radius: 50%;
          box-shadow: 0 0 4px rgba(245, 158, 11, 0.5);
        `;
        this.element.appendChild(indicator);
        this.unsavedIndicator = indicator;
      }
    } else {
      this.unsavedIndicator?.remove();
      this.unsavedIndicator = null;
    }
  }

  private updateSubmitReviewButtonState(): void {
    if (!this.submitReviewBtn) return;
    const hasHandler = typeof this.onSubmitReviewCallback === 'function';
    const canClick =
      hasHandler && this.submitReviewEnabled && !this.submitReviewPending;
    this.submitReviewBtn.disabled = !canClick;
    toggleClass(this.submitReviewBtn, 'review-btn-disabled', !canClick);
  }

  private updateExportButtonStates(): void {
    const cleanEnabled = typeof this.onExportCleanCallback === 'function';
    if (this.exportCleanBtn) {
      this.exportCleanBtn.disabled = !cleanEnabled;
      toggleClass(this.exportCleanBtn, 'review-btn-disabled', !cleanEnabled);
    }

    const criticEnabled = typeof this.onExportCriticCallback === 'function';
    if (this.exportCriticBtn) {
      this.exportCriticBtn.disabled = !criticEnabled;
      toggleClass(this.exportCriticBtn, 'review-btn-disabled', !criticEnabled);
    }
  }

  enableExportButtons(): void {
    if (
      this.exportCleanBtn &&
      typeof this.onExportCleanCallback === 'function'
    ) {
      this.exportCleanBtn.disabled = false;
      toggleClass(this.exportCleanBtn, 'review-btn-disabled', false);
    }
    if (
      this.exportCriticBtn &&
      typeof this.onExportCriticCallback === 'function'
    ) {
      this.exportCriticBtn.disabled = false;
      toggleClass(this.exportCriticBtn, 'review-btn-disabled', false);
    }
  }

  // ============================================
  // CALLBACK REGISTRATION
  // ============================================

  onUndo(callback: () => void): void {
    this.onUndoCallback = callback;
  }

  onRedo(callback: () => void): void {
    this.onRedoCallback = callback;
  }

  onTranslationUndo(callback?: () => void): void {
    this.onTranslationUndoCallback = callback ?? null;
  }

  onTranslationRedo(callback?: () => void): void {
    this.onTranslationRedoCallback = callback ?? null;
  }

  onTrackedChangesToggle(callback: (enabled: boolean) => void): void {
    this.onTrackedChangesCallback = callback;
  }

  onToggleSidebar(callback: () => void): void {
    this.onToggleDrawerCallback = callback;
  }

  onClearDrafts(callback: () => void): void {
    this.onClearDraftsCallback = callback;
  }

  onExportClean(callback?: () => void): void {
    this.onExportCleanCallback = callback ?? null;
    this.updateExportButtonStates();
  }

  onExportCritic(callback?: () => void): void {
    this.onExportCriticCallback = callback ?? null;
    this.updateExportButtonStates();
  }

  onSubmitReview(callback?: () => void): void {
    this.onSubmitReviewCallback = callback ?? null;
    this.submitReviewEnabled = Boolean(callback);
    this.updateSubmitReviewButtonState();
  }

  onToggleTranslation(callback?: () => void): void {
    this.onToggleTranslationCallback = callback ?? null;
    this.translationEnabled = Boolean(callback);
    this.setTranslationEnabled(this.translationEnabled);
  }

  onTranslateDocument(callback?: () => void): void {
    this.onTranslateDocumentCallback = callback ?? null;
  }

  onTranslateSentence(callback?: () => void): void {
    this.onTranslateSentenceCallback = callback ?? null;
  }

  onProviderChange(callback?: (provider: string) => void): void {
    this.onProviderChangeCallback = callback ?? null;
  }

  onSourceLanguageChange(callback?: (lang: string) => void): void {
    this.onSourceLanguageChangeCallback = callback ?? null;
  }

  onTargetLanguageChange(callback?: (lang: string) => void): void {
    this.onTargetLanguageChangeCallback = callback ?? null;
  }

  onSwapLanguages(callback?: () => void): void {
    this.onSwapLanguagesCallback = callback ?? null;
  }

  onAutoTranslateChange(callback?: (enabled: boolean) => void): void {
    this.onAutoTranslateChangeCallback = callback ?? null;
  }

  onTranslationExportUnified(callback?: () => void): void {
    this.onTranslationExportUnifiedCallback = callback ?? null;
  }

  onTranslationExportSeparated(callback?: () => void): void {
    this.onTranslationExportSeparatedCallback = callback ?? null;
  }

  onClearLocalModelCache(callback?: () => void): void {
    this.onClearLocalModelCacheCallback = callback ?? null;
  }

  destroy(): void {
    this.element?.remove();
    this.element = null;
    // Clear all references
    this.toggleBtn = null;
    this.drawerTitle = null;
    this.reviewToolsSection = null;
    this.undoBtn = null;
    this.redoBtn = null;
    this.trackedChangesToggle = null;
    this.exportSection = null;
    this.exportCleanBtn = null;
    this.exportCriticBtn = null;
    this.submitReviewBtn = null;
    this.commentsSection = null;
    this.commentsContent = null;
    this.translationSection = null;
    this.translationBtn = null;
    this.debugSection = null;
    this.translationToolsSection = null;
    // Clear all callbacks
    this.onUndoCallback = null;
    this.onRedoCallback = null;
    this.onTranslationUndoCallback = null;
    this.onTranslationRedoCallback = null;
    this.onTrackedChangesCallback = null;
    this.onToggleDrawerCallback = null;
    this.onClearDraftsCallback = null;
    this.onExportCleanCallback = null;
    this.onExportCriticCallback = null;
    this.onSubmitReviewCallback = null;
    this.onToggleTranslationCallback = null;
    this.commentsCallbacks = null;
  }
}
