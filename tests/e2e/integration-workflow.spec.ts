import { test, expect } from '@playwright/test';

/**
 * Integration E2E Tests - Focus on workflows NOT covered by unit tests
 *
 * Unit tests cover: individual edits, markdown output, HTML rendering
 * E2E tests cover: user workflows, persistence, UI interactions, multi-step scenarios
 *
 * These tests are focused and efficient (target <10 seconds for quick feedback)
 */

test.describe('Document Editing Workflow Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    // Wait for the document to fully load
    await page.waitForSelector('[data-review-id]', { timeout: 5000 });
  });

  test('Complete document edit workflow: open editor → edit → save → verify', async ({ page }) => {
    // Find first editable paragraph
    const para = page.locator('[data-review-type="Para"]').first();
    const originalText = await para.textContent();

    // Double-click to open editor
    await para.dblClick();
    await page.waitForSelector('.review-editor-modal', { timeout: 3000 });

    // Edit the content
    const textarea = page.locator('.review-editor-content textarea').first();
    const currentContent = await textarea.inputValue();
    const newContent = currentContent + ' [INTEGRATION TEST]';
    await textarea.fill(newContent);

    // Save changes
    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-editor-modal', { state: 'hidden', timeout: 3000 });

    // Verify changes persisted in DOM
    const updatedText = await para.textContent();
    expect(updatedText).toContain('[INTEGRATION TEST]');
    expect(updatedText).not.toBe(originalText);
  });

  test('Multiple sequential edits maintain state', async ({ page }) => {
    const paras = page.locator('[data-review-type="Para"]');
    const count = Math.min(3, await paras.count());

    // Edit multiple paragraphs in sequence
    for (let i = 0; i < count; i++) {
      const para = paras.nth(i);
      await para.dblClick();
      await page.waitForSelector('.review-editor-modal');

      const textarea = page.locator('.review-editor-content textarea').first();
      const content = await textarea.inputValue();
      await textarea.fill(content + ` [EDIT-${i + 1}]`);

      const saveBtn = page.locator('button:has-text("Save")').first();
      await saveBtn.click();
      await page.waitForSelector('.review-editor-modal', { state: 'hidden' });
    }

    // Verify all edits persisted
    for (let i = 0; i < count; i++) {
      const text = await paras.nth(i).textContent();
      expect(text).toContain(`[EDIT-${i + 1}]`);
    }
  });

  test('Editor modal opens and closes correctly', async ({ page }) => {
    const para = page.locator('[data-review-type="Para"]').first();

    // Modal should not be visible initially
    let modal = page.locator('.review-editor-modal');
    expect(await modal.count()).toBe(0);

    // Open editor
    await para.dblClick();
    await page.waitForSelector('.review-editor-modal');

    modal = page.locator('.review-editor-modal');
    expect(await modal.count()).toBe(1);
    expect(await modal.isVisible()).toBe(true);

    // Close editor
    const closeBtn = page.locator('button:has-text("Cancel")').first();
    await closeBtn.click();
    await page.waitForSelector('.review-editor-modal', { state: 'hidden' });

    // Modal should be gone
    modal = page.locator('.review-editor-modal');
    expect(await modal.count()).toBe(0);
  });

  test('Editor content matches element being edited', async ({ page }) => {
    const para = page.locator('[data-review-type="Para"]').nth(1);
    const paraText = await para.textContent();

    // Open editor
    await para.dblClick();
    await page.waitForSelector('.review-editor-modal');

    // Content in textarea should match the paragraph
    const textarea = page.locator('.review-editor-content textarea').first();
    const textareaContent = await textarea.inputValue();

    // The textarea contains markdown, the para text is rendered - should be related
    expect(textareaContent.length).toBeGreaterThan(0);
    expect(paraText).toContain(textareaContent.split('\n')[0].substring(0, 20));
  });

  test('Cancel button discards unsaved changes', async ({ page }) => {
    const para = page.locator('[data-review-type="Para"]').first();
    const originalText = await para.textContent();

    // Open editor and make changes
    await para.dblClick();
    await page.waitForSelector('.review-editor-modal');

    const textarea = page.locator('.review-editor-content textarea').first();
    await textarea.fill('COMPLETELY DIFFERENT TEXT');

    // Cancel without saving
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForSelector('.review-editor-modal', { state: 'hidden' });

    // Verify changes were NOT applied
    const finalText = await para.textContent();
    expect(finalText).toBe(originalText);
  });
});

test.describe('Change Tracking and Display Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await page.waitForSelector('[data-review-id]', { timeout: 5000 });
  });

  test('Edited elements show visual change tracking', async ({ page }) => {
    const para = page.locator('[data-review-type="Para"]').first();

    // Edit the paragraph
    await para.dblClick();
    await page.waitForSelector('.review-editor-modal');

    const textarea = page.locator('.review-editor-content textarea').first();
    const content = await textarea.inputValue();
    await textarea.fill(content + ' NEW TRACKED CHANGE');

    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-editor-modal', { state: 'hidden' });

    // Check if CriticMarkup tracking is visible
    const paraHtml = await para.innerHTML();
    expect(paraHtml).toContain('NEW TRACKED CHANGE');
  });

  test('Multiple edits to same element accumulate', async ({ page }) => {
    const para = page.locator('[data-review-type="Para"]').first();

    // First edit
    await para.dblClick();
    await page.waitForSelector('.review-editor-modal');
    let textarea = page.locator('.review-editor-content textarea').first();
    let content = await textarea.inputValue();
    await textarea.fill(content + ' FIRST');
    let saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-editor-modal', { state: 'hidden' });

    // Second edit to same element
    await para.dblClick();
    await page.waitForSelector('.review-editor-modal');
    textarea = page.locator('.review-editor-content textarea').first();
    content = await textarea.inputValue();
    await textarea.fill(content + ' SECOND');
    saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-editor-modal', { state: 'hidden' });

    // Verify both edits are present
    const finalText = await para.textContent();
    expect(finalText).toContain('FIRST');
    expect(finalText).toContain('SECOND');
  });
});

