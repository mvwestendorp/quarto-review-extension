import { test, expect } from '@playwright/test';

test.describe('Review UI smoke test', () => {
  test('renders sidebar controls and editable content', async ({ page }) => {
    await page.goto('/example');
    await page.waitForSelector('[data-review-id]', { timeout: 10_000 });

    const firstParagraph = page.locator('[data-review-type="Para"]').first();
    await expect(firstParagraph).toBeVisible();

    const drawerHeader = page.locator('.review-drawer-header');
    await expect(drawerHeader).toBeVisible();

    const drawerToggle = page.locator('[data-action="toggle-drawer"]');
    await drawerToggle.click();

    const sectionTitle = page.locator('.review-drawer-section-title').first();
    await expect(sectionTitle).toBeVisible();

    const exportButton = page.locator('[data-action="export-qmd-clean"]');
    await expect(exportButton).toBeVisible();

    const submitButton = page.locator('[data-action="submit-review"]');
    await expect(submitButton).toBeVisible();
  });
});
