# CSS Architecture - Quick Reference

This directory contains the modular CSS architecture for the Quarto Review Extension.

## Structure Overview

```
assets/
├── review.css          # Main entry point - import all modules
├── tokens/             # Design system (colors, typography, spacing, effects)
├── base/               # Base styles (editable elements, animations)
├── components/         # UI components (buttons, editor, toolbar, sidebar, etc.)
├── criticmarkup/       # Tracked changes styling
└── responsive/         # Mobile/tablet responsive styles
```

## Finding Styles

### By Feature

| Feature | File |
|---------|------|
| Buttons | `components/buttons.css` |
| Editor (modal) | `components/editor.css` |
| Inline editor + toolbar | `components/toolbar.css` |
| Main sidebar | `components/sidebar.css` |
| Comments sidebar | `components/comments-sidebar.css` |
| Comment composer | `components/comment-composer.css` |
| Comment items/badges | `components/comment-items.css` |
| Right-click menu | `components/context-menu.css` |
| Command palette | `components/command-palette.css` |
| Change dashboard | `components/dashboard.css` |
| Find panel | `components/search-panel.css` |
| Notifications | `components/notifications.css` |
| Tracked changes | `criticmarkup/base.css`, `criticmarkup/prosemirror.css` |

### By Category

**Design Tokens (modify these for theming)**
- `tokens/colors.css` - All colors including dark mode
- `tokens/typography.css` - Font families
- `tokens/spacing.css` - Border radius
- `tokens/effects.css` - Shadows, transitions, z-index

**Base Styles**
- `base/editable.css` - Editable element styling
- `base/animations.css` - All @keyframes animations

**Responsive**
- `responsive/mobile.css` - All media queries

## Adding New Styles

### Option 1: Add to Existing Component
If you're styling a feature that already exists, add rules to the appropriate file.

Example: Adding a button variant
```css
/* In components/buttons.css */
.review-btn-danger {
  background-color: var(--review-color-danger);
  color: #fff;
}
```

### Option 2: Create New Component File
For new features, create a new file in `components/`:

```css
/* components/new-feature.css */
.review-new-feature {
  /* Your styles here */
}
```

Then import it in `review.css`:
```css
@import './components/new-feature.css';
```

## Design Tokens

Always use design tokens for consistency:

```css
/* Colors */
var(--review-color-primary)
var(--review-color-danger)
var(--review-color-success)
var(--review-color-warning)

/* Typography */
var(--review-font-family-sans)
var(--review-font-family-mono)

/* Spacing */
var(--review-radius-sm)
var(--review-radius-md)
var(--review-radius-lg)

/* Effects */
var(--review-shadow-sm)
var(--review-shadow-md)
var(--review-shadow-lg)
var(--review-transition-fast)
var(--review-transition-medium)
var(--review-transition-slow)
```

## Dark Mode

Dark mode is automatically applied via `@media (prefers-color-scheme: dark)` in `tokens/colors.css`.

Variables that change in dark mode:
- `--review-color-surface`
- `--review-color-surface-alt`
- `--review-color-border`
- `--review-color-muted`
- `--review-color-subtle`
- `--review-color-shadow`

## File Size Reference

| File | Lines | Purpose |
|------|-------|---------|
| `review.css` | 62 | Main entry, documentation |
| `tokens/colors.css` | 56 | Color palette |
| `tokens/typography.css` | 10 | Fonts |
| `tokens/spacing.css` | 15 | Radius |
| `tokens/effects.css` | 20 | Shadows, transitions |
| `base/editable.css` | 71 | Editable elements |
| `base/animations.css` | 78 | Keyframes |
| `components/buttons.css` | 72 | Buttons |
| `components/editor.css` | 59 | Modal editor |
| `components/toolbar.css` | 244 | Toolbars |
| `components/sidebar.css` | 175 | Main sidebar |
| `components/comments-sidebar.css` | 71 | Comments panel |
| `components/comment-composer.css` | 60 | Composer |
| `components/comment-items.css` | 161 | Comment cards |
| `components/context-menu.css` | 40 | Context menu |
| `components/command-palette.css` | 246 | Palette/search |
| `components/dashboard.css` | 338 | Dashboard |
| `components/search-panel.css` | 208 | Find panel |
| `components/notifications.css` | 53 | Notifications |
| `criticmarkup/base.css` | 55 | Tracked changes |
| `criticmarkup/prosemirror.css` | 192 | Editor-specific |
| `responsive/mobile.css` | 84 | Responsive |

## Tips

1. **Keep selector specificity low** - Use class selectors, avoid deeply nested selectors
2. **Use CSS custom properties** - Makes dark mode and theming easier
3. **Mobile first** - Use `@media` in `responsive/mobile.css`
4. **Component isolation** - Keep component styles in their own files
5. **Reusable utilities** - Small, single-purpose classes (`.review-hover`, etc.)

## PostCSS Integration

PostCSS has been integrated into the build pipeline to optimize CSS:

### Build Commands

```bash
# Production build (minified, ~26% smaller)
npm run build:css

# Development build (with source maps for debugging)
npm run build:css:dev

# Full build (includes CSS optimization)
npm run build
```

### Output

- **Development**: `dist/review.css` + `dist/review.css.map` (77 KB + 88 KB map)
- **Production**: `dist/review.css` (57 KB minified)

### What PostCSS Does

1. **Flattens @import statements** - Combines all module CSS into one file
2. **Adds vendor prefixes** - Ensures browser compatibility
3. **Minifies CSS** - Reduces file size by ~26% in production
4. **Generates source maps** - Enables debugging in DevTools

### Workflow

When developing:
1. Edit CSS files in `_extensions/review/assets/`
2. Run `npm run build:css:dev` to rebuild with source maps
3. Browser DevTools will show original file/line numbers
4. Changes are ready to test immediately

For deployment:
1. Run `npm run build` (full build including CSS)
2. Optimized CSS is automatically generated
3. Deploy `_extensions/review/assets/dist/review.css`

See [POSTCSS_GUIDE.md](../../POSTCSS_GUIDE.md) for detailed documentation.

## Future Enhancements

The modular structure is also ready for:
- SCSS/SASS preprocessing (variables, mixins, nesting)
- CSS Modules (component-scoped styles)
- CSS-in-JS integration (if needed)

PostCSS config can be extended to add more plugins as needed.

---

**Last updated**: October 2024
**Status**: Production ready - PostCSS integrated, all tests passing ✅
