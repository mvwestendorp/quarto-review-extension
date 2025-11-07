# Test-Driven Development Strategy for localStorage Restoration

## Executive Summary

The localStorage persistence system has been refactored to separate comments from edits. While the current implementation is functional, there are **8 identified gaps** and the existing tests don't fully cover cross-session restoration scenarios. This document outlines a TDD approach to ensure robust persistence functionality.

---

## Part 1: Current Test Evaluation

### Existing Test Coverage

#### ✅ Well-Tested Areas

1. **LocalDraftPersistence (6 tests)**
   - `tests/unit/local-draft-persistence.test.ts`
   - Coverage: save/load with comments, legacy migration, error handling
   - Status: **Complete** - covers basic I/O operations

2. **Persistence Integration (21 tests)**
   - `tests/integration/persistence-changes.integration.test.ts`
   - Coverage: operations, multi-cycle persistence, error handling
   - Status: **Good** - covers basic workflows

3. **ChangesModule (50+ tests)**
   - `tests/unit/changes.test.ts`
   - Coverage: operations, undo/redo, state calculation
   - Status: **Excellent** - comprehensive edge cases

4. **CommentsModule (80+ tests)**
   - `tests/unit/comments.test.ts`
   - Coverage: parsing, rendering, lifecycle
   - Status: **Excellent** - comprehensive coverage

#### ⚠️ Partially Tested Areas

1. **Comment Restoration Without Content Changes**
   - **Current**: Single test in integration suite (line 212-232)
   - **Gap**: Only tests one scenario
   - **Missing**: Comments-only restore with multiple elements, comments-only restore with deletions

2. **Empty State Handling**
   - **Current**: Implicit in basic tests
   - **Gap**: Not explicitly tested
   - **Missing**: Explicit test for first-load behavior, empty+comments scenario, empty+operations scenario

3. **Cross-Session Restoration**
   - **Current**: One basic test (line 392-407)
   - **Gap**: Minimal coverage
   - **Missing**: Multiple operations across sessions, comment updates between sessions, concurrent changes

#### ❌ Untested Areas

1. **Storage Quota Exceeded**
   - Current: Not tested at all
   - Impact: Silent failures on large documents
   - Risk: High - data loss without notification

2. **Baseline Tracking After Reload**
   - Current: No tests
   - Impact: Tracked changes visualization incorrect
   - Risk: Medium - affects change visualization

3. **Comment Ordering Preservation**
   - Current: No tests
   - Impact: Comments appear in different order
   - Risk: Low - functional but confusing

4. **Concurrency (Multiple Tabs)**
   - Current: No tests
   - Impact: Last write wins, potential data loss
   - Risk: Medium - only affects multi-tab users

5. **Partial Restoration Failure**
   - Current: No tests
   - Impact: Comments load but edits fail (or vice versa)
   - Risk: Medium - incomplete state

6. **Operations History Preservation**
   - Current: Tested indirectly
   - Impact: Cannot reconstruct edit history
   - Risk: Low - not critical for current workflow

7. **Large Document Performance**
   - Current: No tests
   - Impact: Slow restoration, potential timeout
   - Risk: Medium - affects usability

8. **Migration from Inline Comments**
   - Current: Tested in UIModule integration
   - Gap: Not isolated in persistence tests
   - Missing: Edge cases like mixed inline+separate comments

---

## Part 2: Test Relevance Analysis

### Test Relevance Matrix

| Test | Relevant? | Reason | Priority |
|------|-----------|--------|----------|
| Basic save/load | ✅ Yes | Foundation | Critical |
| Multi-cycle persistence | ✅ Yes | Real workflow | Critical |
| Persistence with comments | ✅ Yes | Feature | Critical |
| Operations history | ✅ Yes | Reconstruction | High |
| Legacy migration | ✅ Yes | Backward compat | High |
| Error handling | ⚠️ Partial | Only handles I/O errors | Medium |
| Cross-session | ⚠️ Partial | Basic only, needs expansion | Medium |
| Auto-save integration | ⚠️ Partial | Only happy path | Medium |

### Recommendations for Existing Tests

