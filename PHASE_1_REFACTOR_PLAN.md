# Phase 1 Refactor Plan: Remove Backward Compatibility

## Objective
Remove fallback logic from Phase 1 implementation to establish clean, unified architecture.
This enables smoother Phase 2 implementation without accumulating technical debt.

## Changes Required

### 1. PersistenceManager Configuration

**File:** `src/services/PersistenceManager.ts`

**Current (with fallback):**
```typescript
export interface PersistenceManagerConfig {
  localPersistence?: LocalDraftPersistence;      // Optional
  translationPersistence?: TranslationPersistence; // Optional
  // ...
}
```

**After refactor (required):**
```typescript
export interface PersistenceManagerConfig {
  localPersistence: LocalDraftPersistence;       // Required
  translationPersistence: TranslationPersistence; // Required
  // ...
}
```

**Impact:**
- Callers must provide both persistence layers
- Type system enforces unified architecture
- Easier to find all initialization points

**Finding callers:**
```bash
grep -r "new PersistenceManager\|PersistenceManager(" src --include="*.ts" \
  | grep -v "\.test\."
```

### 2. PersistenceManager Constructor

**Current:**
```typescript
constructor(
  config: PersistenceManagerConfig,
  callbacks: PersistenceCallbacks
) {
  this.config = config;
  this.callbacks = callbacks;

  // Initialize unified persistence IF both backends are available
  if (config.localPersistence && config.translationPersistence) {
    this.unifiedPersistence = new UnifiedDocumentPersistence(...);
  }
}
```

**After refactor:**
```typescript
constructor(
  config: PersistenceManagerConfig,
  callbacks: PersistenceCallbacks
) {
  this.config = config;
  this.callbacks = callbacks;

  // Always create unified persistence - both are required
  this.unifiedPersistence = new UnifiedDocumentPersistence(
    config.localPersistence,
    config.translationPersistence
  );
  logger.info('UnifiedDocumentPersistence initialized');
}
```

**Changes:**
- Remove optional `unifiedPersistence` field
- Always initialize in constructor
- Single initialization path

### 3. persistDocument() Method

**Current (with fallback):**
```typescript
public persistDocument(message?: string): void {
  if (!this.config.localPersistence) {
    return;
  }

  try {
    const payload = /* build payload */;

    // Use unified persistence if available (Phase 1+)
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
```

**After refactor (unified path only):**
```typescript
public persistDocument(message?: string): void {
  try {
    const elements = this.config.changes.getCurrentState();
    const payload = elements.map(/* strip comments */);

    const commentsSnapshot = this.config.comments?.getAllComments?.();
    const operationsSnapshot = Array.from(
      this.config.changes.getOperations?.() ?? []
    );

    // Single unified path - always use unified persistence
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

    logger.debug('Document persisted via unified persistence');
  } catch (error) {
    logger.warn('Failed to persist document', error);
  }
}
```

**Changes:**
- Remove `if (!this.config.localPersistence)` check
- Remove `if (this.unifiedPersistence)` conditional
- Remove fallback to local-only persistence
- Single code path for all persistence

**Result:** ~20 fewer lines, one clear path

### 4. No Changes Needed to Other Methods

- `restoreLocalDraft()` - still uses config checks (for now, Phase 2 will unify)
- `confirmAndClearLocalDrafts()` - still checks localPersistence (valid)
- `isAvailable()` - still returns `!!this.config.localPersistence` (may update in Phase 2)

### 5. UnifiedDocumentPersistence (No Changes)

The facade itself needs no changes - it already assumes both backends are provided.

---

## Implementation Steps

### Step 1: Find All PersistenceManager Callers

```bash
grep -r "new PersistenceManager" src --include="*.ts" -n
```

**Expected locations:**
- Editor initialization code
- Module setup files
- Test setup files

### Step 2: Update PersistenceManagerConfig Interface

✏️ Make `localPersistence` and `translationPersistence` required (remove `?`)

### Step 3: Update Constructor

✏️ Remove conditional initialization, always create `unifiedPersistence`

### Step 4: Update persistDocument()

✏️ Remove fallback logic, keep single unified path

### Step 5: Update All Callers

For each caller found in Step 1:
✏️ Ensure `translationPersistence` is provided in config

