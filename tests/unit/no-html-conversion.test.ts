/**
 * Test: Verify NO HTML to Markdown conversion exists
 *
 * This test ensures that the system ONLY uses embedded markdown
 * and never attempts to parse or convert HTML back to markdown.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChangesModule } from '@/modules/changes';
import { UIModule } from '@/modules/ui';
import { MarkdownModule } from '@/modules/markdown';
import { CommentsModule } from '@/modules/comments';

describe('No HTML to Markdown Conversion', () => {
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';
  });

  it('ChangesModule should throw error if data-review-markdown is missing', () => {
    // Create element WITHOUT data-review-markdown
    document.body.innerHTML = `
      <div class="review-editable"
           data-review-id="test-para-1"
           data-review-type="Para">
        <p>Some <strong>HTML</strong> content</p>
      </div>
    `;

    const changes = new ChangesModule();

    expect(() => {
      changes.initializeFromDOM();
    }).toThrow(/Missing data-review-markdown/);
  });

  it('ChangesModule should successfully extract embedded markdown', () => {
    // Create element WITH data-review-markdown
    document.body.innerHTML = `
      <div class="review-editable"
           data-review-id="test-para-1"
           data-review-type="Para"
           data-review-markdown="This is **bold** and *italic* text.">
        <p>This is <strong>bold</strong> and <em>italic</em> text.</p>
      </div>
    `;

    const changes = new ChangesModule();
    changes.initializeFromDOM();

    const elements = changes.getCurrentState();
    expect(elements).toHaveLength(1);
    expect(elements[0].content).toBe('This is **bold** and *italic* text.');
    // Ensure it's markdown, not HTML
    expect(elements[0].content).not.toContain('<strong>');
    expect(elements[0].content).not.toContain('<em>');
  });

  it('UIModule should throw error when opening editor without embedded markdown', () => {
    document.body.innerHTML = `
      <div class="review-editable"
           data-review-id="test-para-1"
           data-review-type="Para">
        <p>Some <strong>HTML</strong> content</p>
      </div>
    `;

    const changes = new ChangesModule();
    const markdown = new MarkdownModule();
    const comments = new CommentsModule();
    const persistence = {
      saveDraft: vi.fn().mockResolvedValue(undefined),
      clearAll: vi.fn().mockResolvedValue(undefined),
    };
    const ui = new UIModule({ changes, markdown, comments, persistence });

    expect(() => {
      ui.openEditor('test-para-1');
    }).toThrow(/Element test-para-1 not found/);
  });

  it('toMarkdown() should use embedded markdown, not parse HTML', () => {
    document.body.innerHTML = `
      <div class="review-editable"
           data-review-id="test-para-1"
           data-review-type="Para"
           data-review-markdown="Original **markdown** content">
        <p>Original <strong>markdown</strong> content</p>
      </div>
      <div class="review-editable"
           data-review-id="test-para-2"
           data-review-type="Para"
           data-review-markdown="Second paragraph with [link](https://example.com)">
        <p>Second paragraph with <a href="https://example.com">link</a></p>
      </div>
    `;

    const changes = new ChangesModule();
    changes.initializeFromDOM();

    const markdownOutput = changes.toMarkdown();

    // Should contain markdown syntax, not HTML
    expect(markdownOutput).toContain('**markdown**');
    expect(markdownOutput).toContain('[link](https://example.com)');

    // Should NOT contain HTML tags
    expect(markdownOutput).not.toContain('<strong>');
    expect(markdownOutput).not.toContain('<a href=');
    expect(markdownOutput).not.toContain('</p>');
  });

  it('HTML entities should be properly decoded from data attribute', () => {
    document.body.innerHTML = `
      <div class="review-editable"
           data-review-id="test-para-1"
           data-review-type="Para"
           data-review-markdown="Text with &amp;amp; and &amp;lt;brackets&amp;gt;">
        <p>Text with &amp; and &lt;brackets&gt;</p>
      </div>
    `;

    const changes = new ChangesModule();
    changes.initializeFromDOM();

    const elements = changes.getCurrentState();
    // Browser decodes once (&amp;amp; → &amp;), then unescapeHtml() decodes again (&amp; → &)
    expect(elements[0].content).toBe('Text with & and <brackets>');
  });

  it('MarkdownModule should only do markdown->HTML, never HTML->markdown', () => {
    const markdown = new MarkdownModule();

    // Test markdown -> HTML (correct direction)
    const html = markdown.renderSync('This is **bold** text');
    expect(html).toContain('<strong>');

    // There should be NO method that does HTML -> markdown
    // @ts-expect-error - this method should not exist
    expect(markdown.htmlToMarkdown).toBeUndefined();
    // @ts-expect-error - this method should not exist
    expect(markdown.parseHtml).toBeUndefined();
    // @ts-expect-error - this method should not exist
    expect(markdown.fromHtml).toBeUndefined();
  });

  it('toPlainText() converts markdown->text, not HTML->markdown', () => {
    const markdown = new MarkdownModule();

    // This is markdown -> HTML -> plain text (legitimate)
    const plainText = markdown.toPlainText('This is **bold** text');

    // Should extract text without markup
    expect(plainText).toContain('This is bold text');
    expect(plainText).not.toContain('**');
    expect(plainText).not.toContain('<strong>');
  });

  it('Changes after edit should preserve markdown format', () => {
    document.body.innerHTML = `
      <div class="review-editable"
           data-review-id="test-para-1"
           data-review-type="Para"
           data-review-markdown="Original text">
        <p>Original text</p>
      </div>
    `;

    const changes = new ChangesModule();
    changes.initializeFromDOM();

    // Edit with markdown
    changes.edit('test-para-1', 'Updated text with **bold** and *italic*', 'user1');

    const markdownOutput = changes.toMarkdown();

    // Should preserve markdown syntax
    expect(markdownOutput).toContain('**bold**');
    expect(markdownOutput).toContain('*italic*');
    expect(markdownOutput).not.toContain('<strong>');
  });

  it('All element types should require data-review-markdown', () => {
    const testCases = [
      { type: 'Para', html: '<p>Paragraph</p>' },
      { type: 'Header', html: '<h2>Header</h2>', level: '2' },
      { type: 'CodeBlock', html: '<pre><code>code</code></pre>' },
      { type: 'BulletList', html: '<ul><li>Item</li></ul>' },
    ];

    testCases.forEach(({ type, html, level }) => {
      document.body.innerHTML = `
        <div class="review-editable"
             data-review-id="test-${type}-1"
             data-review-type="${type}"
             ${level ? `data-review-level="${level}"` : ''}>
          ${html}
        </div>
      `;

      const changes = new ChangesModule();

      expect(() => {
        changes.initializeFromDOM();
      }).toThrow(/Missing data-review-markdown/);
    });
  });
});
