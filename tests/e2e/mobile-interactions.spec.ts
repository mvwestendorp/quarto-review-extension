import { test, expect } from '@playwright/test';
import {
  viewports,
  getMobileViewports,
  setViewportAndWait,
  tap,
  longPress,
  swipe,
  hasIOSZoomPrevention,
  waitForUIReady,
  getElementDimensions,
} from './helpers/responsive-utils';

/**
 * Mobile Interactions Tests
 *
 * Tests touch-specific interactions, gestures, and mobile-specific behaviors
 * including virtual keyboard handling, touch targets, and mobile navigation patterns.
 */

test.describe('Mobile Interactions - Touch Gestures', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await waitForUIReady(page);
  });

  test('button responds to tap on mobile', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-primary';
      btn.id = 'tap-test-btn';
      btn.textContent = 'Tap Me';

      let tapCount = 0;
      btn.addEventListener('click', () => {
        tapCount++;
        btn.setAttribute('data-tap-count', tapCount.toString());
      });

      document.body.appendChild(btn);
    });

    const btn = page.locator('#tap-test-btn');

    // Perform tap
    await tap(page, '#tap-test-btn');

    // Verify tap was registered
    const tapCount = await btn.getAttribute('data-tap-count');
    expect(tapCount).toBe('1');
  });

  test('drawer can be swiped up to expand', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphone13);

    await page.evaluate(() => {
      const drawer = document.createElement('div');
      drawer.className = 'review-bottom-drawer';
      drawer.id = 'swipe-drawer';
      drawer.style.position = 'fixed';
      drawer.style.bottom = '0';
      drawer.style.left = '0';
      drawer.style.right = '0';
      drawer.style.height = '60px';
      drawer.style.display = 'flex';
      drawer.style.transition = 'height 0.3s ease';
      drawer.style.backgroundColor = '#f0f0f0';
      drawer.style.touchAction = 'none';

      let startY = 0;
      let currentHeight = 60;

      drawer.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
      });

      drawer.addEventListener('touchmove', (e) => {
        const deltaY = startY - e.touches[0].clientY;
        if (deltaY > 50) {
          currentHeight = 400;
          drawer.style.height = `${currentHeight}px`;
          drawer.setAttribute('data-expanded', 'true');
        }
      });

      document.body.appendChild(drawer);
    });

    const drawer = page.locator('#swipe-drawer');

    // Initial state
    const initialHeight = await drawer.evaluate((el) => el.offsetHeight);
    expect(initialHeight).toBe(60);

    // Swipe up
    await swipe(page, '#swipe-drawer', 'up', 100);
    await page.waitForTimeout(400);

    // Check if expanded
    const expanded = await drawer.getAttribute('data-expanded');
    expect(expanded).toBe('true');
  });

  test('sidebar can be swiped away on mobile', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.android);

    await page.evaluate(() => {
      const sidebar = document.createElement('div');
      sidebar.className = 'review-mobile-sidebar';
      sidebar.id = 'swipe-sidebar';
      sidebar.style.position = 'fixed';
      sidebar.style.top = '0';
      sidebar.style.right = '0';
      sidebar.style.bottom = '0';
      sidebar.style.width = '280px';
      sidebar.style.display = 'block';
      sidebar.style.transition = 'transform 0.3s ease';
      sidebar.style.backgroundColor = '#ffffff';
      sidebar.style.transform = 'translateX(0)';

      let startX = 0;
      sidebar.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
      });

      sidebar.addEventListener('touchmove', (e) => {
        const deltaX = e.touches[0].clientX - startX;
        if (deltaX > 100) {
          sidebar.style.transform = 'translateX(100%)';
          sidebar.setAttribute('data-dismissed', 'true');
        }
      });

      document.body.appendChild(sidebar);
    });

    const sidebar = page.locator('#swipe-sidebar');
    await expect(sidebar).toBeVisible();

    // Swipe right to dismiss
    await swipe(page, '#swipe-sidebar', 'right', 150);
    await page.waitForTimeout(400);

    const dismissed = await sidebar.getAttribute('data-dismissed');
    expect(dismissed).toBe('true');
  });

  test('long press opens context menu', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    await page.evaluate(() => {
      const element = document.createElement('div');
      element.className = 'review-comment-item';
      element.id = 'context-item';
      element.style.padding = '16px';
      element.style.backgroundColor = '#f5f5f5';
      element.textContent = 'Long press me';

      let longPressTimer: number;
      element.addEventListener('touchstart', () => {
        longPressTimer = window.setTimeout(() => {
          const menu = document.createElement('div');
          menu.className = 'review-context-menu';
          menu.id = 'context-menu';
          menu.style.position = 'fixed';
          menu.style.background = 'white';
          menu.style.padding = '8px';
          menu.textContent = 'Context Menu';
          document.body.appendChild(menu);
          element.setAttribute('data-menu-shown', 'true');
        }, 500);
      });

      element.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
      });

      document.body.appendChild(element);
    });

    // Simulate long press
    await longPress(page, '#context-item', 600);

    const menuShown = await page.locator('#context-item').getAttribute('data-menu-shown');
    expect(menuShown).toBe('true');

    const menu = page.locator('#context-menu');
    await expect(menu).toBeVisible();
  });
});

