# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Commands

### Development & Building
- `npm install` - Install dependencies
- `npm run dev` - Start watch mode (Vite dev server)
- `npm run build` - Full build pipeline (type-check → vite build → docs → css → copy assets)
- `npm run type-check` - TypeScript type validation
- `npm run lint` - ESLint code linting
- `npm run format` - Format code with Prettier

### Testing
- `npm test` - Run all unit tests with Vitest
- `npm run test:ui` - Run tests with Vitest UI dashboard
- `npm run test:e2e` - Run E2E tests with Playwright (Chromium, Firefox, WebKit)
- `npm test -- path/to/test.ts` - Run specific test file
- `npm test -- --grep "pattern"` - Run tests matching a pattern

### Code Quality
- `npm run lint` - Check for linting errors
- `npm run format` - Auto-format code with Prettier
- `npm run lint:fix` - Fix linting issues automatically

## Architecture Overview

### Single-Render Model
This extension follows a **single-render model**: Quarto renders the document as HTML once, then all subsequent edits happen in-memory via JavaScript without requiring re-renders. This enables efficient editing of large documents.

### Core Modules

**Module Architecture:**
```
┌─────────────────────────────────────────────────────┐
│        Quarto Document (HTML with data-review-*)    │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬─────────────────┐
        ▼              ▼              ▼                 ▼
┌─────────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────┐
│  Changes    │  │UI Module │  │Git Module    │  │User      │
│  Module     │  │          │  │              │  │Module    │
└──────┬──────┘  └────┬─────┘  └──────────────┘  └──────────┘
       │              │
       ▼              ▼
┌─────────────┐  ┌──────────────────────────────┐
│Markdown     │  │Comments Module / Editor      │
│Module       │  │(CriticMarkup & Milkdown)    │
└─────────────┘  └──────────────────────────────┘
```

### Key Modules

#### **Changes Module** (`src/modules/changes/`)
- **State Management**: Maintains `originalElements` and `operations` array
- **Operations**: `insert()`, `delete()`, `edit()`, `move()` - immutable operations
- **Reconstruction**: `getCurrentState()` applies operations sequentially to original elements
- **Export**: `toMarkdown()` with CriticMarkup, `toCleanMarkdown()` for git commits
- **History**: `undo()`, `redo()` functionality with stacks
- **Core Pattern**: Every edit creates an Operation object with userId, timestamp, and change details

#### **UI Module** (`src/modules/ui/`)
- **Stateless View Layer**: Queries state from Changes module, doesn't manage state
- **Key Components**:
  - `MilkdownEditor` - Rich markdown editor initialization
  - `EditorToolbar` - Undo/redo/tracked changes controls
  - `CommentsSidebar` - Comment panel and management
  - `ChangeSummaryDashboard` - Real-time change statistics and analytics
  - `DocumentSearch` - Cmd+F / Ctrl+F search functionality
- **Event Flow**: User click → openEditor() → initialize Milkdown → saveEditor() → Changes.edit() → refresh()
- **Editor State**: Persisted via localStorage (EditorHistory module)

#### **Markdown Module** (`src/modules/markdown/`)
- **Bidirectional Conversion**: Markdown ↔ HTML via Remark/Rehype pipeline
- **CriticMarkup Support**: `{++addition++}`, `{--deletion--}`, `{~~old~>new~~}`, `{>>comment<<}`, `{==highlight==}`
- **Features**: GFM enabled, HTML sanitization, plain text extraction

#### **Comments Module** (`src/modules/comments/`)
- **CriticMarkup Parsing**: Extracts comments, highlights, and suggestions from markdown
- **Accept/Reject**: Apply or discard tracked changes

#### **Git Module** (`src/modules/git/`)
- **Multi-Provider Support**: GitHub, GitLab, Gitea, Azure DevOps, Local
- **Flow**: Changes.toCleanMarkdown() → Git.submitReview() → Create/update PR → Push to provider
- **Configuration**: Resolved from document metadata and environment variables

#### **User Module** (`src/modules/user/`)
- **Authentication**: Session management with timeout
- **Permissions**: Role-based (Viewer, Editor, Admin)
- **Persistence**: localStorage-based

### Lua Filter (`_extensions/review/review.lua`)

The Lua filter runs during Quarto rendering to:
1. **Generate Deterministic IDs**: Based on document structure (section path + element type + counter)
2. **Wrap Elements**: Each editable element gets wrapped in `<div data-review-*>` with metadata:
   - `data-review-id`: Unique, stable ID
   - `data-review-type`: Element type (Para, Header, CodeBlock, etc.)
   - `data-review-markdown`: Embedded original markdown content
   - `data-review-level`: Heading level (if applicable)
3. **Metadata Injection**: Loads git config from document metadata, injects CSS/JS

**ID Format**: `review.section-intro.para-1` (prefix.section-path.element-type-counter)

### Type System (`src/types/index.ts`)

