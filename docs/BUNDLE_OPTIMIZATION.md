# Bundle Optimization Strategy

## Current Status

**Bundle Size (as of 2025-11-01):**
- Main bundle: 2.4 MB (533 KB gzipped)
- Source map: 5.6 MB
- Total: 8.0 MB

**Components:**
- Core review functionality (editing, comments, git integration)
- Translation module (segmentation, providers, UI, export)
- Dependencies (@xenova/transformers, onnxruntime-web)

## Problem

The translation module adds significant size to the bundle:
1. **@xenova/transformers** (~1.5MB) - Required for local AI translation
2. **Translation UI components** (~100KB) - TranslationView, TranslationToolbar, TranslationController
3. **Translation core** (~80KB) - Segmentation, alignment, state management
4. **Export service** (~60KB) - Unified and separated exporters

For users who only need review functionality (comments, tracked changes, git integration), this is unnecessary overhead.

## Solution: Conditional Bundling

### Build Flag Strategy

Create two build targets:

1. **Full Bundle** (default) - Includes translation module
2. **Lean Bundle** - Review functionality only

### Implementation Approach

#### 1. Environment Variables

Add to `vite.config.ts`:

```typescript
export default defineConfig({
  define: {
    __ENABLE_TRANSLATION__: JSON.stringify(
      process.env.ENABLE_TRANSLATION !== 'false'
    ),
  },
  // ...
});
```

#### 2. Conditional Imports in `src/main.ts`

```typescript
// Type-only imports (always available)
import type { TranslationConfig } from '@modules/translation';

// Conditional runtime import
let TranslationModule: typeof import('@modules/translation').TranslationModule | undefined;

if (__ENABLE_TRANSLATION__) {
  TranslationModule = (await import('@modules/translation')).TranslationModule;
}

export class QuartoReview {
  private translation?: InstanceType<typeof TranslationModule>;

  constructor(config: QuartoReviewConfig = {}) {
    // ...

    // Initialize translation module if enabled AND available
    if (this.config.enableTranslation && TranslationModule) {
      this.translation = new TranslationModule({
        config: translationConfig,
        changes: this.changes,
        markdown: this.markdown,
        exporter: this.exporter,
      });
    }

    // ...
  }
}
```

#### 3. Dynamic UI Component Loading

```typescript
// In UIModule constructor
if (config.translation && __ENABLE_TRANSLATION__) {
  // Lazy load translation UI components
  const { TranslationController } = await import(
    './translation/TranslationController'
  );
  this.translationController = new TranslationController({
    translation: config.translation,
    // ...
  });
}
```

#### 4. Tree-Shaking Optimization

Ensure Vite can tree-shake unused code:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separate translation into its own chunk
          if (id.includes('translation') || id.includes('@xenova')) {
            return 'translation';
          }
        },
      },
    },
  },
});
```

#### 5. Build Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "build": "npm run build:full",
    "build:full": "vite build",
    "build:lean": "ENABLE_TRANSLATION=false vite build --mode lean",
    "build:both": "npm run build:full && npm run build:lean"
  }
}
```

### Package Structure

Create separate extension variants:

```
_extensions/
├── review/              # Full version (with translation)
│   ├── _extension.yml
│   └── assets/
│       └── review.js
└── review-lean/         # Lean version (review only)
    ├── _extension.yml
    └── assets/
        └── review.js
```

## Expected Savings

### Lean Bundle (without translation)
- Remove @xenova/transformers: ~1.5 MB
- Remove onnxruntime-web: ~200 KB
- Remove translation UI: ~100 KB
- Remove translation core: ~80 KB
- Remove export service: ~60 KB

**Estimated lean bundle:** ~400-500 KB (down from 2.4 MB)
**Estimated gzipped:** ~120-150 KB (down from 533 KB)

### Full Bundle (with translation)
- Current: 2.4 MB (533 KB gzipped)
- With code splitting: ~600 KB main + ~1.8 MB translation chunk
- Benefit: Translation module loads on-demand

## Migration Path

### Phase 1: Prepare Code (Current)
- ✅ Translation module is already optional in config
- ✅ Type definitions separated from implementation
- ✅ All imports properly typed
- ⏳ Add conditional import wrapper (next step)

### Phase 2: Add Build Flags
1. Update vite.config.ts with environment variable
2. Add conditional imports to main.ts
3. Add conditional UI loading to UIModule
4. Test both build modes

