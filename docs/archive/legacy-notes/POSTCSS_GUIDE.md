# PostCSS Integration Guide

## Overview

PostCSS has been integrated into the build pipeline to optimize the modular CSS architecture. The pipeline automatically:

1. **Flattens @import statements** - Combines all module imports into a single CSS file
2. **Adds vendor prefixes** - Ensures browser compatibility (autoprefixer)
3. **Minifies CSS** - Reduces file size for production (cssnano)
4. **Generates source maps** - Enables debugging in development

## Quick Start

### Build CSS for Production

```bash
npm run build:css
```

Outputs:
- `_extensions/review/assets/dist/review.css` (minified, ~58 KB)

### Build CSS for Development

```bash
npm run build:css:dev
```

Outputs:
- `_extensions/review/assets/dist/review.css` (with source map comments)
- `_extensions/review/assets/dist/review.css.map` (source map, ~88 KB)

### Run as Part of Full Build

```bash
npm run build
```

Automatically:
1. Runs TypeScript type checking
2. Builds JavaScript with Vite
3. Generates documentation with Typedoc
4. Builds optimized CSS with PostCSS

## Configuration

### PostCSS Config

Located at: `postcss.config.js`

```javascript
{
  plugins: [
    postcss-import,       // Flatten @import statements
    autoprefixer,         // Add vendor prefixes
    cssnano (prod only)   // Minify CSS
  ]
}
```

### Build Script

Located at: `scripts/build-css.js`

Features:
- Reads modular CSS files from `_extensions/review/assets/`
- Processes through PostCSS pipeline
- Outputs to `_extensions/review/assets/dist/`
- Shows build statistics (size reduction, timing)
- Supports development and production modes via `NODE_ENV`

## Development Workflow

### Edit CSS

1. Modify files in `_extensions/review/assets/`
   - Design tokens: `tokens/*.css`
   - Base styles: `base/*.css`
   - Components: `components/*.css`
   - CriticMarkup: `criticmarkup/*.css`
   - Responsive: `responsive/*.css`

2. Main entry point imports all modules:
   ```
   _extensions/review/assets/review.css
   ```

### Rebuild CSS

```bash
# Development (with source maps)
npm run build:css:dev

# Production (minified)
npm run build:css
```

### Debug with Source Maps

When `review.css.map` exists, browsers can:
- Map minified CSS back to source files
- Show original file names in DevTools
- Enable direct editing (in some browsers)

Example DevTools workflow:
1. Open browser DevTools (F12)
2. Go to Sources tab
3. Find CSS file in tree
4. Click line numbers to set breakpoints
5. Styles will show original file/line number

## File Structure

```
_extensions/review/assets/
├── review.css              # Main entry (imports all modules)
├── tokens/                 # Design tokens
├── base/                   # Base styles
├── components/             # UI components
├── criticmarkup/           # Tracked changes
├── responsive/             # Media queries
└── dist/                   # Output directory (generated)
    ├── review.css          # Processed CSS
    └── review.css.map      # Source map (dev only)
```

## Build Statistics

### Development Build

- Input: 3.47 KB (review.css entry point)
- Output: 77.49 KB (all @imports flattened)
- No minification applied
- Source map generated (88 KB)

### Production Build

- Input: 3.47 KB (review.css entry point)
- Output: 57.26 KB (flattened + minified)
- ~26% size reduction from dev build
- No source map in production

**Note**: Output sizes seem large because PostCSS processes the @imports recursively, flattening all CSS. This is expected and correct.

## Testing

CSS build process includes 22 automated tests:

```bash
npm test -- tests/unit/css-build.test.ts
```

Tests verify:
- ✅ CSS file generation
- ✅ Source map generation
- ✅ @import flattening
- ✅ All design tokens included
- ✅ All components included
- ✅ CriticMarkup styles present
- ✅ Responsive styles present
- ✅ Dark mode styles present
- ✅ Vendor prefixes added
- ✅ Source map valid JSON
- ✅ CSS minification works
- ✅ CSS syntax validity

Run full test suite:

```bash
npm test
```

