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

## Features

### Core Features
- **In-browser editing**: Click any text element to edit with the Milkdown-based editor
- **Change tracking**: All edits stored as operations with diff support
- **Comments**: CriticMarkup-based annotation system
- **Git integration**: Save changes directly to git with provider support (GitHub, GitLab, Gitea, etc.)
- **User management**: Authentication and permission system

### UI Improvements (New)
- **📊 Change Summary Dashboard**: Real-time statistics showing all document changes with analytics
  - Total changes, additions, deletions, substitutions count
  - Characters added/removed tracking
  - Changes breakdown by element type
  - Quick navigation to changes
  - Export summary as markdown

- **🔍 Search & Find**: Browser-like document search (Cmd+F / Ctrl+F)
  - Real-time search with match highlighting
  - Case sensitivity toggle
  - Whole word matching
  - Full regex support
  - Match navigation (prev/next)
  - Match counter display

### Future Features
- **Translation support**: Side-by-side translation mode with deterministic correspondence mapping
- **Side-by-side comparison**: Original vs. edited versions with synchronized scrolling
- **Multi-format export**: HTML, JSON, DOCX, PDF export options
- **AI-powered suggestions**: Grammar, style, and readability improvements

## Architecture

- **Single-render model**: Quarto renders once, all edits happen in-memory
- **Deterministic ID mapping**: Structure-based element identification
- **Modular design**: Separate concerns for changes, rendering, persistence
- **Stateless UI**: Changes module is the source of truth

## Installation

```bash
npm install
npm run build  # Automatically copies build to _extensions/review/assets/
```

The build process automatically copies the compiled JavaScript to the extension directory, so you can immediately test with Quarto.

## Usage

### Change Summary Dashboard

The Change Summary Dashboard provides a comprehensive overview of all document changes at a glance.

**Accessing the Dashboard:**
- The dashboard can be integrated into the sidebar or toolbar (implementation-dependent)
- Once opened, displays real-time statistics

**Features:**
- 📈 **Statistics Cards**: Total changes, elements modified, comments count
- 📊 **Change Breakdown**: Visual breakdown of additions, deletions, and substitutions
- 🔤 **Element Type Distribution**: Shows which types of elements were modified (headers, paragraphs, lists, etc.)
- ➕➖🔄 **Detailed Breakdown**:
  - Shows progress bars for each change type
  - Calculates percentage distribution
  - Displays character-level counts
- ⬆️⬇️ **Navigation**: "First Change" and "Last Change" buttons for quick navigation
- 📋 **Export**: "Export Summary" button copies a markdown summary to your clipboard

**Keyboard Navigation:**
- Click any change in the list to jump to it in the document
- Use arrow buttons to navigate between changes

### Search & Find

Search for text throughout the document with powerful search options.

**Opening Search (Keyboard Shortcuts):**
- **Mac:** `Cmd+F`
- **Windows/Linux:** `Ctrl+F`
- Also closes with `Escape`

**Search Options:**
- 🔤 **Case Sensitive** (Aa toggle): Match exact case
- 📝 **Whole Word** (Ab| toggle): Only match complete words, not parts of words
- .* **Regex** (regex toggle): Use regular expressions for advanced search patterns

**Navigation:**
- `Enter` or ▼ button: Next match
- `Shift+Enter` or ▲ button: Previous match
- Matches are highlighted in yellow with context
- Counter shows current position (e.g., "3 of 25")

**Examples:**

```
Basic search:
  "test" → finds all instances of "test"

Case-sensitive:
  "Test" with Aa enabled → finds only "Test", not "test"

Whole word:
  "test" with Ab| enabled → finds "test" but not "testing" or "tested"

Regular expressions:
  "^Chapter" → finds text starting with "Chapter"
  "[0-9]+" → finds numbers
  "cat|dog" → finds either "cat" or "dog"
```

**Tips:**
- Search works across all document elements
- Results show context preview (30 chars before and after)
- Matching elements scroll smoothly into view with highlight animation

