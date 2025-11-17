# Quarto Review Extension - Comprehensive Codebase Analysis

## Executive Summary

The **Quarto Review Extension** is a sophisticated, feature-rich web application designed to enable collaborative document review with in-browser editing capabilities for Quarto documents. The codebase is well-structured with approximately **16,249 lines of TypeScript**, **6+ Lua modules**, **272 total source files**, and maintains **71% test coverage** with strict TypeScript mode enabled.

---

## 1. CODEBASE STRUCTURE

### 1.1 Directory Organization

```
quarto-review-extension/
├── src/                          # Main TypeScript application (16,249 lines)
│   ├── main.ts                   # Entry point - QuartoReview class initialization
│   ├── modules/                  # 8 core feature modules
│   ├── services/                 # Application services (1,931 lines)
│   ├── types/                    # Core type definitions
│   ├── utils/                    # Utility functions
│   └── version.ts                # Build info injection
│
├── _extensions/                  # Quarto extension files
│   └── review/
│       ├── _extension.yml        # Extension metadata & configuration
│       ├── review.lua            # Original monolithic Lua filter
│       ├── review-modular.lua    # Refactored modular Lua filter
│       ├── lib/                  # Modularized Lua utility libraries
│       │   ├── config.lua
│       │   ├── element-wrapping.lua
│       │   ├── markdown-conversion.lua
│       │   ├── path-utils.lua
│       │   ├── project-detection.lua
│       │   └── string-utils.lua
│       └── assets/               # Compiled CSS & compiled JS
│           ├── review.css        # Master CSS file
│           ├── components/       # Component-specific styles
│           ├── tokens/           # Design tokens
│           ├── responsive/       # Mobile/responsive styles
│           └── criticmarkup/     # CriticMarkup-specific styles
│
├── tests/                        # Comprehensive test suite (272 files)
│   ├── unit/                     # Unit tests (TypeScript)
│   ├── integration/              # Integration tests
│   ├── e2e/                      # End-to-end tests (Playwright)
│   └── lua/                      # Lua filter tests
│
├── docs/                         # Documentation
│   ├── dev/                      # Developer documentation
│   ├── user/                     # User documentation
│   └── todo/                     # Roadmap and planning
│
├── scripts/                      # Build and utility scripts
│   ├── build-css.js             # PostCSS pipeline for CSS
│   ├── inject-build-info.js     # Build metadata injection
│   ├── copy-assets.js           # Asset copying
│   ├── check-complexity.js      # Code complexity analysis
│   ├── quality-report.js        # Quality metrics reporting
│   └── serve-example.mjs        # Local development server
│
├── backend-example/              # Example backend integration
│   └── databricks-app/          # Databricks authentication example
│
├── Configuration Files
│   ├── package.json             # Dependencies & npm scripts
│   ├── tsconfig.json            # TypeScript configuration (strict mode)
│   ├── vite.config.ts           # Vite build configuration
│   ├── vitest.config.ts         # Test framework configuration
│   ├── playwright.config.ts     # E2E test configuration
│   ├── eslint.config.js         # Code linting rules
│   ├── .prettierrc.json         # Code formatting rules
│   ├── postcss.config.js        # CSS processing configuration
│   └── typedoc.json             # API documentation config
│
├── GitHub Actions
│   └── .github/workflows/
│       ├── ci.yml               # Continuous integration pipeline
│       ├── pr-preview.yml       # PR preview generation
│       ├── publish-extension-bundle.yml
│       ├── release.yml          # Release automation
│       └── review-sync.yml      # Sync automation

└── Root-level Files
    ├── README.md                # User-facing documentation
    ├── REFACTORING_ROADMAP.md   # Planned improvements
    ├── CHANGELOG.md             # Release notes
    ├── PLAYWRIGHT_E2E_TESTING.md # Test documentation
    └── LICENSE (MIT)
```

### 1.2 Module Architecture

#### Core Modules (in `src/modules/`)

