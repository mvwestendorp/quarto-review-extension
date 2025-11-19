# Test Coverage Improvement Plan

## Current Status

**Overall Coverage:**
- Lines: 65.1% (target: 80%)
- Functions: 65.98% (target: 80%)
- Statements: 64.49% (target: 80%)
- Branches: 52.54% (target: 75%)

**Gap to Close:**
- Lines: +14.9%
- Functions: +14.02%
- Statements: +15.51%
- Branches: +22.46%

---

## Coverage Analysis by Module

### ✅ High Coverage (>80%) - Maintain Quality

These modules are well-tested and should maintain current coverage:

1. **src/modules/changes** (88.11%) - Core state management ✓
2. **src/modules/comments** (86.17%) - Comment parsing ✓
3. **src/modules/git/config.ts** (84.44%) - Git configuration ✓
4. **src/modules/user** (87.93%) - User management ✓
5. **src/utils** (90.38%) - Utility functions ✓
6. **src/modules/markdown/sanitize.ts** (92.85%) - Security critical ✓

**Action:** Continue current testing practices for these modules.

---

### 🔴 Critical Priority - Low Coverage on Core Features

#### 1. UI Components - Comment System (37.03% overall)

**Impact:** High - User-facing features
**Risk:** Medium - Complex UI interactions

##### CommentBadges.ts (11.53%)
- **Missing:** Badge rendering, position calculation, indicator updates
- **Tests Needed:**
  ```
  - Badge creation and DOM insertion
  - Badge count updates
  - Position synchronization with DOM elements
  - Badge click handlers
  - Refresh logic after content changes
  ```
- **Recommendation:** Add 15-20 unit tests covering badge lifecycle
- **Estimated Impact:** +8% overall coverage

##### CommentComposer.ts (16.9%)
- **Missing:** Form submission, validation, event handling
- **Tests Needed:**
  ```
  - Composer open/close lifecycle
  - Text input and validation
  - Submit handler with valid/invalid data
  - Cancel/ESC key handling
  - Edit existing comment flow
  ```
- **Recommendation:** Add 12-15 integration tests
- **Estimated Impact:** +6% overall coverage

##### CommentController.ts (42.03%)
- **Missing:** Comment extraction, markup caching, highlight management
- **Tests Needed:**
  ```
  - Section comment extraction from content
  - Cache/consume markup operations
  - Highlight and clear highlight for different contexts
  - Comment navigation
  - UI refresh coordination
  ```
- **Recommendation:** Add 10-15 unit tests
- **Estimated Impact:** +4% overall coverage

##### CommentsSidebar.ts (62.16%)
- **Partially covered** - Needs branch coverage
- **Tests Needed:**
  ```
  - Edge cases: Empty comments, long comment text
  - Hover/leave event handlers
  - Edit and remove comment actions
  - Section grouping logic
  ```
- **Recommendation:** Add 8-10 edge case tests
- **Estimated Impact:** +3% overall coverage

**Total UI Comments Impact:** ~+21% toward goal

---

#### 2. UI Module - Main Index (63.07%)

**src/modules/ui/index.ts** (59.01%)

This is the largest file (1,280+ lines) and core orchestrator.

**Missing Coverage Areas:**
- Inline editing mode (lines 398-455)
- Segment content processing edge cases
- Heading reference manipulation (multiple code paths)
- List editor target resolution
- Error handling in Milkdown initialization
- Modal vs inline editor branching

**Tests Needed:**
```
- Inline editor open/save/cancel flow (currently only modal tested)
- Segment content into elements for different node types
- Heading reference extraction with various formats
- List target resolution with nested lists
- Editor initialization error scenarios
- Content normalization edge cases
```

**Recommendation:** Add 20-25 targeted unit tests
**Estimated Impact:** +8% overall coverage

---

#### 3. UI Editor Components (54.06% overall)

##### MilkdownEditor.ts (49.59%)
- **Missing:** Plugin error handling, focus management, complex interactions
- **Tests Needed:**
  ```
  - Plugin initialization failures
  - Focus/blur edge cases
  - Diff highlight rendering
  - Toolbar integration
  - Content change debouncing
  ```
- **Recommendation:** Add 15-18 tests
- **Estimated Impact:** +5% overall coverage

##### EditorToolbar.ts (63.54%)
- **Missing:** Button state updates, element type changes
- **Tests Needed:**
  ```
  - Toolbar button enable/disable logic
  - Element type switching (Para -> Header, etc.)
  - Toolbar visibility toggle
  - State synchronization
  ```
