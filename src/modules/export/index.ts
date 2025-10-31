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

      if (this.isQmdFile(normalizedName)) {
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
      return { sources, hasProjectConfig };
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
        const base = last.replace(/\.(html?|htm)$/i, '');
        if (base) {
          return `${base}.qmd`;
        }
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

  private isQuartoConfig(filename: string | undefined): boolean {
    if (!filename) return false;
    return /(?:^|\/)_quarto\.ya?ml$/i.test(filename);
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
