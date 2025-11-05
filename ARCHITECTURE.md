# Quarto Review Extension - Architecture

## Overview

The Quarto Review Extension is a modular system for collaborative document review with in-browser editing capabilities. It follows a **single-render model** where Quarto renders once and all subsequent edits happen in-memory via JavaScript.

## Core Principles

1. **Single-Render**: Quarto renders HTML once; all edits are in-memory
2. **Deterministic IDs**: Structure-based element identification (no heuristics)
3. **Separation of Concerns**: Changes (editing) ≠ Git (persistence)
4. **Stateless UI**: Changes module is the source of truth
5. **Operations-Based**: Track edit operations, not just final state

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Quarto Document                         │
│                       (.qmd file)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  Lua Filter    │
              │ (review.lua)   │◄─── Deterministic ID Generation
              └────────┬───────┘
                       │
                       ▼
              ┌────────────────┐
              │  HTML Output   │
              │ (with data-    │
              │  review-id)    │
              └────────┬───────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌─────────────────┐         ┌──────────────────┐
│  Browser Load   │         │  Extension JS    │
│                 │────────►│  (review.js)     │
└─────────────────┘         └────────┬─────────┘
                                     │
                  ┌──────────────────┴──────────────────┐
                  ▼                                      ▼
         ┌─────────────────┐                  ┌──────────────────┐
         │  UI Module      │                  │  Changes Module  │
         │  (Stateless)    │◄────────────────►│  (State Mgmt)    │
         └────────┬────────┘                  └────────┬─────────┘
                  │                                     │
      ┌───────────┼───────────┐                        │
      ▼           ▼           ▼                        │
┌─────────┐ ┌──────────┐ ┌────────┐                   │
│Markdown │ │Comments  │ │User    │                   │
│Module   │ │Module    │ │Module  │                   │
└─────────┘ └──────────┘ └────────┘                   │
                                                       ▼
                                             ┌──────────────────┐
                                             │  Git Module      │
                                             │  (Persistence)   │
                                             └────────┬─────────┘
                                                      │
                              ┌───────────────────────┼───────────────────┐
                              ▼                       ▼                   ▼
                        ┌──────────┐          ┌──────────┐        ┌──────────┐
                        │ GitHub   │          │ GitLab   │        │  Local   │
                        │ Provider │          │ Provider │   ...  │ Provider │
                        └──────────┘          └──────────┘        └──────────┘
```

## Module Breakdown

### 1. Changes Module (`src/modules/changes/`)

**Purpose**: Core state management for document edits

**Key Concepts**:
- Stores original elements (from Quarto render)
- Maintains operations array (insert, delete, edit, move)
- Reconstructs markdown on-demand
- Provides undo/redo functionality

**Data Flow**:
```
Original Elements + Operations → Current State → Markdown
```

**Operations**:
```typescript
interface Operation {
  id: string;
  type: 'insert' | 'delete' | 'edit' | 'move';
  elementId: string;
  timestamp: number;
  data: OperationData;
}
```

### 2. Markdown Module (`src/modules/markdown/`)

**Purpose**: Bidirectional markdown ↔ HTML conversion

**Features**:
- Uses `markdown-it` for rendering
- Element-specific rendering (headers, code blocks, etc.)
- HTML sanitization (XSS prevention)
- Plain text extraction
- Basic HTML-to-Markdown conversion

### 3. Comments Module (`src/modules/comments/`)

**Purpose**: CriticMarkup parsing and rendering

**CriticMarkup Syntax**:
```markdown
{++addition++}
{--deletion--}
{~~old~>new~~}
{>>comment<<}
{==highlight==}{>>note<<}
```

**Features**:
- Parse CriticMarkup from markdown
- Render as styled HTML
- Accept/reject individual or all changes
- Comment management (CRUD operations)

### 4. Git Module (`src/modules/git/`)

**Purpose**: Version control and persistence

**Architecture**:
```
GitModule (core)
    │
    ├─► isomorphic-git (git operations)
    │
    └─► Providers (API integrations)
        ├─► GitHub
        ├─► GitLab
        ├─► Gitea/Forgejo
        └─► Local
