# Git Configuration Propagation Debug Analysis

## Issue Report

**Symptom**: Git integration showing as disabled despite proper configuration in `_quarto.yml`

Console shows:
```
⚠ Git integration is disabled. Submit Review button will be unavailable.
To enable: Add review.git configuration with provider, owner, and repo to your document metadata
```

**Configuration** (`example/_quarto.yml`):
```yaml
review:
  enabled: true
  git:
    provider: github
    owner: mvwestendorp
    repo: quarto-review-extension-github-demo
    base-branch: main
    auth:
      mode: pat
      token: ''
```

---

## Configuration Flow Analysis

I've traced the complete configuration propagation path:

### 1. **Quarto Metadata → Lua Filter**
- File: `_extensions/review/review.lua`
- Function: `meta_to_json()` (line 504-534)
- Behavior: Converts Pandoc MetaMap to JSON, **preserving original keys**
- Important: Quarto YAML keys like `base-branch` remain as-is (NOT converted to camelCase)

### 2. **Lua Filter → HTML**
- Location: Line 1037-1042 in `review.lua`
```lua
if meta.review and meta.review.git then
  local git_config = meta_to_json(meta.review.git)
  if git_config then
    init_config.git = git_config
  end
end
```
- Serialized to: `<div data-review-config='{...}'>`
- Inserted at: Line 1073 in `review.lua`

### 3. **HTML → TypeScript**
- File: `src/main.ts` (lines 284-291)
```typescript
window.addEventListener('DOMContentLoaded', () => {
  const reviewElement = document.querySelector('[data-review]');
  if (reviewElement) {
    const config = reviewElement.getAttribute('data-review-config');
    const parsedConfig = config ? JSON.parse(config) : {};
    new QuartoReview(parsedConfig); // parsedConfig.git passed to constructor
  }
});
```

### 4. **QuartoReview → GitModule**
- File: `src/main.ts` (line 134)
```typescript
this.git = new GitModule(this.config.git);
```

### 5. **GitModule → resolveGitConfig**
- File: `src/modules/git/index.ts` (line 23)
- File: `src/modules/git/config.ts` (line 27-82)
```typescript
export function resolveGitConfig(rawConfig?: ReviewGitConfig | null): GitConfigResolution | null {
  if (!rawConfig) return null; // ← Likely failing here

  const provider = normalizeProvider(rawConfig.provider);
  if (!provider) return null;

  const owner = (rawConfig.owner || '').trim();
  const name = (rawConfig.repo || '').trim();
  if (!owner || !name) return null;

  // Note: Handles both base-branch AND baseBranch (line 54-57)
  const baseBranch = rawConfig.baseBranch || rawConfig['base-branch'] || 'main';

  return { config: resolved, raw: rawConfig };
}
```

---

## Key Findings

### ✅ **Configuration Handling is Correct**

1. **Kebab-case support**: TypeScript already handles both `base-branch` and `baseBranch` (config.ts:54-57)
2. **Property extraction**: `owner`, `repo`, `provider` are read correctly
3. **Auth config**: PAT mode is properly recognized

### ❓ **Likely Issues**

Based on the code analysis, the config is failing at one of these checkpoints:

1. **`rawConfig` is undefined/null** - Config not being passed from Lua
2. **`provider` is invalid** - Not matching 'github', 'gitlab', etc.
3. **`owner` or `repo` is empty** - Property names don't match

---

## Debug Logging Added

I've added comprehensive console logging to diagnose the exact failure point:

### In `GitModule` constructor (src/modules/git/index.ts:23-31):
```typescript
console.log('[GitModule] Constructor called with rawConfig:', rawConfig);
console.log('[GitModule] rawConfig type:', typeof rawConfig,
           'is null:', rawConfig === null,
           'is undefined:', rawConfig === undefined);

// If initialization fails:
console.log('[GitModule] No resolution - raw config was:',
           JSON.stringify(rawConfig, null, 2));
```

### In `resolveGitConfig` (src/modules/git/config.ts:30-70):
```typescript
console.log('[resolveGitConfig] Called with:', rawConfig);
console.log('[resolveGitConfig] Type:', typeof rawConfig,
           'Keys:', rawConfig ? Object.keys(rawConfig) : 'N/A');

console.log('[resolveGitConfig] Normalized provider:', provider);
console.log('[resolveGitConfig] Owner:', owner, 'Repo:', name);

// If any check fails, logs the issue
```

