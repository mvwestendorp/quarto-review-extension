/**
 * Quarto Review Extension
 * Main entry point for the review functionality
 */

import { ChangesModule } from '@modules/changes';
import { MarkdownModule, type MarkdownOptions } from '@modules/markdown';
import { CommentsModule } from '@modules/comments';
import { UIModule } from '@modules/ui';
import { registerSupplementalEditableSegments } from '@modules/ui/segment-preprocessor';
import { GitModule } from '@modules/git';
import LocalDraftPersistence from '@modules/storage/LocalDraftPersistence';
import { UserModule } from '@modules/user';
import { debugLogger, type DebugConfig } from '@utils/debug';
import { QmdExportService } from '@modules/export';
import type { ReviewGitConfig } from '@/types';

// Export debug logger and configuration
export {
  debugLogger,
  createModuleLogger,
  printDebugHelp,
  type DebugConfig,
} from '@utils/debug';

// Export types for documentation
export type {
  Element,
  ElementMetadata,
  ElementType,
  Operation,
  OperationType,
  OperationData,
  Comment,
  User,
  GitProvider,
} from '@/types';

// Export module-specific types
export type { ChangeSummaryDashboard } from '@modules/ui/change-summary';

// Re-export all modules for advanced usage
export { ChangesModule } from '@modules/changes';
export { MarkdownModule } from '@modules/markdown';
export { CommentsModule } from '@modules/comments';
export { UIModule } from '@modules/ui';
export { GitModule } from '@modules/git';
export { UserModule } from '@modules/user';
export {
  QmdExportService,
  type ExportFormat,
  type ExportOptions,
} from '@modules/export';

/**
 * Configuration options for Quarto Review extension
 */
export interface QuartoReviewConfig {
  /** Enable automatic saving of changes */
  autoSave?: boolean;
  /** Interval in milliseconds for auto-save (default: 5 minutes) */
  autoSaveInterval?: number;
  /** Git provider to use for version control */
  gitProvider?: 'github' | 'gitlab' | 'gitea' | 'local';
  /** Git integration configuration sourced from Quarto metadata */
  git?: ReviewGitConfig;
  /** Enable comments feature */
  enableComments?: boolean;
  /** Enable translation support */
  enableTranslation?: boolean;
  /** Debug configuration for development */
  debug?: Partial<DebugConfig>;
  /** Markdown rendering configuration */
  markdown?: MarkdownOptions;
}

export class QuartoReview {
  private changes: ChangesModule;
  private markdown: MarkdownModule;
  private comments: CommentsModule;
  private ui: UIModule;
  private git: GitModule;
  private localDrafts: LocalDraftPersistence;
  private exporter: QmdExportService;
  public user: UserModule; // Public so it can be accessed for permissions
  private config: QuartoReviewConfig;
  private autoSaveInterval?: number;

  constructor(config: QuartoReviewConfig = {}) {
    this.config = {
      autoSave: false,
      autoSaveInterval: 300000, // 5 minutes
      enableComments: true,
      enableTranslation: false,
      ...config,
    };

    // Configure debug logger if debug options are provided
    if (this.config.debug) {
      debugLogger.setConfig(this.config.debug);
    }

    registerSupplementalEditableSegments();

    // Initialize modules
    this.changes = new ChangesModule();
    this.markdown = new MarkdownModule(this.config.markdown);
    this.comments = new CommentsModule();
    this.user = new UserModule();
    this.git = new GitModule(this.config.git);
    this.exporter = new QmdExportService(this.changes, {
      git: this.git,
    });
    this.localDrafts = new LocalDraftPersistence(this.git.getFallbackStore());
    this.ui = new UIModule({
      changes: this.changes,
      markdown: this.markdown,
      comments: this.comments,
      inlineEditing: true, // Enable inline editing mode by default
      persistence: this.localDrafts,
      exporter: this.exporter,
    });

    this.initialize();
  }

  private initialize(): void {
    // Parse the rendered HTML to extract original elements
    this.changes.initializeFromDOM();

    // Set up UI event listeners
    this.ui.attachEventListeners();

    // Set up auto-save if enabled
    if (this.config.autoSave) {
      this.setupAutoSave();
    }
    this.ui.refresh();
  }

  private setupAutoSave(): void {
    this.autoSaveInterval = window.setInterval(() => {
      if (this.changes.hasUnsavedOperations()) {
        this.save().catch((error) => {
          console.error('Auto-save failed:', error);
        });
      }
    }, this.config.autoSaveInterval);
  }

  public async save(): Promise<void> {
    // Export clean markdown without CriticMarkup annotations
    const markdown = this.changes.toCleanMarkdown();
    await this.git.save(markdown, this.changes.summarizeOperations());
    this.changes.markAsSaved();
  }

  public undo(): void {
    this.changes.undo();
    this.ui.refresh();
  }

  public redo(): void {
    this.changes.redo();
    this.ui.refresh();
  }

  public destroy(): void {
    // Clear auto-save interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = undefined;
    }
    // Destroy UI module and all its submodules
    this.ui.destroy();
  }
}

// Auto-initialize if data-review attribute is present
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const reviewElement = document.querySelector('[data-review]');
    if (reviewElement) {
      const config = reviewElement.getAttribute('data-review-config');
      const parsedConfig = config ? JSON.parse(config) : {};
      new QuartoReview(parsedConfig);
    }
  });
}

export default QuartoReview;
