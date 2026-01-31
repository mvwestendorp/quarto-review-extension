# Quarto Review Extension

[![CI](https://github.com/mvwestendorp/quarto-review-extension/workflows/CI/badge.svg)](https://github.com/mvwestendorp/quarto-review-extension/actions)
[![Test Coverage](https://img.shields.io/badge/coverage-71.27%25-yellow)](https://mvwestendorp.github.io/quarto-review-extension/coverage/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue?logo=github)](https://mvwestendorp.github.io/quarto-review-extension/)
[![Code Quality](https://img.shields.io/badge/code%20quality-strict%20TS-success)](https://www.typescriptlang.org/tsconfig#strict)
[![Security](https://img.shields.io/badge/security-Trivy%20%2B%20npm%20audit-informational?logo=security)](https://github.com/mvwestendorp/quarto-review-extension/security)

A Quarto extension for collaborative document review with in-browser editing capabilities.

---

## For Users

📖 **[Quick Start Guide](./docs/user/QUICK_START.md)** - Get started in 5 minutes

**Core Features:**
- **In-browser editing** - Click any text to edit with change tracking
- **Search & Find** - Browser-like search with Cmd/Ctrl+F
- **Change Summary** - Real-time statistics and analytics for all edits
- **Comments** - CriticMarkup-based annotation system
- **Undo/Redo** - Full edit history with unlimited undo

**Documentation:**
- [Features Guide](./docs/user/FEATURES.md) - Detailed feature explanations
- [Keyboard Shortcuts](./docs/user/KEYBOARD_SHORTCUTS.md) - Quick reference
- [FAQ](./docs/user/FAQ.md) - Common questions
- [Troubleshooting](./docs/user/DEBUG_AND_TROUBLESHOOTING.md) - Debug and common issues

## For Developers

🛠️ **[Setup Guide](./docs/dev/SETUP.md)** - Development environment setup

**Key Resources:**
- [Architecture](./docs/dev/ARCHITECTURE.md) - System design and patterns
- [Modules](./docs/dev/MODULES.md) - Module documentation
- [Contributing](./docs/dev/CONTRIBUTING.md) - Code standards and PR process
- [Testing](./docs/dev/TESTING.md) - Test suite guide
- [API Reference](https://mvwestendorp.github.io/quarto-review-extension/api/) - Auto-generated docs

**Code Quality:**
- Strict TypeScript mode with 100% type safety
- 71% test coverage with Vitest
- ESLint + Prettier for code formatting
- Pre-commit hooks with Husky
- CI/CD with GitHub Actions

## Installation

```bash
npm install
npm run build
```

The build automatically copies compiled assets to `_extensions/review/assets/` for immediate Quarto testing.

## Development

**Quick Start:**
```bash
npm run dev          # Watch mode for development
npm test             # Run tests
npm run lint         # Check code quality
npm run build        # Production build
```

**Development Options:**
- **Dev Container** (recommended): See [.devcontainer/README.md](.devcontainer/README.md)
- **Local Setup**: See [docs/dev/SETUP.md](./docs/dev/SETUP.md)

**Contributing:**
See [CONTRIBUTING.md](./docs/dev/CONTRIBUTING.md) for code standards, testing requirements, and PR process.

## Additional Resources

- [Documentation Index](./docs/DOCUMENTATION_INDEX.md) - Complete documentation overview
- [Changelog](./CHANGELOG.md) - Version history and release notes
- [Security Policy](./SECURITY.md) - Vulnerability reporting

## License

MIT
