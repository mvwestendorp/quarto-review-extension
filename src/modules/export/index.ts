import { createModuleLogger } from '@utils/debug';
import ZipArchiveBuilder from '@utils/zip';
import type { ChangesModule } from '@modules/changes';
import type GitModule from '@modules/git';
import type { EmbeddedSourceRecord } from '@modules/git/fallback';

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

export interface ExportServiceOptions {
  git?: GitModule;
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

/**
 * Provides utility methods for exporting the current review state to QMD files.
 */
export class QmdExportService {
  private readonly git?: GitModule;

  constructor(
    private readonly changes: ChangesModule,
    options: ExportServiceOptions = {}
  ) {
    this.git = options.git;
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
    const files: ExportedFile[] = [
      {
        filename: primaryFilename,
        content:
          format === 'critic'
            ? this.changes.toTrackedMarkdown()
            : this.changes.toCleanMarkdown(),
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
  private shouldRenderFile(
    filename: string,
    patterns: string[]
  ): boolean {
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
