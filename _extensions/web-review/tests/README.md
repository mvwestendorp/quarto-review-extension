# Web Review Extension - Tests

This directory contains unit and integration tests for the web review extension.

## Running Tests

### Option 1: Using a Local Web Server (Recommended)

Due to browser security restrictions (CORS), you need to serve the files via HTTP:

**Using Python:**
```bash
cd tests
./run-tests.sh
# Or manually:
python3 -m http.server 8888
```

**Using Node.js:**
```bash
npx http-server -p 8888
```

**Using PHP:**
```bash
php -S localhost:8888
```

Then open http://localhost:8888/test-modules-standalone.html in your browser.

### Option 2: Standalone Module Tests (Simplest)

```bash
cd tests
python3 -m http.server 8888
```

Open: http://localhost:8888/test-modules-standalone.html

This loads ONLY the modules and their tests (no dependencies on other extension files).

### Option 3: Full Test Suite

For the complete test suite including integration tests:

```bash
cd tests
python3 -m http.server 8888
```

Open: http://localhost:8888/test-runner.html

**Note:** This requires all extension files to be present.

## Test Files

### Unit Tests (Modules)
- `unit/test-markdown-utils.js` - Tests for markdown conversion utilities
- `unit/test-user-manager.js` - Tests for user management
- `unit/test-dom-utils.js` - Tests for DOM utilities

### Unit Tests (Components)
- `unit/test-review-ui.js` - Tests for review UI components
- `unit/test-diff-viewer.js` - Tests for diff viewer
- `unit/test-version-control.js` - Tests for version control

### Integration Tests
- `integration/test-workflow.js` - End-to-end workflow tests
- `integration/test-source-mapping.js` - Source mapping tests

## Test Coverage

| Module | Tests | Coverage |
|--------|-------|----------|
| markdown-utils | 20 | Headers, lists, formatting, CriticMarkup |
| user-manager | 14 | OAuth, colors, initials, persistence |
| dom-utils | 8 | Offsets, ranges, edge cases |
| **Total** | **42** | **Core modules** |

## Writing New Tests

Tests use Mocha + Chai. Example:

```javascript
describe('My Feature', function() {
  it('should do something', function() {
    const result = myFunction('input');
    expect(result).to.equal('expected');
  });
});
```

### Adding a New Test File

1. Create `unit/test-my-feature.js`
2. Add to `test-modules-standalone.html`:
   ```html
   <script src="unit/test-my-feature.js"></script>
   ```
3. Run the tests!

## Troubleshooting

### "Loading failed for script" errors

**Problem:** Files can't load due to CORS restrictions when opening `file://` directly.

**Solution:** Use a web server (see Option 1 above).

### "Mocha instance is already disposed" error

**Problem:** Tests have already run.

**Solution:** Refresh the page to reset.

### Tests don't run automatically

**Problem:** Page loaded before scripts were ready.

**Solution:** Click the "▶ Run Tests" button manually.

## CI/CD Integration

Tests are validated in the CI pipeline:

```yaml
- name: Run unit tests
  run: |
    echo "Validating test files exist..."
    test -f "tests/unit/test-markdown-utils.js"
    test -f "tests/unit/test-user-manager.js"
    test -f "tests/unit/test-dom-utils.js"
```

For browser-based test execution in CI, use a headless browser like Playwright or Puppeteer (future enhancement).

## Quick Start

The fastest way to run tests:

```bash
# From the tests directory
./run-tests.sh

# Opens http://localhost:8888/test-runner.html
# Or manually open http://localhost:8888/test-modules-standalone.html
```

Press Ctrl+C to stop the server.