| Module | Purpose | Key Classes | Files |
|--------|---------|-------------|-------|
| **changes** | In-memory operations tracking and reconstruction | `ChangesModule`, `ChangesExtensionRegistry` | 8 files |
| **markdown** | Markdown-to-HTML conversion using Remark/Unified | `MarkdownModule`, `MarkdownRenderer` | 4 files |
| **comments** | CriticMarkup parser and comment management | `CommentsModule` | 1 file |
| **git** | Git provider integration (GitHub, GitLab, Gitea, etc.) | `GitModule`, `GitIntegrationService` | 20+ files |
| **user** | Authentication and user management | `UserModule`, `HeaderProvider` | 4 files |
| **ui** | Editor, UI components, and interaction orchestration | `UIModule`, `EditorLifecycle`, `MilkdownEditor` | 85+ files |
| **translation** | Multi-language translation with ML models | `TranslationModule`, `TranslationEngine` | 40+ files |
| **storage** | Local persistence and draft management | `LocalDraftPersistence` | 2 files |
| **export** | QMD file export (clean & critic formats) | `QmdExportService` | 1 file |

#### Application Services (in `src/services/`)

| Service | Responsibility |
|---------|-----------------|
| `EditorManager` | Editor lifecycle and instance management |
| `StateStore` | Centralized UI state management |
| `NotificationService` | User notifications and feedback |
| `LoadingService` | Loading state and indicators |
| `PersistenceManager` | Draft persistence orchestration |
| `GlobalConfigStorage` | Global configuration for multi-page projects |

### 1.3 Type System

**Location:** `src/types/index.ts` (comprehensive type definitions)

Core types include:
- `Element` - Document elements with metadata
- `Operation` - Change operations (insert, delete, edit, move)
- `Comment` - Comment/annotation data
- `User` - User identity and permissions
- `ElementMetadata` - Rich metadata for each element
- `UserAuthConfig` - Authentication configuration
- `ReviewGitConfig` - Git provider configuration

---

## 2. MAIN COMPONENTS & RESPONSIBILITIES

### 2.1 Entry Point: QuartoReview Class

**File:** `src/main.ts` (435 lines)

The `QuartoReview` class is the main public API:

```typescript
new QuartoReview(config?: QuartoReviewConfig)
```

**Key Responsibilities:**
1. **Initialization** - Orchestrates all module initialization
2. **Configuration Management** - Handles user config merging
3. **Auto-save Setup** - Registers persistence extensions
4. **Lazy Module Loading** - Dynamically imports translation module
5. **Public API** - Exposes `save()`, `undo()`, `redo()`, `destroy()`

**Configuration Options:**
- `autoSave` - Enable automatic persistence
- `autoSaveInterval` - Save interval in ms
- `enableComments` - Enable comment features
- `enableTranslation` - Enable translation support
- `gitProvider` - Git backend selection
- `debug` - Debug logging configuration

### 2.2 Changes Module (Operation Tracking)

**Files:** `src/modules/changes/*.ts`

**Purpose:** Track all document edits as operations, enabling undo/redo and change visualization

**Key Classes:**
- `ChangesModule` - Main orchestrator
  - `initializeFromDOM()` - Parse HTML elements
  - `recordEdit()` - Record edit operations
  - `toCleanMarkdown()` - Export without CriticMarkup
  - `toCriticMarkup()` - Export with change annotations
  - `undo()` / `redo()` - History management

**Extension System:**
- `ChangesExtensionRegistry` - Plugin architecture for extending behavior
- Events: `beforeOperation`, `afterOperation`
- Used by translation and persistence modules

### 2.3 UI Module (Editor & Rendering)

**Files:** `src/modules/ui/` (85+ files, ~2,500+ lines)

**Purpose:** Manage editor lifecycle, rendering, and user interactions

**Major Components:**

1. **Editor** (`editor/MilkdownEditor.ts`)
   - Milkdown-based WYSIWYG editor
   - Inline editing within document elements
   - Keyboard shortcuts and command registry
   - Undo/redo integration
   - CriticMarkup support

2. **Sidebars**
   - `UnifiedSidebar` - Unified sidebar for comments, changes, TOC
   - `ContextMenuCoordinator` - Right-click context menus
   - `SegmentActionButtons` - Edit/delete actions

3. **Comments** (`comments/`)
   - `CommentComposer` - Add new comments
   - `CommentController` - Comment management
   - `CommentBadges` - Visual indicators
   - CriticMarkup parsing and rendering

4. **Features**
   - `ChangeSummaryDashboard` - Statistics and analytics
   - `search-find.ts` - Cmd+F / Ctrl+F search functionality
   - `toc-builder.ts` - Table of contents generation
   - `keyboard-shortcuts.ts` - Keyboard bindings

