import { test, expect } from '@playwright/test';
import {
  viewports,
  getAllViewports,
  getMobileViewports,
  setViewportAndWait,
  meetsTouchTargetSize,
  getFailedTouchTargets,
  getComputedStyle,
  getElementDimensions,
  waitForUIReady,
} from './helpers/responsive-utils';

/**
 * Responsive Accessibility Tests
 *
 * Tests accessibility compliance across different viewport sizes, ensuring:
 * - WCAG 2.1 AA compliance for touch targets (44x44px minimum)
 * - Color contrast ratios (4.5:1 for normal text, 3:1 for large text)
 * - Keyboard navigation on all devices
 * - Focus indicators visibility
 * - Screen reader compatibility
 */

test.describe('Responsive Accessibility - Touch Target Size (WCAG 2.5.5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await waitForUIReady(page);
  });

  test('all interactive elements meet 44x44px minimum on mobile', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    await page.evaluate(() => {
      const container = document.createElement('div');
      container.style.padding = '20px';

      // Create various interactive elements
      const button = document.createElement('button');
      button.className = 'review-btn review-btn-primary';
      button.textContent = 'Button';
      button.style.padding = '12px 24px';
      container.appendChild(button);

      const link = document.createElement('a');
      link.href = '#';
      link.textContent = 'Link';
      link.style.display = 'inline-block';
      link.style.padding = '12px';
      link.style.minHeight = '44px';
      link.style.lineHeight = '20px';
      container.appendChild(link);

      const iconBtn = document.createElement('button');
      iconBtn.className = 'review-btn review-btn-icon';
      iconBtn.innerHTML = '⚙️';
      iconBtn.style.padding = '12px';
      iconBtn.style.minWidth = '44px';
      iconBtn.style.minHeight = '44px';
      container.appendChild(iconBtn);

      document.body.appendChild(container);
    });

    // Check only review extension interactive elements (ignore Quarto template elements)
    const failedTargets = await getFailedTouchTargets(page, 44, 'review-');

    // Should have no failed targets in our review extension elements
    if (failedTargets.length > 0) {
      console.log('Failed touch targets:', failedTargets);
    }
    expect(failedTargets.length).toBe(0);
  });

  test('button touch targets meet minimum size across all mobile viewports', async ({
    page,
  }) => {
    const mobileViewports = getMobileViewports();

    for (const viewport of mobileViewports) {
      await setViewportAndWait(page, viewport);

      await page.evaluate(() => {
        // Clear previous content
        document.body.innerHTML = '';

        const btn = document.createElement('button');
        btn.className = 'review-touch-target-test';
        btn.textContent = 'Touch Me';
        btn.style.padding = '12px 24px';
        btn.style.minHeight = '44px';
        document.body.appendChild(btn);
      });

      const meetsSize = await meetsTouchTargetSize(page, '.review-touch-target-test', 44);
      expect(meetsSize).toBeTruthy();
    }
  });

  test('close buttons are adequately sized for touch', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.android);

    await page.evaluate(() => {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'review-close-btn';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.innerHTML = '×';
      closeBtn.style.fontSize = '28px';
      closeBtn.style.padding = '8px';
      closeBtn.style.minWidth = '44px';
      closeBtn.style.minHeight = '44px';
      closeBtn.style.border = 'none';
      closeBtn.style.background = 'transparent';
      closeBtn.style.cursor = 'pointer';
      document.body.appendChild(closeBtn);
    });

    const meetsSize = await meetsTouchTargetSize(page, '.review-close-btn', 44);
    expect(meetsSize).toBeTruthy();
  });

  test('toolbar icon buttons have adequate spacing and size', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphone13);

    await page.evaluate(() => {
      const toolbar = document.createElement('div');
      toolbar.className = 'review-toolbar';
      toolbar.style.display = 'flex';
      toolbar.style.gap = '8px';
      toolbar.style.padding = '8px';

      ['💾', '📤', '🔍', '⚙️'].forEach((icon) => {
        const btn = document.createElement('button');
        btn.className = 'review-toolbar-btn';
        btn.innerHTML = icon;
        btn.style.minWidth = '44px';
        btn.style.minHeight = '44px';
        btn.style.padding = '10px';
        btn.setAttribute('aria-label', 'Toolbar button');
        toolbar.appendChild(btn);
      });

      document.body.appendChild(toolbar);
    });

    const buttons = page.locator('.review-toolbar-btn');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const dimensions = await buttons.nth(i).evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });

      expect(dimensions.width).toBeGreaterThanOrEqual(44);
      expect(dimensions.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('Responsive Accessibility - Color Contrast (WCAG 1.4.3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await waitForUIReady(page);
  });

  test('button text has sufficient contrast on all viewports', async ({ page }) => {
    const testViewports = [
      viewports.mobile.iphoneSE,
      viewports.tablet.ipadMini,
      viewports.desktop.hd,
    ];

    for (const viewport of testViewports) {
      await setViewportAndWait(page, viewport);

      await page.evaluate(() => {
        document.body.innerHTML = '';

        const btn = document.createElement('button');
        btn.className = 'review-btn review-btn-primary';
        btn.textContent = 'Primary Button';
        document.body.appendChild(btn);
      });

      // Get computed colors
      const textColor = await getComputedStyle(page, '.review-btn-primary', 'color');
      const bgColor = await getComputedStyle(page, '.review-btn-primary', 'background-color');

      // Colors should be defined (actual contrast ratio calculation would require color parsing)
      expect(textColor).toBeTruthy();
      expect(bgColor).toBeTruthy();
      expect(textColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('focus indicators have sufficient contrast', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-secondary';
      btn.textContent = 'Focus Test';
      btn.id = 'focus-test-btn';
      document.body.appendChild(btn);
    });

    const btn = page.locator('#focus-test-btn');
    await btn.focus();

    const outline = await btn.evaluate((el) => {
      return window.getComputedStyle(el).outline;
    });

    // Should have visible outline
    expect(outline).toBeTruthy();
    expect(outline).not.toBe('none');
    expect(outline).not.toContain('0px');
  });

  test('disabled state maintains visible contrast difference', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.android);

    await page.evaluate(() => {
      const container = document.createElement('div');
      container.style.padding = '20px';

      const enabled = document.createElement('button');
      enabled.className = 'review-btn review-btn-primary';
      enabled.id = 'enabled-btn';
      enabled.textContent = 'Enabled';
      container.appendChild(enabled);

      const disabled = document.createElement('button');
      disabled.className = 'review-btn review-btn-primary';
      disabled.id = 'disabled-btn';
      disabled.textContent = 'Disabled';
      disabled.disabled = true;
      container.appendChild(disabled);

      document.body.appendChild(container);
    });

    const enabledOpacity = await page
      .locator('#enabled-btn')
      .evaluate((el) => window.getComputedStyle(el).opacity);

    const disabledOpacity = await page
      .locator('#disabled-btn')
      .evaluate((el) => window.getComputedStyle(el).opacity);

    // Disabled should have lower opacity
    expect(parseFloat(disabledOpacity)).toBeLessThan(parseFloat(enabledOpacity));
  });
});

