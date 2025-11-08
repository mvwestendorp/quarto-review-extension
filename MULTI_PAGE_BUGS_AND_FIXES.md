# Multi-Page Persistence: Critical Bugs and Fixes

## Bug #1: Ghost Edits (No-Op Operations)

### Problem
Operations are being created even when content hasn't changed. 7 out of 8 operations in your example have `oldContent === newContent` and `changes: []`. These are wasting storage and confusing the restore process.

**Root Cause:** In `ChangesModule.edit()`, operations are created before checking if content actually changed.

### Example from Your Data
```json
{
  "id": "1762587788836-sqjq6ckoa",
  "elementId": "...orderedlist-1",
  "oldContent": "1.  A textarea for editing markdown\n2.  Live preview of your changes\n3.  Save and cancel buttons",
  "newContent": "1.  A textarea for editing markdown\n2.  Live preview of your changes\n3.  Save and cancel buttons",
  "changes": []  // ← GHOST EDIT: NO ACTUAL CHANGES
}
```

### Fix Location
**File:** `src/modules/changes/index.ts` (line ~387 in `edit()` method)

**Current Code:**
```typescript
public edit(
  elementId: string,
  newContent: string,
  userId?: string,
  newMetadata?: ElementMetadata
): void {
  // ... code ...
  const operation: Operation = {
    id: this.generateId(),
    type: 'edit',
    elementId,
    timestamp: Date.now(),
    userId,
    data: {
      type: 'edit',
      oldContent: element.content,
      newContent,
      changes: extensionChanges,
      oldMetadata: element.metadata,
      newMetadata,
    },
  };

  this.operations.push(operation);  // ← ADDS EVEN IF NO CHANGE
  // ...
}
```

**Fix:**
```typescript
public edit(
  elementId: string,
  newContent: string,
  userId?: string,
  newMetadata?: ElementMetadata
): void {
  const element = this.getElementById(elementId);
  if (!element) {
    logger.warn('Cannot edit non-existent element', { elementId });
    return;
  }

  // CHECK IF ANYTHING ACTUALLY CHANGED
  const contentChanged = element.content !== newContent;
  const metadataChanged = !this.metadataEqual(element.metadata, newMetadata);

  if (!contentChanged && !metadataChanged) {
    logger.debug('Edit would not change element, skipping operation', { elementId });
    return; // ← SKIP GHOST EDIT
  }

  // Only now create the operation
  const extensionChanges = generateChanges(element.content, newContent);
  const operation: Operation = {
    id: this.generateId(),
    type: 'edit',
    elementId,
    timestamp: Date.now(),
    userId,
    data: {
      type: 'edit',
      oldContent: element.content,
      newContent,
      changes: extensionChanges,
      oldMetadata: element.metadata,
      newMetadata,
    },
  };

  this.operations.push(operation);
  this.saved = false;
  logger.info('Element edited', { elementId });
}

// Helper to compare metadata
private metadataEqual(m1?: ElementMetadata, m2?: ElementMetadata): boolean {
  if (!m1 && !m2) return true;
  if (!m1 || !m2) return false;
  return JSON.stringify(m1) === JSON.stringify(m2);
}
```

---

## Bug #2: Restoration Only on Last Edited Page

### Problem
When restoring from persistence, only operations from the **last page edited** are restored. Operations from earlier pages are ignored.

**Root Cause:** The restoration logic filters operations by `getCurrentPagePrefix()` which only matches the current page. If you edited index.html then about.html, only about.html changes are restored.

### Example Scenario
```
1. User edits on index.html → operation created
2. User navigates to about.html → operation created
3. User navigates to contact.html → operation created
4. Page reload → getCurrentPagePrefix() returns 'contact'
5. Only operations with 'contact.' prefix are restored
6. Index and about edits are LOST
```

### Fix Location
**File:** `src/services/PersistenceManager.ts` (line ~242)

**Current Code (WRONG):**
```typescript
const currentPagePrefix = getCurrentPagePrefix();
const filteredOps = filterOperationsByPage(
  unifiedPayload.review.operations,
  currentPagePrefix  // ← ONLY CURRENT PAGE!
);

this.config.changes.initializeWithOperations(filteredOps);
```

