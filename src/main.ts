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
import { initializeOAuth2ProxyAuth } from '@modules/user/oauth2-proxy-init';
import {
  debugLogger,
  type DebugConfig,
  createModuleLogger,
} from '@utils/debug';
import { QmdExportService } from '@modules/export';
import GitReviewService from '@modules/git/review-service';
import type { ReviewGitConfig } from '@/types';
import {
  TranslationModule,
  type TranslationConfig,
} from '@modules/translation';
import { BUILD_INFO, getBuildString } from './version';
import {
  mergeWithGlobalConfig,
  storeGlobalConfig,
} from './services/GlobalConfigStorage';

const logger = createModuleLogger('QuartoReview');

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
export {
  TranslationModule,
  type TranslationConfig,
  type Language,
} from '@modules/translation';

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
  /** Translation configuration */
  translation?: Partial<TranslationConfig>;
  /** Debug configuration for development */
  debug?: Partial<DebugConfig>;
  /** Markdown rendering configuration */
  markdown?: MarkdownOptions;
  /** User authentication configuration (e.g., oauth2-proxy) */
  user?: {
    auth?: import('@/types').UserAuthConfig;
  };
}

export class QuartoReview {
  private changes: ChangesModule;
  private markdown: MarkdownModule;
  private comments: CommentsModule;
  private ui: UIModule;
  private git: GitModule;
  private localDrafts: LocalDraftPersistence;
  private exporter: QmdExportService;
  private reviewService?: GitReviewService;
  private translation?: any; // Will be TranslationModule instance, imported dynamically
  public user: UserModule; // Public so it can be accessed for permissions
  private config: QuartoReviewConfig;
  private autoSaveInterval?: number;
  private readonly draftFilename: string;

  constructor(config: QuartoReviewConfig = {}) {
    this.config = {
      autoSave: true, // FIXED: Enable auto-save by default to persist drafts
      autoSaveInterval: 30000, // 30 seconds - more frequent for draft preservation
      enableComments: true,
      enableTranslation: config.enableTranslation ?? false, // Default to disabled for smaller bundle
      ...config,
    };

    // Configure debug logger if debug options are provided
    if (this.config.debug) {
      debugLogger.setConfig(this.config.debug);
    }

    // Log build information
    console.log(
      `%c🎨 Quarto Review Extension ${getBuildString()}`,
      'color: #2563eb; font-weight: bold; font-size: 14px'
    );
    console.log(
      `Build: ${BUILD_INFO.buildNumber} | Date: ${BUILD_INFO.buildDate}`
    );

    registerSupplementalEditableSegments();

    // Initialize modules
    this.changes = new ChangesModule();
    this.markdown = new MarkdownModule(this.config.markdown);
    this.comments = new CommentsModule();

    // Log user auth configuration if present
    if (this.config.user?.auth?.debug) {
      console.debug(
        '[QuartoReview] Initializing UserModule with auth config:',
        {
          mode: this.config.user?.auth?.mode,
          debug: this.config.user?.auth?.debug,
          userHeader: this.config.user?.auth?.userHeader,
        }
      );
    }

    this.user = new UserModule({
      userAuthConfig: this.config.user?.auth,
    });
    this.git = new GitModule(this.config.git);
    this.draftFilename = this.deriveDraftFilename();
    this.localDrafts = new LocalDraftPersistence(this.git.getFallbackStore(), {
      filename: this.draftFilename,
    });
    this.exporter = new QmdExportService(this.changes, {
      git: this.git,
      localPersistence: this.localDrafts,
      comments: this.comments,
    });
    if (this.git.isEnabled()) {
      this.reviewService = new GitReviewService(this.git, this.exporter);
      console.log('✓ Git review service initialized');
    } else {
      console.warn(
        '⚠ Git integration is disabled. Submit Review button will be unavailable.'
      );
      console.info(
        'To enable: Add review.git configuration with provider, owner, and repo to your document metadata'
      );
    }

    // Initialize translation module (only if enabled in config)
    // Uses lazy loading to reduce bundle size when translation is not needed
    // Dynamic import allows bundlers to tree-shake translation code
    if (this.config.enableTranslation !== false) {
      // Lazy load TranslationModule only when needed
      // This is wrapped in the constructor's initialization chain
      void this.initializeTranslationModuleAsync();
    } else {
      logger.info('Translation module disabled via enableTranslation config');
    }

    this.ui = new UIModule({
      changes: this.changes,
      markdown: this.markdown,
      comments: this.comments,
      persistence: this.localDrafts,
      exporter: this.exporter,
      reviewService: this.reviewService,
      user: this.user,
      translation: this.translation,
    });

    this.initialize();
  }

