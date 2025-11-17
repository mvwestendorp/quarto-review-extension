/**
 * Change Summary Dashboard Module
 * Displays comprehensive statistics about document changes
 */

import type { ChangeSummaryConfig } from '@/types';
import { escapeHtml } from './shared/utils';
import { UI_CONSTANTS, getAnimationDuration } from './constants';
import { createModuleLogger } from '@utils/debug';
import { createDiv, addClass, removeClass } from '@utils/dom-helpers';

const logger = createModuleLogger('ChangeSummary');

export interface ChangeSummary {
  totalChanges: number;
  additions: number;
  deletions: number;
  substitutions: number;
  changesByElementType: Map<string, number>;
  charactersAdded: number;
  charactersRemoved: number;
  elementsModified: number;
  comments: number;
}

export interface ChangeLocation {
  elementId: string;
  elementType: string;
  position: number;
  preview: string;
  type: 'addition' | 'deletion' | 'substitution';
}

export class ChangeSummaryDashboard {
  private config: ChangeSummaryConfig;
  private summaryElement: HTMLElement | null = null;
  private summary: ChangeSummary | null = null;

  constructor(config: ChangeSummaryConfig) {
    this.config = config;
  }

  /**
   * Calculate comprehensive change summary from operations
   */
  calculateSummary(): ChangeSummary {
    const operations = this.config.changes.getOperations();
    const currentState = this.config.changes.getCurrentState();

    const summary: ChangeSummary = {
      totalChanges: operations.filter((op: any) => op.type === 'edit').length,
      additions: 0,
      deletions: 0,
      substitutions: 0,
      changesByElementType: new Map(),
      charactersAdded: 0,
      charactersRemoved: 0,
      elementsModified: 0,
      comments: 0,
    };

    // Track which elements have been modified
    const modifiedElements = new Set<string>();

    // Analyze each operation
    operations.forEach((op: any) => {
      if (op.type !== 'edit') return;

      modifiedElements.add(op.elementId);

      // Count change types by analyzing CriticMarkup
      const content = this.config.changes.getElementContentWithTrackedChanges(
        op.elementId
      );

      const additionMatches = content.match(/\{\+\+([\s\S]*?)\+\+\}/g) || [];
      const deletionMatches = content.match(/\{--([\s\S]*?)--\}/g) || [];
      const substitutionMatches =
        content.match(/\{~~([\s\S]*?)~>([\s\S]*?)~~\}/g) || [];

      summary.additions += additionMatches.length;
      summary.deletions += deletionMatches.length;
      summary.substitutions += substitutionMatches.length;

      // Count characters
      additionMatches.forEach((match: string) => {
        const text = match.replace(/\{\+\+|\+\+\}/g, '');
        summary.charactersAdded += text.length;
      });

      deletionMatches.forEach((match: string) => {
        const text = match.replace(/\{--|--\}/g, '');
        summary.charactersRemoved += text.length;
      });

      // Track changes by element type
      const element = this.config.changes.getElementById(op.elementId);
      if (element) {
        const type = element.metadata.type;
        summary.changesByElementType.set(
          type,
          (summary.changesByElementType.get(type) || 0) + 1
        );
      }
    });

    summary.elementsModified = modifiedElements.size;

    // Count comments
    currentState.forEach((element: any) => {
      const commentMatches = this.config.comments.parse(element.content);
      summary.comments += commentMatches.length;
    });

    this.summary = summary;
    return summary;
  }

  /**
   * Get list of all changes with their locations
   */
  getChangesList(): ChangeLocation[] {
    const operations = this.config.changes.getOperations();
    const changes: ChangeLocation[] = [];
    let position = 0;

    operations.forEach((op: any) => {
      if (op.type !== 'edit') return;

      const element = this.config.changes.getElementById(op.elementId);
      if (!element) return;

      const plainText = this.config.markdown.toPlainText(element.content) || '';
      const preview = plainText.substring(0, 100).replace(/\s+/g, ' ').trim();

      // Determine change type
      let changeType: 'addition' | 'deletion' | 'substitution' = 'substitution';
      const content = this.config.changes.getElementContentWithTrackedChanges(
        op.elementId
      );

      if (content.includes('{++') && !content.includes('{--')) {
        changeType = 'addition';
      } else if (content.includes('{--') && !content.includes('{++')) {
        changeType = 'deletion';
      }

      changes.push({
        elementId: op.elementId,
        elementType: element.metadata.type,
        position: position++,
        preview,
        type: changeType,
      });
    });

    return changes;
  }

