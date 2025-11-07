# Unified Persistence Architecture Plan

## Executive Summary

**Assessment:** A unified persistence architecture **IS VIABLE** and **RECOMMENDED**, but with important nuances:

1. ✅ **Reviews and Translations CAN share the same persistence manager** - they differ in what data they persist, not how
2. ❌ **BUT: They should NOT share the same operation tracking** - language is orthogonal to review edits
3. ✅ **A facade pattern (UnifiedDocumentPersistence) provides the best incremental path** - minimal changes, clean separation
4. ⚠️ **ChangesModule should remain language-agnostic** - translation state is orthogonal to document structure

---

## Why Unification Makes Sense

### Current Problem
- Reviews and Translations use **separate persistence layers**
- No coordination between them
- Merged translation changes are **lost on reload** because they're not persisted back to `LocalDraftPersistence`
- Two independent save mechanisms (manual + auto-save) create consistency issues

### Unified Approach Benefit
- **Single source of truth** for document state across all modes
- **Reviews → Translations → Reviews** flow becomes natural
- **Automatic coordination** - when translation merges happen, they're automatically persisted
- **Consistent restoration** - load review edits, load translations, load translation visuals
- **Extensible** - adding other language pairs doesn't require new persistence logic

---

## Architectural Design

### 1. Three-Layer Model (Recommended)

```
┌─────────────────────────────────────────────────────────┐
│ Application Layer                                       │
├─ UIModule (Review mode operations)                      │
├─ TranslationModule (Translation operations)             │
└─ TranslationController (Translation UI)                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Orchestration Layer (PersistenceManager)                │
├─ Coordinates all persistence needs                      │
├─ Handles document lifecycle                             │
└─ Triggers restoration callbacks                         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Facade Layer (NEW: UnifiedDocumentPersistence)          │
├─ Provides single save/load interface                    │
├─ Delegates to appropriate backend                       │
└─ Coordinates multi-backend transactions                 │
└─────────────────────────────────────────────────────────┘
                      ↙          ↘
        ┌──────────────┐     ┌──────────────┐
        │ LocalDraft   │     │ Translation  │
        │ Persistence  │     │ Persistence  │
        │ (Review      │     │ (Translation │
        │  edits)      │     │  state)      │
        └──────────────┘     └──────────────┘
              ↓                      ↓
    ┌──────────────────┐  ┌──────────────────┐
    │ EmbeddedSource   │  │ Browser Local    │
    │ Store            │  │ Storage          │
    │ (Git-backed)     │  │ (Per lang pair)  │
    └──────────────────┘  └──────────────────┘
```

### 2. Data Model: Unified Document Payload

```typescript
export interface UnifiedDocumentPayload {
  id: string;
  documentId: string;
  savedAt: number;
  version: number;

  // Review/Edit layer: Shared across all language operations
  review?: {
    elements: DraftElementPayload[];        // Base document structure
    operations?: Operation[];               // Edit operations (language-agnostic)
    comments?: Comment[];                   // Comments on elements
  };

  // Translation layer: Per-language-pair storage
  translations?: Record<string, {
    sourceLanguage: Language;
    targetLanguage: Language;
    sourceSentences: Sentence[];           // Segmented source text
    targetSentences: Sentence[];           // Translated text
    correspondenceMap: CorrespondenceMap;  // Alignment between source/target
    metadata: TranslationMetadata;
  }>;
}
```

### 3. Example: Document with Both Edits and Translations

```json
{
  "id": "unified-doc-1",
  "documentId": "doc-123",
  "savedAt": 1699350000000,
  "version": 1,

  "review": {
    "elements": [
      {
        "id": "p-1",
        "content": "This is a paragraph",
        "metadata": { "type": "Para" }
      },
      {
        "id": "h-1",
        "content": "Section Title",
        "metadata": { "type": "Header", "level": 1 }
      }
    ],
    "operations": [
      {
        "id": "op-1",
        "type": "edit",
        "elementId": "p-1",
        "timestamp": 1699340000000,
        "data": {
          "type": "edit",
          "oldContent": "This is the paragraph",
          "newContent": "This is a paragraph"
        }
      }
    ],
    "comments": [
      {
        "id": "c-1",
        "elementId": "p-1",
        "content": "Good catch",
        "userId": "alice"
      }
    ]
  },

  "translations": {
    "en-nl": {
      "sourceLanguage": "en",
      "targetLanguage": "nl",
      "sourceSentences": [
        {
          "id": "p-1-en-s0",
          "elementId": "p-1",
          "content": "This is a paragraph",
          "language": "en",
          "order": 0
        }
      ],
      "targetSentences": [
        {
          "id": "p-1-nl-s0",
          "elementId": "p-1",
          "content": "Dit is een alinea",
          "language": "nl",
          "order": 0
        }
      ],
      "correspondenceMap": {
        "pairs": [
          {
            "sourceId": "p-1-en-s0",
            "targetId": "p-1-nl-s0",
            "method": "automatic"
          }
        ]
      }
    },
    "en-fr": {
      "sourceLanguage": "en",
      "targetLanguage": "fr",
      "sourceSentences": [...],
      "targetSentences": [...],
      "correspondenceMap": {...}
    }
  }
}
```

