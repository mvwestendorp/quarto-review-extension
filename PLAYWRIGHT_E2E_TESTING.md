# Playwright E2E Testing Guide

This project uses **Playwright** for end-to-end testing. The E2E tests run in a real browser and test actual user workflows including UI interactions, persistence, and multi-page scenarios.

## Quick Start

### Prerequisites
- Node.js 16+ installed
- Project dependencies installed (`npm install`)

### Running E2E Tests

#### Run all E2E tests:
```bash
npm run test:e2e
```

> `npm run test:e2e` now wraps Playwright with `scripts/run-e2e.sh`, which:
> - Ensures Chromium (and its native dependencies) are installed locally.
> - Automatically runs tests under `xvfb-run` when no display is available (e.g., devcontainers/CI).
> - Uses the cached browser binaries in `node_modules/.cache/playwright` to avoid repeated downloads.

#### Run specific test file:
```bash
npm run test:e2e -- tests/e2e/multi-page-persistence.spec.ts
```

#### Run tests in headed mode (see browser):
```bash
npm run test:e2e -- --headed
```

#### Run tests with UI mode (interactive):
```bash
npm run test:e2e -- --ui
```

#### Debug tests:
```bash
npm run test:e2e -- --debug
```

## Test Files

### 1. `multi-page-persistence.spec.ts` (New - for bug fixes)
Tests the recently fixed persistence bugs:

- **Ghost Edits Bug**: Verifies that operations are NOT created when content/metadata hasn't changed
- **Multi-Page Restoration Bug**: Verifies that edits on ALL pages are restored, not just the last edited page

Key tests:
- `Editing multiple pages: changes persist across all pages`
- `Reload page preserves edits from multiple sections`
- `Sequential edits on same element do not create ghost edits`
- `BUG FIX: Changes on all pages are restored, not just last page`

### 2. `integration-workflow.spec.ts`
General workflow integration tests covering:
- Document editing workflows
- Change tracking and display
- Different element types
- Performance and responsiveness
- Data persistence across navigation

### 3. `ui-accessibility.spec.ts`
Tests for accessibility features and UI correctness.

### 4. `multi-page-export.spec.ts`
End-to-end smoke that edits across the Debug and Document pages, verifying:

- Changes land in `ChangesModule` (via `window.reviewDebug.operations()`).
- UI renders the edited content for each element type (paragraphs, lists, code blocks, headings).
- Clean QMD exports include the newly inserted markers.

### 5. `ui-regression.spec.ts`
Regression tests to prevent breaking existing functionality.

## Configuration

Playwright is configured in `playwright.config.ts`:

```typescript
- Base URL: http://127.0.0.1:5173 (served from the pre-rendered `example/_output`)
- Browser: Chromium (Firefox and WebKit can be enabled)
- Timeout: 45 seconds per test
- Reporters: HTML report
- Workers: 1 (single worker for stability)
```

The dev server is automatically started by Playwright before tests run.

## How the Tests Work

The E2E tests simulate real user interactions:

1. **Navigation**: Tests navigate to the example document at `/example`
2. **Element Selection**: Use Playwright locators to find elements on the page
3. **User Actions**: Double-click to open editors, type text, click save/cancel buttons
4. **Assertions**: Verify content is displayed correctly and persisted

Example:
```typescript
// Find a paragraph
const para = page.locator('[data-review-type="Para"]').first();

// User double-clicks to open editor
await para.dblClick();

// Wait for editor modal
await page.waitForSelector('.review-editor-modal', { timeout: 3000 });

// Edit the content
const textarea = page.locator('.review-editor-content textarea').first();
const content = await textarea.inputValue();
await textarea.fill(content + ' [NEW TEXT]');

// Save changes
const saveBtn = page.locator('button:has-text("Save")').first();
await saveBtn.click();

// Verify changes persisted
const newText = await para.textContent();
expect(newText).toContain('[NEW TEXT]');
```

## Testing the Bug Fixes

### Testing Ghost Edits Fix

The test `Sequential edits on same element do not create ghost edits` verifies:
1. Makes an actual content change
2. Opens editor again without making changes
3. Verifies no extra content was added

```typescript
// Edit 1: Real change
await textarea.fill(content + ' [REAL_CHANGE]');
// ... save ...

// Edit 2: Open and close without changes
await para.dblClick();
// ... don't modify ...
await cancelBtn.click();

// Verify no change
expect(textAfterNoEdit).toBe(originalEditedText);
```

