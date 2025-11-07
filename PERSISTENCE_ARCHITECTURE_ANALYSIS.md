# Persistence Architecture Analysis: Review vs Translation Mode

## Executive Summary

**Issue:** Changes made in Review mode are not being persisted to `LocalDraftPersistence` (git-backed storage). Instead, `TranslationPersistence` (browser localStorage) is being called, indicating a broken separation of concerns.

**Root Cause:** `TranslationModule` operates independently with its own persistence layer that doesn't coordinate with `LocalDraftPersistence`.

**Impact:** When users:
1. Make changes in Review mode → Saved via `PersistenceManager` to `LocalDraftPersistence` ✓
2. Switch to Translation mode → Saved via `TranslationPersistence` to localStorage ✓
3. Merge translations back to Review mode → **NOT saved** ✗ (Changes only in ChangesModule)
4. Page reload → Draft restoration fails because merge changes were never persisted ✗

---

## Current Architecture

### Three Independent Persistence Systems

```
┌─────────────────────────────────────────────────────────────────┐
│ LocalDraftPersistence                                           │
│ ├─ Backend: EmbeddedSourceStore (git-backed file system)        │
│ ├─ Location: review-draft-{slug}.json                           │
│ ├─ Scope: Document-level edits (Review mode)                    │
│ ├─ Trigger: Manual via PersistenceManager.persistDocument()    │
│ └─ Used by: UIModule, CommentController                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ TranslationPersistence                                          │
│ ├─ Backend: Browser localStorage                                │
│ ├─ Location: quarto_review_translation_{docId}                  │
│ ├─ Scope: Translation document state (Translation mode)        │
│ ├─ Trigger: Auto-save every 30 seconds + manual                │
│ └─ Used by: TranslationModule                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ EditorHistoryStorage                                            │
│ ├─ Backend: Browser localStorage                                │
│ ├─ Location: review:editor:history:{elementId}                  │
│ ├─ Scope: Editor undo/redo history per element                 │
│ ├─ Trigger: Every editor change                                │
│ └─ Used by: EditorManager, EditorLifecycle                     │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Issues

#### ❌ PROBLEM: Translation Mode Merge

When user merges translation changes back to Review mode:

```
TranslationModule.mergeToElements()
  ↓
Map<elementId, newContent> returned
  ↓
TranslationModule.applyMergeToChanges(elementUpdates, changesModule)
  ↓
changesModule.edit(elementId, newContent) called for each element
  ↓
ChangesModule operations updated IN MEMORY ONLY
  ↓
NO CALL TO persistenceManager.persistDocument()
  ↓
RESULT: Changes lost on page reload ✗
```

#### ✓ CORRECT: Review Mode Edits

```
UIModule.saveEditor()
  ↓
changesModule.replaceElementWithSegments(elementId, segments)
  ↓
persistenceManager.persistDocument()
  ↓
LocalDraftPersistence.saveDraft() to EmbeddedSourceStore
  ↓
RESULT: Changes persisted to git-backed storage ✓
```

---

## Root Cause Analysis

### Why TranslationModule is Independent

`TranslationModule` was designed as an isolated feature with:

1. **Self-contained state** via `TranslationState`
   - Manages source/target sentences
   - Tracks translation pairs and correspondence
   - Maintains metadata (timestamps, statuses)

2. **Self-contained persistence** via `TranslationPersistence`
   - Stores translation document to browser localStorage
   - Auto-saves on state changes
   - Can be loaded independently

3. **No awareness of LocalDraftPersistence**
   - Doesn't import or reference LocalDraftPersistence
   - Doesn't know about PersistenceManager
   - Auto-save hardcoded to TranslationPersistence only

### Why This is a Problem

The assumption was: _"Translation is a separate mode, keep its state separate"_

But in reality:
- Users merge translations back into Review mode
- Those merged changes become part of the Review document
- They need to be persisted alongside other Review changes
- **Browser localStorage is NOT reliable for critical document changes**

---

## Proposed Solution

### Architecture: LocalDraftPersistence as Primary Persistence Layer

```
┌─────────────────────────────────────────────────────────────────┐
│ PersistenceManager (ORCHESTRATOR)                               │
├─ Manages all document-level persistence                          │
├─ Coordinates between:                                            │
│  ├─ LocalDraftPersistence (primary, git-backed)                │
│  ├─ ChangesModule (edits/operations)                            │
│  └─ CommentsModule (comment data)                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ TranslationPersistence (SECONDARY, optional)                    │
├─ Saves translation state to browser localStorage                │
├─ Used ONLY for:                                                  │
│  ├─ Restoring translation UI state on reload                   │
│  └─ Preserving translation progress during session              │
├─ NOT used for:                                                   │
│  ├─ Persisting merged changes (handled by LocalDraftPersistence)
│  └─ Critical document storage                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ TranslationModule                                               │
├─ Saves translation state to TranslationPersistence (auto)      │
├─ When merging back:                                              │
│  ├─ Call persistenceManager.persistDocument()                   │
│  └─ Ensures merged changes are saved to LocalDraftPersistence  │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Steps

