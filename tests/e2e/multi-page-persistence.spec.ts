import { test, expect, type Page } from '@playwright/test';

/**
 * Multi-Page Persistence E2E Tests
 *
 * Tests cross-page editing persistence and ghost edit prevention
 */

/**
 * Helper function to type text into Milkdown editor
 */
async function typeInEditor(page: Page, text: string): Promise<void> {
  const editor = page.locator('.milkdown .ProseMirror').first();
  await editor.click();
  await editor.focus(); // Explicit focus for reliability

  // Wait for editor to be ready
  await page.waitForTimeout(100);

  // Use keyboard shortcuts to position at end more reliably
  await page.keyboard.press('Control+Home'); // Go to start
  await page.waitForTimeout(50);
  await page.keyboard.press('Control+End'); // Then to end
  await page.waitForTimeout(100); // Longer wait for cursor positioning

  // Type with a longer delay between characters to ensure Milkdown processes each one
  await editor.pressSequentially(text, { delay: 50 });

  // Wait for content to be fully processed
  await page.waitForTimeout(200);
}

test.describe('Multi-Page Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await page.waitForSelector('[data-review-id]', { timeout: 3000 });
  });

  test('Editing multiple elements: changes persist across all elements', async ({ page }) => {
    const paras = page.locator('[data-review-type="Para"]');
    const paraCount = await paras.count();

    if (paraCount < 2) {
      test.skip();
    }

    // Edit first paragraph
    const firstPara = paras.first();
    await firstPara.dblclick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 2000 });

    await typeInEditor(page, ' [EDIT1]');

    await page.locator('button:has-text("Save")').first().click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Edit second paragraph
    const secondPara = paras.nth(1);
    await secondPara.dblclick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 2000 });

    await typeInEditor(page, ' [EDIT2]');

    await page.locator('button:has-text("Save")').first().click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Verify both edits persisted
    const firstContent = firstPara.locator('> *:not(.review-segment-actions)').first();
    const secondContent = secondPara.locator('> *:not(.review-segment-actions)').first();
    expect(await firstContent.textContent()).toContain('[EDIT1]');
    expect(await secondContent.textContent()).toContain('[EDIT2]');
  });

  test('Reload page preserves edits', async ({ page }) => {
    const para = page.locator('[data-review-type="Para"]').first();

    // Get the ID of the element we're editing so we can find it again after reload
    const paraId = await para.getAttribute('data-review-id');

    // Make an edit
    await para.dblclick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 2000 });

    await typeInEditor(page, ' [RELOAD_TEST]');

    await page.locator('button:has-text("Save")').first().click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Wait for the save to complete and be reflected in the DOM
    const paraContent = para.locator('> *:not(.review-segment-actions)').first();
    await expect(paraContent).toContainText('[RELOAD_TEST]', { timeout: 2000 });

    // Additional wait for storage persistence
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await page.waitForSelector('[data-review-id]', { timeout: 3000 });

    // Verify edit persisted after reload - find the SAME element by ID
    const paraAfterReload = page.locator(`[data-review-id="${paraId}"]`);
    const contentAfterReload = paraAfterReload.locator('> *:not(.review-segment-actions)').first();
    expect(await contentAfterReload.textContent()).toContain('[RELOAD_TEST]');
  });

  test('Sequential edits do not create ghost operations', async ({ page }) => {
    const para = page.locator('[data-review-type="Para"]').first();
    const paraContent = para.locator('> *:not(.review-segment-actions)').first();
    const originalText = await paraContent.textContent();

    // Wait for reviewDebug to be available (skip test if not available)
    const hasReviewDebug = await page.evaluate(() => {
      return typeof (window as any).reviewDebug !== 'undefined';
    });

    if (!hasReviewDebug) {
      test.skip();
      return;
    }

    // Open editor, don't change anything, just save
    await para.dblclick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 2000 });
    await page.locator('button:has-text("Save")').first().click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Wait for operations to settle
    await page.waitForTimeout(200);

    // Check operations count
    const opsCount1 = await page.evaluate(() => {
      const ops = (window as any).reviewDebug?.operations;
      return Array.isArray(ops) ? ops.length : (typeof ops === 'function' ? ops().length : 0);
    });

    // Make an actual edit
    await para.dblclick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 2000 });

    await typeInEditor(page, ' [REAL_EDIT]');

    await page.locator('button:has-text("Save")').first().click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Wait for the edit to be reflected
    await expect(paraContent).toContainText('[REAL_EDIT]', { timeout: 2000 });
    await page.waitForTimeout(200);

    const opsCount2 = await page.evaluate(() => {
      const ops = (window as any).reviewDebug?.operations;
      return Array.isArray(ops) ? ops.length : (typeof ops === 'function' ? ops().length : 0);
    });

    // Should only have 1 more operation (not 2)
    expect(opsCount2).toBe(opsCount1 + 1);
    expect(await paraContent.textContent()).toContain('[REAL_EDIT]');
  });
});