**Core Types**:
- **Element**: `{id, content, metadata, sourcePosition}` - Represents a document element
- **Operation**: `{id, type, elementId, timestamp, userId?, data}` - Immutable edit operation
  - Types: `'insert' | 'delete' | 'edit' | 'move'`
  - Data objects: `InsertData`, `DeleteData`, `EditData`, `MoveData`
- **User**: `{id, name, email?, role}` - Viewer, Editor, or Admin
- **Comment**: `{id, elementId, userId, timestamp, content, resolved, type}`

## Key Architectural Patterns

### Operations-Based State
**Why**: Enables undo/redo, who-changed-what tracking, and replay for syncing

**Pattern**:
```typescript
// Every edit becomes an immutable Operation
originalElements + operations[] = currentState
```

Apply operations sequentially to get current state. Enables:
- Efficient undo/redo (push/pop from stacks)
- Change tracking with granular diffs
- Collaborative sync via operation replay

### Stateless UI Design
**Principle**: UI is a pure view layer

```typescript
// BAD: UI managing state
this.state = {...}  // ❌ Breaks undo/redo

// GOOD: Query current state
const current = changes.getCurrentState()  // ✅ Enables undo/redo
```

UI calls methods on modules (e.g., `changes.edit()`), then queries updated state. Never stores state directly.

### Deterministic Element Identification
**Strategy**: IDs based on document structure, not heuristics

```
Quarto Document
  └─ Lua filter generates ID during rendering
     └─ ID stays stable even if content changes
        └─ Perfect for mapping edits to elements
```

Prepared for future translation mapping.

### Module Independence
**Design**: Each module has clean interface, doesn't know about others

```typescript
// Changes module
changes.edit(elementId, newContent)

// UI module
ui.refresh()  // Queries current state

// Git module
git.submitReview(payload)  // Works independently
```

Enables independent testing and future extensions.

## Testing Strategy

### Unit Tests (`tests/unit/`)
- **Framework**: Vitest with jsdom environment
- **Organized by module**: `changes.test.ts`, `markdown.test.ts`, `comments.test.ts`, etc.
- **New Feature Tests**:
  - `change-summary.test.ts` - 37 tests for Change Summary Dashboard
  - `search-find.test.ts` - 39 tests for Search & Find
- **Coverage**: Edge cases include empty data, malformed input, XSS attempts, unicode support

**Running Tests**:
```bash
npm test                           # Run all
npm test -- path/to/test.ts       # Single file
npm test -- --grep "pattern"      # Pattern match
npm run test:ui                   # Vitest dashboard
```

### E2E Tests (`tests/e2e/`)
- **Framework**: Playwright (Chromium, Firefox, WebKit)
- **Scripts**: `verify-markdown-embedding.sh` validates markdown in data attributes

**Running E2E**:
```bash
npm run test:e2e
```

### Test Helpers
- `tests/unit/helpers/test-utils.ts` - Shared mocks and utilities
- Mock Changes module, Markdown module, Git config, etc.

## Build System

### Vite Configuration
- **Input**: `src/main.ts`
- **Output**: `dist/review.js` (ES module format, fully bundled)
- **Features**:
  - Inline all dynamic imports
  - Source maps for debugging
  - ES2020 target

### PostCSS Pipeline
- **Input**: CSS files in `src/styles/`
- **Processors**: Autoprefixer (vendor prefixes) → CSSNano (minification)
- **Output**: `dist/review.css`

### Full Build Flow
```bash
npm run build
  1. npm run type-check      (TypeScript validation)
  2. vite build              (Bundle JS)
  3. npm run docs            (Generate TypeDoc)
  4. npm run build:css       (CSS compilation)
  5. npm run copy-assets     (Copy to _extensions/review/assets/)
```

## CSS Organization

**Structure** (`src/styles/`):
```
base/
  ├── editable.css         # Base element styling
  ├── animations.css       # Transitions
components/
  ├── editor.css           # Milkdown editor
  ├── sidebar.css          # Sidebar styling
  ├── comments-sidebar.css # Comments panel
  ├── toolbar.css          # Toolbar/controls
  ├── dashboard.css        # Change Summary Dashboard
  ├── search-panel.css     # Search & Find panel
tokens/
  ├── colors.css           # Design tokens
  ├── typography.css       # Font/text styles
  ├── spacing.css          # Padding/margins
criticmarkup/
  ├── base.css             # CriticMarkup rendering
responsive/
  └── mobile.css           # Mobile optimizations
```

## Adding New Features

### New Module Pattern
1. Create folder: `src/modules/feature-name/`
2. Create `index.ts` with main class
3. Export from `src/main.ts`
4. Create test file: `tests/unit/feature-name.test.ts`
5. Add to TodoWrite if multi-step

### New UI Component Pattern
1. Create file: `src/modules/ui/component-name.ts`
2. Implement class with `render()` and `refresh()` methods
3. Query state via `changes.getCurrentState()`
4. Call module methods on user action
5. Test in `tests/unit/component-name.test.ts`

