# Module Documentation

## Overview

Each module is a self-contained system with clear responsibilities. All modules are fully documented with JSDoc comments that are automatically extracted into API documentation during the build process.

## Core Modules

### changes/ - Change Tracking System
**File:** `src/modules/changes/index.ts`

Manages all document changes as immutable operations.

**Key Classes:**
- `ChangesModule` - Main change tracking system
  - `edit(elementId: string, content: string)` - Edit an element
  - `insert(content: string, metadata: ElementMetadata, options?: InsertOptions)` - Insert new element
  - `delete(elementId: string)` - Delete an element
  - `getCurrentState()` - Get current document state
  - `getOperations()` - Get operation history
  - `undo()` - Undo last operation
  - `redo()` - Redo last undone operation

**Key Interfaces:**
- `Operation` - Represents a single change
- `DocumentElement` - Element with metadata and content
- `ElementMetadata` - Element type and properties

**See also:** Generated API docs (build time)

---

### comments/ - CriticMarkup Utilities
**File:** `src/modules/comments/index.ts`

Parses CriticMarkup tokens and provides helpers to accept or reject tracked changes.

**Key Classes:**
- `CommentsModule`
  - `parse(markdown: string)` - Return structured `CriticMarkupMatch` entries with type and offsets
  - `renderToHTML(markdown: string)` - Convert CriticMarkup to styled HTML spans for display
  - `accept(markdown: string, match: CriticMarkupMatch)` / `reject(...)` - Resolve a single tracked edit
  - `acceptAll(markdown: string)` / `rejectAll(markdown: string)` - Resolve all tracked edits in a string

**Key Interfaces:**
- `CriticMarkupMatch` - Match metadata including content, optional replacements, and ranges

**Supported Markup:**
- `{++text++}` - Addition
- `{--text--}` - Deletion
- `{~~old~>new~~}` - Substitution
- `{>>comment<<}` - Comment annotation
- `{==text==}{>>note<<}` - Highlight with optional annotation

---

### markdown/ - Markdown Processing
**File:** `src/modules/markdown/index.ts`

Converts markdown to HTML and extracts plain text.

**Key Classes:**
- `MarkdownModule` - Markdown processor
  - `renderSync(markdown: string)` / `render(markdown: string)` - Convert markdown to HTML (CriticMarkup on by default)
  - `renderInline(markdown: string)` - Inline rendering without paragraph wrappers
  - `renderElement(content: string, type: string, level?: number)` - Element-aware rendering (headers, code blocks, etc.)
  - `parseToAST(markdown: string)` / `toPlainText(markdown: string)` - Structured parsing helpers
  - `setEnableCriticMarkup(enabled: boolean)` / `setAllowRawHtml(allow: boolean)` - Runtime configuration toggles
  - `getOptions()` / `updateOptions()` - Inspect and update markdown configuration

**Features:**
- Support for CommonMark + GFM features
- CriticMarkup parsing with generated HTML spans for tracked changes
- Safe HTML rendering (XSS prevention) by default with opt-in raw output
- Cached renderer/AST processor for improved performance on repeated calls

---

### ui/ - User Interface Components
**File:** `src/modules/ui/`

User interface components and interactions.

#### UI Submodules:

**change-summary.ts - Change Summary Dashboard**
- `ChangeSummaryDashboard` - Statistics and analytics UI
  - `calculateSummary()` - Aggregate change statistics
  - `renderDashboard()` - Create dashboard component
  - `getChangesList()` - List all changes
  - `jumpToElement(elementId)` - Navigate to element
  - `exportSummary()` - Export as markdown

**search-find.ts - Search & Find**
- `DocumentSearch` - Browser-like search functionality
  - `openSearchPanel()` - Open search UI
  - `closeSearchPanel()` - Close search
  - `performSearch()` - Execute search query
  - `findMatches(options)` - Find matching text
  - `nextMatch()` - Navigate to next match
  - `previousMatch()` - Navigate to previous match

---

### git/ - Git Persistence
**File:** `src/modules/git/index.ts`

Persists changes to git repositories.

**Key Classes:**
- `GitModule` - Git operations
  - `commit(message: string, author: User)` - Commit changes
  - `push()` - Push to remote
  - `pull()` - Pull from remote

---

### user/ - User Authentication
**File:** `src/modules/user/index.ts`

User authentication and permissions.

**Key Classes:**
- `UserModule` - User management
  - `authenticate(credentials)` - Authenticate user
  - `getCurrentUser()` - Get current user
  - `hasPermission(permission)` - Check permission

---

### translation/ - Translation Features (Future)
**File:** `src/modules/translation/`

Translation and side-by-side comparison features.

**Status:** In development

---

## Documentation Standards

All modules follow JSDoc standards for automatic documentation generation:

### Class Documentation

```typescript
/**
 * MyClass - Brief description
 *
 * Longer description explaining the class purpose,
 * usage patterns, and key behaviors.
 *
 * @example
 * ```typescript
 * const instance = new MyClass(config);
 * const result = instance.method();
 * ```
 */
export class MyClass {
  // ...
}
```

### Method Documentation

```typescript
/**
 * Performs an operation
 *
 * Detailed explanation of what this method does,
 * including any side effects or important notes.
 *
 * @param param1 - Description of parameter
 * @param param2 - Description of parameter
 * @returns Description of return value
 * @throws ErrorType - When this error occurs
 *
 * @example
 * ```typescript
 * const result = instance.method(value1, value2);
 * ```
 */
method(param1: Type1, param2: Type2): ReturnType {
  // ...
}
```

### Interface Documentation

```typescript
/**
 * Configuration options for MyClass
 */
export interface MyClassConfig {
  /** Name of the instance */
  name: string;

  /** Optional timeout in milliseconds */
  timeout?: number;
}
```

## Build-Time Documentation Generation

Documentation is automatically generated during the build process using TypeDoc:

```bash
npm run build
# Generates: docs/generated/api/
```

The generated API documentation includes:
- All exported classes and interfaces
- Method signatures and parameters
- Return types and error handling
- Code examples from JSDoc
- Module relationships

## Testing Modules

Each module has comprehensive unit tests:

```bash
# Run tests for all modules
npm run test

# Run tests for specific module
npm run test -- changes.test.ts

# Watch mode
npm run test:watch
```

## Adding New Modules

When creating a new module:

1. Create directory: `src/modules/your-module/`
2. Create index.ts with exports
3. Add JSDoc comments to all public APIs
4. Create tests: `tests/unit/your-module.test.ts`
5. Update this documentation
6. Run `npm run test` to verify
7. Run `npm run build` to generate docs

## Module Dependencies

```
main.ts
├── UIModule (src/modules/ui/)
│   ├── ChangesModule (src/modules/changes/)
│   ├── CommentsModule (src/modules/comments/)
│   ├── MarkdownModule (src/modules/markdown/)
│   └── UserModule (src/modules/user/)
├── GitModule (src/modules/git/)
└── TranslationModule (src/modules/translation/)
```

Modules are decoupled and can be used independently through their public APIs.
- `index.ts` (core UI module) never mutates the `data-review-markdown` attribute when refreshing DOM nodes—the value remains the Lua-filter baseline so backend validation can rely on it. Tests in `src/modules/ui/__tests__/e2e-editor.test.ts` lock this behavior in place.
