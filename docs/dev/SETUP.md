# Development Setup Guide

## Prerequisites

- **Node.js:** 22 or later
- **Quarto:** 1.8 or later
- **npm:** 10 or later
- **Git:** Latest version

## Quick Setup (Recommended with Dev Container)

### Option 1: VS Code Dev Container (Easiest)

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Install [VS Code Remote Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Open project in VS Code
4. Click "Reopen in Container" when prompted

Everything will be automatically configured!

### Option 2: Local Setup

```bash
# Clone repository
git clone <repository-url>
cd quarto-review-extension

# Install dependencies
npm install

# Verify installation
npm run type-check
npm run test

# Start development
npm run dev
```

## Common Development Tasks

### Watch Mode (Recommended)

```bash
# Rebuilds on every file change
npm run dev
```

### Building

```bash
# Production build with automatic copying to extension
npm run build

# Output:
# - dist/review.js (compiled)
# - dist/review.js.map (source maps)
# - _extensions/review/assets/ (auto-copied)
```

### Running Tests

```bash
# Run all tests
npm run test

# Watch mode (re-run on changes)
npm run test:watch

# Specific test file
npm run test -- change-summary.test.ts

# With coverage
npm run test:coverage
```

### Type Checking

```bash
# Check TypeScript types
npm run type-check

# Fix auto-fixable issues
npm run lint --fix
```

### Generating Documentation

```bash
# Generate API docs from JSDoc
npm run docs

# View generated docs
open docs/generated/api/index.html
```

## Project Structure

```
.
├── src/
│   ├── modules/            # Core modules
│   │   ├── changes/        # Change tracking
│   │   ├── comments/       # Comments & markup
│   │   ├── git/            # Git integration
│   │   ├── markdown/       # Markdown processing
│   │   ├── translation/    # Translation features
│   │   ├── ui/             # UI components
│   │   └── user/           # Authentication
│   └── main.ts             # Entry point
├── tests/
│   └── unit/               # Unit tests
├── docs/
│   ├── dev/                # Developer documentation
│   ├── user/               # User documentation
│   ├── todo/               # Roadmap & todos
│   └── generated/          # Auto-generated API docs
├── _extensions/review/     # Extension files
├── package.json            # Dependencies & scripts
└── tsconfig.json           # TypeScript config
```

## Editor Setup

### VS Code

Recommended extensions:

1. **ESLint** - Code quality
2. **Prettier** - Code formatting
3. **TypeScript Vue Plugin** - TypeScript support
4. **Vitest** - Test runner integration

Create `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "vitest.enable": true
}
```

## Testing During Development

### Unit Tests

```bash
# Watch all tests
npm run test:watch

# Run specific test
npm run test -- change-summary

# Test specific describe block
npm run test -- -t "calculateSummary"
```

### Manual Testing

```bash
# Build and test in Quarto
npm run build

# In example/ directory:
quarto preview example.qmd
```

## Debugging

### Browser DevTools

1. Open in browser: `http://localhost:3000` (dev server)
2. F12 to open DevTools
3. Sources tab for breakpoints
4. Console for logs

### Node Debugging

```bash
# Debug tests
node --inspect-brk ./node_modules/.bin/vitest

# Then open: chrome://inspect in Chrome
```

### VS Code Debugging

Add to `.vscode/launch.json`:

```json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: description of changes"

# Push and create pull request
git push origin feature/your-feature
```

### Commit Message Format

Follow conventional commits:

```
type(scope): description

[optional body]
[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

Example:
```
feat(search): add regex support for search queries
```

## Common Issues

### Dependencies Won't Install

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Regenerate TypeScript cache
npm run type-check

# Update types
npm install --save-dev @types/node
```

### Tests Fail

```bash
# Clear test cache
npm run test -- --clearCache

# Run with verbose output
npm run test -- --reporter=verbose
```

### Port Already in Use

```bash
# Find and kill process on port 5173
lsof -i :5173
kill -9 <PID>
```

## Next Steps

1. Read [Module Guide](./MODULES.md) to understand code organization
2. Check [Architecture Guide](./ARCHITECTURE.md) for system design
3. Review existing code in `src/modules/`
4. Look at test examples in `tests/unit/`
5. Read [Contributing Guide](./CONTRIBUTING.md) before submitting code

## Getting Help

- Check [Architecture Guide](./ARCHITECTURE.md) for design questions
- See [Module Guide](./MODULES.md) for specific module questions
- Look at existing tests for usage examples
- Check [API Documentation](https://mvwestendorp.github.io/quarto-review-extension/api/) for API reference

## Resources

- [Quarto Documentation](https://quarto.org/)
- [Milkdown Editor](https://milkdown.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