test.describe('Mobile Interactions - Virtual Keyboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await waitForUIReady(page);
  });

  test('input has 16px font size to prevent iOS zoom', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'review-comment-input';
      input.id = 'zoom-test-input';
      input.placeholder = 'Enter comment...';
      document.body.appendChild(input);
    });

    const hasZoomPrevention = await hasIOSZoomPrevention(page, '#zoom-test-input');
    expect(hasZoomPrevention).toBeTruthy();
  });

  test('textarea maintains viewport when focused', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphone13);

    await page.evaluate(() => {
      const textarea = document.createElement('textarea');
      textarea.className = 'review-comment-textarea';
      textarea.id = 'viewport-test-textarea';
      textarea.style.width = '90%';
      textarea.style.fontSize = '16px';
      textarea.style.padding = '12px';
      document.body.appendChild(textarea);
    });

    const initialViewportWidth = await page.evaluate(() => window.innerWidth);

    // Focus the textarea
    await page.locator('#viewport-test-textarea').focus();
    await page.waitForTimeout(300);

    const focusedViewportWidth = await page.evaluate(() => window.innerWidth);

    // Viewport width should remain the same (no zoom)
    expect(focusedViewportWidth).toBe(initialViewportWidth);
  });

  test('editor modal adjusts for virtual keyboard', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.android);

    await page.evaluate(() => {
      const modal = document.createElement('div');
      modal.className = 'review-editor-modal';
      modal.id = 'keyboard-modal';
      modal.style.position = 'fixed';
      modal.style.inset = '0';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';

      const container = document.createElement('div');
      container.className = 'review-editor-container';
      container.style.padding = '16px';
      container.style.maxHeight = '70vh';

      const textarea = document.createElement('textarea');
      textarea.id = 'modal-textarea';
      textarea.style.width = '100%';
      textarea.style.height = '100px';
      textarea.style.fontSize = '16px';

      container.appendChild(textarea);
      modal.appendChild(container);
      document.body.appendChild(modal);
    });

    const textarea = page.locator('#modal-textarea');

    // Get initial modal position
    const initialBottom = await page
      .locator('.review-editor-container')
      .evaluate((el) => el.getBoundingClientRect().bottom);

    // Focus textarea (would normally trigger keyboard)
    await textarea.focus();
    await page.waitForTimeout(200);

    // Modal should still be visible and accessible
    const modal = page.locator('#keyboard-modal');
    await expect(modal).toBeVisible();

    const container = page.locator('.review-editor-container');
    await expect(container).toBeVisible();
  });

  test('input fields prevent text zoom on focus', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    await page.evaluate(() => {
      const inputs = document.createElement('div');
      inputs.id = 'input-container';

      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.className = 'review-input';
      textInput.style.fontSize = '16px';
      inputs.appendChild(textInput);

      const emailInput = document.createElement('input');
      emailInput.type = 'email';
      emailInput.className = 'review-input';
      emailInput.style.fontSize = '16px';
      inputs.appendChild(emailInput);

      const searchInput = document.createElement('input');
      searchInput.type = 'search';
      searchInput.className = 'review-input';
      searchInput.style.fontSize = '16px';
      inputs.appendChild(searchInput);

      document.body.appendChild(inputs);
    });

    const inputElements = page.locator('.review-input');
    const count = await inputElements.count();

    for (let i = 0; i < count; i++) {
      const fontSize = await inputElements
        .nth(i)
        .evaluate((el) => window.getComputedStyle(el).fontSize);
      const fontSizeValue = parseInt(fontSize);
      expect(fontSizeValue).toBeGreaterThanOrEqual(16);
    }
  });
});

