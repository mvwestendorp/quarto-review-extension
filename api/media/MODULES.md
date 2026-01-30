# Module Documentation

All modules are self-contained with JSDoc comments auto-extracted to API docs.

## Core Modules

### changes/ - Change Tracking
**File:** `src/modules/changes/index.ts`

Manages document changes as immutable operations.

**Key Methods:**
- `edit(elementId, content)` - Edit element
- `insert(content, metadata, options)` - Insert element
- `delete(elementId)` - Delete element
- `undo()` / `redo()` - History navigation
- `getCurrentState()` - Get document state
- `getOperations()` - Get operation history

### comments/ - CriticMarkup
**File:** `src/modules/comments/index.ts`

Parses and manipulates CriticMarkup.

**Key Methods:**
- `parse(markdown)` - Parse CriticMarkup tokens
- `renderToHTML(markdown)` - Convert to styled HTML
- `accept(markdown, match)` / `reject(...)` - Resolve changes
- `acceptAll(markdown)` / `rejectAll(markdown)` - Bulk operations

**Markup:** `{++add++}`, `{--del--}`, `{~~old~>new~~}`, `{>>comment<<}`, `{==highlight==}`

### markdown/ - Markdown Processing
**File:** `src/modules/markdown/index.ts`

Converts markdown to HTML and plain text.

**Key Methods:**
- `renderSync(markdown)` / `render(markdown)` - To HTML
- `renderInline(markdown)` - Inline rendering
- `renderElement(content, type, level)` - Element-aware
- `toPlainText(markdown)` - Extract plain text
- `setEnableCriticMarkup(enabled)` - Toggle CriticMarkup
- `setAllowRawHtml(allow)` - HTML safety

**Features:** CommonMark + GFM, cached renderer, XSS prevention

### ui/ - User Interface
**File:** `src/modules/ui/`

UI components and interactions.

**Submodules:**

**change-summary.ts:**
- `calculateSummary()` - Aggregate stats
- `renderDashboard()` - Create UI
- `exportSummary()` - Export as markdown

**search-find.ts:**
- `performSearch()` - Execute search
- `nextMatch()` / `previousMatch()` - Navigate
- `openSearchPanel()` / `closeSearchPanel()` - Control UI

### git/ - Git Persistence
**File:** `src/modules/git/index.ts`

**Methods:** `commit()`, `push()`, `pull()`

### user/ - Authentication
**File:** `src/modules/user/index.ts`

**Methods:** `authenticate()`, `getCurrentUser()`, `hasPermission()`

## Documentation Standards

**Class:**
```typescript
/**
 * Brief description
 *
 * @example
 * const instance = new MyClass(config);
 */
export class MyClass {}
```

**Method:**
```typescript
/**
 * What it does
 *
 * @param param1 - Description
 * @returns Description
 * @throws ErrorType - When
 */
method(param1: Type): ReturnType {}
```

## Build Documentation

```bash
npm run build  # Generates docs/generated/api/
```

## Testing

```bash
npm run test                    # All tests
npm run test -- changes.test.ts # Specific module
npm run test:watch              # Watch mode
```

## Adding Modules

1. Create `src/modules/your-module/`
2. Add JSDoc to public APIs
3. Create `tests/unit/your-module.test.ts`
4. Update this doc
5. Run `npm run test && npm run build`

## Module Dependencies

```
main.ts
├── UIModule
│   ├── ChangesModule
│   ├── CommentsModule
│   ├── MarkdownModule
│   └── UserModule
├── GitModule
└── TranslationModule
```

Modules are decoupled with public APIs.