### Adding Commands
- Register in `CommandRegistry` (if keyboard shortcut needed)
- Add to toolbar via `UIModule`
- Update docs in `docs/user/KEYBOARD_SHORTCUTS.md`

## Important Files & Locations

### Core Entry Points
- `src/main.ts` - QuartoReview class and module exports
- `src/types/index.ts` - All type definitions
- `src/modules/changes/index.ts` - State management
- `src/modules/ui/index.ts` - Main UI orchestrator

### Configuration
- `tsconfig.json` - TypeScript config with path aliases (@/*, @modules/*, @utils/*)
- `vite.config.ts` - Build configuration
- `vitest.config.ts` - Test environment setup
- `_extensions/review/_extension.yml` - Quarto extension config

### Lua Filter
- `_extensions/review/review.lua` - ID generation and element wrapping

### Example
- `example/` - Sample Quarto document for testing extension

## Data Flow Examples

### User Edits Text
```
1. User double-clicks element
   ↓
2. UIModule.openEditor(elementId)
   ↓
3. Load content: Changes.getElementContent(elementId)
   ↓
4. Initialize Milkdown editor with content
   ↓
5. User edits, clicks Save
   ↓
6. saveEditor() extracts newContent
   ↓
7. Changes.edit(elementId, newContent)
   ├─ Create Operation
   ├─ Store in operations[]
   └─ generateChanges() creates character-level diff
   ↓
8. UIModule.refresh()
   ├─ getCurrentState() applies all operations
   ├─ updateElementDisplay() renders new HTML
   └─ Update CriticMarkup visualization
```

### User Saves Document
```
1. User clicks "Save Document"
   ↓
2. QuartoReview.save()
   ↓
3. Changes.toCleanMarkdown()
   ├─ Applies all operations
   └─ Strips all CriticMarkup
   ↓
4. Git.submitReview(payload)
   ├─ Creates commit with summary
   ├─ Creates/updates pull request
   └─ Pushes to provider (GitHub, GitLab, Gitea, etc.)
```

### User Undoes Changes
```
1. User clicks Undo button
   ↓
2. Changes.undo()
   ├─ Pop from operations[]
   └─ Push to redoStack[]
   ↓
3. UIModule.refresh()
   ├─ getCurrentState() (now without that operation)
   └─ Display updated document
```

## Performance Considerations

- **Single-Render Model**: Avoids expensive re-renders of full document
- **In-Memory Operations**: All edits are fast, no network needed
- **Efficient DOM Updates**: Only update changed elements
- **localStorage Caching**: Editor state persists between sessions
- **Debounced Search**: 150ms debounce on search input prevents excessive re-renders
- **requestAnimationFrame**: Smooth UI updates with proper timing

## Security

- **HTML Sanitization**: Markdown-it configured for safe rendering
- **XSS Prevention**:
  - `escape_html()` in Lua filter
  - `escapeHtml()` utility in UI
  - HTML escaping in all user-facing strings
- **Git Authentication**: Tokens stored securely, support for header/cookie/PAT modes
- **Permission Checks**: User module enforces role-based access control

## Debugging

### Enable Debug Logging
```typescript
// In document metadata or config
{
  debug: {
    enabled: true,
    modules: ['changes', 'ui', 'git'],  // Specific modules or []
    level: 'debug'  // 'trace' | 'debug' | 'info' | 'warn' | 'error'
  }
}
```

### Using Debug Module (`src/utils/debug.ts`)
```typescript
import { createDebugger } from '@utils/debug'

const debug = createDebugger('my-module')
debug.log('Message')
debug.warn('Warning')
debug.error('Error')
```

## Common Tasks

### Adding a New Test
```bash
# Create test file
touch tests/unit/feature.test.ts

# Run single test
npm test -- tests/unit/feature.test.ts

# Run with grep pattern
npm test -- --grep "pattern"
```

### Building for Production
```bash
npm run build
# Outputs to dist/ and copies to _extensions/review/assets/
```

### Type Checking Before Commit
```bash
npm run type-check
npm run lint
```

### Testing with Quarto
```bash
# Build the extension
npm run build

# Use in a Quarto document
# example/_quarto.yml shows configuration
quarto render example/document.qmd
```

## Related Documentation

- `README.md` - User-facing features and installation
- `docs/dev/ARCHITECTURE.md` - Detailed system architecture
- `docs/dev/MODULES.md` - Module API reference
- `docs/dev/SETUP.md` - Development environment setup
- `docs/user/FEATURES.md` - User guide to features

## Notes for Future Extensions

- **Translation Mapping**: IDs are deterministic and stable for this purpose
- **Side-by-Side Comparison**: Architecture supports parallel state tracking
- **AI Suggestions**: Hook into `UIModule.openEditor()` for suggestion injection
- **Multi-Format Export**: Use `Changes.getCurrentState()` as data source