#### Step 1: Pass PersistenceManager to TranslationModule

**File:** `src/main.ts`

```typescript
// Current: TranslationModule doesn't receive PersistenceManager
const translation = new TranslationModule({ ... });

// New: Pass PersistenceManager as dependency
const translation = new TranslationModule(
  { ... },
  true, // enablePersistence
  30000, // autoSaveIntervalMs
  persistenceManager // NEW: Add PersistenceManager
);
```

#### Step 2: Update TranslationModule Constructor

**File:** `src/modules/translation/index.ts`

```typescript
constructor(
  config: TranslationModuleConfig,
  private enablePersistence = true,
  private autoSaveIntervalMs = 30000,
  private persistenceManager?: PersistenceManager // NEW
) {
  // ... existing code
}
```

#### Step 3: Call persistenceManager After Merge

**File:** `src/modules/ui/index.ts` (in `toggleTranslation()` method)

```typescript
if (handle.ready) {
  await handle.ready;
}

this.translationController = plugin.getController();
if (!this.translationController) {
  throw new Error('Translation controller failed to initialize');
}

// ... merge code ...

const mergeApplied = this.translationModule.applyMergeToChanges(
  elementUpdates,
  this.config.changes
);

if (mergeApplied) {
  // NEW: Persist merged changes
  this.persistenceManager.persistDocument('Merged translation changes');

  this.showNotification(
    'Translation changes merged to review mode',
    'success'
  );
}
```

#### Step 4: Ensure TranslationModule Can Be Initialized Without PersistenceManager

```typescript
// Make it optional for backward compatibility
private persistenceManager?: PersistenceManager;

private scheduleAutoSave(): void {
  if (this.autoSaveInterval) {
    clearTimeout(this.autoSaveInterval);
  }
  this.autoSaveInterval = setTimeout(() => {
    this.saveToStorage();
  }, this.autoSaveIntervalMs);
}

private saveToStorage(): void {
  if (!this.persistence) return;

  const doc = this.state.getDocument();
  if (doc) {
    this.persistence.saveDocument(doc);
    logger.debug('Translation auto-saved to storage');

    // NEW: Also save to review persistence if available
    if (this.persistenceManager) {
      // Don't persist the full document, just notify that translation state changed
      // The actual content merge is handled by the UI layer
    }
  }
}
```

---

## Phase 1 vs Phase 2 Work

### Phase 1 (Completed) ✓
- Created 10 foundation tests for localStorage persistence
- Implemented operations saving/restoring in PersistenceManager
- Verified cross-session restoration works for edits and comments

### Phase 2 (Current - THIS ANALYSIS)
- **Identify:** Translation merge changes are not persisted ✗
- **Fix:** Wire TranslationModule to call PersistenceManager.persistDocument()
- **Test:** Verify merged translation changes are restored after page reload

### Phase 3-5 (Planned)
- Edge cases (14 tests)
- Performance (6 tests)
- UI integration (6 tests)
- Regression prevention (9 tests)

---

## Risk Analysis

### Low Risk Changes
- Adding optional `PersistenceManager` parameter to TranslationModule ✓
- Calling `persistenceManager.persistDocument()` after merge ✓
- No changes to existing persistence logic ✓

### Testing Strategy
1. Manual: Merge translation changes, reload page, verify changes persist
2. Integration: Test translation merge with PersistenceManager mocked
3. Regression: Ensure translation-only users not affected (backward compatible)

---

## Success Criteria

- ✓ Translation changes merged back to Review are persisted to `LocalDraftPersistence`
- ✓ Page reload restores both original Review changes AND merged translation changes
- ✓ Backward compatible (TranslationModule works without PersistenceManager)
- ✓ No impact on translation-only workflows
- ✓ All Phase 1 tests still pass

---

## Related Code Locations

| Component | File | Key Method |
|-----------|------|-----------|
| PersistenceManager | `src/services/PersistenceManager.ts` | `persistDocument()` |
| TranslationModule | `src/modules/translation/index.ts` | `applyMergeToChanges()` |
| UIModule | `src/modules/ui/index.ts` | `toggleTranslation()` |
| TranslationPersistence | `src/modules/translation/storage/TranslationPersistence.ts` | `saveDocument()` |
| LocalDraftPersistence | `src/modules/storage/LocalDraftPersistence.ts` | `saveDraft()` |

---

## Questions for Code Review

1. Should translation auto-save also trigger LocalDraftPersistence backup? (Recommended: NO, keep translation auto-save independent)
2. Should we create a composite persistence interface? (Recommended: NO, simpler to just call persistDocument())
3. How to handle the case where merge happens but user doesn't confirm? (Current: No persistence until confirmed)
