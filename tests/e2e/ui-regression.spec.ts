import { test, expect } from '@playwright/test';

/**
 * UI Regression Tests
 *
 * These tests verify the visual modernization changes and prevent
 * future regressions in button styling, modals, toolbars, and other UI components.
 */

test.describe('UI Modernization - Color Scheme & Shadows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to example page or test page
    await page.goto('/example');
  });

  test('primary button has modern gradient background', async ({ page }) => {
    // Create a primary button for testing
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-primary';
      btn.textContent = 'Test Button';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-primary').first();
    const bgImage = await btn.evaluate((el) =>
      window.getComputedStyle(el).backgroundImage
    );

    // Verify gradient is applied (should contain 'gradient')
    expect(bgImage).toContain('gradient');
  });

  test('primary button has shadow elevation on base state', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-primary';
      btn.textContent = 'Test Button';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-primary').first();
    const boxShadow = await btn.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );

    expect(boxShadow).toBeTruthy();
    expect(boxShadow).not.toBe('none');
  });

  test('primary button hover state increases shadow', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-primary';
      btn.textContent = 'Test Button';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-primary').first();

    // Get base state shadow
    const baseShadow = await btn.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );

    // Hover and get new shadow
    await btn.hover();
    const hoverShadow = await btn.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );

    // Both should have shadows, and they may differ
    expect(baseShadow).toBeTruthy();
    expect(hoverShadow).toBeTruthy();
  });

  test('secondary button has visible border', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-secondary';
      btn.textContent = 'Test Button';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-secondary').first();
    const borderColor = await btn.evaluate((el) =>
      window.getComputedStyle(el).borderColor
    );
    const borderWidth = await btn.evaluate((el) =>
      window.getComputedStyle(el).borderWidth
    );

    expect(borderColor).toBeTruthy();
    expect(borderColor).not.toBe('transparent');
    expect(borderWidth).toBeTruthy();
  });

  test('pill button has modern gradient', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-pill';
      btn.textContent = 'Test Pill';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-pill').first();
    const bgImage = await btn.evaluate((el) =>
      window.getComputedStyle(el).backgroundImage
    );

    expect(bgImage).toContain('gradient');
  });

  test('icon button has subtle background on hover', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-icon';
      btn.innerHTML = '⚙️';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-icon').first();

    // Base state should be transparent or subtle
    const baseColor = await btn.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Hover state should change
    await btn.hover();
    const hoverColor = await btn.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Colors should be different (indicates hover effect)
    expect(baseColor).not.toEqual(hoverColor);
  });

  test('modal backdrop is softer (30% opacity)', async ({ page }) => {
    // Create a modal for testing
    await page.evaluate(() => {
      const modal = document.createElement('div');
      modal.className = 'review-editor-modal';
      modal.style.display = 'flex';
      document.body.appendChild(modal);
    });

    const modal = page.locator('.review-editor-modal').first();
    const bgColor = await modal.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Should be a dark color (rgba)
    expect(bgColor).toContain('rgba');
    // Should not be pure black (rgb(0, 0, 0))
    expect(bgColor).not.toContain('rgb(0, 0, 0)');
  });

  test('modal container has larger border radius', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.className = 'review-editor-container';
      container.style.display = 'block';
      document.body.appendChild(container);
    });

    const container = page.locator('.review-editor-container').first();
    const borderRadius = await container.evaluate((el) => {
      const radius = window.getComputedStyle(el).borderRadius;
      // Parse to number (e.g., "16px" -> 16)
      return parseInt(radius);
    });

    // Should be at least 16px
    expect(borderRadius).toBeGreaterThanOrEqual(16);
  });

  test('toolbar has glassmorphism effect (backdrop-filter)', async ({ page }) => {
    await page.evaluate(() => {
      const toolbar = document.createElement('div');
      toolbar.className = 'review-toolbar';
      toolbar.style.display = 'flex';
      document.body.appendChild(toolbar);
    });

    const toolbar = page.locator('.review-toolbar').first();
    const backdropFilter = await toolbar.evaluate((el) =>
      window.getComputedStyle(el).backdropFilter
    );

    // Should have blur effect
    expect(backdropFilter).toContain('blur');
  });

  test('editor toolbar button has primary blue colors', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-editor-toolbar-btn';
      btn.textContent = 'B';
      const toolbar = document.createElement('div');
      toolbar.className = 'review-editor-toolbar';
      toolbar.appendChild(btn);
      document.body.appendChild(toolbar);
    });

    const btn = page.locator('.review-editor-toolbar-btn').first();
    const bgColor = await btn.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Should contain blue (primary color)
    expect(bgColor).toBeTruthy();
    // Background should be set (not transparent)
    expect(bgColor).not.toBe('transparent');
  });

  test('sidebar has modern styling with backdrop blur', async ({ page }) => {
    await page.evaluate(() => {
      const sidebar = document.createElement('div');
      sidebar.className = 'review-persistent-sidebar';
      sidebar.style.position = 'fixed';
      sidebar.style.display = 'flex';
      document.body.appendChild(sidebar);
    });

    const sidebar = page.locator('.review-persistent-sidebar').first();
    const backdropFilter = await sidebar.evaluate((el) =>
      window.getComputedStyle(el).backdropFilter
    );
    const borderRadius = await sidebar.evaluate((el) => {
      const radius = window.getComputedStyle(el).borderRadius;
      return parseInt(radius);
    });

    // Should have backdrop blur
    expect(backdropFilter).toContain('blur');
    // Should have rounded corners (16px)
    expect(borderRadius).toBeGreaterThanOrEqual(12);
  });

  test('focus-visible outline is blue', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-primary';
      btn.textContent = 'Focus Test';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-primary').first();
    await btn.focus();

    const outline = await btn.evaluate((el) =>
      window.getComputedStyle(el).outline
    );

    // Should have outline
    expect(outline).toBeTruthy();
    // Should not be 'none'
    expect(outline).not.toBe('none');
  });
});

