import { test, expect } from '@playwright/test';

/**
 * UI Accessibility E2E Tests
 * 
 * Verifies WCAG AA compliance for key UI elements
 */

test.describe('Accessibility - Essential Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await page.waitForSelector('[data-review-id]', { timeout: 5000 });
  });

  test.describe('Color Contrast', () => {
    test('primary button has sufficient contrast (WCAG AA)', async ({ page }) => {
      // Open toolbar
      await page.click('[data-review-id]');
      await page.waitForSelector('.review-inline-editor-container');

      const saveButton = page.locator('button:has-text("Save")').first();
      const bgColor = await saveButton.evaluate((el) => getComputedStyle(el).backgroundColor);
      const textColor = await saveButton.evaluate((el) => getComputedStyle(el).color);

      const contrast = calculateContrastRatio(bgColor, textColor);
      expect(contrast).toBeGreaterThanOrEqual(4.5); // WCAG AA for normal text
    });

    test('sidebar text has sufficient contrast', async ({ page }) => {
      const sidebar = page.locator('.review-sidebar-panel').first();
      if (await sidebar.isVisible()) {
        const bgColor = await sidebar.evaluate((el) => getComputedStyle(el).backgroundColor);
        const textColor = await sidebar.evaluate((el) => getComputedStyle(el).color);
        
        const contrast = calculateContrastRatio(bgColor, textColor);
        expect(contrast).toBeGreaterThanOrEqual(4.5);
      } else {
        test.skip();
      }
    });
  });

  test.describe('Focus Indicators', () => {
    test('buttons show visible focus indicators', async ({ page }) => {
      await page.click('[data-review-id]');
      await page.waitForSelector('.review-inline-editor-container');

      const button = page.locator('button:has-text("Save")').first();
      await button.focus();

      const outline = await button.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          outlineWidth: style.outlineWidth,
          outlineStyle: style.outlineStyle,
          outlineColor: style.outlineColor,
        };
      });

      // Check that focus indicator exists and is visible
      expect(outline.outlineWidth).not.toBe('0px');
      expect(outline.outlineStyle).not.toBe('none');
    });

    test('disabled buttons are not focusable', async ({ page }) => {
      await page.click('[data-review-id]');
      await page.waitForSelector('.review-inline-editor-container');

      const disabledButton = page.locator('button[disabled]').first();
      if (await disabledButton.isVisible()) {
        const tabIndex = await disabledButton.getAttribute('tabindex');
        expect(tabIndex).toBe('-1');
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('buttons are keyboard accessible', async ({ page }) => {
      await page.click('[data-review-id]');
      await page.waitForSelector('.review-inline-editor-container');

      const button = page.locator('button:has-text("Save")').first();
      await button.focus();
      await page.keyboard.press('Enter');

      // Verify button action (editor should close)
      await page.waitForSelector('.review-inline-editor-container', {
        state: 'hidden',
        timeout: 3000,
      });
    });

    test('Tab key navigates through interactive elements', async ({ page }) => {
      await page.click('[data-review-id]');
      await page.waitForSelector('.review-inline-editor-container');

      // Press Tab multiple times
      await page.keyboard.press('Tab');
      const firstFocus = await page.evaluate(() => document.activeElement?.tagName);

      await page.keyboard.press('Tab');
      const secondFocus = await page.evaluate(() => document.activeElement?.tagName);

      // Focus should move between elements
      expect(firstFocus).toBeTruthy();
      expect(secondFocus).toBeTruthy();
    });
  });

  test.describe('ARIA Attributes', () => {
    test('disabled buttons have proper ARIA attributes', async ({ page }) => {
      const disabledButton = page.locator('button[disabled]').first();
      if (await disabledButton.isVisible()) {
        const ariaDisabled = await disabledButton.getAttribute('aria-disabled');
        expect(ariaDisabled).toBe('true');
      }
    });

    test('modals have proper ARIA roles', async ({ page }) => {
      // Try to open a modal (if any exist in the example)
      const modal = page.locator('[role="dialog"]').first();
      if (await modal.isVisible()) {
        const role = await modal.getAttribute('role');
        const ariaModal = await modal.getAttribute('aria-modal');
        
        expect(role).toBe('dialog');
        expect(ariaModal).toBe('true');
      }
    });
  });

  test.describe('Color Independence', () => {
    test('interactive elements have text/icon labels, not just color', async ({ page }) => {
      await page.click('[data-review-id]');
      await page.waitForSelector('.review-inline-editor-container');

      // Check that buttons have text or ARIA labels
      const buttons = page.locator('button').all();
      for (const button of await buttons) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const hasIcon = await button.locator('svg, i, [class*="icon"]').count() > 0;

        // Button should have text, aria-label, or icon
        expect(text || ariaLabel || hasIcon).toBeTruthy();
      }
    });
  });
});

/**
 * Helper: Calculate contrast ratio between two colors
 */
function calculateContrastRatio(bg: string, fg: string): number {
  const bgLuminance = getLuminance(bg);
  const fgLuminance = getLuminance(fg);
  
  const lighter = Math.max(bgLuminance, fgLuminance);
  const darker = Math.min(bgLuminance, fgLuminance);
  
  return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance(color: string): number {
  const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
  const [r, g, b] = rgb.map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