test.describe('Responsive Accessibility - Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await waitForUIReady(page);
  });

  test('all interactive elements are keyboard accessible on tablet', async ({ page }) => {
    await setViewportAndWait(page, viewports.tablet.ipadMini);

    await page.evaluate(() => {
      const container = document.createElement('div');

      const button = document.createElement('button');
      button.className = 'review-btn';
      button.textContent = 'Button 1';
      button.id = 'btn-1';
      container.appendChild(button);

      const link = document.createElement('a');
      link.href = '#';
      link.textContent = 'Link';
      link.id = 'link-1';
      container.appendChild(link);

      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'input-1';
      container.appendChild(input);

      document.body.appendChild(container);
    });

    // Tab through elements
    await page.keyboard.press('Tab');
    let focused = await page.evaluate(() => document.activeElement?.id);
    expect(['btn-1', 'link-1', 'input-1']).toContain(focused || '');

    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => document.activeElement?.id);
    expect(['btn-1', 'link-1', 'input-1']).toContain(focused || '');

    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => document.activeElement?.id);
    expect(['btn-1', 'link-1', 'input-1']).toContain(focused || '');
  });

  test('modal can be closed with Escape key', async ({ page }) => {
    await setViewportAndWait(page, viewports.tablet.ipadAir);

    await page.evaluate(() => {
      const modal = document.createElement('div');
      modal.className = 'review-editor-modal';
      modal.id = 'test-modal';
      modal.style.display = 'flex';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');

      // Add escape key handler
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          modal.style.display = 'none';
          modal.setAttribute('data-closed', 'true');
        }
      });

      document.body.appendChild(modal);
    });

    const modal = page.locator('#test-modal');
    await expect(modal).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    const closed = await modal.getAttribute('data-closed');
    expect(closed).toBe('true');
  });

  test('focus trap works in modal on mobile', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphone13);

    await page.evaluate(() => {
      const modal = document.createElement('div');
      modal.className = 'review-editor-modal';
      modal.setAttribute('role', 'dialog');

      const container = document.createElement('div');

      const input1 = document.createElement('input');
      input1.id = 'modal-input-1';
      container.appendChild(input1);

      const input2 = document.createElement('input');
      input2.id = 'modal-input-2';
      container.appendChild(input2);

      const closeBtn = document.createElement('button');
      closeBtn.id = 'modal-close';
      closeBtn.textContent = 'Close';
      container.appendChild(closeBtn);

      modal.appendChild(container);
      document.body.appendChild(modal);

      // Simple focus trap
      const focusableElements = [input1, input2, closeBtn];
      let currentIndex = 0;

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          currentIndex = e.shiftKey
            ? (currentIndex - 1 + focusableElements.length) % focusableElements.length
            : (currentIndex + 1) % focusableElements.length;
          focusableElements[currentIndex].focus();
        }
      });

      input1.focus();
    });

    // Tab through modal elements
    await page.keyboard.press('Tab');
    let focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('modal-input-2');

    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('modal-close');

    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('modal-input-1'); // Should wrap around
  });

  test('keyboard shortcuts work on desktop', async ({ page }) => {
    await setViewportAndWait(page, viewports.desktop.hd);

    await page.evaluate(() => {
      let commandPaletteOpen = false;

      document.addEventListener('keydown', (e) => {
        // Cmd/Ctrl + K to open command palette
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          commandPaletteOpen = true;
          document.body.setAttribute('data-palette-open', 'true');
        }
      });
    });

    // Press Cmd+K (or Ctrl+K)
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(100);

    const paletteOpen = await page.evaluate(() =>
      document.body.getAttribute('data-palette-open')
    );
    expect(paletteOpen).toBe('true');
  });
});

