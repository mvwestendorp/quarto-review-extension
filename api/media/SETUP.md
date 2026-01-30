# Setup Guide

## Prerequisites

- Node.js 22+
- Quarto 1.8+
- npm 10+
- Git

## Quick Setup

### Dev Container (Recommended)

1. Install Docker Desktop
2. Install VS Code Remote Containers extension
3. Open project → "Reopen in Container"

### Local Setup

```bash
git clone <repository-url>
cd quarto-review-extension
npm install
npm run dev
```

## Development Tasks

**Watch mode:** `npm run dev` (auto-rebuild on changes)

**Build:** `npm run build` (output to `dist/` and `_extensions/review/assets/`)

**Test:** `npm run test` (all tests)
**Test watch:** `npm run test:watch`
**Coverage:** `npm run test:coverage`

**Type check:** `npm run type-check`

**Docs:** `npm run docs` (generates API docs)

## Project Structure

```
src/modules/     # Core modules
tests/unit/      # Unit tests
docs/            # Documentation
_extensions/     # Extension files
```

## Editor Setup (VS Code)

Recommended extensions: ESLint, Prettier, TypeScript, Vitest

`.vscode/settings.json`:
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "vitest.enable": true
}
```

## Testing

**Manual test:**
```bash
npm run build
cd example
quarto preview example.qmd
```

## Debugging

**Browser:** F12 → Sources → set breakpoints

**VS Code:** Add to `.vscode/launch.json`:
```json
{
  "configurations": [{
    "type": "node",
    "request": "launch",
    "name": "Debug Tests",
    "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
    "args": ["run"]
  }]
}
```

## Git Workflow

```bash
git checkout -b feature/your-feature
git commit -m "feat: description"
git push origin feature/your-feature
```

**Commit format:** `type(scope): description`
Types: feat, fix, docs, style, refactor, perf, test, chore

## Common Issues

**Dependencies fail:** `rm -rf node_modules package-lock.json && npm install`

**Port in use:** `lsof -i :5173 && kill -9 <PID>`

**Tests fail:** `npm run test -- --clearCache`

## Next Steps

See [Modules](./MODULES.md), [Architecture](./ARCHITECTURE.md), [Contributing](./CONTRIBUTING.md)
