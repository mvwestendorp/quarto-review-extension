import { test, expect } from '@playwright/test';

/**
 * Multi-Page Persistence E2E Tests
 *
 * Tests cross-page editing persistence and ghost edit prevention
 */

test.describe('Multi-Page Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await page.waitForSelector('[data-review-id]', { timeout: 5000 });
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
    await page.waitForSelector('.review-inline-editor-container', { timeout: 3000 });

    const editor = page.locator('.milkdown .ProseMirror').first();
    await editor.click();
    await editor.focus();
    await page.keyboard.press('End');
    await page.keyboard.type(' [EDIT1]');

    await page.locator('button:has-text("Save")').first().click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Edit second paragraph
    const secondPara = paras.nth(1);
    await secondPara.dblclick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 3000 });

    const editor2 = page.locator('.milkdown .ProseMirror').first();
    await editor2.click();
    await editor2.focus();
    await page.keyboard.press('End');
    await page.keyboard.type(' [EDIT2]');

    await page.locator('button:has-text("Save")').first().click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Verify both edits persisted
    expect(await firstPara.textContent()).toContain('[EDIT1]');
    expect(await secondPara.textContent()).toContain('[EDIT2]');
  });

  test('Reload page preserves edits', async ({ page }) => {
    const para = page.locator('[data-review-type="Para"]').first();

    // Make an edit
    await para.dblclick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 3000 });

    const editor = page.locator('.milkdown .ProseMirror').first();
    await editor.click();
    await editor.press('End');
    await page.keyboard.type(' [RELOAD_TEST]');

    await page.locator('button:has-text("Save")').first().click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Reload page
    await page.reload();
    await page.waitForSelector('[data-review-id]', { timeout: 5000 });

    // Verify edit persisted after reload
    const paraAfterReload = page.locator('[data-review-type="Para"]').first();
    expect(await paraAfterReload.textContent()).toContain('[RELOAD_TEST]');
  });

  test('Sequential edits do not create ghost operations', async ({ page }) => {
    const para = page.locator('[data-review-type="Para"]').first();
    const originalText = await para.textContent();

    // Open editor, don't change anything, just save
    await para.dblclick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 3000 });
    await page.locator('button:has-text("Save")').first().click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Check operations count
    const opsCount1 = await page.evaluate(() => {
      return (window as any).reviewDebug?.operations?.length || 0;
    });

    // Make an actual edit
    await para.dblclick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 3000 });

    const editor = page.locator('.milkdown .ProseMirror').first();
    await editor.click();
    await editor.press('End');
    await page.keyboard.type(' [REAL_EDIT]');

    await page.locator('button:has-text("Save")').first().click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    const opsCount2 = await page.evaluate(() => {
      return (window as any).reviewDebug?.operations?.length || 0;
    });

    // Should only have 1 more operation (not 2)
    expect(opsCount2).toBe(opsCount1 + 1);
    expect(await para.textContent()).toContain('[REAL_EDIT]');
  });
});
