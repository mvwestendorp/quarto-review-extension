# Documentation Structure & Build Process

This document outlines the reorganized documentation structure and automated documentation generation process for the Quarto Review Extension.

## Overview

Documentation is grouped into the following areas for easier discovery:

1. **Developer Documentation** (`docs/dev/`) - Setup, architecture, and contribution guides
2. **User Documentation** (`docs/user/`) - Feature guides and troubleshooting
3. **Roadmap & Planning** (`docs/todo/`) - Upcoming work and feature plans
4. **Archive** (`docs/archive/`) - Historical implementation notes

## Directory Structure

```
docs/
├── dev/                          # Developer Documentation
│   ├── README.md                # Overview & quick links
│   ├── SETUP.md                 # Development environment setup
│   ├── ARCHITECTURE.md          # System design & concepts
│   ├── MODULES.md               # API & module reference
│   ├── CONTRIBUTING.md          # Code standards & PR guidelines
│   └── CORRESPONDENCE_MAPPING.md# Technical mapping details
│
├── user/                         # User Documentation
│   ├── README.md                # Getting started guide
│   ├── FEATURES.md              # Detailed feature explanations
│   ├── KEYBOARD_SHORTCUTS.md    # Keyboard command reference
│   ├── QUICK_START.md           # Quick start tutorial
│   ├── FAQ.md                   # Frequently asked questions
│   └── TROUBLESHOOTING.md       # Common issues & solutions
│
├── todo/                         # Roadmap & Planning
│   ├── README.md                # Roadmap overview
│   ├── FEATURE_PLAN_06_SIDEBYSIDE.md    # Side-by-side view plan
│   ├── FEATURE_PLAN_12_AI_INTEGRATION.md# AI features plan
│   ├── DELIVERY_SUMMARY.md      # Latest delivery summary
│   └── IMPLEMENTATION_SUMMARY.md# Implementation notes
│
├── generated/                    # Auto-generated (not in git)
│   └── api/                     # TypeDoc API documentation
│       ├── index.html
│       ├── modules/
│       ├── classes/
│       └── interfaces/
│
└── archive/                      # Historical Documentation
    ├── README.md                # Archive index
    ├── BADGE_FIX.md
    ├── UI_FIXES.md
    ├── TEXT_SELECTION_FIX.md
    ├── LIST_ITEM_FIX.md
    └── ... (other fix docs)
```

## Automated Documentation Generation

### TypeDoc Configuration

TypeDoc generates API documentation from JSDoc comments in the source code.

**Configuration File:** `typedoc.json`

Key settings:
- **Entry Point:** `src/main.ts`
- **Output:** `docs/generated/api/`
- **Includes:** All JSDoc comments in source code
- **Excludes:** None (all APIs documented)

### Build Process Integration

Documentation is automatically generated during the build process:

```bash
npm run build
# Steps:
# 1. TypeScript type checking (npm run type-check)
# 2. Vite bundling (vite build)
# 3. API documentation generation (npm run docs)
# 4. Post-build asset copying
```

### Manual Documentation Generation

For development without full build:

```bash
# Generate docs once
npm run docs

# Watch mode - regenerate on code changes
npm run docs:watch
```

**Generated files:** `docs/generated/api/index.html` and related files

## Code Documentation Standards

All public APIs must be documented with JSDoc comments.

### Class Documentation

```typescript
/**
 * MyClass - Brief one-line description
 *
 * Longer multi-line description explaining the class purpose,
 * when to use it, and important concepts.
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
 * Descriptive method name explaining what it does
 *
 * Detailed explanation of the method's behavior, parameters,
 * return value, and any side effects.
 *
 * @param param1 - Description of parameter 1
 * @param param2 - Description of parameter 2 (optional)
 * @returns Description of return value
 * @throws ErrorType - When/why this error is thrown
 *
 * @example
 * ```typescript
 * const result = myMethod(value1, value2);
 * console.log(result);
 * ```
 *
 * @see Related functions or documentation
 */
export function myMethod(param1: Type1, param2: Type2): ReturnType {
  // ...
}
```

### Interface Documentation

```typescript
/**
 * Configuration options for MyClass
 *
 * @example
 * ```typescript
 * const config: MyClassConfig = {
 *   name: "instance",
 *   timeout: 5000
 * };
 * ```
 */
export interface MyClassConfig {
  /** Descriptive name for this instance */
  name: string;

  /** Optional timeout in milliseconds (default: 5000) */
  timeout?: number;

  /** Flag to enable verbose logging */
  debug?: boolean;
}
```

## JSDoc Comment Checklist

For all public APIs, ensure:

- ✅ Brief description (1-2 sentences)
- ✅ Detailed explanation (additional context)
- ✅ `@param` tags for all parameters with descriptions
- ✅ `@returns` tag describing return value
- ✅ `@throws` tag for errors that can be thrown
- ✅ `@example` tag with working code sample
- ✅ `@see` tag for related functionality (if applicable)
- ✅ Inline comments for complex logic

## Navigation & Discovery

### For Developers

**Entry Point:** [Developer Documentation](./docs/dev/README.md)

1. Start with [Setup Guide](./docs/dev/SETUP.md) for development environment
2. Read [Architecture](./docs/dev/ARCHITECTURE.md) for system overview
3. Check [Module Guide](./docs/dev/MODULES.md) for API reference
4. Review [Contributing Guide](./docs/dev/CONTRIBUTING.md) before coding
5. Use [Generated API Docs](./docs/generated/api/) for detailed reference

