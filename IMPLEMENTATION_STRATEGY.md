# Unified Persistence Architecture: Complete Implementation Strategy

## Executive Summary

We are implementing a **unified persistence architecture** that fixes the translation persistence bug and lays groundwork for complete document state unification.

**Current Status:** Phase 1 v1 complete (foundation facade)
**Recommended Path:** Phase 1 v2 refactor → Phase 2 implementation
**Expected Completion:** 4-5 hours (Phase 1 v2 + Phase 2) to solve core problem

---

## The Problem We're Solving

### Translation Merge Bug
```
User workflow:
  1. Opens document with review edits
  2. Starts translation (en → nl)
  3. Merges translation back into review
  4. Page reloads
  5. Translation changes are LOST ✗

Root cause:
  • Review edits persist to git via LocalDraftPersistence
  • Translation state persists to browser via TranslationPersistence
  • Translation merges are not persisted anywhere
  • On reload: review restored, translations forgotten
```

### Solution Architecture
```
All three persist together:
  1. Review edits → git
  2. Translation state → browser
  3. Merged changes → saved with review
  4. On reload: everything restored
```

---

## Phase 1: Foundation (COMPLETE ✅)

### What Was Built

**UnifiedDocumentPersistence Facade**
- Coordinates LocalDraftPersistence (git) + TranslationPersistence (browser)
- Single save/load interface
- Automatic language pair discovery
- ~260 lines, fully documented

**PersistenceManager Integration**
- Initializes unified persistence
- Uses unified save in persistDocument()
- Fallback logic for backward compatibility (to be removed)

### Current State
- ✅ All types check
- ✅ All linting passes
- ✅ Facade works correctly
- ⚠️ Carries fallback logic (technical debt)

### Commit History
```
7172808 feat: implement Phase 1 - Unified Persistence Architecture
```

---

## Phase 1 v2: Clean Refactor (RECOMMENDED NEXT: 30 min - 1 hour)

### Objective
Remove technical debt before Phase 2 implementation.

### Changes

1. **PersistenceManagerConfig**
   ```typescript
   // Before
   localPersistence?: LocalDraftPersistence;
   translationPersistence?: TranslationPersistence;

   // After
   localPersistence: LocalDraftPersistence;
   translationPersistence: TranslationPersistence;
   ```

2. **PersistenceManager.constructor**
   ```typescript
   // Before: conditional initialization
   if (config.localPersistence && config.translationPersistence) {
     this.unifiedPersistence = new UnifiedDocumentPersistence(...);
   }

   // After: always initialize
   this.unifiedPersistence = new UnifiedDocumentPersistence(
     config.localPersistence,
     config.translationPersistence
   );
   ```

3. **persistDocument() Method**
   ```typescript
   // Before: two code paths
   if (this.unifiedPersistence) {
     // unified path
   } else {
     // fallback to local-only
   }

   // After: single unified path
   void this.unifiedPersistence.saveDocument({...});
   ```

### Impact
- All callers must provide both persistence layers
- Estimated 3-5 callers to update
- Type checking helps find all instances
- Result: Cleaner code, better foundation

### Detailed Plan
→ See: `PHASE_1_REFACTOR_PLAN.md`

---

## Phase 2: Restoration (2-3 hours)

### Objective
Implement unified loading and restore translation state on page reload.

### Key Changes

1. **Update restoreLocalDraft()**
   ```typescript
   public async restoreLocalDraft(): Promise<void> {
     // Use unified facade
     const payload = await this.unifiedPersistence.loadDocument(
       this.buildDocumentId()
     );

     if (!payload) return;

     // Restore all three layers
     if (payload.review) {
       this.restoreReviewEdits(payload.review);
     }
     if (payload.review?.comments) {
       this.restoreComments(payload.review.comments);
     }
     if (payload.translations) {
       for (const [langPair, doc] of Object.entries(payload.translations)) {
         this.callbacks.onTranslationsImported?.({
           sourceLanguage: doc.metadata.sourceLanguage,
           targetLanguage: doc.metadata.targetLanguage,
           document: doc,
         });
       }
     }

     this.callbacks.refresh();
   }
   ```