5. **Translation UI** (`translation/`)
   - `TranslationController` - Translation workflow
   - `TranslationEditorBridge` - Editor integration
   - `TranslationToolbar` - Translation controls
   - `TranslationSettings` - Configuration UI

### 2.4 Git Module (Version Control Integration)

**Files:** `src/modules/git/*.ts` (20+ files, ~1,000+ lines)

**Purpose:** Save changes to git repositories with multi-provider support

**Key Components:**

1. **Core**
   - `GitModule` - Main orchestrator
   - `GitConfigError`, `GitError` - Error handling
   - `config.ts` - Configuration resolution

2. **Providers** (Adapter Pattern)
   - `BaseProvider` - Abstract provider interface
   - `github.ts` - GitHub API integration
   - `gitlab.ts` - GitLab API integration
   - `gitea.ts` - Gitea API integration
   - `azure-devops.ts` - Azure DevOps
   - `local.ts` - Local filesystem (fallback)

3. **Services**
   - `GitIntegrationService` - Workflow coordination
   - `GitReviewService` - PR/MR creation

4. **Fallback**
   - `EmbeddedSourceStore` - Embedded project sources for offline access
   - `FallbackPersistence` - Fallback storage when git unavailable

### 2.5 Translation Module

**Files:** `src/modules/translation/*.ts` (40+ files, ~1,500+ lines)

**Purpose:** Side-by-side translation with deterministic correspondence mapping

**Key Components:**

1. **Core Engine**
   - `TranslationEngine` - Main translation orchestrator
   - `SentenceSegmenter` - Break content into translatable units
   - `CorrespondenceMapper` - Deterministic alignment
   - `alignment-algorithm.ts` - Alignment logic

2. **Providers** (ML/API backends)
   - `ProviderRegistry` - Provider management
   - `openai.ts` - OpenAI API
   - `local-ai.ts` - Local ML models (@xenova/transformers)
   - `manual.ts` - Manual translation
   - `MockHTTPProvider` - Testing

3. **Storage & State**
   - `TranslationPersistence` - Storage layer
   - `TranslationState` - Immutable state
   - `TranslationCacheService` - Caching layer

4. **Export**
   - `SeparatedExporter` - Side-by-side format
   - `UnifiedExporter` - Unified document format

5. **Changes Integration**
   - `TranslationChangeAdapter` - Bridges changes module with translation
   - Translates when source changes

### 2.6 Markdown Module

**Files:** `src/modules/markdown/*.ts` (4 files)

**Purpose:** Convert Markdown to HTML with CriticMarkup support

**Key Classes:**
- `MarkdownModule` - Main orchestrator
- `MarkdownRenderer` - Rendering logic
- `remark-criticmarkup.ts` - CriticMarkup plugin
- `sanitize.ts` - HTML sanitization for security

**Supports:**
- GitHub Flavored Markdown (GFM)
- CriticMarkup annotations
- Table parsing
- Code block syntax highlighting

### 2.7 Comments Module

**Files:** `src/modules/comments/index.ts` (single file)

**Purpose:** Manage CriticMarkup-based comments and annotations

**CriticMarkup Patterns:**
```markdown
{++ addition ++}
{-- deletion --}
{~~ old ~> new ~~}
{>> comment <<}
{== highlight ==}{>> comment <<}
```

### 2.8 Export Service

**Files:** `src/modules/export/index.ts`

**Purpose:** Export documents in multiple formats

**Export Formats:**
- **Clean** - Remove all change annotations
- **Critic** - Keep CriticMarkup annotations

**Multi-page Support:**
- Detects page prefixes from element IDs
- Exports all pages as separate files
- Creates ZIP archive for multiple files

### 2.9 User Module (Authentication)

**Files:** `src/modules/user/*.ts` (4 files)

**Purpose:** User identification and permission management

**Auth Modes:**
1. **oauth2-proxy** - Header-based authentication (reverse proxy)
2. **databricks-app** - Databricks API integration
3. **manual** - Programmatic login
4. **none** - No authentication

**Features:**
- Permission-based access control
- User profile management
- Configurable user headers

### 2.10 Lua Filters (Pandoc/Quarto Integration)

**Files:** `_extensions/review/*.lua` (2 main files + 6 libraries)