---

## Testing Instructions

### Step 1: Build with Debug Logging

```bash
cd /home/user/quarto-review-extension

# Option A: Full build (will fail on type-check but debug logs are added)
npm run build

# Option B: Build without type-check
npx vite build

# Option C: Use existing built version if available
ls _extensions/review/assets/review.js
```

### Step 2: Render Document

```bash
cd example
quarto render document.qmd
```

### Step 3: Open in Browser and Check Console

Open `example/_output/document.html` in a browser and check the console for:

#### Expected Debug Output:

```
[GitModule] Constructor called with rawConfig: {provider: "github", owner: "mvwestendorp", ...}
[GitModule] rawConfig type: object is null: false is undefined: false
[resolveGitConfig] Called with: {provider: "github", owner: "mvwestendorp", ...}
[resolveGitConfig] Type: object Keys: ["provider", "owner", "repo", "base-branch", "auth"]
[resolveGitConfig] Normalized provider: github
[resolveGitConfig] Owner: mvwestendorp Repo: quarto-review-extension-github-demo
✓ Git integration enabled for mvwestendorp/quarto-review-extension-github-demo (base: main)
```

#### If Config is Missing:

```
[GitModule] Constructor called with rawConfig: undefined
[GitModule] rawConfig type: undefined is null: false is undefined: true
[GitModule] No resolution - raw config was: undefined
⚠ Git integration is disabled...
```

#### If Config Has Wrong Structure:

```
[GitModule] Constructor called with rawConfig: {some: "object"}
[resolveGitConfig] Called with: {some: "object"}
[resolveGitConfig] Keys: ["some"]
[resolveGitConfig] Normalized provider: null
[resolveGitConfig] No valid provider. Raw provider value: undefined
```

---

## Possible Causes & Solutions

### **Cause 1: Config Not Being Passed from Lua**

**Symptoms**:
- `rawConfig: undefined` in console
- Config object is null or empty

**Check**:
1. Verify `_quarto.yml` has correct indentation (YAML is sensitive)
2. Check rendered HTML: `<div data-review-config='...'>`
3. Ensure Lua filter is running: `filters: - review` in `_quarto.yml`

**Solution**:
- Verify YAML syntax
- Rebuild extension if Lua filter was modified
- Check that `meta.review.git` exists in Lua filter execution

### **Cause 2: JSON Parsing Error**

**Symptoms**:
- Error in console about JSON.parse
- Config object structure is wrong

**Check**:
- View page source and look at `data-review-config` attribute
- Check if JSON is malformed

**Solution**:
- Fix JSON encoding in Lua filter's `table_to_json` function

### **Cause 3: Property Name Mismatch**

**Symptoms**:
- `rawConfig` exists but has unexpected keys
- Provider/owner/repo showing as undefined

**Check**:
```javascript
// In browser console:
const el = document.querySelector('[data-review]');
const config = JSON.parse(el.getAttribute('data-review-config'));
console.log('Git config:', config.git);
console.log('Keys:', Object.keys(config.git || {}));
```

**Solution**:
- Verify property names match between YAML and TypeScript
- The code already handles `base-branch` vs `baseBranch`, but check other properties

---

## What to Share

After testing with the debug build, please share:

1. **Full console output** starting from `[GitModule]` and `[resolveGitConfig]` logs
2. **Rendered HTML snippet** containing `<div data-review-config='...'>`
3. **Any JavaScript errors** in the console

This will help pinpoint exactly where the configuration is being lost.

---

## Commits on Branch

- `fa99af7` - debug: add detailed console logging to git configuration initialization
- `5d3034c` - chore: remove github-demo submodule
- `8af7cf8` - docs: add comprehensive documentation index and GitHub Pages status report
- `0282e5b` - style: fix prettier formatting for console log statements
- `770a50c` - fix: remove unused buildDate variable from getBuildString()
- `fe017a9` - feat: enhance git integration debugging and add build version tracking

Branch: `claude/fix-git-integration-ui-011CUpPvtgwJ6TBREkmp8Xd6`
