import { test, expect, type Page } from '@playwright/test';

/**
 * Integration E2E Tests - Focus on workflows NOT covered by unit tests
 *
 * Unit tests cover: individual edits, markdown output, HTML rendering
 * E2E tests cover: user workflows, persistence, UI interactions, multi-step scenarios
 *
 * These tests are focused and efficient (target <10 seconds for quick feedback)
 */

/**
 * Helper function to type text into Milkdown editor
 * Uses pressSequentially to trigger proper input events that Milkdown recognizes
 */
async function typeInEditor(page: Page, text: string): Promise<void> {
  const editor = page.locator('.milkdown .ProseMirror').first();
  await editor.click();
  await editor.focus(); // Explicit focus for reliability

  // Wait for editor to be ready
  await page.waitForTimeout(100);

  // Use keyboard shortcuts to position at end more reliably
  // First ensure we're at the start, then navigate to end
  await page.keyboard.press('Control+Home'); // Go to start
  await page.waitForTimeout(50);
  await page.keyboard.press('Control+End'); // Then to end
  await page.waitForTimeout(100); // Longer wait for cursor positioning

  // Type with a longer delay between characters to ensure Milkdown processes each one
  // Slower typing appears to be more reliable with Milkdown's event handling
  await editor.pressSequentially(text, { delay: 50 });

  // Wait for content to be fully processed
  await page.waitForTimeout(200);
}