**Purpose:** Add deterministic IDs and metadata to document elements during Quarto rendering

**Key Functions:**

1. **Element ID Generation**
   - Hierarchical ID structure: `{filename}.{section}.{element_type}-{counter}`
   - Deterministic and unique across document

2. **Element Metadata Injection**
   - `data-review-id` - Unique identifier
   - `data-review-type` - Element type (Para, Header, etc.)
   - `data-review-markdown` - Original markdown content
   - `data-review-source-file` - Source file for multi-page docs

3. **Module Libraries** (in `lib/`)
   - `config.lua` - Configuration loading
   - `element-wrapping.lua` - Element wrapper generation
   - `markdown-conversion.lua` - Markdown conversion
   - `path-utils.lua` - Cross-platform path handling
   - `project-detection.lua` - Project root detection
   - `string-utils.lua` - String utilities

4. **Features**
   - Cross-platform path handling (Windows/Unix)
   - Project root auto-detection
   - Multi-page document support
   - Embedded project source collection
   - Extension path calculation for nested documents

---

## 3. PROGRAMMING LANGUAGES

### 3.1 Language Distribution

| Language | Usage | Key Files | Purpose |
|----------|-------|-----------|---------|
| **TypeScript** | Primary (16,249 lines) | `src/**/*.ts` | Core application logic, UI, modules |
| **Lua** | Secondary (~1,500 lines) | `_extensions/review/**/*.lua` | Quarto filter, element wrapping |
| **CSS** | Styling (~2,000+ lines) | `_extensions/review/assets/**/*.css` | Component styles, design tokens |
| **JavaScript** | Build/Config (1,000+ lines) | `scripts/*.js`, `*.config.js` | Build automation, configuration |
| **Markdown** | Documentation | `docs/**/*.md`, `README.md` | User and developer documentation |
| **YAML** | Config | `.github/workflows/*.yml`, `_extension.yml` | GitHub Actions, extension metadata |
| **JSON** | Config/Data | `package.json`, `tsconfig.json`, etc. | Configuration files |

### 3.2 TypeScript Specifics

**Configuration:** `tsconfig.json`
- **Target:** ES2020
- **Module System:** ESNext
- **Strict Mode:** Enabled (all strict flags)
- **Declaration Maps:** Enabled for debugging
- **Source Maps:** Enabled
- **Path Aliases:** `@/*`, `@modules/*`, `@utils/*`

**Quality Standards:**
- 100% strict TypeScript mode
- Type-checked before build
- No implicit any types
- Full type coverage in exports

### 3.3 Build Pipeline

```
TypeScript Source (src/)
    ↓
[Type Checking - tsc --noEmit]
    ↓
[ESLint Linting]
    ↓
[Prettier Formatting]
    ↓
[Vite Build - esbuild minification]
    ↓
[Dynamic Imports - code splitting]
    ↓
dist/review.js (~500 KB max)
    ↓
[PostCSS Build - CSS]
    ↓
_extensions/review/assets/
    ├── review.js (compiled)
    ├── review.css (minified)
    └── [asset files]
```

---

## 4. ENTRY POINTS & APPLICATION FLOW

### 4.1 Primary Entry Point: Browser-side

**Flow:**

1. **Quarto Rendering** (Lua Filter)
   ```
   QMD File
   ↓
   [Pandoc/Quarto]
   ↓
   [Lua Filter - review.lua / review-modular.lua]
   ├─ Assigns deterministic IDs to elements
   ├─ Adds data-review-* attributes
   ├─ Injects CSS in header
   └─ Injects JS + config in body
   ↓
   HTML Output
   ```

2. **Browser Initialization** (`main.ts`)
   ```
   HTML Loaded
   ↓
   [DOMContentLoaded Event]
   ↓
   [Find data-review element]
   ↓
   [Parse data-review-config JSON]
   ↓
   [new QuartoReview(config)]
   ↓
   QuartoReview instance initialized
   ```

3. **QuartoReview Constructor Flow**
   ```
   new QuartoReview()
   ├─ Initialize config (merge user + defaults)
   ├─ Set debug logger config
   ├─ Create ChangesModule
   ├─ Create MarkdownModule
   ├─ Create CommentsModule
   ├─ Create UserModule (with auth config)
   ├─ Create GitModule (with git config)
   ├─ Create LocalDraftPersistence
   ├─ Create QmdExportService
   ├─ Create GitReviewService (if git enabled)
   ├─ [Lazy Load] TranslationModule (async)
   ├─ Create UIModule (all modules connected)
   └─ Call initialize()
   ```

