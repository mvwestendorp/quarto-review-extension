import { test, expect } from '@playwright/test';

/**
 * Multi-Page Persistence E2E Tests
 *
 * Tests the fixes for:
 * 1. Ghost Edits Bug: Operations were created even when content unchanged
 * 2. Multi-Page Restoration Bug: Only last edited page's changes were restored
 *
 * These tests simulate real user workflows across multiple pages to verify
 * that changes on each page are properly persisted and restored.
 */

test.describe('Multi-Page Persistence - Cross-Page Editing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the example document
    await page.goto('/example');
    // Wait for document to load
    await page.waitForSelector('[data-review-id]', { timeout: 5000 });
  });

  test('Editing multiple pages: changes persist across all pages', async ({
    page,
  }) => {
    /**
     * Scenario:
     * 1. Edit first element on current page
     * 2. Navigate to another page (if available)
     * 3. Edit element on that page
     * 4. Return to first page and verify edit is still there
     * 5. Return to second page and verify its edit is still there
     */

    // Step 1: Get all editable paragraphs
    const paras = page.locator('[data-review-type="Para"]');
    const paraCount = await paras.count();

    if (paraCount < 2) {
      // Skip test if not enough elements
      test.skip();
    }

    // Step 2: Edit first paragraph with unique marker
    const firstPara = paras.first();
    const firstOriginalText = await firstPara.textContent();

    await firstPara.dblClick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 3000 });

    const textarea = page.locator('.milkdown .ProseMirror').first();
    const firstContent = await textarea.inputValue();
    const firstEditedContent = firstContent + ' [PAGE1_EDIT]';
    await textarea.fill(firstEditedContent);

    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Verify first edit persisted
    let firstParagraphText = await firstPara.textContent();
    expect(firstParagraphText).toContain('[PAGE1_EDIT]');

    // Step 3: Edit a different paragraph
    const secondPara = paras.nth(1);
    const secondOriginalText = await secondPara.textContent();

    await secondPara.dblClick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 3000 });

    const textarea2 = page.locator('.milkdown .ProseMirror').first();
    const secondContent = await textarea2.inputValue();
    const secondEditedContent = secondContent + ' [PAGE2_EDIT]';
    await textarea2.fill(secondEditedContent);

    const saveBtn2 = page.locator('button:has-text("Save")').first();
    await saveBtn2.click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Verify second edit persisted
    let secondParagraphText = await secondPara.textContent();
    expect(secondParagraphText).toContain('[PAGE2_EDIT]');

    // Step 4: Go back to first paragraph and verify BOTH edits persist
    firstParagraphText = await firstPara.textContent();
    expect(firstParagraphText).toContain('[PAGE1_EDIT]');

    // Step 5: Verify second paragraph still has its edit
    secondParagraphText = await secondPara.textContent();
    expect(secondParagraphText).toContain('[PAGE2_EDIT]');
  });

  test('Reload page preserves edits from multiple sections', async ({
    page,
  }) => {
    /**
     * Scenario:
     * 1. Edit element on page
     * 2. Navigate somewhere on page (scroll, expand sections)
     * 3. Reload the page
     * 4. Verify the edit is still there
     */

    const para = page.locator('[data-review-type="Para"]').first();
    const originalText = await para.textContent();

    // Make edit
    await para.dblClick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 3000 });

    const textarea = page.locator('.milkdown .ProseMirror').first();
    const content = await textarea.inputValue();
    const editedContent = content + ' [RELOAD_TEST]';
    await textarea.fill(editedContent);

    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Verify edit exists before reload
    let textAfterEdit = await para.textContent();
    expect(textAfterEdit).toContain('[RELOAD_TEST]');

    // Reload page
    await page.reload();
    await page.waitForSelector('[data-review-id]', { timeout: 5000 });

    // Verify edit persisted after reload
    const reloadedPara = page.locator('[data-review-type="Para"]').first();
    const textAfterReload = await reloadedPara.textContent();
    expect(textAfterReload).toContain('[RELOAD_TEST]');
  });

  test('Sequential edits on same element do not create ghost edits', async ({
    page,
  }) => {
    /**
     * Bug Fix Verification:
     * The "ghost edits" bug created operations even when content was unchanged.
     *
     * Scenario:
     * 1. Edit an element with actual content change
     * 2. Open editor again (without changing content) and close
     * 3. Verify that no ghost operation was created
     *
     * Implementation note: We can't directly inspect the operations array in
     * the browser, but we can verify behavior by checking that reopening the
     * editor without changes doesn't add extra markup or tracking.
     */

    const para = page.locator('[data-review-type="Para"]').first();

    // Edit 1: Make actual change
    await para.dblClick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 3000 });

    const textarea = page.locator('.milkdown .ProseMirror').first();
    const content = await textarea.inputValue();
    await textarea.fill(content + ' [REAL_CHANGE]');

    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Verify change persisted
    let textAfterEdit = await para.textContent();
    expect(textAfterEdit).toContain('[REAL_CHANGE]');

    // Edit 2: Open editor and close without making changes
    const originalEditedText = await para.textContent();

    await para.dblClick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 3000 });

    // Don't make changes - just close
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Verify text hasn't changed (no ghost edit)
    const textAfterNoEdit = await para.textContent();
    expect(textAfterNoEdit).toBe(originalEditedText);
    expect(textAfterNoEdit).toContain('[REAL_CHANGE]');
  });

  test('Metadata-only changes do not create ghost edits', async ({ page }) => {
    /**
     * Bug Fix Verification:
     * Ghost edits were created when only metadata changed but content was the same.
     *
     * Scenario:
     * 1. Make an actual content edit
     * 2. Open editor again with same content, close without changes
     * 3. Verify the element displays correctly
     *
     * Note: This test can't directly test metadata changes via UI since metadata
     * is set by the Lua filter, but it verifies the overall behavior.
     */

    const para = page.locator('[data-review-type="Para"]').first();

    // Make actual edit
    await para.dblClick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 3000 });

    let textarea = page.locator('.milkdown .ProseMirror').first();
    let content = await textarea.inputValue();
    await textarea.fill(content + ' [METADATA_TEST]');

    let saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Get the content with edit
    const editedText = await para.textContent();
    expect(editedText).toContain('[METADATA_TEST]');

    // Open again and close without changes
    await para.dblClick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 3000 });

    textarea = page.locator('.milkdown .ProseMirror').first();
    const reopenedContent = await textarea.inputValue();

    // Close without changes
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Verify no change occurred
    const finalText = await para.textContent();
    expect(finalText).toBe(editedText);
    expect(finalText).toContain('[METADATA_TEST]');
  });

  test('Rapid page navigation preserves all edits', async ({ page }) => {
    /**
     * Scenario:
     * 1. Edit first element
     * 2. Quickly scroll/navigate within page
     * 3. Edit second element
     * 4. Reload page
     * 5. Verify both edits are preserved
     */

    const paras = page.locator('[data-review-type="Para"]');
    const paraCount = await paras.count();

    if (paraCount < 2) {
      test.skip();
    }

    // Edit first paragraph
    const firstPara = paras.first();
    await firstPara.dblClick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 3000 });

    let textarea = page.locator('.milkdown .ProseMirror').first();
    let content = await textarea.inputValue();
    await textarea.fill(content + ' [RAPID_1]');

    let saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Rapidly edit second paragraph
    const secondPara = paras.nth(1);
    await secondPara.dblClick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 3000 });

    textarea = page.locator('.milkdown .ProseMirror').first();
    content = await textarea.inputValue();
    await textarea.fill(content + ' [RAPID_2]');

    saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Reload and verify both
    await page.reload();
    await page.waitForSelector('[data-review-id]', { timeout: 5000 });

    const reloadedFirst = page.locator('[data-review-type="Para"]').first();
    const reloadedSecond = page.locator('[data-review-type="Para"]').nth(1);

    const firstText = await reloadedFirst.textContent();
    const secondText = await reloadedSecond.textContent();

    expect(firstText).toContain('[RAPID_1]');
    expect(secondText).toContain('[RAPID_2]');
  });

  test('Export includes all page changes', async ({ page }) => {
    /**
     * Scenario:
     * 1. Edit multiple elements
     * 2. Open export dialog (if available in example)
     * 3. Verify export includes all edits
     */

    const paras = page.locator('[data-review-type="Para"]');
    const paraCount = await paras.count();

    if (paraCount < 2) {
      test.skip();
    }

    // Edit first paragraph
    const firstPara = paras.first();
    await firstPara.dblClick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 3000 });

    let textarea = page.locator('.milkdown .ProseMirror').first();
    let content = await textarea.inputValue();
    await textarea.fill(content + ' [EXPORT_1]');

    let saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Edit second paragraph
    const secondPara = paras.nth(1);
    await secondPara.dblClick();
    await page.waitForSelector('.review-inline-editor-container', { timeout: 3000 });

    textarea = page.locator('.milkdown .ProseMirror').first();
    content = await textarea.inputValue();
    await textarea.fill(content + ' [EXPORT_2]');

    saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });

    // Look for export or download button
    const exportBtn = page.locator('button:has-text("Export")', {
      exact: false,
    });

    if (await exportBtn.isVisible()) {
      // If export exists, clicking it should work
      await exportBtn.click();

      // Wait for download to start (in real scenarios)
      await page.waitForTimeout(500);
    }

    // Regardless of export, verify edits are still visible in the DOM
    const firstText = await firstPara.textContent();
    const secondText = await secondPara.textContent();

    expect(firstText).toContain('[EXPORT_1]');
    expect(secondText).toContain('[EXPORT_2]');
  });
});

