# Operations Storage Analysis: Two Different Storage Systems

## The Discovery

You observed localStorage contains a key like:
```
review-editor-history-workspaces-quarto-review-extension-example-output-debug-example.quarto-review-extension---debug-mode-example.para-1
```

But `UnifiedDocumentPersistence` says:
```
[DEBUG] [11:25:51.954] [UnifiedDocumentPersistence] No persisted data found for document
```

This is because **there are TWO DIFFERENT localStorage systems** that got confused:

## Storage System 1: EditorHistoryStorage (Element Undo/Redo)
**Location**: `src/modules/ui/editor/EditorHistoryStorage.ts`

**Purpose**: Store per-element edit history for inline editor undo/redo

**Storage Key Pattern**: `{prefix}{elementId}`
- Example: `review-editor-history-workspaces-quarto-review-extension-example.para-1`

**Data Structure**:
```typescript
interface HistoryData {
  elementId: string;
  states: Array<{
    content: string;
    timestamp: number;
  }>;
  lastUpdated: number;
}
```

**What it stores**: Undo/redo history for editing a single element in the inline editor (Ctrl+Z, Ctrl+Y)

**When it's used**: When you edit an element inline and press Ctrl+Z to undo

---

## Storage System 2: EmbeddedSourceStore (Draft Persistence) ✅ CORRECT
**Location**: `src/modules/git/fallback.ts`

**Purpose**: Git-backed persistence for draft edits when no git provider is available

**Storage Key**: `'quarto-review:embedded-sources'` (SINGLE KEY for all files)

**Data Structure**:
```typescript
interface PersistedSourcePayload {
  timestamp: string;
  version?: string;
  sources: Record<string, {
    content: string;          // Full JSON stringified DraftPayload
    originalContent: string;
    lastModified: string;
    version: string;
    commitMessage?: string;
  }>;
}
```

**What it stores**: Complete draft payloads including:
- `elements: DraftElementPayload[]` - Current element states
- `operations?: Operation[]` - Operation history (what you need!)
- `comments?: DraftCommentPayload[]` - Comments

**Nested Structure**: Inside `sources['review-draft.json']` is the full JSON:
```json
{
  "savedAt": "2025-11-07T11:25:00.000Z",
  "elements": [...],
  "operations": [...],    ← Operations array
  "comments": [...]
}
```

---

## The Issue: Wrong Storage System Being Checked

When you make edits, the flow is:

1. **Saving** ✅ Works:
   ```
   PersistenceManager.persistDocument()
     ↓
   UnifiedDocumentPersistence.saveDocument()
     ↓
   EmbeddedSourceStore.saveFile('review-draft.json', JSON.stringify(payload))
     ↓ Saves to localStorage['quarto-review:embedded-sources']
   ```

2. **Loading** ❌ Fails:
   ```
   PersistenceManager.restoreLocalDraft()
     ↓
   UnifiedDocumentPersistence.loadDocument(documentId)
     ↓
   EmbeddedSourceStore.getSource('review-draft.json')
     ↓
   Looks in: localStorage['quarto-review:embedded-sources'].sources['review-draft.json']

   BUT... that file might not be initialized!
   ```

---

## Why `EmbeddedSourceStore.getSource()` Returns Null

The `EmbeddedSourceStore` has a `readyPromise` that must complete before it can access sources:

```typescript
public async getSource(filename: string): Promise<EmbeddedSourceRecord | undefined> {
  await this.readyPromise;  // ← Must wait for initialization!
  const record = this.sources.get(filename);
  return record ? { ...record } : undefined;
}
```

The initialization process:
1. Loads from embedded `<script id="embedded-sources">` in HTML (if available)
2. Loads from `localStorage['quarto-review:embedded-sources']`
3. Merges both sources (prefers newer timestamp)

**Possible issues**:
- Initialization hasn't completed when `loadDraft()` is called
- `'review-draft.json'` never got added to the `sources` Map
- The data exists in localStorage but isn't under the correct key

---

## How to Check Which Storage Has Your Data

### Method 1: Browser DevTools Console
```javascript
// Check if draft is in EmbeddedSourceStore (CORRECT STORAGE)
const embeddedData = JSON.parse(localStorage.getItem('quarto-review:embedded-sources') || '{}');
console.log('Embedded sources:', embeddedData.sources);
console.log('Has review-draft.json:', !!embeddedData.sources?.['review-draft.json']);
if (embeddedData.sources?.['review-draft.json']) {
  const draft = JSON.parse(embeddedData.sources['review-draft.json'].content);
  console.log('Operations in draft:', draft.operations?.length);
}

// Check EditorHistoryStorage (WRONG STORAGE)
const historyKeys = Object.keys(localStorage).filter(k => k.startsWith('review-editor-history'));
console.log('Editor history keys:', historyKeys);
```