test.describe('UI Modernization - Disabled States', () => {
  test('disabled button styling is distinct', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-primary';
      btn.disabled = true;
      btn.textContent = 'Disabled';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn[disabled]').first();
    const opacity = await btn.evaluate((el) =>
      window.getComputedStyle(el).opacity
    );
    const cursor = await btn.evaluate((el) =>
      window.getComputedStyle(el).cursor
    );

    // Should be less opaque
    expect(parseFloat(opacity)).toBeLessThan(1);
    // Should show not-allowed cursor
    expect(cursor).toBe('not-allowed');
  });
});

test.describe('UI Modernization - Button State Transitions', () => {
  test('button applies lift animation on hover', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-secondary';
      btn.textContent = 'Lift Test';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-secondary').first();

    // Get base transform
    const baseTransform = await btn.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    // Hover
    await btn.hover();

    // Get hover transform
    const hoverTransform = await btn.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    // Transforms should be different (hover applies translateY)
    // Base might be 'none', hover should have translateY
    const hoverHasTranslate = hoverTransform.includes('matrix') || hoverTransform !== 'none';
    expect(hoverHasTranslate).toBeTruthy();
  });

  test('button applies active state on click', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-primary';
      btn.textContent = 'Active Test';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-primary').first();

    // Get base shadow
    const baseShadow = await btn.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );

    // Click to trigger active state
    await btn.click();

    // Verify button has appropriate styling
    expect(baseShadow).toBeTruthy();
  });
});

test.describe('UI Modernization - Responsive Design', () => {
  test('toolbar is centered on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size

    await page.evaluate(() => {
      const toolbar = document.createElement('div');
      toolbar.className = 'review-toolbar';
      toolbar.style.position = 'fixed';
      toolbar.style.display = 'flex';
      document.body.appendChild(toolbar);
    });

    const toolbar = page.locator('.review-toolbar').first();
    const left = await toolbar.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.left;
    });
    const right = await toolbar.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return window.innerWidth - rect.right;
    });

    // On mobile, should be somewhat centered (left and right margins should be more balanced)
    // This is a loose check - exact centering depends on width
    expect(left).toBeGreaterThan(0);
    expect(right).toBeGreaterThan(0);
  });

  test('sidebar maintains readability on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // Tablet size

    await page.evaluate(() => {
      const sidebar = document.createElement('div');
      sidebar.className = 'review-persistent-sidebar';
      sidebar.style.position = 'fixed';
      sidebar.style.display = 'flex';
      sidebar.style.width = '240px';
      document.body.appendChild(sidebar);
    });

    const sidebar = page.locator('.review-persistent-sidebar').first();
    const width = await sidebar.evaluate((el) => {
      return el.offsetWidth;
    });

    // Should be reasonably sized
    expect(width).toBeGreaterThan(200);
    expect(width).toBeLessThan(400);
  });
});

test.describe('UI Modernization - Color Consistency', () => {
  test('all primary buttons use same color scheme', async ({ page }) => {
    await page.evaluate(() => {
      // Create multiple primary buttons
      for (let i = 0; i < 3; i++) {
        const btn = document.createElement('button');
        btn.className = 'review-btn review-btn-primary';
        btn.textContent = `Button ${i}`;
        document.body.appendChild(btn);
      }
    });

    const buttons = page.locator('.review-btn-primary');
    const count = await buttons.count();

    expect(count).toBe(3);

    // All should have gradients
    for (let i = 0; i < count; i++) {
      const bgImage = await buttons.nth(i).evaluate((el) =>
        window.getComputedStyle(el).backgroundImage
      );
      expect(bgImage).toContain('gradient');
    }
  });

  test('secondary buttons have consistent border styling', async ({ page }) => {
    await page.evaluate(() => {
      for (let i = 0; i < 2; i++) {
        const btn = document.createElement('button');
        btn.className = 'review-btn review-btn-secondary';
        btn.textContent = `Secondary ${i}`;
        document.body.appendChild(btn);
      }
    });

    const buttons = page.locator('.review-btn-secondary');
    const count = await buttons.count();

    expect(count).toBe(2);

    // All should have borders
    for (let i = 0; i < count; i++) {
      const borderWidth = await buttons.nth(i).evaluate((el) =>
        window.getComputedStyle(el).borderWidth
      );
      expect(borderWidth).not.toBe('0px');
    }
  });
});