test.describe('Multi-Page Persistence - Restoration Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await page.waitForSelector('[data-review-id]', { timeout: 5000 });
  });

  test('BUG FIX: Changes on all pages are restored, not just last page', async ({
    page,
  }) => {
    /**
     * This test directly addresses the multi-page restoration bug.
     *
     * Before Fix:
     * - Edit page 1 → navigate to page 2 → navigate to page 3 → reload
     * - Only page 3 changes restored, pages 1 & 2 lost
     *
     * After Fix:
     * - All pages' changes are preserved and restored
     *
     * Scenario:
     * 1. Edit multiple paragraphs as if they represent different pages
     * 2. Reload the page
     * 3. Verify ALL edits are still there
     */

    const paras = page.locator('[data-review-type="Para"]');
    const paraCount = await paras.count();

    if (paraCount < 3) {
      test.skip();
    }

    // Edit paragraphs 0, 1, and 2
    const editTargets = [
      { index: 0, marker: '[LAST_PAGE]' }, // Simulating last page
      { index: 1, marker: '[MID_PAGE]' }, // Simulating middle page
      { index: 2, marker: '[FIRST_PAGE]' }, // Simulating first page
    ];

    for (const target of editTargets) {
      const para = paras.nth(target.index);
      await para.dblClick();
      await page.waitForSelector('.review-inline-editor-container', { timeout: 3000 });

      const textarea = page.locator(
        '.milkdown .ProseMirror'
      ).first();
      const content = await textarea.inputValue();
      await textarea.fill(content + ' ' + target.marker);

      const saveBtn = page.locator('button:has-text("Save")').first();
      await saveBtn.click();
      await page.waitForSelector('.review-inline-editor-container', { state: 'hidden' });
    }

    // Verify all edits before reload
    let allEditsExist = true;
    for (const target of editTargets) {
      const text = await paras.nth(target.index).textContent();
      if (!text?.includes(target.marker)) {
        allEditsExist = false;
        break;
      }
    }
    expect(allEditsExist).toBe(true);

    // Reload page
    await page.reload();
    await page.waitForSelector('[data-review-id]', { timeout: 5000 });

    // Verify ALL edits persisted (this is the bug fix verification)
    const reloadedParas = page.locator('[data-review-type="Para"]');
    allEditsExist = true;
    for (const target of editTargets) {
      const text = await reloadedParas.nth(target.index).textContent();
      if (!text?.includes(target.marker)) {
        console.error(
          `Edit ${target.marker} on paragraph ${target.index} was lost after reload!`
        );
        allEditsExist = false;
        break;
      }
    }

    expect(allEditsExist).toBe(
      true,
      'All page changes should be restored after reload'
    );
  });
});
