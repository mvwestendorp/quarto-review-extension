import { test, expect } from '@playwright/test';
import {
  viewports,
  getMobileViewports,
  getTabletViewports,
  getDesktopViewports,
  setViewportAndWait,
  waitForUIReady,
} from './helpers/responsive-utils';

/**
 * Visual Regression Tests for Responsive Layouts
 *
 * Uses Playwright's screenshot comparison to detect unintended visual changes
 * across different viewport sizes. Screenshots are stored as baselines and
 * automatically compared on subsequent test runs.
 *
 * To update baselines:
 *   npm run test:e2e -- --update-snapshots
 */

test.describe('Visual Regression - Mobile Viewports', () => {
  const mobileViewports = getMobileViewports();

  for (const viewport of mobileViewports) {
    test(`renders correctly on ${viewport.name}`, async ({ page }) => {
      await setViewportAndWait(page, viewport);
      await page.goto('/example');
      await waitForUIReady(page);

      // Full page screenshot
      await expect(page).toHaveScreenshot(`example-${viewport.name.replace(/\s/g, '-').toLowerCase()}.png`, {
        fullPage: true,
        maxDiffPixels: 100, // Allow small antialiasing differences
      });
    });

    test(`toolbar renders correctly on ${viewport.name}`, async ({ page }) => {
      await setViewportAndWait(page, viewport);
      await page.goto('/example');
      await waitForUIReady(page);

      // Create toolbar for visual test
      await page.evaluate(() => {
        const toolbar = document.createElement('div');
        toolbar.className = 'review-toolbar';
        toolbar.style.position = 'fixed';
        toolbar.style.display = 'flex';
        toolbar.style.top = '20px';

        // Add some buttons
        for (let i = 0; i < 3; i++) {
          const btn = document.createElement('button');
          btn.className = 'review-btn review-btn-icon';
          btn.innerHTML = '⚙️';
          toolbar.appendChild(btn);
        }

        document.body.appendChild(toolbar);
      });

      await page.waitForTimeout(200); // Wait for render

      const toolbar = page.locator('.review-toolbar');
      await expect(toolbar).toHaveScreenshot(`toolbar-${viewport.name.replace(/\s/g, '-').toLowerCase()}.png`);
    });

    test(`bottom drawer renders correctly on ${viewport.name}`, async ({ page }) => {
      await setViewportAndWait(page, viewport);
      await page.goto('/example');
      await waitForUIReady(page);

      await page.evaluate(() => {
        const drawer = document.createElement('div');
        drawer.className = 'review-bottom-drawer';
        drawer.id = 'visual-test-drawer'; // Unique ID for test element
        drawer.style.position = 'fixed';
        drawer.style.bottom = '0';
        drawer.style.left = '0';
        drawer.style.right = '0';
        drawer.style.height = '60px';
        drawer.style.display = 'flex';
        drawer.style.alignItems = 'center';
        drawer.style.justifyContent = 'center';

        const text = document.createElement('span');
        text.textContent = 'Review Tools';
        drawer.appendChild(text);

        document.body.appendChild(drawer);
      });

      await page.waitForTimeout(200);

      const drawer = page.locator('#visual-test-drawer');
      await expect(drawer).toHaveScreenshot(`bottom-drawer-${viewport.name.replace(/\s/g, '-').toLowerCase()}.png`);
    });

    test(`buttons render correctly on ${viewport.name}`, async ({ page }) => {
      await setViewportAndWait(page, viewport);
      await page.goto('/example');
      await waitForUIReady(page);

      await page.evaluate(() => {
        const container = document.createElement('div');
        container.id = 'button-showcase';
        container.style.padding = '20px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '12px';

        // Primary button
        const primary = document.createElement('button');
        primary.className = 'review-btn review-btn-primary';
        primary.textContent = 'Primary Button';
        container.appendChild(primary);

        // Secondary button
        const secondary = document.createElement('button');
        secondary.className = 'review-btn review-btn-secondary';
        secondary.textContent = 'Secondary Button';
        container.appendChild(secondary);

        // Pill button
        const pill = document.createElement('button');
        pill.className = 'review-btn review-btn-pill';
        pill.textContent = 'Pill Button';
        container.appendChild(pill);

        // Icon button
        const icon = document.createElement('button');
        icon.className = 'review-btn review-btn-icon';
        icon.innerHTML = '⚙️';
        container.appendChild(icon);

        document.body.appendChild(container);
      });

      await page.waitForTimeout(200);

      const container = page.locator('#button-showcase');
      await expect(container).toHaveScreenshot(`buttons-${viewport.name.replace(/\s/g, '-').toLowerCase()}.png`);
    });
  }
});

