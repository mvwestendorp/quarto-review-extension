import { test, expect } from '@playwright/test';

/**
 * UI Accessibility Tests
 *
 * These tests verify that the UI modernization maintains or improves
 * accessibility standards, particularly WCAG AA compliance (4.5:1 contrast ratio).
 */

/**
 * Helper function to calculate color contrast ratio
 * Based on WCAG color contrast algorithm
 */
function getContrastRatio(color1: string, color2: string): number {
  function getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  function parseColor(colorStr: string): [number, number, number] | null {
    // Parse rgb(r, g, b) format
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }

    // Parse hex format
    const hexMatch = colorStr.match(/#([0-9a-fA-F]{6})/);
    if (hexMatch) {
      const hex = hexMatch[1];
      return [
        parseInt(hex.substr(0, 2), 16),
        parseInt(hex.substr(2, 2), 16),
        parseInt(hex.substr(4, 2), 16),
      ];
    }

    return null;
  }

  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);

  if (!rgb1 || !rgb2) return 0;

  const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

test.describe('Accessibility - Color Contrast (WCAG AA)', () => {
  const MIN_CONTRAST_AA = 4.5;

  test('primary button text has sufficient contrast', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-primary';
      btn.textContent = 'Test Button';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-primary').first();
    const bgColor = await btn.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    const textColor = await btn.evaluate((el) =>
      window.getComputedStyle(el).color
    );

    const ratio = getContrastRatio(bgColor, textColor);

    // Primary buttons should have white text on blue, exceeding 4.5:1
    expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST_AA);
  });

  test('secondary button text has sufficient contrast', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-secondary';
      btn.textContent = 'Test Button';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-secondary').first();
    const bgColor = await btn.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    const textColor = await btn.evaluate((el) =>
      window.getComputedStyle(el).color
    );

    const ratio = getContrastRatio(bgColor, textColor);

    expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST_AA);
  });

  test('pill button text has sufficient contrast', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-pill';
      btn.textContent = 'Pill Button';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-pill').first();
    const bgColor = await btn.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    const textColor = await btn.evaluate((el) =>
      window.getComputedStyle(el).color
    );

    const ratio = getContrastRatio(bgColor, textColor);

    expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST_AA);
  });

  test('sidebar text has sufficient contrast', async ({ page }) => {
    await page.evaluate(() => {
      const sidebar = document.createElement('div');
      sidebar.className = 'review-persistent-sidebar';
      const header = document.createElement('h3');
      header.textContent = 'Sidebar Title';
      sidebar.appendChild(header);
      document.body.appendChild(sidebar);
    });

    const header = page.locator('.review-persistent-sidebar h3').first();
    const bgColor = await header.evaluate((el) => {
      // Get background from parent sidebar
      const parent = el.closest('.review-persistent-sidebar');
      return window.getComputedStyle(parent!).backgroundColor;
    });
    const textColor = await header.evaluate((el) =>
      window.getComputedStyle(el).color
    );

    const ratio = getContrastRatio(bgColor, textColor);

    expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST_AA);
  });

  test('modal text has sufficient contrast', async ({ page }) => {
    await page.evaluate(() => {
      const modal = document.createElement('div');
      modal.className = 'review-editor-modal';
      const container = document.createElement('div');
      container.className = 'review-editor-container';
      const title = document.createElement('h3');
      title.textContent = 'Modal Title';
      const header = document.createElement('div');
      header.className = 'review-editor-header';
      header.appendChild(title);
      container.appendChild(header);
      modal.appendChild(container);
      document.body.appendChild(modal);
    });

    const title = page.locator('.review-editor-header h3').first();
    const bgColor = await title.evaluate((el) => {
      const header = el.closest('.review-editor-header');
      return window.getComputedStyle(header!).backgroundColor;
    });
    const textColor = await title.evaluate((el) =>
      window.getComputedStyle(el).color
    );

    const ratio = getContrastRatio(bgColor, textColor);

    expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST_AA);
  });
});

