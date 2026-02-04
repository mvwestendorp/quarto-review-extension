import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { QmdExportService } from '@modules/export';
import type { Comment, Operation } from '@/types';

describe('QmdExportService', () => {
  const createChangesStub = (
    options: {
      clean?: string;
      critic?: string;
      title?: string;
      body?: string;
      includeTitle?: boolean;
      operations?: Operation[];
      cleanSnapshots?: string[];
      criticSnapshots?: string[];
      elements?: Array<{
        id: string;
        content: string;
        metadata: { type: string };
      }>;
    } = {}
  ) => {
    const elements: Array<{
      id: string;
      content: string;
      metadata: { type: string };
    }> = options.elements ? [...options.elements] : [];

    if (!options.elements) {
      const includeTitle =
        options.includeTitle ?? (typeof options.title === 'string');
      if (includeTitle) {
        elements.push({
          id: 'doc-title',
          content: options.title ?? 'Document Title',
          metadata: { type: 'Title' },
        });
      }

      elements.push({
        id: 'body-1',
        content: options.body ?? options.clean ?? 'updated content',
        metadata: { type: 'Para' },
      });
    }

    const resolveSnapshot = (
      snapshots: string[] | undefined,
      fallback: string | undefined
    ) => {
      return (count?: number) => {
        if (typeof count === 'number' && count > 0) {
          return snapshots?.[count - 1] ?? fallback ?? elements[1]?.content ?? '';
        }
        return fallback ?? elements[1]?.content ?? '';
      };
    };

    return {
      toCleanMarkdown: vi
        .fn()
        .mockReturnValue(options.clean ?? 'updated content'),
      toTrackedMarkdown: vi
        .fn()
        .mockReturnValue(options.critic ?? 'tracked content'),
      getCurrentState: vi.fn().mockReturnValue(elements),
      getElementContentWithTrackedChanges: vi
        .fn()
        .mockImplementation((elementId: string) => {
          const element = elements.find((el) => el.id === elementId);
          if (!element) {
            return '';
          }
          if (elementId === 'body-1') {
            return options.critic ?? element.content;
          }
          return element.content;
        }),
      getOperations: vi.fn().mockReturnValue(options.operations ?? []),
      toCleanMarkdownSnapshot: vi
        .fn()
        .mockImplementation(
          resolveSnapshot(
            options.cleanSnapshots,
            options.clean ?? options.body ?? 'updated content'
          )
        ),
      toMarkdownSnapshot: vi
        .fn()
        .mockImplementation(
          resolveSnapshot(
            options.criticSnapshots,
            options.critic ?? options.body ?? options.clean ?? 'updated content'
          )
        ),
    };
  };

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
    expect(changes.getCurrentState).toHaveBeenCalled();
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
        content: [
          'project:',
          '  type: website',
          'chapters:',
          '  - article.qmd',
          '  - notes.qmd',
        ].join('\n'),
        originalContent: '',
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

  it('reconstructs front matter and updates the title from editor state', async () => {
    const changes = createChangesStub({
      clean: '# Body Content',
      title: 'Edited Title',
    });
    const git = createGitStub('debug-example.qmd');
    git.listEmbeddedSources = vi.fn().mockResolvedValue([
      {
        filename: 'debug-example.qmd',
        content: [
          '---',
          'title: "Debug Mode Example"',
          'format: html',
          '---',
          '',
          '# Original Body',
        ].join('\n'),
        originalContent: '',
        lastModified: new Date().toISOString(),
        version: '1',
      },
    ]);

    const service = new QmdExportService(changes as any, { git: git as any });
    const bundle = await service.createBundle();

    const exported = bundle.files[0]?.content ?? '';
    expect(exported.startsWith('---')).toBe(true);
    expect(exported).toContain('title: "Edited Title"');
    expect(exported).toContain('format: html');
    expect(exported.trimEnd().endsWith('# Body Content')).toBe(true);
  });

  it('includes unresolved comments as HTML comments in clean exports', async () => {
    const changes = createChangesStub({
      clean: 'Paragraph content',
    });
    const git = createGitStub('article.qmd');
    const comment: Comment = {
      id: 'comment-1',
      elementId: 'body-1',
      content: 'Needs clarification',
      resolved: false,
      timestamp: Date.now(),
      userId: 'tester',
      type: 'comment',
    };
    const commentsModule = {
      getAllComments: vi.fn().mockReturnValue([comment]),
      createComment: vi
        .fn()
        .mockImplementation((text: string) => `{>>${text}<<}`),
    };

    const service = new QmdExportService(changes as any, {
      git: git as any,
      comments: commentsModule as any,
    });
    const bundle = await service.createBundle();

    const exported = bundle.files[0]?.content ?? '';
    expect(exported).toContain('<!-- Needs clarification -->');
    expect(exported).not.toContain('{>>Needs clarification<<}');
  });

  it('includes CriticMarkup comments in critic exports', async () => {
    const changes = createChangesStub({
      clean: 'Paragraph content',
      critic: 'Paragraph content with critic',
    });
    const git = createGitStub('article.qmd');
    const comment: Comment = {
      id: 'comment-1',
      elementId: 'body-1',
      content: 'Needs clarification',
      resolved: false,
      timestamp: Date.now(),
      userId: 'tester',
      type: 'comment',
    };
    const commentsModule = {
      getAllComments: vi.fn().mockReturnValue([comment]),
      createComment: vi
        .fn()
        .mockImplementation((text: string) => `{>>${text}<<}`),
    };

    const service = new QmdExportService(changes as any, {
      git: git as any,
      comments: commentsModule as any,
    });
    const bundle = await service.createBundle({ format: 'critic' });

    const exported = bundle.files[0]?.content ?? '';
    expect(exported).toContain('{>>Needs clarification<<}');
  });

  it('does not create new files for unmapped page prefixes', async () => {
    const operations: Operation[] = [
      {
        id: 'op-1',
        type: 'edit',
        elementId: 'index.para-1',
        timestamp: 1,
        data: {
          type: 'edit',
          oldContent: 'Original paragraph',
          newContent: 'Updated paragraph',
          changes: [],
        },
      },
      {
        id: 'op-2',
        type: 'insert',
        elementId: 'temp-new.section-1',
        timestamp: 2,
        data: {
          type: 'insert',
          content: 'New section',
          metadata: { type: 'Para' },
          position: { after: 'index.para-1' },
        },
      },
    ];

    const changes = createChangesStub({
      elements: [
        {
          id: 'index.para-1',
          content: 'Updated paragraph',
          metadata: { type: 'Para' },
        },
        {
          id: 'temp-new.section-1',
          content: 'New section',
          metadata: { type: 'Para' },
        },
      ],
      operations,
    });

    const git = createGitStub('document.qmd');
    git.listEmbeddedSources = vi.fn().mockResolvedValue([
      {
        filename: 'document.qmd',
        content: 'Original paragraph',
        originalContent: 'Original paragraph',
        lastModified: new Date().toISOString(),
        version: '1',
      },
    ]);

    const service = new QmdExportService(changes as any, { git: git as any });
    const bundle = await service.createBundle();

    const filenames = bundle.files.map((file) => file.filename);
    expect(filenames).toEqual(['document.qmd']);
  });

  it('exports newly inserted sections into the primary document', async () => {
    const operations: Operation[] = [
      {
        id: 'op-1',
        type: 'insert',
        elementId: 'index.section-2',
        timestamp: 1,
        data: {
          type: 'insert',
          content: '## Added Section\n\nNew insights here.',
          metadata: { type: 'Header' },
          position: { after: 'index.section-1' },
        },
      },
    ];

    const cleanContent = ['# Existing Title', '', 'Original body.'].join('\n');
    const newSection = ['## Added Section', '', 'New insights here.'].join('\n');

    const changes = createChangesStub({
      clean: `${cleanContent}\n\n${newSection}`,
      elements: [
        {
          id: 'index.section-1',
          content: cleanContent,
          metadata: { type: 'Para' },
        },
        {
          id: 'index.section-2',
          content: newSection,
          metadata: { type: 'Para' },
        },
      ],
      operations,
    });

    const git = createGitStub('document.qmd');
    git.listEmbeddedSources = vi.fn().mockResolvedValue([
      {
        filename: 'document.qmd',
        content: cleanContent,
        originalContent: cleanContent,
        lastModified: new Date().toISOString(),
        version: '1',
      },
    ]);

    const service = new QmdExportService(changes as any, { git: git as any });
    const bundle = await service.createBundle();
    const exported = bundle.files[0]?.content ?? '';

    expect(exported).toContain('# Existing Title');
    expect(exported).toContain('Original body.');
    expect(exported).toContain('## Added Section');
    expect(exported).toContain('New insights here.');
  });

  describe('chunk metadata reconstruction from DOM', () => {
    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('re-injects fig-cap metadata for figure chunks', async () => {
      document.body.innerHTML = `
        <div class="cell">
          <div data-review-id="demo.codeblock-1" class="review-editable" data-review-type="CodeBlock"></div>
          <div class="cell-output-display">
            <div id="fig-cars" class="quarto-float quarto-figure">
              <figure>
                <figcaption>Figure 1: Figure caption text</figcaption>
              </figure>
            </div>
          </div>
        </div>
      `;

      const mockGit = createGitStub('document.qmd');
      const changes = createChangesStub({
        clean: ['```{r}', 'plot(cars)', '```'].join('\n'),
        critic: ['```{r}', 'plot(cars)', '```'].join('\n'),
        elements: [
          {
            id: 'demo.codeblock-1',
            content: ['```{r}', 'plot(cars)', '```'].join('\n'),
            metadata: { type: 'CodeBlock' },
          },
        ],
      });

      const service = new QmdExportService(changes as any, { git: mockGit as any });
      const bundle = await service.createBundle({ format: 'clean' });
      const file = bundle.files[0];
      expect(file?.content).toContain('#| label: fig-cars');
      expect(file?.content).toContain('#| fig-cap: "Figure caption text"');
    });

    it('re-injects tbl-cap metadata for table chunks', async () => {
      document.body.innerHTML = `
        <div class="cell">
          <div data-review-id="demo.codeblock-2" class="review-editable" data-review-type="CodeBlock"></div>
          <div class="cell-output-display">
            <div id="tbl-data" class="quarto-float quarto-table">
              <figure>
                <figcaption>Table 2: Table caption text</figcaption>
              </figure>
            </div>
          </div>
        </div>
      `;

      const mockGit = createGitStub('document.qmd');
      const changes = createChangesStub({
        clean: ['```{r}', 'plot(cars)', '```'].join('\n'),
        critic: ['```{r}', 'plot(cars)', '```'].join('\n'),
        elements: [
          {
            id: 'demo.codeblock-2',
            content: ['```{r}', 'plot(cars)', '```'].join('\n'),
            metadata: { type: 'CodeBlock' },
          },
        ],
      });

      const service = new QmdExportService(changes as any, { git: mockGit as any });
      const bundle = await service.createBundle({ format: 'clean' });
      const file = bundle.files[0];
      expect(file?.content).toContain('#| label: tbl-data');
      expect(file?.content).toContain('#| tbl-cap: "Table caption text"');
    });

    it('omits code output blocks when exporting', async () => {
      document.body.innerHTML = `
        <div class="cell">
          <div data-review-id="demo.codeblock-3" class="review-editable" data-review-type="CodeBlock"></div>
          <div class="cell-output cell-output-stdout">
            <div data-review-id="demo.codeblock-4" class="review-editable" data-review-type="CodeBlock"></div>
          </div>
        </div>
      `;

      const mockGit = createGitStub('document.qmd');
      const changes = createChangesStub({
        clean: [
          '```{r}',
          'plot(cars)',
          '```',
          '',
          '```',
          '[1] "Some code that is not editable."',
          '```',
        ].join('\n'),
        critic: [
          '```{r}',
          'plot(cars)',
          '```',
          '',
          '```',
          '[1] "Some code that is not editable."',
          '```',
        ].join('\n'),
        elements: [
          {
            id: 'demo.codeblock-3',
            content: ['```{r}', 'plot(cars)', '```'].join('\n'),
            metadata: { type: 'CodeBlock' },
          },
          {
            id: 'demo.codeblock-4',
            content: ['```', '[1] "Some code that is not editable."', '```'].join('\n'),
            metadata: { type: 'CodeBlock' },
          },
        ],
      });

      const service = new QmdExportService(changes as any, { git: mockGit as any });
      const bundle = await service.createBundle({ format: 'clean' });
      const file = bundle.files[0];
      expect(file?.content).toContain('```{r}');
      expect(file?.content).not.toContain('[1] "Some code that is not editable."');
    });
  });

  it('omits the document title element from the exported body', async () => {
    const changes = createChangesStub({
      clean: '# Body Content',
      title: 'Front Matter Title',
    });
    const git = createGitStub('doc.qmd');
    git.listEmbeddedSources = vi.fn().mockResolvedValue([
      {
        filename: 'doc.qmd',
        content: ['---', 'title: "Original"', '---', '', 'Body'].join('\n'),
        originalContent: '',
        lastModified: new Date().toISOString(),
        version: '1',
      },
    ]);

    const service = new QmdExportService(changes as any, { git: git as any });
    const bundle = await service.createBundle();
    const fileContent = bundle.files[0]?.content ?? '';

    const sections = fileContent.split('---').filter((part) => part.trim());
    expect(fileContent).toContain('title: "Front Matter Title"');
    const body = sections[sections.length - 1]?.trim() ?? '';
    expect(body.startsWith('# Body Content')).toBe(true);
    // Ensure the plain title text doesn't appear outside the YAML front matter.
    const bodyWithoutYaml = fileContent.split('---\n\n').pop() ?? '';
    expect(bodyWithoutYaml).not.toMatch(/^\s*Front Matter Title\s*$/m);
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

    expect(changes.getElementContentWithTrackedChanges).toHaveBeenCalled();
    expect(bundle.files[0]?.content).toBe('critic version');
    expect(bundle.format).toBe('critic');
    expect(bundle.suggestedArchiveName).toMatch(/critic-/);
  });

  it('merges persisted elements for pages missing from the current DOM', async () => {
    const changes = createChangesStub({
      elements: [
        {
          id: 'document.para-1',
          content: 'Document updated',
          metadata: { type: 'Para' },
        },
      ],
      operations: [
        {
          id: 'op-1',
          type: 'edit',
          elementId: 'document.para-1',
          timestamp: Date.now(),
          data: {
            type: 'edit',
            oldContent: 'Document original',
            newContent: 'Document updated',
            changes: [],
          },
        },
        {
          id: 'op-2',
          type: 'edit',
          elementId: 'chapter-two.para-1',
          timestamp: Date.now(),
          data: {
            type: 'edit',
            oldContent: 'Chapter original',
            newContent: 'Chapter updated',
            changes: [],
          },
        },
      ],
    });
    const git = createGitStub('document.qmd');
    git.listEmbeddedSources = vi.fn().mockResolvedValue([
      {
        filename: 'document.qmd',
        content: 'Document original',
        originalContent: 'Document original',
        lastModified: new Date().toISOString(),
        version: '1',
      },
      {
        filename: 'chapter-two.qmd',
        content: 'Chapter original',
        originalContent: 'Chapter original',
        lastModified: new Date().toISOString(),
        version: '1',
      },
    ]);
    const localPersistence = {
      loadDraft: vi.fn().mockResolvedValue({
        elements: [
          {
            id: 'chapter-two.para-1',
            content: 'Chapter updated',
            metadata: { type: 'Para' },
          },
        ],
        comments: [],
        operations: [],
      }),
    };

    const service = new QmdExportService(changes as any, {
      git: git as any,
      localPersistence: localPersistence as any,
    });
    const bundle = await service.createBundle();

    const chapterFile = bundle.files.find(
      (file) => file.filename === 'chapter-two.qmd'
    );
    expect(chapterFile).toBeDefined();
    expect(chapterFile?.content).toContain('Chapter updated');
  });

  it('builds operation snapshots for each change step', async () => {
    const operations: Operation[] = [
      {
        id: 'op-1',
        type: 'edit',
        elementId: 'body-1',
        timestamp: 1,
        userId: 'alice',
        data: {
          type: 'edit',
          oldContent: 'Original body',
          newContent: 'Original body updated',
          changes: [],
        },
      },
      {
        id: 'op-2',
        type: 'insert',
        elementId: 'body-2',
        timestamp: 2,
        userId: 'alice',
        data: {
          type: 'insert',
          content: 'Inserted paragraph',
          metadata: { type: 'Para' },
          position: { after: 'body-1' },
        },
      },
    ];

    const changes = createChangesStub({
      clean: 'final body',
      operations,
      cleanSnapshots: ['Body after edit', 'Body after insert'],
    });
    const git = createGitStub('article.qmd');
    git.listEmbeddedSources = vi.fn().mockResolvedValue([
      {
        filename: 'article.qmd',
        content: [
          '---',
          'title: "Original Title"',
          'format: html',
          '---',
          '',
          'Original body',
        ].join('\n'),
        originalContent: '',
        lastModified: new Date().toISOString(),
        version: '1',
      },
    ]);

    const service = new QmdExportService(changes as any, { git: git as any });
    const snapshots = await service.getOperationSnapshots('clean');

    expect(changes.getOperations).toHaveBeenCalled();
    expect(changes.toCleanMarkdownSnapshot).toHaveBeenCalledWith(1);
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]?.operation).toBe(operations[0]);
    expect(snapshots[0]?.content).toContain('format: html');
    expect(snapshots[0]?.content).toContain('Body after edit');
    expect(snapshots[1]?.content).toContain('Body after insert');
  });



  it('patchSourceWithTrackedChanges replaces only the edited element', () => {
    // Original .qmd source — three body paragraphs separated by blank lines.
    // Line numbers (1-indexed) that sourcePosition references:
    //   line 5 → "First paragraph here."
    //   line 7 → "Second paragraph here."   ← the only edit
    //   line 9 → "Third paragraph here."
    const originalSource = [
      '---',
      'title: "My Doc"',
      '---',
      '',
      'First paragraph here.',
      '',
      'Second paragraph here.',
      '',
      'Third paragraph here.',
    ].join('\n');

    const operations: Operation[] = [
      {
        id: 'op-1',
        type: 'edit',
        elementId: 'p-2',
        timestamp: 1,
        data: {
          type: 'edit',
          oldContent: 'Second paragraph here.',
          newContent: 'Second paragraph EDITED.',
          changes: [],
        },
      },
    ];

    const originalElements = [
      {
        id: 'p-1',
        content: 'First paragraph here.',
        metadata: { type: 'Para' },
        sourcePosition: { line: 5, column: 1 },
      },
      {
        id: 'p-2',
        content: 'Second paragraph here.',
        metadata: { type: 'Para' },
        sourcePosition: { line: 7, column: 1 },
      },
      {
        id: 'p-3',
        content: 'Third paragraph here.',
        metadata: { type: 'Para' },
        sourcePosition: { line: 9, column: 1 },
      },
    ];

    const currentElements = [
      { id: 'p-1', content: 'First paragraph here.', metadata: { type: 'Para' } },
      { id: 'p-2', content: 'Second paragraph EDITED.', metadata: { type: 'Para' } },
      { id: 'p-3', content: 'Third paragraph here.', metadata: { type: 'Para' } },
    ];

    const changes = {
      getOperations: vi.fn().mockReturnValue(operations),
      getStateAfterOperations: vi
        .fn()
        .mockImplementation((count?: number) =>
          count === 0 ? originalElements : currentElements
        ),
      getCurrentState: vi.fn().mockReturnValue(currentElements),
    };

    const service = new QmdExportService(changes as any);
    const result = service.patchSourceWithTrackedChanges(originalSource);

    // Expected output is identical to the original in every way except line 7.
    const expected = [
      '---',
      'title: "My Doc"',
      '---',
      '',
      'First paragraph here.',
      '',
      'Second paragraph EDITED.',
      '',
      'Third paragraph here.',
    ].join('\n');

    expect(result).toBe(expected);
  });

  // ---------------------------------------------------------------------------
  // P0.1 regression tests – these exercise the three bailout paths that cause
  // patchSourceWithTrackedChanges to return null and fall back to full-document
  // reconstruction (which rewrites every list marker, re-wraps paragraphs, etc.)
  // ---------------------------------------------------------------------------

  it('patchSourceWithTrackedChanges handles chained inserts (insert after another insert)', () => {
    // Chained insert: D is inserted after A, then E is inserted after D.
    // The anchor for E (element D) is itself an insert with no sourcePosition,
    // so the current code bails with `return null`.  The fix should resolve the
    // chain and place both inserts in operation order after A.
    const originalSource = [
      '---',
      'title: "Test"',
      '---',
      '',
      'Paragraph A.',
      '',
      'Paragraph B.',
    ].join('\n');

    const operations: Operation[] = [
      {
        id: 'op-insert-d',
        type: 'insert',
        elementId: 'p-d',
        timestamp: 1,
        data: {
          type: 'insert',
          content: 'Paragraph D.',
          position: { after: 'p-a' },
        },
      },
      {
        id: 'op-insert-e',
        type: 'insert',
        elementId: 'p-e',
        timestamp: 2,
        data: {
          type: 'insert',
          content: 'Paragraph E.',
          position: { after: 'p-d' }, // anchor is itself an insert
        },
      },
    ];

    const originalElements = [
      {
        id: 'p-a',
        content: 'Paragraph A.',
        metadata: { type: 'Para' },
        sourcePosition: { line: 5, column: 1 },
      },
      {
        id: 'p-b',
        content: 'Paragraph B.',
        metadata: { type: 'Para' },
        sourcePosition: { line: 7, column: 1 },
      },
    ];

    const currentElements = [
      { id: 'p-a', content: 'Paragraph A.', metadata: { type: 'Para' } },
      { id: 'p-d', content: 'Paragraph D.', metadata: { type: 'Para' } },
      { id: 'p-e', content: 'Paragraph E.', metadata: { type: 'Para' } },
      { id: 'p-b', content: 'Paragraph B.', metadata: { type: 'Para' } },
    ];

    const changes = {
      getOperations: vi.fn().mockReturnValue(operations),
      getStateAfterOperations: vi
        .fn()
        .mockImplementation((count?: number) =>
          count === 0 ? originalElements : currentElements
        ),
      getCurrentState: vi.fn().mockReturnValue(currentElements),
    };

    const service = new QmdExportService(changes as any);
    const result = service.patchSourceWithTrackedChanges(originalSource);

    // Must not fall back to null — both inserts should appear after A.
    expect(result).not.toBeNull();
    expect(result).toContain('Paragraph D.');
    expect(result).toContain('Paragraph E.');
    // Original lines must be untouched.
    expect(result).toContain('Paragraph A.');
    expect(result).toContain('Paragraph B.');
    // Order: A, D, E, B
    const lines = result!.split('\n').filter((l) => l.trim());
    const aIdx = lines.findIndex((l) => l.includes('Paragraph A.'));
    const dIdx = lines.findIndex((l) => l.includes('Paragraph D.'));
    const eIdx = lines.findIndex((l) => l.includes('Paragraph E.'));
    const bIdx = lines.findIndex((l) => l.includes('Paragraph B.'));
    expect(dIdx).toBeGreaterThan(aIdx);
    expect(eIdx).toBeGreaterThan(dIdx);
    expect(bIdx).toBeGreaterThan(eIdx);
  });

  it('patchSourceWithTrackedChanges handles multiple inserts on the same anchor', () => {
    // Two inserts both targeting the same anchor (p-a).  Current code bails
    // because anchorCounts > 1.  The fix should place them in operation order.
    const originalSource = [
      '---',
      'title: "Test"',
      '---',
      '',
      'Paragraph A.',
      '',
      'Paragraph B.',
    ].join('\n');

    const operations: Operation[] = [
      {
        id: 'op-insert-c',
        type: 'insert',
        elementId: 'p-c',
        timestamp: 1,
        data: {
          type: 'insert',
          content: 'Paragraph C.',
          position: { after: 'p-a' },
        },
      },
      {
        id: 'op-insert-d',
        type: 'insert',
        elementId: 'p-d',
        timestamp: 2,
        data: {
          type: 'insert',
          content: 'Paragraph D.',
          position: { after: 'p-a' }, // same anchor as C
        },
      },
    ];

    const originalElements = [
      {
        id: 'p-a',
        content: 'Paragraph A.',
        metadata: { type: 'Para' },
        sourcePosition: { line: 5, column: 1 },
      },
      {
        id: 'p-b',
        content: 'Paragraph B.',
        metadata: { type: 'Para' },
        sourcePosition: { line: 7, column: 1 },
      },
    ];

    const currentElements = [
      { id: 'p-a', content: 'Paragraph A.', metadata: { type: 'Para' } },
      { id: 'p-c', content: 'Paragraph C.', metadata: { type: 'Para' } },
      { id: 'p-d', content: 'Paragraph D.', metadata: { type: 'Para' } },
      { id: 'p-b', content: 'Paragraph B.', metadata: { type: 'Para' } },
    ];

    const changes = {
      getOperations: vi.fn().mockReturnValue(operations),
      getStateAfterOperations: vi
        .fn()
        .mockImplementation((count?: number) =>
          count === 0 ? originalElements : currentElements
        ),
      getCurrentState: vi.fn().mockReturnValue(currentElements),
    };

    const service = new QmdExportService(changes as any);
    const result = service.patchSourceWithTrackedChanges(originalSource);

    expect(result).not.toBeNull();
    expect(result).toContain('Paragraph C.');
    expect(result).toContain('Paragraph D.');
    // Order preserved: A, C, D, B (operation order)
    const lines = result!.split('\n').filter((l) => l.trim());
    const aIdx = lines.findIndex((l) => l.includes('Paragraph A.'));
    const cIdx = lines.findIndex((l) => l.includes('Paragraph C.'));
    const dIdx = lines.findIndex((l) => l.includes('Paragraph D.'));
    const bIdx = lines.findIndex((l) => l.includes('Paragraph B.'));
    expect(cIdx).toBeGreaterThan(aIdx);
    expect(dIdx).toBeGreaterThan(cIdx);
    expect(bIdx).toBeGreaterThan(dIdx);
  });

  it('patchSourceWithTrackedChanges handles edit on element without sourcePosition via content search', () => {
    // Element p-2 has no sourcePosition.  The current code filters it out of
    // bodyOriginals, produces zero patches, and returns null.  The fix should
    // locate the element by searching for its original content in the source.
    const originalSource = [
      '---',
      'title: "Test"',
      '---',
      '',
      'First paragraph here.',
      '',
      'Second paragraph here.',
      '',
      'Third paragraph here.',
    ].join('\n');

    const operations: Operation[] = [
      {
        id: 'op-1',
        type: 'edit',
        elementId: 'p-2',
        timestamp: 1,
        data: {
          type: 'edit',
          oldContent: 'Second paragraph here.',
          newContent: 'Second paragraph EDITED.',
          changes: [],
        },
      },
    ];

    const originalElements = [
      {
        id: 'p-1',
        content: 'First paragraph here.',
        metadata: { type: 'Para' },
        sourcePosition: { line: 5, column: 1 },
      },
      {
        id: 'p-2',
        content: 'Second paragraph here.',
        metadata: { type: 'Para' },
        // No sourcePosition — simulates a missing data-review-source-line
      },
      {
        id: 'p-3',
        content: 'Third paragraph here.',
        metadata: { type: 'Para' },
        sourcePosition: { line: 9, column: 1 },
      },
    ];

    const currentElements = [
      { id: 'p-1', content: 'First paragraph here.', metadata: { type: 'Para' } },
      { id: 'p-2', content: 'Second paragraph EDITED.', metadata: { type: 'Para' } },
      { id: 'p-3', content: 'Third paragraph here.', metadata: { type: 'Para' } },
    ];

    const changes = {
      getOperations: vi.fn().mockReturnValue(operations),
      getStateAfterOperations: vi
        .fn()
        .mockImplementation((count?: number) =>
          count === 0 ? originalElements : currentElements
        ),
      getCurrentState: vi.fn().mockReturnValue(currentElements),
    };

    const service = new QmdExportService(changes as any);
    const result = service.patchSourceWithTrackedChanges(originalSource);

    // Must not fall back to null — content-search should locate the element.
    expect(result).not.toBeNull();
    // Only the edited line should change.
    expect(result).toContain('Second paragraph EDITED.');
    expect(result).toContain('First paragraph here.');
    expect(result).toContain('Third paragraph here.');
  });

  it('patchSourceWithTrackedChanges resolves element via normalised whitespace search', () => {
    // Source uses 3-space list markers; element content uses 1-space (pandoc
    // normalised).  No sourcePosition on list-1.  Exact search fails; the
    // normalised second pass must locate the element.
    const originalSource = [
      '---',
      'title: "Test"',
      '---',
      '',
      'Intro paragraph.',
      '',
      '-   item one',
      '-   item two',
      '-   item three',
      '',
      'Outro paragraph.',
    ].join('\n');

    const operations: Operation[] = [
      {
        id: 'op-1',
        type: 'edit',
        elementId: 'list-1',
        timestamp: 1,
        data: {
          type: 'edit',
          oldContent: '- item one\n- item two\n- item three',
          newContent: '- item one updated\n- item two\n- item three',
          changes: [],
        },
      },
    ];

    const originalElements = [
      {
        id: 'p-intro',
        content: 'Intro paragraph.',
        metadata: { type: 'Para' },
        sourcePosition: { line: 5, column: 1 },
      },
      {
        id: 'list-1',
        content: '- item one\n- item two\n- item three',
        metadata: { type: 'BulletList' },
        // No sourcePosition — simulates missing data-review-source-line
      },
      {
        id: 'p-outro',
        content: 'Outro paragraph.',
        metadata: { type: 'Para' },
        sourcePosition: { line: 11, column: 1 },
      },
    ];

    const currentElements = [
      { id: 'p-intro', content: 'Intro paragraph.', metadata: { type: 'Para' } },
      { id: 'list-1', content: '- item one updated\n- item two\n- item three', metadata: { type: 'BulletList' } },
      { id: 'p-outro', content: 'Outro paragraph.', metadata: { type: 'Para' } },
    ];

    const changes = {
      getOperations: vi.fn().mockReturnValue(operations),
      getStateAfterOperations: vi
        .fn()
        .mockImplementation((count?: number) =>
          count === 0 ? originalElements : currentElements
        ),
      getCurrentState: vi.fn().mockReturnValue(currentElements),
    };

    const service = new QmdExportService(changes as any);
    const result = service.patchSourceWithTrackedChanges(originalSource);

    // Without the normalised pass this returns null.
    expect(result).not.toBeNull();
    // The edit must be present.
    expect(result).toContain('item one updated');
    // Unchanged elements must survive.
    expect(result).toContain('Intro paragraph.');
    expect(result).toContain('Outro paragraph.');
  });

  it('exports Div elements (callouts) with proper fence syntax', async () => {
    const changes = createChangesStub({
      elements: [
        {
          id: 'callout-1',
          content: '## Important\n\nThis is an important callout with some content.',
          metadata: {
            type: 'Div',
            classes: ['callout-important'],
          },
        },
        {
          id: 'callout-2',
          content: '## Note\n\nThis is a note callout.',
          metadata: {
            type: 'Div',
            classes: ['callout-note'],
            attributes: {
              collapse: 'true',
            },
          },
        },
      ],
    });

    const git = createGitStub('document.qmd');
    const service = new QmdExportService(changes as any, { git: git as any });
    const bundle = await service.createBundle();
    const exported = bundle.files[0]?.content ?? '';

    // Verify the callout-important block has proper fence syntax
    expect(exported).toContain('::: {.callout-important}');
    expect(exported).toContain('## Important');
    expect(exported).toContain('This is an important callout with some content.');
    expect(exported).toMatch(/::: \{\.callout-important\}\n## Important/);

    // Verify the callout-note block with attributes
    expect(exported).toContain('::: {.callout-note collapse="true"}');
    expect(exported).toContain('## Note');
    expect(exported).toContain('This is a note callout.');

    // Verify closing fences are present (at least 2 closing fences for 2 callouts)
    const closingFenceCount = (exported.match(/^:::$/gm) || []).length;
    expect(closingFenceCount).toBeGreaterThanOrEqual(2);
  });
});