test.describe('Visual Regression - Tablet Viewports', () => {
  const tabletViewports = getTabletViewports();

  for (const viewport of tabletViewports) {
    test(`renders correctly on ${viewport.name}`, async ({ page }) => {
      await setViewportAndWait(page, viewport);
      await page.goto('/example');
      await waitForUIReady(page);

      await expect(page).toHaveScreenshot(`example-${viewport.name.replace(/\s/g, '-').toLowerCase()}.png`, {
        fullPage: true,
        maxDiffPixels: 100,
      });
    });

    test(`sidebar renders correctly on ${viewport.name}`, async ({ page }) => {
      await setViewportAndWait(page, viewport);
      await page.goto('/example');
      await waitForUIReady(page);

      await page.evaluate(() => {
        const sidebar = document.createElement('div');
        sidebar.className = 'review-persistent-sidebar';
        sidebar.style.position = 'fixed';
        sidebar.style.right = '0';
        sidebar.style.top = '0';
        sidebar.style.bottom = '0';
        sidebar.style.width = '300px';
        sidebar.style.display = 'flex';
        sidebar.style.flexDirection = 'column';
        sidebar.style.padding = '16px';

        const title = document.createElement('h3');
        title.textContent = 'Comments';
        sidebar.appendChild(title);

        // Add some comment items
        for (let i = 0; i < 3; i++) {
          const item = document.createElement('div');
          item.className = 'review-comment-item';
          item.style.padding = '8px';
          item.style.marginTop = '8px';
          item.textContent = `Comment ${i + 1}`;
          sidebar.appendChild(item);
        }

        document.body.appendChild(sidebar);
      });

      await page.waitForTimeout(200);

      const sidebar = page.locator('.review-persistent-sidebar');
      await expect(sidebar).toHaveScreenshot(`sidebar-${viewport.name.replace(/\s/g, '-').toLowerCase()}.png`);
    });

    test(`editor modal renders correctly on ${viewport.name}`, async ({ page }) => {
      await setViewportAndWait(page, viewport);
      await page.goto('/example');
      await waitForUIReady(page);

      await page.evaluate(() => {
        const modal = document.createElement('div');
        modal.className = 'review-editor-modal';
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        const container = document.createElement('div');
        container.className = 'review-editor-container';
        container.style.width = '80%';
        container.style.maxWidth = '600px';
        container.style.padding = '24px';

        const title = document.createElement('h2');
        title.textContent = 'Edit Comment';
        container.appendChild(title);

        const textarea = document.createElement('textarea');
        textarea.style.width = '100%';
        textarea.style.height = '100px';
        textarea.value = 'Sample comment text';
        container.appendChild(textarea);

        const toolbar = document.createElement('div');
        toolbar.className = 'review-editor-toolbar';
        toolbar.style.display = 'flex';
        toolbar.style.gap = '8px';
        toolbar.style.marginTop = '12px';

        ['B', 'I', 'U'].forEach((text) => {
          const btn = document.createElement('button');
          btn.className = 'review-editor-toolbar-btn';
          btn.textContent = text;
          toolbar.appendChild(btn);
        });

        container.appendChild(toolbar);
        modal.appendChild(container);
        document.body.appendChild(modal);
      });

      await page.waitForTimeout(200);

      const modal = page.locator('.review-editor-modal');
      await expect(modal).toHaveScreenshot(`editor-modal-${viewport.name.replace(/\s/g, '-').toLowerCase()}.png`);
    });
  }
});

