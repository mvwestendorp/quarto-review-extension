# Operations Restoration Diagnostic Guide

## Problem Statement
After making edits and refreshing the page, the localStorage persists correctly (no more JSON corruption warnings), but the operations array in the ChangesModule is empty when the page loads. This means edits are restored content-wise, but the operation history is lost.

## Expected Behavior
1. **Saving**: When you make an edit and the page persists, it should:
   - Extract operations from `changes.getOperations()`
   - Include them in the draft payload sent to localStorage
   - Save with the `DraftPayload` containing `{ elements, operations, comments }`

2. **Loading**: When the page refreshes:
   - Load the `DraftPayload` from localStorage
   - If it contains operations, call `changes.initializeWithOperations(operations)`
   - This populates the `this.operations` array in ChangesModule
   - Results in `changes.getOperations()` returning the restored operations

## Restoration Flow Diagram

```
Browser Reload
    ↓
UIModule constructor (lines 369-371)
    ↓
persistenceManager.restoreLocalDraft()
    ↓
unifiedPersistence.loadDocument(documentId)
    ↓
localPersistence.loadDraft() [LocalDraftPersistence.ts:110]
    ├─ Reads from git-backed storage
    ├─ Parses JSON to DraftPayload
    └─ Returns: { elements, operations?, comments? }
    ↓
UnifiedDocumentPersistence.loadDocument() [lines 174-220]
    └─ Maps reviewPayload to unifiedPayload.review
       ├─ elements: reviewPayload.elements
       ├─ operations: reviewPayload.operations  ← KEY FIELD
       └─ comments: reviewPayload.comments
    ↓
Check if operations exist (PersistenceManager:217-237)
    ├─ Condition: Array.isArray() && length > 0
    ├─ If true → changes.initializeWithOperations(operations)
    └─ If false → operations stay empty in ChangesModule
    ↓
ChangesModule.initializeWithOperations() [index.ts:44]
    ├─ this.operations = [...operations]  ← Operations loaded here
    └─ Log: "Operations restored from draft" with count and types
```

## Debug Logging Points (Added in Latest Commit)

The following debug logs have been added to trace the flow:

### 1. **Saving Operations** (PersistenceManager.ts:113-117)
```
"Preparing to persist document" {
  elementCount: <number>,
  operationCount: <number>,  ← Check this is > 0
  commentCount: <number>
}
```
**What to check**: Is `operationCount` showing the correct number of operations you made?

### 2. **Loading Draft File** (LocalDraftPersistence.ts:159-164)
```
"Draft loaded successfully" {
  filename: "review-draft.json",
  elementCount: <number>,
  operationCount: <number>,  ← Check this is > 0
  commentCount: <number>
}
```
**What to check**: Does the loaded draft contain operations from the saved file?

### 3. **Checking for Operations** (PersistenceManager.ts:217-222)
```
"Checking for operations in restored payload" {
  hasOperations: boolean,
  operationCount: <number>,
  hasFunction: boolean  ← Should be true
}
```
**What to check**: Is `operationCount` > 0 at this point?

### 4. **Restoring Operations** (ChangesModule.ts:49-52)
```
"Operations restored from draft" {
  count: <number>,
  types: [string, string, ...]  ← Array of operation types
}
```
**What to check**: Does this log appear? What count and types are shown?

## Potential Issues to Check

### Issue 1: Operations Not Saved to localStorage
**Symptoms**: Step 2 (Loading Draft File) shows `operationCount: 0`

**Root Causes**:
- `changes.getOperations()` returns empty array at save time
- Operations field not being passed to `saveDraft()`
- JSON serialization error in `saveDraft()` preventing save

**How to Debug**:
1. Look at browser console for "Preparing to persist document" log
2. Check if `operationCount` matches number of edits you made
3. If it shows 0, the operations aren't in the ChangesModule at save time

**Solution**:
- Ensure edits trigger `changes.edit()` or similar operations
- Check that auto-save is being triggered (look for "Document persisted via unified persistence" logs)

### Issue 2: Operations Loaded but Not Restored
**Symptoms**: Step 2 shows `operationCount: 3` but Step 4 ("Operations restored from draft") doesn't appear

**Root Causes**:
- Condition at line 225-227 of PersistenceManager evaluates to false
- `typeof changes.initializeWithOperations !== 'function'`
- `unifiedPayload.review` is undefined

**How to Debug**:
1. Look for "Checking for operations in restored payload" log
2. Check values of `hasOperations`, `operationCount`, `hasFunction`
3. If `hasFunction` is false, ChangesModule wasn't properly initialized

**Solution**:
- Verify UIModule is properly passing ChangesModule to PersistenceManager
- Check config.changes.initializeWithOperations exists

### Issue 3: Operations Field Lost During Serialization
**Symptoms**: Step 1 shows `operationCount: 5` but Step 2 shows `operationCount: 0`