## Documentation

### 📚 Organized Documentation Structure

Our documentation is organized into three main categories for easy navigation:

- **[Developer Documentation](./docs/dev/)** - Setup, architecture, module guides, and contributing
  - [Setup Guide](./docs/dev/SETUP.md) - Development environment setup
  - [Architecture](./docs/dev/ARCHITECTURE.md) - System design
  - [Module Guide](./docs/dev/MODULES.md) - API and module documentation
  - [Contributing Guide](./docs/dev/CONTRIBUTING.md) - Code standards and PR process
  - [API Reference](https://mvwestendorp.github.io/quarto-review-extension/api/) - Auto-generated from JSDoc

- **[User Documentation](./docs/user/)** - Features, tutorials, and reference
  - [Features Guide](./docs/user/FEATURES.md) - Detailed feature explanations
  - [Keyboard Shortcuts](./docs/user/KEYBOARD_SHORTCUTS.md) - Quick reference
  - [FAQ](./docs/user/FAQ.md) - Frequently asked questions
  - [Debug & Troubleshooting](./docs/user/DEBUG_AND_TROUBLESHOOTING.md) - Debug mode and common issues

- **[Roadmap & Planning](./docs/todo/)** - Future features and project planning
  - [Roadmap](./docs/todo/README.md) - Upcoming features and release schedule
  - [Feature Plans](./docs/todo/) - Detailed plans for planned features

### Viewing the API Documentation

The API documentation is auto-generated from JSDoc comments in the source code using TypeDoc.

**In Dev Container:**

Use VS Code Tasks (GUI):
1. Open Command Palette: `Cmd+Shift+P` / `Ctrl+Shift+P`
2. Type "Run Task"
3. Select one of:
   - **"Generate TypeDoc and Serve"** - Generates docs and serves them
   - **"Serve Existing Docs"** - Serves pre-generated docs
   - **"Watch Docs (Live Rebuild)"** - Auto-regenerates on source changes

Or use npm scripts:
```bash
# Generate docs
npm run docs

# Watch and rebuild docs on changes
npm run docs:watch
```

**On Local Machine:**
1. Generate docs: `npm run docs`
2. Open `docs/generated/api/index.html` in your browser
3. Or serve: `python3 -m http.server 8080 --directory docs/generated/api`

## Code Quality

This project maintains high code quality standards through automated testing, linting, and type checking.

### Quality Metrics & Thresholds

- **Test Coverage**: 80% lines, 75% branches, 80% statements
- **Type Safety**: 100% strict TypeScript mode enabled
- **Linting**: ESLint with comprehensive rules
- **Security**: npm audit (no high/critical vulnerabilities)
- **Complexity**: Max 15 cyclomatic complexity, 150 lines per function
- **Bundle Size**: <500 KB (JavaScript bundle)

### Quality Commands

```bash
# Run all quality checks
npm run quality:check

# Individual checks
npm run lint              # ESLint linting
npm run lint:fix          # Auto-fix linting issues
npm run format            # Prettier code formatting
npm run type-check        # TypeScript type validation
npm test:coverage:check   # Test coverage with thresholds
npm run security:check    # npm audit for vulnerabilities
npm run quality:complexity # Code complexity analysis
npm run quality:report     # Generate quality report
npm run size:check         # Check bundle size limits
```

### Pre-commit Hooks

This project uses Husky for automated pre-commit checks:

```bash
# Install hooks (automatic on npm install)
npm run prepare

# Hooks will automatically:
- Fix linting issues on changed files
- Format changed files with Prettier
- Prevent commits with quality issues
```

To skip hooks (not recommended):
```bash
git commit --no-verify
```

### CI/CD Pipeline

All quality checks run in GitHub Actions on every push and pull request:

1. **Lint & Type Check** - ESLint, Prettier, TypeScript validation
2. **Security Audit** - npm audit for vulnerabilities
3. **Unit Tests** - Vitest with coverage thresholds
4. **E2E Tests** - Playwright browser automation
5. **Build & Size** - Vite build with bundle size monitoring
6. **Quality Report** - Aggregated quality metrics

## Development

### Option 1: Using Dev Container (Recommended)

The easiest way to get started is using the VS Code dev container:

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Install [VS Code](https://code.visualstudio.com/) with [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Open project in VS Code
4. Click "Reopen in Container" when prompted

Everything will be automatically set up! See [.devcontainer/README.md](.devcontainer/README.md) for details.

### Option 2: Local Development

```bash
# Prerequisites: Node.js 22+, Quarto 1.8+

# Install dependencies
npm install

# Watch mode
npm run dev

# Run tests
npm test

# E2E tests
npm run test:e2e

# Linting
npm run lint
```

## Project Structure

```
src/
├── modules/
│   ├── changes/      # In-memory operations and reconstruction
│   ├── markdown/     # Markdown-to-HTML conversion
│   ├── comments/     # CriticMarkup support
│   ├── user/         # Authentication
│   ├── git/          # Git persistence layer
│   ├── ui/           # Editor and rendering
│   │   ├── change-summary.ts   # Change Summary Dashboard (NEW)
│   │   └── search-find.ts      # Search & Find functionality (NEW)
│   └── translation/  # (Future) Translation features
└── main.ts           # Entry point
```

## New Features Implementation

### Change Summary Dashboard (`src/modules/ui/change-summary.ts`)

**Key Classes and Methods:**
- `ChangeSummaryDashboard` - Main class for change statistics
  - `calculateSummary()` - Aggregates all changes with statistics
  - `renderDashboard()` - Creates HTML UI component
  - `getChangesList()` - Returns detailed list of all changes
  - `jumpToElement(elementId)` - Navigate to specific change
  - `exportSummary()` - Export stats as markdown

**Features:**
- Tracks additions, deletions, substitutions
- Counts characters added/removed
- Groups changes by element type
- Counts comments in document
- Provides visual progress bars
- Click-to-navigate functionality

**Testing:**
- 37 comprehensive unit tests in `tests/unit/change-summary.test.ts`
- Tests cover: basic functionality, multiple changes, character counting, element tracking, comment counting, edge cases, HTML rendering, and error handling
- All edge cases validated (empty operations, large datasets, malformed markup, unicode support, XSS prevention)

### Search & Find (`src/modules/ui/search-find.ts`)

**Key Classes and Methods:**
- `DocumentSearch` - Main class for search functionality
  - `openSearchPanel()` / `closeSearchPanel()` - Panel management
  - `toggleSearchPanel()` - Toggle visibility
  - `performSearch()` - Execute search with options
  - `findMatches(options)` - Find all matching text
  - `nextMatch()` / `previousMatch()` - Navigate results
  - `highlightMatches()` - Apply visual highlighting

**Features:**
- Browser-like Cmd+F / Ctrl+F shortcuts
- Real-time search with debouncing (150ms)
- Case sensitivity, whole word, and regex support
- Automatic highlight with smooth scrolling
- Match counter and navigation buttons
- Mobile-responsive design

**Testing:**
- 39 comprehensive unit tests in `tests/unit/search-find.test.ts`
- Tests cover: public API, panel structure, keyboard shortcuts, search options, error handling, state management, security, and accessibility
- Validates: XSS prevention, HTML escaping, proper event handling

### Test Coverage

**Statistics:**
- **Change Summary Dashboard**: 37 tests covering 25+ edge cases
- **Search & Find**: 39 tests covering 20+ edge cases
- **Total**: 76 new tests, all passing (100% pass rate)

**Edge Cases Validated:**
- Empty data, single items, multiple items, large datasets
- Malformed/nested CriticMarkup
- Missing metadata and null values
- Unicode and emoji characters
- Security: XSS attempts, HTML escaping, event handlers
- Accessibility: keyboard navigation, ARIA support
- State persistence and error recovery

## License

MIT