4. **Initialization Phase** (`initialize()` method)
   ```
   changes.initializeFromDOM()
   ├─ Parse all data-review-id elements
   ├─ Extract original content
   ├─ Restore any saved operations
   └─ Build element registry
   ↓
   initializeOAuth2ProxyAuth()
   ├─ Check auth headers if oauth2-proxy mode
   └─ Auto-login user
   ↓
   ui.updateUserDisplay()
   ↓
   translation.initialize() (if enabled)
   ├─ Load translation models
   └─ Initialize providers
   ↓
   ui.attachEventListeners()
   ├─ Click handlers for editable elements
   ├─ Keyboard shortcuts
   ├─ Comment handlers
   └─ Search/find handlers
   ↓
   setupAutoSave()
   ├─ Register persistence extension
   ├─ Add beforeunload handler
   └─ Schedule periodic saves
   ↓
   ui.refresh()
   ├─ Render all UI components
   ├─ Update sidebars
   └─ Display change summary
   ```

### 4.2 User Interaction Flow: Editing

```
User clicks on editable element
├─ EditorLifecycle.startEdit()
│  ├─ Fetch original markdown from data-review-markdown
│  ├─ Create MilkdownEditor instance
│  └─ Render inline editor
│
├─ User types changes
│  ├─ MilkdownEditor tracks changes
│  └─ Real-time preview updates
│
├─ User submits (Cmd+Enter or close)
│  ├─ Extract new content
│  ├─ Calculate diff (granular character-level)
│  └─ ChangesModule.recordEdit()
│     ├─ Create Operation object
│     ├─ Dispatch beforeOperation extension event
│     ├─ Add to operations array
│     ├─ Dispatch afterOperation extension event
│     ├─ Clear redo stack
│     └─ Set changed=true
│
├─ Auto-save triggered (via RAF)
│  ├─ LocalDraftPersistence.persist()
│  └─ Store to localStorage
│
└─ UI Updates
   ├─ Render CriticMarkup highlighting
   ├─ Update change summary dashboard
   ├─ Add badge to element
   └─ Update sidebar
```

### 4.3 Translation Workflow

```
User clicks "Translate" button
├─ TranslationController.start()
│  ├─ TranslationEngine.translateDocument()
│  │  ├─ For each element:
│  │  │  ├─ SentenceSegmenter.segment()
│  │  │  │  └─ Break into sentences
│  │  │  │
│  │  │  ├─ TranslationProvider.translate()
│  │  │  │  ├─ OpenAI API
│  │  │  │  ├─ Local ML (@xenova/transformers)
│  │  │  │  └─ or Manual entry
│  │  │  │
│  │  │  └─ CorrespondenceMapper.map()
│  │  │     └─ Create deterministic alignment
│  │  │
│  │  └─ Emit translation-complete event
│  │
│  ├─ UIModule renders translation view
│  │  ├─ Side-by-side display
│  │  ├─ Correspondence lines
│  │  └─ Hover highlighting
│  │
│  └─ TranslationPersistence.save()
│     └─ Store to localStorage/indexed db
│
└─ User can switch between views
   ├─ Original
   ├─ Translated
   └─ Side-by-side
```

### 4.4 Export/Submit Flow

```
User clicks "Submit Review"
├─ ReviewSubmissionModal opens
│  ├─ User enters PR title and description
│  └─ Optionally adds auth token
│
├─ User confirms
│  ├─ QmdExportService.export()
│  │  ├─ Select format (clean or critic)
│  │  ├─ For each page:
│  │  │  ├─ Filter operations by page prefix
│  │  │  ├─ Reconstruct markdown
│  │  │  └─ Add to file list
│  │  │
│  │  ├─ Include embedded sources
│  │  └─ Return ExportBundle
│  │
│  ├─ GitReviewService.submit()
│  │  ├─ Create branch
│  │  ├─ Commit changes
│  │  ├─ Push to remote
│  │  └─ Create PR/MR
│  │
│  ├─ Update UI with link
│  └─ Optional: Download ZIP archive
│
└─ Changes marked as saved
```

