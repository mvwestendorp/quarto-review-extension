import { test, expect, Page } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Translation Workflow E2E Tests
 *
 * Tests the complete translation workflow including:
 * - Entering/exiting translation mode
 * - Manual sentence editing
 * - Undo/redo operations
 * - Export functionality
 * - Visual regression for status chips
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXAMPLE_PROJECT = path.join(
  __dirname,
  '..',
  '..',
  'example-projects',
  'basic-document'
);

test.describe('Translation Workflow E2E', () => {
  let serverProcess: any;
  let page: Page;

  test.beforeAll(async () => {
    // Render the Quarto project
    execSync('quarto render', {
      cwd: EXAMPLE_PROJECT,
      stdio: 'pipe',
    });
  });

  test.beforeEach(async ({ browser }) => {
    // Start a new page for each test
    page = await browser.newPage();

    // Navigate to the rendered document
    const htmlFile = path.join(EXAMPLE_PROJECT, '_site', 'index.html');
    await page.goto(`file://${htmlFile}`);

    // Wait for the review extension to load
    await page.waitForSelector('.review-toolbar', { timeout: 5000 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should enter and exit translation mode', async () => {
    // Check that we start in review mode
    await expect(page.locator('body')).not.toHaveClass(/translation-mode/);

    // Click translation mode button
    await page.click('[data-test="translation-mode-button"]');

    // Verify translation mode is active
    await expect(page.locator('body')).toHaveClass(/translation-mode/);
    await expect(page.locator('.review-translation-container')).toBeVisible();

    // Verify side-by-side panes are present
    await expect(page.locator('.review-translation-pane[data-pane="source"]')).toBeVisible();
    await expect(page.locator('.review-translation-pane[data-pane="target"]')).toBeVisible();

    // Click review mode to exit
    await page.click('[data-test="review-mode-button"]');

    // Verify we're back in review mode
    await expect(page.locator('body')).not.toHaveClass(/translation-mode/);
    await expect(page.locator('.review-translation-container')).not.toBeVisible();
  });

  test('should display translation status chips correctly', async () => {
    // Enter translation mode
    await page.click('[data-test="translation-mode-button"]');
    await page.waitForSelector('.review-translation-container');

    // Check for untranslated status chips
    const untranslatedChips = page.locator(
      '.review-translation-status-chip[data-status="untranslated"]'
    );
    await expect(untranslatedChips.first()).toBeVisible();

    // Verify chip has proper aria-label for accessibility
    await expect(untranslatedChips.first()).toHaveAttribute(
      'aria-label',
      /untranslated/i
    );

    // Take screenshot for visual regression
    await page.screenshot({
      path: 'test-results/translation-status-chips.png',
      fullPage: false,
    });
  });

  test('should allow manual sentence editing', async () => {
    // Enter translation mode
    await page.click('[data-test="translation-mode-button"]');
    await page.waitForSelector('.review-translation-container');

    // Find first target sentence
    const targetSentence = page
      .locator('.review-translation-pane[data-pane="target"]')
      .locator('.review-translation-sentence')
      .first();

    // Double-click to edit
    await targetSentence.dblclick();

    // Wait for editor to appear
    await page.waitForSelector('.review-editor-container', { timeout: 2000 });

    // Type some text
    const editor = page.locator('.milkdown-editor');
    await editor.clear();
    await editor.fill('This is manually translated text');

    // Save the edit (Ctrl+S or Cmd+S)
    await page.keyboard.press('Control+S');

    // Wait for editor to close
    await page.waitForSelector('.review-editor-container', {
      state: 'hidden',
      timeout: 2000,
    });

    // Verify the text was updated
    await expect(targetSentence).toContainText('This is manually translated text');

    // Verify status chip changed to 'manual'
    const manualChip = targetSentence.locator(
      '.review-translation-status-chip[data-status="manual"]'
    );
    await expect(manualChip).toBeVisible();
  });

  test('should handle undo/redo operations', async () => {
    // Enter translation mode
    await page.click('[data-test="translation-mode-button"]');
    await page.waitForSelector('.review-translation-container');

    // Make a manual edit
    const targetSentence = page
      .locator('.review-translation-pane[data-pane="target"]')
      .locator('.review-translation-sentence')
      .first();

    const originalText = await targetSentence.textContent();

    // Edit the sentence
    await targetSentence.dblclick();
    await page.waitForSelector('.milkdown-editor');
    await page.locator('.milkdown-editor').fill('Edited text for undo test');
    await page.keyboard.press('Control+S');
    await page.waitForSelector('.review-editor-container', { state: 'hidden' });

    // Verify the edit
    await expect(targetSentence).toContainText('Edited text for undo test');

    // Undo the change (Ctrl+Z or Cmd+Z)
    await page.keyboard.press('Control+Z');

    // Wait a moment for undo to apply
    await page.waitForTimeout(500);

    // Verify the text reverted
    // Note: Exact text match may vary depending on implementation
    await expect(targetSentence).not.toContainText('Edited text for undo test');

    // Redo the change (Ctrl+Shift+Z or Ctrl+Y)
    await page.keyboard.press('Control+Shift+Z');

    // Wait for redo to apply
    await page.waitForTimeout(500);

    // Verify the edit is back
    await expect(targetSentence).toContainText('Edited text for undo test');
  });

  test('should translate entire document with auto-translate', async () => {
    // Enter translation mode
    await page.click('[data-test="translation-mode-button"]');
    await page.waitForSelector('.review-translation-container');

    // Select a provider (manual provider for testing)
    const providerSelect = page.locator('select[data-test="provider-select"]');
    await providerSelect.selectOption('manual');

    // Click translate all button
    await page.click('[data-test="translate-all-button"]');

    // Wait for translation to start
    await page.waitForSelector('.review-translation-progress-bar', {
      timeout: 2000,
    });

    // For manual provider, sentences should show as translated
    // Wait for progress to complete or timeout
    await page.waitForTimeout(2000);

    // Verify at least some sentences have status chips
    const statusChips = page.locator('.review-translation-status-chip');
    await expect(statusChips.first()).toBeVisible();
  });

  test('should export translated document', async () => {
    // Enter translation mode
    await page.click('[data-test="translation-mode-button"]');
    await page.waitForSelector('.review-translation-container');

    // Make a manual edit first
    const targetSentence = page
      .locator('.review-translation-pane[data-pane="target"]')
      .locator('.review-translation-sentence')
      .first();

    await targetSentence.dblclick();
    await page.waitForSelector('.milkdown-editor');
    await page.locator('.milkdown-editor').fill('Test export content');
    await page.keyboard.press('Control+S');
    await page.waitForSelector('.review-editor-container', { state: 'hidden' });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click export button (unified export)
    await page.click('[data-test="export-unified-button"]');

    // Wait for download
    const download = await downloadPromise;

    // Verify download started
    expect(download.suggestedFilename()).toMatch(/\.qmd$/);

    // Save the file to verify contents
    const downloadPath = path.join('test-results', download.suggestedFilename());
    await download.saveAs(downloadPath);

    // File should exist
    const fs = require('fs');
    expect(fs.existsSync(downloadPath)).toBeTruthy();

    // Verify it contains our edited text
    const content = fs.readFileSync(downloadPath, 'utf-8');
    expect(content).toContain('Test export content');
  });

  test('should show progress during translation', async () => {
    // Enter translation mode
    await page.click('[data-test="translation-mode-button"]');
    await page.waitForSelector('.review-translation-container');

    // Select manual provider
    await page.selectOption('select[data-test="provider-select"]', 'manual');

    // Click translate all
    await page.click('[data-test="translate-all-button"]');

    // Verify progress indicators appear
    await expect(page.locator('.review-translation-progress-bar')).toBeVisible();
    await expect(page.locator('.review-translation-progress-message')).toBeVisible();

    // Verify progress message contains percentage or status
    const progressMessage = page.locator('.review-translation-progress-message');
    await expect(progressMessage).toHaveText(/translating|progress|%/i);
  });

  test('should handle error states gracefully', async () => {
    // Enter translation mode
    await page.click('[data-test="translation-mode-button"]');
    await page.waitForSelector('.review-translation-container');

    // Try to translate without selecting a valid provider or with invalid config
    // This test depends on the implementation - may need to mock a provider error

    // For now, verify error banner can be displayed
    // This may require triggering an actual error condition
    // Skip if error testing infrastructure isn't ready
    test.skip();
  });

  test('should maintain scroll synchronization between panes', async () => {
    // Enter translation mode
    await page.click('[data-test="translation-mode-button"]');
    await page.waitForSelector('.review-translation-container');

    // Get both panes
    const sourcePane = page.locator('.review-translation-pane[data-pane="source"]');
    const targetPane = page.locator('.review-translation-pane[data-pane="target"]');

    // Get initial scroll positions
    const sourceScrollBefore = await sourcePane.evaluate((el) => el.scrollTop);
    const targetScrollBefore = await targetPane.evaluate((el) => el.scrollTop);

    // Scroll source pane
    await sourcePane.evaluate((el) => {
      el.scrollTop = 100;
    });

    // Wait for scroll sync
    await page.waitForTimeout(100);

    // Verify target pane scrolled too
    const targetScrollAfter = await targetPane.evaluate((el) => el.scrollTop);
    expect(targetScrollAfter).toBeGreaterThan(targetScrollBefore);
    expect(targetScrollAfter).toBeCloseTo(100, -1); // Within 10px
  });

  test('should respect keyboard shortcuts', async () => {
    // Enter translation mode
    await page.click('[data-test="translation-mode-button"]');
    await page.waitForSelector('.review-translation-container');

    // Test Ctrl+T for translate all
    await page.keyboard.press('Control+T');

    // Verify translation started
    await expect(page.locator('.review-translation-progress-bar')).toBeVisible({
      timeout: 2000,
    });
  });

  test('should update correspondence lines on edit', async () => {
    // Enter translation mode
    await page.click('[data-test="translation-mode-button"]');
    await page.waitForSelector('.review-translation-container');

    // Enable correspondence lines if not already enabled
    const showLinesCheckbox = page.locator('[data-test="show-correspondence-lines"]');
    if (!(await showLinesCheckbox.isChecked())) {
      await showLinesCheckbox.click();
    }

    // Verify correspondence lines are visible
    await expect(page.locator('.review-translation-correspondence-line')).toBeVisible({
      timeout: 1000,
    });

    // Make an edit
    const targetSentence = page
      .locator('.review-translation-pane[data-pane="target"]')
      .locator('.review-translation-sentence')
      .first();

    await targetSentence.dblclick();
    await page.waitForSelector('.milkdown-editor');
    await page.locator('.milkdown-editor').fill('New translation');
    await page.keyboard.press('Control+S');

    // Correspondence lines should still be present and updated
    await expect(page.locator('.review-translation-correspondence-line')).toBeVisible();
  });

  test('visual regression: status chip colors and styles', async () => {
    // Enter translation mode
    await page.click('[data-test="translation-mode-button"]');
    await page.waitForSelector('.review-translation-container');

    // Create different status scenarios
    // 1. Untranslated (default state)
    const untranslatedSentence = page
      .locator('.review-translation-sentence[data-status="untranslated"]')
      .first();
    await expect(untranslatedSentence).toBeVisible();

    // Take screenshot of untranslated chip
    await untranslatedSentence.screenshot({
      path: 'test-results/chip-untranslated.png',
    });

    // 2. Manual edit to create "manual" status
    const targetSentence = page
      .locator('.review-translation-pane[data-pane="target"]')
      .locator('.review-translation-sentence')
      .nth(1);

    await targetSentence.dblclick();
    await page.waitForSelector('.milkdown-editor');
    await page.locator('.milkdown-editor').fill('Manual translation');
    await page.keyboard.press('Control+S');
    await page.waitForSelector('.review-editor-container', { state: 'hidden' });

    // Take screenshot of manual chip
    await targetSentence.screenshot({
      path: 'test-results/chip-manual.png',
    });

    // Verify chip has correct background and text color (accessibility)
    const manualChip = targetSentence.locator('.review-translation-status-chip');
    const chipStyles = await manualChip.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
      };
    });

    // Colors should be defined (not transparent/default)
    expect(chipStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(chipStyles.color).not.toBe('rgb(0, 0, 0)');
  });
});