### Testing Multi-Page Restoration Fix

The test `BUG FIX: Changes on all pages are restored, not just last page` verifies:
1. Edits 3 different paragraphs (simulating 3 pages)
2. Reloads the page
3. Verifies ALL edits are still there (not just the last one)

```typescript
// Edit multiple paragraphs
for (const target of editTargets) {
  // ... make edits ...
}

// Reload page
await page.reload();

// Verify all edits persisted
for (const target of editTargets) {
  const text = await paras.nth(target.index).textContent();
  expect(text).toContain(target.marker);
}
```

## Viewing Test Results

After tests run, an HTML report is generated:

```bash
npx playwright show-report
```

This opens an interactive report showing:
- Test results (passed/failed)
- Screenshots on failure
- Traces of test execution
- Video recordings (if enabled)

## Common Issues

### Dev Server Not Starting
If tests fail with "connection refused", the dev server may not be starting properly:

```bash
# Manual start:
npm run serve:e2e

# In another terminal:
npm run test:e2e
```

### Running Inside the Dev Container
- The devcontainer `postCreateCommand` already installs Playwright (`npx playwright install chromium`).
- If the container was created before this change, run the command manually inside the container to install the browser runtime.
- `scripts/run-e2e.sh` automatically wraps the test command via `xvfb-run` when `$DISPLAY` is unavailable, so you can simply run:

```bash
npm run test:e2e
```

This avoids the need to start an X server manually. The helper server that backs `npm run test:e2e` (`npm run serve:e2e`) serves the rendered Quarto example from `example/_output` and maps `/example` to `index.html`, so no additional preview steps are required.

> Note: Use `npx playwright install --with-deps chromium` only on self-managed machines where you have sudo/root access and still need Playwright to pull in missing system libraries. Inside the devcontainer those libraries are preinstalled.

### Timeout Errors
If tests timeout waiting for elements, check:
1. Is the element ID correct? (`data-review-id`, `data-review-type`)
2. Is the selector correct? (check browser DevTools)
3. Is the element visible? Some elements may require scrolling

### Flaky Tests
If tests sometimes pass and sometimes fail:
1. Increase wait timeouts: `await page.waitForSelector(..., { timeout: 10000 })`
2. Use more specific selectors
3. Check for race conditions in the application code

## Debugging

### Visual Debugging
```bash
npm run test:e2e -- --headed
```
Shows the browser while tests run.

### Interactive Debugging
```bash
npm run test:e2e -- --ui
```
Opens UI mode where you can step through tests.

### Debugger
```bash
npm run test:e2e -- --debug
```
Pauses on each action and opens inspector.

### Adding Debug Logs
```typescript
// In tests
console.log('Current text:', await para.textContent());
page.screenshot({ path: 'debug-screenshot.png' });
```

## Extending the Tests

### Add a new test case:

1. Create a new `.spec.ts` file in `tests/e2e/`
2. Import `{ test, expect }` from `@playwright/test`
3. Use `test.describe()` for test suites and `test()` for individual tests
4. Use page actions: `.goto()`, `.click()`, `.fill()`, `.locator()`, etc.
5. Use assertions: `expect().toBe()`, `expect().toContain()`, etc.

Example:
```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should work correctly', async ({ page }) => {
    await page.goto('/example');
    // ... test code ...
    expect(result).toBe(expected);
  });
});
```

### Useful Playwright Methods

- **Navigation**: `page.goto()`, `page.reload()`, `page.goBack()`
- **Selectors**: `page.locator()`, `page.click()`, `page.fill()`, `page.dblClick()`
- **Waiting**: `page.waitForSelector()`, `page.waitForTimeout()`, `page.waitForNavigation()`
- **Assertions**: `expect(value).toBe()`, `.toContain()`, `.toBeVisible()`, `.toHaveText()`
- **Debugging**: `page.screenshot()`, `page.pause()`, `console.log()`

## CI/CD Integration

- Call `npm run test:e2e` in your CI workflow; no extra xvfb setup is required because the helper script handles it.
- Before the Playwright step, ensure the browsers are installed (redundant but safe):

```yaml
- run: npx playwright install chromium
- run: npm run test:e2e
```

## Related Documentation

- [Playwright Documentation](https://playwright.dev)
- [Test Examples](./tests/e2e/)
- [Config File](./playwright.config.ts)
- [Multi-Page Bugs & Fixes](./MULTI_PAGE_BUGS_AND_FIXES.md)