1. **Keep as-is**: Basic I/O, operations, error handling
2. **Expand**: Cross-session tests (add 5-7 more scenarios)
3. **Refactor**: Integrate into new comprehensive suite
4. **Add coverage**: All 8 gap areas

---

## Part 3: Test-Driven Development Roadmap

### Phase 1: Foundation Tests (New File)

**File**: `tests/integration/persistence-restoration.integration.test.ts`

#### 1.1 Cross-Session Restoration - Single Element

```typescript
describe('localStorage - Cross-Session Restoration', () => {
  describe('Single element scenarios', () => {
    test('should restore single edit after page reload', async () => {
      // Setup: ChangesModule with 1 edit
      // Act: Save, clear memory, reload
      // Assert: Edit restored to same state
    });

    test('should restore multiple edits in same element', async () => {
      // Setup: 3 sequential edits to same element
      // Assert: All edits applied
    });

    test('should preserve edit metadata after reload', async () => {
      // Setup: Edit with custom metadata
      // Assert: Metadata intact
    });
  });
});
```

#### 1.2 Cross-Session Comments Restoration

```typescript
describe('Comments restoration', () => {
  test('should restore comments without content changes', async () => {
    // Setup: 1 element, 0 edits, 3 comments
    // Assert: Comments restored, content unchanged
  });

  test('should restore multiple comments on same element', async () => {
    // Setup: Element with 5 comments
    // Assert: All comments restored with correct elementId
  });

  test('should restore resolved comment state', async () => {
    // Setup: Mix of resolved/unresolved comments
    // Assert: Resolution state preserved
  });

  test('should restore comment metadata (userId, timestamp)', async () => {
    // Setup: Comments with user/timestamp info
    // Assert: All metadata intact
  });
});
```

#### 1.3 Combined Edits + Comments Restoration

```typescript
describe('Combined edits and comments', () => {
  test('should restore both edits and comments together', async () => {
    // Setup: Element with 2 edits + 2 comments
    // Assert: Both restored correctly
  });

  test('should handle comments on edited content', async () => {
    // Setup: Comment added after edit
    // Assert: Comment linked to correct location
  });

  test('should handle deletion with remaining comments', async () => {
    // Setup: Delete element that has comments
    // Assert: Comments not lost, can be restored
  });
});
```

### Phase 2: Edge Cases & Gaps Tests

**File**: `tests/integration/persistence-edge-cases.integration.test.ts`

#### 2.1 Empty State Scenarios

```typescript
describe('Empty state handling', () => {
  test('should handle first load with no edits or comments', async () => {
    // Setup: Empty ChangesModule, empty CommentsModule
    // Assert: Restore returns early, no errors
  });

  test('should handle comments-only with no edits', async () => {
    // Setup: Empty edits, 2 comments
    // Assert: Comments imported, UI updates
  });

  test('should handle edits-only with no comments', async () => {
    // Setup: 2 edits, no comments
    // Assert: Edits restored, no comment errors
  });

  test('should handle completely empty restoration', async () => {
    // Setup: No edits, no comments, nothing in storage
    // Assert: No errors, graceful no-op
  });
});
```

#### 2.2 Partial Restoration Failures

```typescript
describe('Partial restoration', () => {
  test('should restore comments even if comment import fails', async () => {
    // Setup: Comments import throws, edits valid
    // Assert: Edits still restored, error logged
  });

  test('should continue restoring edits if comments fail', async () => {
    // Setup: Comments import fails, edits valid
    // Assert: Edits applied, notification shows partial success
  });

  test('should handle missing comment module gracefully', async () => {
    // Setup: PersistenceManager without CommentsModule
    // Assert: Restore edits, skip comments, no error
  });
});
```

#### 2.3 Storage Quota Tests

```typescript
describe('Storage quota management', () => {
  test('should handle localStorage quota exceeded', async () => {
    // Setup: Mock localStorage.setItem to throw QuotaExceededError
    // Assert: User notified, graceful failure
  });

  test('should detect when document exceeds quota', async () => {
    // Setup: Create document near storage limit
    // Assert: Warning shown before exceeding
  });

  test('should suggest cleanup when quota low', async () => {
    // Setup: Document uses 80%+ of quota
    // Assert: Suggestion to clear old drafts shown
  });
});
```