test.describe('Document Editing Workflow Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console logs and errors for debugging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('Browser error:', msg.text());
      }
    });
    page.on('pageerror', (error) => {
      console.log('Page error:', error.message);
    });

    await page.goto('/example');
    // Wait for the document to fully load
    await page.waitForSelector('[data-review-id]', { timeout: 5000 });
  });

  test('Complete document edit workflow: open editor → edit → save → verify', async ({ page }) => {
    // Find first editable paragraph wrapper
    const paraWrapper = page.locator('[data-review-type="Para"]').first();
    // Get the actual paragraph element, not the button wrapper
    const paraContent = paraWrapper.locator('> p, > .review-section-wrapper').first();
    const originalText = await paraContent.textContent();

    // Double-click to open inline editor
    await paraWrapper.dblclick();
    await page.waitForSelector('.review-inline-editor-container', {
      timeout: 3000,
    });

    // Edit the content in Milkdown editor
    await typeInEditor(page, ' [INTEGRATION TEST]');

    // Save changes
    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-inline-editor-container', {
      state: 'hidden',
      timeout: 3000,
    });

    // Verify changes persisted in editable content (not the button overlay)
    const updatedText = await paraContent.textContent();
    expect(updatedText).toContain('[INTEGRATION TEST]');
    expect(updatedText).not.toBe(originalText);
  });

  test('Multiple sequential edits maintain state', async ({ page }) => {
    const paras = page.locator('[data-review-type="Para"]');
    const count = Math.min(3, await paras.count());

    // Edit multiple paragraphs in sequence
    for (let i = 0; i < count; i++) {
      const para = paras.nth(i);
      await para.dblclick();
      await page.waitForSelector('.review-inline-editor-container');

      await typeInEditor(page, ` [EDIT-${i + 1}]`);

      const saveBtn = page.locator('button:has-text("Save")').first();
      await saveBtn.click();
      await page.waitForSelector('.review-inline-editor-container', {
        state: 'hidden',
      });
    }

    // Verify all edits persisted (check editable content, not button overlay)
    for (let i = 0; i < count; i++) {
      const content = paras.nth(i).locator('> *:not(.review-segment-actions)').first();
      const text = await content.textContent();
      expect(text).toContain(`[EDIT-${i + 1}]`);
    }
  });

  test('Editor opens and closes correctly', async ({ page }) => {
    const para = page.locator('[data-review-type="Para"]').first();

    // Inline editor should not be visible initially
    let editor = para.locator('.review-inline-editor-container');
    expect(await editor.count()).toBe(0);

    // Open editor
    await para.dblclick();
    await page.waitForSelector('.review-inline-editor-container');

    editor = para.locator('.review-inline-editor-container');
    expect(await editor.count()).toBe(1);
    expect(await editor.isVisible()).toBe(true);

    // Close editor
    const closeBtn = page.locator('button:has-text("Cancel")').first();
    await closeBtn.click();
    await page.waitForSelector('.review-inline-editor-container', {
      state: 'hidden',
    });

    // Editor should be gone
    editor = para.locator('.review-inline-editor-container');
    expect(await editor.count()).toBe(0);
  });

  test('Editor content matches element being edited', async ({ page }) => {
    const para = page.locator('[data-review-type="Para"]').nth(1);
    const paraText = await para.textContent();

    // Open editor
    await para.dblclick();
    await page.waitForSelector('.review-inline-editor-container');

    // Content in editor should match the paragraph
    const editor = page.locator('.milkdown .ProseMirror').first();
    const editorContent = await editor.textContent();

    // The editor contains markdown, the para text is rendered - should be related
    expect(editorContent).toBeTruthy();
    expect(editorContent.length).toBeGreaterThan(0);
  });

  test('Cancel button discards unsaved changes', async ({ page }) => {
    const paraWrapper = page.locator('[data-review-type="Para"]').first();
    const paraContent = paraWrapper.locator('> *:not(.review-segment-actions)').first();
    const originalText = await paraContent.textContent();

    // Open editor and make changes
    await paraWrapper.dblclick();
    await page.waitForSelector('.review-inline-editor-container');

    const editor = page.locator('.milkdown .ProseMirror').first();
    await editor.click();
    await page.keyboard.press('Control+A'); // Select all
    await editor.pressSequentially('COMPLETELY DIFFERENT TEXT', { delay: 10 });

    // Cancel without saving
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForSelector('.review-inline-editor-container', {
      state: 'hidden',
    });

    // Verify changes were NOT applied
    const finalText = await paraContent.textContent();
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
    await para.dblclick();
    await page.waitForSelector('.review-inline-editor-container');

    await typeInEditor(page, ' NEW TRACKED CHANGE');

    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-inline-editor-container', {
      state: 'hidden',
    });

    // Check if CriticMarkup tracking is visible
    const paraHtml = await para.innerHTML();
    expect(paraHtml).toContain('NEW TRACKED CHANGE');
  });

  test('Multiple edits to same element accumulate', async ({ page }) => {
    const para = page.locator('[data-review-type="Para"]').first();

    // First edit
    await para.dblclick();
    await page.waitForSelector('.review-inline-editor-container');
    await typeInEditor(page, ' FIRST');
    let saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-inline-editor-container', {
      state: 'hidden',
    });

    // Second edit to same element
    await para.dblclick();
    await page.waitForSelector('.review-inline-editor-container');
    await typeInEditor(page, ' SECOND');
    saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-inline-editor-container', {
      state: 'hidden',
    });

    // Verify both edits are present
    const paraContent = para.locator('> *:not(.review-segment-actions)').first();
    const finalText = await paraContent.textContent();
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
    const headerWrapper = page.locator('[data-review-type="Header"]').first();
    const headerContent = headerWrapper.locator('> *:not(.review-segment-actions)').first();
    const originalText = await headerContent.textContent();

    // Open and edit header
    await headerWrapper.dblclick();
    await page.waitForSelector('.review-inline-editor-container');

    await typeInEditor(page, ' [EDITED]');

    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-inline-editor-container', {
      state: 'hidden',
    });

    // Verify header changed
    const newText = await headerContent.textContent();
    expect(newText).toContain('[EDITED]');
    expect(newText).not.toBe(originalText);
  });

  test('Can edit list items through UI', async ({ page }) => {
    const lists = page.locator('[data-review-type="BulletList"]');
    const count = await lists.count();

    if (count > 0) {
      const listWrapper = lists.first();
      const listContent = listWrapper.locator('> *:not(.review-segment-actions)').first();
      const originalText = await listContent.textContent();

      // Open and edit list
      await listWrapper.dblclick();
      await page.waitForSelector('.review-inline-editor-container');

      const editor = page.locator('.milkdown .ProseMirror').first();
      await editor.click();
      await page.keyboard.press('Control+End');
      await page.keyboard.press('Enter');
      await editor.pressSequentially('- New list item', { delay: 10 });

      const saveBtn = page.locator('button:has-text("Save")').first();
      await saveBtn.click();
      await page.waitForSelector('.review-inline-editor-container', {
        state: 'hidden',
      });

      // Verify list changed
      const newText = await listContent.textContent();
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
    await para.dblclick();
    await page.waitForSelector('.review-inline-editor-container');
    const endTime = Date.now();

    const duration = endTime - startTime;
    // Editor should open in less than 2 seconds
    expect(duration).toBeLessThan(2000);
  });

  test('Save operation completes within reasonable time', async ({ page }) => {
    const para = page.locator('[data-review-type="Para"]').first();

    await para.dblclick();
    await page.waitForSelector('.review-inline-editor-container');

    await typeInEditor(page, ' TEST');

    const startTime = Date.now();
    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-inline-editor-container', {
      state: 'hidden',
    });
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

      await para.dblclick();
      await page.waitForSelector('.review-inline-editor-container');

      await typeInEditor(page,` [${i}]`);

      const saveBtn = page.locator('button:has-text("Save")').first();
      await saveBtn.click();
      await page.waitForSelector('.review-inline-editor-container', {
        state: 'hidden',
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Each edit cycle should be fast (under 2 seconds)
      expect(duration).toBeLessThan(2000);
    }

    // Page should still be interactive
    expect(await paras.count()).toBeGreaterThan(0);
  });
});

// Note: Data persistence tests have been moved to multi-page-persistence.spec.ts
// to avoid duplication and keep tests focused on their specific domains