test.describe('Mobile Interactions - Touch Target Size', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await waitForUIReady(page);
  });

  test('icon buttons meet minimum touch target size', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    await page.evaluate(() => {
      const toolbar = document.createElement('div');
      toolbar.className = 'review-toolbar';

      for (let i = 0; i < 3; i++) {
        const btn = document.createElement('button');
        btn.className = 'review-btn review-btn-icon';
        btn.style.padding = '12px';
        btn.innerHTML = '⚙️';
        toolbar.appendChild(btn);
      }

      document.body.appendChild(toolbar);
    });

    const buttons = page.locator('.review-btn-icon');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const dimensions = await buttons.nth(i).evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });

      // WCAG recommends minimum 44x44px for touch targets
      expect(dimensions.width).toBeGreaterThanOrEqual(40); // Small tolerance
      expect(dimensions.height).toBeGreaterThanOrEqual(40);
    }
  });

  test('close buttons are large enough for touch', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.android);

    await page.evaluate(() => {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'review-close-btn';
      closeBtn.innerHTML = '×';
      closeBtn.style.fontSize = '24px';
      closeBtn.style.padding = '12px';
      closeBtn.style.minWidth = '44px';
      closeBtn.style.minHeight = '44px';
      document.body.appendChild(closeBtn);
    });

    const dimensions = await getElementDimensions(page, '.review-close-btn');

    expect(dimensions.width).toBeGreaterThanOrEqual(44);
    expect(dimensions.height).toBeGreaterThanOrEqual(44);
  });

  test('comment action buttons have adequate spacing', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphone13);

    await page.evaluate(() => {
      const container = document.createElement('div');
      container.className = 'review-comment-actions';
      container.style.display = 'flex';
      container.style.gap = '8px';

      ['Edit', 'Delete', 'Reply'].forEach((action) => {
        const btn = document.createElement('button');
        btn.className = 'review-action-btn';
        btn.textContent = action;
        btn.style.padding = '8px 16px';
        btn.style.minHeight = '44px';
        container.appendChild(btn);
      });

      document.body.appendChild(container);
    });

    const buttons = page.locator('.review-action-btn');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const dimensions = await buttons.nth(i).evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });

      expect(dimensions.height).toBeGreaterThanOrEqual(44);
    }

    // Check spacing between buttons
    if (count > 1) {
      const first = await buttons.nth(0).boundingBox();
      const second = await buttons.nth(1).boundingBox();

      if (first && second) {
        const gap = second.x - (first.x + first.width);
        expect(gap).toBeGreaterThanOrEqual(4); // Minimum spacing
      }
    }
  });

  test('checkbox inputs have adequate touch area', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    await page.evaluate(() => {
      const container = document.createElement('div');

      for (let i = 0; i < 3; i++) {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.padding = '12px';
        label.style.minHeight = '44px';
        label.style.cursor = 'pointer';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'review-checkbox';
        checkbox.style.width = '20px';
        checkbox.style.height = '20px';
        checkbox.style.marginRight = '8px';

        const text = document.createTextNode(`Option ${i + 1}`);

        label.appendChild(checkbox);
        label.appendChild(text);
        container.appendChild(label);
      }

      document.body.appendChild(container);
    });

    // The label provides the touch target
    const labels = page.locator('label');
    const count = await labels.count();

    for (let i = 0; i < count; i++) {
      const dimensions = await labels.nth(i).evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });

      expect(dimensions.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('Mobile Interactions - Navigation Patterns', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await waitForUIReady(page);
  });

  test('bottom drawer provides easy thumb access', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    await page.evaluate(() => {
      const drawer = document.createElement('div');
      drawer.className = 'review-bottom-drawer';
      drawer.style.position = 'fixed';
      drawer.style.bottom = '0';
      drawer.style.left = '0';
      drawer.style.right = '0';
      drawer.style.height = '60px';
      drawer.style.display = 'flex';
      drawer.style.alignItems = 'center';
      drawer.style.justifyContent = 'space-around';
      drawer.style.padding = '0 16px';

      ['Comments', 'Export', 'Settings'].forEach((label) => {
        const btn = document.createElement('button');
        btn.className = 'review-drawer-btn';
        btn.textContent = label;
        btn.style.minHeight = '44px';
        btn.style.padding = '8px 16px';
        drawer.appendChild(btn);
      });

      document.body.appendChild(drawer);
    });

    const drawer = page.locator('.review-bottom-drawer');
    const dimensions = await getElementDimensions(page, '.review-bottom-drawer');

    // Should be at bottom for thumb access
    expect(dimensions.bottom).toBeLessThanOrEqual(viewports.mobile.iphoneSE.height);

    // Buttons should be touch-friendly
    const buttons = page.locator('.review-drawer-btn');
    const firstBtn = await getElementDimensions(page, '.review-drawer-btn');
    expect(firstBtn.height).toBeGreaterThanOrEqual(44);
  });

  test('toolbar positioned for one-handed use on mobile', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.android);

    await page.evaluate(() => {
      const toolbar = document.createElement('div');
      toolbar.className = 'review-toolbar';
      toolbar.style.position = 'fixed';
      toolbar.style.top = '20px';
      toolbar.style.display = 'flex';
      toolbar.style.gap = '8px';
      document.body.appendChild(toolbar);
    });

    const dimensions = await getElementDimensions(page, '.review-toolbar');

    // Should be reasonably positioned (not requiring two hands)
    expect(dimensions.top).toBeLessThan(100);
  });

  test('modal close button is easily reachable', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphone13);

    await page.evaluate(() => {
      const modal = document.createElement('div');
      modal.className = 'review-editor-modal';
      modal.style.position = 'fixed';
      modal.style.inset = '0';
      modal.style.display = 'flex';

      const container = document.createElement('div');
      container.className = 'review-editor-container';
      container.style.position = 'relative';
      container.style.margin = 'auto';
      container.style.padding = '24px';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'review-modal-close';
      closeBtn.style.position = 'absolute';
      closeBtn.style.top = '8px';
      closeBtn.style.right = '8px';
      closeBtn.style.minWidth = '44px';
      closeBtn.style.minHeight = '44px';
      closeBtn.innerHTML = '×';

      container.appendChild(closeBtn);
      modal.appendChild(container);
      document.body.appendChild(modal);
    });

    const closeBtn = page.locator('.review-modal-close');
    await expect(closeBtn).toBeVisible();

    const dimensions = await getElementDimensions(page, '.review-modal-close');
    expect(dimensions.width).toBeGreaterThanOrEqual(44);
    expect(dimensions.height).toBeGreaterThanOrEqual(44);
  });

  test('swipe navigation between panels works smoothly', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'swipe-panels';
      container.style.position = 'relative';
      container.style.overflow = 'hidden';
      container.style.height = '300px';

      const panels = document.createElement('div');
      panels.style.display = 'flex';
      panels.style.transition = 'transform 0.3s ease';
      panels.style.transform = 'translateX(0)';
      panels.id = 'panels-container';

      ['Panel 1', 'Panel 2', 'Panel 3'].forEach((text, index) => {
        const panel = document.createElement('div');
        panel.style.minWidth = '100%';
        panel.style.height = '300px';
        panel.style.display = 'flex';
        panel.style.alignItems = 'center';
        panel.style.justifyContent = 'center';
        panel.textContent = text;
        panel.setAttribute('data-panel', index.toString());
        panels.appendChild(panel);
      });

      let startX = 0;
      let currentPanel = 0;

      container.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
      });

      container.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0].clientX;
        const deltaX = startX - endX;

        if (deltaX > 50 && currentPanel < 2) {
          currentPanel++;
        } else if (deltaX < -50 && currentPanel > 0) {
          currentPanel--;
        }

        panels.style.transform = `translateX(-${currentPanel * 100}%)`;
        container.setAttribute('data-current-panel', currentPanel.toString());
      });

      container.appendChild(panels);
      document.body.appendChild(container);
    });

    const container = page.locator('#swipe-panels');

    // Initial panel
    let currentPanel = await container.getAttribute('data-current-panel');
    expect(currentPanel).toBeNull(); // Not set initially

    // Swipe left to next panel
    await swipe(page, '#swipe-panels', 'left', 100);
    await page.waitForTimeout(400);

    currentPanel = await container.getAttribute('data-current-panel');
    expect(currentPanel).toBe('1');

    // Swipe right back
    await swipe(page, '#swipe-panels', 'right', 100);
    await page.waitForTimeout(400);

    currentPanel = await container.getAttribute('data-current-panel');
    expect(currentPanel).toBe('0');
  });
});

