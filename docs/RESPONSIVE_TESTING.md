# Responsive Testing Guide

Comprehensive guide for automated responsive interface testing in the Quarto Review Extension.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Viewport Configurations](#viewport-configurations)
- [Running Tests](#running-tests)
- [Test Suites](#test-suites)
- [Visual Regression Testing](#visual-regression-testing)
- [Mobile Interactions](#mobile-interactions)
- [Accessibility Testing](#accessibility-testing)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

The responsive testing framework ensures the Quarto Review Extension UI works correctly across:
- **Mobile devices**: iPhone SE (375×667), iPhone 13 (390×844), Android Pixel (360×740)
- **Tablets**: iPad Mini (768×1024), iPad Air (820×1180)
- **Desktops**: HD (1280×720), Full HD (1920×1080)

All tests are automated using Playwright and run on every pull request.

## Prerequisites

Before running responsive tests locally, ensure you have:

1. **Quarto installed** - [Download and install Quarto](https://quarto.org/docs/get-started/)
2. **Node.js dependencies installed** - Run `npm ci`
3. **Playwright browsers installed** - Run `npx playwright install --with-deps chromium`
4. **Extension built** - Run `npm run build` to build the extension
5. **Example rendered** - Run `quarto render example/` to create the test page

**Quick setup:**
```bash
# One-time setup
npm ci
npx playwright install --with-deps chromium

# Before running tests (whenever code changes)
npm run build
quarto render example/
```

**Note:** In CI/CD, these steps are automated. The GitHub Actions workflow automatically installs Quarto, builds the extension, and renders the example before running E2E tests.

## Test Structure

```
tests/e2e/
├── helpers/
│   └── responsive-utils.ts          # Shared viewport utilities
├── responsive-ui.spec.ts             # Layout & component behavior
├── visual-responsive.spec.ts         # Screenshot comparisons
├── mobile-interactions.spec.ts       # Touch & mobile-specific
└── responsive-accessibility.spec.ts  # A11y at different viewports
```

## Viewport Configurations

Viewports are defined in `tests/e2e/helpers/responsive-utils.ts`:

```typescript
import { viewports } from './helpers/responsive-utils';

// Use predefined viewports
viewports.mobile.iphoneSE;    // { width: 375, height: 667, name: 'iPhone SE' }
viewports.tablet.ipadMini;    // { width: 768, height: 1024, name: 'iPad Mini' }
viewports.desktop.hd;         // { width: 1280, height: 720, name: 'HD' }
```

### Helper Functions

```typescript
// Get all viewports
const allViewports = getAllViewports();

// Get mobile-only viewports
const mobileViewports = getMobileViewports();

// Set viewport and wait for layout to stabilize
await setViewportAndWait(page, viewports.mobile.iphoneSE);

// Check if element is in viewport
const isVisible = await isInViewport(page, '.review-toolbar');

// Check touch target size (WCAG 2.5.5)
const meetsWCAG = await meetsTouchTargetSize(page, '#button', 44);
```

## Running Tests

### Local Development

```bash
# Run all E2E tests (including responsive tests)
npm run test:e2e

# Run with visible browser
npm run test:e2e -- --headed

# Run specific test file
npm run test:e2e -- responsive-ui.spec.ts

# Run in debug mode
npm run test:e2e -- --debug

# Run with UI mode (recommended for development)
npm run test:e2e -- --ui
```

### Run Specific Test Suites

```bash
# Responsive UI tests only
npm run test:e2e -- responsive-ui

# Visual regression tests only
npm run test:e2e -- visual-responsive

# Mobile interactions only
npm run test:e2e -- mobile-interactions

# Accessibility tests only
npm run test:e2e -- responsive-accessibility
```

### Update Visual Baselines

When you intentionally change the UI, update screenshot baselines:

```bash
npm run test:e2e -- --update-snapshots
```

## Test Suites

### 1. Responsive UI Tests (`responsive-ui.spec.ts`)

Tests layout changes and component behavior across viewports.

**What it tests:**
- BottomDrawer visibility and expand/collapse
- Toolbar positioning (centered on mobile, fixed on desktop)
- Editor modal sizing and layout
- Command palette responsive behavior
- Search panel mobile adaptations
- Sidebar width constraints
- Button visibility across viewports
- Layout transitions between breakpoints
- No horizontal overflow

**Example test:**
```typescript
test('toolbar is centered on mobile viewports', async ({ page }) => {
  await setViewportAndWait(page, viewports.mobile.iphoneSE);

  const dimensions = await getElementDimensions(page, '.review-toolbar');
  const leftMargin = dimensions.left;
  const rightMargin = viewport.width - dimensions.right;

  // Margins should be similar (centered)
  expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(50);
});
```

### 2. Visual Regression Tests (`visual-responsive.spec.ts`)

Uses screenshot comparison to detect unintended visual changes.

**What it tests:**
- Full page screenshots at each viewport
- Component-specific screenshots (toolbar, drawer, buttons, etc.)
- Button states (hover, disabled, active)
- Modal backdrop opacity
- Layout transitions between viewports

**Example test:**
```typescript
test('renders correctly on iPhone SE', async ({ page }) => {
  await setViewportAndWait(page, viewports.mobile.iphoneSE);
  await page.goto('/example');
  await waitForUIReady(page);

  await expect(page).toHaveScreenshot('example-iphone-se.png', {
    fullPage: true,
    maxDiffPixels: 100, // Allow small antialiasing differences
  });
});
```

### 3. Mobile Interactions Tests (`mobile-interactions.spec.ts`)

Tests touch gestures and mobile-specific behaviors.

**What it tests:**
- Tap interactions on buttons
- Swipe gestures (drawer expand, sidebar dismiss)
- Long press for context menus
- Virtual keyboard handling
- iOS zoom prevention (16px font size)
- Viewport stability on input focus
- Touch target sizes (44×44px minimum)
- Scroll behavior (momentum scrolling)
- Sticky positioning during scroll

**Example test:**
```typescript
test('drawer can be swiped up to expand', async ({ page }) => {
  await setViewportAndWait(page, viewports.mobile.iphone13);

  const initialHeight = await drawer.evaluate(el => el.offsetHeight);

  // Swipe up
  await swipe(page, '#swipe-drawer', 'up', 100);
  await page.waitForTimeout(400);

  const expandedHeight = await drawer.evaluate(el => el.offsetHeight);
  expect(expandedHeight).toBeGreaterThan(initialHeight);
});
```

### 4. Responsive Accessibility Tests (`responsive-accessibility.spec.ts`)

Ensures WCAG 2.1 AA compliance across all viewports.

**What it tests:**
- Touch target sizes (WCAG 2.5.5: 44×44px minimum)
- Color contrast ratios (WCAG 1.4.3)
- Keyboard navigation on tablets
- Focus indicators visibility
- Screen reader support (ARIA attributes)
- Text readability (minimum font sizes)
- Line height spacing (1.5× minimum)
- Orientation support (portrait/landscape)

**Example test:**
```typescript
test('all interactive elements meet 44x44px minimum on mobile', async ({ page }) => {
  await setViewportAndWait(page, viewports.mobile.iphoneSE);

  const failedTargets = await getFailedTouchTargets(page, 44);

  // Should have no failed targets
  expect(failedTargets.length).toBe(0);
});
```

## Visual Regression Testing

### How It Works

1. **First run**: Playwright captures screenshots as baselines
2. **Subsequent runs**: New screenshots are compared against baselines
3. **Failures**: If differences exceed threshold, test fails and diffs are generated

### Screenshot Locations

- **Baselines**: `tests/e2e/**/*.spec.ts-snapshots/`
- **Failed comparisons**: `test-results/`
- **Diff images**: `test-results/**/*-diff.png`

### Updating Baselines

When UI changes are intentional:

```bash
# Update all baselines
npm run test:e2e -- --update-snapshots

# Update specific test file
npm run test:e2e -- visual-responsive --update-snapshots
```

### Best Practices

- **Keep screenshots focused**: Test individual components, not entire pages
- **Allow for antialiasing**: Use `maxDiffPixels: 100` for small rendering differences
- **Review diffs carefully**: Always check diff images before updating baselines
- **Commit baselines**: Check baseline screenshots into git for team consistency

## Mobile Interactions

### Touch Gestures

The framework provides helpers for common mobile gestures:

```typescript
// Tap (single touch)
await tap(page, '#button-id');

// Long press (touch and hold)
await longPress(page, '#element-id', 500); // 500ms duration

// Swipe gestures
await swipe(page, '#drawer', 'up', 100);    // Swipe up 100px
await swipe(page, '#sidebar', 'right', 150); // Swipe right 150px
```

### iOS Zoom Prevention

Ensure inputs have 16px minimum font size to prevent iOS auto-zoom:

```typescript
test('input has 16px font size to prevent iOS zoom', async ({ page }) => {
  const hasZoomPrevention = await hasIOSZoomPrevention(page, '#input');
  expect(hasZoomPrevention).toBeTruthy();
});
```

## Accessibility Testing

### WCAG 2.1 AA Requirements

Our tests verify compliance with:

- **2.5.5 Target Size**: Minimum 44×44px for touch targets
- **1.4.3 Contrast**: 4.5:1 for normal text, 3:1 for large text
- **2.1.1 Keyboard**: All functionality available via keyboard
- **2.4.7 Focus Visible**: Focus indicators clearly visible
- **4.1.2 Name, Role, Value**: Proper ARIA attributes

### Running Accessibility Tests

```bash
# Run all accessibility tests
npm run test:e2e -- responsive-accessibility

# Check touch targets only
npm run test:e2e -- responsive-accessibility -g "Touch Target Size"

# Check color contrast only
npm run test:e2e -- responsive-accessibility -g "Color Contrast"
```

### Common Failures

1. **Touch targets too small**: Ensure buttons have `min-width: 44px; min-height: 44px`
2. **Missing ARIA labels**: Add `aria-label` to icon-only buttons
3. **Insufficient contrast**: Use design tokens for consistent colors
4. **No focus indicators**: Ensure `:focus-visible` styles are defined

## CI/CD Integration

### GitHub Actions

E2E tests run automatically on every pull request:

```yaml
e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  steps:
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps chromium

    - name: Run Playwright tests
      run: npm run test:e2e

    - name: Upload visual diff screenshots
      uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: visual-diffs
        path: tests/e2e/**/*-diff.png
```

### Viewing Failed Tests in CI

When tests fail in CI:

1. Go to the failed GitHub Action run
2. Scroll to the **Artifacts** section
3. Download:
   - `playwright-results`: Full HTML test report
   - `visual-diffs`: Screenshot comparison diffs
   - `screenshot-failures`: All failed test screenshots

### Retries

Tests automatically retry up to 2 times in CI to handle flakiness:

```typescript
// playwright.config.ts
retries: process.env.CI ? 2 : 0,
```

## Troubleshooting

### Web Server Timeout Error

**Problem**: `Error: Timed out waiting 60000ms from config.webServer`

**Cause**: The example hasn't been rendered, so `example/_output/` doesn't exist.

**Solution**:
```bash
# Build the extension first
npm run build

# Render the example to create example/_output/
quarto render example/

# Now run tests
npm run test:e2e
```

### Tests are Flaky

**Problem**: Tests pass locally but fail in CI

**Solutions**:
- Use `waitForUIReady()` to ensure full page load
- Increase timeouts for slow CI environments
- Use `setViewportAndWait()` instead of raw `setViewportSize()`
- Add explicit waits after animations: `await page.waitForTimeout(300)`

### Screenshot Differences

**Problem**: Visual tests fail with small differences

**Solutions**:
- Increase `maxDiffPixels` threshold
- Ensure consistent fonts across environments
- Disable animations during screenshots
- Use `waitForTimeout()` after layout changes

### Touch Gestures Not Working

**Problem**: Swipe/tap tests fail

**Solutions**:
- Ensure element has `touch-action: none` for custom gestures
- Check element is visible and has dimensions
- Use `boundingBox()` to verify element position
- Add delays between gesture steps

### Accessibility Failures

**Problem**: Touch targets or contrast tests fail

**Solutions**:
- Use CSS custom properties for colors (design tokens)
- Set `min-width` and `min-height` on interactive elements
- Add proper ARIA labels to icon buttons
- Test with actual assistive technologies

### Performance Issues

**Problem**: Tests run slowly

**Solutions**:
- Use `workers: 1` to avoid parallel execution issues
- Run only changed test files during development
- Use `--headed` mode sparingly (slower than headless)
- Skip visual regression tests during rapid iteration

## Writing New Tests

### Test Template

```typescript
import { test, expect } from '@playwright/test';
import {
  viewports,
  setViewportAndWait,
  waitForUIReady,
} from './helpers/responsive-utils';

test.describe('My Feature - Responsive', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await waitForUIReady(page);
  });

  test('works on mobile', async ({ page }) => {
    await setViewportAndWait(page, viewports.mobile.iphoneSE);

    // Your test logic here
    const element = page.locator('.my-element');
    await expect(element).toBeVisible();
  });

  test('works on tablet', async ({ page }) => {
    await setViewportAndWait(page, viewports.tablet.ipadMini);

    // Your test logic here
  });
});
```

### Best Practices

1. **Use helper functions**: Don't reinvent viewport switching or gesture logic
2. **Test multiple viewports**: Cover at least mobile, tablet, and desktop
3. **Be specific with selectors**: Use IDs or data-testid attributes
4. **Wait for stability**: Always use `waitForUIReady()` after navigation
5. **Document intent**: Add comments explaining what you're testing
6. **Group related tests**: Use `test.describe()` for logical grouping
7. **Clean up**: Reset state in `beforeEach` hooks

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Mobile Touch Guidelines](https://developer.apple.com/design/human-interface-guidelines/inputs)
- [Responsive Design Best Practices](https://web.dev/responsive-web-design-basics/)

## Contributing

When adding new UI components:

1. Add responsive tests to `responsive-ui.spec.ts`
2. Add visual regression tests to `visual-responsive.spec.ts`
3. If touch-interactive, add tests to `mobile-interactions.spec.ts`
4. Verify accessibility in `responsive-accessibility.spec.ts`
5. Update this documentation with new test patterns

## Support

For questions or issues:

- Check existing tests for examples
- Review helper function documentation in `responsive-utils.ts`
- File an issue with:
  - Test file and line number
  - Expected vs actual behavior
  - Screenshots or error messages
