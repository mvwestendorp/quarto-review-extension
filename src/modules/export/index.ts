import { createModuleLogger } from '@utils/debug';
import ZipArchiveBuilder from '@utils/zip';
import type { ChangesModule } from '@modules/changes';
import type { CommentsModule } from '@modules/comments';
import type GitModule from '@modules/git';
import type LocalDraftPersistence from '@modules/storage/LocalDraftPersistence';
import type { DraftElementPayload } from '@modules/storage/LocalDraftPersistence';
import type { EmbeddedSourceRecord } from '@modules/git/fallback';
import type { Comment, Element, Operation, EditData } from '@/types';
import {
  generateChanges,
  changesToCriticMarkup,
} from '@modules/changes/converters';
import {
  groupOperationsByPage,
  inferQmdFilenameFromPagePrefix,
  getPagePrefixesFromOperations,
  getPagePrefixFromElementId,
} from '@utils/page-utils';

const logger = createModuleLogger('QmdExportService');

export interface ExportedFile {
  filename: string;
  content: string;
  origin: 'active-document' | 'embedded' | 'project-config';
  primary?: boolean;
}

export interface ExportBundle {
  files: ExportedFile[];
  primaryFilename: string;
  suggestedArchiveName: string;
  format: ExportFormat;
  forceArchive?: boolean;
}

export interface ExportResult {
  fileCount: number;
  downloadedAs: string;
  filenames: string[];
}

export interface OperationSnapshot {
  filename: string;
  content: string;
  operation: Operation;
  index: number;
}

export interface ExportServiceOptions {
  git?: GitModule;
  localPersistence?: LocalDraftPersistence;
  comments?: CommentsModule;
}

export type ExportFormat = 'clean' | 'critic';

export interface ExportOptions {
  format?: ExportFormat;
}

interface ProjectContext {
  sources: EmbeddedSourceRecord[];
  hasProjectConfig: boolean;
  renderPatterns?: string[];
}

interface PersistedDraftSnapshot {
  elements: DraftElementPayload[];
  comments?: Comment[];
  operations?: Operation[];
}

type ElementSnapshot = {
  id: string;
  content: string;
  metadata?: Element['metadata'];
};

type CommentMarkupBlock = {
  critic?: string;
  html?: string;
};

/**
 * Provides utility methods for exporting the current review state to QMD files.
 */
export class QmdExportService {
  private readonly git?: GitModule;
  private readonly localPersistence?: LocalDraftPersistence;
  private readonly comments?: CommentsModule;

  constructor(
    private readonly changes: ChangesModule,
    options: ExportServiceOptions = {}
  ) {
    this.git = options.git;
    this.localPersistence = options.localPersistence;
    this.comments = options.comments;
  }

  /**
   * Create an export bundle containing the current document and any embedded sources.
   */
  public async createBundle(
    options: ExportOptions = {}
  ): Promise<ExportBundle> {
    const format: ExportFormat = options.format ?? 'clean';
    const primaryFilename = this.resolvePrimaryFilename();
    const projectContext = await this.resolveProjectContext();
    const files = await this.collectFiles(
      primaryFilename,
      format,
      projectContext
    );
    const deduped = this.deduplicateFiles(files);
    const suggestedArchiveName = this.suggestArchiveName(
      primaryFilename,
      format
    );
    const forceArchive = projectContext.hasProjectConfig || deduped.length > 1;
    return {
      files: deduped,
      primaryFilename,
      suggestedArchiveName,
      format,
      forceArchive,
    };
  }