**Key Insight:** The `review` section is **shared/immutable** across all language pairs. Each translation is **independent** - modifications to translations don't affect the review section or other language pairs.

---

## Implementation Approach: Three Phases

### Phase 1: Create Facade Layer (Recommended Path)

**Goal:** Introduce `UnifiedDocumentPersistence` as a coordination layer without changing existing code.

**Changes:**
1. Create `/src/services/UnifiedDocumentPersistence.ts` (~150 lines)
2. Update `/src/services/PersistenceManager.ts` to use facade
3. Keep existing `LocalDraftPersistence` and `TranslationPersistence` unchanged

**Benefits:**
- ✅ Minimal impact on existing code
- ✅ Testable in isolation
- ✅ Can be rolled out incrementally
- ✅ Easy to debug (clear layer separation)
- ✅ Backward compatible

**Code Structure:**

```typescript
// src/services/UnifiedDocumentPersistence.ts
export class UnifiedDocumentPersistence {
  constructor(
    private localPersistence: LocalDraftPersistence,
    private translationPersistence: TranslationPersistence
  ) {}

  public async saveDocument(
    payload: UnifiedDocumentPayload
  ): Promise<void> {
    // Validate single source of truth
    if (!payload.review && !payload.translations) {
      throw new Error('Document must have review or translation data');
    }

    // Save review layer to git-backed storage
    if (payload.review) {
      await this.localPersistence.saveDraft(
        payload.review.elements,
        {
          operations: payload.review.operations,
          comments: payload.review.comments,
        }
      );
    }

    // Save each translation to browser storage
    if (payload.translations) {
      for (const [langPair, doc] of Object.entries(payload.translations)) {
        const translationId = `${payload.documentId}-${langPair}`;
        const translationPersist = new TranslationPersistence(translationId);
        translationPersist.saveDocument(doc);
      }
    }
  }

  public async loadDocument(
    documentId: string
  ): Promise<UnifiedDocumentPayload | null> {
    const review = await this.localPersistence.loadDraft();

    // Discover translation language pairs
    const translations: Record<string, TranslationDocument> = {};
    const allDocs = TranslationPersistence.getAllDocuments();

    for (const doc of allDocs) {
      if (doc.id.startsWith(`${documentId}-`)) {
        const langPair = doc.id.substring(`${documentId}-`.length);
        translations[langPair] = doc;
      }
    }

    if (!review && Object.keys(translations).length === 0) {
      return null; // Nothing persisted
    }

    return {
      id: `unified-${Date.now()}`,
      documentId,
      savedAt: Date.now(),
      version: 1,
      review: review ? {
        elements: review.elements,
        operations: review.operations,
        comments: review.comments,
      } : undefined,
      translations: Object.keys(translations).length > 0 ? translations : undefined,
    };
  }
}

// src/services/PersistenceManager.ts
export class PersistenceManager {
  private unifiedPersistence?: UnifiedDocumentPersistence;

  constructor(
    config: PersistenceManagerConfig,
    callbacks: PersistenceCallbacks,
    translationPersistence?: TranslationPersistence
  ) {
    this.config = config;
    this.callbacks = callbacks;

    // Initialize unified persistence if both layers available
    if (this.config.localPersistence && translationPersistence) {
      this.unifiedPersistence = new UnifiedDocumentPersistence(
        this.config.localPersistence,
        translationPersistence
      );
    }
  }

  public persistDocument(message?: string): void {
    if (!this.config.localPersistence) return;

    try {
      const elements = this.config.changes.getCurrentState();
      const payload = elements.map((elem) => ({
        id: elem.id,
        content: this.stripInlineComments(elem.content),
        metadata: elem.metadata,
      }));

      const commentsSnapshot =
        typeof this.config.comments?.getAllComments === 'function'
          ? this.config.comments.getAllComments()
          : undefined;

      const operationsSnapshot =
        typeof this.config.changes.getOperations === 'function'
          ? Array.from(this.config.changes.getOperations())
          : undefined;

      // Use unified persistence if available
      if (this.unifiedPersistence) {
        void this.unifiedPersistence.saveDocument({
          id: `doc-${Date.now()}`,
          documentId: this.buildDocumentId(),
          savedAt: Date.now(),
          version: 1,
          review: {
            elements: payload,
            operations: operationsSnapshot,
            comments: commentsSnapshot,
          },
        });
      } else {
        // Fallback to local persistence only
        void this.config.localPersistence.saveDraft(payload, {
          message,
          comments: commentsSnapshot,
          operations: operationsSnapshot,
        });
      }
    } catch (error) {
      logger.warn('Failed to persist local draft', error);
    }
  }
}
```

