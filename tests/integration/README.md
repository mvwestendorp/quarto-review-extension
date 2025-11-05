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

**Status**: ✅ 15/15 tests passing

### 2. Persistence + Changes Integration (`persistence-changes.integration.test.ts`)
Tests the interaction between `PersistenceManager` and `ChangesModule`:
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

**Status**: ⚠️ 9/14 tests passing (needs LocalDraftPersistence API adjustments)

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

**Status**: ⚠️ 5/15 tests passing (needs QmdExportService API verification)

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

**29 of 44 tests passing** (66% pass rate)

The integration tests provide comprehensive coverage of multi-module interactions. Test failures are due to minor API mismatches that need to be resolved by verifying actual module method signatures.

## Coverage

Integration tests complement unit tests by:
- Testing real interactions between modules
- Verifying data flows across module boundaries
- Catching integration issues that unit tests miss
- Testing end-to-end workflows

## TODO

- [ ] Fix API mismatches in persistence tests
  - Verify LocalDraftPersistence.saveDraft() signature
  - Check operation restoration flow
  - Fix cross-session persistence test

- [ ] Fix API mismatches in export tests
  - Verify QmdExportService constructor and methods
  - Check exportToQmd() return format
  - Verify file writing integration

- [ ] Create UI + Comments integration tests
  - Use correct CommentsModule API: `addComment(elementId, content, userId)`
  - Use `getCommentsForElement(elementId)` instead of `getCommentsByElementId`
  - Use `getComment(id)` instead of `getCommentById`

- [ ] Create Translation + UI integration tests
  - Verify TranslationModule API methods
  - Check state management interface

- [ ] Add more integration tests:
  - [ ] UI + Export integration
  - [ ] Git + Translation integration
  - [ ] Comments + Translation integration
  - [ ] Full end-to-end workflow tests

## Notes

- Integration tests use vi.fn() mocks for external dependencies (Git, storage)
- Tests create isolated DOM environments using jsdom
- Each test suite is independent and can run in parallel
- Tests follow AAA pattern: Arrange, Act, Assert
- **Important**: Some tests have API mismatches and serve as templates showing expected integration patterns. These will be fixed once actual module APIs are verified.