### Method 2: Inspect Console Logs After Page Refresh
Watch for these logs:

✅ **Correct flow**:
```
[EmbeddedSourceStore] Loaded embedded sources from document: 1
[EmbeddedSourceStore] Merged embedded sources from localStorage: 1
[EmbeddedSourceStore] Source file found in store {
  filename: "review-draft.json",
  contentLength: 1234
}
[LocalDraftPersistence] Draft loaded successfully {
  filename: "review-draft.json",
  elementCount: 2,
  operationCount: 3,
  commentCount: 0
}
```

❌ **Problem flow**:
```
[EmbeddedSourceStore] Source file not found in store {
  filename: "review-draft.json",
  availableFiles: []      ← Empty! Nothing was loaded
}
[LocalDraftPersistence] Draft file not found in git-backed storage {
  filename: "review-draft.json"
}
[UnifiedDocumentPersistence] No persisted data found for document
```

---

## Root Cause Scenarios

### Scenario 1: EmbeddedSourceStore Never Initialized the File
**Symptom**: `availableFiles: []` in logs

**Cause**: `saveFile()` was never called, or it failed silently

**Check**:
```javascript
// Should see these logs during save:
// "[EmbeddedSourceStore] Loaded embedded sources from document: 1"
// "[LocalDraftPersistence] Saved local draft {filename: "review-draft.json"}"
```

### Scenario 2: File Saved to Wrong Storage Key
**Symptom**: You see data in localStorage but it's under `review-editor-history-*` keys

**Cause**: EditorHistoryStorage and LocalDraftPersistence data got mixed up

**Fix**: Check that:
1. `LocalDraftPersistence` is using the correct `EmbeddedSourceStore` instance
2. No other code is writing to `EmbeddedSourceStore` with wrong filenames

### Scenario 3: Async Race Condition
**Symptom**: Logs show `availableFiles: ["review-draft.json"]` but still empty after load

**Cause**: `readyPromise` in EmbeddedSourceStore hasn't completed when `getSource()` is called

**Evidence**: Look for timing in logs - is initialization faster or slower than restoration?

---

## Fix Verification Checklist

After making an edit and refreshing:

- [ ] Open DevTools → Application → LocalStorage
- [ ] Check key `'quarto-review:embedded-sources'` exists
- [ ] Expand the value (if JSON) - should see `sources: { "review-draft.json": ... }`
- [ ] Inside `review-draft.json.content`, the value should be valid JSON with `elements` and `operations` arrays
- [ ] Check browser console logs match "Correct flow" pattern above
- [ ] `[ChangesModule] Operations restored from draft` appears with count > 0

---

## Code Locations to Check

1. **EmbeddedSourceStore initialization**: `src/modules/git/fallback.ts:118-121`
   - `initialize()` calls `loadFromDocument()` then `loadFromLocalStorage()`

2. **LocalDraftPersistence setup**: `src/modules/storage/LocalDraftPersistence.ts:31-36`
   - Takes `EmbeddedSourceStore` instance in constructor

3. **PersistenceManager initialization**: `src/services/PersistenceManager.ts:53-65`
   - Creates `UnifiedDocumentPersistence` with LocalDraftPersistence

4. **UIModule setup**: `src/modules/ui/index.ts:194-199`
   - Creates EditorHistoryStorage and passes to PersistenceManager

---

## Expected localStorage Structure (Correct)

```javascript
localStorage = {
  "quarto-review:embedded-sources": {
    "timestamp": "2025-11-07T11:25:00.000Z",
    "version": "1234abcd-xyz",
    "sources": {
      "review-draft.json": {
        "filename": "review-draft.json",
        "content": "{\"savedAt\":\"...\",\"elements\":[...],\"operations\":[...]}",
        "originalContent": "{original document}",
        "lastModified": "2025-11-07T11:25:00.000Z",
        "version": "5678efgh-uvw",
        "commitMessage": "Local draft update: 2025-11-07T11:25:00.000Z"
      }
    }
  }
  // There should also be review-editor-history-* keys for inline editor undo/redo
  // But those are separate from draft persistence
}
```

---

## Next Steps

1. **Check Console Logs** after refresh and look for:
   - Where EmbeddedSourceStore finds (or doesn't find) the file
   - What files are in `availableFiles`

2. **Verify localStorage Content**:
   - Run the DevTools console check above
   - Is the data under `quarto-review:embedded-sources`?

3. **Look for Async Issues**:
   - Does `EmbeddedSourceStore.readyPromise` complete before `loadDraft()` is called?
   - Check logs for timing

4. **Check Error Logs**:
   - Look for any "Failed to parse" or "Failed to save" warnings
   - These might indicate serialization issues with operations
