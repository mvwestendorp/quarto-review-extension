import { Page } from '@playwright/test';

/**
 * Viewport Configurations for Responsive Testing
 *
 * Standard viewport sizes covering common device categories:
 * - Mobile: Small and medium smartphones
 * - Tablet: iPad Mini and iPad Air sizes
 * - Desktop: HD and Full HD screens
 */
export const viewports = {
  // Mobile devices
  mobile: {
    iphoneSE: { width: 375, height: 667, name: 'iPhone SE' },
    iphone13: { width: 390, height: 844, name: 'iPhone 13' },
    android: { width: 360, height: 740, name: 'Android (Pixel)' },
  },
  // Tablet devices
  tablet: {
    ipadMini: { width: 768, height: 1024, name: 'iPad Mini' },
    ipadAir: { width: 820, height: 1180, name: 'iPad Air' },
  },
  // Desktop screens
  desktop: {
    hd: { width: 1280, height: 720, name: 'HD (1280x720)' },
    fullHd: { width: 1920, height: 1080, name: 'Full HD (1920x1080)' },
  },
};

/**
 * Get all viewport configurations as a flat array
 */
export function getAllViewports() {
  return [
    ...Object.values(viewports.mobile),
    ...Object.values(viewports.tablet),
    ...Object.values(viewports.desktop),
  ];
}

/**
 * Get mobile viewports only
 */
export function getMobileViewports() {
  return Object.values(viewports.mobile);
}

/**
 * Get tablet viewports only
 */
export function getTabletViewports() {
  return Object.values(viewports.tablet);
}

/**
 * Get desktop viewports only
 */
export function getDesktopViewports() {
  return Object.values(viewports.desktop);
}

/**
 * Helper to set viewport and wait for any layout shifts
 */
export async function setViewportAndWait(
  page: Page,
  viewport: { width: number; height: number }
) {
  await page.setViewportSize(viewport);
  // Wait for any CSS transitions/animations to complete
  await page.waitForTimeout(300);
}

/**
 * Check if an element is visible in the viewport
 */
export async function isInViewport(page: Page, selector: string): Promise<boolean> {
  return await page.locator(selector).evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  });
}

/**
 * Check if element has overflow (scrollable content)
 */
export async function hasOverflow(page: Page, selector: string): Promise<boolean> {
  return await page.locator(selector).evaluate((el) => {
    return el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
  });
}

/**
 * Get computed style property for an element
 */
export async function getComputedStyle(
  page: Page,
  selector: string,
  property: string
): Promise<string> {
  return await page.locator(selector).evaluate(
    (el, prop) => window.getComputedStyle(el).getPropertyValue(prop),
    property
  );
}

/**
 * Get element dimensions
 */
export async function getElementDimensions(page: Page, selector: string) {
  return await page.locator(selector).evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right,
    };
  });
}

/**
 * Check if element meets minimum touch target size (44x44px per WCAG)
 */
export async function meetsTouchTargetSize(
  page: Page,
  selector: string,
  minSize: number = 44
): Promise<boolean> {
  const dimensions = await getElementDimensions(page, selector);
  return dimensions.width >= minSize && dimensions.height >= minSize;
}

/**
 * Get the current breakpoint based on viewport width
 */
export function getBreakpoint(width: number): 'mobile' | 'tablet' | 'desktop' {
  if (width <= 640) return 'mobile';
  if (width <= 768) return 'tablet';
  return 'desktop';
}

/**
 * Simulate touch interaction (tap)
 */
export async function tap(page: Page, selector: string) {
  const element = page.locator(selector);
  await element.tap();
  await page.waitForTimeout(100); // Wait for any tap effects
}

/**
 * Simulate long press (touch and hold)
 */
export async function longPress(page: Page, selector: string, duration: number = 500) {
  const element = page.locator(selector);
  const box = await element.boundingBox();
  if (!box) throw new Error(`Element ${selector} not found`);

  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(duration);
}

/**
 * Simulate swipe gesture
 */
export async function swipe(
  page: Page,
  selector: string,
  direction: 'up' | 'down' | 'left' | 'right',
  distance: number = 100
) {
  const element = page.locator(selector);
  const box = await element.boundingBox();
  if (!box) throw new Error(`Element ${selector} not found`);

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  let endX = startX;
  let endY = startY;

  switch (direction) {
    case 'up':
      endY -= distance;
      break;
    case 'down':
      endY += distance;
      break;
    case 'left':
      endX -= distance;
      break;
    case 'right':
      endX += distance;
      break;
  }

  await page.touchscreen.tap(startX, startY);
  await page.mouse.move(endX, endY);
  await page.waitForTimeout(100);
}

/**
 * Check if iOS zoom prevention is in place (16px min font size)
 */
export async function hasIOSZoomPrevention(
  page: Page,
  inputSelector: string
): Promise<boolean> {
  const fontSize = await getComputedStyle(page, inputSelector, 'font-size');
  const fontSizeValue = parseInt(fontSize);
  return fontSizeValue >= 16;
}

/**
 * Get all elements that fail touch target size requirements
 */
export async function getFailedTouchTargets(
  page: Page,
  minSize: number = 44
): Promise<string[]> {
  return await page.evaluate((size) => {
    const interactiveSelectors = [
      'button',
      'a',
      'input[type="button"]',
      'input[type="submit"]',
      'input[type="checkbox"]',
      'input[type="radio"]',
      '[role="button"]',
      '[onclick]',
    ];

    const failed: string[] = [];

    interactiveSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width < size || rect.height < size) {
          const id = (el as HTMLElement).id;
          const className = (el as HTMLElement).className;
          const identifier = id
            ? `#${id}`
            : className
            ? `.${className.split(' ')[0]}`
            : selector;
          failed.push(identifier);
        }
      });
    });

    return failed;
  }, minSize);
}

/**
 * Create a test helper to wait for UI initialization
 */
export async function waitForUIReady(page: Page) {
  // Wait for common UI elements to be loaded
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // Additional buffer for CSS animations
}

/**
 * Screenshot helper with consistent naming
 */
export async function takeResponsiveScreenshot(
  page: Page,
  name: string,
  viewport: { width: number; height: number; name: string }
) {
  const breakpoint = getBreakpoint(viewport.width);
  const screenshotName = `${name}-${breakpoint}-${viewport.width}x${viewport.height}.png`;
  await page.screenshot({ path: `tests/e2e/screenshots/${screenshotName}`, fullPage: true });
  return screenshotName;
}

/**
 * Check if element layout changed between viewport sizes
 */
export async function detectLayoutChange(
  page: Page,
  selector: string,
  viewport1: { width: number; height: number },
  viewport2: { width: number; height: number }
): Promise<boolean> {
  await setViewportAndWait(page, viewport1);
  const dimensions1 = await getElementDimensions(page, selector);
  const style1 = {
    position: await getComputedStyle(page, selector, 'position'),
    display: await getComputedStyle(page, selector, 'display'),
    flexDirection: await getComputedStyle(page, selector, 'flex-direction'),
  };

  await setViewportAndWait(page, viewport2);
  const dimensions2 = await getElementDimensions(page, selector);
  const style2 = {
    position: await getComputedStyle(page, selector, 'position'),
    display: await getComputedStyle(page, selector, 'display'),
    flexDirection: await getComputedStyle(page, selector, 'flex-direction'),
  };

  // Check if layout properties changed
  return (
    dimensions1.width !== dimensions2.width ||
    dimensions1.height !== dimensions2.height ||
    style1.position !== style2.position ||
    style1.display !== style2.display ||
    style1.flexDirection !== style2.flexDirection
  );
}