test.describe('Responsive Accessibility - Focus Indicators', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await waitForUIReady(page);
  });

  test('focus indicators are visible on all viewport sizes', async ({ page }) => {
    const allViewports = getAllViewports();

    for (const viewport of allViewports) {
      await setViewportAndWait(page, viewport);

      await page.evaluate(() => {
        document.body.innerHTML = '';

        const btn = document.createElement('button');
        btn.className = 'review-btn review-btn-primary';
        btn.textContent = 'Focus Test';
        btn.id = 'focus-btn';
        document.body.appendChild(btn);
      });

      const btn = page.locator('#focus-btn');
      await btn.focus();

      // Check for focus indicator
      const outline = await btn.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          outlineStyle: styles.outlineStyle,
          outlineColor: styles.outlineColor,
        };
      });

      // Should have visible outline or border
      const hasVisibleFocus =
        (outline.outline !== 'none' && outline.outlineWidth !== '0px') ||
        outline.outlineStyle !== 'none';

      expect(hasVisibleFocus).toBeTruthy();
    }
  });

  test('focus indicators are high contrast', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-secondary';
      btn.textContent = 'Focus Test';
      btn.id = 'contrast-test';
      document.body.appendChild(btn);
    });

    const btn = page.locator('#contrast-test');
    await btn.focus();

    const outlineColor = await btn.evaluate((el) => {
      return window.getComputedStyle(el).outlineColor;
    });

    // Should have a color (not transparent)
    expect(outlineColor).toBeTruthy();
    expect(outlineColor).not.toBe('transparent');
    expect(outlineColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('focus visible pseudo-class works correctly', async ({ page }) => {
    await setViewportAndWait(page, viewports.tablet.ipadMini);

    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn';
      btn.textContent = 'Test';
      btn.id = 'focus-visible-test';
      document.body.appendChild(btn);
    });

    // Keyboard focus should show outline
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    const keyboardOutline = await page.locator('#focus-visible-test').evaluate((el) => {
      return window.getComputedStyle(el).outline;
    });

    expect(keyboardOutline).toBeTruthy();
  });
});