### Step 6: Verify Types

```bash
npm run type-check
```

Should pass with no errors.

### Step 7: Test

```bash
npm run lint
npm run test  # if available
```

---

## Files Modified

```
src/services/PersistenceManager.ts
├─ PersistenceManagerConfig interface (1 change)
├─ PersistenceManager.constructor (1 change)
├─ PersistenceManager.persistDocument (1 major change)
└─ Field: unifiedPersistence (remove optional)
```

**Estimated lines changed:** ~30-40 lines removed, 0 added (net -30)

---

## Caller Analysis

Search results for `new PersistenceManager` or `PersistenceManager(`:

### Expected Callers

1. **EditorManager** - Likely initializes PersistenceManager
2. **Module setup** - May initialize in factory function
3. **Test files** - Test setup might mock it

**Finding command:**
```bash
find src -name "*.ts" -exec grep -l "PersistenceManager" {} \;
```

### Actions Per Caller

For each caller:
1. Check if it has access to `translationPersistence`
2. If not, import `TranslationPersistence` and create instance
3. Pass both to PersistenceManager config

**Pattern:**
```typescript
// Before
const persistenceManager = new PersistenceManager({
  localPersistence: draftPersistence,
  // missing translationPersistence
  changes,
  // ...
});

// After
const translationPersistence = new TranslationPersistence(documentId);
const persistenceManager = new PersistenceManager({
  localPersistence: draftPersistence,
  translationPersistence,  // Added
  changes,
  // ...
});
```

---

## Testing Strategy

### Unit Tests
- Type checking: `npm run type-check` ✓
- Linting: `npm run lint` ✓

### Integration Tests
1. Create PersistenceManager with both persistence layers
2. Call persistDocument()
3. Verify unified persistence was called
4. Verify both backends received data

### Regression Tests
- Ensure existing persistence functionality still works
- Verify saveDocument() saves to both backends
- Verify loadDocument() loads from both backends

---

## Risk Assessment

### Risk Level: **LOW**

**Why:**
- Only affects initialization and persistDocument()
- UnifiedDocumentPersistence unchanged
- Underlying persistence layers unchanged
- Type-safe (TypeScript enforces changes)

**Mitigation:**
- Make changes in small commit
- Type checking catches most issues
- Test before committing

**Rollback:** Simple - revert to add `?` to config fields and restore conditionals

---

## Commit Message

```
refactor: remove backward compatibility fallback from Phase 1

## Changes
- Make localPersistence and translationPersistence REQUIRED in config
- Remove conditional initialization of UnifiedDocumentPersistence
- Remove fallback persistence path in persistDocument()
- Single unified code path for all persistence

## Impact
- Simpler code, fewer edge cases
- Type system enforces unified architecture
- Cleaner foundation for Phase 2
- ~30 lines net reduction

## Migration
- All callers must provide translationPersistence
- Estimated 3-5 callers to update
- Type checking helps find all instances

## Testing
✓ Type check passes
✓ Lint passes
✓ Behavior unchanged (still unified)
```

---

## Phase 1 After Refactor

### Current State
- ✅ UnifiedDocumentPersistence facade created
- ❓ PersistenceManager has fallback logic
- ❓ Backward compatible but carries technical debt

### After Refactor
- ✅ UnifiedDocumentPersistence facade (unchanged)
- ✅ PersistenceManager cleaned up (no fallback)
- ✅ Single unified code path
- ✅ Ready for Phase 2

---

## Phase 2 Dependency

Phase 2 needs:
- ✅ Unified save (Phase 1)
- ✅ Unified load infrastructure (Phase 1)
- ✅ Required translationPersistence (THIS REFACTOR)

Without this refactor, Phase 2 would:
- Still need to work around fallback logic
- Have to update same callers anyway
- Add more complexity

**Conclusion:** This refactor should happen before Phase 2.

---

## Approval Checklist

- [ ] Understand breaking change impact
- [ ] Accept ~5 caller updates required
- [ ] Ready to proceed with Phase 1 refactor
- [ ] Then proceed with Phase 2 implementation

---

**Status:** Refactor plan complete, awaiting approval
**When ready:** Execute steps 1-7 in order