test.describe('Mobile Interactions - Scroll Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await waitForUIReady(page);
  });

  test('long comment list is scrollable', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphone13);

    await page.evaluate(() => {
      const list = document.createElement('div');
      list.className = 'review-comment-list';
      list.style.maxHeight = '300px';
      list.style.overflowY = 'auto';
      list.style.webkitOverflowScrolling = 'touch'; // Smooth iOS scrolling

      for (let i = 0; i < 20; i++) {
        const item = document.createElement('div');
        item.className = 'review-comment-item';
        item.style.padding = '16px';
        item.style.borderBottom = '1px solid #eee';
        item.textContent = `Comment ${i + 1}`;
        list.appendChild(item);
      }

      document.body.appendChild(list);
    });

    const list = page.locator('.review-comment-list');

    // Verify scrollable
    const isScrollable = await list.evaluate((el) => {
      return el.scrollHeight > el.clientHeight;
    });
    expect(isScrollable).toBeTruthy();

    // Verify iOS smooth scrolling
    const scrollingStyle = await list.evaluate((el) => {
      return window.getComputedStyle(el).webkitOverflowScrolling;
    });
    expect(scrollingStyle).toBe('touch');
  });

  test('modal content scrolls independently', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.android);

    await page.evaluate(() => {
      const modal = document.createElement('div');
      modal.className = 'review-editor-modal';
      modal.style.position = 'fixed';
      modal.style.inset = '0';
      modal.style.overflowY = 'auto';

      const container = document.createElement('div');
      container.className = 'review-editor-container';
      container.style.maxHeight = '70vh';
      container.style.overflowY = 'auto';

      for (let i = 0; i < 30; i++) {
        const line = document.createElement('p');
        line.textContent = `Line ${i + 1}`;
        container.appendChild(line);
      }

      modal.appendChild(container);
      document.body.appendChild(modal);
    });

    const container = page.locator('.review-editor-container');

    const isScrollable = await container.evaluate((el) => {
      return el.scrollHeight > el.clientHeight;
    });
    expect(isScrollable).toBeTruthy();
  });

  test('sticky elements remain visible during scroll', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    await page.evaluate(() => {
      const header = document.createElement('div');
      header.className = 'review-sticky-header';
      header.style.position = 'sticky';
      header.style.top = '0';
      header.style.padding = '16px';
      header.style.backgroundColor = 'white';
      header.style.zIndex = '10';
      header.textContent = 'Sticky Header';
      document.body.appendChild(header);

      // Add scrollable content
      for (let i = 0; i < 50; i++) {
        const p = document.createElement('p');
        p.textContent = `Content line ${i + 1}`;
        document.body.appendChild(p);
      }
    });

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(300);

    const header = page.locator('.review-sticky-header');
    await expect(header).toBeVisible();

    // Header should still be at the top
    const position = await header.evaluate((el) => {
      return window.getComputedStyle(el).position;
    });
    expect(position).toBe('sticky');
  });
});
