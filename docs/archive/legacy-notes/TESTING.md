# Testing Guide for Quarto Review Extension

## Overview

This project uses a **two-tier testing strategy** for efficiency and reliability:

1. **Unit Tests** (600ms) - Run on every commit for fast feedback
2. **E2E Integration Tests** (8-10 seconds) - Run before releases to validate workflows

## Unit Tests

### Purpose
- Validate **correctness** of outputs (markdown, HTML, state)
- Test all **edit operations** across all **section types**
- Verify **edge cases** and special scenarios
- Test **state management** (undo/redo, operations)

### Files
- `tests/unit/edits-by-section.test.ts` - Changes module & markdown output (40 tests)
- `tests/unit/ui-edits-rendering.test.ts` - UI module & HTML rendering (53 tests)

### Run Unit Tests

**All unit tests:**
```bash
npm test
```

**Specific test files:**
```bash
npm test -- tests/unit/edits-by-section.test.ts tests/unit/ui-edits-rendering.test.ts
```

**Watch mode (for development):**
```bash
npm test -- --watch
```

**Run specific test group:**
```bash
npm test -- --grep "Para:"
```

**Run single test:**
```bash
npm test -- --grep "Para: Addition"
```

## E2E Integration Tests

### Purpose
- Validate **user workflows** (open editor, edit, save, close)
- Test **UI interactions** (modal behavior, button clicks, state changes)
- Verify **performance** (editor opens < 2s, save < 1s)
- Check **data persistence** (changes survive navigation)
- Test **multiple sequential edits**

### Files
- `tests/e2e/integration-workflow.spec.ts` - Core workflow tests (15 tests)
- `tests/e2e/ui-regression.spec.ts` - Visual regression tests (16 tests)
- `tests/e2e/ui-accessibility.spec.ts` - Accessibility tests (18 tests)

### Run E2E Tests

✅ **E2E tests auto-start the dev server automatically!**

**Run all E2E tests (single command):**
```bash
npm run test:e2e
```

**Run specific E2E test file:**
```bash
npm run test:e2e -- tests/e2e/integration-workflow.spec.ts
```

**Run with specific options:**
```bash
# Run only Chromium (faster)
npm run test:e2e -- --project=chromium

# Run in headed mode (see browser while running)
npm run test:e2e -- --headed

# Run with debug output
npm run test:e2e -- --debug

# Run with debugging (pause on errors)
npm run test:e2e -- --debug-on-failure

# Generate screenshots on failure
npm run test:e2e -- --screenshot=only-on-failure
```

**What happens when you run tests:**
1. Playwright checks if dev server is running on http://localhost:5173
2. If not running, it auto-starts: `npm run dev`
3. Waits up to 3 minutes for server to be ready
4. Runs all tests sequentially with single browser
5. Closes dev server when done

## Test Coverage

### Section Types Covered
✓ Para (Paragraph)
✓ Header (h1, h2, h3, etc.)
✓ CodeBlock
✓ BulletList (with nesting)
✓ OrderedList (with nesting)
✓ BlockQuote (with nesting)
✓ Table
✓ Div

### Edit Types Covered
✓ Addition (add text/content)
✓ Deletion (remove text/content)
✓ Text Change (replace content)
✓ Formatting Change (add markdown formatting)
✓ Structure Change (new sections)

### Formatting Covered
✓ Bold (`**text**`)
✓ Italic (`*text*`)
✓ Code (`` `text` ``)
✓ Links (`[text](url)`)
✓ Strikethrough (`~~text~~`)
✓ CriticMarkup ({++add++}, {--delete--}, {~~old~>new~~}, {==highlight==}, {>>comment<<})