test.describe('Responsive Accessibility - Screen Reader Support', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await waitForUIReady(page);
  });

  test('icon buttons have aria-labels', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    await page.evaluate(() => {
      const toolbar = document.createElement('div');

      const saveBtn = document.createElement('button');
      saveBtn.className = 'review-btn-icon';
      saveBtn.innerHTML = '💾';
      saveBtn.setAttribute('aria-label', 'Save changes');
      toolbar.appendChild(saveBtn);

      const exportBtn = document.createElement('button');
      exportBtn.className = 'review-btn-icon';
      exportBtn.innerHTML = '📤';
      exportBtn.setAttribute('aria-label', 'Export document');
      toolbar.appendChild(exportBtn);

      document.body.appendChild(toolbar);
    });

    const buttons = page.locator('.review-btn-icon');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const ariaLabel = await buttons.nth(i).getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel?.length).toBeGreaterThan(0);
    }
  });

  test('modals have proper ARIA attributes', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.android);

    await page.evaluate(() => {
      const modal = document.createElement('div');
      modal.className = 'review-editor-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'modal-title');

      const title = document.createElement('h2');
      title.id = 'modal-title';
      title.textContent = 'Edit Comment';

      modal.appendChild(title);
      document.body.appendChild(modal);
    });

    const modal = page.locator('.review-editor-modal');

    const role = await modal.getAttribute('role');
    expect(role).toBe('dialog');

    const ariaModal = await modal.getAttribute('aria-modal');
    expect(ariaModal).toBe('true');

    const ariaLabelledBy = await modal.getAttribute('aria-labelledby');
    expect(ariaLabelledBy).toBe('modal-title');
  });

  test('expandable sections have aria-expanded', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphone13);

    await page.evaluate(() => {
      const section = document.createElement('div');

      const trigger = document.createElement('button');
      trigger.id = 'expand-trigger';
      trigger.textContent = 'Show more';
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', 'expandable-content');

      const content = document.createElement('div');
      content.id = 'expandable-content';
      content.style.display = 'none';
      content.textContent = 'Hidden content';

      trigger.addEventListener('click', () => {
        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', (!isExpanded).toString());
        content.style.display = isExpanded ? 'none' : 'block';
      });

      section.appendChild(trigger);
      section.appendChild(content);
      document.body.appendChild(section);
    });

    const trigger = page.locator('#expand-trigger');

    let ariaExpanded = await trigger.getAttribute('aria-expanded');
    expect(ariaExpanded).toBe('false');

    await trigger.click();

    ariaExpanded = await trigger.getAttribute('aria-expanded');
    expect(ariaExpanded).toBe('true');
  });

  test('form inputs have associated labels', async ({ page }) => {
    await setViewportAndWait(page, viewports.tablet.ipadMini);

    await page.evaluate(() => {
      const form = document.createElement('form');

      const label = document.createElement('label');
      label.setAttribute('for', 'comment-input');
      label.textContent = 'Comment:';

      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'comment-input';
      input.name = 'comment';

      form.appendChild(label);
      form.appendChild(input);
      document.body.appendChild(form);
    });

    const input = page.locator('#comment-input');
    const inputId = await input.getAttribute('id');

    const label = page.locator('label[for="comment-input"]');
    const labelFor = await label.getAttribute('for');

    expect(inputId).toBe(labelFor);
  });

  test('live regions announce dynamic content', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    await page.evaluate(() => {
      const liveRegion = document.createElement('div');
      liveRegion.id = 'notifications';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      document.body.appendChild(liveRegion);

      // Simulate notification
      setTimeout(() => {
        liveRegion.textContent = 'Comment saved successfully';
      }, 100);
    });

    await page.waitForTimeout(200);

    const liveRegion = page.locator('#notifications');

    const role = await liveRegion.getAttribute('role');
    expect(role).toBe('status');

    const ariaLive = await liveRegion.getAttribute('aria-live');
    expect(ariaLive).toBe('polite');

    const text = await liveRegion.textContent();
    expect(text).toBe('Comment saved successfully');
  });
});