- **Recommendation:** Add 10-12 tests
- **Estimated Impact:** +3% overall coverage

##### EditorHistoryStorage.ts (24.41%)
- **Critical low coverage for persistence feature**
- **Tests Needed:**
  ```
  - Storage quota exceeded handling
  - Corrupted data recovery
  - State pruning when max size reached
  - Multi-element history tracking
  - Clear operations
  ```
- **Recommendation:** Add 12-15 tests (partially exists, needs expansion)
- **Estimated Impact:** +4% overall coverage

**Total UI Editor Impact:** ~+12% toward goal

---

#### 4. Markdown Module (75.1%)

**remark-criticmarkup.ts** (57.14%)

- **Missing:** Complex CriticMarkup parsing edge cases
- **Tests Needed:**
  ```
  - Nested CriticMarkup patterns
  - Malformed markup recovery
  - Edge cases: Empty additions, zero-width deletions
  - Multiple markup types on same line
  ```
- **Recommendation:** Add 10-15 edge case tests
- **Estimated Impact:** +3% overall coverage

---

### 🟡 Medium Priority - Incomplete Implementations

#### 5. Git Providers (45.41% overall)

**Context:** These providers have many `notImplemented()` stubs.

##### gitea.ts (6.97%)
##### gitlab.ts (4%)
##### local.ts (5.26%)

**Assessment:** These are **intentionally incomplete** - marked with `notImplemented()`.

**Options:**

**Option A: Exclude from coverage** (Recommended)
```typescript
// Add to vitest.config.ts
coverage: {
  exclude: [
    'src/modules/git/providers/gitea.ts',
    'src/modules/git/providers/gitlab.ts',
    'src/modules/git/providers/local.ts',
  ]
}
```
**Rationale:** These are stub implementations waiting for future development. Testing stubs that throw "not implemented" provides no value.

**Option B: Test the implemented parts**
- Test only the working methods (createPullRequest, getIssue, etc.)
- Add 8-10 tests per provider for working endpoints
- **Impact:** +3-4% overall coverage
- **Downside:** Still won't reach threshold due to large stub areas

**Option C: Add TODO/Skip markers**
```typescript
/* istanbul ignore next */
async createBranch(): Promise<CreateBranchResult> {
  return this.notImplemented();
}
```

**Recommendation:** Option A - Exclude these files and create an issue to track implementation

---

#### 6. UI Sidebars (70.75% overall)

##### ContextMenu.ts (21.91%)
##### ContextMenuCoordinator.ts (40%)

- **Missing:** Menu positioning, event coordination
- **Tests Needed:**
  ```
  - Menu open at cursor position
  - Menu close on outside click
  - Edit/Comment action dispatch
  - Multiple menu prevention
  ```
- **Recommendation:** Add 10-12 tests
- **Estimated Impact:** +3% overall coverage

---

#### 7. Change Summary Dashboard (53.7%)

**src/modules/ui/change-summary.ts**

- **Missing:** Export functionality, stats calculation edge cases
- **Tests Needed:**
  ```
  - Export to different formats
  - Empty state rendering
  - Large operation sets (performance)
  - Grouped operations display
  ```
- **Recommendation:** Add 8-10 tests
- **Estimated Impact:** +3% overall coverage

---

#### 8. Keyboard Shortcuts & Search (78.87% and 54.28%)

**keyboard-shortcuts.ts** (78.87%) - Close to target

**search-find.ts** (54.28%) - Needs work
- **Missing:** Search result highlighting, navigation, edge cases
- **Tests Needed:**
  ```
  - Search with no results
  - Navigate through multiple matches
  - Highlight current match
  - Case-sensitive vs insensitive
  - Regex search patterns
  ```
- **Recommendation:** Add 12-15 tests
- **Estimated Impact:** +4% overall coverage

---

### 🟢 Low Priority - Already Sufficient

#### 9. LocalDraftPersistence (50%)

**Assessment:** Basic happy path covered, missing error scenarios.

**Tests Needed (if time permits):**
```
- localStorage quota exceeded
- Concurrent tab modifications
- Corrupted draft data recovery
```

**Recommendation:** Defer until after reaching main threshold
**Estimated Impact:** +1% overall coverage

---

## Recommended Implementation Strategy

