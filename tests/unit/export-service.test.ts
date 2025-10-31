import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { QmdExportService } from '@modules/export';

describe('QmdExportService', () => {
  const createChangesStub = (
    options: {
      clean?: string;
      critic?: string;
    } = {}
  ) => ({
    toCleanMarkdown: vi.fn().mockReturnValue(options.clean ?? 'updated content'),
    toTrackedMarkdown: vi.fn().mockReturnValue(
      options.critic ?? 'tracked content'
    ),
  });

  const createGitStub = (sourceFile = 'document.qmd') => ({
    getConfig: vi.fn().mockReturnValue({
      repository: {
        sourceFile,
      },
    }),
    listEmbeddedSources: vi.fn().mockResolvedValue([]),
  });

  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('creates bundle with the active document content', async () => {
    const changes = createChangesStub({ clean: 'final markdown', critic: 'crit' });
    const git = createGitStub('article.qmd');
    const service = new QmdExportService(changes as any, { git: git as any });

    const bundle = await service.createBundle();

    expect(bundle.primaryFilename).toBe('article.qmd');
    expect(bundle.files).toHaveLength(1);
    expect(bundle.files[0]?.content).toBe('final markdown');
    expect(changes.toCleanMarkdown).toHaveBeenCalled();
    expect(bundle.format).toBe('clean');
    expect(bundle.forceArchive).toBe(false);
  });

  it('includes project sources and forces archive when _quarto.yml is present', async () => {
    const changes = createChangesStub({ clean: 'primary content' });
    const git = createGitStub('article.qmd');
    git.listEmbeddedSources = vi.fn().mockResolvedValue([
      {
        filename: 'article.qmd',
        content: 'original content',
        originalContent: 'original content',
        lastModified: new Date().toISOString(),
        version: '1',
      },
      {
        filename: 'notes.qmd',
        content: 'notes markdown',
        originalContent: 'notes markdown',
        lastModified: new Date().toISOString(),
        version: '1',
      },
      {
        filename: '_quarto.yml',
        content: 'project: website',
        originalContent: 'project: website',
        lastModified: new Date().toISOString(),
        version: '1',
      },
      {
        filename: 'draft.json',
        content: '{}',
        originalContent: '{}',
        lastModified: new Date().toISOString(),
        version: '1',
      },
    ]);

    const service = new QmdExportService(changes as any, { git: git as any });
    const bundle = await service.createBundle();

    const filenames = bundle.files.map((file) => file.filename);
    expect(filenames).toContain('article.qmd');
    expect(filenames).toContain('notes.qmd');
    expect(filenames).toContain('_quarto.yml');
    expect(filenames).not.toContain('draft.json');
    expect(bundle.files).toHaveLength(3);
    expect(bundle.forceArchive).toBe(true);
  });

  it('downloads a single file bundle directly', async () => {
    vi.useFakeTimers();
    const changes = createChangesStub({ clean: 'single file' });
    const git = createGitStub('doc.qmd');
    const service = new QmdExportService(changes as any, { git: git as any });

    const bundle = await service.createBundle();

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => void 0);

    const revokeSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => void 0);

    URL.createObjectURL = vi.fn().mockReturnValue('blob:test');

    const result = service.downloadBundle(bundle);

    expect(result.fileCount).toBe(1);
    expect(result.downloadedAs).toBe('doc.qmd');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalled();

    vi.runAllTimers();
    expect(revokeSpy).toHaveBeenCalledWith('blob:test');
  });

  it('creates a ZIP archive when exporting multiple files', async () => {
    vi.useFakeTimers();
    const changes = createChangesStub({ clean: 'primary' });
    const git = createGitStub('primary.qmd');
    git.listEmbeddedSources = vi.fn().mockResolvedValue([
      {
        filename: 'secondary.qmd',
        content: 'secondary content',
        originalContent: 'secondary content',
        lastModified: new Date().toISOString(),
        version: '1',
      },
    ]);

    const service = new QmdExportService(changes as any, { git: git as any });
    const bundle = await service.createBundle();

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => void 0);
    const revokeSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => void 0);
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:zip');

    const result = service.downloadBundle(bundle);

    expect(result.fileCount).toBe(2);
    expect(result.downloadedAs).toBe(bundle.suggestedArchiveName);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalled();
    const blobPassed = createSpy.mock.calls[0]?.[0];
    expect(blobPassed).toBeInstanceOf(Blob);

    vi.runAllTimers();
    expect(revokeSpy).toHaveBeenCalledWith('blob:zip');
  });

  it('exports with critic markup when requested', async () => {
    const changes = createChangesStub({
      clean: 'clean version',
      critic: 'critic version',
    });
    const git = createGitStub('story.qmd');
    const service = new QmdExportService(changes as any, { git: git as any });

    const bundle = await service.createBundle({ format: 'critic' });

    expect(changes.toTrackedMarkdown).toHaveBeenCalled();
    expect(bundle.files[0]?.content).toBe('critic version');
    expect(bundle.format).toBe('critic');
    expect(bundle.suggestedArchiveName).toMatch(/critic-/);
  });
});