#### 2.4 Concurrency & Multi-Tab

```typescript
describe('Concurrency scenarios', () => {
  test('should handle rapid consecutive saves', async () => {
    // Setup: 10 saves in quick succession
    // Assert: Last state correct, no corruption
  });

  test('should handle multi-tab scenario (last write wins)', async () => {
    // Setup: Simulate 2 tabs making changes
    // Assert: Last write preserved (current behavior)
  });

  test('should warn user about multi-tab conflicts', async () => {
    // Setup: Detect same document open in multiple tabs
    // Assert: Warning shown on save conflict
  });
});
```

### Phase 3: Performance & Scalability Tests

**File**: `tests/integration/persistence-performance.integration.test.ts`

#### 3.1 Large Document Performance

```typescript
describe('Large document performance', () => {
  test('should restore 1000+ elements within 2 seconds', async () => {
    // Setup: 1000 elements with various edits
    // Assert: Restore time < 2s
  });

  test('should restore 500+ comments without lag', async () => {
    // Setup: 500 comments across elements
    // Assert: Import completes quickly
  });

  test('should handle large edit history gracefully', async () => {
    // Setup: 200+ operations in history
    // Assert: Reconstruction accurate, no timeout
  });
});
```

#### 3.2 Baseline Tracking After Reload

```typescript
describe('Baseline tracking', () => {
  test('should preserve baselines across session', async () => {
    // Setup: Edit element, note baseline
    // Act: Save, reload, verify baseline
    // Assert: Baseline unchanged
  });

  test('should reconstruct baseline from operations', async () => {
    // Setup: Know operations but not baselines
    // Assert: Can recalculate baseline correctly
  });

  test('should show correct tracked changes after reload', async () => {
    // Setup: Edit with tracked changes on
    // Act: Save, reload, enable tracked changes
    // Assert: Diff visualization correct
  });
});
```

### Phase 4: Integration with UI

**File**: `tests/integration/persistence-ui-integration.integration.test.ts`

#### 4.1 UIModule Integration

```typescript
describe('UIModule persistence integration', () => {
  test('should restore and update DOM after page load', async () => {
    // Setup: UIModule with saved state
    // Act: Page reload
    // Assert: DOM reflects restored state
  });

  test('should restore comments and update sidebar', async () => {
    // Setup: Saved comments
    // Act: Page reload
    // Assert: Sidebar shows comments
  });

  test('should show restoration notification once per session', async () => {
    // Setup: Saved state exists
    // Act: Load page twice
    // Assert: Notification on first load only
  });
});
```

#### 4.2 State Store Integration

```typescript
describe('StateStore integration', () => {
  test('should sync restored state to StateStore', async () => {
    // Setup: Editor state in localStorage
    // Act: Restore
    // Assert: StateStore updated
  });

  test('should maintain selection after restoration', async () => {
    // Setup: Selected element saved
    // Act: Reload
    // Assert: Same element selected
  });
});
```

### Phase 5: Regression Prevention Tests

**File**: `tests/integration/persistence-regression.integration.test.ts`

#### 5.1 Comment Migration

```typescript
describe('Inline comment migration', () => {
  test('should migrate inline comments to separate storage', async () => {
    // Setup: Old format with inline {>>comments<<}
    // Assert: Converted to CommentsModule
  });

  test('should not double-import migrated comments', async () => {
    // Setup: Comments both inline and imported
    // Assert: No duplicate comments
  });

  test('should handle mixed inline and separate comments', async () => {
    // Setup: Some comments inline, some separate
    // Assert: All preserved correctly
  });
});
```

#### 5.2 Operations Preservation

```typescript
describe('Operations history', () => {
  test('should save operations array in draft', async () => {
    // Setup: Element with multiple operations
    // Act: Save
    // Assert: Draft payload includes operations
  });

  test('should restore operations for undo/redo', async () => {
    // Setup: Operations in draft
    // Act: Load, attempt undo
    // Assert: Undo works correctly
  });

  test('should handle corrupted operations gracefully', async () => {
    // Setup: Invalid operations in storage
    // Assert: Skip operations, restore state only
  });
});
```