**Files Modified:**
- `/src/services/PersistenceManager.ts` - ~20 line changes
- `/src/services/TranslationPersistence.ts` - Add `getAllDocuments()` (already exists!)

**Files Created:**
- `/src/services/UnifiedDocumentPersistence.ts` - ~150 lines

### Phase 2: Extend to Support Translation Restoration

**Goal:** Make `PersistenceManager` restore translations alongside reviews.

**Changes:**
1. Update `restoreLocalDraft()` to also load translations
2. Add `onTranslationsImported` callback
3. Have TranslationModule restore visual state from loaded translations

**Code:**

```typescript
// src/services/PersistenceManager.ts
export async restoreLocalDraft(): Promise<void> {
  if (!this.unifiedPersistence) return;

  try {
    const payload = await this.unifiedPersistence.loadDocument(
      this.buildDocumentId()
    );

    if (!payload) {
      logger.debug('No persisted document found');
      return;
    }

    // Restore review edits
    if (payload.review?.elements) {
      this.callbacks.onDraftRestored(payload.review.elements);
    }

    // Restore review comments
    if (payload.review?.comments && this.config.comments) {
      this.config.comments.importComments(payload.review.comments);
      this.callbacks.onCommentsImported?.();
    }

    // NEW: Restore translations
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

    this.callbacks.refresh();
  } catch (error) {
    logger.warn('Failed to restore local draft', error);
  }
}
```

**Callback Updates:**

```typescript
export interface PersistenceCallbacks {
  onDraftRestored: (elements: DraftElementPayload[]) => void;
  onCommentsImported?: () => void;
  onTranslationsImported?: (info: {
    sourceLanguage: Language;
    targetLanguage: Language;
    document: TranslationDocument;
  }) => void;
  refresh: () => void;
}
```

### Phase 3: Simplify After Incremental Testing

**Goal:** Once working, consider deeper integration if beneficial.

**Options:**
- Keep as-is (facade pattern works well)
- Merge interfaces (if clarity needs improvement)
- Unify storage keys (if management becomes complex)

---

## Why This Approach Works

### 1. **Respects Existing Concerns**
- Reviews remain **element-level**, language-agnostic
- Translations remain **sentence-level**, language-specific
- ChangesModule doesn't become language-aware
- TranslationModule maintains independence

### 2. **Handles the Review→Translation→Review Workflow**
```
Start:     Review (English) only
           ↓
Add Translation: Review (English) + Translation (English→Dutch)
           ↓
Merge back: Review edits (from translation) + Original Review edits + Translation state
           ↓
Reload: All three components restored independently
```

### 3. **Incremental and Low-Risk**
- Phase 1: Can be added without breaking existing code
- Phase 2: Can be tested with mocked callbacks
- Phase 3: Optional optimization
- Easy to rollback if needed

### 4. **Extensible to Multiple Language Pairs**
```
"en-nl": { sourceSentences, targetSentences, ... }
"en-fr": { sourceSentences, targetSentences, ... }
"en-es": { sourceSentences, targetSentences, ... }
```
Each language pair is independent. Adding a new pair requires no changes to core logic.

### 5. **Maintains Persistence Semantics**
- **Review edits** → Git-backed (permanent, collaborative)
- **Translations** → Browser localStorage (session-scoped, can be dismissed)
- **Comments** → Can move to git-backed via review layer
- Restoration order: Review → Comments → Translations (builds on each layer)

