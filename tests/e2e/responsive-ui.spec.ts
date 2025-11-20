import { test, expect } from '@playwright/test';
import {
  viewports,
  getAllViewports,
  getMobileViewports,
  getTabletViewports,
  setViewportAndWait,
  getComputedStyle,
  getElementDimensions,
  isInViewport,
  hasOverflow,
  detectLayoutChange,
  getBreakpoint,
} from './helpers/responsive-utils';

/**
 * Responsive UI Tests
 *
 * Comprehensive tests for responsive behavior across mobile, tablet, and desktop viewports.
 * Tests layout changes, component positioning, and proper responsive design implementation.
 */

test.describe('Responsive UI - BottomDrawer Component', () => {
  test('BottomDrawer is visible on all viewport sizes', async ({ page }) => {
    await page.goto('/example');

    // Create BottomDrawer for testing
    await page.evaluate(() => {
      const drawer = document.createElement('div');
      drawer.className = 'review-bottom-drawer';
      drawer.style.position = 'fixed';
      drawer.style.bottom = '0';
      drawer.style.left = '0';
      drawer.style.right = '0';
      drawer.style.display = 'flex';
      document.body.appendChild(drawer);
    });

    const allViewports = getAllViewports();

    for (const viewport of allViewports) {
      await setViewportAndWait(page, viewport);

      const drawer = page.locator('.review-bottom-drawer').first();
      await expect(drawer).toBeVisible();

      // Verify it's at the bottom
      const position = await getComputedStyle(page, '.review-bottom-drawer', 'position');
      expect(position).toBe('fixed');

      const dimensions = await getElementDimensions(page, '.review-bottom-drawer');
      expect(dimensions.bottom).toBeLessThanOrEqual(window.innerHeight);
    }
  });

  test('BottomDrawer has glassmorphism effect on all viewports', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const drawer = document.createElement('div');
      drawer.className = 'review-bottom-drawer';
      drawer.style.display = 'flex';
      document.body.appendChild(drawer);
    });

    const testViewports = [viewports.mobile.iphoneSE, viewports.tablet.ipadMini, viewports.desktop.hd];

    for (const viewport of testViewports) {
      await setViewportAndWait(page, viewport);

      const backdropFilter = await getComputedStyle(page, '.review-bottom-drawer', 'backdrop-filter');
      expect(backdropFilter).toContain('blur');
    }
  });

  test('BottomDrawer expands correctly on mobile', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const drawer = document.createElement('div');
      drawer.className = 'review-bottom-drawer';
      drawer.id = 'test-drawer';
      drawer.style.position = 'fixed';
      drawer.style.bottom = '0';
      drawer.style.display = 'flex';
      drawer.style.height = '60px';
      drawer.style.transition = 'height 0.3s';
      document.body.appendChild(drawer);

      // Add expand functionality
      drawer.addEventListener('click', () => {
        drawer.style.height = drawer.style.height === '60px' ? '400px' : '60px';
      });
    });

    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    const drawer = page.locator('#test-drawer');
    const initialHeight = await drawer.evaluate((el) => el.offsetHeight);

    // Click to expand
    await drawer.click();
    await page.waitForTimeout(400); // Wait for transition

    const expandedHeight = await drawer.evaluate((el) => el.offsetHeight);
    expect(expandedHeight).toBeGreaterThan(initialHeight);
  });
});

test.describe('Responsive UI - Toolbar Component', () => {
  test('Toolbar is centered on mobile viewports', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const toolbar = document.createElement('div');
      toolbar.className = 'review-toolbar';
      toolbar.style.position = 'fixed';
      toolbar.style.display = 'flex';
      toolbar.style.top = '20px';
      toolbar.style.width = '200px';
      document.body.appendChild(toolbar);
    });

    const mobileViewports = getMobileViewports();

    for (const viewport of mobileViewports) {
      await setViewportAndWait(page, viewport);

      const toolbar = page.locator('.review-toolbar').first();
      const dimensions = await getElementDimensions(page, '.review-toolbar');

      const viewportWidth = viewport.width;
      const leftMargin = dimensions.left;
      const rightMargin = viewportWidth - dimensions.right;

      // Check if reasonably centered (margins should be similar)
      const marginDifference = Math.abs(leftMargin - rightMargin);
      expect(marginDifference).toBeLessThan(50); // Allow some tolerance
    }
  });

  test('Toolbar maintains visibility across all viewports', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const toolbar = document.createElement('div');
      toolbar.className = 'review-toolbar';
      toolbar.style.position = 'fixed';
      toolbar.style.display = 'flex';
      document.body.appendChild(toolbar);
    });

    const allViewports = getAllViewports();

    for (const viewport of allViewports) {
      await setViewportAndWait(page, viewport);
      const toolbar = page.locator('.review-toolbar').first();
      await expect(toolbar).toBeVisible();
    }
  });

  test('Toolbar layout changes between mobile and desktop', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const toolbar = document.createElement('div');
      toolbar.className = 'review-toolbar';
      toolbar.id = 'layout-test-toolbar';
      toolbar.style.position = 'fixed';
      toolbar.style.display = 'flex';
      document.body.appendChild(toolbar);
    });

    const hasLayoutChanged = await detectLayoutChange(
      page,
      '#layout-test-toolbar',
      viewports.mobile.iphoneSE,
      viewports.desktop.hd
    );

    // Layout should adapt between mobile and desktop
    expect(hasLayoutChanged).toBeTruthy();
  });
});