#### 5.3 Comment Ordering

```typescript
describe('Comment ordering', () => {
  test('should preserve comment order across reload', async () => {
    // Setup: 5 comments in specific order
    // Act: Save, reload
    // Assert: Order unchanged
  });

  test('should maintain comment order in sidebar', async () => {
    // Setup: Comments with timestamps
    // Assert: Sidebar displays in saved order
  });
});
```

---

## Part 4: Implementation Strategy

### Step-by-Step Approach

#### 1. Write Tests First (TDD)

For each test area:
1. Write test that **fails** initially
2. Run test to confirm failure
3. Implement only what's needed to pass
4. Refactor if needed
5. Move to next test

#### 2. Test Execution Order

```
Phase 1: Foundation (8 tests)
  ↓
Phase 2: Edge Cases (14 tests)
  ↓
Phase 3: Performance (6 tests)
  ↓
Phase 4: UI Integration (6 tests)
  ↓
Phase 5: Regression (9 tests)
  ↓
Total: 43 new tests
```

#### 3. Expected Failures & Implementations

| Test | Expected to Fail | Implementation Needed |
|------|-----------------|----------------------|
| Storage quota | ✅ Yes | QuotaExceededError handler + notification |
| Large documents | ⚠️ Maybe | Performance optimization if needed |
| Baseline tracking | ✅ Yes | Reconstruct baselines from operations |
| Multi-tab warning | ✅ Yes | Tab visibility API check |
| Operations save | ✅ Yes | Include operations in DraftPayload |
| Comment order | ⚠️ Maybe | Use ordered array instead of Map |

---

## Part 5: Test Data Fixtures

### Reusable Test Builders

```typescript
// Factory functions for test data
const createTestElement = (overrides = {}) => ({
  id: 'elem-1',
  content: 'Test content',
  metadata: { type: 'Para' },
  ...overrides
});

const createTestComment = (overrides = {}) => ({
  id: 'comment-1',
  elementId: 'elem-1',
  content: 'Test comment',
  userId: 'user-1',
  timestamp: Date.now(),
  resolved: false,
  type: 'comment',
  ...overrides
});

const createTestOperation = (overrides = {}) => ({
  type: 'edit',
  elementId: 'elem-1',
  data: { before: 'old', after: 'new' },
  timestamp: Date.now(),
  ...overrides
});

// Builders with fluent API
class TestDataBuilder {
  private edits: EditData[] = [];
  private comments: Comment[] = [];

  withEdit(content: string) {
    this.edits.push({ content });
    return this;
  }

  withComment(content: string) {
    this.comments.push({ content, elementId: 'elem-1' });
    return this;
  }

  build() {
    return { edits: this.edits, comments: this.comments };
  }
}
```

---

## Part 6: Critical Success Metrics

### Test Coverage Goals

| Category | Current | Target | Method |
|----------|---------|--------|--------|
| localStorage Save/Load | 100% | 100% | Maintain |
| Comment Restoration | 50% | 95% | Add 6 tests |
| Edit Restoration | 80% | 95% | Add 3 tests |
| Edge Cases | 30% | 90% | Add 13 tests |
| Performance | 0% | 80% | Add 6 tests |
| Integration | 50% | 90% | Add 6 tests |
| **Overall** | **~60%** | **~90%** | **43 new tests** |

### Acceptance Criteria

1. ✅ All 43 new tests pass
2. ✅ No regressions in existing 28 tests
3. ✅ Code coverage >85% for persistence modules
4. ✅ All 8 identified gaps have tests
5. ✅ Performance tests baseline established
6. ✅ Documentation updated with patterns

---

## Part 7: Risk Mitigation

### High-Risk Areas