  /**
   * Render the change summary dashboard
   */
  renderDashboard(): HTMLElement {
    try {
      const summary = this.calculateSummary();
      const dashboard = createDiv('review-change-summary-dashboard');
      dashboard.setAttribute('role', 'region');
      dashboard.setAttribute('aria-label', 'Change summary statistics');

      const additionPercent =
        summary.totalChanges > 0
          ? Math.round((summary.additions / summary.totalChanges) * 100)
          : 0;
      const deletionPercent =
        summary.totalChanges > 0
          ? Math.round((summary.deletions / summary.totalChanges) * 100)
          : 0;
      const substitutionPercent =
        summary.totalChanges > 0
          ? Math.round((summary.substitutions / summary.totalChanges) * 100)
          : 0;

      dashboard.innerHTML = `
      <div class="review-summary-section">
        <div class="review-summary-header">
          <h3>📊 Change Summary</h3>
          <span class="review-summary-refresh" data-action="refresh" title="Recalculate">🔄</span>
        </div>

        <div class="review-summary-stats">
          <div class="review-stat-card review-stat-primary">
            <div class="review-stat-value">${summary.totalChanges}</div>
            <div class="review-stat-label">Total Changes</div>
          </div>

          <div class="review-stat-card review-stat-modified">
            <div class="review-stat-value">${summary.elementsModified}</div>
            <div class="review-stat-label">Elements Modified</div>
          </div>

          <div class="review-stat-card review-stat-comments">
            <div class="review-stat-value">${summary.comments}</div>
            <div class="review-stat-label">Comments</div>
          </div>
        </div>

        <div class="review-summary-breakdown">
          <h4>Change Types</h4>

          <div class="review-change-type">
            <div class="review-change-type-header">
              <span class="review-change-icon review-change-add">➕</span>
              <span class="review-change-label">Additions</span>
              <span class="review-change-count">${summary.additions}</span>
            </div>
            <div class="review-change-bar">
              <div
                class="review-change-bar-fill review-change-bar-add"
                style="width: ${additionPercent}%"
              ></div>
            </div>
            <div class="review-change-chars">${summary.charactersAdded} characters added</div>
          </div>

          <div class="review-change-type">
            <div class="review-change-type-header">
              <span class="review-change-icon review-change-remove">➖</span>
              <span class="review-change-label">Deletions</span>
              <span class="review-change-count">${summary.deletions}</span>
            </div>
            <div class="review-change-bar">
              <div
                class="review-change-bar-fill review-change-bar-remove"
                style="width: ${deletionPercent}%"
              ></div>
            </div>
            <div class="review-change-chars">${summary.charactersRemoved} characters removed</div>
          </div>

          <div class="review-change-type">
            <div class="review-change-type-header">
              <span class="review-change-icon review-change-sub">🔄</span>
              <span class="review-change-label">Substitutions</span>
              <span class="review-change-count">${summary.substitutions}</span>
            </div>
            <div class="review-change-bar">
              <div
                class="review-change-bar-fill review-change-bar-sub"
                style="width: ${substitutionPercent}%"
              ></div>
            </div>
          </div>
        </div>

        <div class="review-summary-by-type">
          <h4>Changes by Element Type</h4>
          <div class="review-element-types">
            ${Array.from(summary.changesByElementType.entries())
              .map(
                ([type, count]) => `
                <div class="review-element-type-item">
                  <span class="review-element-type-name">${this.getElementTypeIcon(type)} ${type}</span>
                  <span class="review-element-type-count">${count}</span>
                </div>
              `
              )
              .join('')}
          </div>
        </div>

        <div class="review-summary-actions" role="group" aria-label="Change summary actions">
          <button
            class="review-btn review-btn-secondary review-btn-block"
            data-action="jump-to-first"
            title="Jump to first change"
            aria-label="Jump to first change"
          >
            ⬆️ First Change
          </button>
          <button
            class="review-btn review-btn-secondary review-btn-block"
            data-action="jump-to-last"
            title="Jump to last change"
            aria-label="Jump to last change"
          >
            ⬇️ Last Change
          </button>
          <button
            class="review-btn review-btn-secondary review-btn-block"
            data-action="export-summary"
            title="Export summary as markdown"
            aria-label="Export summary as markdown"
          >
            📋 Export Summary
          </button>
        </div>
      </div>

      <div class="review-summary-details">
        <div class="review-details-header">
          <h4>Changes List</h4>
          <span class="review-details-count">${this.getChangesList().length} changes</span>
        </div>
        <div class="review-changes-list">
          ${this.renderChangesList()}
        </div>
      </div>
    `;

      this.summaryElement = dashboard;
      this.attachDashboardHandlers(dashboard);

      return dashboard;
    } catch (error) {
      logger.error('Failed to render change summary dashboard:', error);
      // Return a fallback error dashboard
      const errorDashboard = createDiv(
        'review-change-summary-dashboard review-error'
      );
      errorDashboard.innerHTML = `
        <div class="review-summary-section">
          <div class="review-summary-header">
            <h3>📊 Change Summary</h3>
          </div>
          <div class="review-error-message">
            <p>Error loading change summary. Please refresh the page.</p>
          </div>
        </div>
      `;
      return errorDashboard;
    }
  }