---

## Trade-offs & Considerations

| Aspect | Trade-off |
|--------|-----------|
| **Complexity** | Adding facade layer adds one level of indirection. Mitigated by clear separation. |
| **Storage Keys** | Need to manage language pair identification in translation storage keys. Mitigated by systematic naming. |
| **Backward Compat** | Existing code uses separate persistence. Mitigated by optional parameters and fallbacks. |
| **Data Duplication** | Review elements persisted in both review and translation layers. Mitigated by immutability of review section. |
| **Performance** | Loading document now hits two storage backends. Mitigated by async operations and lazy loading. |

---

## Files to Modify/Create

### Create
- **`/src/services/UnifiedDocumentPersistence.ts`** (NEW)
  - ~150 lines
  - Facade coordinating both persistence layers
  - Public: `saveDocument()`, `loadDocument()`

### Modify
- **`/src/services/PersistenceManager.ts`** (~20 changes)
  - Constructor: Accept optional TranslationPersistence
  - Initialize UnifiedDocumentPersistence
  - `persistDocument()`: Use unified persistence
  - `restoreLocalDraft()`: Load and restore translations

- **`/src/modules/translation/storage/TranslationPersistence.ts`** (~5 changes)
  - Add/verify `static getAllDocuments()` method (already exists!)
  - Ensure it filters correctly by documentId prefix

### No Changes Needed
- `/src/modules/changes/index.ts` (ChangesModule stays language-agnostic)
- `/src/modules/translation/index.ts` (TranslationModule independent)
- `/src/modules/ui/index.ts` (UIModule stays same)
- `/src/modules/storage/LocalDraftPersistence.ts` (unchanged)

---

## Migration Path

### Current State
```
Review edits → PersistenceManager → LocalDraftPersistence → Git storage
Translation state → TranslationPersistence → Browser localStorage
Merged changes → (NOT PERSISTED) ✗
```

### After Phase 1
```
Review edits ──┐
Translations  ├→ PersistenceManager → UnifiedDocumentPersistence ─┬→ LocalDraftPersistence → Git
              │                                                      │
              └─────────────────────────────────────────────────────┴→ TranslationPersistence → Browser
```

### After Phase 2
```
Review edits ──┐
Translations  ├→ PersistenceManager → UnifiedDocumentPersistence ──┬→ LocalDraftPersistence → Git
Comments ─────┤                                                      │
              │  Restoration now includes all three              └→ TranslationPersistence → Browser
              │  Callbacks fire in order: review → comments → translations
              └─ No more lost merged changes ✓
```

---

## Success Criteria

- ✅ Single `persistenceManager` handles all persistence needs
- ✅ Review edits + translation merges both persist correctly
- ✅ Page reload restores review edits, comments, AND translation state
- ✅ TranslationModule can restore visual/UI state from loaded translations
- ✅ Multiple language pairs can coexist without conflicts
- ✅ Backward compatible (no breaking changes)
- ✅ Incremental implementation path (can stop at Phase 2)
- ✅ All existing tests still pass
- ✅ New integration tests for unified persistence

---

## Recommended Implementation Order

1. **Phase 1 (Week 1):** Create `UnifiedDocumentPersistence` facade
   - Implement save/load coordination
   - Update `PersistenceManager` constructor
   - Test locally with mocks

2. **Phase 2 (Week 2):** Extend restoration for translations
   - Update `restoreLocalDraft()`
   - Add callbacks for translation restoration
   - Test review→translation→review workflow

3. **Phase 3 (Optional):** Review and optimize
   - Measure performance impact
   - Consider deeper integration if beneficial
   - Document architectural decisions

---

## Conclusion

**A unified persistence architecture IS VALID because:**

1. ✅ Reviews and translations have **different concerns** (element vs. sentence level) but **same persistence needs** (save/load/restore)
2. ✅ A **facade pattern** bridges both without requiring changes to core modules
3. ✅ **Unique segment identification** already exists (elementId + sentenceId + language)
4. ✅ **Incremental path** minimizes risk and allows phased rollout
5. ✅ **No required changes** to ChangesModule or TranslationModule core logic

**Recommended next step:** Implement Phase 1 (UnifiedDocumentPersistence facade) as a low-risk way to validate the approach before deepening integration in Phase 2.
