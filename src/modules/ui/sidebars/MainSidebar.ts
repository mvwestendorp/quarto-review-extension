import { createModuleLogger } from '@utils/debug';

const logger = createModuleLogger('MainSidebar');

/**
 * MainSidebar manages the persistent main toolbar displayed beside the document.
 * It renders the undo/redo controls, tracked changes toggle, comment entry point,
 * and communicates user intent back to the orchestrating UIModule.
 */
export class MainSidebar {
  private element: HTMLElement | null = null;
  private undoBtn: HTMLButtonElement | null = null;
  private redoBtn: HTMLButtonElement | null = null;
  private trackedChangesToggle: HTMLInputElement | null = null;
  private commentsBtn: HTMLButtonElement | null = null;
  private toggleBtn: HTMLButtonElement | null = null;
  private unsavedIndicator: HTMLElement | null = null;

  private onUndoCallback: (() => void) | null = null;
  private onRedoCallback: (() => void) | null = null;
  private onTrackedChangesCallback: ((enabled: boolean) => void) | null = null;
  private onShowCommentsCallback: (() => void) | null = null;
  private onToggleSidebarCallback: (() => void) | null = null;

  /**
   * Lazily create (or return) the sidebar element.
   */
  create(): HTMLElement {
    if (this.element) {
      return this.element;
    }

    const container = document.createElement('div');
    container.className = 'review-toolbar review-persistent-sidebar';
    container.setAttribute('role', 'toolbar');
    container.setAttribute('aria-label', 'Review tools');

    const header = document.createElement('div');
    header.className = 'review-sidebar-header';

    const title = document.createElement('h3');
    title.textContent = 'Review Tools';
    header.appendChild(title);

    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'review-btn review-btn-icon';
    this.toggleBtn.setAttribute('data-action', 'toggle-sidebar');
    this.toggleBtn.setAttribute('title', 'Collapse sidebar');
    this.toggleBtn.setAttribute('aria-label', 'Collapse sidebar');
    this.toggleBtn.setAttribute('aria-expanded', 'true');

    const chevron = document.createElement('span');
    chevron.className = 'review-icon-chevron';
    chevron.textContent = '‹';
    this.toggleBtn.appendChild(chevron);

    this.toggleBtn.addEventListener('click', () => {
      this.onToggleSidebarCallback?.();
    });
    header.appendChild(this.toggleBtn);

    container.appendChild(header);

    const body = document.createElement('div');
    body.className = 'review-sidebar-body';

    // Actions section (undo/redo)
    const actionsSection = document.createElement('div');
    actionsSection.className = 'review-sidebar-section';

    const actionsTitle = document.createElement('h4');
    actionsTitle.textContent = 'Actions';
    actionsSection.appendChild(actionsTitle);

    this.undoBtn = document.createElement('button');
    this.undoBtn.className = 'review-btn review-btn-secondary review-btn-block';
    this.undoBtn.setAttribute('data-action', 'undo');
    this.undoBtn.setAttribute('title', 'Undo (Ctrl+Z)');
    this.undoBtn.setAttribute('aria-label', 'Undo (Ctrl+Z)');
    this.undoBtn.textContent = '↶ Undo';
    this.undoBtn.disabled = true;
    this.undoBtn.addEventListener('click', () => {
      this.onUndoCallback?.();
    });
    actionsSection.appendChild(this.undoBtn);

    this.redoBtn = document.createElement('button');
    this.redoBtn.className = 'review-btn review-btn-secondary review-btn-block';
    this.redoBtn.setAttribute('data-action', 'redo');
    this.redoBtn.setAttribute('title', 'Redo (Ctrl+Y)');
    this.redoBtn.setAttribute('aria-label', 'Redo (Ctrl+Y)');
    this.redoBtn.textContent = '↷ Redo';
    this.redoBtn.disabled = true;
    this.redoBtn.addEventListener('click', () => {
      this.onRedoCallback?.();
    });
    actionsSection.appendChild(this.redoBtn);

    body.appendChild(actionsSection);

    // View section (tracked changes)
    const viewSection = document.createElement('div');
    viewSection.className = 'review-sidebar-section';

    const viewTitle = document.createElement('h4');
    viewTitle.textContent = 'View';
    viewSection.appendChild(viewTitle);

    const trackedLabel = document.createElement('label');
    trackedLabel.className = 'review-checkbox-label';

    this.trackedChangesToggle = document.createElement('input');
    this.trackedChangesToggle.type = 'checkbox';
    this.trackedChangesToggle.setAttribute('data-action', 'toggle-tracked-changes');
    this.trackedChangesToggle.setAttribute('aria-label', 'Show tracked changes');
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

    viewSection.appendChild(trackedLabel);
    body.appendChild(viewSection);

    // Comments section
    const commentsSection = document.createElement('div');
    commentsSection.className = 'review-sidebar-section';

    const commentsTitle = document.createElement('h4');
    commentsTitle.textContent = 'Comments';
    commentsSection.appendChild(commentsTitle);

    this.commentsBtn = document.createElement('button');
    this.commentsBtn.className = 'review-btn review-btn-primary review-btn-block';
    this.commentsBtn.setAttribute('data-action', 'show-comments');
    this.commentsBtn.textContent = '💬 View Comments';
    this.commentsBtn.addEventListener('click', () => {
      this.onShowCommentsCallback?.();
    });
    commentsSection.appendChild(this.commentsBtn);

    body.appendChild(commentsSection);

    // Help section (static guidance)
    const helpSection = document.createElement('div');
    helpSection.className = 'review-sidebar-section review-sidebar-help';
    helpSection.innerHTML = `
      <h4>Help</h4>
      <p class="review-help-text">
        <strong>Click</strong> a section for quick actions<br>
        <strong>Double-click</strong> to edit text<br>
        <strong>💬 badge</strong> to review comments
      </p>
    `;
    body.appendChild(helpSection);

    container.appendChild(body);

    this.element = container;
    logger.debug('Main sidebar created');
    return container;
  }