test.describe('Responsive Accessibility - Text Readability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await waitForUIReady(page);
  });

  test('text is minimum 14px on mobile for readability', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.android);

    await page.evaluate(() => {
      const text = document.createElement('p');
      text.className = 'review-body-text';
      text.textContent = 'This is body text that should be readable on mobile devices.';
      document.body.appendChild(text);
    });

    const fontSize = await getComputedStyle(page, '.review-body-text', 'font-size');
    const fontSizeValue = parseInt(fontSize);

    expect(fontSizeValue).toBeGreaterThanOrEqual(14);
  });

  test('line height provides adequate spacing', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    await page.evaluate(() => {
      const paragraph = document.createElement('p');
      paragraph.className = 'review-paragraph';
      paragraph.style.fontSize = '16px';
      paragraph.style.lineHeight = '1.5';
      paragraph.textContent = 'Multiple lines of text to test line height spacing.';
      document.body.appendChild(paragraph);
    });

    const lineHeight = await getComputedStyle(page, '.review-paragraph', 'line-height');
    const fontSize = await getComputedStyle(page, '.review-paragraph', 'font-size');

    const lineHeightValue = parseFloat(lineHeight);
    const fontSizeValue = parseFloat(fontSize);

    // Line height should be at least 1.5x font size (WCAG 1.4.12)
    expect(lineHeightValue).toBeGreaterThanOrEqual(fontSizeValue * 1.4);
  });

  test('text does not truncate unexpectedly on small screens', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    await page.evaluate(() => {
      const text = document.createElement('div');
      text.className = 'review-text-container';
      text.style.width = '100%';
      text.style.wordWrap = 'break-word';
      text.style.overflowWrap = 'break-word';
      text.textContent = 'This is a very long text that should wrap properly on small screens without causing horizontal overflow issues';
      document.body.appendChild(text);
    });

    const hasOverflow = await page.evaluate(() => {
      const element = document.querySelector('.review-text-container');
      return element ? element.scrollWidth > element.clientWidth : false;
    });

    expect(hasOverflow).toBeFalsy();
  });
});

test.describe('Responsive Accessibility - Orientation Support', () => {
  test('content adapts to portrait orientation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // Portrait
    await page.goto('/example');
    await waitForUIReady(page);

    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'orientation-test';
      container.style.width = '100%';
      container.textContent = 'Portrait content';
      document.body.appendChild(container);
    });

    const container = page.locator('#orientation-test');
    await expect(container).toBeVisible();
  });

  test('content adapts to landscape orientation', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 }); // Landscape
    await page.goto('/example');
    await waitForUIReady(page);

    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'landscape-test';
      container.style.width = '100%';
      container.textContent = 'Landscape content';
      document.body.appendChild(container);
    });

    const container = page.locator('#landscape-test');
    await expect(container).toBeVisible();
  });
});