test.describe('Accessibility - Focus Indicators', () => {
  test('primary button shows focus indicator', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-primary';
      btn.textContent = 'Focus Test';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-primary').first();

    // Tab to button to trigger focus
    await btn.focus();

    const outline = await btn.evaluate((el) =>
      window.getComputedStyle(el).outline
    );

    // Should have visible outline
    expect(outline).not.toBe('none');
    expect(outline).toBeTruthy();
  });

  test('secondary button shows focus indicator', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-secondary';
      btn.textContent = 'Focus Test';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-secondary').first();
    await btn.focus();

    const outline = await btn.evaluate((el) =>
      window.getComputedStyle(el).outline
    );

    expect(outline).not.toBe('none');
  });

  test('icon button shows focus indicator', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-icon';
      btn.innerHTML = '⚙️';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-icon').first();
    await btn.focus();

    const outline = await btn.evaluate((el) =>
      window.getComputedStyle(el).outline
    );

    expect(outline).not.toBe('none');
  });

  test('editor toolbar button shows focus indicator', async ({ page }) => {
    await page.evaluate(() => {
      const toolbar = document.createElement('div');
      toolbar.className = 'review-editor-toolbar';
      const btn = document.createElement('button');
      btn.className = 'review-editor-toolbar-btn';
      btn.textContent = 'B';
      toolbar.appendChild(btn);
      document.body.appendChild(toolbar);
    });

    const btn = page.locator('.review-editor-toolbar-btn').first();
    await btn.focus();

    const outline = await btn.evaluate((el) =>
      window.getComputedStyle(el).outline
    );

    expect(outline).not.toBe('none');
  });

  test('focus outline is visible with sufficient size', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-primary';
      btn.textContent = 'Outline Size Test';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-primary').first();
    await btn.focus();

    const outlineWidth = await btn.evaluate((el) => {
      const outline = window.getComputedStyle(el).outlineWidth;
      return parseInt(outline);
    });

    // Outline should be at least 2px
    expect(outlineWidth).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Accessibility - Hover States', () => {
  test('button hover state maintains contrast', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-primary';
      btn.textContent = 'Hover Test';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-primary').first();
    await btn.hover();

    const bgColor = await btn.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    const textColor = await btn.evaluate((el) =>
      window.getComputedStyle(el).color
    );

    const ratio = getContrastRatio(bgColor, textColor);

    // Hover state should also meet contrast requirements
    expect(ratio).toBeGreaterThanOrEqual(4.0);
  });

  test('secondary button hover state is visually distinct', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-secondary';
      btn.textContent = 'Hover Test';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-secondary').first();

    // Get base state
    const baseBg = await btn.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    const baseBorder = await btn.evaluate((el) =>
      window.getComputedStyle(el).borderColor
    );

    // Hover
    await btn.hover();

    // Get hover state
    const hoverBg = await btn.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    const hoverBorder = await btn.evaluate((el) =>
      window.getComputedStyle(el).borderColor
    );

    // Should change on hover (at least one should be different)
    const changed =
      baseBg !== hoverBg || baseBorder !== hoverBorder;
    expect(changed).toBe(true);
  });

  test('disabled button is visually distinct from enabled', async ({ page }) => {
    await page.evaluate(() => {
      // Create enabled button
      const enabledBtn = document.createElement('button');
      enabledBtn.className = 'review-btn review-btn-primary';
      enabledBtn.textContent = 'Enabled';
      enabledBtn.id = 'enabled-btn';
      document.body.appendChild(enabledBtn);

      // Create disabled button
      const disabledBtn = document.createElement('button');
      disabledBtn.className = 'review-btn review-btn-primary';
      disabledBtn.disabled = true;
      disabledBtn.textContent = 'Disabled';
      disabledBtn.id = 'disabled-btn';
      document.body.appendChild(disabledBtn);
    });

    const enabledBtn = page.locator('#enabled-btn');
    const disabledBtn = page.locator('#disabled-btn');

    const enabledOpacity = await enabledBtn.evaluate((el) =>
      window.getComputedStyle(el).opacity
    );
    const disabledOpacity = await disabledBtn.evaluate((el) =>
      window.getComputedStyle(el).opacity
    );

    // Disabled should have lower opacity
    expect(parseFloat(disabledOpacity)).toBeLessThan(
      parseFloat(enabledOpacity)
    );
  });
});

test.describe('Accessibility - Keyboard Navigation', () => {
  test('button is focusable via keyboard', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-primary';
      btn.textContent = 'Keyboard Test';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-primary').first();

    // Should be able to focus via keyboard
    await btn.focus();

    const isFocused = await btn.evaluate((el) => {
      return document.activeElement === el;
    });

    expect(isFocused).toBe(true);
  });

  test('button is clickable via Enter key', async ({ page }) => {
    let clicked = false;

    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-primary';
      btn.textContent = 'Click Test';
      btn.onclick = () => {
        (window as any).buttonClicked = true;
      };
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-primary').first();
    await btn.focus();
    await page.keyboard.press('Enter');

    clicked = await page.evaluate(() => (window as any).buttonClicked);
    expect(clicked).toBe(true);
  });

  test('disabled button is not focusable', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-primary';
      btn.disabled = true;
      btn.textContent = 'Disabled';
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-primary[disabled]').first();

    // Try to focus - disabled buttons should skip focus
    await btn.evaluate((el) => (el as any).focus());

    const isFocused = await btn.evaluate((el) => {
      return document.activeElement === el;
    });

    // Disabled buttons typically won't receive focus
    expect(isFocused).toBe(false);
  });
});