### 4.5 Git Provider Flow

```
GitModule initialization
├─ resolveGitConfig() - Normalize config
│  ├─ Resolve provider type
│  ├─ Build repository object
│  └─ Setup auth
│
├─ createProvider() - Factory pattern
│  ├─ github.ts for GitHub
│  ├─ gitlab.ts for GitLab
│  ├─ gitea.ts for Gitea
│  ├─ azure-devops.ts for Azure
│  └─ local.ts for local filesystem
│
├─ Provider.authenticate()
│  ├─ PAT (Personal Access Token)
│  ├─ oauth2-proxy headers
│  └─ Embedded token
│
└─ GitIntegrationService
   ├─ Create working branch
   ├─ Commit and push
   └─ Open PR/MR
```

### 4.6 Persistence Flow

```
Changes occur
├─ Auto-save trigger (via RAF)
│  └─ LocalDraftPersistence.persist()
│     ├─ Serialize operations
│     ├─ Store to localStorage
│     └─ Log success/failure
│
├─ Page reload
│  └─ UIModule.restoreFromDraft()
│     ├─ Fetch operations from localStorage
│     ├─ ChangesModule.initializeWithOperations()
│     └─ Reconstruct UI
│
└─ Browser close (beforeunload)
   └─ persist() called to ensure save
```

### 4.7 Event-Driven Architecture

**Extension System Events:**

```
Changes Module Extensions
├─ beforeOperation - Fired before operation recorded
├─ afterOperation - Fired after operation recorded
│
Translation Module (implements ChangesExtension)
├─ Listens for afterOperation
├─ Auto-translates if enabled
└─ Updates translation state

UI Module
├─ Listens for module events
├─ Refreshes display
└─ Updates sidebars

Custom Extensions
├─ Can register via ChangesModule.registerExtension()
└─ Implement ChangesExtension interface
```

---

## 5. BUILD & DEPLOYMENT ARCHITECTURE

### 5.1 Build Process

```
npm run build
├─ npm run prebuild
│  └─ scripts/inject-build-info.js
│     └─ Injects BUILD_INFO (build number, date)
│
├─ npm run type-check
│  └─ tsc --noEmit (no output, just check)
│
├─ vite build
│  ├─ Entry: src/main.ts
│  ├─ Output: dist/review.js (~500 KB)
│  ├─ Code splitting: dynamic imports
│  ├─ Minification: esbuild
│  ├─ Source maps: enabled
│  └─ Declarations: dist/types/main.d.ts
│
├─ npm run docs
│  └─ typedoc
│     └─ Generates API docs from JSDoc
│
├─ npm run build:css
│  └─ scripts/build-css.js
│     ├─ PostCSS pipeline
│     ├─ Flatten @imports
│     ├─ Add vendor prefixes
│     └─ Minify (production only)
│
└─ npm run postbuild
   └─ scripts/copy-assets.js
      └─ Copy dist/review.js → _extensions/review/assets/review.js
         Copy dist/review.css → _extensions/review/assets/review.css
```

### 5.2 CI/CD Pipeline

**GitHub Actions Workflows:**

1. **ci.yml** (on push/PR)
   - ESLint linting
   - Prettier formatting check
   - TypeScript type checking
   - npm audit security check
   - Vitest unit tests
   - Playwright E2E tests
   - Lua tests
   - Build verification
   - Coverage reporting
   - Size limit check

2. **pr-preview.yml** (on PR)
   - Build example project
   - Deploy to GitHub Pages
   - Comment preview link on PR

3. **publish-extension-bundle.yml** (on release)
   - Package extension
   - Upload to Quarto extensions registry

4. **release.yml** (manual trigger)
   - Create GitHub release
   - Bump version
   - Generate changelog

### 5.3 Development Workflow

```
Local Development
├─ npm install
├─ npm run dev
│  └─ vite build --watch (hot reload)
│
├─ npm test
│  └─ vitest (unit tests)
│
├─ npm run test:e2e
│  └─ Playwright browser automation
│
├─ npm run lint
│  └─ ESLint
│
├─ npm run format
│  └─ Prettier
│
└─ npm run quality:check
   ├─ Code complexity
   └─ Security audit
```

---

## 6. KEY ARCHITECTURAL PATTERNS

### 6.1 Modular Design