### For Users

**Entry Point:** [User Documentation](./docs/user/README.md)

1. Start with [Features Guide](./docs/user/FEATURES.md) for overview
2. Check [Keyboard Shortcuts](./docs/user/KEYBOARD_SHORTCUTS.md) for commands
3. See [FAQ](./docs/user/FAQ.md) for common questions
4. Use [Troubleshooting](./docs/user/TROUBLESHOOTING.md) when stuck

### For Planning & Roadmap

**Entry Point:** [Roadmap & Planning](./docs/todo/README.md)

1. Read [Roadmap](./docs/todo/README.md) for release schedule
2. Check feature plans for upcoming features
3. Review delivery summaries for past work

## Documentation Maintenance

### Adding New Documentation

1. **Identify Category:**
   - Developer feature → `docs/dev/`
   - User feature → `docs/user/`
   - Planned feature → `docs/todo/`
   - Historical → `docs/archive/`

2. **Create File:**
   - Use clear, descriptive names
   - Use markdown format
   - Add to appropriate category

3. **Update TOC:**
   - Add link to category README
   - Maintain alphabetical/logical order
   - Include brief description

4. **Add JSDoc Comments:**
   - Document all public APIs
   - Include examples
   - Link to detailed docs

### Updating Existing Documentation

1. Keep content current with code changes
2. Update examples to match actual usage
3. Add deprecation notices for old features
4. Link new features to roadmap
5. Archive obsolete documentation

### Code Documentation Best Practices

- JSDoc comments must stay with code during refactoring
- Update JSDoc when method signatures change
- Add examples when adding new features
- Keep examples in JSDoc working and tested
- Remove JSDoc for private/internal APIs

## CI/CD Integration

### Build Pipeline

The documentation generation is integrated into the build process:

```yaml
Build Steps:
1. Type Check        (npm run type-check)
2. Compile & Bundle  (vite build)
3. Generate Docs     (npm run docs)
4. Copy Assets       (scripts/copy-assets.js)
```

**Failure Handling:**
- If type check fails → Build stops
- If docs generation fails → Build stops
- Failed build = failed CI/CD

### GitHub Actions (Planned)

Automated documentation deployment on commit:

```yaml
1. Type checking
2. Build & test
3. Generate documentation
4. Deploy to docs server
5. Notify on failures
```

## File Organization Summary

| Category | Purpose | Files | Format |
|----------|---------|-------|--------|
| `docs/dev/` | Developer guides & API | 6 files | Markdown + Generated |
| `docs/user/` | User guides & tutorials | 6 files | Markdown |
| `docs/todo/` | Planning & roadmap | 7 files | Markdown |
| `docs/archive/` | Historical notes | 8 files | Markdown |
| `docs/generated/` | Auto-generated API docs | HTML | TypeDoc |

## Getting Started

1. **For Development:**
   ```bash
   # Read setup guide
   open docs/dev/README.md

   # Generate and watch docs
   npm run docs:watch
   ```

2. **For User Help:**
   ```bash
   # Check features guide
   open docs/user/FEATURES.md
   ```

3. **For Planning:**
   ```bash
   # Check roadmap
   open docs/todo/README.md
   ```

## Quick Commands

```bash
# Generate documentation once
npm run docs

# Watch mode (regenerate on changes)
npm run docs:watch

# Full build including docs
npm run build

# View generated API docs
open docs/generated/api/index.html

# Jump to developer docs
open docs/dev/README.md

# Jump to user docs
open docs/user/README.md

# Jump to roadmap
open docs/todo/README.md
```

## Documentation Statistics

- **Developer Docs:** 6 files (architecture, setup, modules, contributing, etc.)
- **User Docs:** 6 files (features, shortcuts, FAQ, troubleshooting, etc.)
- **Roadmap:** 7 files (features, plans, implementation, delivery)
- **Archive:** 8 files (historical implementation notes)
- **Auto-generated:** TypeDoc API reference (generated from JSDoc)

**Total:** 27 markdown files + auto-generated API documentation

## FAQ About Documentation

### Q: Where do I find...?
- **API Reference?** → `docs/generated/api/` (auto-generated from JSDoc)
- **Setup Instructions?** → `docs/dev/SETUP.md`
- **Feature Guide?** → `docs/user/FEATURES.md`
- **Keyboard Shortcuts?** → `docs/user/KEYBOARD_SHORTCUTS.md`
- **Future Features?** → `docs/todo/README.md`
- **Common Issues?** → `docs/user/TROUBLESHOOTING.md`

### Q: How do I update documentation?
- Edit the appropriate markdown file
- Update JSDoc comments in source code
- Run `npm run docs` to regenerate API docs
- Commit changes

### Q: How often is documentation generated?
- Automatically during `npm run build`
- Manually with `npm run docs`
- Watch mode with `npm run docs:watch`

### Q: What if I find wrong documentation?
- Report issue with clear description
- Link to documentation page
- Suggest correction if known
- We'll update promptly!

## References

- [TypeDoc Documentation](https://typedoc.org/)
- [JSDoc Reference](https://jsdoc.app/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Documentation Best Practices](https://documentation.divio.com/)

---

**Last Updated:** October 16, 2025
**Status:** Current ✅
