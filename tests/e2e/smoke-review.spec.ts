import { test, expect } from '@playwright/test';

test.describe('Review UI smoke test', () => {
  test('renders sidebar controls and editable content', async ({ page }) => {
    await page.goto('/example');

    await page.waitForSelector('[data-review-id]', { timeout: 10_000 });
    const firstParagraph = page.locator('[data-review-type="Para"]').first();
    await expect(firstParagraph).toBeVisible();

    const sidebar = page.locator('.review-unified-sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('.review-sidebar-header')).toContainText(
      'Review Tools'
    );

    const exportButton = sidebar.locator(
      'button:has-text("Export Clean QMD")'
    );
    await expect(exportButton).toBeVisible();

    const submitButton = sidebar.locator('button:has-text("Submit Review")');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeDisabled();
  });
});