### Phase 3: Optimize Dependencies
1. Mark @xenova/transformers as optional peer dependency
2. Add warning if translation enabled but module not available
3. Document installation for translation features

### Phase 4: Separate Bundles
1. Create dual build pipeline
2. Generate two extension variants
3. Update documentation with installation options
4. Publish both versions

## Usage Examples

### For Users (After Implementation)

**Installing Lean Version:**
```bash
quarto add username/quarto-review-lean
```

**Installing Full Version:**
```bash
quarto add username/quarto-review
```

**Switching Versions:**
```yaml
# Lean version
filters:
  - review-lean

# Full version (with translation)
filters:
  - review
review:
  enabled: true
  mode: translation
```

## Implementation Priority

### High Priority (Now)
1. Document the strategy (this file) ✅
2. Add conditional import wrapper to main.ts
3. Test that disabling translation works gracefully

### Medium Priority (Next Release)
1. Implement build flags in vite.config.ts
2. Create dual build pipeline
3. Test bundle sizes

### Low Priority (Future)
1. Separate extension variants
2. Publish to Quarto extensions registry
3. Add automatic bundle size monitoring

## Technical Notes

### TypeScript Considerations

Global type declaration for build flag:

```typescript
// src/env.d.ts
declare const __ENABLE_TRANSLATION__: boolean;
```

### Testing Strategy

Test both configurations:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    environment: 'jsdom',
  },
  define: {
    __ENABLE_TRANSLATION__: true, // Test with translation enabled
  },
});
```

Separate test run for lean build:

```bash
ENABLE_TRANSLATION=false npm test
```

### Deployment Strategy

1. **GitHub Releases:**
   - `quarto-review-v1.0.0-full.zip` (with translation)
   - `quarto-review-v1.0.0-lean.zip` (review only)

2. **NPM Package:**
   - Separate packages: `@quarto/review` and `@quarto/review-lean`
   - Or feature flag in single package

3. **Quarto Extension Registry:**
   - Two separate listings
   - Clear documentation about differences

## Benefits

### For End Users
- ✅ Faster page loads (smaller bundle)
- ✅ Better performance (less JavaScript to parse)
- ✅ Choice based on needs
- ✅ Future-proof (can upgrade to full version)

### For Developers
- ✅ Cleaner separation of concerns
- ✅ Easier to maintain separate features
- ✅ Better testing (test both configurations)
- ✅ Modular architecture

### For Project
- ✅ Wider adoption (lean version more accessible)
- ✅ Professional deployment strategy
- ✅ Scalable for future features
- ✅ Clear upgrade path

## Alternative Approaches Considered

### 1. Lazy Loading Only
- **Pro:** Single bundle, load translation on-demand
- **Con:** Still ships translation code even if never used
- **Verdict:** Good for full version, not sufficient alone

### 2. Separate Git Repository
- **Pro:** Complete separation
- **Con:** Code duplication, harder to maintain
- **Verdict:** Too complex for maintenance

### 3. Plugin Architecture
- **Pro:** Ultimate flexibility
- **Con:** Over-engineering for current needs
- **Verdict:** Consider for v2.0

### 4. Conditional Build Flags (Chosen)
- **Pro:** Best balance of flexibility and maintainability
- **Con:** Requires dual build pipeline
- **Verdict:** ✅ Recommended approach

## Monitoring & Metrics

Track bundle sizes over time:

```javascript
// scripts/check-bundle-size.js
const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, '../dist/review.js');
const stats = fs.statSync(bundlePath);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log(`Bundle size: ${sizeMB} MB`);

if (sizeMB > 3.0) {
  console.error('⚠️  Bundle size exceeds 3 MB limit!');
  process.exit(1);
}
```

Add to CI/CD pipeline to alert on size regressions.

## References

- [Vite Build Options](https://vitejs.dev/config/build-options.html)
- [Rollup Manual Chunks](https://rollupjs.org/configuration-options/#output-manualchunks)
- [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [Tree Shaking](https://webpack.js.org/guides/tree-shaking/)

## Timeline

- **2025-11-01:** Strategy documented
- **Next:** Add conditional imports
- **v1.1.0:** Dual build support
- **v1.2.0:** Separate extension variants

---

**Status:** 📝 Planning Phase
**Next Action:** Implement conditional import wrapper in main.ts