test.describe('Visual Regression - Desktop Viewports', () => {
  const desktopViewports = getDesktopViewports();

  for (const viewport of desktopViewports) {
    test(`renders correctly on ${viewport.name}`, async ({ page }) => {
      await setViewportAndWait(page, viewport);
      await page.goto('/example');
      await waitForUIReady(page);

      await expect(page).toHaveScreenshot(`example-${viewport.name.replace(/\s/g, '-').toLowerCase()}.png`, {
        fullPage: true,
        maxDiffPixels: 100,
      });
    });

    test(`command palette renders correctly on ${viewport.name}`, async ({ page }) => {
      await setViewportAndWait(page, viewport);
      await page.goto('/example');
      await waitForUIReady(page);

      await page.evaluate(() => {
        const palette = document.createElement('div');
        palette.className = 'review-command-palette';
        palette.style.position = 'fixed';
        palette.style.top = '50%';
        palette.style.left = '50%';
        palette.style.transform = 'translate(-50%, -50%)';
        palette.style.width = '500px';
        palette.style.maxWidth = '90vw';
        palette.style.padding = '16px';

        const input = document.createElement('input');
        input.className = 'review-command-palette-input';
        input.placeholder = 'Type a command...';
        input.style.width = '100%';
        palette.appendChild(input);

        const hints = document.createElement('div');
        hints.className = 'review-palette-hints';
        hints.style.marginTop = '12px';

        for (let i = 0; i < 5; i++) {
          const hint = document.createElement('div');
          hint.textContent = `Command ${i + 1}`;
          hint.style.padding = '8px';
          hints.appendChild(hint);
        }

        palette.appendChild(hints);
        document.body.appendChild(palette);
      });

      await page.waitForTimeout(200);

      const palette = page.locator('.review-command-palette');
      await expect(palette).toHaveScreenshot(`command-palette-${viewport.name.replace(/\s/g, '-').toLowerCase()}.png`);
    });

    test(`full layout with all components on ${viewport.name}`, async ({ page }) => {
      await setViewportAndWait(page, viewport);
      await page.goto('/example');
      await waitForUIReady(page);

      // Create a full layout with multiple components
      await page.evaluate(() => {
        // Toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'review-toolbar';
        toolbar.style.position = 'fixed';
        toolbar.style.top = '20px';
        toolbar.style.left = '50%';
        toolbar.style.transform = 'translateX(-50%)';
        toolbar.style.display = 'flex';
        toolbar.style.gap = '8px';

        for (let i = 0; i < 5; i++) {
          const btn = document.createElement('button');
          btn.className = 'review-btn review-btn-icon';
          btn.innerHTML = '⚙️';
          toolbar.appendChild(btn);
        }
        document.body.appendChild(toolbar);

        // Sidebar
        const sidebar = document.createElement('div');
        sidebar.className = 'review-persistent-sidebar';
        sidebar.style.position = 'fixed';
        sidebar.style.right = '20px';
        sidebar.style.top = '100px';
        sidebar.style.width = '280px';
        sidebar.style.height = '400px';
        sidebar.style.display = 'flex';
        sidebar.style.flexDirection = 'column';
        sidebar.style.padding = '16px';
        document.body.appendChild(sidebar);

        // Bottom drawer
        const drawer = document.createElement('div');
        drawer.className = 'review-bottom-drawer';
        drawer.style.position = 'fixed';
        drawer.style.bottom = '0';
        drawer.style.left = '0';
        drawer.style.right = '0';
        drawer.style.height = '60px';
        drawer.style.display = 'flex';
        drawer.style.alignItems = 'center';
        drawer.style.justifyContent = 'center';
        document.body.appendChild(drawer);
      });

      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot(`full-layout-${viewport.name.replace(/\s/g, '-').toLowerCase()}.png`, {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });
  }
});

test.describe('Visual Regression - Component States', () => {
  test('button hover states across viewports', async ({ page }) => {
    const testViewports = [viewports.mobile.iphoneSE, viewports.tablet.ipadMini, viewports.desktop.hd];

    for (const viewport of testViewports) {
      await setViewportAndWait(page, viewport);
      await page.goto('/example');
      await waitForUIReady(page);

      await page.evaluate(() => {
        const container = document.createElement('div');
        container.id = 'hover-test';
        container.style.padding = '40px';

        const btn = document.createElement('button');
        btn.className = 'review-btn review-btn-primary';
        btn.textContent = 'Hover Me';
        container.appendChild(btn);

        document.body.appendChild(container);
      });

      const btn = page.locator('.review-btn-primary');
      await btn.hover();
      await page.waitForTimeout(100);

      const breakpoint = viewport.width <= 640 ? 'mobile' : viewport.width <= 768 ? 'tablet' : 'desktop';
      await expect(btn).toHaveScreenshot(`button-hover-${breakpoint}.png`);
    }
  });

  test('button disabled states across viewports', async ({ page }) => {
    const testViewports = [viewports.mobile.iphoneSE, viewports.tablet.ipadMini, viewports.desktop.hd];

    for (const viewport of testViewports) {
      await setViewportAndWait(page, viewport);
      await page.goto('/example');
      await waitForUIReady(page);

      await page.evaluate(() => {
        const container = document.createElement('div');
        container.id = 'disabled-test';
        container.style.padding = '40px';
        container.style.display = 'flex';
        container.style.gap = '12px';

        const enabledBtn = document.createElement('button');
        enabledBtn.className = 'review-btn review-btn-primary';
        enabledBtn.textContent = 'Enabled';
        container.appendChild(enabledBtn);

        const disabledBtn = document.createElement('button');
        disabledBtn.className = 'review-btn review-btn-primary';
        disabledBtn.textContent = 'Disabled';
        disabledBtn.disabled = true;
        container.appendChild(disabledBtn);

        document.body.appendChild(container);
      });

      await page.waitForTimeout(100);

      const container = page.locator('#disabled-test');
      const breakpoint = viewport.width <= 640 ? 'mobile' : viewport.width <= 768 ? 'tablet' : 'desktop';
      await expect(container).toHaveScreenshot(`button-disabled-${breakpoint}.png`);
    }
  });

  test('modal backdrop opacity across viewports', async ({ page }) => {
    const testViewports = [viewports.mobile.iphoneSE, viewports.tablet.ipadMini, viewports.desktop.hd];

    for (const viewport of testViewports) {
      await setViewportAndWait(page, viewport);
      await page.goto('/example');
      await waitForUIReady(page);

      await page.evaluate(() => {
        const modal = document.createElement('div');
        modal.className = 'review-editor-modal';
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        const container = document.createElement('div');
        container.className = 'review-editor-container';
        container.style.padding = '32px';
        container.textContent = 'Modal Content';
        modal.appendChild(container);

        document.body.appendChild(modal);
      });

      await page.waitForTimeout(100);

      const breakpoint = viewport.width <= 640 ? 'mobile' : viewport.width <= 768 ? 'tablet' : 'desktop';
      await expect(page).toHaveScreenshot(`modal-backdrop-${breakpoint}.png`);
    }
  });
});

test.describe('Visual Regression - Transition Testing', () => {
  test('layout transition from mobile to tablet', async ({ page }) => {
    await page.goto('/example');
    await waitForUIReady(page);

    // Create layout elements
    await page.evaluate(() => {
      const toolbar = document.createElement('div');
      toolbar.className = 'review-toolbar';
      toolbar.id = 'transition-toolbar';
      toolbar.style.position = 'fixed';
      toolbar.style.display = 'flex';
      document.body.appendChild(toolbar);

      const drawer = document.createElement('div');
      drawer.className = 'review-bottom-drawer';
      drawer.style.position = 'fixed';
      drawer.style.bottom = '0';
      drawer.style.display = 'flex';
      document.body.appendChild(drawer);
    });

    // Mobile
    await setViewportAndWait(page, viewports.mobile.iphoneSE);
    await expect(page).toHaveScreenshot('transition-mobile-before.png');

    // Tablet
    await setViewportAndWait(page, viewports.tablet.ipadMini);
    await expect(page).toHaveScreenshot('transition-tablet-after.png');
  });

  test('layout transition from tablet to desktop', async ({ page }) => {
    await page.goto('/example');
    await waitForUIReady(page);

    await page.evaluate(() => {
      const sidebar = document.createElement('div');
      sidebar.className = 'review-persistent-sidebar';
      sidebar.style.position = 'fixed';
      sidebar.style.right = '0';
      sidebar.style.display = 'flex';
      sidebar.style.width = '280px';
      document.body.appendChild(sidebar);
    });

    // Tablet
    await setViewportAndWait(page, viewports.tablet.ipadMini);
    await expect(page).toHaveScreenshot('transition-tablet-before.png');

    // Desktop
    await setViewportAndWait(page, viewports.desktop.hd);
    await expect(page).toHaveScreenshot('transition-desktop-after.png');
  });
});
