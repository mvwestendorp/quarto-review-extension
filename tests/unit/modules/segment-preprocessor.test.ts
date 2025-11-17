import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { registerSupplementalEditableSegments } from '../../../src/modules/ui/segment-preprocessor';

/**
 * Tests for segment preprocessor
 *
 * The segment preprocessor annotates supplemental editable elements:
 * - Document titles
 * - Figure captions
 * - Table captions
 *
 * These tests verify:
 * - Correct element identification
 * - Caption text extraction (after colon)
 * - Unique ID generation
 * - Edge cases (no colon, empty captions, special characters)
 */
describe('Segment Preprocessor', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><body></body>');
    document = dom.window.document;
    global.document = document;
  });

  describe('Document Title Annotation', () => {
    it('should annotate document title', () => {
      document.body.innerHTML = `
        <header id="title-block-header">
          <h1 class="quarto-title">
            <span class="title">My Document Title</span>
          </h1>
        </header>
      `;

      registerSupplementalEditableSegments();

      const titleElement = document.querySelector('.title');
      expect(titleElement?.getAttribute('data-review-id')).toBe(
        'review.document.title'
      );
      expect(titleElement?.getAttribute('data-review-type')).toBe(
        'DocumentTitle'
      );
      expect(titleElement?.getAttribute('data-review-markdown')).toBe(
        'My Document Title'
      );
      expect(titleElement?.getAttribute('data-review-origin')).toBe('source');
      expect(titleElement?.classList.contains('review-editable')).toBe(true);
    });

    it('should handle title with leading/trailing whitespace', () => {
      document.body.innerHTML = `
        <header id="title-block-header">
          <h1 class="quarto-title">
            <span class="title">  Title with spaces  </span>
          </h1>
        </header>
      `;

      registerSupplementalEditableSegments();

      const titleElement = document.querySelector('.title');
      expect(titleElement?.getAttribute('data-review-markdown')).toBe(
        'Title with spaces'
      );
    });

    it('should not annotate empty title', () => {
      document.body.innerHTML = `
        <header id="title-block-header">
          <h1 class="quarto-title">
            <span class="title">   </span>
          </h1>
        </header>
      `;

      registerSupplementalEditableSegments();

      const titleElement = document.querySelector('.title');
      expect(titleElement?.hasAttribute('data-review-id')).toBe(false);
    });

    it('should not re-annotate already processed title', () => {
      document.body.innerHTML = `
        <header id="title-block-header">
          <h1 class="quarto-title">
            <span class="title" data-review-id="existing">Title</span>
          </h1>
        </header>
      `;

      registerSupplementalEditableSegments();

      const titleElement = document.querySelector('.title');
      expect(titleElement?.getAttribute('data-review-id')).toBe('existing');
    });

    it('should handle title with special characters', () => {
      document.body.innerHTML = `
        <header id="title-block-header">
          <h1 class="quarto-title">
            <span class="title">Title: A Study of "Quotes" & More</span>
          </h1>
        </header>
      `;

      registerSupplementalEditableSegments();

      const titleElement = document.querySelector('.title');
      expect(titleElement?.getAttribute('data-review-markdown')).toBe(
        'Title: A Study of "Quotes" & More'
      );
    });

    it('should handle title with unicode characters', () => {
      document.body.innerHTML = `
        <header id="title-block-header">
          <h1 class="quarto-title">
            <span class="title">研究报告: Analysis 📊</span>
          </h1>
        </header>
      `;

      registerSupplementalEditableSegments();

      const titleElement = document.querySelector('.title');
      expect(titleElement?.getAttribute('data-review-markdown')).toBe(
        '研究报告: Analysis 📊'
      );
    });

    it('should handle missing title element gracefully', () => {
      document.body.innerHTML = '<div>No title here</div>';

      expect(() => {
        registerSupplementalEditableSegments();
      }).not.toThrow();
    });
  });

  describe('Figure Caption Annotation', () => {
    it('should annotate figure caption with colon', () => {
      document.body.innerHTML = `
        <div class="quarto-figure" id="fig-example">
          <figure>
            <img src="image.png" />
            <figcaption class="quarto-float-caption">
              Figure 1: This is the caption text
            </figcaption>
          </figure>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type="FigureCaption"]');
      expect(caption).toBeTruthy();
      expect(caption?.getAttribute('data-review-id')).toBe(
        'review.fig-example.figcap-1'
      );
      expect(caption?.getAttribute('data-review-type')).toBe('FigureCaption');
      expect(caption?.getAttribute('data-review-markdown')).toBe(
        'This is the caption text'
      );
      expect(caption?.classList.contains('review-editable')).toBe(true);
      expect(caption?.classList.contains('review-editable-inline')).toBe(true);
    });

    it('should extract caption text after colon', () => {
      document.body.innerHTML = `
        <div class="quarto-figure">
          <figure>
            <img src="image.png" />
            <figcaption class="quarto-float-caption">
              Figure 1: Caption after colon
            </figcaption>
          </figure>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type="FigureCaption"]');
      expect(caption?.getAttribute('data-review-markdown')).toBe(
        'Caption after colon'
      );
    });

    it('should handle caption without colon (fallback)', () => {
      document.body.innerHTML = `
        <div class="quarto-figure">
          <figure>
            <img src="image.png" />
            <figcaption class="quarto-float-caption">Entire caption is editable</figcaption>
          </figure>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type="FigureCaption"]');
      expect(caption?.getAttribute('data-review-markdown')).toBe(
        'Entire caption is editable'
      );
    });

    it('should handle caption with multiple colons', () => {
      document.body.innerHTML = `
        <div class="quarto-figure">
          <figure>
            <img src="image.png" />
            <figcaption class="quarto-float-caption">
              Figure 1: Title: Subtitle
            </figcaption>
          </figure>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type="FigureCaption"]');
      // Should extract after first colon
      expect(caption?.getAttribute('data-review-markdown')).toBe(
        'Title: Subtitle'
      );
    });

    it('should trim whitespace after colon', () => {
      document.body.innerHTML = `
        <div class="quarto-figure">
          <figure>
            <img src="image.png" />
            <figcaption class="quarto-float-caption">
              Figure 1:    Caption with extra spaces
            </figcaption>
          </figure>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type="FigureCaption"]');
      expect(caption?.getAttribute('data-review-markdown')).toBe(
        'Caption with extra spaces'
      );
    });

    it('should handle empty caption after colon', () => {
      document.body.innerHTML = `
        <div class="quarto-figure">
          <figure>
            <img src="image.png" />
            <figcaption class="quarto-float-caption">
              Figure 1:
            </figcaption>
          </figure>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type="FigureCaption"]');
      // Should not annotate empty caption
      expect(caption).toBeNull();
    });

    it('should generate sequential IDs for multiple figures', () => {
      document.body.innerHTML = `
        <div class="quarto-figure" id="fig-1">
          <figcaption class="quarto-float-caption">Figure 1: First</figcaption>
        </div>
        <div class="quarto-figure" id="fig-2">
          <figcaption class="quarto-float-caption">Figure 2: Second</figcaption>
        </div>
        <div class="quarto-figure" id="fig-3">
          <figcaption class="quarto-float-caption">Figure 3: Third</figcaption>
        </div>
      `;

      registerSupplementalEditableSegments();

      const captions = document.querySelectorAll('[data-review-type="FigureCaption"]');
      expect(captions.length).toBe(3);
      expect(captions[0]?.getAttribute('data-review-id')).toBe(
        'review.fig-1.figcap-1'
      );
      expect(captions[1]?.getAttribute('data-review-id')).toBe(
        'review.fig-2.figcap-2'
      );
      expect(captions[2]?.getAttribute('data-review-id')).toBe(
        'review.fig-3.figcap-3'
      );
    });

    it('should handle figure with special characters in ID', () => {
      document.body.innerHTML = `
        <div class="quarto-figure" id="fig-my-special_figure-2024">
          <figcaption class="quarto-float-caption">Figure: Caption</figcaption>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type="FigureCaption"]');
      expect(caption?.getAttribute('data-review-id')).toBe(
        'review.fig-my-special_figure-2024.figcap-1'
      );
    });

    it('should handle figure without ID (auto-generate)', () => {
      document.body.innerHTML = `
        <div class="quarto-figure">
          <figcaption class="quarto-float-caption">Figure: Caption</figcaption>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type="FigureCaption"]');
      expect(caption?.getAttribute('data-review-id')).toContain('figcap-1');
    });

    it('should not re-annotate already processed captions', () => {
      document.body.innerHTML = `
        <div class="quarto-figure">
          <figcaption class="quarto-float-caption" data-review-caption-processed="true">
            <span data-review-type="FigureCaption" data-review-id="existing">Caption</span>
          </figcaption>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-id="existing"]');
      expect(caption).toBeTruthy();
      // Should not create a new annotated element
      const captions = document.querySelectorAll('[data-review-type="FigureCaption"]');
      expect(captions.length).toBe(1);
    });
  });

  describe('Table Caption Annotation', () => {
    it('should annotate table caption with colon', () => {
      document.body.innerHTML = `
        <div class="quarto-table" id="tbl-example">
          <table>
            <caption class="quarto-float-caption">
              Table 1: Sample data
            </caption>
            <tbody><tr><td>Data</td></tr></tbody>
          </table>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type="TableCaption"]');
      expect(caption).toBeTruthy();
      expect(caption?.getAttribute('data-review-id')).toBe(
        'review.tbl-example.tablecap-1'
      );
      expect(caption?.getAttribute('data-review-type')).toBe('TableCaption');
      expect(caption?.getAttribute('data-review-markdown')).toBe('Sample data');
    });

    it('should generate sequential IDs for multiple tables', () => {
      document.body.innerHTML = `
        <div class="quarto-table" id="tbl-1">
          <table>
            <caption class="quarto-float-caption">Table 1: First</caption>
          </table>
        </div>
        <div class="quarto-table" id="tbl-2">
          <table>
            <caption class="quarto-float-caption">Table 2: Second</caption>
          </table>
        </div>
      `;

      registerSupplementalEditableSegments();

      const captions = document.querySelectorAll('[data-review-type="TableCaption"]');
      expect(captions.length).toBe(2);
      expect(captions[0]?.getAttribute('data-review-id')).toBe(
        'review.tbl-1.tablecap-1'
      );
      expect(captions[1]?.getAttribute('data-review-id')).toBe(
        'review.tbl-2.tablecap-2'
      );
    });

    it('should handle table caption without colon', () => {
      document.body.innerHTML = `
        <div class="quarto-table">
          <table>
            <caption class="quarto-float-caption">Sample table caption</caption>
          </table>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type="TableCaption"]');
      expect(caption?.getAttribute('data-review-markdown')).toBe(
        'Sample table caption'
      );
    });
  });

  describe('Caption Kind Detection', () => {
    it('should detect figure from container class "quarto-figure"', () => {
      document.body.innerHTML = `
        <div class="quarto-figure">
          <figcaption class="quarto-float-caption">Figure: Test</figcaption>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type]');
      expect(caption?.getAttribute('data-review-type')).toBe('FigureCaption');
    });

    it('should detect figure from container class "quarto-figure-center"', () => {
      document.body.innerHTML = `
        <div class="quarto-figure-center">
          <figcaption class="quarto-float-caption">Figure: Test</figcaption>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type]');
      expect(caption?.getAttribute('data-review-type')).toBe('FigureCaption');
    });

    it('should detect figure from caption class "quarto-float-fig"', () => {
      document.body.innerHTML = `
        <div class="quarto-float">
          <figcaption class="quarto-float-caption quarto-float-fig">Figure: Test</figcaption>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type]');
      expect(caption?.getAttribute('data-review-type')).toBe('FigureCaption');
    });

    it('should detect table from container class "quarto-table"', () => {
      document.body.innerHTML = `
        <div class="quarto-table">
          <table>
            <caption class="quarto-float-caption">Table: Test</caption>
          </table>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type]');
      expect(caption?.getAttribute('data-review-type')).toBe('TableCaption');
    });

    it('should detect table from caption class "quarto-float-table"', () => {
      document.body.innerHTML = `
        <div class="quarto-float">
          <table>
            <caption class="quarto-float-caption quarto-float-table">Table: Test</caption>
          </table>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type]');
      expect(caption?.getAttribute('data-review-type')).toBe('TableCaption');
    });

    it('should not annotate caption without container', () => {
      document.body.innerHTML = `
        <figcaption class="quarto-float-caption">Orphan caption</figcaption>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type]');
      expect(caption).toBeNull();
    });

    it('should not annotate caption with ambiguous container', () => {
      document.body.innerHTML = `
        <div>
          <figcaption class="quarto-float-caption">Ambiguous caption</figcaption>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type]');
      expect(caption).toBeNull();
    });
  });

  describe('Mixed Content', () => {
    it('should handle document with both title and captions', () => {
      document.body.innerHTML = `
        <header id="title-block-header">
          <h1 class="quarto-title">
            <span class="title">Document Title</span>
          </h1>
        </header>
        <div class="quarto-figure" id="fig-1">
          <figure>
            <figcaption class="quarto-float-caption">Figure 1: First figure</figcaption>
          </figure>
        </div>
        <div class="quarto-table" id="tbl-1">
          <table>
            <caption class="quarto-float-caption">Table 1: First table</caption>
          </table>
        </div>
      `;

      registerSupplementalEditableSegments();

      expect(document.querySelector('[data-review-id="review.document.title"]')).toBeTruthy();
      expect(document.querySelector('[data-review-id="review.fig-1.figcap-1"]')).toBeTruthy();
      expect(document.querySelector('[data-review-id="review.tbl-1.tablecap-1"]')).toBeTruthy();
    });

    it('should handle multiple figures and tables with correct counters', () => {
      document.body.innerHTML = `
        <div class="quarto-figure" id="fig-1">
          <figure>
            <figcaption class="quarto-float-caption">Figure 1: First</figcaption>
          </figure>
        </div>
        <div class="quarto-table" id="tbl-1">
          <table>
            <caption class="quarto-float-caption">Table 1: First</caption>
          </table>
        </div>
        <div class="quarto-figure" id="fig-2">
          <figure>
            <figcaption class="quarto-float-caption">Figure 2: Second</figcaption>
          </figure>
        </div>
        <div class="quarto-table" id="tbl-2">
          <table>
            <caption class="quarto-float-caption">Table 2: Second</caption>
          </table>
        </div>
      `;

      registerSupplementalEditableSegments();

      // Verify independent counters
      expect(document.querySelector('[data-review-id="review.fig-1.figcap-1"]')).toBeTruthy();
      expect(document.querySelector('[data-review-id="review.fig-2.figcap-2"]')).toBeTruthy();
      expect(document.querySelector('[data-review-id="review.tbl-1.tablecap-1"]')).toBeTruthy();
      expect(document.querySelector('[data-review-id="review.tbl-2.tablecap-2"]')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle caption with HTML entities', () => {
      document.body.innerHTML = `
        <div class="quarto-figure">
          <figcaption class="quarto-float-caption">
            Figure: A &amp; B &lt; C &gt; D
          </figcaption>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type="FigureCaption"]');
      expect(caption?.getAttribute('data-review-markdown')).toBe('A & B < C > D');
    });

    it('should handle caption with nested elements', () => {
      document.body.innerHTML = `
        <div class="quarto-figure">
          <figcaption class="quarto-float-caption">
            Figure 1: Caption with <strong>bold</strong> and <em>italic</em>
          </figcaption>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type="FigureCaption"]');
      expect(caption?.getAttribute('data-review-markdown')).toContain('bold');
      expect(caption?.getAttribute('data-review-markdown')).toContain('italic');
    });

    it('should handle caption with only whitespace after colon', () => {
      document.body.innerHTML = `
        <div class="quarto-figure">
          <figcaption class="quarto-float-caption">
            Figure 1:
          </figcaption>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type="FigureCaption"]');
      expect(caption).toBeNull();
    });

    it('should handle ID with spaces (should be replaced with hyphens)', () => {
      document.body.innerHTML = `
        <div class="quarto-figure" id="fig my figure">
          <figcaption class="quarto-float-caption">Figure: Test</figcaption>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type="FigureCaption"]');
      expect(caption?.getAttribute('data-review-id')).toBe(
        'review.fig-my-figure.figcap-1'
      );
    });

    it('should handle very long captions', () => {
      const longCaption = 'A'.repeat(1000);
      document.body.innerHTML = `
        <div class="quarto-figure">
          <figcaption class="quarto-float-caption">Figure: ${longCaption}</figcaption>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type="FigureCaption"]');
      expect(caption?.getAttribute('data-review-markdown')).toBe(longCaption);
    });

    it('should handle undefined document gracefully', () => {
      const originalDocument = global.document;
      // @ts-ignore
      global.document = undefined;

      expect(() => {
        registerSupplementalEditableSegments();
      }).not.toThrow();

      global.document = originalDocument;
    });
  });

  describe('ID Sanitization', () => {
    it('should replace spaces with hyphens in base ID', () => {
      document.body.innerHTML = `
        <div class="quarto-figure" id="fig with spaces">
          <figcaption class="quarto-float-caption">Figure: Test</figcaption>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type="FigureCaption"]');
      expect(caption?.getAttribute('data-review-id')).not.toContain(' ');
      expect(caption?.getAttribute('data-review-id')).toContain('fig-with-spaces');
    });

    it('should handle multiple consecutive spaces', () => {
      document.body.innerHTML = `
        <div class="quarto-figure" id="fig    multiple    spaces">
          <figcaption class="quarto-float-caption">Figure: Test</figcaption>
        </div>
      `;

      registerSupplementalEditableSegments();

      const caption = document.querySelector('[data-review-type="FigureCaption"]');
      const id = caption?.getAttribute('data-review-id') || '';
      expect(id).not.toContain('  ');
    });
  });
});
