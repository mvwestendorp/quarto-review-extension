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

const logger = createModuleLogger('UnifiedSidebar');

interface TranslationSidebarProgress {
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
 * UnifiedSidebar consolidates review tools, comments, and translation tools
 * into a single expandable sidebar panel on the right side.
 */
export class UnifiedSidebar {
  private element: HTMLElement | null = null;
  private translationMode = false;
  private commentsExpanded = true;
  private userModule?: UserModule;

  // Header elements
  private toggleBtn: HTMLButtonElement | null = null;
  private sidebarTitle: HTMLElement | null = null;

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
  private commentsSectionToggle: HTMLButtonElement | null = null;
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

  // Storage section
  private storageSection: HTMLElement | null = null;

  // Unsaved changes indicator
  private unsavedIndicator: HTMLElement | null = null;

  // Callbacks
  private onUndoCallback: (() => void) | null = null;
  private onRedoCallback: (() => void) | null = null;
  private onTranslationUndoCallback: (() => void) | null = null;
  private onTranslationRedoCallback: (() => void) | null = null;
  private onTrackedChangesCallback: ((enabled: boolean) => void) | null = null;
  private onToggleSidebarCallback: (() => void) | null = null;
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
   * Create the unified sidebar element
   */
  create(): HTMLElement {
    if (this.element) {
      return this.element;
    }

    const container = createDiv(
      'review-unified-sidebar review-persistent-sidebar'
    );
    setAttributes(container, {
      role: 'complementary',
      'aria-label': 'Review tools and comments',
    });

    // Header
    const header = this.createHeader();
    container.appendChild(header);

    // Scrollable body
    const body = createDiv('review-sidebar-body');

    // Review Tools Section (shown in review mode)
    this.reviewToolsSection = this.createReviewToolsSection();
    body.appendChild(this.reviewToolsSection);

    // Export Section (shown in review mode)
    this.exportSection = this.createExportSection();
    body.appendChild(this.exportSection);

    // Comments Section (shown in review mode, collapsible)
    this.commentsSection = this.createCommentsSection();
    body.appendChild(this.commentsSection);

    // Translation Section (toggle button, shown in review mode)
    this.translationSection = this.createTranslationToggleSection();
    body.appendChild(this.translationSection);

    // Storage Section (shown in review mode)
    this.storageSection = this.createStorageSection();
    body.appendChild(this.storageSection);

    // Translation Tools Section (shown in translation mode)
    this.translationToolsSection = this.createTranslationToolsSection();
    this.translationToolsSection.style.display = 'none';
    body.appendChild(this.translationToolsSection);

    // Build info
    const buildInfo = this.createBuildInfo();
    body.appendChild(buildInfo);

    container.appendChild(body);

    this.element = container;
    document.body.appendChild(container);

    logger.debug('Unified sidebar created');
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
   * Call this after a user logs in to refresh the UI
   */
  updateUserDisplay(): void {
    if (!this.element) return;

    // Find the build info section
    const buildInfoSection = this.element.querySelector('.review-build-info');
    if (!buildInfoSection) return;

    // Remove old user section if present
    const oldUserSection = buildInfoSection.querySelector('[data-user-info]');
    if (oldUserSection) {
      oldUserSection.remove();
    }

    // Get current user
    const currentUser = this.userModule?.getCurrentUser?.();
    if (!currentUser) return;

    // Create new user section
    const userSection = createDiv();
    setAttributes(userSection, {
      'data-user-info': 'true',
    });
    userSection.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      padding-right: 8px;
      border-right: 1px solid var(--review-border-color, #e5e7eb);
    `;

    const userIcon = createIcon('👤');
    userIcon.style.fontSize = '12px';
    userSection.appendChild(userIcon);

    const userNameSpan = document.createElement('span');
    const displayName =
      currentUser.name?.trim() ||
      currentUser.email?.trim() ||
      currentUser.id?.trim() ||
      'User';
    userNameSpan.textContent = displayName;
    userNameSpan.style.userSelect = 'text';
    userSection.appendChild(userNameSpan);

    // Tooltip with full user info
    const tooltipText = `Logged in as:
Name: ${currentUser.name || '(not set)'}
Email: ${currentUser.email || '(not set)'}
ID: ${currentUser.id}
Role: ${currentUser.role}`;
    userSection.title = tooltipText;

    // Insert before the build section
    const buildSection = buildInfoSection.querySelector(
      'div:last-child'
    ) as HTMLElement;
    if (buildSection) {
      buildInfoSection.insertBefore(userSection, buildSection);
    } else {
      buildInfoSection.appendChild(userSection);
    }

    logger.debug('User display updated', {
      userId: currentUser.id,
      displayName,
    });
  }

  /**
   * Create header with title and toggle button
   */
  private createHeader(): HTMLElement {
    const header = createDiv('review-sidebar-header');
    header.setAttribute('data-sidebar-label', 'Review');

    this.sidebarTitle = document.createElement('h3');
    this.sidebarTitle.textContent = 'Review Tools';
    header.appendChild(this.sidebarTitle);

    this.toggleBtn = createButton('', 'review-btn review-btn-icon');
    setAttributes(this.toggleBtn, {
      'data-action': 'toggle-sidebar',
      title: 'Collapse sidebar',
      'aria-label': 'Toggle sidebar visibility',
      'aria-expanded': 'true',
    });

    const chevron = createIcon('‹', 'review-icon-chevron');
    chevron.style.position = 'absolute';
    this.toggleBtn.appendChild(chevron);

    const icon = createIcon('⚙️', 'review-icon-tools');
    icon.style.position = 'absolute';
    icon.style.opacity = '0';
    icon.style.pointerEvents = 'none';
    this.toggleBtn.appendChild(icon);

    this.toggleBtn.addEventListener('click', () => {
      this.onToggleSidebarCallback?.();
    });
    header.appendChild(this.toggleBtn);

    return header;
  }

  /**
   * Create Review Tools section (undo/redo, tracked changes)
   */
  private createReviewToolsSection(): HTMLElement {
    const section = createDiv('review-sidebar-section');
    section.setAttribute('data-section', 'review-tools');

    const title = document.createElement('h4');
    title.textContent = 'Actions';
    section.appendChild(title);

    this.undoBtn = createButton(
      '↶ Undo',
      'review-btn review-btn-secondary review-btn-block'
    );
    setAttributes(this.undoBtn, {
      'data-action': 'undo',
      title: 'Undo (Ctrl+Z)',
      'aria-label': 'Undo (Ctrl+Z)',
    });
    this.undoBtn.disabled = true;
    this.undoBtn.addEventListener('click', () => {
      this.onUndoCallback?.();
    });
    section.appendChild(this.undoBtn);

    this.redoBtn = createButton(
      '↷ Redo',
      'review-btn review-btn-secondary review-btn-block'
    );
    setAttributes(this.redoBtn, {
      'data-action': 'redo',
      title: 'Redo (Ctrl+Y)',
      'aria-label': 'Redo (Ctrl+Y)',
    });
    this.redoBtn.disabled = true;
    this.redoBtn.addEventListener('click', () => {
      this.onRedoCallback?.();
    });
    section.appendChild(this.redoBtn);

    // Tracked changes toggle
    const viewDiv = createDiv();
    viewDiv.style.marginTop = '12px';

    const trackedLabel = document.createElement('label');
    trackedLabel.className = 'review-checkbox-label';

    this.trackedChangesToggle = document.createElement('input');
    this.trackedChangesToggle.type = 'checkbox';
    setAttributes(this.trackedChangesToggle, {
      'data-action': 'toggle-tracked-changes',
      'aria-label': 'Show tracked changes',
    });
    this.trackedChangesToggle.className = 'review-sidebar-checkbox';
    this.trackedChangesToggle.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      this.onTrackedChangesCallback?.(target.checked);
    });
    trackedLabel.appendChild(this.trackedChangesToggle);

    const trackedText = document.createElement('span');
    trackedText.className = 'review-sidebar-label-text';
    trackedText.textContent = 'Show tracked changes';
    trackedLabel.appendChild(trackedText);

    viewDiv.appendChild(trackedLabel);
    section.appendChild(viewDiv);

    return section;
  }

  /**
   * Create Export section (QMD export, Git submit)
   */
  private createExportSection(): HTMLElement {
    const section = createDiv('review-sidebar-section');
    section.setAttribute('data-section', 'export');

    const title = document.createElement('h4');
    title.textContent = 'Export';
    section.appendChild(title);

    this.exportCleanBtn = createButton(
      '🗂 Export Clean QMD',
      'review-btn review-btn-primary review-btn-block'
    );
    setAttributes(this.exportCleanBtn, {
      'data-action': 'export-qmd-clean',
      title: 'Export QMD with accepted changes applied',
      'aria-label': 'Export QMD with accepted changes applied',
    });
    this.exportCleanBtn.disabled = true;
    this.exportCleanBtn.addEventListener('click', () => {
      this.onExportCleanCallback?.();
    });
    section.appendChild(this.exportCleanBtn);

    this.exportCriticBtn = createButton(
      '📝 Export with CriticMarkup',
      'review-btn review-btn-secondary review-btn-block'
    );
    setAttributes(this.exportCriticBtn, {
      'data-action': 'export-qmd-critic',
      title: 'Export QMD with CriticMarkup annotations',
      'aria-label': 'Export QMD with CriticMarkup annotations',
    });
    this.exportCriticBtn.disabled = true;
    this.exportCriticBtn.addEventListener('click', () => {
      this.onExportCriticCallback?.();
    });
    section.appendChild(this.exportCriticBtn);

    this.submitReviewBtn = createButton(
      this.submitReviewLabel,
      'review-btn review-btn-primary review-btn-block'
    );
    setAttributes(this.submitReviewBtn, {
      'data-action': 'submit-review',
      title: 'Submit review changes to the configured Git provider',
      'aria-label': 'Submit review changes to the configured Git provider',
    });
    this.submitReviewBtn.disabled = true;
    this.submitReviewBtn.addEventListener('click', () => {
      this.onSubmitReviewCallback?.();
    });
    section.appendChild(this.submitReviewBtn);
    // Apply any pre-existing state (callbacks might have been registered before create()).
    this.updateSubmitReviewButtonState();

    return section;
  }

  /**
   * Create Comments section (collapsible list)
   */
  private createCommentsSection(): HTMLElement {
    const section = createDiv('review-sidebar-section review-comments-section');
    section.setAttribute('data-section', 'comments');

    const header = createDiv('review-sidebar-section-header');
    header.style.cssText =
      'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; cursor: pointer;';
    header.addEventListener('click', () => {
      this.toggleCommentsSection();
    });

    const title = document.createElement('h4');
    title.textContent = 'Comments';
    title.style.margin = '0';
    header.appendChild(title);

    this.commentsSectionToggle = createButton(
      '',
      'review-btn review-btn-icon review-btn-sm'
    );
    this.commentsSectionToggle.setAttribute(
      'aria-label',
      'Toggle comments section'
    );
    this.commentsSectionToggle.innerHTML =
      '<span class="review-icon-chevron" style="transform: rotate(-90deg);">‹</span>';
    this.commentsSectionToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCommentsSection();
    });
    header.appendChild(this.commentsSectionToggle);

    section.appendChild(header);

    this.commentsContent = createDiv('review-comments-content');
    this.commentsContent.style.cssText = 'max-height: 400px; overflow-y: auto;';
    section.appendChild(this.commentsContent);

    return section;
  }

  /**
   * Create Translation Toggle section
   */
  private createTranslationToggleSection(): HTMLElement {
    const section = createDiv('review-sidebar-section');
    section.setAttribute('data-section', 'translation-toggle');

    const title = document.createElement('h4');
    title.textContent = 'Translation';
    section.appendChild(title);

    this.translationBtn = createButton(
      '🌐 Open Translation',
      'review-btn review-btn-secondary review-btn-block'
    );
    setAttributes(this.translationBtn, {
      'data-action': 'toggle-translation',
      title: 'Open translation UI for document translation',
      'aria-label': 'Toggle translation UI',
    });
    this.translationBtn.disabled = true;
    this.translationBtn.addEventListener('click', () => {
      this.onToggleTranslationCallback?.();
    });
    section.appendChild(this.translationBtn);

    return section;
  }

  /**
   * Create Storage section
   */
  private createStorageSection(): HTMLElement {
    const section = createDiv('review-sidebar-section');
    section.setAttribute('data-section', 'storage');

    const title = document.createElement('h4');
    title.textContent = 'Storage';
    section.appendChild(title);

    const clearBtn = createButton(
      'Clear local drafts',
      'review-btn review-btn-danger review-btn-block'
    );
    clearBtn.setAttribute('data-action', 'clear-local-drafts');
    clearBtn.addEventListener('click', () => {
      this.onClearDraftsCallback?.();
    });
    section.appendChild(clearBtn);

    return section;
  }

  /**
   * Create Translation Tools section (shown in translation mode)
   */
  private createTranslationToolsSection(): HTMLElement {
    const section = createDiv('review-sidebar-section');
    section.setAttribute('data-section', 'translation-tools');

    const title = document.createElement('h4');
    title.textContent = 'Translation Tools';
    section.appendChild(title);

    // Translate buttons
    const translateActionsDiv = createDiv();
    translateActionsDiv.style.marginBottom = '12px';

    this.translateDocumentBtn = createButton(
      'Translate Document',
      'review-btn review-btn-primary review-btn-block'
    );
    setAttributes(this.translateDocumentBtn, {
      'data-action': 'translate-document',
      title: 'Translate entire document (Ctrl+T)',
      'aria-label': 'Translate entire document',
    });
    this.translateDocumentBtn.disabled = true;
    this.translateDocumentBtn.addEventListener('click', () => {
      this.onTranslateDocumentCallback?.();
    });
    translateActionsDiv.appendChild(this.translateDocumentBtn);

    this.translateSentenceBtn = createButton(
      'Translate Selected',
      'review-btn review-btn-secondary review-btn-block'
    );
    setAttributes(this.translateSentenceBtn, {
      'data-action': 'translate-sentence',
      title: 'Translate selected sentence (Ctrl+Shift+T)',
      'aria-label': 'Translate selected sentence',
    });
    this.translateSentenceBtn.disabled = true;
    this.translateSentenceBtn.addEventListener('click', () => {
      this.onTranslateSentenceCallback?.();
    });
    translateActionsDiv.appendChild(this.translateSentenceBtn);

    this.translateDocumentDefaultLabel =
      this.translateDocumentBtn.textContent ??
      this.translateDocumentDefaultLabel;
    this.translateSentenceDefaultLabel =
      this.translateSentenceBtn.textContent ??
      this.translateSentenceDefaultLabel;

    section.appendChild(translateActionsDiv);

    // Progress container
    const progressContainer = createDiv(
      'review-translation-progress-container'
    );
    progressContainer.style.display = 'none';
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

    // Provider selector
    const providerDiv = createDiv();
    providerDiv.style.marginBottom = '12px';

    const providerLabel = document.createElement('label');
    providerLabel.className = 'review-label';
    providerLabel.htmlFor = 'translation-provider-select';
    providerLabel.textContent = 'Provider:';
    providerLabel.style.display = 'block';
    providerLabel.style.marginBottom = '4px';
    providerDiv.appendChild(providerLabel);

    this.providerSelector = document.createElement('select');
    this.providerSelector.id = 'translation-provider-select';
    this.providerSelector.className = 'review-select';
    this.providerSelector.style.width = '100%';
    this.providerSelector.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.onProviderChangeCallback?.(target.value);
    });
    providerDiv.appendChild(this.providerSelector);
    section.appendChild(providerDiv);

    // Language selectors
    const languagesDiv = createDiv();
    languagesDiv.style.marginBottom = '12px';

    const sourceLabel = document.createElement('label');
    sourceLabel.className = 'review-label';
    sourceLabel.htmlFor = 'translation-source-lang-select';
    sourceLabel.textContent = 'Source Language:';
    sourceLabel.style.display = 'block';
    sourceLabel.style.marginBottom = '4px';
    languagesDiv.appendChild(sourceLabel);

    this.sourceLanguageSelector = document.createElement('select');
    this.sourceLanguageSelector.id = 'translation-source-lang-select';
    this.sourceLanguageSelector.className = 'review-select';
    this.sourceLanguageSelector.style.width = '100%';
    this.sourceLanguageSelector.style.marginBottom = '8px';
    this.sourceLanguageSelector.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.onSourceLanguageChangeCallback?.(target.value);
    });
    languagesDiv.appendChild(this.sourceLanguageSelector);

    const targetLabel = document.createElement('label');
    targetLabel.className = 'review-label';
    targetLabel.htmlFor = 'translation-target-lang-select';
    targetLabel.textContent = 'Target Language:';
    targetLabel.style.display = 'block';
    targetLabel.style.marginBottom = '4px';
    languagesDiv.appendChild(targetLabel);

    this.targetLanguageSelector = document.createElement('select');
    this.targetLanguageSelector.id = 'translation-target-lang-select';
    this.targetLanguageSelector.className = 'review-select';
    this.targetLanguageSelector.style.width = '100%';
    this.targetLanguageSelector.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.onTargetLanguageChangeCallback?.(target.value);
    });
    languagesDiv.appendChild(this.targetLanguageSelector);

    this.swapLanguagesBtn = createButton(
      'Swap Languages',
      'review-btn review-btn-secondary review-btn-sm review-btn-block'
    );
    setAttributes(this.swapLanguagesBtn, {
      'data-action': 'swap-languages',
      title: 'Swap source and target languages (Ctrl+Alt+S)',
      'aria-label': 'Swap source and target languages',
    });
    this.swapLanguagesBtn.style.marginTop = '6px';
    this.swapLanguagesBtn.addEventListener('click', () => {
      this.onSwapLanguagesCallback?.();
    });
    languagesDiv.appendChild(this.swapLanguagesBtn);

    section.appendChild(languagesDiv);

    // Settings
    const settingsDiv = createDiv();
    settingsDiv.style.marginBottom = '12px';

    const autoTranslateLabel = document.createElement('label');
    autoTranslateLabel.className = 'review-checkbox-label';

    this.autoTranslateToggle = document.createElement('input');
    this.autoTranslateToggle.type = 'checkbox';
    setAttributes(this.autoTranslateToggle, {
      'data-action': 'toggle-auto-translate',
      'aria-label': 'Auto-translate on edit',
    });
    this.autoTranslateToggle.className = 'review-sidebar-checkbox';
    this.autoTranslateToggle.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      this.onAutoTranslateChangeCallback?.(target.checked);
    });
    autoTranslateLabel.appendChild(this.autoTranslateToggle);

    const autoTranslateText = document.createElement('span');
    autoTranslateText.className = 'review-sidebar-label-text';
    autoTranslateText.textContent = 'Auto-translate on edit';
    autoTranslateLabel.appendChild(autoTranslateText);

    settingsDiv.appendChild(autoTranslateLabel);
    section.appendChild(settingsDiv);

    // Export buttons (translation-specific)
    const translationExportDiv = createDiv();
    translationExportDiv.style.marginBottom = '12px';

    this.translationExportUnifiedBtn = createButton(
      'Export Unified',
      'review-btn review-btn-primary review-btn-block review-btn-sm'
    );
    setAttributes(this.translationExportUnifiedBtn, {
      'data-action': 'export-translation-unified',
      title: 'Export unified translation',
      'aria-label': 'Export unified translation',
    });
    this.translationExportUnifiedBtn.disabled = true;
    this.translationExportUnifiedBtn.addEventListener('click', () => {
      this.onTranslationExportUnifiedCallback?.();
    });
    translationExportDiv.appendChild(this.translationExportUnifiedBtn);

    this.translationExportSeparatedBtn = createButton(
      'Export Separated',
      'review-btn review-btn-secondary review-btn-block review-btn-sm'
    );
    setAttributes(this.translationExportSeparatedBtn, {
      'data-action': 'export-translation-separated',
      title: 'Export separated translation',
      'aria-label': 'Export separated translation',
    });
    this.translationExportSeparatedBtn.disabled = true;
    this.translationExportSeparatedBtn.addEventListener('click', () => {
      this.onTranslationExportSeparatedCallback?.();
    });
    translationExportDiv.appendChild(this.translationExportSeparatedBtn);

    section.appendChild(translationExportDiv);

    this.clearModelCacheBtn = createButton(
      'Clear Local Model Cache',
      'review-btn review-btn-secondary review-btn-block review-btn-sm'
    );
    setAttributes(this.clearModelCacheBtn, {
      'data-action': 'clear-local-model-cache',
      title: 'Clear cached local translation models',
      'aria-label': 'Clear cached local translation models',
    });
    this.clearModelCacheBtn.disabled = true;
    this.clearModelCacheBtn.addEventListener('click', () => {
      this.onClearLocalModelCacheCallback?.();
    });
    section.appendChild(this.clearModelCacheBtn);

    // Exit translation mode button
    this.exitTranslationBtn = createButton(
      'Exit Translation',
      'review-btn review-btn-danger review-btn-block'
    );
    setAttributes(this.exitTranslationBtn, {
      'data-action': 'exit-translation',
      title: 'Exit translation mode and merge changes',
      'aria-label': 'Exit translation mode',
    });
    this.exitTranslationBtn.addEventListener('click', () => {
      this.onToggleTranslationCallback?.();
    });
    section.appendChild(this.exitTranslationBtn);

    return section;
  }

  /**
   * Create build info section with user status
   */
  private createBuildInfo(): HTMLElement {
    const buildInfoSection = createDiv(
      'review-sidebar-section review-build-info'
    );
    buildInfoSection.style.cssText = `
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid var(--review-border-color, #e5e7eb);
      font-size: 11px;
      color: var(--review-text-muted, #6b7280);
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      cursor: help;
    `;

    // User info section (if authenticated)
    const currentUser = this.userModule?.getCurrentUser?.();
    if (currentUser) {
      const userSection = createDiv();
      userSection.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        padding-right: 8px;
        border-right: 1px solid var(--review-border-color, #e5e7eb);
      `;

      const userIcon = createIcon('👤');
      userIcon.style.fontSize = '12px';
      userSection.appendChild(userIcon);

      const userNameSpan = document.createElement('span');
      const displayName =
        currentUser.name?.trim() ||
        currentUser.email?.trim() ||
        currentUser.id?.trim() ||
        'User';
      userNameSpan.textContent = displayName;
      userNameSpan.style.userSelect = 'text';
      userSection.appendChild(userNameSpan);

      // Tooltip with full user info
      const tooltipText = `Logged in as:
Name: ${currentUser.name || '(not set)'}
Email: ${currentUser.email || '(not set)'}
ID: ${currentUser.id}
Role: ${currentUser.role}`;
      userSection.title = tooltipText;

      buildInfoSection.appendChild(userSection);
    }

    // Build info
    const buildSection = createDiv();
    buildSection.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
    `;

    const infoIcon = createIcon('ℹ️');
    infoIcon.style.fontSize = '12px';

    const buildText = document.createElement('span');
    buildText.textContent = `v${getBuildString()}`;
    buildText.style.userSelect = 'text';

    buildSection.appendChild(infoIcon);
    buildSection.appendChild(buildText);
    buildSection.title = getFullBuildInfo();

    buildInfoSection.appendChild(buildSection);

    return buildInfoSection;
  }

  /**
   * Toggle comments section expansion
   */
  private toggleCommentsSection(): void {
    this.commentsExpanded = !this.commentsExpanded;

    if (this.commentsContent) {
      this.commentsContent.style.display = this.commentsExpanded ? '' : 'none';
    }

    if (this.commentsSectionToggle) {
      const chevron = this.commentsSectionToggle.querySelector(
        '.review-icon-chevron'
      );
      if (chevron) {
        (chevron as HTMLElement).style.transform = this.commentsExpanded
          ? 'rotate(-90deg)'
          : 'rotate(0deg)';
      }
    }

    logger.debug('Comments section toggled', {
      expanded: this.commentsExpanded,
    });
  }

  /**
   * Set translation mode
   */
  setTranslationMode(active: boolean): void {
    this.translationMode = active;

    // Update sidebar title
    if (this.sidebarTitle) {
      this.sidebarTitle.textContent = active
        ? 'Translation Tools'
        : 'Review Tools';
    }

    if (this.toggleBtn?.parentElement) {
      this.toggleBtn.parentElement.setAttribute(
        'data-sidebar-label',
        active ? 'Translation' : 'Review'
      );
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
    if (this.storageSection) {
      this.storageSection.style.display = active ? 'none' : '';
    }

    // Show/hide translation tools
    if (this.translationToolsSection) {
      this.translationToolsSection.style.display = active ? '' : 'none';
    }

    // Update undo/redo buttons for translation mode
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
      emptyMsg.textContent = 'No comments yet';
      this.commentsContent.appendChild(emptyMsg);
      return;
    }

    this.commentSections.forEach((snapshot) => {
      const section = document.createElement('div');
      section.className = 'review-comments-section';
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

    const editBtn = createButton('Edit', 'review-btn review-btn-sm');
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.commentsCallbacks?.onEdit(snapshot.element.id, comment);
    });
    actions.appendChild(editBtn);

    const removeBtn = createButton(
      'Remove',
      'review-btn review-btn-sm review-btn-danger'
    );
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

  setCollapsed(collapsed: boolean): void {
    if (!this.element) return;

    toggleClass(this.element, 'review-sidebar-collapsed', collapsed);
    toggleClass(document.body, 'review-sidebar-collapsed-mode', collapsed);

    if (this.toggleBtn) {
      const chevron = this.toggleBtn.querySelector('.review-icon-chevron');
      const icon = this.toggleBtn.querySelector('.review-icon-tools');

      if (chevron && icon) {
        if (collapsed) {
          // Show gear icon, hide chevron
          (chevron as HTMLElement).style.opacity = '0';
          (chevron as HTMLElement).style.pointerEvents = 'none';
          (icon as HTMLElement).style.opacity = '1';
          (icon as HTMLElement).style.pointerEvents = 'auto';
        } else {
          // Show chevron, hide gear icon
          (chevron as HTMLElement).style.opacity = '1';
          (chevron as HTMLElement).style.pointerEvents = 'auto';
          (icon as HTMLElement).style.opacity = '0';
          (icon as HTMLElement).style.pointerEvents = 'none';
        }
      }

      setAttributes(this.toggleBtn, {
        title: collapsed ? 'Expand sidebar' : 'Collapse sidebar',
        'aria-label': collapsed ? 'Expand sidebar' : 'Collapse sidebar',
        'aria-expanded': collapsed ? 'false' : 'true',
      });
    }
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

  setTranslationProgress(status: TranslationSidebarProgress): void {
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
    if (this.translationSection) {
      this.translationSection.style.display = enabled ? '' : 'none';
    }
    if (this.translationBtn) {
      this.translationBtn.disabled = !enabled;
      toggleClass(this.translationBtn, 'review-btn-disabled', !enabled);
    }
  }

  setTranslationActive(active: boolean): void {
    if (!this.translationBtn) return;

    if (active) {
      this.translationBtn.textContent = '🌐 Close Translation';
      this.translationBtn.setAttribute('title', 'Close translation UI');
      toggleClass(this.translationBtn, 'review-btn-active', true);
    } else {
      this.translationBtn.textContent = '🌐 Open Translation';
      this.translationBtn.setAttribute(
        'title',
        'Open translation UI for document translation'
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
        indicator.setAttribute('title', 'Unsaved changes');
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

  /**
   * Re-enable export buttons when document state changes
   * Ensures buttons remain usable even after changes are made
   */
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
    this.onToggleSidebarCallback = callback;
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
    this.sidebarTitle = null;
    this.reviewToolsSection = null;
    this.undoBtn = null;
    this.redoBtn = null;
    this.trackedChangesToggle = null;
    this.exportSection = null;
    this.exportCleanBtn = null;
    this.exportCriticBtn = null;
    this.submitReviewBtn = null;
    this.commentsSection = null;
    this.commentsSectionToggle = null;
    this.commentsContent = null;
    this.translationSection = null;
    this.translationBtn = null;
    this.storageSection = null;
    this.translationToolsSection = null;
    // Clear all callbacks
    this.onUndoCallback = null;
    this.onRedoCallback = null;
    this.onTranslationUndoCallback = null;
    this.onTranslationRedoCallback = null;
    this.onTrackedChangesCallback = null;
    this.onToggleSidebarCallback = null;
    this.onClearDraftsCallback = null;
    this.onExportCleanCallback = null;
    this.onExportCriticCallback = null;
    this.onSubmitReviewCallback = null;
    this.onToggleTranslationCallback = null;
    this.commentsCallbacks = null;
    toggleClass(document.body, 'review-sidebar-collapsed-mode', false);
  }
}
