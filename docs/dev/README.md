# Developer Documentation

This directory contains documentation for developers working on the Quarto Review Extension.

## Quick Links

- **[Architecture Guide](./ARCHITECTURE.md)** - System design and module structure
- **[Module Guide](./MODULES.md)** - Detailed module documentation
- **[API Reference](../generated/api/index.html)** - Auto-generated from JSDoc (build time)
- **[Setup Guide](./SETUP.md)** - Development environment setup
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute code
- **[Debug Mode Guide](../user/DEBUG.md)** - Enable debugging in development

## Directory Structure

```
src/
├── modules/
│   ├── changes/      # Change tracking and operations
│   ├── comments/     # CriticMarkup comment system
│   ├── git/          # Git persistence layer
│   ├── markdown/     # Markdown conversion
│   ├── translation/  # Translation features
│   ├── ui/           # UI components
│   │   ├── change-summary.ts   # Change summary dashboard
│   │   └── search-find.ts      # Search & find feature
│   └── user/         # User authentication
└── main.ts           # Entry point
```

## Key Concepts

### Change Tracking
All edits are stored as immutable operations. The `ChangesModule` maintains:
- Operation history (for undo/redo)
- Current document state
- Mapping between source elements and edit changes

### CriticMarkup Format
Changes are tracked using CriticMarkup:
- `{++added++}` - Addition
- `{--deleted--}` - Deletion
- `{~~old~>new~~}` - Substitution
- `{>>comment<<}` - Comment
- `{==highlighted==}` - Highlight

### Deterministic ID Mapping
Elements are identified deterministically based on their structure, allowing reliable mapping during navigation and persistence.

## Getting Started

1. See [Setup Guide](./SETUP.md) for environment setup
2. Read [Architecture Guide](./ARCHITECTURE.md) for system overview
3. Check [Module Guide](./MODULES.md) for specific module details
4. Review [Contributing Guide](./CONTRIBUTING.md) before submitting code

## Running Documentation Generation

Generate API documentation from source code:

```bash
# Generate TypeDoc documentation
npm run docs

# Generated files available at:
# docs/generated/api/index.html
```

## Debug Mode

Enable debug logging during development to trace system behavior:

### In Quarto Document

Add to YAML front matter:

```yaml
---
title: "My Document"
review:
  debug:
    enabled: true
    level: debug
    modules:
      - UIModule
      - ChangesModule
---
```

### Browser Console

After page load, you can control debugging:

```javascript
// Enable debug mode
window.debugLogger.enable('trace')

// Configure specific modules
window.debugLogger.setConfig({
  modules: ['UIModule'],
  level: 'debug'
})

// Show debug help
window.printDebugHelp()
```

### Common Scenarios

**Debugging UI issues:**
```yaml
modules: [UIModule]
```

**Tracing change operations:**
```yaml
modules: [ChangesModule]
level: trace
```

**Full system debugging:**
```yaml
exclude-modules: [GitModule]
level: debug
```

See [Debug Mode Guide](../user/DEBUG.md) for complete documentation.

## Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Check test coverage
npm run test:coverage
```

## Code Quality

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build
npm run build
```

## Performance Spot Checks

The markdown pipeline now caches its renderer and AST processor. To sanity-check throughput with a built bundle:

```bash
npm run build
node --input-type=module <<'NODE'
import { MarkdownModule } from './dist/review.js';
import { performance } from 'node:perf_hooks';

const md = new MarkdownModule();
const sample = '# Heading\\n\\n' + '- item\\n'.repeat(2000) + '\\n{++addition++}';

const start = performance.now();
for (let i = 0; i < 50; i++) {
  md.renderSync(sample);
  md.toPlainText(sample);
}
const elapsed = (performance.now() - start).toFixed(2);
console.log(`50 render+plainText passes in ${elapsed}ms`);
NODE
```

This quick loop is sufficient to spot regressions when adjusting remark/rehype configuration.