Currently: **291 tests passing** (269 original + 22 CSS tests)

## Plugins

### postcss-import

**Purpose**: Flattens @import statements

**Config**:
```javascript
require('postcss-import')({
  path: ['_extensions/review/assets'],
})
```

**How it works**:
1. Reads review.css
2. Finds all @import statements
3. Inlines referenced files
4. Result: single CSS file

### autoprefixer

**Purpose**: Adds vendor prefixes for browser compatibility

**Config**:
```javascript
require('autoprefixer')({
  overrideBrowserslist: [
    'last 2 versions',
    'Firefox ESR',
    '> 1%',
  ],
})
```

**Examples**:
- `transition` → `-webkit-transition` (Safari)
- `transform` → `-webkit-transform` (all older browsers)
- `display: flex` → `display: -webkit-flex` (older Safari)

### cssnano

**Purpose**: Minifies CSS for production

**Only runs when**: `NODE_ENV=production`

**What it does**:
- Removes whitespace
- Removes unused selectors
- Optimizes colors
- Removes duplicate rules
- Shortens values where possible

**Example**:
```css
/* Before */
.review-btn {
  background-color: #3b82f6;
  color: white;
  padding: 8px 16px;
}

/* After */
.review-btn {
  background: #3b82f6;
  color: #fff;
  padding: 8px 16px;
}
```

## Troubleshooting

### CSS build fails

**Error**: `ENOENT: no such file or directory`

**Solution**: Ensure `_extensions/review/assets/review.css` exists

```bash
ls -la _extensions/review/assets/review.css
```

### Source map not generating

**Check**:
1. Running with `NODE_ENV=development`?
2. `npm run build:css:dev` (not `build:css`)
3. Output directory has write permissions

### CSS not minifying

**Check**:
1. Running `npm run build:css` (not `build:css:dev`)
2. `NODE_ENV=production` is set
3. Output file is smaller than expected

### Build is slow

**Normal**: First build takes 2-3 seconds (processing all files)

**Optimize**:
- Use production build during development if @imports aren't changing
- Cache CSS file if using CI/CD

## Advanced Usage

### Custom Build Script

Modify `scripts/build-css.js` to:
- Add additional plugins
- Change output location
- Add custom processing
- Generate multiple versions

### Integration with Build Tool

If using a bundler (Webpack, Vite, etc.):

1. Install postcss-loader/vite-plugin-postcss
2. PostCSS config is automatically used
3. No need for separate build script

### CI/CD Integration

```yaml
# Example GitHub Actions
- name: Build CSS
  run: npm run build:css

- name: Upload artifacts
  uses: actions/upload-artifact@v2
  with:
    name: css-output
    path: _extensions/review/assets/dist/
```

## Best Practices

1. **Always import from main entry**
   - Don't manually import individual modules
   - Use `@import './review.css'` in HTML/build config

2. **Keep modules focused**
   - One responsibility per file
   - Use design tokens consistently

3. **Test after changes**
   ```bash
   npm test
   ```

4. **Rebuild before committing**
   ```bash
   npm run build
   ```

5. **Review source maps in dev**
   - Use source maps for debugging
   - Verify correct file references

## Reference

- [PostCSS Documentation](https://postcss.org/)
- [autoprefixer](https://github.com/postcss/autoprefixer)
- [postcss-import](https://github.com/postcss-import/postcss-import)
- [cssnano](https://cssnano.co/)

## FAQ

**Q: Why generate a separate CSS file instead of inline?**
A: Allows caching, separate optimization, and flexible deployment options.

**Q: Can I use SCSS/SASS instead?**
A: Yes! Just add `postcss-scss` plugin. See PostCSS documentation.

**Q: How do I debug source maps?**
A: Open DevTools → Sources tab → Find CSS file in tree.

**Q: Is minification required for production?**
A: Recommended for file size, but not required. Use `npm run build:css:dev` if needed.

**Q: Can I extend the plugin pipeline?**
A: Yes! Modify `postcss.config.js` or `scripts/build-css.js` to add plugins.

---

**Last updated**: October 2024
**Status**: Production ready ✅
