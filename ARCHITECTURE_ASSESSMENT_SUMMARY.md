# Architecture Assessment Summary

## Question: Can the persistence architecture be simplified through unification?

**Answer: YES - A unified persistence architecture is BOTH VALID and RECOMMENDED.**

---

## Key Findings

### 1. Current Problem ✗
- **Three independent persistence systems** with no coordination
- **Merged translation changes are lost** because they're not persisted to git-backed storage
- **Browser localStorage is unreliable** for critical document changes
- **Semantic mismatch**: Review changes should go to git; translation state is secondary

### 2. Why Unification Works ✓

#### A. Unique Segment Identification Already Exists
- **Review level**: `elementId` uniquely identifies elements
- **Translation level**: `sentenceId` + `elementId` + `language` uniquely identifies segments
- **Pattern**: Can support both without collision
  - Review operations: `op-1: edit elem-p1 "content"`
  - Translation operations: `sent-p1-nl-0: "vertaling"`
- **Assessment**: ✅ **VALID** - No identifier conflicts

#### B. Language is Orthogonal to Reviews
- **Reviews are element-level, language-agnostic** - one set of edits applies to all languages
- **Translations are sentence-level, language-specific** - each language pair is independent
- **Implication**: Don't merge language into element IDs; keep them separate
- **Assessment**: ✅ **RECOMMENDED** - Avoid mixing concerns

#### C. Data Model Alignment
```
Review saves:        [elements] + [operations] + [comments]
Translation saves:   [sentences] + [correspondence] + [metadata]
Unified saves:       review: { ... } + translations: { en-nl: { ... }, en-fr: { ... } }
```
- **Assessment**: ✅ **VALID** - Can nest translations under review layer
- **Benefit**: Single document load → restore review → restore translations

#### D. Single Persistence Manager Pattern
```
Before: Two independent auto-save cycles (manual + 30-sec translation auto-save)
After:  One orchestrator coordinates both (review layer primary, translation optional)
```
- **Assessment**: ✅ **RECOMMENDED** - Single source of truth

### 3. Proposed Architecture ✓

**Three-Layer Model:**
```
Application Layer (UIModule, TranslationModule, Controllers)
        ↓
Orchestration Layer (PersistenceManager) - Single interface
        ↓
Facade Layer (UnifiedDocumentPersistence) - NEW, coordinates both
        ↓
Backend Layer (LocalDraftPersistence + TranslationPersistence)
        ↓
Storage (Git-backed for reviews, Browser localStorage for translations)
```

**Payload Structure:**
```typescript
{
  review: {
    elements: [{ id, content, metadata }],     // Base document
    operations: [{ id, type, elementId, ... }], // Edit history
    comments: [{ id, elementId, content }]      // Comments
  },
  translations: {
    "en-nl": {
      sourceSentences, targetSentences, correspondenceMap, metadata
    },
    "en-fr": { ... }  // Can add multiple language pairs
  }
}
```

**Key Insight:** Review section is **shared/immutable** across language pairs. Each translation is **independent**.

- **Assessment**: ✅ **VALID** - Clean separation, extensible

### 4. Implementation Path ✓

**Phase 1: Create Facade (150 lines, minimal risk)**
- Add `UnifiedDocumentPersistence` class
- Delegate review to `LocalDraftPersistence`
- Delegate translations to `TranslationPersistence` per language pair
- Update `PersistenceManager` constructor

**Phase 2: Extend Restoration (20-30 lines)**
- Load translations in `restoreLocalDraft()`
- Add callback for translation restoration
- TranslationModule rebuilds visual state from restored translations

**Phase 3: Optional Optimization**
- Fine-tune based on real usage
- Consider deeper integration if beneficial
- Or keep as-is (facade works well)

**Risk Level: LOW**
- No breaking changes to existing code
- Can be added incrementally
- Easy to test in isolation
- Easy to rollback if needed

- **Assessment**: ✅ **RECOMMENDED** - Low-risk, phased approach

---

## Validity Assessment

| Criterion | Valid? | Reasoning |
|-----------|--------|-----------|
| **Unique Identifiers** | ✅ | ElementId, sentenceId, language are distinct domains |
| **Language Orthogonality** | ✅ | Language is translation concern, not review concern |
| **Data Model Fit** | ✅ | Review and translations nest naturally without conflicts |
| **Incremental Feasibility** | ✅ | Facade pattern allows phased implementation |
| **Backward Compatibility** | ✅ | Existing code works unchanged; new layer adds features |
| **Performance Impact** | ✅ | Minimal (two storage backends already exist) |
| **Architectural Purity** | ✅ | Maintains separation of concerns |
| **Extensibility** | ✅ | New language pairs add without core changes |
| **Testing Complexity** | ✅ | Clear boundaries make unit testing straightforward |

**Overall Assessment: HIGHLY VALID ✅**

---

## Why This Simplifies the Architecture

### Before (Current)
```
❌ PersistenceManager (reviews only)
  └─ LocalDraftPersistence

❌ TranslationModule (independent)
  └─ TranslationPersistence (auto-save)

❌ CommentController (independent)
  └─ PersistenceManager.persistDocument()

❌ No coordination between review edits and translation merges
❌ No coordination between review edits and comment additions
❌ Merged translation changes never persisted
```

### After (Proposed)
```
✅ PersistenceManager (single orchestrator for ALL)
  └─ UnifiedDocumentPersistence (facade)
    ├─ LocalDraftPersistence (reviews + comments)
    └─ TranslationPersistence (translations, per language pair)

✅ TranslationModule (calls persistenceManager after merge)
✅ CommentController (calls persistenceManager after add)
✅ Single coordinate point for all persistence decisions
✅ Automatic coordination between review edits and translation merges
✅ Clear load order: reviews → comments → translations
```