```

**Save Flow**:
```
Changes → .qmd → Git Commit → (Optional) Push to Remote
```

### 5. User Module (`src/modules/user/`)

**Purpose**: Authentication and authorization

**Roles**:
- **Viewer**: Can view and comment
- **Editor**: Can view, comment, and edit
- **Admin**: Full permissions including merge

**Features**:
- Session management with timeout
- localStorage persistence
- Permission checking utilities
- Auto-logout on timeout

### 6. UI Module (`src/modules/ui/`)

**Purpose**: Stateless rendering and interaction

**Key Design**: UI is a **view layer only** - no state

**Components**:
- Click-to-edit interface
- Modal editor with live preview
- Floating toolbar (undo/redo)
- Notifications
- Loading indicators

**Event Flow**:
```
User Click → UI.openEditor() → Show Modal
User Edit → No State Change (just display)
User Save → Changes.edit() → UI.refresh()
```

### 7. Lua Filter (`_extensions/review/review.lua`)

**Purpose**: Deterministic element ID generation

**ID Generation Strategy**:
```lua
-- Example IDs:
"review.para-1"
"review.sec-intro.para-1"
"review.sec-intro.sec-background.header-1"
```

**Structure**:
```
[prefix].[section-path].[element-type]-[counter]
```

**Benefits**:
- Stable across minor edits
- No heuristics (fully deterministic)
- Reconstructable from document structure
- Future-ready for translation mapping

## Data Flow

### Editing Workflow

```
1. Quarto Render
   .qmd → Lua Filter → HTML (with data-review-id)

2. User Opens Page
   HTML → Browser → JS Init → Changes.initializeFromDOM()

3. User Clicks Element
   Element → UI.openEditor(id) → Show Modal

4. User Edits Content
   Textarea → Live Preview (Markdown.render + Comments.renderToHTML)

5. User Saves
   Modal → Changes.edit(id, content) → UI.refresh()

6. User Saves to Git
   Changes.toMarkdown() → Git.save() → Git Commit
```

### Translation Workflow (Future)

```markdown
<!-- document_en.qmd -->
# Introduction {#sec-intro}
First paragraph {#para-1}

<!-- document_fr.qmd -->
# Introduction {#sec-intro}
Premier paragraphe {#para-1}
```

**Mapping**: Explicit IDs ensure 1:1 correspondence between languages.

## Technology Stack

### Frontend
- **TypeScript**: Type safety
- **Vite**: Bundling
- **markdown-it**: Markdown rendering
- **Milkdown**: Rich-text markdown editor (CommonMark + GFM support)

### Git
- **isomorphic-git**: Browser/Node.js git operations
- Provider APIs: GitHub, GitLab, Gitea, etc.

### Testing
- **Vitest**: Unit tests
- **Playwright**: E2E tests

### CI/CD
- **GitHub Actions**: Linting, testing, building, releasing

## Security Considerations

1. **HTML Sanitization**: All user input is sanitized before rendering
2. **Permission Checks**: User module enforces role-based access
3. **Git Authentication**: Tokens stored securely (not in code)
4. **XSS Prevention**: markdown-it configured for safety

## Performance

### Optimizations
- Single-render model (no re-renders needed)
- In-memory operations (fast editing)
- Lazy loading (modules loaded on demand)
- Efficient DOM updates (only changed elements)

### Trade-offs
- Memory: All operations stored in-memory
- Storage: localStorage for session persistence
- Network: Git operations only on explicit save

## Future Enhancements

### Translation Mode
- Side-by-side language view
- Deterministic correspondence mapping
- LLM-powered translation suggestions
- Visual diff between translations

### Features Planned
- Real-time collaboration (WebRTC/WebSockets)
- Conflict resolution UI
- Advanced diff visualization
- Plugin system for custom providers

## Development Workflow

```bash
# Install dependencies
npm install

# Development mode (watch)
npm run dev

# Run tests
npm test
npm run test:e2e

# Lint and format
npm run lint
npm run format

# Build for production
npm run build

# Render example
cd example
quarto render
```

## File Structure

```
quarto-review-extension/
├── src/
│   ├── modules/
│   │   ├── changes/          # State management
│   │   ├── markdown/         # MD ↔ HTML
│   │   ├── comments/         # CriticMarkup
│   │   ├── git/              # Version control
│   │   │   └── providers/    # Git providers
│   │   ├── user/             # Auth/permissions
│   │   └── ui/               # Rendering
│   ├── types/                # TypeScript types
│   └── main.ts               # Entry point
├── _extensions/review/
│   ├── review.lua            # Lua filter
│   ├── _extension.yml        # Config
│   └── assets/               # CSS/JS
├── tests/
│   ├── unit/                 # Vitest tests
│   └── e2e/                  # Playwright tests
├── example/                  # Demo project
└── .github/workflows/        # CI/CD
```

## Contributing

This extension follows:
- **Semantic Versioning**: Major.Minor.Patch
- **Conventional Commits**: feat/fix/docs/etc
- **Test-Driven Development**: Write tests first
- **Code Review**: All PRs require review

## License

MIT