  /**
   * Lazy load and initialize the translation module asynchronously
   * This allows bundlers to tree-shake translation code when not used
   */
  private async initializeTranslationModuleAsync(): Promise<void> {
    try {
      // Dynamic import for lazy loading and code splitting
      const { TranslationModule } = await import('@modules/translation');

      // Build translation configuration
      const providers = this.config.translation?.providers || {};
      const translationConfig: TranslationConfig = {
        enabled: true,
        sourceLanguage: this.config.translation?.sourceLanguage || 'en',
        targetLanguage: this.config.translation?.targetLanguage || 'nl',
        defaultProvider: this.config.translation?.defaultProvider || 'local',
        autoTranslateOnEdit:
          this.config.translation?.autoTranslateOnEdit ?? false,
        autoTranslateOnLoad:
          this.config.translation?.autoTranslateOnLoad ?? false,
        showCorrespondenceLines:
          this.config.translation?.showCorrespondenceLines ?? true,
        highlightOnHover: this.config.translation?.highlightOnHover ?? true,
        providers: {
          ...providers,
          // Ensure local provider is always available with defaults if not explicitly disabled
          local:
            providers.local !== null
              ? (providers.local ?? {
                  model: 'nllb-200-600m',
                  backend: 'auto',
                  mode: 'balanced',
                  downloadOnLoad: false,
                  useWebWorker: true,
                })
              : undefined,
        },
      };

      // Create translation module instance
      this.translation = new TranslationModule({
        config: translationConfig,
        changes: this.changes,
        markdown: this.markdown,
        exporter: this.exporter,
      });

      // Update UI if already initialized
      // This allows the translation button to become enabled after async load
      if (this.ui) {
        this.ui.updateTranslationModule(this.translation);
      }

      logger.info('Translation module loaded successfully');
    } catch (error) {
      logger.warn('Failed to load translation module', error);
      // Continue without translation - not a critical failure
    }
  }

  private deriveDraftFilename(): string {
    // For multi-page projects, use unified storage across all pages
    // This allows exports and git submissions to include all pages' changes
    // Element IDs contain filename prefixes, so we can filter operations by page
    return 'review-draft-project.json';
  }

  private async initialize(): Promise<void> {
    // Parse the rendered HTML to extract original elements
    this.changes.initializeFromDOM();

    // Initialize OAuth2-proxy authentication if configured
    // This will auto-login users based on oauth2-proxy headers
    initializeOAuth2ProxyAuth(this.user);

    // Update UI to show authenticated user (whether just logged in or already authenticated)
    this.ui.updateUserDisplay();

    // Initialize translation if enabled and created
    if (this.translation) {
      await this.translation.initialize();
    }

    // Set up UI event listeners
    this.ui.attachEventListeners();

    // Set up auto-save if enabled
    if (this.config.autoSave) {
      this.setupAutoSave();
    }
    this.ui.refresh();
  }

  private setupAutoSave(): void {
    // Register extension to persist after each operation
    // This ensures operations are saved immediately to prevent data loss
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const unregister = this.changes.registerExtension({
      id: 'persistence-auto-save',
      register(context) {
        // Listen for afterOperation event to persist changes immediately
        context.on('afterOperation', () => {
          // Schedule persistence on next animation frame to batch rapid operations
          requestAnimationFrame(() => {
            try {
              logger.debug('Persist operation triggered - saving to storage');
              self.ui.persistDocument();
              logger.debug('Persisted operation to localStorage');
            } catch (error) {
              logger.warn('Failed to persist operation', error);
            }
          });
        });
        logger.info('Persistence auto-save extension registered');
      },
    });

    // Store unregister function for cleanup
    (this as any).__persistenceUnregister = unregister;

    // Add beforeunload handler to persist changes before page navigation
    // This ensures changes aren't lost when user navigates to another page
    if (typeof window !== 'undefined') {
      const beforeUnloadHandler = () => {
        if (this.changes.hasUnsavedOperations()) {
          logger.info('Persisting document before page unload');
          this.ui.persistDocument();
        }
      };

      window.addEventListener('beforeunload', beforeUnloadHandler);

      // Store handler for cleanup
      (this as any).__beforeUnloadHandler = beforeUnloadHandler;
    }
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
    // Cleanup persistence extension
    const unregister = (this as any).__persistenceUnregister;
    if (typeof unregister === 'function') {
      unregister();
    }
    // Cleanup beforeunload handler
    const beforeUnloadHandler = (this as any).__beforeUnloadHandler;
    if (
      typeof window !== 'undefined' &&
      typeof beforeUnloadHandler === 'function'
    ) {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    }
    // Destroy translation module if enabled
    if (this.translation) {
      this.translation.destroy();
    }
    // Destroy UI module and all its submodules
    this.ui.destroy();
  }

  /**
   * Get translation module (if enabled)
   */
  public getTranslation(): TranslationModule | undefined {
    return this.translation;
  }
}

// Auto-initialize if data-review attribute is present
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const reviewElement = document.querySelector('[data-review]');
    if (reviewElement) {
      const config = reviewElement.getAttribute('data-review-config');
      const parsedConfig = config ? JSON.parse(config) : {};

      // For multi-page projects: merge with global config from previous pages
      // This ensures git config is available even if not injected on secondary pages
      if (!parsedConfig.git) {
        parsedConfig.git = mergeWithGlobalConfig(undefined);
      } else {
        // Store git config globally for other pages to use
        storeGlobalConfig({
          git: parsedConfig.git,
          timestamp: Date.now(),
        });
      }

      const quarto = new QuartoReview(parsedConfig);
      // Expose QuartoReview instance globally for debugging and advanced usage
      (window as any).__quarto = {
        instance: quarto,
        userModule: quarto.user,
        getTranslation: () => quarto.getTranslation(),
      };
    }
  });
}

export default QuartoReview;