  public async getOperationSnapshots(
    format: ExportFormat
  ): Promise<OperationSnapshot[]> {
    if (typeof this.changes.getOperations !== 'function') {
      return [];
    }
    const operations = this.changes.getOperations();
    if (!operations?.length) {
      return [];
    }

    const projectContext = await this.resolveProjectContext();
    const snapshots: OperationSnapshot[] = [];

    // Group operations by page prefix to determine which file each belongs to
    const operationsByPage = groupOperationsByPage(Array.from(operations));
    const pagePrefixes = Array.from(operationsByPage.keys());

    // Map page prefixes to source filenames
    const pageToSourceFile = new Map<string, string>();
    for (const source of projectContext.sources) {
      if (
        !source.filename ||
        (!this.isQmdFile(source.filename) && !this.isMdFile(source.filename))
      ) {
        continue;
      }
      for (const pagePrefix of pagePrefixes) {
        const inferredFilename = inferQmdFilenameFromPagePrefix(pagePrefix);
        if (
          source.filename === inferredFilename ||
          source.filename.includes(pagePrefix)
        ) {
          pageToSourceFile.set(pagePrefix, source.filename);
          break;
        }
      }
    }

    // Build snapshots for each operation, using the correct file for each page
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      if (!operation) continue;

      // Determine which page this operation belongs to
      const pagePrefix = operation.elementId.split('.')[0] || '';
      const primaryFilename = this.resolvePrimaryFilename();
      let filename = pageToSourceFile.get(pagePrefix);
      if (!filename) {
        const inferredFilename = inferQmdFilenameFromPagePrefix(pagePrefix);
        // If inference fails to match known sources, fall back to primary file
        const inferredRecord = projectContext.sources.find(
          (record) => record.filename === inferredFilename
        );
        filename = inferredRecord ? inferredFilename : primaryFilename;
      }

      const body =
        format === 'critic'
          ? (this.changes.toMarkdownSnapshot?.(i + 1) ??
            this.changes.toCleanMarkdownSnapshot?.(i + 1))
          : this.changes.toCleanMarkdownSnapshot?.(i + 1);
      if (!body) {
        continue;
      }

      // Find the source record for this specific file
      const sourceRecord =
        projectContext.sources.find((record) => record.filename === filename) ??
        projectContext.sources.find(
          (record) => record.filename === primaryFilename
        );
      const content = this.mergeFrontMatterWithTitle(
        sourceRecord?.content,
        body,
        null
      );

      snapshots.push({
        filename, // Correct filename for this page
        content,
        operation,
        index: i,
      });
    }