2. **Add Callback**
   ```typescript
   export interface PersistenceCallbacks {
     onDraftRestored: (elements: DraftElementPayload[]) => void;
     onCommentsImported?: () => void;
     // NEW
     onTranslationsImported?: (info: TranslationRestorationInfo) => void;
     refresh: () => void;
   }
   ```

3. **Update TranslationModule**
   - Hook into `onTranslationsImported` callback
   - Restore translation visual state from persisted document
   - Update UI to show restored translations

### Result
✓ Translation merges persist
✓ Page reload restores everything
✓ Bug is FIXED

---

## Phase 3: Module Unification (8-12 hours, Future)

### Objective
Deeper unification - single operation log for all mutations.

### Current State
- ChangesModule tracks review edits only
- TranslationModule tracks translation state separately
- Two independent operation logs
- Comments also separate

### After Phase 3
- **UnifiedChangesModule** tracks all mutations
  - Review edits → OperationType 'edit'
  - Translation edits → OperationType 'translation-edit'
  - Comments → OperationType 'comment'
- Single operation log across all modes
- Consistent undo/redo

### Benefits
- Unified history across modes
- Single undo/redo stack
- Better audit trail
- Cleaner state management

---

## Phase 4: Storage Unification (Optional, Future)

### Objective
Atomic transactions - review + translation changes in single git commit.

### Current State
- Review changes → separate git commit
- Translation merges → browser storage only
- Decoupled persistence

### Proposed State
- Both changes → single git commit
- Transaction semantics (both or neither)
- Translation changes visible in history

### Trade-offs
- **Benefit:** Atomic, auditable, consistent
- **Cost:** More complex coordination, larger commits

---

## Implementation Roadmap

### Timeline

```
Week 1:
  Phase 1 v1: Foundation facade ..................... ✅ DONE
  Phase 1 v2: Refactor (1 hour) ..................... ⏳ NEXT
  Phase 2: Restoration (3 hours) .................... 📋 PLANNED

Week 2:
  Phase 3: Module unification (12 hours) ............ 📋 FUTURE

Week 3+:
  Phase 4: Storage unification (TBD) ............... 📋 OPTIONAL
```

### Effort Summary

| Phase | Duration | Complexity | Value |
|-------|----------|-----------|-------|
| 1 v1 | 1 hour | Low | Foundation |
| 1 v2 | 30 min - 1 hr | Low | Clean code |
| 2 | 2-3 hours | Medium | **BUG FIX** |
| 3 | 8-12 hours | High | Full unification |
| 4 | TBD | High | Polish |

**To fix core bug:** 4-5 hours total (Phase 1 v2 + Phase 2)

---

## Architecture Progression

### Phase 1 v1 (Current)
```
Review Editor → PersistenceManager → UnifiedDocumentPersistence
                                          ↙            ↘
                               LocalDraft        Translation
                               (git)             (browser)
```

### Phase 1 v2 (Cleaned)
```
Same as above, but:
  - translationPersistence is REQUIRED
  - No fallback logic
  - Single code path
```

### Phase 2 (With Restoration)
```
Review Editor ←── onDraftRestored (review)
            ←── onCommentsImported (comments)
            ←── onTranslationsImported (translations)

All three restored together on page reload
```

### Phase 3 (Unified Operations)
```
      ┌─ Review Edits ─┐
      │                │
All → UnifiedChanges ← ├─ Translation Edits ─┤ → Single Operation Log
      │                │
      └─ Comments ─────┘
```

---

## Files & Documentation

### Current Implementation
- `src/services/UnifiedDocumentPersistence.ts` - Facade layer
- `src/services/PersistenceManager.ts` - Integration point