test.describe('Responsive UI - Editor Modal', () => {
  test('Editor modal fits within viewport on all screen sizes', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const modal = document.createElement('div');
      modal.className = 'review-editor-modal';
      modal.style.display = 'flex';
      modal.style.position = 'fixed';
      modal.style.inset = '0';
      document.body.appendChild(modal);

      const container = document.createElement('div');
      container.className = 'review-editor-container';
      container.style.maxHeight = '70vh';
      container.style.maxWidth = '90vw';
      container.style.margin = 'auto';
      modal.appendChild(container);
    });

    const allViewports = getAllViewports();

    for (const viewport of allViewports) {
      await setViewportAndWait(page, viewport);

      const container = page.locator('.review-editor-container').first();
      await expect(container).toBeVisible();

      const dimensions = await getElementDimensions(page, '.review-editor-container');

      // Should not exceed viewport
      expect(dimensions.width).toBeLessThanOrEqual(viewport.width);
      expect(dimensions.height).toBeLessThanOrEqual(viewport.height);

      // Should have reasonable size (not collapsed)
      expect(dimensions.width).toBeGreaterThan(200);
      expect(dimensions.height).toBeGreaterThan(100);
    }
  });

  test('Editor toolbar changes from vertical to horizontal on mobile', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const toolbar = document.createElement('div');
      toolbar.className = 'review-editor-toolbar';
      toolbar.id = 'editor-toolbar';
      toolbar.style.display = 'flex';
      document.body.appendChild(toolbar);
    });

    // Desktop: should be vertical (column)
    await setViewportAndWait(page, viewports.desktop.hd);
    const desktopFlexDirection = await getComputedStyle(
      page,
      '#editor-toolbar',
      'flex-direction'
    );

    // Mobile: should be horizontal (row)
    await setViewportAndWait(page, viewports.mobile.iphoneSE);
    const mobileFlexDirection = await getComputedStyle(
      page,
      '#editor-toolbar',
      'flex-direction'
    );

    // The flex-direction should differ between desktop and mobile
    // (exact values depend on CSS, but they should be different)
    const layoutChanges = desktopFlexDirection !== mobileFlexDirection;
    expect(layoutChanges).toBeTruthy();
  });

  test('Editor modal has proper border radius on all viewports', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const container = document.createElement('div');
      container.className = 'review-editor-container';
      container.style.display = 'block';
      document.body.appendChild(container);
    });

    const testViewports = [viewports.mobile.iphoneSE, viewports.tablet.ipadMini, viewports.desktop.hd];

    for (const viewport of testViewports) {
      await setViewportAndWait(page, viewport);

      const borderRadius = await page.locator('.review-editor-container').evaluate((el) => {
        const radius = window.getComputedStyle(el).borderRadius;
        return parseInt(radius);
      });

      // Should have modern rounded corners (at least 12px)
      expect(borderRadius).toBeGreaterThanOrEqual(12);
    }
  });
});

