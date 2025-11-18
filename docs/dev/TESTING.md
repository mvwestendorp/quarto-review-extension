# Testing Guide for Quarto Review Extension

This document provides comprehensive guidance on testing the Quarto Review extension, including how to run tests, add new test cases, and understand the test infrastructure.

## Table of Contents

- [Overview](#overview)
- [Test Infrastructure](#test-infrastructure)
- [Running Tests](#running-tests)
- [Adding New Test Cases](#adding-new-test-cases)
- [Test Categories](#test-categories)
- [Debugging Tests](#debugging-tests)
- [Continuous Integration](#continuous-integration)
- [Best Practices](#best-practices)

## Overview

The Quarto Review extension has a comprehensive test suite covering:

1. **Unit Tests** - Individual functions and modules
2. **Integration Tests** - Multi-module workflows
3. **E2E Tests** - Browser-based end-to-end tests with Playwright
4. **Fixture-Based Tests** - Easy-to-expand test cases using file fixtures

### Test Coverage Goals

- **Core transformation pipeline**: 95%+
- **Changes module**: 90%+
- **Markdown module**: 85%+
- **Export functionality**: 85%+
- **UI components**: 70%+
- **Overall**: 80%+

## Test Infrastructure

### Frameworks and Tools

- **Vitest** - Unit and integration testing
- **Playwright** - E2E browser testing
- **JSDOM** - DOM simulation for unit tests
- **Fast-check** - Property-based testing (optional)

### Directory Structure

```
tests/
├── fixtures/                          # Test fixtures (see fixtures/README.md)
│   ├── transformation/               # Text transformation test cases
│   │   ├── inputs/                  # Original markdown
│   │   ├── edits/                   # Edited markdown
│   │   └── expected/                # Expected outputs
│   │       ├── critic-markup/       # Expected CriticMarkup
│   │       ├── accepted/            # Expected after accepting
│   │       └── rejected/            # Expected after rejecting
│   ├── rendering/                    # Markdown rendering tests
│   ├── documents/                    # Complete document fixtures
│   └── operations/                   # Operation sequence tests
│
├── unit/                              # Unit tests
│   └── core/
│       ├── transformation-pipeline.test.ts
│       └── markdown-rendering.test.ts
│
├── integration/                       # Integration tests
│   └── transformation-pipeline-integration.test.ts
│
├── e2e/                               # E2E tests
│   └── text-transformation.spec.ts
│
└── utils/                             # Test utilities
    └── fixture-loader.ts             # Fixture loading utility
```

## Running Tests

### All Tests

```bash
# Run all tests (unit + integration + E2E)
npm test

# Run with coverage
npm run test:coverage
```

### Unit Tests Only

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm run test:unit transformation-pipeline

# Run in watch mode
npm run test:unit -- --watch
```

### Integration Tests Only

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npm run test:integration transformation-pipeline-integration
```

### E2E Tests Only

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific E2E test
npm run test:e2e text-transformation

# Debug E2E tests
npm run test:e2e -- --debug
```

### Watch Mode

```bash
# Run unit tests in watch mode (auto-rerun on file changes)
npm run test:unit -- --watch

# Run specific test file in watch mode
npm run test:unit transformation-pipeline -- --watch
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage report in browser
open coverage/index.html
```

## Adding New Test Cases

The Quarto Review test suite is designed to make adding new test cases easy. There are two primary methods:

### Method 1: Fixture-Based Tests (Recommended for Text Transformations)

Fixture-based tests are ideal for testing text transformations because they:
- Are easy to add (just create files, no code required)
- Are automatically discovered and run
- Make it easy to see the exact input/output
- Allow non-programmers to contribute test cases

#### Step-by-Step: Adding a Transformation Test

1. **Create input file** in `tests/fixtures/transformation/inputs/`

   ```bash
   # File: tests/fixtures/transformation/inputs/my-test-case.md
   Original content here
   ```

2. **Create edit file** in `tests/fixtures/transformation/edits/`

   ```bash
   # File: tests/fixtures/transformation/edits/my-test-case.md
   Modified content here
   ```

3. **Create expected CriticMarkup** in `tests/fixtures/transformation/expected/critic-markup/`

   ```bash
   # File: tests/fixtures/transformation/expected/critic-markup/my-test-case.md
   {~~Original~>Modified~~} content here
   ```

4. **That's it!** The test suite will automatically:
   - Discover your test case
   - Run it through the transformation pipeline
   - Verify the output matches your expected files

#### Example: Testing List Marker Preservation

```bash
# 1. Create input
cat > tests/fixtures/transformation/inputs/list-preserve-markers.md << 'EOF'
- Item 1
- Item 2
- Item 3
EOF

# 2. Create edit (modify second item)
cat > tests/fixtures/transformation/edits/list-preserve-markers.md << 'EOF'
- Item 1
- Item 2 modified
- Item 3
EOF

# 3. Create expected CriticMarkup
cat > tests/fixtures/transformation/expected/critic-markup/list-preserve-markers.md << 'EOF'
- Item 1
- Item 2{++ modified++}
- Item 3
EOF

# Run the test
npm run test:unit transformation-pipeline
```

### Method 2: Code-Based Tests (For Complex Logic)

For more complex scenarios that require setup or assertions, add tests directly in test files.

#### Example: Adding a Unit Test

```typescript
// File: tests/unit/core/transformation-pipeline.test.ts

it('should handle my specific edge case', () => {
  const original = 'some original content';
  const edited = 'some edited content';

  const changes = generateChanges(original, edited);
  const criticMarkup = changesToCriticMarkup(original, changes);
  const accepted = stripCriticMarkup(criticMarkup, true);

  expect(accepted).toBe(edited);
  expect(criticMarkup).toContain('{++');
});
```

#### Example: Adding an Integration Test

```typescript
// File: tests/integration/transformation-pipeline-integration.test.ts

it('should handle complex workflow', () => {
  // Create test scenario
  const original = 'original';
  const edit1 = 'edit 1';
  const edit2 = 'edit 2';

  // Process through pipeline
  const changes1 = generateChanges(original, edit1);
  const critic1 = changesToCriticMarkup(original, changes1);
  const accepted1 = stripCriticMarkup(critic1, true);

  const changes2 = generateChanges(accepted1, edit2);
  const critic2 = changesToCriticMarkup(accepted1, changes2);
  const accepted2 = stripCriticMarkup(critic2, true);

  // Verify final state
  expect(accepted2).toBe(edit2);
});
```

#### Example: Adding an E2E Test

```typescript
// File: tests/e2e/text-transformation.spec.ts

test('should handle my browser scenario', async ({ page }) => {
  await createTestDocument(page, [
    { markdown: 'Test content' },
  ]);

  await page.waitForSelector('[data-review-id]');
  await page.click('[data-review-id="test.para-1"]');
  await page.waitForSelector('.milkdown-editor');
  await page.keyboard.type('Modified content');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => {
    const quartoReview = (window as any).quartoReview;
    return quartoReview?.changes?.toCleanMarkdown();
  });

  expect(result).toContain('Modified content');
});
```

## Test Categories

### 1. Transformation Pipeline Tests

Located in: `tests/unit/core/transformation-pipeline.test.ts`

**What it tests:**
- `generateChanges()` - Diff generation
- `changesToCriticMarkup()` - CriticMarkup conversion
- `stripCriticMarkup()` - Accept/reject changes
- List structure preservation
- Table structure preservation
- Edge cases and special characters

**Add test cases by:** Creating fixtures in `tests/fixtures/transformation/`

### 2. Markdown Rendering Tests

Located in: `tests/unit/core/markdown-rendering.test.ts`

**What it tests:**
- Basic markdown rendering (headers, lists, tables, etc.)
- CriticMarkup rendering
- Heading normalization (stripping Pandoc attributes)
- Element-specific rendering
- XSS sanitization
- Plain text extraction

**Add test cases by:** Adding fixtures in `tests/fixtures/rendering/`

### 3. Integration Tests

Located in: `tests/integration/transformation-pipeline-integration.test.ts`

**What it tests:**
- Full pipeline: Edit → Track → Render → Accept/Reject
- Multi-element documents
- Round-trip consistency
- ChangesModule + DOM integration
- Export functionality

**Add test cases by:** Adding test functions to the integration test file

### 4. E2E Browser Tests

Located in: `tests/e2e/text-transformation.spec.ts`

**What it tests:**
- Editing in browser
- UI interactions
- Undo/redo
- Export functionality
- Visual regression
- Accessibility

**Add test cases by:** Adding Playwright test functions

## Debugging Tests

### Debugging Unit Tests

```bash
# Run single test file with verbose output
npm run test:unit transformation-pipeline -- --reporter=verbose

# Run single test by name
npm run test:unit -- -t "should handle list deletion"

# Debug with Node inspector
node --inspect-brk node_modules/.bin/vitest run transformation-pipeline
```

### Debugging E2E Tests

```bash
# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run in debug mode (pauses for inspection)
npm run test:e2e -- --debug

# Run specific test
npm run test:e2e -- -g "should edit a paragraph"

# Slow down execution
npm run test:e2e -- --headed --slow-mo=1000
```

### Debugging Failures

When a test fails:

1. **Check the error message** - It will show expected vs. actual
2. **Run the test in isolation** - Use `-t` to run just that test
3. **Add console.log statements** - Debug intermediate values
4. **Use the debugger** - Set breakpoints with `debugger;`
5. **Check fixtures** - Ensure input/expected files are correct

### Updating Expected Outputs

If behavior changes and you need to update expected outputs:

```bash
# For fixture-based tests: manually update the expected files
vim tests/fixtures/transformation/expected/critic-markup/my-test.md

# For snapshot tests: update snapshots
npm run test:unit -- -u
```

**⚠️ Warning:** Only update expected outputs if you're confident the new behavior is correct!

## Continuous Integration

### GitHub Actions

The test suite runs automatically on:
- Every push to any branch
- Every pull request
- Scheduled daily runs

### CI Configuration

Located in: `.github/workflows/test.yml`

The CI pipeline:
1. Runs linting checks
2. Runs unit tests with coverage
3. Runs integration tests
4. Runs E2E tests (headless)
5. Uploads coverage reports
6. Fails if coverage drops below thresholds

### Coverage Thresholds

Defined in `vitest.config.ts`:
```typescript
coverage: {
  lines: 60,
  functions: 60,
  branches: 50,
}
```

## Best Practices

### Writing Tests

1. **Test one thing at a time** - Each test should verify one specific behavior
2. **Use descriptive names** - `should preserve list markers when editing list items`
3. **Arrange-Act-Assert** - Clearly separate setup, execution, and verification
4. **Avoid test interdependence** - Tests should be runnable in any order
5. **Use fixtures for data** - Keep test files clean and focused on logic

### Naming Conventions

**Test files:**
- Unit tests: `*.test.ts`
- E2E tests: `*.spec.ts`

**Fixture files:**
- Use kebab-case: `list-delete-item.md`
- Be descriptive: `table-edit-cell-with-pipes.md`
- Indicate what's tested: `unicode-emoji-edit.md`

### Test Organization

```typescript
describe('Feature Name', () => {
  describe('Specific Behavior', () => {
    it('should do expected thing', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = doSomething(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Performance Considerations

- **Unit tests** should run in milliseconds
- **Integration tests** should run in seconds
- **E2E tests** can take longer but should be optimized

If tests are slow:
- Use smaller fixtures
- Mock expensive operations
- Run E2E tests in parallel
- Use `test.describe.configure({ mode: 'parallel' })`

### Common Pitfalls

1. **Forgetting to wait for async operations**
   ```typescript
   // Wrong
   await page.click('button');
   const result = await page.textContent('div');

   // Right
   await page.click('button');
   await page.waitForTimeout(500); // or use waitForSelector
   const result = await page.textContent('div');
   ```

2. **Not handling whitespace differences**
   ```typescript
   // Wrong
   expect(result).toBe(expected);

   // Right
   expect(result.trim()).toBe(expected.trim());
   ```

3. **Hard-coding timeouts**
   ```typescript
   // Wrong
   await page.waitForTimeout(1000); // Too slow

   // Right
   await page.waitForSelector('[data-loaded]'); // Event-driven
   ```

4. **Not cleaning up test data**
   ```typescript
   beforeEach(() => {
     // Reset state
   });

   afterEach(() => {
     // Clean up
   });
   ```

## Troubleshooting

### Common Issues

**Issue: Tests pass locally but fail in CI**
- **Cause:** Timing differences, missing dependencies
- **Solution:** Add explicit waits, check CI environment

**Issue: E2E tests are flaky**
- **Cause:** Race conditions, timing issues
- **Solution:** Use `waitForSelector` instead of `waitForTimeout`, increase timeouts

**Issue: Coverage is lower than expected**
- **Cause:** Not all code paths tested
- **Solution:** Run `npm run test:coverage` and check `coverage/index.html`

**Issue: Fixture-based tests not running**
- **Cause:** File naming mismatch
- **Solution:** Ensure input and edit files have the same base name

### Getting Help

1. **Check the logs** - Error messages are usually informative
2. **Run in debug mode** - See what's actually happening
3. **Check existing tests** - Look for similar test patterns
4. **Read the fixtures README** - `tests/fixtures/README.md`
5. **Ask for help** - Open an issue with test output

## Appendix

### Fixture Loader API

The `FixtureLoader` class provides utilities for loading test fixtures:

```typescript
import { fixtureLoader } from '../utils/fixture-loader';

// Load a text file
const content = fixtureLoader.loadText('transformation/inputs/test.md');

// Load a JSON file
const data = fixtureLoader.loadJSON('operations/scenarios/test.json');

// Check if file exists
if (fixtureLoader.exists('transformation/inputs/test.md')) {
  // ...
}

// Get all transformation test cases
const testCases = fixtureLoader.getTransformationTestCases();
```

### Example Test Case Template

```typescript
describe('My Feature', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do expected behavior', () => {
    // Arrange
    const input = 'test input';

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe('expected output');
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const result = myFunction('');
      expect(result).toBe('');
    });
  });
});
```

### Quick Reference

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:unit` | Run unit tests |
| `npm run test:integration` | Run integration tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:coverage` | Run with coverage |
| `npm run test:unit -- --watch` | Watch mode |
| `npm run test:e2e -- --headed` | E2E in browser |
| `npm run test:e2e -- --debug` | E2E debug mode |

---

For more information, see:
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Fixture README](tests/fixtures/README.md)
