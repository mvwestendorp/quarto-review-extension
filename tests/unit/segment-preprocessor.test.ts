import { describe, it, expect, beforeEach } from 'vitest';
import { registerSupplementalEditableSegments } from '@modules/ui/segment-preprocessor';

describe('segment preprocessor', () => {
  const resetDocument = (markup: string): void => {
    document.body.innerHTML = markup;
  };

  beforeEach(() => {
    resetDocument(`
      <header id="title-block-header">
        <div class="quarto-title">
          <h1 class="title">Example Document</h1>
        </div>
      </header>
      <div class="quarto-float quarto-figure" id="fig-sample">
        <figure class="quarto-float quarto-figure-center">
          <figcaption class="quarto-float-caption">Figure 1: Sample caption text</figcaption>
        </figure>
      </div>
      <div class="quarto-float quarto-table" id="tbl-sample">
        <figure class="quarto-float quarto-table-center">
          <figcaption class="quarto-float-caption">Table 1: Descriptive caption</figcaption>
        </figure>
      </div>
    `);
  });

  it('annotates document title as editable segment', () => {
    registerSupplementalEditableSegments();

    const title = document.querySelector<HTMLHeadingElement>(
      '#title-block-header .quarto-title .title'
    );
    expect(title).toBeTruthy();
    expect(title?.getAttribute('data-review-type')).toBe('DocumentTitle');
    expect(title?.getAttribute('data-review-id')).toBe(
      'review.document.title'
    );
    expect(title?.getAttribute('data-review-markdown')).toBe(
      'Example Document'
    );
    expect(title?.classList.contains('review-editable')).toBe(true);
  });

  it('wraps float captions in inline editable spans', () => {
    registerSupplementalEditableSegments();

    const captionWrapper = document.querySelector<HTMLElement>(
      '.quarto-float-caption .review-editable-inline'
    );
    expect(captionWrapper).toBeTruthy();
    expect(captionWrapper?.getAttribute('data-review-type')).toBe(
      'FigureCaption'
    );
    expect(captionWrapper?.getAttribute('data-review-origin')).toBe('source');
    expect(captionWrapper?.textContent?.trim()).toBe('Sample caption text');

    const originalText = document
      .querySelector('.quarto-float-caption')
      ?.textContent?.trim();
    expect(originalText?.startsWith('Figure 1:')).toBe(true);
  });

  it('supports table captions', () => {
    registerSupplementalEditableSegments();

    const captionWrapper = document.querySelector<HTMLElement>(
      '#tbl-sample .quarto-float-caption .review-editable-inline'
    );
    expect(captionWrapper).toBeTruthy();
    expect(captionWrapper?.getAttribute('data-review-type')).toBe(
      'TableCaption'
    );
    expect(captionWrapper?.getAttribute('data-review-id')).toContain(
      'tablecap'
    );
    expect(captionWrapper?.textContent?.trim()).toBe('Descriptive caption');
  });

  it('preserves existing annotations when run multiple times', () => {
    registerSupplementalEditableSegments();
    registerSupplementalEditableSegments();

    const figureInlineSegments = document.querySelectorAll(
      '#fig-sample .quarto-float-caption .review-editable-inline'
    );
    const tableInlineSegments = document.querySelectorAll(
      '#tbl-sample .quarto-float-caption .review-editable-inline'
    );

    expect(figureInlineSegments).toHaveLength(1);
    expect(tableInlineSegments).toHaveLength(1);
  });

  it('skips document title when already annotated', () => {
    const title = document.querySelector('#title-block-header .title');
    title?.setAttribute('data-review-id', 'existing');

    registerSupplementalEditableSegments();

    expect(title?.getAttribute('data-review-id')).toBe('existing');
    expect(title?.getAttribute('data-review-type')).toBeNull();
  });

  it('skips document title when empty text content', () => {
    const title = document.querySelector('#title-block-header .title');
    if (title) {
      title.textContent = '   ';
    }

    registerSupplementalEditableSegments();

    expect(title?.hasAttribute('data-review-id')).toBe(false);
  });

  it('handles absence of captions gracefully', () => {
    resetDocument('<main></main>');
    registerSupplementalEditableSegments();

    expect(
      document.querySelector('[data-review-type="FigureCaption"]')
    ).toBeNull();
  });

  it('uses fallback ids when containers lack identifiers', () => {
    resetDocument(`
      <header id="title-block-header">
        <div class="quarto-title">
          <h1 class="title">Example Document</h1>
        </div>
      </header>
      <div class="quarto-float quarto-figure">
        <figure>
          <figcaption class="quarto-float-caption">Figure A: Caption text</figcaption>
        </figure>
      </div>
    `);

    registerSupplementalEditableSegments();

    const caption = document.querySelector(
      '.quarto-float-caption .review-editable-inline'
    );
    expect(caption?.getAttribute('data-review-id')).toMatch(
      /^review\.figurecaption-\d+\.figcap-1$/
    );
  });

  it('only wraps captions with recognized containers', () => {
    resetDocument(`
      <header id="title-block-header">
        <div class="quarto-title">
          <h1 class="title">Example Document</h1>
        </div>
      </header>
      <div class="misc-wrapper">
        <figcaption class="quarto-float-caption">Figure 5: Not processed</figcaption>
      </div>
    `);

    registerSupplementalEditableSegments();

    expect(
      document.querySelector('.quarto-float-caption .review-editable-inline')
    ).toBeNull();
  });

  it('wraps entire caption when no colon is present', () => {
    resetDocument(`
      <header id="title-block-header">
        <div class="quarto-title">
          <h1 class="title">Example Document</h1>
        </div>
      </header>
      <div class="quarto-float quarto-figure" id="fig-sample">
        <figure>
          <figcaption class="quarto-float-caption">Figure caption without delimiter</figcaption>
        </figure>
      </div>
    `);

    registerSupplementalEditableSegments();

    const wrapper = document.querySelector(
      '.quarto-float-caption .review-editable-inline'
    );
    expect(wrapper?.textContent?.trim()).toBe(
      'Figure caption without delimiter'
    );
  });

  it('ensures colon-separated captions enforce spacing', () => {
    resetDocument(`
      <header id="title-block-header">
        <div class="quarto-title">
          <h1 class="title">Example Document</h1>
        </div>
      </header>
      <div class="quarto-float quarto-figure" id="fig-sample">
        <figure>
          <figcaption class="quarto-float-caption"><span>Figure 3:</span><span>Caption without space</span></figcaption>
        </figure>
      </div>
    `);

    registerSupplementalEditableSegments();

    const caption = document.querySelector('.quarto-float-caption');
    expect(caption?.textContent?.startsWith('Figure 3: Caption')).toBe(true);
  });

  it('respects captions already marked processed', () => {
    resetDocument(`
      <header id="title-block-header">
        <div class="quarto-title">
          <h1 class="title">Example Document</h1>
        </div>
      </header>
      <div class="quarto-float quarto-figure" id="fig-sample">
        <figure>
          <figcaption class="quarto-float-caption">Figure 1: Sample caption text</figcaption>
        </figure>
      </div>
    `);

    const caption = document.querySelector(
      '.quarto-float-caption'
    ) as HTMLElement | null;
    expect(caption).toBeTruthy();
    caption!.setAttribute('data-review-caption-processed', 'true');
    caption!.innerHTML =
      '<span data-review-id="existing" data-review-type="FigureCaption">Existing</span>';

    registerSupplementalEditableSegments();

    const wrappers = document.querySelectorAll(
      '.quarto-float-caption .review-editable-inline'
    );
    expect(wrappers).toHaveLength(0);
  });

  it('returns null when colon not found and caption empty', () => {
    resetDocument(`
      <header id="title-block-header">
        <div class="quarto-title">
          <h1 class="title">Example Document</h1>
        </div>
      </header>
      <div class="quarto-float quarto-figure" id="fig-empty">
        <figure>
          <figcaption class="quarto-float-caption"></figcaption>
        </figure>
      </div>
    `);

    registerSupplementalEditableSegments();

    const wrapper = document.querySelector(
      '.quarto-float-caption .review-editable-inline'
    );
    expect(wrapper).toBeNull();
  });
});