### Documentation (New)
- `PHASE_1_IMPLEMENTATION_SUMMARY.md` - What Phase 1 v1 built
- `PHASE_1_UNIFIED_VISION.md` - Why unification matters
- `PHASE_1_REFACTOR_PLAN.md` - How to refactor Phase 1 v2
- `PHASE_1_NEXT_STEPS.md` - Full roadmap
- `IMPLEMENTATION_STRATEGY.md` - This document

### Reference Documents
- `UNIFIED_PERSISTENCE_ARCHITECTURE_PLAN.md` - Original design
- `ARCHITECTURE_ASSESSMENT_SUMMARY.md` - Validity assessment
- `PERSISTENCE_ARCHITECTURE_ANALYSIS.md` - Detailed analysis

---

## Decision Framework

### Should we refactor Phase 1 v2?

**Arguments For (Recommended):**
- Cleaner foundation for Phase 2
- Same callers updated anyway
- Removes technical debt early
- Better code quality
- Type system enforces architecture

**Arguments Against:**
- Phase 1 v1 already works
- Requires 3-5 caller updates
- Breaking change (but limited scope)
- Could go straight to Phase 2

**Recommendation:** **YES, refactor Phase 1 v2**

Short-term effort (1 hour) → Long-term benefit (cleaner code, easier Phase 2)

---

## Getting Started

### Option 1: Full Commitment (Recommended)
1. ✅ Phase 1 v1 already done
2. Execute Phase 1 v2 refactor (1 hour)
3. Execute Phase 2 (2-3 hours)
4. **Result:** Bug fixed, foundation clean

### Option 2: Skip Refactor
1. ✅ Phase 1 v1 already done
2. Skip Phase 1 v2
3. Execute Phase 2 directly
4. **Result:** Bug fixed, but carries technical debt

### Option 3: Incremental
1. ✅ Phase 1 v1 already done
2. Do Phase 1 v2 refactor (1 hour)
3. Pause for testing
4. Do Phase 2 when confident (2-3 hours)
5. **Result:** Best of both worlds

---

## Success Criteria

### Phase 1 v2
- [ ] Types check: `npm run type-check`
- [ ] Lint passes: `npm run lint`
- [ ] No fallback logic remaining
- [ ] All callers updated

### Phase 2
- [ ] Translations loaded from storage
- [ ] Callback fires on restoration
- [ ] Translation UI state restored
- [ ] Page reload preserves all changes

### Phase 3
- [ ] Single operation log for all mutations
- [ ] Undo/redo works across modes
- [ ] Consistent history

---

## Risk Management

### Phase 1 v2 Risks
- **Risk:** Breaking change to config interface
- **Mitigation:** Type-safe, easy to find all callers
- **Severity:** LOW

### Phase 2 Risks
- **Risk:** Callback integration with TranslationModule
- **Mitigation:** Hook design is flexible, can mock
- **Severity:** LOW

### Phase 3 Risks
- **Risk:** Refactoring ChangesModule (core system)
- **Mitigation:** Extensive testing, incremental rollout
- **Severity:** MEDIUM

---

## Questions & Answers

**Q: Can we skip Phase 1 v2 refactor?**
A: Yes, but Phase 2 will be more complex. We recommend refactoring.

**Q: When will the bug be fixed?**
A: After Phase 2 (4-5 hours total including Phase 1 v2).

**Q: Do we need Phase 3?**
A: No, Phase 2 solves the immediate problem. Phase 3 is nice-to-have.

**Q: Can Phase 2 and 3 be combined?**
A: Not easily. Phase 2 adds restoration, Phase 3 refactors ChangesModule.

**Q: What about Phase 4?**
A: Future optimization. Design needed first.

---

## Summary

**Where we are:** Phase 1 v1 complete with fallback logic
**Where we should go:** Phase 1 v2 refactor → Phase 2 implementation
**Expected effort:** 4-5 hours total
**Expected benefit:** Bug fixed, clean architecture
**Next step:** Review `PHASE_1_REFACTOR_PLAN.md` and decide

---

**Status:** Ready to proceed with Phase 1 v2
**Time to start:** Whenever approved