| Risk | Mitigation | Test |
|------|-----------|------|
| Data loss on quota exceeded | Add explicit error handling | `should handle localStorage quota exceeded` |
| Silent corruption on multi-tab | Add conflict detection | `should warn user about multi-tab conflicts` |
| Incorrect tracked changes display | Reconstruct baselines | `should show correct tracked changes after reload` |
| Duplicate comments on migration | Add duplicate detection | `should not double-import migrated comments` |
| Lost operations history | Ensure operations saved | `should save operations array in draft` |

---

## Part 8: Timeline & Milestones

### Estimated Timeline

- **Phase 1** (Foundation): 4 hours
  - Write 8 tests, implement support

- **Phase 2** (Edge Cases): 6 hours
  - Write 14 tests, implement gap fixes

- **Phase 3** (Performance): 3 hours
  - Write 6 tests, optimize if needed

- **Phase 4** (UI Integration): 4 hours
  - Write 6 tests, verify integration

- **Phase 5** (Regression Prevention): 3 hours
  - Write 9 tests, prevent regressions

- **Documentation & Review**: 2 hours

**Total: ~22 hours of implementation**

### Success Metrics

- [ ] Phase 1: All foundation tests green
- [ ] Phase 2: All edge case tests green, gaps filled
- [ ] Phase 3: Performance baselines established
- [ ] Phase 4: Full UI integration verified
- [ ] Phase 5: No regressions detected
- [ ] Overall coverage >85%
- [ ] Documentation complete

---

## Part 9: Conclusion & Next Steps

### Key Takeaways

1. **Current system is good but incomplete**
   - Core functionality works
   - Edge cases and failures not handled
   - Performance not tested

2. **43 new tests will cover remaining gaps**
   - 8 identified risk areas addressed
   - Cross-session scenarios comprehensive
   - Performance baselines established

3. **TDD approach ensures quality**
   - Tests written before fixes
   - All changes justified by test failures
   - Regression prevention built-in

### Immediate Next Steps

1. Create `tests/integration/persistence-restoration.integration.test.ts`
2. Write Phase 1 tests (8 tests)
3. Run tests - confirm failures
4. Implement fixes to pass tests
5. Run full suite - confirm no regressions
6. Commit with message: "test(persistence): add cross-session restoration tests"
7. Continue with Phase 2...

### Long-term Improvements

- Consider adding automatic draft cleanup (old drafts)
- Implement storage quota monitoring
- Add IndexedDB as fallback for large documents
- Consider service worker for offline support
- Add analytics for storage usage patterns

---

## Appendix A: Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  LocalDraftPersistence,
  ChangesModule,
  CommentsModule
} from '@modules/...';

describe('localStorage - [Feature Name]', () => {
  let persistence: LocalDraftPersistence;
  let changes: ChangesModule;
  let comments: CommentsModule;

  beforeEach(() => {
    // Setup
    persistence = new LocalDraftPersistence();
    changes = new ChangesModule();
    comments = new CommentsModule();
  });

  afterEach(() => {
    // Cleanup
    persistence.clearAll?.();
    changes.clear?.();
    comments.clear?.();
  });

  describe('[Specific Scenario]', () => {
    it('should [expected behavior]', async () => {
      // Arrange
      const testData = createTestElement();
      changes.edit(testData.id, 'new content');

      // Act
      const saved = await persistence.saveDraft({
        elements: [testData],
        comments: [],
      });

      // Assert
      expect(saved).toBe(true);
      const loaded = await persistence.loadDraft();
      expect(loaded?.elements[0].content).toBe('new content');
    });
  });
});
```

---

## Appendix B: Monitoring & Observability

### Metrics to Track

```typescript
// In PersistenceManager
class PersistenceMetrics {
  trackSave(size: number, duration: ms, success: boolean) {
    // Track: size, time, success rate
  }

  trackRestore(elementCount: number, commentCount: number, duration: ms) {
    // Track: restore time, element count, comment count
  }

  trackQuotaUsage(used: bytes, available: bytes) {
    // Track: quota percentage, alert if >80%
  }

  trackErrors(error: string, context: object) {
    // Track: error types, frequency, context
  }
}
```

This enables monitoring of:
- Storage quota trends
- Restoration success rates
- Performance degradation over time
- Most common error scenarios