  /**
   * Render the list of individual changes
   */
  private renderChangesList(): string {
    const changes = this.getChangesList();

    if (changes.length === 0) {
      return `
        <div class="review-changes-empty">
          <p>No changes yet. Start editing to see changes here.</p>
        </div>
      `;
    }

    return changes
      .map(
        (change, index) => `
          <div class="review-change-item" data-element-id="${change.elementId}">
            <div class="review-change-item-number">${index + 1}</div>
            <div class="review-change-item-content">
              <div class="review-change-item-header">
                <span class="review-change-item-type review-change-type-${change.type}">
                  ${this.getChangeTypeIcon(change.type)}
                </span>
                <span class="review-change-item-element">${change.elementType}</span>
              </div>
              <div class="review-change-item-preview">${escapeHtml(change.preview)}</div>
            </div>
            <button
              class="review-change-item-jump"
              data-action="jump-to-change"
              data-element-id="${change.elementId}"
              title="Jump to this change"
              aria-label="Jump to this change"
            >
              →
            </button>
          </div>
        `
      )
      .join('');
  }

  /**
   * Attach event handlers to dashboard
   */
  private attachDashboardHandlers(dashboard: HTMLElement): void {
    // Refresh button
    dashboard
      .querySelector('[data-action="refresh"]')
      ?.addEventListener('click', () => {
        const refreshed = this.renderDashboard();
        this.summaryElement?.replaceWith(refreshed);
      });

    // Jump buttons
    dashboard
      .querySelector('[data-action="jump-to-first"]')
      ?.addEventListener('click', () => {
        this.jumpToChange('first');
      });

    dashboard
      .querySelector('[data-action="jump-to-last"]')
      ?.addEventListener('click', () => {
        this.jumpToChange('last');
      });

    // Export summary
    dashboard
      .querySelector('[data-action="export-summary"]')
      ?.addEventListener('click', () => {
        this.exportSummary();
      });

    // Jump to individual changes
    dashboard
      .querySelectorAll('[data-action="jump-to-change"]')
      .forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const elementId = (e.currentTarget as HTMLElement).getAttribute(
            'data-element-id'
          );
          if (elementId) {
            this.jumpToElement(elementId);
          }
        });
      });

    // Click on change item to jump
    dashboard.querySelectorAll('.review-change-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('[data-action="jump-to-change"]'))
          return;
        const elementId = (item as HTMLElement).getAttribute('data-element-id');
        if (elementId) {
          this.jumpToElement(elementId);
        }
      });
    });
  }

  /**
   * Jump to first or last change
   */
  private jumpToChange(direction: 'first' | 'last'): void {
    const changes = this.getChangesList();
    if (changes.length === 0) return;

    const targetIndex = direction === 'first' ? 0 : changes.length - 1;
    const target = changes[targetIndex];
    if (!target) {
      return;
    }
    this.jumpToElement(target.elementId);
  }

  /**
   * Jump to element and highlight it
   */
  private jumpToElement(elementId: string): void {
    const element = document.querySelector(
      `[data-review-id="${elementId}"]`
    ) as HTMLElement;
    if (!element) return;

    // Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Flash highlight
    addClass(element, 'review-highlight-flash');
    setTimeout(() => {
      removeClass(element, 'review-highlight-flash');
    }, getAnimationDuration('LONG_HIGHLIGHT'));

    // Show temporary focus indicator
    addClass(element, 'review-jump-target');
    setTimeout(() => {
      removeClass(element, 'review-jump-target');
    }, getAnimationDuration('FLASH_HIGHLIGHT'));
  }

  /**
   * Export summary as markdown
   */
  private exportSummary(): void {
    const summary = this.summary || this.calculateSummary();
    const changes = this.getChangesList();

    let markdown = `# Document Change Summary\n\n`;
    markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;

    markdown += `## Statistics\n\n`;
    markdown += `- **Total Changes:** ${summary.totalChanges}\n`;
    markdown += `- **Elements Modified:** ${summary.elementsModified}\n`;
    markdown += `- **Comments:** ${summary.comments}\n`;
    markdown += `- **Characters Added:** ${summary.charactersAdded}\n`;
    markdown += `- **Characters Removed:** ${summary.charactersRemoved}\n\n`;

    markdown += `## Change Breakdown\n\n`;
    markdown += `- **Additions:** ${summary.additions}\n`;
    markdown += `- **Deletions:** ${summary.deletions}\n`;
    markdown += `- **Substitutions:** ${summary.substitutions}\n\n`;

    markdown += `## By Element Type\n\n`;
    for (const [type, count] of summary.changesByElementType) {
      markdown += `- ${type}: ${count}\n`;
    }

    markdown += `\n## All Changes\n\n`;
    changes.forEach((change, index) => {
      markdown += `${index + 1}. [${change.type.toUpperCase()}] ${change.elementType}\n`;
      markdown += `   > ${change.preview}\n\n`;
    });

    // Copy to clipboard
    navigator.clipboard.writeText(markdown).then(() => {
      this.showNotification('Summary copied to clipboard', 'success');
    });
  }

  /**
   * Get icon for element type
   */
  private getElementTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      Header: '📝',
      Para: '¶',
      BulletList: '•',
      OrderedList: '1️⃣',
      CodeBlock: '💻',
      BlockQuote: '❝',
      Div: '📦',
    };
    return icons[type] || '▪️';
  }

  /**
   * Get icon for change type
   */
  private getChangeTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      addition: '➕',
      deletion: '➖',
      substitution: '🔄',
    };
    return icons[type] || '•';
  }

  /**
   * Show notification
   */
  private showNotification(
    message: string,
    type: 'info' | 'success' | 'error'
  ): void {
    const notification = createDiv(
      `review-notification review-notification-${type}`
    );
    notification.textContent = message;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    notification.setAttribute('aria-atomic', 'true');
    document.body.appendChild(notification);

    setTimeout(() => {
      addClass(notification, 'review-notification-show');
    }, 10);

    setTimeout(() => {
      removeClass(notification, 'review-notification-show');
      setTimeout(() => notification.remove(), getAnimationDuration('SLOW'));
    }, UI_CONSTANTS.NOTIFICATION_DISPLAY_DURATION_MS);
  }

  /**
   * Destroy the dashboard and clean up event listeners
   */
  destroy(): void {
    if (this.summaryElement) {
      this.summaryElement.remove();
      this.summaryElement = null;
    }
    this.summary = null;
  }
}