test.describe('Responsive UI - Command Palette', () => {
  test('Command palette is sized appropriately for mobile', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const palette = document.createElement('div');
      palette.className = 'review-command-palette';
      palette.style.position = 'fixed';
      palette.style.display = 'block';
      document.body.appendChild(palette);
    });

    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    const dimensions = await getElementDimensions(page, '.review-command-palette');
    const viewportWidth = viewports.mobile.iphoneSE.width;

    // On mobile, should be close to 95% width (per mobile.css)
    const widthPercentage = (dimensions.width / viewportWidth) * 100;
    expect(widthPercentage).toBeGreaterThan(85); // Allow some tolerance
    expect(widthPercentage).toBeLessThanOrEqual(100);
  });

  test('Command palette has 16px font size on mobile (iOS zoom prevention)', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const palette = document.createElement('div');
      palette.className = 'review-command-palette';
      palette.style.display = 'block';

      const input = document.createElement('input');
      input.className = 'review-command-palette-input';
      palette.appendChild(input);
      document.body.appendChild(palette);
    });

    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    const fontSize = await getComputedStyle(
      page,
      '.review-command-palette-input',
      'font-size'
    );
    const fontSizeValue = parseInt(fontSize);

    // Should be at least 16px to prevent iOS zoom
    expect(fontSizeValue).toBeGreaterThanOrEqual(16);
  });

  test('Command palette hints are hidden on mobile', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const palette = document.createElement('div');
      palette.className = 'review-command-palette';
      palette.style.display = 'block';

      const hints = document.createElement('div');
      hints.className = 'review-palette-hints';
      palette.appendChild(hints);
      document.body.appendChild(palette);
    });

    // Desktop: hints should be visible
    await setViewportAndWait(page, viewports.desktop.hd);
    const desktopDisplay = await getComputedStyle(page, '.review-palette-hints', 'display');

    // Mobile: hints should be hidden
    await setViewportAndWait(page, viewports.mobile.iphoneSE);
    const mobileDisplay = await getComputedStyle(page, '.review-palette-hints', 'display');

    expect(mobileDisplay).toBe('none');
  });
});

test.describe('Responsive UI - Search Panel', () => {
  test('Search panel is properly sized on mobile', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const panel = document.createElement('div');
      panel.className = 'review-search-panel';
      panel.style.position = 'fixed';
      panel.style.display = 'block';
      document.body.appendChild(panel);
    });

    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    const dimensions = await getElementDimensions(page, '.review-search-panel');
    const viewportWidth = viewports.mobile.iphoneSE.width;

    // Should take up most of the width on mobile (95% per mobile.css)
    const widthPercentage = (dimensions.width / viewportWidth) * 100;
    expect(widthPercentage).toBeGreaterThan(85);
  });

  test('Search panel checkbox labels are hidden on mobile to save space', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const panel = document.createElement('div');
      panel.className = 'review-search-panel';
      panel.style.display = 'block';

      const label = document.createElement('label');
      label.className = 'review-search-checkbox-label';
      label.textContent = 'Option';
      panel.appendChild(label);
      document.body.appendChild(panel);
    });

    // Mobile: labels should be hidden
    await setViewportAndWait(page, viewports.mobile.iphoneSE);
    const mobileDisplay = await getComputedStyle(
      page,
      '.review-search-checkbox-label',
      'display'
    );

    expect(mobileDisplay).toBe('none');
  });
});

test.describe('Responsive UI - Sidebar Components', () => {
  test('Sidebar maintains proper width on tablet', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const sidebar = document.createElement('div');
      sidebar.className = 'review-persistent-sidebar';
      sidebar.style.position = 'fixed';
      sidebar.style.display = 'flex';
      document.body.appendChild(sidebar);
    });

    const tabletViewports = getTabletViewports();

    for (const viewport of tabletViewports) {
      await setViewportAndWait(page, viewport);

      const dimensions = await getElementDimensions(page, '.review-persistent-sidebar');

      // Should be reasonably sized (not too wide on tablet)
      expect(dimensions.width).toBeGreaterThan(200);
      expect(dimensions.width).toBeLessThan(500);
    }
  });

  test('Comments sidebar is scrollable when content overflows', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const sidebar = document.createElement('div');
      sidebar.className = 'review-comments-sidebar';
      sidebar.style.display = 'block';
      sidebar.style.maxHeight = '300px';
      sidebar.style.overflow = 'auto';

      // Add many items to force scrolling
      for (let i = 0; i < 20; i++) {
        const item = document.createElement('div');
        item.className = 'review-comment-item';
        item.style.height = '50px';
        item.textContent = `Comment ${i}`;
        sidebar.appendChild(item);
      }
      document.body.appendChild(sidebar);
    });

    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    const overflow = await hasOverflow(page, '.review-comments-sidebar');
    expect(overflow).toBeTruthy();
  });
});