**Root Causes**:
- Operations contain non-serializable data (circular references, functions, etc.)
- UnifiedDocumentPersistence not passing operations to LocalDraftPersistence.saveDraft()
- Invalid DraftPayload structure

**How to Debug**:
1. Check "Saved local draft" log in LocalDraftPersistence (line 92-95)
2. Should show same `operationCount` as save step
3. If it shows 0, operations weren't passed to saveDraft()

**Solution**:
- Add logging to UnifiedDocumentPersistence.saveDocument() to confirm operations passed
- Check if operations contain serializable data only
- Verify localStorage file directly: `JSON.parse(localStorage.getItem('review-draft.json'))` in console

## Testing the Operations Flow

### Manual Test Steps

1. **Clear previous state**:
   ```javascript
   localStorage.clear()
   location.reload()
   ```

2. **Open browser DevTools** → Console tab

3. **Make an edit** to a section:
   - Click edit button on any section
   - Make a change
   - Click Save
   - Wait 100ms for auto-save to trigger

4. **Watch console for**:
   - `[LocalDraftPersistence] Preparing to persist document`
   - Check: is `operationCount` > 0?

5. **Refresh the page**: `Ctrl+R` or `Cmd+R`

6. **Watch console for**:
   - `[LocalDraftPersistence] Draft loaded successfully`
   - Check: is `operationCount` > 0?
   - `[PersistenceManager] Checking for operations in restored payload`
   - Check: is `operationCount` > 0?
   - `[ChangesModule] Operations restored from draft`
   - Check: are operation types listed?

7. **Verify in code**:
   ```javascript
   // In browser console after page loads:
   // This should not be empty after operations are restored
   document.quarto_review?.config?.changes?.getOperations?.().length
   ```

## Files Involved

### Core Flow:
1. **LocalDraftPersistence.ts** (lines 110-167)
   - `loadDraft()`: Returns DraftPayload with operations field
   - `saveDraft()`: Accepts operations in options

2. **UnifiedDocumentPersistence.ts** (lines 168-225)
   - `loadDocument()`: Maps operations from review payload to unified payload (line 206)
   - `saveDocument()`: Passes operations to localPersistence.saveDraft() (line 111)

3. **PersistenceManager.ts** (lines 75-165)
   - `persistDocument()`: Gets operations from changes (line 109-110)
   - `restoreLocalDraft()`: Loads payload and calls initializeWithOperations (line 225-234)

4. **ChangesModule.ts** (lines 44-53)
   - `initializeWithOperations()`: Restores operations array

### Type Definitions:
- **DraftPayload**: src/modules/storage/LocalDraftPersistence.ts:20-25
  ```typescript
  interface DraftPayload {
    savedAt: string;
    elements: DraftElementPayload[];
    comments?: DraftCommentPayload[];
    operations?: Operation[];  // ← This field
  }
  ```

## Next Steps

1. **Enable Console Logging**:
   - Open browser DevTools
   - Filter for "LocalDraftPersistence", "PersistenceManager", "ChangesModule"

2. **Run the Manual Test** (see section above)

3. **Collect the Logs**:
   - Take screenshots of console output
   - Note operationCount values at each step

4. **Analyze Results**:
   - If operationCount drops to 0 between steps, that's where the issue is
   - If operationCount stays correct throughout, the restoration logic is working

5. **Report Findings**:
   - Share which step loses the operations
   - Include console logs and operationCount values

## Example of Correct Flow Logs

```
[PersistenceManager] Preparing to persist document {
  elementCount: 2,
  operationCount: 1,      ← You made 1 edit
  commentCount: 0
}

[LocalDraftPersistence] Saved local draft {
  filename: "review-draft.json",
  operationCount: 1       ← Operations were saved
}

--- PAGE REFRESH ---

[LocalDraftPersistence] Draft loaded successfully {
  filename: "review-draft.json",
  elementCount: 2,
  operationCount: 1,      ← Operations were loaded
  commentCount: 0
}

[PersistenceManager] Checking for operations in restored payload {
  hasOperations: true,
  operationCount: 1,      ← Operations are in payload
  hasFunction: true
}

[PersistenceManager] Restoring operations from draft {
  count: 1               ← Restoration triggered
}

[ChangesModule] Operations restored from draft {
  count: 1,              ← Operations now in ChangesModule
  types: ["edit"]        ← Operation types
}
```

## Implementation Verification

Run this in the browser console to verify the restoration:

```javascript
// Check if changes module has operations loaded
const changes = document.quarto_review?.config?.changes;
const ops = changes?.getOperations();
console.log('Operations in Changes:', ops?.length);

// Check operation types
if (ops?.length > 0) {
  console.log('Operation types:', ops.map(op => op.type));
}

// Manually check localStorage
const draft = JSON.parse(localStorage.getItem('review-draft.json') || '{}');
console.log('Operations in localStorage:', draft.operations?.length);
```

If `ops?.length` is 0 after a page refresh with edits, operations are not being restored.