**Fix:**
```typescript
// Restore ALL operations regardless of current page
// The ChangesModule will apply them to elements that exist
// If an element doesn't exist on this page, it's still in the operation history
// and will be restored when user navigates to that page

if (
  Array.isArray(unifiedPayload.review?.operations) &&
  unifiedPayload.review.operations.length > 0 &&
  typeof this.config.changes.initializeWithOperations === 'function'
) {
  // CHANGE: Pass ALL operations, not filtered operations
  const allOps = unifiedPayload.review.operations;

  logger.info('Restoring operations from draft', {
    totalCount: allOps.length,
    // Log page distribution for debugging
    pageDistribution: this.summarizeOperationsByPage(allOps),
  });

  this.config.changes.initializeWithOperations(allOps);
}
```

**Helper Method:**
```typescript
private summarizeOperationsByPage(operations: Operation[]): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const op of operations) {
    const pagePrefix = getPagePrefixFromElementId(op.elementId || '');
    if (pagePrefix) {
      summary[pagePrefix] = (summary[pagePrefix] || 0) + 1;
    }
  }
  return summary;
}
```

---

## Test Cases

### Test #1: Filter Ghost Edits
**File:** `tests/unit/changes.test.ts`

```typescript
describe('Ghost Edit Prevention', () => {
  it('should not create operation when content is unchanged', () => {
    const changes = new ChangesModule();
    const elem = { id: 'p-1', content: 'Original', metadata: { type: 'Para' } };
    (changes as any).originalElements = [elem];

    const initialOpsCount = changes.getOperations().length;
    changes.edit('p-1', 'Original'); // Same content

    expect(changes.getOperations()).toHaveLength(initialOpsCount);
  });

  it('should not create operation when only metadata changes to same values', () => {
    const changes = new ChangesModule();
    const elem = {
      id: 'p-1',
      content: 'Text',
      metadata: { type: 'Para' }
    };
    (changes as any).originalElements = [elem];

    const initialOpsCount = changes.getOperations().length;
    changes.edit('p-1', 'Text', undefined, { type: 'Para' });

    expect(changes.getOperations()).toHaveLength(initialOpsCount);
  });

  it('should create operation when content changes', () => {
    const changes = new ChangesModule();
    const elem = { id: 'p-1', content: 'Original', metadata: { type: 'Para' } };
    (changes as any).originalElements = [elem];

    changes.edit('p-1', 'Modified');

    expect(changes.getOperations()).toHaveLength(1);
    expect(changes.getOperations()[0]?.data.newContent).toBe('Modified');
  });

  it('should create operation when metadata actually changes', () => {
    const changes = new ChangesModule();
    const elem = {
      id: 'p-1',
      content: 'Text',
      metadata: { type: 'Para' }
    };
    (changes as any).originalElements = [elem];

    changes.edit('p-1', 'Text', undefined, { type: 'Header', level: 2 });

    expect(changes.getOperations()).toHaveLength(1);
  });
});
```