  getElement(): HTMLElement | null {
    return this.element;
  }

  updateUndoRedoState(canUndo: boolean, canRedo: boolean): void {
    if (this.undoBtn) {
      this.undoBtn.disabled = !canUndo;
      this.undoBtn.classList.toggle('review-btn-disabled', !canUndo);
    }
    if (this.redoBtn) {
      this.redoBtn.disabled = !canRedo;
      this.redoBtn.classList.toggle('review-btn-disabled', !canRedo);
    }
    logger.debug('Undo/redo state updated', { canUndo, canRedo });
  }

  setTrackedChangesVisible(visible: boolean): void {
    if (this.trackedChangesToggle) {
      this.trackedChangesToggle.checked = visible;
      const label = this.trackedChangesToggle.closest('.review-checkbox-label');
      label?.classList.toggle('review-checkbox-active', visible);
    }
    logger.debug('Tracked changes visibility set', { visible });
  }

  getTrackedChangesEnabled(): boolean {
    return this.trackedChangesToggle?.checked ?? false;
  }

  onUndo(callback: () => void): void {
    this.onUndoCallback = callback;
  }

  onRedo(callback: () => void): void {
    this.onRedoCallback = callback;
  }

  onTrackedChangesToggle(callback: (enabled: boolean) => void): void {
    this.onTrackedChangesCallback = callback;
  }

  onShowComments(callback: () => void): void {
    this.onShowCommentsCallback = callback;
  }

  onToggleSidebar(callback: () => void): void {
    this.onToggleSidebarCallback = callback;
  }

  /**
   * Update the toggle button to reflect the collapsed state managed by UIModule.
   */
  setCollapsed(collapsed: boolean): void {
    if (!this.toggleBtn) return;
    const chevron = this.toggleBtn.querySelector('.review-icon-chevron');
    if (chevron) {
      chevron.textContent = collapsed ? '›' : '‹';
    }
    this.toggleBtn.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    this.toggleBtn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    this.toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
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

  destroy(): void {
    this.element?.remove();
    this.element = null;
    this.undoBtn = null;
    this.redoBtn = null;
    this.trackedChangesToggle = null;
    this.commentsBtn = null;
    this.toggleBtn = null;
    this.unsavedIndicator = null;
    this.onUndoCallback = null;
    this.onRedoCallback = null;
    this.onTrackedChangesCallback = null;
    this.onShowCommentsCallback = null;
    this.onToggleSidebarCallback = null;
  }
}
