# Developer Documentation

## Quick Links

- [Setup Guide](./SETUP.md) - Environment setup
- [Architecture](./ARCHITECTURE.md) - System design
- [Modules](./MODULES.md) - Module documentation
- [Testing](./TESTING.md) - Test guide
- [Contributing](./CONTRIBUTING.md) - Contribution guide
- [API Reference](https://mvwestendorp.github.io/quarto-review-extension/api/) - Auto-generated docs

## Directory Structure

```
src/
├── modules/
│   ├── changes/      # Change tracking
│   ├── comments/     # CriticMarkup
│   ├── git/          # Git persistence
│   ├── markdown/     # Markdown conversion
│   ├── translation/  # Translation features
│   ├── ui/           # UI components
│   └── user/         # Authentication
└── main.ts           # Entry point
```

## Key Concepts

**Change Tracking:** Operations stored as immutable history for undo/redo

**CriticMarkup:** `{++add++}`, `{--del--}`, `{~~old~>new~~}`, `{>>comment<<}`

**Deterministic IDs:** Elements identified by structure for reliable mapping

## Subdirectories

- [Planning](./planning/) - Architecture plans, roadmaps, and optimization strategies
- [Analysis](./analysis/) - Code quality, test coverage, and limitations
- [Security](./security/) - Security audits and vulnerability assessments

## Getting Started

1. [Setup](./SETUP.md) - Install dependencies
2. [Architecture](./ARCHITECTURE.md) - Understand system
3. [Modules](./MODULES.md) - Learn module APIs
4. [Contributing](./CONTRIBUTING.md) - Submit code

## Commands

```bash
npm run dev          # Watch mode
npm run build        # Production build
npm run test         # Run tests
npm run type-check   # TypeScript check
npm run docs         # Generate API docs
```

## Debug Mode

```yaml
review:
  debug:
    enabled: true
    level: debug
    modules: [UIModule, ChangesModule]
```

Console control:
```javascript
window.debugLogger.enable('debug')
window.printDebugHelp()
```