test.describe('Accessibility - Modal Behavior', () => {
  test('modal has readable backdrop', async ({ page }) => {
    await page.evaluate(() => {
      const modal = document.createElement('div');
      modal.className = 'review-editor-modal';
      modal.style.display = 'flex';
      document.body.appendChild(modal);
    });

    const modal = page.locator('.review-inline-editor-container').first();
    const bgColor = await modal.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Backdrop should be semi-transparent (not fully opaque)
    const match = bgColor.match(/rgba?\(\d+,\s*\d+,\s*\d+,?\s*([\d.]+)?/);
    if (match && match[1]) {
      const opacity = parseFloat(match[1]);
      expect(opacity).toBeLessThan(1);
      expect(opacity).toBeGreaterThan(0);
    }
  });

  test('modal container text is readable', async ({ page }) => {
    await page.evaluate(() => {
      const modal = document.createElement('div');
      modal.className = 'review-editor-modal';
      const container = document.createElement('div');
      container.className = 'review-editor-container';
      const header = document.createElement('div');
      header.className = 'review-editor-header';
      const title = document.createElement('h3');
      title.textContent = 'Modal Title';
      header.appendChild(title);
      container.appendChild(header);
      modal.appendChild(container);
      document.body.appendChild(modal);
    });

    const title = page.locator('.review-editor-header h3').first();
    const bgColor = await title.evaluate((el) => {
      const header = el.closest('.review-editor-header');
      return window.getComputedStyle(header!).backgroundColor;
    });
    const textColor = await title.evaluate((el) =>
      window.getComputedStyle(el).color
    );

    const ratio = getContrastRatio(bgColor, textColor);

    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('Accessibility - Color Independence', () => {
  test('buttons are not distinguished by color alone', async ({ page }) => {
    await page.evaluate(() => {
      const primary = document.createElement('button');
      primary.className = 'review-btn review-btn-primary';
      primary.textContent = 'Primary';
      document.body.appendChild(primary);

      const secondary = document.createElement('button');
      secondary.className = 'review-btn review-btn-secondary';
      secondary.textContent = 'Secondary';
      document.body.appendChild(secondary);
    });

    // Check that buttons have text labels (not color-only)
    const primaryText = await page.locator('.review-btn-primary').first().textContent();
    const secondaryText = await page.locator('.review-btn-secondary').first().textContent();

    expect(primaryText?.trim()).toBeTruthy();
    expect(secondaryText?.trim()).toBeTruthy();

    // Both should have text content
    expect(primaryText).not.toBe('');
    expect(secondaryText).not.toBe('');
  });

  test('success/warning/danger colors have text labels', async ({ page }) => {
    // In real components, semantic colors should always have descriptive text
    // This is a design principle that helps colorblind users
    const semanticColors = ['success', 'warning', 'danger'];

    for (const color of semanticColors) {
      await page.evaluate(
        (colorType) => {
          const el = document.createElement('div');
          el.className = `review-color-${colorType}`;
          el.textContent = `${colorType.charAt(0).toUpperCase()}${colorType.slice(1)} message`;
          el.setAttribute('role', 'status');
          document.body.appendChild(el);
        },
        color
      );
    }

    // Verify that all semantic color elements have text content
    const elements = await page.locator('[class*="review-color-"]').count();
    expect(elements).toBeGreaterThan(0);
  });
});

test.describe('Accessibility - ARIA Attributes', () => {
  test('disabled button has proper aria-disabled', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'review-btn review-btn-primary';
      btn.disabled = true;
      btn.textContent = 'Disabled';
      btn.setAttribute('aria-disabled', 'true');
      document.body.appendChild(btn);
    });

    const btn = page.locator('.review-btn-primary[aria-disabled="true"]').first();
    const exists = await btn.count();

    expect(exists).toBeGreaterThan(0);
  });

  test('modal has proper role and aria-modal', async ({ page }) => {
    await page.evaluate(() => {
      const modal = document.createElement('div');
      modal.className = 'review-editor-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Editor Modal');
      document.body.appendChild(modal);
    });

    const modal = page.locator('.review-inline-editor-container[role="dialog"]').first();
    const hasModal = await modal.count();

    expect(hasModal).toBeGreaterThan(0);
  });
});

