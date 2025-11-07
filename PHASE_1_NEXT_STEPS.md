# Phase 1 → Phase 2+ Journey: Unification Roadmap

## Current Status

**Phase 1 v1 (Current Implementation):** ✅ COMPLETE
- UnifiedDocumentPersistence facade created
- PersistenceManager integrated with fallback logic
- Type-safe, backward compatible
- All tests pass

**Problem:** Carries technical debt with fallback paths

---

## Phase 1 v2 (Recommended Next): Refactor for Unification

**Duration:** 30 minutes to 1 hour
**Breaking Changes:** 3-5 callers to update
**Benefit:** Clean foundation, better Phase 2

### What Changes
1. Make `translationPersistence` **REQUIRED** in config
2. Remove fallback logic from `persistDocument()`
3. Single unified code path

### Detailed Plan
→ See: `PHASE_1_REFACTOR_PLAN.md`

---

## Phase 2: Complete Integration

**Duration:** 2-3 hours
**Dependencies:** Phase 1 v2 complete

### Goals
1. ✅ Unified save (Phase 1 v2)
2. ✅ Unified load (NEW in Phase 2)
3. ✅ Translation restoration (NEW in Phase 2)
4. ✅ Integrated callbacks (NEW in Phase 2)

### Key Changes

#### 2.1 Update restoreLocalDraft()
```typescript
public async restoreLocalDraft(): Promise<void> {
  const payload = await this.unifiedPersistence.loadDocument(this.documentId);

  if (payload?.review) {
    this.restoreReview(payload.review);
  }

  if (payload?.review?.comments) {
    this.restoreComments(payload.review.comments);
  }

  if (payload?.translations) {
    for (const [langPair, doc] of Object.entries(payload.translations)) {
      const [source, target] = langPair.split('-');
      this.callbacks.onTranslationsImported?.({
        sourceLanguage: source as Language,
        targetLanguage: target as Language,
        document: doc,
      });
    }
  }

  this.callbacks.refresh();
}
```

#### 2.2 Add Callback
```typescript
export interface PersistenceCallbacks {
  onDraftRestored: (elements: DraftElementPayload[]) => void;
  onCommentsImported?: () => void;
  onTranslationsImported?: (info: TranslationRestorationInfo) => void; // NEW
  refresh: () => void;
}
```

#### 2.3 Update TranslationModule
- Hook into `onTranslationsImported` callback
- Restore visual/UI state from persisted translation

### Result
- Page reload now restores everything: reviews + comments + translations
- Solves the core problem: translation merges persist

---

## Phase 3: Module Unification (Future)

**Duration:** 8-12 hours
**Dependencies:** Phase 2 complete

### Goals
1. Unified ChangesModule tracks all mutations
2. Single operation log (reviews + translations + comments)
3. Consistent undo/redo across all modes

### Changes Required
- Extend Operation type to include 'translation-edit'
- Update ChangesModule to track translation operations
- Update TranslationModule to emit operation events
- Unified undo/redo stack

### Result
- Single source of truth for all changes
- Consistent history
- Better audit trail

---

## Phase 4: Storage Unification (Future)

**Duration:** TBD (design phase needed)
**Dependencies:** Phase 3 complete

### Goals
1. Single git commit for review + translation changes
2. Atomic transactions (both or neither)
3. Translation changes visible in git history

### Changes Required
- Unified storage format
- Coordinate commits between LocalDraftPersistence and TranslationPersistence
- Transaction semantics

---

## Architecture Evolution

### Today (Phase 1 v1)
```
┌──────────────────┐
│ Review Editor    │
└────────┬─────────┘
         │
    ┌────▼─────┐
    │ PersistenceManager
    └────┬──────┘
    ┌────┴─────┬─────────────────────┐
    │           │                     │
  ┌─▼──────┐  ┌─▼──────────────────┐ │
  │ LocalDraft  │ UnifiedDocumentPersis  │
  │ (fallback)  │ (when available)   │
  └──────────────────────────────────────┘
```

### After Phase 1 v2 (No Fallback)
```
┌──────────────────┐
│ Review Editor    │
└────────┬─────────┘
         │
    ┌────▼──────────────────────┐
    │ PersistenceManager         │
    └────┬──────────────────────┘
         │
    ┌────▼────────────────────────────┐
    │ UnifiedDocumentPersistence       │
    └──┬──────────────────────────┬──┘
      │                            │
  ┌──▼──────────────┐      ┌──────▼──────────────┐
  │ LocalDraft      │      │ Translation         │
  │ Persistence     │      │ Persistence         │
  │ (Git-backed)    │      │ (Browser Storage)   │
  └─────────────────┘      └────────────────────┘
```