**Simplification Benefits:**
1. **One orchestrator** instead of multiple auto-save cycles
2. **Clear load order** instead of ad-hoc restoration
3. **Unified interface** for all persistence needs
4. **Extensible** without adding more independent systems
5. **Maintainable** with clear separation of concerns

---

## Remaining Questions & Answers

### Q1: Wouldn't ChangesModule need to become language-aware?
**A:** No. Review edits apply uniformly to the base document. Language is a translation concern, not a review concern. TranslationModule handles language-specific state independently.

### Q2: What about conflict detection between review edits and translation edits?
**A:** Not necessary because they operate at different levels:
- Review edits: Element level (wholesale change)
- Translation edits: Sentence level (within-element change)
- Scope: Review edits affect all language pairs; translation edits affect only that pair

### Q3: Would this require changing ChangesModule API?
**A:** No. ChangesModule remains exactly as-is. The unified persistence layer is above it, not changing it.

### Q4: What happens if translation merges conflict with subsequent review edits?
**A:** Same as today:
1. Translation merges → creates edits in ChangesModule
2. User reviews → makes new edits
3. On reload → all persisted operations replayed in order
4. Last-write-wins

### Q5: Could we go further and merge ChangesModule + TranslationChangesModule?
**A:** Not recommended. They track different concerns:
- **ChangesModule**: Element-level operations, affects entire document
- **TranslationChangesModule**: Sentence-level operations, isolated to language pair

Merging them would add complexity without benefit.

### Q6: What about performance with multiple language pairs?
**A:** Minimal impact:
- **Current**: TranslationModule auto-saves every 30 seconds
- **Proposed**: UnifiedDocumentPersistence batches both review and translation saves
- **Benefit**: Fewer I/O operations, not more

### Q7: Can this be done incrementally?
**A:** Yes, Phase 1 (facade creation) is completely independent and can be merged before Phase 2 (restoration extension).

---

## Next Steps

### Immediate (Recommended)
1. ✅ Review this assessment
2. ✅ Decide whether to proceed with unified approach
3. ✅ If yes, implement Phase 1 (UnifiedDocumentPersistence facade)

### Short-term
1. Test facade with reviews-only workflow
2. Test facade with translations-only workflow
3. Merge Phase 1 and stabilize
4. Implement Phase 2 (restoration extension)
5. Test complete review→translation→review workflow

### Medium-term
1. Monitor performance and storage usage
2. Consider Phase 3 optimizations if needed
3. Document architectural patterns for future features

---

## Risk Assessment

### Low-Risk Areas
- ✅ Creating new facade class (no changes to existing code)
- ✅ Extending PersistenceManager constructor (optional parameter)
- ✅ Adding restoration callback (optional callback)

### Potential Issues & Mitigations
| Issue | Mitigation |
|-------|-----------|
| Storage keys collide | Systematic naming: `{documentId}-{langPair}` |
| Restoration order wrong | Explicit order in `restoreLocalDraft()` |
| Backward compat broken | Optional parameters with fallbacks |
| Performance degrades | Lazy loading, async operations |
| TranslationModule coupling | Keep TranslationModule independent (callbacks only) |

**Overall Risk: LOW** - Can be contained and tested incrementally.

---

## Recommendations

### 1. **Recommended: Implement Unified Persistence**
- ✅ Simplifies architecture
- ✅ Fixes translation merge persistence
- ✅ Low risk, phased approach
- ✅ Backward compatible
- ✅ Extensible for future features

**Estimated Effort:**
- Phase 1: 2-3 hours (facade + tests)
- Phase 2: 2-3 hours (restoration + tests)
- Total: 4-6 hours + integration testing

### 2. **Alternative: Keep Separate with Better Coordination**
If unified approach feels over-engineered:
- Add explicit persistence call after translation merge
- Create coordinator that manages both systems
- Less elegant but lower risk

**Estimated Effort:** 1-2 hours + debugging

### 3. **Not Recommended: Deeply Merge ChangesModule**
Making ChangesModule language-aware would:
- Increase complexity dramatically
- Break existing review workflows
- Provide no architectural benefit
- Make undo/redo harder

**Assessment: Skip this approach**

---

## Conclusion

**A unified persistence architecture for reviews and translations is VALID, RECOMMENDED, and ACHIEVABLE.**

**Key Points:**
1. ✅ Unique segment identification (elementId, sentenceId, language) prevents conflicts
2. ✅ Language remains orthogonal to review operations
3. ✅ Facade pattern allows incremental, low-risk implementation
4. ✅ Single PersistenceManager can coordinate both concerns
5. ✅ Fixes the current problem (merged changes lost on reload)
6. ✅ Maintains separation of concerns
7. ✅ Extensible to multiple language pairs

**Recommendation: Proceed with Phase 1 implementation (UnifiedDocumentPersistence facade).**

This will:
- Fix the immediate issue (translation merge persistence)
- Establish clean architectural boundary
- Enable Phase 2 restoration work
- Provide foundation for future multi-language features

---

## References

- **Detailed Analysis**: See `PERSISTENCE_ARCHITECTURE_ANALYSIS.md`
- **Implementation Plan**: See `UNIFIED_PERSISTENCE_ARCHITECTURE_PLAN.md`
- **Current Issues**: See `PERSISTENCE_ARCHITECTURE_ANALYSIS.md` section "Current Architecture Issues"

**Last Updated**: 2024 (Post Phase 1 completion)
**Status**: Ready for Phase 2 implementation
