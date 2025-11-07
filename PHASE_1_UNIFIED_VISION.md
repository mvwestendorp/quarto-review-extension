# Phase 1+: Aggressive Unification Strategy
## Breaking Backward Compatibility for Clean Architecture

**Previous Approach:** Facade pattern with fallbacks (Phase 1 v1)
**New Approach:** Full unification with breaking changes allowed (Phase 1 v2)

---

## The Problem with Current Phase 1

The current implementation keeps backward compatibility by:
1. Making `translationPersistence` optional in config
2. Checking `if (this.unifiedPersistence)` in persistDocument()
3. Falling back to local-only persistence
4. Maintaining two code paths

**Result:** We carry technical debt of two persistence modes simultaneously.

---

## New Vision: Complete Unification

### Architecture v2 (No Fallbacks)

```typescript
// REQUIRED in config - no optional fields for persistence
export interface PersistenceManagerConfig {
  // Both required - forces unified architecture
  localPersistence: LocalDraftPersistence;
  translationPersistence: TranslationPersistence;
  changes: ChangesModule;
  comments?: CommentsModule;
  historyStorage: EditorHistoryStorage;
  notificationService: NotificationService;
}

// Single code path - always unified
export class PersistenceManager {
  private unifiedPersistence: UnifiedDocumentPersistence; // NOT optional

  constructor(config: PersistenceManagerConfig, callbacks: PersistenceCallbacks) {
    // Always create unified persistence - no conditional
    this.unifiedPersistence = new UnifiedDocumentPersistence(
      config.localPersistence,
      config.translationPersistence
    );
  }

  public persistDocument(message?: string): void {
    // Single code path - always use unified
    const payload = this.buildPayload();
    void this.unifiedPersistence.saveDocument(payload);
  }

  public async restoreLocalDraft(): Promise<void> {
    // Single code path - unified load + restoration
    const payload = await this.unifiedPersistence.loadDocument(this.documentId);
    if (!payload) return;

    this.restoreReview(payload.review);
    this.restoreComments(payload.review?.comments);
    this.restoreTranslations(payload.translations);
    this.callbacks.refresh();
  }
}
```

### Multi-Phase Unification Plan

**Phase 1 (Current):** Foundation Facade
- Create UnifiedDocumentPersistence ✅
- Basic coordination (save/load)
- No restoration yet

**Phase 2:** Complete Integration
- Make `translationPersistence` REQUIRED in config
- Remove fallback code path in persistDocument()
- Implement unified restore with callbacks

**Phase 3:** Module Unification
- Unify ChangesModule to track all mutations (reviews + translations)
- Unify TranslationModule to use unified callbacks
- Eliminate redundant operation tracking

**Phase 4:** Storage Unification (Optional Future)
- Consider merged storage backend
- Single git commit for review + translation changes
- Atomic transaction semantics

---

## Phase 2 Roadmap

### 2.1 Make TranslationPersistence Required

```diff
export interface PersistenceManagerConfig {
-  localPersistence?: LocalDraftPersistence;
-  translationPersistence?: TranslationPersistence;
+  localPersistence: LocalDraftPersistence;
+  translationPersistence: TranslationPersistence;
   changes: ChangesModule;
   comments?: CommentsModule;
   historyStorage: EditorHistoryStorage;
   notificationService: NotificationService;
}
```

**Impact:** Any caller must provide both. Easier to find.

### 2.2 Remove Fallback Logic

Current persistDocument():
```typescript
if (this.unifiedPersistence) {
  // unified path
} else {
  // fallback to local only
}
```

After Phase 2:
```typescript
// Always unified - no condition
const payload = this.buildPayload();
await this.unifiedPersistence.saveDocument(payload);
```

### 2.3 Extend Restoration

Current restoreLocalDraft():
```typescript
const draftPayload = await this.config.localPersistence.loadDraft();
// Only restores review
```

After Phase 2:
```typescript
const payload = await this.unifiedPersistence.loadDocument(this.documentId);

// Restore all three layers in order
if (payload.review) this.restoreReview(payload.review);
if (payload.review?.comments) this.restoreComments(payload.review.comments);
if (payload.translations) this.restoreTranslations(payload.translations);
```

### 2.4 Add Translation Restoration Callbacks

```typescript
export interface PersistenceCallbacks {
  onDraftRestored: (elements: DraftElementPayload[]) => void;
  onCommentsImported?: () => void;
  // NEW - restore translation UI state
  onTranslationsImported?: (info: TranslationRestorationInfo) => void;
  refresh: () => void;
}

// In PersistenceManager.restoreLocalDraft()
if (payload.translations) {
  for (const [langPair, doc] of Object.entries(payload.translations)) {
    const [sourceLang, targetLang] = langPair.split('-');
    this.callbacks.onTranslationsImported?.({
      sourceLanguage: sourceLang as Language,
      targetLanguage: targetLang as Language,
      document: doc,
    });
  }
}
```