### After Phase 2 (Restoration)
```
Same as above + restoration arrows:

Review Editor  ◄──────  Restore (onDraftRestored)
              ◄──────  Restore (onCommentsImported)
              ◄──────  Restore (onTranslationsImported)
```

### After Phase 3 (Unified Changes)
```
┌──────────────────────┐
│ Review + Translation │
│ + Comments Editor    │
└─────────┬────────────┘
          │
  ┌───────▼──────────┐
  │ UnifiedChanges   │
  │ Module           │
  │ (single op log)  │
  └───────┬──────────┘
          │
  ┌───────▼────────────────────────────────────┐
  │ PersistenceManager (unified)                │
  └───────┬────────────────────────────────────┘
          │
  ┌───────▼────────────────────────────────────┐
  │ UnifiedDocumentPersistence                  │
  └────┬──────────────────────────────────┬────┘
       │                                  │
   ┌───▼───┐                        ┌────▼────┐
   │ Git   │                        │ Browser │
   └───────┘                        └─────────┘
```

---

## Timeline

| Phase | Milestone | Duration | Status |
|-------|-----------|----------|--------|
| 1 v1 | Foundation | ~1 hour | ✅ DONE |
| 1 v2 | Clean refactor | 30 min - 1 hr | ⏳ Next |
| 2 | Complete integration | 2-3 hours | 📋 Planned |
| 3 | Module unification | 8-12 hours | 📋 Planned |
| 4 | Storage unification | TBD | 📋 Future |

**Total to unified architecture:** 12-16 hours
**Immediate value delivered:** After Phase 2 (4-5 hours)

---

## Decision Matrix

### Phase 1 v2: Yes or No?

**If YES (Recommended):**
- ✅ Proceed with refactor (~1 hour)
- ✅ Removes technical debt early
- ✅ Smoother Phase 2 transition
- ⚠️ 3-5 callers must be updated
- ⚠️ Breaking change (but limited scope)

**If NO:**
- ✅ Current Phase 1 already works
- ✅ Skip refactor, go directly to Phase 2
- ⚠️ Phase 2 becomes more complex
- ⚠️ Same callers updated anyway in Phase 2
- ⚠️ Technical debt lingers longer

**Recommendation:** **YES - Refactor Phase 1 v2**

Reasons:
1. Better foundation for Phase 2
2. Same callers updated anyway
3. Phase 2 is less complex with clean Phase 1
4. Technical debt paid now vs. accumulated later

---

## How to Proceed

### Option 1: Refactor First (Recommended)
1. Execute `PHASE_1_REFACTOR_PLAN.md`
2. Then proceed to Phase 2
3. Result: Clean architecture

### Option 2: Phase 2 First
1. Proceed with Phase 2 as-is
2. Refactor Phase 1 during Phase 2
3. Result: More complex Phase 2, but works

### Option 3: Staged Refactor
1. Refactor Phase 1 v2 (1 hour)
2. Pause for testing
3. Phase 2 when confident
4. Best of both worlds

---

## Files for Reference

- **Current Status:** `/PHASE_1_IMPLEMENTATION_SUMMARY.md`
- **Why Unify:** `/PHASE_1_UNIFIED_VISION.md`
- **How to Refactor:** `/PHASE_1_REFACTOR_PLAN.md`
- **Architecture:** `/UNIFIED_PERSISTENCE_ARCHITECTURE_PLAN.md`

---

## Key Success Metrics

### Phase 1 v2
- ✅ Types check
- ✅ Lint passes
- ✅ No more fallback logic
- ✅ All callers updated

### Phase 2
- ✅ Translations restored from storage
- ✅ Comments restored from storage
- ✅ Page reload preserves all changes
- ✅ Integration tests pass

### Phase 3
- ✅ Single operation log
- ✅ Unified undo/redo
- ✅ Works across modes

---

## Summary

**Current:** Phase 1 v1 complete with fallback logic
**Next:** Choose between immediate refactor (recommended) or proceed directly
**Goal:** Unified persistence architecture (3 phases, 12-16 hours total)
**Benefit:** Translation changes persist correctly, cleaner codebase

---

**Ready to:** Proceed with Phase 1 v2 refactor?
