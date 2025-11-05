# Integration Tests

This directory contains integration tests that verify interactions between multiple modules of the Quarto Review Extension.

## Test Suites

### 1. Git + Changes Integration (`git-changes.integration.test.ts`)
Tests the interaction between `GitReviewService` and `ChangesModule`:
- Clean markdown export for Git commits (without CriticMarkup)
- Tracked markdown export with CriticMarkup for review
- Git workflow: branch creation, commits, pushes
- Operations history integration with Git
- Conflict detection
- Multi-file export
- Operation restoration from persistence

**Status**: ✅ 12/12 tests passing

### 2. Persistence + Changes Integration (`persistence-changes.integration.test.ts`)
Tests the interaction between `LocalDraftPersistence` and `ChangesModule`:
- Draft persistence with state and operations
- Restoring drafts across sessions
- Multiple save/load cycles
- Operation history preservation (timestamps, IDs)
- Complex operation sequences
- Persistence with comments
- Draft cleanup
- Error handling (quota exceeded, corrupted data)
- Auto-save workflow
- Cross-session persistence

**Status**: ✅ 13/13 tests passing

### 3. Export + Changes Integration (`export-changes.integration.test.ts`)
Tests the interaction between `QmdExportService` and `ChangesModule`:
- Clean export without tracked changes
- Preserving document structure
- Tracked export with CriticMarkup
- Showing insertions and deletions
- Multi-file export
- Mapping changes to source files
- Export with comments
- Metadata preservation
- Format conversion
- Error handling
- Performance with large documents
- Git integration

**Status**: ✅ 19/19 tests passing

## Running Integration Tests

Run all integration tests:
```bash
npm test -- tests/integration/
```

Run a specific test suite:
```bash
npm test -- tests/integration/git-changes.integration.test.ts
```

## Current Status

**✅ 44 of 44 tests passing (100% pass rate)**

All integration tests provide comprehensive coverage of multi-module interactions with verified API signatures.

## Coverage

Integration tests complement unit tests by:
- Testing real interactions between modules
- Verifying data flows across module boundaries
- Catching integration issues that unit tests miss
- Testing end-to-end workflows
- Verifying API contracts between modules

## Test Patterns

### Module Mocking
Tests use `vitest` mocks for external dependencies:
```typescript
const mockGitModule = {
  isAvailable: vi.fn().mockResolvedValue(true),
  getConfig: vi.fn().mockReturnValue({ ... }),
  createBranch: vi.fn().mockResolvedValue(undefined),
  // ... other methods
} as unknown as GitModule;
```

### Helper Functions
Tests include helper functions to construct test data:
```typescript
function buildChangesWithElements(elements: Element[]): ChangesModule {
  const changes = new ChangesModule();
  (changes as unknown as { originalElements: Element[] }).originalElements =
    elements.map((element) => ({ ...element }));
  return changes;
}
```

### Test Organization
Each test suite follows this structure:
1. **Setup**: Create mocks and initialize modules
2. **Test Groups**: Organized by feature area
3. **Assertions**: Verify both state and interactions

## Module Interactions Tested

### Git ↔ Changes
- Export clean markdown for commits
- Export tracked markdown for review
- Operations history for PR descriptions
- Conflict detection
- Multi-file workflows

### Persistence ↔ Changes
- Draft save/restore with operations
- Cross-session recovery
- Operation history preservation
- Auto-save patterns

### Export ↔ Changes
- Bundle creation with different formats
- Multi-file export coordination
- Metadata preservation
- Format conversion (clean vs. critic)

## Adding New Integration Tests

To add new integration tests:

1. Create a new file in `tests/integration/`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleA } from '@modules/a';
import { ModuleB } from '@modules/b';

describe('ModuleA + ModuleB Integration', () => {
  // Setup and tests
});
```

2. Follow existing patterns:
   - Use mocks for external dependencies
   - Test real interactions, not implementation details
   - Verify both state changes and method calls
   - Include error handling scenarios

3. Update this README with the new test suite

## Future Integration Tests

Potential additional test suites:
- [ ] UI + Comments integration (comment creation, threading, resolution)
- [ ] Translation + UI integration (translation workflows, state sync)
- [ ] Comments + Translation integration
- [ ] UI + Export integration
- [ ] Git + Translation integration
- [ ] Full end-to-end workflow tests

## Notes

- Integration tests use vi.fn() mocks for external dependencies (Git, storage)
- Tests create isolated DOM environments using jsdom
- Each test suite is independent and can run in parallel
- Tests follow AAA pattern: Arrange, Act, Assert
- All tests verify actual module APIs, not assumed interfaces