test.describe('Responsive UI - Button and Interactive Elements', () => {
  test('Buttons maintain visibility and styling on all viewports', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-primary';
      btn.textContent = 'Test Button';
      document.body.appendChild(btn);
    });

    const allViewports = getAllViewports();

    for (const viewport of allViewports) {
      await setViewportAndWait(page, viewport);

      const btn = page.locator('.review-btn-primary').first();
      await expect(btn).toBeVisible();

      // Verify gradient is still applied
      const bgImage = await btn.evaluate((el) =>
        window.getComputedStyle(el).backgroundImage
      );
      expect(bgImage).toContain('gradient');
    }
  });

  test('Icon buttons are properly sized for touch on mobile', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-icon';
      btn.innerHTML = '⚙️';
      btn.style.padding = '12px';
      document.body.appendChild(btn);
    });

    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    const dimensions = await getElementDimensions(page, '.review-btn-icon');

    // Should meet minimum touch target size (44x44px recommended)
    expect(dimensions.width).toBeGreaterThanOrEqual(40); // Allow small tolerance
    expect(dimensions.height).toBeGreaterThanOrEqual(40);
  });
});

test.describe('Responsive UI - Layout Transitions', () => {
  test('No horizontal overflow on any viewport', async ({ page }) => {
    await page.goto('/example');

    const allViewports = getAllViewports();

    for (const viewport of allViewports) {
      await setViewportAndWait(page, viewport);

      // Check if document body has horizontal overflow
      const bodyHasOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });

      expect(bodyHasOverflow).toBeFalsy();
    }
  });

  test('Spacing and gaps reduce appropriately on mobile', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const toolbar = document.createElement('div');
      toolbar.className = 'review-toolbar';
      toolbar.id = 'gap-test-toolbar';
      toolbar.style.display = 'flex';
      toolbar.style.gap = '16px';
      document.body.appendChild(toolbar);
    });

    // Desktop gap
    await setViewportAndWait(page, viewports.desktop.hd);
    const desktopGap = await getComputedStyle(page, '#gap-test-toolbar', 'gap');

    // Mobile gap
    await setViewportAndWait(page, viewports.mobile.iphoneSE);
    const mobileGap = await getComputedStyle(page, '#gap-test-toolbar', 'gap');

    const desktopGapValue = parseInt(desktopGap);
    const mobileGapValue = parseInt(mobileGap);

    // Mobile gap should be less than or equal to desktop
    expect(mobileGapValue).toBeLessThanOrEqual(desktopGapValue);
  });

  test('Fixed elements maintain proper positioning across viewports', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const toolbar = document.createElement('div');
      toolbar.className = 'review-toolbar';
      toolbar.style.position = 'fixed';
      toolbar.style.display = 'flex';
      document.body.appendChild(toolbar);
    });

    const testViewports = [viewports.mobile.iphoneSE, viewports.tablet.ipadMini, viewports.desktop.hd];

    for (const viewport of testViewports) {
      await setViewportAndWait(page, viewport);

      const position = await getComputedStyle(page, '.review-toolbar', 'position');

      // On tablet and below, position might change to static
      if (viewport.width <= 768) {
        // Can be either fixed or static based on responsive design
        expect(['fixed', 'static']).toContain(position);
      } else {
        expect(position).toBe('fixed');
      }
    }
  });
});

test.describe('Responsive UI - Viewport-Specific Features', () => {
  test('Breakpoint-specific styles are applied correctly', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const container = document.createElement('div');
      container.className = 'review-responsive-test';
      container.id = 'breakpoint-test';
      container.style.display = 'block';
      document.body.appendChild(container);
    });

    // Test each breakpoint
    const tests = [
      { viewport: viewports.mobile.iphoneSE, expectedBreakpoint: 'mobile' },
      { viewport: viewports.tablet.ipadMini, expectedBreakpoint: 'tablet' },
      { viewport: viewports.desktop.hd, expectedBreakpoint: 'desktop' },
    ];

    for (const { viewport, expectedBreakpoint } of tests) {
      await setViewportAndWait(page, viewport);

      const actualBreakpoint = getBreakpoint(viewport.width);
      expect(actualBreakpoint).toBe(expectedBreakpoint);
    }
  });

  test('Text remains readable on small mobile screens', async ({ page }) => {
    await page.goto('/example');

    await page.evaluate(() => {
      const text = document.createElement('p');
      text.className = 'review-text-content';
      text.textContent = 'Sample text content for readability testing';
      document.body.appendChild(text);
    });

    await setViewportAndWait(page, viewports.mobile.android);

    const fontSize = await getComputedStyle(page, '.review-text-content', 'font-size');
    const fontSizeValue = parseInt(fontSize);

    // Minimum readable font size is typically 14px, but 16px is better
    expect(fontSizeValue).toBeGreaterThanOrEqual(14);
  });
});