---

## Phase 3: Module Unification (Longer-term)

### Current State (Fragmented)
- **LocalDraftPersistence** saves review edits
- **TranslationPersistence** saves translation state
- **ChangesModule** tracks review operations
- **TranslationModule** independently tracks translation state
- Two separate operation logs

### After Phase 3 (Unified)
- **UnifiedDocumentPersistence** coordinates both
- **UnifiedChangesModule** - single operation log for all mutations
  - Review edits → tracked as OperationType 'edit'
  - Translation changes → tracked as OperationType 'translation-edit'
  - Comments → tracked as OperationType 'comment'
- Single source of truth for all document changes

### Phase 3 Benefits
- One undo/redo stack for everything
- Consistent operation history
- Cleaner audit trail
- Single serialization format

---

## Phase 4: Storage Unification (Optional)

### Current: Two Backend Commits
```
Review edit → LocalDraftPersistence → Git commit: "Local draft update"
Translation merge → TranslationPersistence → Browser localStorage

❌ Decoupled: Can't see translation changes in git history
```

### Proposed: Single Atomic Commit
```
Review edit + Translation merge → UnifiedDocumentPersistence
  → LocalDraftPersistence (save review to git)
  → TranslationPersistence (save to browser)
  → Single git commit: "Review edit + translation merge en-nl"

✓ Atomic: Both or neither
✓ Trackable: Git history shows what changed
✓ Auditable: Can review translation merges
```

---

## Implementation Strategy

### Phase 1→2 Transition
- Current code has fallback logic
- Phase 2 removes fallback
- **Breaking change:** Callers must provide translationPersistence
- **Cost:** Update ~3-5 initialization sites
- **Benefit:** Eliminates technical debt

### Code Changes Summary

| Phase | File | Changes | Impact |
|-------|------|---------|--------|
| 1 | UnifiedDocumentPersistence.ts | Create | New (260 lines) |
| 1 | PersistenceManager.ts | Modify | +40 lines (with fallback) |
| 2 | PersistenceManager.ts | Modify | -20 lines (remove fallback) |
| 2 | PersistenceManager.ts | Modify | +60 lines (restoration) |
| 3 | ChangesModule.ts | Refactor | Unified operation tracking |
| 3 | TranslationModule.ts | Refactor | Use unified callbacks |

---

## Testing Strategy

### Phase 1 Tests
- Type checking passes ✓
- Unified save works ✓
- Unified load works ✓

### Phase 2 Tests
- Translation restoration fires callback
- Translation UI state restored from persisted data
- Review + translation + comments all restored together

### Phase 3+ Tests
- Single operation log tracks all mutations
- Undo/redo works across review/translation boundaries
- Git history shows translation changes

---

## Risk & Mitigation

| Risk | Phase | Mitigation |
|------|-------|-----------|
| Breaking API change | 2 | List all callers, update them systematically |
| Initialization failures | 2 | Require both persistence layers at type level |
| Lost fallback safety | 2 | Proper error handling in unified layer |
| Migration complexity | 3+ | Incremental refactoring, extensive testing |

---

## Why This Approach is Better

❌ **Current Phase 1:** "Try unified, fallback to old way"
- Maintains two code paths
- Technical debt accumulates
- Harder to optimize
- Confusing to developers

✅ **New Phase 1+2:** "Unified architecture, breaking changes allowed"
- Single code path
- Clean architecture
- Natural optimization
- Easier to understand and maintain

---

## Timeline Estimate

- **Phase 1** (complete): Facade + coordination
- **Phase 2** (2-3 hours): Required config + restoration callbacks
- **Phase 3** (8-12 hours): Unified ChangesModule refactor
- **Phase 4** (optional): Storage unification (future)

Total to fully unified: ~12-15 hours
Incremental benefit: Available after Phase 2 (3-4 hours total)

---

## Next Steps

1. **Decide:** Accept breaking changes for Phase 2?
2. **If yes:** Proceed with Phase 2 (required config + restoration)
3. **Then:** Plan Phase 3 (ChangesModule unification)
4. **Future:** Evaluate Phase 4 (storage unification)

---

## Decision Point

The current Phase 1 code works but carries debt. Should we:

**Option A (Keep Current Phase 1):**
- Backward compatible
- Carries fallback logic
- Technical debt deferred

**Option B (Refactor to v2):**
- Remove fallback logic now
- Make translationPersistence required
- Cleaner foundation for Phase 2
- Breaking change: ~5 callers to update

**Recommendation:** Option B (Refactor to v2)
- Phase 1 should establish clean foundation
- Better to break now than accumulate debt
- Phase 2 already requires changes anyway