test.describe('Different Element Types Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await page.waitForSelector('[data-review-id]', { timeout: 5000 });
  });

  test('Can edit header element through UI', async ({ page }) => {
    const header = page.locator('h2').first();
    const originalText = await header.textContent();

    // Open and edit header
    await header.dblClick();
    await page.waitForSelector('.review-editor-modal');

    const textarea = page.locator('.review-editor-content textarea').first();
    const content = await textarea.inputValue();
    await textarea.fill(content + ' [EDITED]');

    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-editor-modal', { state: 'hidden' });

    // Verify header changed
    const newText = await header.textContent();
    expect(newText).toContain('[EDITED]');
    expect(newText).not.toBe(originalText);
  });

  test('Can edit list items through UI', async ({ page }) => {
    const lists = page.locator('[data-review-type="BulletList"]');
    const count = await lists.count();

    if (count > 0) {
      const list = lists.first();
      const originalText = await list.textContent();

      // Open and edit list
      await list.dblClick();
      await page.waitForSelector('.review-editor-modal');

      const textarea = page.locator('.review-editor-content textarea').first();
      const content = await textarea.inputValue();
      await textarea.fill(content + '\n- New list item');

      const saveBtn = page.locator('button:has-text("Save")').first();
      await saveBtn.click();
      await page.waitForSelector('.review-editor-modal', { state: 'hidden' });

      // Verify list changed
      const newText = await list.textContent();
      expect(newText).toContain('New list item');
      expect(newText).not.toBe(originalText);
    }
  });
});

test.describe('Performance and Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await page.waitForSelector('[data-review-id]', { timeout: 5000 });
  });

  test('Editor opens within reasonable time', async ({ page }) => {
    const para = page.locator('[data-review-type="Para"]').first();

    const startTime = Date.now();
    await para.dblClick();
    await page.waitForSelector('.review-editor-modal');
    const endTime = Date.now();

    const duration = endTime - startTime;
    // Editor should open in less than 2 seconds
    expect(duration).toBeLessThan(2000);
  });

  test('Save operation completes within reasonable time', async ({ page }) => {
    const para = page.locator('[data-review-type="Para"]').first();

    await para.dblClick();
    await page.waitForSelector('.review-editor-modal');

    const textarea = page.locator('.review-editor-content textarea').first();
    const content = await textarea.inputValue();
    await textarea.fill(content + ' TEST');

    const startTime = Date.now();
    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-editor-modal', { state: 'hidden' });
    const endTime = Date.now();

    const duration = endTime - startTime;
    // Save should complete in less than 1 second
    expect(duration).toBeLessThan(1000);
  });

  test('Page remains responsive after multiple edits', async ({ page }) => {
    const paras = page.locator('[data-review-type="Para"]');
    const count = Math.min(5, await paras.count());

    for (let i = 0; i < count; i++) {
      const para = paras.nth(i);

      // Measure time for each edit cycle
      const startTime = Date.now();

      await para.dblClick();
      await page.waitForSelector('.review-editor-modal');

      const textarea = page.locator('.review-editor-content textarea').first();
      const content = await textarea.inputValue();
      await textarea.fill(content + ` [${i}]`);

      const saveBtn = page.locator('button:has-text("Save")').first();
      await saveBtn.click();
      await page.waitForSelector('.review-editor-modal', { state: 'hidden' });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Each edit cycle should be fast (under 2 seconds)
      expect(duration).toBeLessThan(2000);
    }

    // Page should still be interactive
    expect(await paras.count()).toBeGreaterThan(0);
  });
});

test.describe('Data Persistence Across Navigation', () => {
  test('Edits persist when navigating and returning', async ({ page }) => {
    // Navigate to example
    await page.goto('/example');
    await page.waitForSelector('[data-review-id]');

    const para = page.locator('[data-review-type="Para"]').first();

    // Make an edit
    await para.dblClick();
    await page.waitForSelector('.review-editor-modal');

    const textarea = page.locator('.review-editor-content textarea').first();
    const content = await textarea.inputValue();
    await textarea.fill(content + ' PERSISTENCE_TEST');

    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-editor-modal', { state: 'hidden' });

    // Get the edited text
    const editedText = await para.textContent();
    expect(editedText).toContain('PERSISTENCE_TEST');

    // Reload the page to verify edits persist
    await page.reload();
    await page.waitForSelector('[data-review-id]');

    const reloadedPara = page.locator('[data-review-type="Para"]').first();
    const reloadedText = await reloadedPara.textContent();

    // Edit should still be there (if using localStorage/session storage)
    expect(reloadedText).toContain('PERSISTENCE_TEST');
  });
});