    return snapshots;
  }

  /**
   * Generate files and start the download.
   */
  public async exportToQmd(options: ExportOptions = {}): Promise<ExportResult> {
    const bundle = await this.createBundle(options);
    return this.downloadBundle(bundle);
  }

  /**
   * Generate download artifacts for the provided bundle.
   */
  public downloadBundle(bundle: ExportBundle): ExportResult {
    if (!bundle.files.length) {
      throw new Error('No QMD sources available to export');
    }

    if (typeof document === 'undefined') {
      throw new Error('Export is only supported in a browser environment');
    }

    const shouldArchive = bundle.forceArchive || bundle.files.length > 1;

    if (!shouldArchive) {
      const [file] = bundle.files;
      if (!file) {
        throw new Error('Export bundle missing file data');
      }
      const blob = new Blob([file.content], { type: 'text/markdown' });
      this.triggerDownload(blob, file.filename);
      logger.info('Exported single QMD file', {
        filename: file.filename,
        format: bundle.format,
      });
      return {
        fileCount: 1,
        downloadedAs: file.filename,
        filenames: [file.filename],
      };
    }

    const archive = new ZipArchiveBuilder();
    bundle.files.forEach((file) => {
      archive.addFile({
        filename: file.filename,
        content: file.content,
      });
    });

    const blob = archive.buildBlob();
    this.triggerDownload(blob, bundle.suggestedArchiveName);
    logger.info('Exported QMD archive', {
      filename: bundle.suggestedArchiveName,
      files: bundle.files.map((file) => file.filename),
      format: bundle.format,
    });

    return {
      fileCount: bundle.files.length,
      downloadedAs: bundle.suggestedArchiveName,
      filenames: bundle.files.map((file) => file.filename),
    };
  }

  private async collectFiles(
    primaryFilename: string,
    format: ExportFormat,
    context: ProjectContext
  ): Promise<ExportedFile[]> {
    const operations = this.changes.getOperations?.();
    const operationsByElement = this.groupOperationsByElement(
      Array.isArray(operations) ? operations : []
    );
    const currentElements = this.changes.getCurrentState?.() ?? [];
    const persistedDraft = await this.loadPersistedDraftSnapshot();
    const commentMap = this.buildCommentMarkupMap(persistedDraft?.comments);

    // Check if we have proper multi-page IDs (format: page.something)
    // Not multi-page if IDs are just simple IDs without dots (like p-1, p-2)
    const hasProperPagePrefixedIds =
      operations && operations.length > 0
        ? operations.some((op) => op.elementId && op.elementId.includes('.'))
        : false;

    let hasMultiPageChanges = false;
    if (hasProperPagePrefixedIds) {
      const pagePrefixes = getPagePrefixesFromOperations(
        Array.from(operations)
      );
      // Multi-page if we have proper page-prefixed IDs and multiple different prefixes
      hasMultiPageChanges = pagePrefixes.length > 1;
    }

    const pagePrefixes = operations
      ? getPagePrefixesFromOperations(Array.from(operations))
      : [];

    logger.debug('Export file collection', {
      operationCount: operations?.length ?? 0,
      pagePrefixes,
      hasProperPagePrefixedIds,
      isMultiPage: hasMultiPageChanges,
      primaryFilename,
      sourceFilesAvailable: context.sources.length,
    });

    if (hasMultiPageChanges) {
      logger.debug('Using multi-page export for multiple pages');
      return this.collectFilesMultiPage(
        format,
        context,
        currentElements,
        persistedDraft?.elements ?? [],
        commentMap,
        operationsByElement
      );
    }

    // Single-page export (original behavior)
    return this.collectFilesSinglePage(
      primaryFilename,
      format,
      context,
      currentElements,
      commentMap,
      operationsByElement
    );
  }

  private collectFilesSinglePage(
    primaryFilename: string,
    format: ExportFormat,
    context: ProjectContext,
    currentElements: Element[],
    commentMap: Map<string, CommentMarkupBlock>,
    operationsByElement: Map<string, Operation[]>
  ): ExportedFile[] {
    const primaryContent = this.buildPrimaryDocument(
      primaryFilename,
      format,
      context.sources,
      currentElements,
      commentMap,
      operationsByElement
    );
    const files: ExportedFile[] = [
      {
        filename: primaryFilename,
        content: primaryContent,
        origin: 'active-document',
        primary: true,
      },
    ];

    context.sources.forEach((record) => {
      if (!record?.filename) {
        return;
      }
      const normalizedName = record.filename;
      if (normalizedName === primaryFilename) {
        return;
      }

      if (this.isQmdFile(normalizedName) || this.isMdFile(normalizedName)) {
        // Check if this file should be rendered according to _quarto.yml
        if (
          context.renderPatterns &&
          !this.shouldRenderFile(normalizedName, context.renderPatterns)
        ) {
          logger.debug('Skipping file excluded by render patterns', {
            filename: normalizedName,
          });
          return;
        }

        files.push({
          filename: normalizedName,
          content: record.content,
          origin: 'embedded',
        });
        return;
      }

      if (this.isQuartoConfig(normalizedName)) {
        files.push({
          filename: normalizedName,
          content: record.content,
          origin: 'project-config',
        });
      }
    });

    return files;
  }

  private collectFilesMultiPage(
    format: ExportFormat,
    context: ProjectContext,
    currentElements: Element[],
    persistedElements: DraftElementPayload[],
    commentMap: Map<string, CommentMarkupBlock>,
    operationsByElement: Map<string, Operation[]>
  ): ExportedFile[] {
    const operations = Array.from(this.changes.getOperations?.() || []);
    const files: ExportedFile[] = [];
    const elementsByPage = this.buildElementsByPageMap(
      persistedElements,
      currentElements
    );

    // Group operations by page
    const operationsByPage = groupOperationsByPage(operations);
    const pagePrefixes = Array.from(operationsByPage.keys()).sort();

    logger.info('Exporting multi-page document', {
      pageCount: pagePrefixes.length,
      pages: pagePrefixes,
      totalOperations: operations.length,
      operationsByPageDetail: Array.from(operationsByPage.entries()).map(
        ([page, ops]) => ({ page, count: ops.length })
      ),
    });

    // Map each page prefix to its source file
    const pageToSourceFile = new Map<string, string>();
    for (const source of context.sources) {
      if (
        !source.filename ||
        (!this.isQmdFile(source.filename) && !this.isMdFile(source.filename))
      ) {
        continue;
      }

      // Try to match page prefix to source filename
      for (const pagePrefix of pagePrefixes) {
        // Extract the base name from the page prefix
        // Page prefixes from Quarto can be:
        //   Full path: "workspaces-quarto-review-extension-example-output-debug-example"
        //   or simple: "debug-example"
        //   or nested paths: "path/to/debug-example"
        // We need to match against source filenames like "debug-example.qmd"

        // Strategy: Try multiple extraction patterns
        let pageBaseName: string | null = null;

        // 1. Try splitting by '/' (for path-based prefixes) and take the last component
        const lastSlashComponent = pagePrefix.split('/').pop();
        if (lastSlashComponent && lastSlashComponent !== pagePrefix) {
          pageBaseName = lastSlashComponent;
        }

        // 2. If not found, the prefix might be a concatenated string like
        //    "workspaces-quarto-review-extension-example-output-debug-example"
        //    Try to match against source filenames by checking what
        //    comes after the last dash-separated component that matches a filename
        if (!pageBaseName) {
          for (const sourceFile of context.sources) {
            if (!sourceFile.filename) continue;
            const fileWithoutExt = sourceFile.filename.replace(/\.[^.]+$/, '');
            if (pagePrefix.endsWith(fileWithoutExt)) {
              pageBaseName = fileWithoutExt;
              break;
            }
          }
        }

        // 3. If still not found, use the prefix as-is (fallback)
        if (!pageBaseName) {
          pageBaseName = pagePrefix;
        }

        const inferredFilename = `${pageBaseName}.qmd`;
        const inferredMarkdownFilename = `${pageBaseName}.md`;

        // Match if:
        // 1. Source filename exactly matches the inferred filename
        // 2. Source filename ends with the inferred filename (e.g., "path/to/debug-example.qmd")
        if (
          source.filename === inferredFilename ||
          source.filename === inferredMarkdownFilename ||
          source.filename.endsWith(`/${inferredFilename}`) ||
          source.filename.endsWith(`/${inferredMarkdownFilename}`)
        ) {
          pageToSourceFile.set(pagePrefix, source.filename);
          break;
        }
      }
    }

    logger.debug('Page to source file mapping', {
      mapping: Array.from(pageToSourceFile.entries()),
      pagePrefixes,
      sourceFiles: context.sources
        .filter((s) => this.isQmdFile(s.filename) || this.isMdFile(s.filename))
        .map((s) => s.filename),
    });

    // Generate separate QMD file for each page with changes
    for (const pagePrefix of pagePrefixes) {
      // Determine the source filename first (before building content)
      // This ensures buildPageDocument can use the correct filename for lookups
      let sourceFilename = pageToSourceFile.get(pagePrefix);
      if (!sourceFilename) {
        // No source file mapping exists, use inferred filename from page prefix
        sourceFilename = inferQmdFilenameFromPagePrefix(pagePrefix);
        logger.debug(
          'No source file found for page prefix, using inferred filename',
          {
            pagePrefix,
            inferredFilename: sourceFilename,
          }
        );
      }

      const pageElements: ElementSnapshot[] =
        elementsByPage.get(pagePrefix) ??
        this.filterElementsByPrefix(currentElements, pagePrefix);
      if (!pageElements || pageElements.length === 0) {
        logger.warn('No element snapshots available for page export', {
          pagePrefix,
        });
        continue;
      }

      const pageContent = this.buildPageDocument(
        pagePrefix,
        format,
        context.sources,
        sourceFilename,
        pageElements,
        commentMap,
        operationsByElement
      );
      if (!pageContent) {
        continue;
      }

      files.push({
        filename: sourceFilename,
        content: pageContent,
        origin: 'active-document',
        primary: files.length === 0, // First file is primary
      });

      logger.debug('Added page to multi-page export', {
        pagePrefix,
        sourceFilename,
        contentLength: pageContent.length,
      });
    }

    // Build a set of already-generated filenames for quick lookup
    const generatedFilenames = new Set<string>();
    for (const sourceFile of pageToSourceFile.values()) {
      generatedFilenames.add(sourceFile);
    }

    // Include all embedded sources (respecting render patterns)
    // This ensures the exported zip contains a complete, working Quarto project
    context.sources.forEach((record) => {
      if (!record?.filename) {
        return;
      }
      const normalizedName = record.filename;

      // Skip page files already generated (they're included above with changes)
      if (generatedFilenames.has(normalizedName)) {
        return;
      }

      if (this.isQmdFile(normalizedName) || this.isMdFile(normalizedName)) {
        // Check if this file should be rendered according to _quarto.yml
        if (
          context.renderPatterns &&
          !this.shouldRenderFile(normalizedName, context.renderPatterns)
        ) {
          logger.debug('Skipping file excluded by render patterns', {
            filename: normalizedName,
          });
          return;
        }

        // Include ALL QMD/MD files - those with changes use updated content,
        // those without changes use original content
        files.push({
          filename: normalizedName,
          content: record.content,
          origin: 'embedded',
        });
        return;
      }

      if (this.isQuartoConfig(normalizedName)) {
        files.push({
          filename: normalizedName,
          content: record.content,
          origin: 'project-config',
        });
      }
    });

    // If we have multiple files or project config, force archive
    if (files.length > 0) {
      files[0]!.primary = true;
    }

    return files;
  }

  private buildPrimaryDocument(
    primaryFilename: string,
    format: ExportFormat,
    sources: EmbeddedSourceRecord[],
    currentElements: Element[],
    commentMap: Map<string, CommentMarkupBlock>,
    operationsByElement: Map<string, Operation[]>
  ): string {
    const body = this.buildBodyFromElements(
      currentElements,
      format,
      commentMap,
      operationsByElement
    );
    const pageTitle = this.extractTitleFromElements(currentElements);
    const sourceRecord = sources.find(
      (record) => record.filename === primaryFilename
    );
    return this.mergeFrontMatterWithTitle(
      sourceRecord?.content,
      body,
      pageTitle ?? this.getCurrentDocumentTitle()
    );
  }

  /**
   * Build a document for a specific page containing only its changes
   * Used in multi-page exports to generate separate QMD files per page
   */
  private buildPageDocument(
    pagePrefix: string,
    format: ExportFormat,
    sources: EmbeddedSourceRecord[],
    resolvedFilename: string,
    pageElements: ElementSnapshot[],
    commentMap: Map<string, CommentMarkupBlock>,
    operationsByElement: Map<string, Operation[]>
  ): string | null {
    const body = this.buildBodyFromElements(
      pageElements,
      format,
      commentMap,
      operationsByElement
    );
    if (!body.trim()) {
      logger.debug('Skipping page with no changes', { pagePrefix });
      return null;
    }

    const sourceRecord = sources.find(
      (record) => record.filename === resolvedFilename
    );

    const pageTitle = this.extractTitleFromElements(pageElements);

    return this.mergeFrontMatterWithTitle(
      sourceRecord?.content,
      body,
      pageTitle
    );
  }

  private buildBodyFromElements(
    elements: ElementSnapshot[],
    format: ExportFormat,
    commentMap: Map<string, CommentMarkupBlock>,
    operationsByElement: Map<string, Operation[]>
  ): string {
    if (!elements.length) {
      return '';
    }

    const sections = elements
      .filter((element) => {
        const type = element.metadata?.type;
        return type !== 'DocumentTitle' && type !== 'Title';
      })
      .map((element) =>
        this.renderElementContent(
          element,
          format,
          commentMap,
          operationsByElement
        )
      )
      .filter((segment) => segment && segment.trim().length > 0);

    return sections.join('\n\n');
  }

  private renderElementContent(
    element: ElementSnapshot,
    format: ExportFormat,
    commentMap: Map<string, CommentMarkupBlock>,
    operationsByElement: Map<string, Operation[]>
  ): string {
    let content = element.content;

    if (format === 'critic') {
      let tracked = false;
      try {
        content = this.changes.getElementContentWithTrackedChanges(element.id);
        tracked = true;
      } catch (error) {
        logger.debug(
          'Tracked changes unavailable from ChangesModule; using fallback',
          { elementId: element.id, error }
        );
      }
      if (!tracked) {
        const fallback = this.buildCriticContentFromOperations(
          element,
          operationsByElement.get(element.id)
        );
        if (fallback) {
          content = fallback;
        }
      }
    }

    const commentMarkup = commentMap.get(element.id);
    if (commentMarkup) {
      if (format === 'critic' && commentMarkup.critic) {
        content = this.appendCommentMarkup(content, commentMarkup.critic);
      } else if (format !== 'critic' && commentMarkup.html) {
        content = this.appendCommentMarkup(content, commentMarkup.html);
      }
    }

    return content;
  }

  private appendCommentMarkup(content: string, markup: string): string {
    const trimmed = content.replace(/\s+$/u, '');
    const separator = trimmed.length > 0 ? '\n\n' : '';
    return `${trimmed}${separator}${markup}`;
  }

  private buildCriticContentFromOperations(
    element: ElementSnapshot,
    operations: Operation[] | undefined
  ): string | null {
    if (!operations || !operations.length) {
      return null;
    }

    const firstEdit = operations.find((op) => op.type === 'edit');
    let baseline: string | undefined;

    if (firstEdit) {
      baseline = (firstEdit.data as EditData)?.oldContent;
    } else {
      const firstInsert = operations.find((op) => op.type === 'insert');
      if (firstInsert) {
        baseline = '';
      }
    }

    if (baseline === undefined) {
      return element.content;
    }

    const diffs = generateChanges(baseline, element.content);
    if (!diffs.length) {
      return element.content;
    }
    return changesToCriticMarkup(baseline, diffs);
  }

  private extractTitleFromElements(elements: ElementSnapshot[]): string | null {
    const titleElement = elements.find((element) => {
      const type = element.metadata?.type;
      return type === 'DocumentTitle' || type === 'Title';
    });
    return titleElement?.content?.trim() || null;
  }

  private mergeFrontMatterWithTitle(
    originalContent: string | undefined,
    body: string,
    title: string | null
  ): string {
    const normalizedBody = body.replace(/^\s+/, '');

    if (!originalContent) {
      if (!title) {
        return normalizedBody;
      }
      const frontMatter = this.buildFrontMatterFromTitle(title);
      return `${frontMatter}\n\n${normalizedBody}`;
    }

    const frontMatterBlock = this.extractFrontMatter(originalContent);
    if (!frontMatterBlock) {
      if (!title) {
        return normalizedBody;
      }
      const frontMatter = this.buildFrontMatterFromTitle(title);
      return `${frontMatter}\n\n${normalizedBody}`;
    }

    const updatedFrontMatter = title
      ? this.updateFrontMatterTitle(frontMatterBlock, title)
      : frontMatterBlock;
    return `${updatedFrontMatter}\n\n${normalizedBody}`;
  }

  private buildElementsByPageMap(
    persistedElements: DraftElementPayload[],
    currentElements: Element[]
  ): Map<string, ElementSnapshot[]> {
    const map = new Map<string, ElementSnapshot[]>();

    persistedElements.forEach((element) => {
      if (!element?.id) {
        return;
      }
      const prefix = getPagePrefixFromElementId(element.id);
      if (!prefix) {
        return;
      }
      if (!map.has(prefix)) {
        map.set(prefix, []);
      }
      map.get(prefix)!.push(this.toElementSnapshot(element));
    });

    const liveGroups = new Map<string, ElementSnapshot[]>();
    currentElements.forEach((element) => {
      const prefix = getPagePrefixFromElementId(element.id);
      if (!prefix) {
        return;
      }
      if (!liveGroups.has(prefix)) {
        liveGroups.set(prefix, []);
      }
      liveGroups.get(prefix)!.push({
        id: element.id,
        content: element.content,
        metadata: element.metadata,
      });
    });

    for (const [prefix, elements] of liveGroups.entries()) {
      map.set(prefix, elements);
    }

    return map;
  }

  private filterElementsByPrefix(
    elements: Element[],
    pagePrefix: string
  ): ElementSnapshot[] {
    return elements
      .filter((element) => element.id.startsWith(`${pagePrefix}.`))
      .map((element) => ({
        id: element.id,
        content: element.content,
        metadata: element.metadata,
      }));
  }

  private toElementSnapshot(element: DraftElementPayload): ElementSnapshot {
    return {
      id: element.id,
      content: element.content,
      metadata: element.metadata as Element['metadata'] | undefined,
    };
  }

  private buildCommentMarkupMap(
    persistedComments?: Comment[]
  ): Map<string, CommentMarkupBlock> {
    const map = new Map<string, CommentMarkupBlock>();
    const commentSource =
      typeof this.comments?.getAllComments === 'function'
        ? this.comments.getAllComments()
        : (persistedComments ?? []);

    if (!commentSource || commentSource.length === 0) {
      return map;
    }

    commentSource.forEach((comment) => {
      if (!comment || comment.resolved) {
        return;
      }
      const criticMarkup =
        typeof this.comments?.createComment === 'function'
          ? this.comments.createComment(comment.content || '')
          : this.createFallbackCommentMarkup(comment.content || '');
      const htmlMarkup = this.createHtmlCommentMarkup(comment.content || '');
      const existing = map.get(comment.elementId) ?? {};
      map.set(comment.elementId, {
        critic: existing.critic
          ? `${existing.critic} ${criticMarkup}`
          : criticMarkup,
        html: existing.html ? `${existing.html}\n${htmlMarkup}` : htmlMarkup,
      });
    });

    return map;
  }

  private createFallbackCommentMarkup(text: string): string {
    const trimmed = (text || '').replace(/\s+/g, ' ').trim();
    return `{>>${trimmed}<<}`;
  }

  private createHtmlCommentMarkup(text: string): string {
    const normalized = (text || '').trim();
    const sanitized = normalized
      .replace(/<!--/g, '&lt;!--')
      .replace(/-->/g, '--&gt;');
    return `<!-- ${sanitized} -->`;
  }

  private async loadPersistedDraftSnapshot(): Promise<PersistedDraftSnapshot | null> {
    if (!this.localPersistence?.loadDraft) {
      return null;
    }
    try {
      const draft =
        (await this.localPersistence.loadDraft()) as PersistedDraftSnapshot | null;
      if (!draft) {
        return null;
      }
      return {
        elements: Array.isArray(draft.elements) ? draft.elements : [],
        comments: Array.isArray(draft.comments) ? draft.comments : undefined,
        operations: Array.isArray(draft.operations)
          ? draft.operations
          : undefined,
      };
    } catch (error) {
      logger.warn('Failed to load persisted draft for export', error);
      return null;
    }
  }

  private groupOperationsByElement(
    operations: Operation[]
  ): Map<string, Operation[]> {
    const map = new Map<string, Operation[]>();
    operations.forEach((operation) => {
      if (!operation?.elementId) {
        return;
      }
      if (!map.has(operation.elementId)) {
        map.set(operation.elementId, []);
      }
      map.get(operation.elementId)!.push(operation);
    });
    return map;
  }

  private extractFrontMatter(source: string): string | null {
    const bomStripped = source.startsWith('\ufeff') ? source.slice(1) : source;
    if (!bomStripped.trimStart().startsWith('---')) {
      return null;
    }
    const frontMatterMatch = bomStripped.match(/^---\s*\r?\n[\s\S]*?\r?\n---/);
    if (!frontMatterMatch) {
      return null;
    }
    const matchText = frontMatterMatch[0];
    const start = bomStripped.indexOf(matchText);
    const end = start + matchText.length;
    return bomStripped.slice(start, end);
  }

  private updateFrontMatterTitle(frontMatter: string, title: string): string {
    const lines = frontMatter.split(/\r?\n/);
    if (lines.length < 2) {
      return frontMatter;
    }

    const closingIndex = lines.findIndex(
      (line, index) => index > 0 && line.trim() === '---'
    );
    if (closingIndex === -1) {
      return frontMatter;
    }

    const contentLines = lines.slice(1, closingIndex);
    const titleLine = `title: ${this.formatYamlString(title)}`;
    let replaced = false;

    const updatedContent = contentLines.map((line) => {
      const trimmed = line.trimStart();
      if (!replaced && /^title\s*:/i.test(trimmed)) {
        replaced = true;
        const indent = line.slice(0, line.length - trimmed.length);
        return `${indent}${titleLine}`;
      }
      return line;
    });

    if (!replaced) {
      updatedContent.unshift(titleLine);
    }

    return [lines[0], ...updatedContent, ...lines.slice(closingIndex)].join(
      '\n'
    );
  }

  private buildFrontMatterFromTitle(title: string): string {
    return ['---', `title: ${this.formatYamlString(title)}`, '---'].join('\n');
  }

  private getCurrentDocumentTitle(): string | null {
    const elements = this.changes.getCurrentState?.();
    if (!Array.isArray(elements)) {
      return null;
    }
    const titleElement = elements.find((element) => {
      const type = element.metadata?.type;
      return type === 'DocumentTitle' || type === 'Title';
    });
    return titleElement?.content?.trim() || null;
  }

  private formatYamlString(value: string): string {
    const escaped = value.replace(/"/g, '\\"');
    return `"${escaped}"`;
  }

  private deduplicateFiles(files: ExportedFile[]): ExportedFile[] {
    const seen = new Map<string, ExportedFile>();
    for (const file of files) {
      if (!seen.has(file.filename)) {
        seen.set(file.filename, file);
      } else if (file.primary) {
        // Ensure the active document wins if duplicate filenames exist.
        seen.set(file.filename, file);
      }
    }
    return Array.from(seen.values());
  }

  private async resolveProjectContext(): Promise<ProjectContext> {
    if (!this.git) {
      return { sources: [], hasProjectConfig: false };
    }

    try {
      const sources = await this.git.listEmbeddedSources();

      logger.info('Resolved project sources', {
        totalSources: sources.length,
        sourceFilenames: sources.map((s) => s.filename),
        qmdFiles: sources
          .filter(
            (s) => this.isQmdFile(s.filename) || this.isMdFile(s.filename)
          )
          .map((s) => s.filename),
        configFiles: sources
          .filter((s) => this.isQuartoConfig(s.filename))
          .map((s) => s.filename),
      });

      const hasProjectConfig = sources.some((record) =>
        this.isQuartoConfig(record.filename)
      );

      // Parse render patterns from _quarto.yml if it exists
      let renderPatterns: string[] | undefined;
      const quartoConfig = sources.find((record) =>
        this.isQuartoConfig(record.filename)
      );
      if (quartoConfig) {
        renderPatterns = this.parseRenderPatterns(quartoConfig.content);
      }

      return { sources, hasProjectConfig, renderPatterns };
    } catch (error) {
      logger.warn('Failed to read embedded sources for export', error);
      return { sources: [], hasProjectConfig: false };
    }
  }

  private resolvePrimaryFilename(): string {
    const configured = this.git?.getConfig()?.repository.sourceFile;
    if (configured && typeof configured === 'string' && configured.trim()) {
      return configured.trim();
    }
    if (typeof window !== 'undefined') {
      const path = window.location.pathname || '';
      const segments = path.split('/').filter(Boolean);
      const last = segments.pop();
      if (last) {
        // Check if the last segment looks like an HTML file
        if (/\.html?$/i.test(last)) {
          const base = last.replace(/\.(html?|htm)$/i, '');
          if (base) {
            return `${base}.qmd`;
          }
        }
        // If last segment exists but doesn't look like HTML, it might be a folder
        // Fall through to check for index.html
      }

      // If pathname ends with / or we couldn't extract a filename,
      // we're likely at a directory being served with index.html
      // Default to index.qmd instead of document.qmd
      if (path.endsWith('/') || !last) {
        return 'index.qmd';
      }
    }
    return 'document.qmd';
  }

  private suggestArchiveName(
    primaryFilename: string,
    format: ExportFormat
  ): string {
    const baseName = primaryFilename.replace(/\.qmd$/i, '') || 'export';
    const slug = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
    const formatSuffix = format === 'critic' ? '-critic' : '';
    return `${slug}${formatSuffix}-${timestamp}.zip`;
  }

  private isQmdFile(filename: string | undefined): boolean {
    if (!filename) return false;
    return filename.toLowerCase().endsWith('.qmd');
  }

  private isMdFile(filename: string | undefined): boolean {
    if (!filename) return false;
    return filename.toLowerCase().endsWith('.md');
  }

  private isQuartoConfig(filename: string | undefined): boolean {
    if (!filename) return false;
    return /(?:^|\/)_quarto\.ya?ml$/i.test(filename);
  }

  /**
   * Parse render patterns from _quarto.yml content.
   * Returns array of patterns, or undefined if no render config found.
   */
  private parseRenderPatterns(configContent: string): string[] | undefined {
    try {
      // Simple YAML parsing for render list
      // Look for "render:" followed by a list of patterns
      const renderMatch = configContent.match(
        /^[ \t]*render:\s*\n((?:[ \t]+-.+\n?)+)/m
      );
      if (!renderMatch) {
        // No render config means all .qmd and .md files should be rendered
        return undefined;
      }

      const renderSection = renderMatch[1];
      if (!renderSection) {
        return undefined;
      }
      const patterns: string[] = [];

      // Extract each pattern from the list
      const patternMatches = renderSection.matchAll(/^[ \t]+-[ \t]+(.+)$/gm);
      for (const match of patternMatches) {
        const capturedPattern = match[1];
        if (!capturedPattern) continue;
        let pattern = capturedPattern.trim();
        // Remove quotes if present
        pattern = pattern.replace(/^["']|["']$/g, '');
        if (pattern) {
          patterns.push(pattern);
        }
      }

      logger.debug('Parsed render patterns from _quarto.yml', { patterns });
      return patterns.length > 0 ? patterns : undefined;
    } catch (error) {
      logger.warn('Failed to parse render patterns from _quarto.yml', error);
      return undefined;
    }
  }

  /**
   * Check if a file should be rendered based on render patterns.
   * Implements Quarto's render pattern logic:
   * - Patterns can be explicit files (index.qmd)
   * - Patterns can be globs (processes/*.qmd)
   * - Patterns starting with ! are negations
   * - Later patterns override earlier ones
   */
  private shouldRenderFile(filename: string, patterns: string[]): boolean {
    let shouldRender = false;

    for (const pattern of patterns) {
      const isNegation = pattern.startsWith('!');
      const actualPattern = isNegation ? pattern.slice(1) : pattern;

      if (this.matchesPattern(filename, actualPattern)) {
        shouldRender = !isNegation;
      }
    }

    return shouldRender;
  }

  /**
   * Check if a filename matches a glob pattern.
   * Supports:
   * - Exact matches: index.qmd
   * - Wildcards: *.qmd, *.md
   * - Directory globs: processes/*.qmd
   * - Recursive globs would need more complex logic, but not used in example
   */
  private matchesPattern(filename: string, pattern: string): boolean {
    // Exact match
    if (filename === pattern) {
      return true;
    }

    // Convert glob pattern to regex
    // Escape regex special chars except * and /
    let regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '[^/]*');

    // Anchor the pattern
    regexPattern = `^${regexPattern}$`;

    try {
      const regex = new RegExp(regexPattern);
      return regex.test(filename);
    } catch (error) {
      logger.warn('Invalid glob pattern', { pattern, error });
      return false;
    }
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      document.body?.removeChild(anchor);
      URL.revokeObjectURL(url);
    }, 0);
  }
}

export default QmdExportService;
