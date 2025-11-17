import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * E2E tests for text transformation in the browser
 *
 * These tests verify that text transformations work correctly in a real browser:
 * - Editing elements
 * - CriticMarkup generation
 * - Accepting/rejecting changes
 * - Export functionality
 *
 * Test fixtures are loaded from tests/fixtures/
 */

const FIXTURES_DIR = join(process.cwd(), 'tests', 'fixtures');

/**
 * Helper to load a test fixture
 */
function loadFixture(relativePath: string): string {
  return readFileSync(join(FIXTURES_DIR, relativePath), 'utf-8');
}

/**
 * Helper to create a test document with review-enabled elements
 */
async function createTestDocument(page: Page, elements: TestElement[]) {
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Test Document</title>
    </head>
    <body>
      <div id="test-content">
        ${elements
          .map(
            (el, idx) => `
          <div class="review-editable-wrapper"
               data-review-id="${el.id || `test.para-${idx + 1}`}"
               data-review-type="${el.type || 'Para'}"
               data-review-markdown="${escapeHtml(el.markdown)}">
            <div class="review-editable-content">${el.html || el.markdown}</div>
          </div>
        `
          )
          .join('\n')}
      </div>
      <script type="module" src="/src/main.ts"></script>
    </body>
    </html>
  `);
}

/**
 * Helper to escape HTML for attributes
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

interface TestElement {
  id?: string;
  type?: string;
  markdown: string;
  html?: string;
}

test.describe('Text Transformation E2E', () => {
  test.describe('Basic Editing', () => {
    test('should edit a paragraph and generate CriticMarkup', async ({
      page,
    }) => {
      await createTestDocument(page, [
        { markdown: 'The quick brown fox jumps over the lazy dog.' },
      ]);

      // Wait for QuartoReview to initialize
      await page.waitForSelector('[data-review-id]');

      // Click to edit the paragraph
      await page.click('[data-review-id="test.para-1"]');

      // Wait for editor to appear
      await page.waitForSelector('.milkdown-editor', { timeout: 5000 });

      // Clear and type new content
      await page.keyboard.selectAll();
      await page.keyboard.type('The slow brown fox jumps over the lazy dog.');

      // Save the edit (usually Escape or click outside)
      await page.keyboard.press('Escape');

      // Wait for edit to be processed
      await page.waitForTimeout(500);

      // Verify CriticMarkup was generated
      const trackedContent = await page.evaluate(() => {
        const quartoReview = (window as any).quartoReview;
        return quartoReview?.changes?.getElementContentWithTrackedChanges(
          'test.para-1'
        );
      });

      expect(trackedContent).toContain('~~');
      expect(trackedContent).toContain('quick');
      expect(trackedContent).toContain('slow');
    });

    test('should edit a list item and preserve list markers', async ({
      page,
    }) => {
      await createTestDocument(page, [
        { markdown: '- First item\n- Second item\n- Third item' },
      ]);

      await page.waitForSelector('[data-review-id]');
      await page.click('[data-review-id="test.para-1"]');
      await page.waitForSelector('.milkdown-editor');

      // Edit the list
      await page.keyboard.selectAll();
      await page.keyboard.type('- First item\n- Second item modified\n- Third item');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      const trackedContent = await page.evaluate(() => {
        const quartoReview = (window as any).quartoReview;
        return quartoReview?.changes?.getElementContentWithTrackedChanges(
          'test.para-1'
        );
      });

      // Should preserve list markers
      expect(trackedContent).toContain('- ');
      expect(trackedContent).toContain('modified');
    });

    test('should edit a table cell and preserve table structure', async ({
      page,
    }) => {
      const tableMarkdown = '| Column A | Column B |\n|----------|----------|\n| Value 1  | Value 2  |';
      await createTestDocument(page, [{ markdown: tableMarkdown }]);

      await page.waitForSelector('[data-review-id]');
      await page.click('[data-review-id="test.para-1"]');
      await page.waitForSelector('.milkdown-editor');

      // Edit table
      const editedTable =
        '| Column A | Column B |\n|----------|----------|\n| Value 1  | Changed  |';
      await page.keyboard.selectAll();
      await page.keyboard.type(editedTable);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      const trackedContent = await page.evaluate(() => {
        const quartoReview = (window as any).quartoReview;
        return quartoReview?.changes?.getElementContentWithTrackedChanges(
          'test.para-1'
        );
      });

      expect(trackedContent).toContain('|');
      expect(trackedContent).toContain('Changed');
    });
  });

  test.describe('Multiple Elements', () => {
    test('should track changes across multiple paragraphs', async ({ page }) => {
      await createTestDocument(page, [
        { id: 'test.para-1', markdown: 'First paragraph' },
        { id: 'test.para-2', markdown: 'Second paragraph' },
        { id: 'test.para-3', markdown: 'Third paragraph' },
      ]);

      await page.waitForSelector('[data-review-id]');

      // Edit second paragraph
      await page.click('[data-review-id="test.para-2"]');
      await page.waitForSelector('.milkdown-editor');
      await page.keyboard.selectAll();
      await page.keyboard.type('Second paragraph modified');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Check that only second paragraph has changes
      const changes = await page.evaluate(() => {
        const quartoReview = (window as any).quartoReview;
        return {
          para1: quartoReview?.changes?.getElementContentWithTrackedChanges('test.para-1'),
          para2: quartoReview?.changes?.getElementContentWithTrackedChanges('test.para-2'),
          para3: quartoReview?.changes?.getElementContentWithTrackedChanges('test.para-3'),
        };
      });

      expect(changes.para1).toBe('First paragraph');
      expect(changes.para2).toContain('modified');
      expect(changes.para3).toBe('Third paragraph');
    });
  });

  test.describe('Undo/Redo', () => {
    test('should undo an edit', async ({ page }) => {
      await createTestDocument(page, [
        { markdown: 'Original content' },
      ]);

      await page.waitForSelector('[data-review-id]');
      await page.click('[data-review-id="test.para-1"]');
      await page.waitForSelector('.milkdown-editor');
      await page.keyboard.selectAll();
      await page.keyboard.type('Modified content');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Undo the edit
      await page.evaluate(() => {
        const quartoReview = (window as any).quartoReview;
        quartoReview?.changes?.undo();
      });

      const content = await page.evaluate(() => {
        const quartoReview = (window as any).quartoReview;
        return quartoReview?.changes?.getCurrentState('test.para-1');
      });

      expect(content).toBe('Original content');
    });

    test('should redo an undone edit', async ({ page }) => {
      await createTestDocument(page, [
        { markdown: 'Original content' },
      ]);

      await page.waitForSelector('[data-review-id]');
      await page.click('[data-review-id="test.para-1"]');
      await page.waitForSelector('.milkdown-editor');
      await page.keyboard.selectAll();
      await page.keyboard.type('Modified content');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Undo then redo
      await page.evaluate(() => {
        const quartoReview = (window as any).quartoReview;
        quartoReview?.changes?.undo();
        quartoReview?.changes?.redo();
      });

      const content = await page.evaluate(() => {
        const quartoReview = (window as any).quartoReview;
        return quartoReview?.changes?.getCurrentState('test.para-1');
      });

      expect(content).toBe('Modified content');
    });
  });

  test.describe('Export Functionality', () => {
    test('should export clean markdown (accepted changes)', async ({ page }) => {
      await createTestDocument(page, [
        { markdown: 'Original content' },
      ]);

      await page.waitForSelector('[data-review-id]');
      await page.click('[data-review-id="test.para-1"]');
      await page.waitForSelector('.milkdown-editor');
      await page.keyboard.selectAll();
      await page.keyboard.type('Modified content');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Export clean markdown
      const cleanMarkdown = await page.evaluate(() => {
        const quartoReview = (window as any).quartoReview;
        return quartoReview?.changes?.toCleanMarkdown();
      });

      expect(cleanMarkdown).toContain('Modified content');
      expect(cleanMarkdown).not.toContain('{++');
      expect(cleanMarkdown).not.toContain('++}');
      expect(cleanMarkdown).not.toContain('{--');
    });

    test('should export tracked changes markdown', async ({ page }) => {
      await createTestDocument(page, [
        { markdown: 'Original content' },
      ]);

      await page.waitForSelector('[data-review-id]');
      await page.click('[data-review-id="test.para-1"]');
      await page.waitForSelector('.milkdown-editor');
      await page.keyboard.selectAll();
      await page.keyboard.type('Modified content');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Export tracked changes
      const trackedMarkdown = await page.evaluate(() => {
        const quartoReview = (window as any).quartoReview;
        return quartoReview?.changes?.toTrackedMarkdown();
      });

      expect(trackedMarkdown).toBeDefined();
      expect(
        trackedMarkdown.includes('{++') ||
          trackedMarkdown.includes('{--') ||
          trackedMarkdown.includes('{~~')
      ).toBe(true);
    });
  });

  test.describe('Fixture-Based E2E Tests', () => {
    // Simple word change test
    test('should handle simple word change (fixture)', async ({ page }) => {
      const original = loadFixture('transformation/inputs/simple-word-change.md');
      const edited = loadFixture('transformation/edits/simple-word-change.md');
      const expectedCritic = loadFixture(
        'transformation/expected/critic-markup/simple-word-change.md'
      );

      await createTestDocument(page, [{ markdown: original }]);
      await page.waitForSelector('[data-review-id]');
      await page.click('[data-review-id="test.para-1"]');
      await page.waitForSelector('.milkdown-editor');
      await page.keyboard.selectAll();
      await page.keyboard.type(edited);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      const trackedContent = await page.evaluate(() => {
        const quartoReview = (window as any).quartoReview;
        return quartoReview?.changes?.getElementContentWithTrackedChanges(
          'test.para-1'
        );
      });

      expect(trackedContent?.trim()).toBe(expectedCritic.trim());
    });

    // List deletion test
    test('should handle list item deletion (fixture)', async ({ page }) => {
      const original = loadFixture('transformation/inputs/list-delete-item.md');
      const edited = loadFixture('transformation/edits/list-delete-item.md');

      await createTestDocument(page, [{ markdown: original }]);
      await page.waitForSelector('[data-review-id]');
      await page.click('[data-review-id="test.para-1"]');
      await page.waitForSelector('.milkdown-editor');
      await page.keyboard.selectAll();
      await page.keyboard.type(edited);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      const cleanMarkdown = await page.evaluate(() => {
        const quartoReview = (window as any).quartoReview;
        return quartoReview?.changes?.toCleanMarkdown();
      });

      expect(cleanMarkdown.trim()).toContain('First item');
      expect(cleanMarkdown.trim()).toContain('Third item');
      expect(cleanMarkdown.trim()).not.toContain('Second item');
    });

    // Unicode/emoji test
    test('should handle unicode and emoji (fixture)', async ({ page }) => {
      const original = loadFixture('transformation/inputs/unicode-emoji.md');
      const edited = loadFixture('transformation/edits/unicode-emoji.md');

      await createTestDocument(page, [{ markdown: original }]);
      await page.waitForSelector('[data-review-id]');
      await page.click('[data-review-id="test.para-1"]');
      await page.waitForSelector('.milkdown-editor');
      await page.keyboard.selectAll();
      await page.keyboard.type(edited);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      const trackedContent = await page.evaluate(() => {
        const quartoReview = (window as any).quartoReview;
        return quartoReview?.changes?.getElementContentWithTrackedChanges(
          'test.para-1'
        );
      });

      expect(trackedContent).toContain('👋');
      expect(trackedContent).toContain('Universe');
    });
  });

  test.describe('Edge Cases in Browser', () => {
    test('should handle rapid sequential edits', async ({ page }) => {
      await createTestDocument(page, [{ markdown: 'Start' }]);
      await page.waitForSelector('[data-review-id]');

      // Make multiple rapid edits
      for (let i = 1; i <= 3; i++) {
        await page.click('[data-review-id="test.para-1"]');
        await page.waitForSelector('.milkdown-editor');
        await page.keyboard.selectAll();
        await page.keyboard.type(`Edit ${i}`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }

      const content = await page.evaluate(() => {
        const quartoReview = (window as any).quartoReview;
        return quartoReview?.changes?.getCurrentState('test.para-1');
      });

      expect(content).toBe('Edit 3');
    });

    test('should handle empty content edit', async ({ page }) => {
      await createTestDocument(page, [{ markdown: 'Content to delete' }]);
      await page.waitForSelector('[data-review-id]');
      await page.click('[data-review-id="test.para-1"]');
      await page.waitForSelector('.milkdown-editor');
      await page.keyboard.selectAll();
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      const trackedContent = await page.evaluate(() => {
        const quartoReview = (window as any).quartoReview;
        return quartoReview?.changes?.getElementContentWithTrackedChanges(
          'test.para-1'
        );
      });

      expect(trackedContent).toContain('Content to delete');
      expect(trackedContent).toContain('--');
    });
  });

  test.describe('Visual Regression', () => {
    test('should display CriticMarkup styling correctly', async ({ page }) => {
      await createTestDocument(page, [
        { markdown: 'Text with {++addition++} and {--deletion--}' },
      ]);

      await page.waitForSelector('[data-review-id]');

      // Take screenshot to verify visual styling
      await expect(page).toHaveScreenshot('critic-markup-display.png', {
        maxDiffPixels: 100,
      });
    });
  });
});

test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await createTestDocument(page, [
      { id: 'test.para-1', markdown: 'First' },
      { id: 'test.para-2', markdown: 'Second' },
    ]);

    await page.waitForSelector('[data-review-id]');

    // Tab to first element
    await page.keyboard.press('Tab');
    let focused = await page.evaluate(() => document.activeElement?.getAttribute('data-review-id'));
    expect(focused).toBeTruthy();

    // Tab to second element
    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => document.activeElement?.getAttribute('data-review-id'));
    expect(focused).toBeTruthy();
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    await createTestDocument(page, [
      { markdown: 'Test content' },
    ]);

    await page.waitForSelector('[data-review-id]');

    const ariaLabel = await page.getAttribute('[data-review-id="test.para-1"]', 'aria-label');
    expect(ariaLabel).toBeTruthy();
  });
});