### Edge Cases Covered
✓ Empty content
✓ Very long text (10,000+ chars)
✓ Special characters (@#$%^&...)
✓ Unicode (Chinese, Arabic, Hebrew, emoji)
✓ Multiple consecutive edits
✓ Deep nesting
✓ Multiple blank lines

## Recommended CI/CD Pipeline

```yaml
# On every push (fast)
test:unit:
  npm test
  # ~600ms, catches correctness issues immediately

# On pull request (moderate)
test:pr:
  npm test              # Unit tests
  npm run test:e2e      # E2E tests
  # ~10 seconds total

# Before release (comprehensive)
test:release:
  npm test              # Unit tests
  npm run test:e2e      # E2E tests
  npm run build         # Build check
  npm run lint          # Code quality
  npm run type-check    # Type safety
  # ~30 seconds total
```

## Troubleshooting

### Error: "Timed out waiting 60000ms from config.webServer"

**Cause:** Dev server is taking too long to start (> 3 minutes).

**Solutions:**
1. Check system resources - E2E tests require significant RAM/CPU
2. Try killing any existing processes on port 5173:
   ```bash
   lsof -ti :5173 | xargs kill -9
   npm run test:e2e
   ```

3. Run with debug to see server startup logs:
   ```bash
   npm run test:e2e -- --debug
   ```

4. Try running a simpler E2E test first:
   ```bash
   npm run test:e2e -- tests/e2e/integration-workflow.spec.ts --project=chromium
   ```

### Error: "Target page, context or browser has been closed"

**Cause:** Test took too long (> 45 seconds) or browser crashed.

**Solutions:**
1. Check if specific test is slow:
   ```bash
   npm run test:e2e -- --debug
   ```

2. Run test in headed mode to observe browser behavior:
   ```bash
   npm run test:e2e -- --headed
   ```

3. Check system resources - browser needs ~500MB RAM per instance

### E2E Tests Hanging

**Solutions:**
1. Run with debug output to see what's happening:
   ```bash
   npm run test:e2e -- --debug
   ```

2. Run with headed mode to watch the browser:
   ```bash
   npm run test:e2e -- --headed
   ```

3. Increase wait timeouts in the test:
   ```typescript
   await page.waitForSelector('.review-editor-modal', { timeout: 10000 });
   ```

### Dev Server Won't Start

**Cause:** Port 5173 is in use or dependencies are missing.

**Solutions:**
1. Kill existing process:
   ```bash
   lsof -ti :5173 | xargs kill -9
   ```

2. Ensure dependencies are installed:
   ```bash
   npm install
   ```

3. Try running dev server manually to see error:
   ```bash
   npm run dev
   ```

### Memory/Resource Issues

**Cause:** Browser instances consuming too much RAM.

**Solution:** Run with single worker (already configured):
```bash
# Already in playwright.config.ts:
workers: 1  // Single worker
fullyParallel: false  // Sequential tests
```

## Performance Benchmarks

| Test Type | Time | Frequency | Purpose |
|-----------|------|-----------|---------|
| Unit Tests | ~600ms | Every commit | Fast feedback |
| E2E Tests | ~8-10s | Before release | Integration validation |
| Full Suite | ~15s | Pre-release | Comprehensive check |
| Full Build | ~30s | Pre-release | Production build |

## Best Practices

1. **Run unit tests frequently** - They're fast (~600ms)
2. **Run E2E before committing** - Catches integration issues
3. **Use watch mode during development** - `npm test -- --watch`
4. **Run specific tests when debugging** - `npm test -- --grep "pattern"`
5. **Check test output carefully** - Error messages are detailed
6. **Keep tests isolated** - Each test should be independent
7. **Use meaningful test names** - Names should describe what's being tested

## Adding New Tests

### Unit Test Template
```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should do something specific', () => {
    // Arrange
    const input = {...};

    // Act
    const result = doSomething(input);

    // Assert
    expect(result).toEqual({...});
  });
});
```

### E2E Test Template
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/example');
    await page.waitForSelector('[data-review-id]');
  });

  test('should complete user workflow', async ({ page }) => {
    const element = page.locator('[data-review-type="Para"]').first();

    // Act
    await element.dblClick();
    await page.waitForSelector('.review-editor-modal');

    // Assert
    expect(await element.isVisible()).toBe(true);
  });
});
```

## Related Documentation

- `CLAUDE.md` - Project architecture and development setup
- `README.md` - User-facing features
- `playwright.config.ts` - Playwright configuration
- `vitest.config.ts` - Vitest configuration
