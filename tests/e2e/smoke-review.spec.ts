import { test, expect } from '@playwright/test';

test.describe('Review UI smoke test', () => {
  test('renders bottom drawer controls and editable content', async ({ page }) => {
    await page.goto('/example');

    await page.waitForSelector('[data-review-id]', { timeout: 10_000 });
    const firstParagraph = page.locator('[data-review-type="Para"]').first();
    await expect(firstParagraph).toBeVisible();

    const drawer = page.locator('.review-bottom-drawer');
    await expect(drawer).toBeVisible();

    // Expand the drawer by clicking the toggle button
    const toggleBtn = drawer.locator('button[data-action="toggle-drawer"]');
    await toggleBtn.click();
    await page.waitForTimeout(500); // Wait for expand animation

    // Check for export buttons with actual text from BottomDrawer
    const exportButton = drawer.locator('button:has-text("Clean QMD")');
    await expect(exportButton).toBeVisible();

    const submitButton = drawer.locator('button:has-text("Submit Review")');
    await expect(submitButton).toBeVisible();
  });
});