### Phase 1: Quick Wins (2-3 days) - Target: +15%

1. **Exclude stub providers** from coverage → +0% but cleans metrics
2. **Add CommentBadges tests** (15-20 tests) → +8%
3. **Add CommentComposer tests** (12-15 tests) → +6%
4. **Add EditorHistoryStorage tests** (12-15 tests) → +4%

**Phase 1 Result:** 79% overall (close to 80% threshold)

---

### Phase 2: Core Feature Completion (3-4 days) - Target: +10%

1. **UI Module inline editing** (20-25 tests) → +8%
2. **MilkdownEditor edge cases** (15-18 tests) → +5%
3. **Search and find** (12-15 tests) → +4%

**Phase 2 Result:** 89% overall (exceeds threshold)

---

### Phase 3: Branch Coverage (2-3 days) - Target: +12%

Focus on conditional logic and error paths:

1. **UI Module** - heading reference branches
2. **Comment components** - event handler paths
3. **Markdown parser** - CriticMarkup edge cases
4. **Git module** - error handling paths

**Phase 3 Result:** Branches 65%+ (closer to 75% target)

---

### Phase 4: Polish & Maintain (Ongoing)

1. Add tests for any new features
2. Monitor coverage on PRs
3. Refactor complex functions identified during testing
4. Document hard-to-test areas

---

## Alternative: Adjust Thresholds (If Tests Don't Make Sense)

### Current Thresholds
```typescript
thresholds: {
  lines: 80,
  functions: 80,
  branches: 75,
  statements: 80,
}
```

### Recommended Adjusted Thresholds (Per-Module)

```typescript
coverage: {
  thresholds: {
    // Global thresholds (aspirational)
    lines: 70,
    functions: 70,
    branches: 60,
    statements: 70,

    // Per-file overrides
    perFile: true,

    // Strict for core modules
    'src/modules/changes/**/*.ts': {
      lines: 85,
      functions: 85,
      branches: 80,
    },
    'src/modules/comments/index.ts': {
      lines: 85,
      functions: 85,
      branches: 80,
    },

    // Relaxed for UI (complex DOM interactions)
    'src/modules/ui/**/*.ts': {
      lines: 65,
      functions: 65,
      branches: 55,
    },

    // Exclude incomplete providers
    'src/modules/git/providers/{gitea,gitlab,local}.ts': {
      lines: 0,
      functions: 0,
      branches: 0,
    },
  },
}
```

**Rationale:**
- Core business logic (changes, comments) should have high coverage
- UI components are harder to test and have diminishing returns
- Incomplete providers shouldn't count against metrics

---

## Test Quality Guidelines

When adding tests, prioritize:

1. **Bug prevention** - Test failure paths and edge cases
2. **Regression prevention** - Test critical user workflows end-to-end
3. **Refactoring confidence** - Test public APIs thoroughly
4. **Documentation** - Tests as usage examples

Avoid:
- Tests that just call mocks (no value)
- Tests that test the framework (e.g., "it creates an element")
- Overly complex setup for trivial assertions

---

## Metrics to Track

```bash
# Run before/after each phase
npm test -- --coverage

# Focus areas
npm test -- --coverage src/modules/ui/comments
npm test -- --coverage src/modules/ui/editor
npm test -- --coverage src/modules/ui/index.ts
```

---

## Estimated Total Effort

- **Phase 1:** 16-24 hours (Quick wins to ~79%)
- **Phase 2:** 24-32 hours (Core features to ~89%)
- **Phase 3:** 16-24 hours (Branch coverage to ~65%)

**Total:** 56-80 hours (~2 weeks of focused work)

**Alternative (threshold adjustment):** 2-4 hours configuration + documentation

---

## Recommendation

**Hybrid Approach:**

1. ✅ **Exclude stub providers** (immediate)
2. ✅ **Execute Phase 1** (high ROI tests for critical UI features)
3. ✅ **Adjust thresholds per-module** (realistic goals)
4. ✅ **Execute Phase 2 selectively** (based on pain points in production)
5. ⏭️ **Defer Phase 3** (branch coverage) until after initial release

This approach:
- Focuses testing effort where bugs are most likely (UI interactions)
- Acknowledges incomplete features honestly (excluded stubs)
- Sets realistic quality bars per module type
- Delivers practical bug prevention without perfectionism

**Result:** Achievable 70-75% overall coverage with high-quality tests where they matter most.