- Each module has single responsibility
- Modules communicate via well-defined interfaces
- Modules export public API, hide internals

### 6.2 Extension Registry Pattern

- `ChangesExtensionRegistry` - Plugins can hook into changes
- `TranslationModule` implements `ChangesExtension`
- Enables loose coupling between modules

### 6.3 Service Locator Pattern

- `EditorManager`, `StateStore`, `PersistenceManager`
- Centralize service instances
- Reduce dependency injection complexity

### 6.4 Provider/Adapter Pattern

- Git: `BaseProvider` → GitHub/GitLab/Gitea implementations
- Translation: `TranslationProvider` → OpenAI/Local/Manual
- Supports multiple backends with unified interface

### 6.5 State Management

- `StateStore` - Centralized UI state
- `TranslationState` - Immutable translation state
- `LocalDraftPersistence` - Draft persistence

### 6.6 Operation-based Change Tracking

- All changes stored as `Operation` objects
- Enables undo/redo, change visualization, export
- Granular character-level diff tracking

---

## 7. TECHNOLOGY STACK

### Frontend
- **Framework:** Vanilla TypeScript (no React/Vue/Angular)
- **Editor:** Milkdown (headless WYSIWYG)
- **Markdown:** Remark/Unified ecosystem
- **ML/Translation:** @xenova/transformers (browser-side)
- **Testing:** Vitest (unit), Playwright (E2E)

### Build Tools
- **Bundler:** Vite (esbuild)
- **TypeScript:** 5.9 (strict mode)
- **Linting:** ESLint 9
- **Formatting:** Prettier 3
- **CSS Processing:** PostCSS

### Backend Integration
- **Git:** Isomorphic-git (client-side)
- **HTTP:** Fetch API (no external HTTP library)
- **Git Providers:** GitHub, GitLab, Gitea, Azure DevOps

### Quality & Testing
- **Type Safety:** 100% strict TypeScript
- **Test Coverage:** 71%
- **Code Complexity:** Max 15 cyclomatic complexity
- **Bundle Size:** <500 KB

---

## 8. KEY STATISTICS

| Metric | Value |
|--------|-------|
| TypeScript Lines | 16,249 |
| Total Source Files | 272 |
| Core Modules | 8 |
| Services | 6 |
| Exported Types/Classes | 256+ |
| Test Coverage | 71% |
| Git Providers | 5 (GitHub, GitLab, Gitea, Azure, Local) |
| Auth Methods | 4 (oauth2-proxy, Databricks, Manual, None) |
| Export Formats | 2 (Clean, Critic) |
| Translation Providers | 3 (OpenAI, Local ML, Manual) |
| Supported Languages | Configurable (via providers) |

---

## 9. QUALITY & STANDARDS

### Code Quality
- ✓ Strict TypeScript mode enabled
- ✓ ESLint with comprehensive rules
- ✓ Prettier automatic formatting
- ✓ 71% test coverage
- ✓ Max 15 cyclomatic complexity per function
- ✓ 150 lines max per function

### Security
- ✓ npm audit (no high/critical vulnerabilities)
- ✓ HTML sanitization for safety
- ✓ XSS prevention in CriticMarkup parser
- ✓ Secure auth token handling

### Performance
- ✓ <500 KB bundle size limit
- ✓ Dynamic code splitting (translation lazy-loaded)
- ✓ Efficient DOM updates
- ✓ Debounced search/persistence

### Testing
- ✓ Unit tests (Vitest)
- ✓ Integration tests
- ✓ E2E tests (Playwright)
- ✓ Lua filter tests
- ✓ Performance tests

---

## 10. KNOWN ARCHITECTURAL CONSIDERATIONS

### Areas Identified for Future Refactoring

1. **UIModule Decomposition** (~2,500 lines)
   - Plan: Split into 5 focused classes
   - Effort: 40-60 hours

2. **TranslationModule Size** (~1,500 lines)
   - Plan: Extract persistence, state, and UI bridges
   - Effort: 20-30 hours

3. **Git Provider Integration**
   - Consider: More granular error handling
   - Consider: Unified auth interface

### Design Strengths

- ✓ Clear separation of concerns
- ✓ Extensible via registry pattern
- ✓ Comprehensive type safety
- ✓ Well-tested core functionality
- ✓ Modular CSS architecture
- ✓ Cross-platform Lua implementation

