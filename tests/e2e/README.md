# E2E Testing Suite

End-to-end tests for the Quarto Review Extension using Playwright.

## Prerequisites

Before running E2E tests, you need:

1. **Quarto installed** - [Install Quarto](https://quarto.org/docs/get-started/)
2. **Extension built** - Run `npm run build`
3. **Example rendered** - Run `quarto render example/`

## Quick Start

```bash
# Install dependencies (first time only)
npm ci
npx playwright install --with-deps chromium

# Build the extension
npm run build

# Render the example (creates example/_output/)
quarto render example/

# Run all E2E tests
npm run test:e2e

# Run with UI mode (recommended for development)
npm run test:e2e -- --ui

# Run specific test file
npm run test:e2e -- responsive-ui.spec.ts

# Update visual baselines
npm run test:e2e -- --update-snapshots

# Run only smoke tests
npm run test:e2e -- smoke-review.spec.ts
```

## CI Testing Strategy

To optimize CI performance, tests are split into two tiers:

### 🔥 Smoke Tests (Every Commit)
- **Runs on**: Every push to main/develop
- **Condition**: Only if UI files changed (src/, _extensions/, example/)
- **Duration**: ~30 seconds
- **Tests**: `smoke-review.spec.ts` - Basic UI rendering validation
- **Purpose**: Fast feedback on critical UI breakage

### 🧪 Full E2E Suite (Pull Requests Only)
- **Runs on**: Pull requests only
- **Condition**: Only if UI/test files changed
- **Duration**: ~5-10 minutes
- **Tests**: All E2E tests including responsive suite
- **Purpose**: Comprehensive validation before merge
- **Includes**:
  - All core E2E tests
  - Full responsive testing suite
  - Visual regression tests
  - Mobile interaction tests
  - Accessibility compliance tests

### 💾 Caching
The full E2E job uses caching to speed up execution:
- Playwright browser binaries cached
- R packages cached
- Reused between runs when dependencies don't change

### 🎯 Conditional Execution
Tests only run when relevant files change:
- `src/**/*.{ts,css}` - Source code
- `_extensions/**/*.{css,js}` - Extension assets
- `example/**/*.qmd` - Example files
- `tests/e2e/**/*` - Test files themselves

**Benefits:**
- ⚡ 90% reduction in CI time for non-UI changes
- 🎯 Tests only run when needed
- 💰 Lower CI costs
- 🚀 Faster developer feedback

## Test Files

### Core Tests
- `example-end-to-end.spec.ts` - Full workflow testing
- `integration-workflow.spec.ts` - Integration scenarios
- `multi-page-persistence.spec.ts` - Multi-page state persistence
- `multi-page-export.spec.ts` - Export across pages
- `ui-regression.spec.ts` - UI visual regression tests
- `ui-accessibility.spec.ts` - Accessibility verification
- `export-clean-parity.spec.ts` - Clean export testing
- `export-critic-parity.spec.ts` - CriticMarkup export testing
- `smoke-review.spec.ts` - Basic smoke test

### Responsive Tests (New!)
- **`responsive-ui.spec.ts`** - Layout and component behavior across viewports
- **`visual-responsive.spec.ts`** - Screenshot comparison for responsive layouts
- **`mobile-interactions.spec.ts`** - Touch gestures and mobile-specific behaviors
- **`responsive-accessibility.spec.ts`** - WCAG 2.1 AA compliance testing

### Helper Utilities
- `helpers/responsive-utils.ts` - Viewport configurations and helper functions

## Responsive Testing

The responsive test suite ensures the UI works correctly on:
- **Mobile**: iPhone SE, iPhone 13, Android Pixel
- **Tablet**: iPad Mini, iPad Air
- **Desktop**: HD (1280×720), Full HD (1920×1080)

### What's Tested

✅ **Layout Responsiveness**
- BottomDrawer visibility and behavior
- Toolbar positioning (centered on mobile)
- Editor modal sizing
- Command palette adaptations
- Sidebar width constraints
- No horizontal overflow

✅ **Visual Regression**
- Full page screenshots at each viewport
- Component-specific screenshots
- Button states (hover, disabled)
- Modal backdrops
- Layout transitions

✅ **Mobile Interactions**
- Tap/touch interactions
- Swipe gestures (up, down, left, right)
- Long press for context menus
- Virtual keyboard handling
- iOS zoom prevention
- Touch target sizes (44×44px)
- Scroll behavior

✅ **Accessibility (WCAG 2.1 AA)**
- Touch target minimum size (44×44px)
- Color contrast ratios (4.5:1)
- Keyboard navigation
- Focus indicators
- ARIA attributes
- Screen reader support
- Text readability

### Running Responsive Tests

```bash
# Run all responsive tests
npm run test:e2e -- responsive

# Run specific suite
npm run test:e2e -- responsive-ui.spec.ts
npm run test:e2e -- visual-responsive.spec.ts
npm run test:e2e -- mobile-interactions.spec.ts
npm run test:e2e -- responsive-accessibility.spec.ts

# Run with visible browser
npm run test:e2e -- responsive-ui --headed

# Debug mode
npm run test:e2e -- responsive-ui --debug
```

### Using Helper Functions

```typescript
import {
  viewports,
  setViewportAndWait,
  tap,
  swipe,
  meetsTouchTargetSize,
} from './helpers/responsive-utils';

// Set viewport
await setViewportAndWait(page, viewports.mobile.iphoneSE);

// Tap element
await tap(page, '#button-id');

// Swipe gesture
await swipe(page, '#drawer', 'up', 100);

// Check touch target size
const meetsWCAG = await meetsTouchTargetSize(page, '#button', 44);
```

## Visual Regression Testing

### How It Works

1. First run creates baseline screenshots
2. Subsequent runs compare against baselines
3. Failures generate diff images showing changes

### Managing Baselines

```bash
# Update all baselines (after intentional UI changes)
npm run test:e2e -- --update-snapshots

# Update specific test
npm run test:e2e -- visual-responsive --update-snapshots
```

### Screenshot Locations

- **Baselines**: `tests/e2e/**/*.spec.ts-snapshots/`
- **Failures**: `test-results/`
- **Diffs**: `test-results/**/*-diff.png`

## CI/CD Integration

E2E tests run automatically on every pull request:

- All E2E tests execute in GitHub Actions
- Visual diffs uploaded as artifacts on failure
- Test results available in HTML report
- Screenshot failures preserved for 30 days

### Viewing Failed Tests in CI

1. Go to the failed GitHub Action run
2. Download artifacts:
   - `playwright-results` - Full HTML test report
   - `visual-diffs` - Screenshot comparison diffs
   - `screenshot-failures` - Failed test screenshots

## Troubleshooting

### Tests Failing Locally

1. Ensure you have the latest dependencies: `npm ci`
2. Install Playwright browsers: `npx playwright install --with-deps chromium`
3. Clear old test results: `rm -rf test-results/`
4. Update baselines if UI changed: `npm run test:e2e -- --update-snapshots`

### Flaky Tests

- Use `waitForUIReady()` helper after navigation
- Add explicit waits after animations
- Use `setViewportAndWait()` instead of raw viewport changes
- Check for race conditions in async operations

### Screenshot Differences

- Review diff images in `test-results/`
- Increase `maxDiffPixels` threshold if needed
- Ensure consistent fonts across environments
- Disable animations during screenshots

## Documentation

For detailed information, see:
- **[Responsive Testing Guide](../../docs/RESPONSIVE_TESTING.md)** - Complete responsive testing documentation
- **[Playwright Config](../../playwright.config.ts)** - Test configuration
- **[CI Workflow](../../.github/workflows/ci.yml)** - GitHub Actions setup

## Contributing

When adding new UI components:

1. Add responsive behavior tests to `responsive-ui.spec.ts`
2. Add visual regression tests to `visual-responsive.spec.ts`
3. If touch-interactive, add to `mobile-interactions.spec.ts`
4. Verify accessibility in `responsive-accessibility.spec.ts`
5. Update documentation

## Best Practices

1. **Use helper functions** from `responsive-utils.ts`
2. **Test multiple viewports** (mobile, tablet, desktop)
3. **Use specific selectors** (IDs or data-testid)
4. **Wait for stability** with `waitForUIReady()`
5. **Group related tests** with `test.describe()`
6. **Document intent** with clear test names and comments
7. **Clean up state** in `beforeEach` hooks

## Support

For questions or issues:
- Review existing tests for examples
- Check helper function documentation
- File an issue with reproduction steps