### Test #2: Restore All Pages
**File:** `tests/integration/persistence-multi-page.integration.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChangesModule } from '@modules/changes';
import { PersistenceManager } from '@/services/PersistenceManager';
import { LocalDraftPersistence } from '@modules/storage/LocalDraftPersistence';
import { TranslationPersistence } from '@modules/translation/storage/TranslationPersistence';
import { NotificationService } from '@/services/NotificationService';
import { EditorHistoryStorage } from '@modules/ui/editor/EditorHistoryStorage';
import type { Operation } from '@/types';

describe('Multi-Page Persistence Restoration', () => {
  let mockStore: any;
  let persistence: LocalDraftPersistence;
  let changes: ChangesModule;

  beforeEach(() => {
    mockStore = {
      getSource: vi.fn().mockResolvedValue(null),
      saveFile: vi.fn().mockResolvedValue(undefined),
      clearAll: vi.fn().mockResolvedValue(undefined),
    };

    persistence = new LocalDraftPersistence(mockStore, {
      filename: 'test-draft.json',
    });

    changes = new ChangesModule();
    (changes as any).originalElements = [
      {
        id: 'index.para-1',
        content: 'Index paragraph',
        metadata: { type: 'Para' }
      },
      {
        id: 'about.para-1',
        content: 'About paragraph',
        metadata: { type: 'Para' }
      },
      {
        id: 'contact.para-1',
        content: 'Contact paragraph',
        metadata: { type: 'Para' }
      },
    ];
  });

  it('should restore operations from all pages, not just current page', async () => {
    // Setup: Create multi-page operations
    const multiPageOps: Operation[] = [
      {
        id: 'op-1',
        type: 'edit',
        elementId: 'index.para-1',
        timestamp: 1000,
        data: {
          type: 'edit',
          oldContent: 'Index paragraph',
          newContent: 'Index modified',
          changes: [],
          oldMetadata: { type: 'Para' },
          newMetadata: { type: 'Para' }
        }
      },
      {
        id: 'op-2',
        type: 'edit',
        elementId: 'about.para-1',
        timestamp: 2000,
        data: {
          type: 'edit',
          oldContent: 'About paragraph',
          newContent: 'About modified',
          changes: [],
          oldMetadata: { type: 'Para' },
          newMetadata: { type: 'Para' }
        }
      },
      {
        id: 'op-3',
        type: 'edit',
        elementId: 'contact.para-1',
        timestamp: 3000,
        data: {
          type: 'edit',
          oldContent: 'Contact paragraph',
          newContent: 'Contact modified',
          changes: [],
          oldMetadata: { type: 'Para' },
          newMetadata: { type: 'Para' }
        }
      }
    ];

    // Mock the stored operations
    mockStore.getSource.mockResolvedValue({
      content: JSON.stringify({
        elements: [],
        operations: multiPageOps,
        comments: []
      }),
      commitMessage: 'test'
    });

    // Simulate current page is 'contact' (last edited page)
    vi.spyOn(window.location, 'pathname', 'get').mockReturnValue('/contact.html');

    // Create PersistenceManager
    const persistenceManager = new PersistenceManager(
      {
        localPersistence: persistence,
        translationPersistence: new TranslationPersistence('test-doc'),
        changes,
        historyStorage: new EditorHistoryStorage({
          prefix: 'test:',
          maxSize: 100000,
          maxStates: 10,
        }),
        notificationService: new NotificationService(),
      },
      {
        onDraftRestored: () => {},
        refresh: () => {},
      }
    );

    // Restore draft
    await persistenceManager.restoreLocalDraft();

    // Verify: ALL operations are restored
    const restoredOps = changes.getOperations();
    expect(restoredOps).toHaveLength(3);

    // Check all pages' operations are present
    const pages = new Set(restoredOps.map(op => op.elementId.split('.')[0]));
    expect(pages).toContain('index');
    expect(pages).toContain('about');
    expect(pages).toContain('contact');
  });

  it('should restore operations even for pages not currently loaded', async () => {
    // Setup: Operations on index page
    const indexOps: Operation[] = [
      {
        id: 'op-1',
        type: 'edit',
        elementId: 'index.para-1',
        timestamp: 1000,
        data: {
          type: 'edit',
          oldContent: 'Index paragraph',
          newContent: 'Index modified',
          changes: [],
          oldMetadata: { type: 'Para' },
          newMetadata: { type: 'Para' }
        }
      }
    ];

    mockStore.getSource.mockResolvedValue({
      content: JSON.stringify({
        elements: [],
        operations: indexOps,
        comments: []
      }),
      commitMessage: 'test'
    });

    // Currently on about page
    vi.spyOn(window.location, 'pathname', 'get').mockReturnValue('/about.html');

    const persistenceManager = new PersistenceManager(
      {
        localPersistence: persistence,
        translationPersistence: new TranslationPersistence('test-doc'),
        changes,
        historyStorage: new EditorHistoryStorage({
          prefix: 'test:',
          maxSize: 100000,
          maxStates: 10,
        }),
        notificationService: new NotificationService(),
      },
      {
        onDraftRestored: () => {},
        refresh: () => {},
      }
    );

    await persistenceManager.restoreLocalDraft();

    // Index operations should still be restored
    const restoredOps = changes.getOperations();
    expect(restoredOps).toHaveLength(1);
    expect(restoredOps[0]?.elementId).toBe('index.para-1');
  });
});
```

---

## Summary of Changes

| Component | Change | Impact |
|-----------|--------|--------|
| `ChangesModule.edit()` | Check content/metadata before creating operation | Eliminates ghost edits |
| `PersistenceManager.restoreLocalDraft()` | Restore ALL operations, not filtered by current page | Fixes multi-page restoration |
| `tests/unit/changes.test.ts` | Add ghost edit prevention tests | Ensures fix works |
| `tests/integration/persistence-multi-page.integration.test.ts` | Add multi-page restoration tests | Catches regressions |

---

## Verification

After applying fixes, verify with your test data:
- ✅ Only 1 operation should be stored (para-1 edit)
- ✅ 7 ghost edits are filtered out
- ✅ Editing page 1, then page 2, then page 3 restores all edits
- ✅ Each page has correct content when loaded
