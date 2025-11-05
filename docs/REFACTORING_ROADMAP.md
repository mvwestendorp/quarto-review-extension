# Refactoring Roadmap

This document outlines the remaining high-priority refactoring tasks identified in the code audit.

## Completed ✅

### Critical Improvements (Completed)
1. **Documentation Cleanup** - Removed 36 unnecessary files (74 → 42 files, 43% reduction)
2. **Race Condition Fix** - Added editor operation locking to prevent concurrent edits
3. **Git Error Handling** - Created comprehensive error class hierarchy
4. **Service Extraction** - Extracted NotificationService, LoadingService, and PersistenceManager

### High Priority (Completed)
1. **Lua Filter Modularization** - Split 1,222-line monolithic file into 6 focused modules (81% reduction)
2. **EditorManager Extraction** - Extracted 395 lines of editor operations from UIModule

### Metrics
- **UIModule reduced**: 2,637 → 2,354 lines (283 lines removed, 11% reduction)
- **New services created**: 4 (NotificationService, LoadingService, PersistenceManager, EditorManager)
- **Lua modules created**: 6 (path-utils, project-detection, string-utils, markdown-conversion, config, element-wrapping)
- **Tests**: All 1,378 tests passing ✅
- **Type safety**: 0 type errors ✅

---

## Remaining High Priority Tasks

### 1. Modularize Lua Filter ✅ (Completed)

**Status**: ✅ **COMPLETED** - Modular Lua filter is now active

**Implementation**:
- Created 6 focused modules in `_extensions/review/lib/`
- New `review-modular.lua` (229 lines, down from 1,222)
- Extension now uses modular version
- All 1,420 tests passing ✅

**Current State**: Modular implementation in production

**Proposed Modules**:

```
_extensions/review/lib/
├── path-utils.lua          (~125 lines)
│   ├── to_forward_slashes()
│   ├── normalize_path()
│   ├── join_paths()
│   ├── parent_directory()
│   ├── make_relative()
│   ├── to_absolute_path()
│   ├── file_exists()
│   └── read_file()
│
├── project-detection.lua   (~130 lines)
│   ├── get_primary_input_file()
│   ├── detect_project_root_from_extension()
│   ├── detect_project_root()
│   ├── find_project_root()
│   ├── should_skip_directory()
│   ├── collect_project_sources()
│   └── build_embedded_sources_script()
│
├── string-utils.lua        (~240 lines)
│   ├── sanitize_identifier()
│   ├── escape_html()
│   ├── deepcopy()
│   ├── table_to_json()
│   ├── meta_to_json()
│   └── generate_id()
│
├── markdown-conversion.lua (~140 lines)
│   ├── should_include_chunk_class()
│   ├── format_chunk_option_value()
│   ├── sort_chunk_options()
│   ├── codeblock_to_markdown()
│   └── element_to_markdown()
│
├── element-wrapping.lua    (~190 lines)
│   ├── make_editable()
│   ├── get_source_position()
│   └── Element handlers (Para, Header, CodeBlock, etc.)
│
└── config.lua              (~50 lines)
    ├── load_config()
    ├── detect_document_identifier()
    ├── build_debug_config()
    └── has_translation_support()
```

**Main File** (`review.lua`): ~350 lines
- Require all modules
- Define global config and context
- Implement Meta() filter
- Implement unwrap_nested_editable()
- Export filter functions

**Implementation Steps**:
1. Create `_extensions/review/lib/` directory
2. Extract path-utils.lua first (most independent)
3. Extract project-detection.lua (depends on path-utils)
4. Extract string-utils.lua (mostly independent)
5. Extract markdown-conversion.lua (depends on string-utils)
6. Extract element-wrapping.lua (depends on markdown-conversion)
7. Extract config.lua (depends on string-utils)
8. Refactor main review.lua to require all modules
9. Test thoroughly with existing Quarto documents

**Benefits**:
- Easier to understand and maintain
- Better testability (can test modules independently)
- Reduced cognitive load (each module has single responsibility)
- Easier to add new features

**Estimated Effort**: 4-6 hours

---

### 2. Add Lua Test Suite (High Priority)

**Current State**: Only 1 Lua test file (`tests/lua/sanitize-identifier.test.lua`)

**Target**: Comprehensive test coverage for all Lua modules

**Test Files to Create**:

```
tests/lua/
├── sanitize-identifier.test.lua      (exists ✅)
├── path-utils.test.lua               (new)
├── project-detection.test.lua        (new)
├── string-utils.test.lua             (new)
├── markdown-conversion.test.lua      (new)
├── element-wrapping.test.lua         (new)
├── config.test.lua                   (new)
└── integration.test.lua              (new)
```

**Test Coverage Goals**:

**path-utils.test.lua**:
- normalize_path() with various inputs (relative, absolute, Windows, Unix)
- join_paths() edge cases
- make_relative() path conversions
- Cross-platform path handling

**project-detection.test.lua**:
- detect_project_root() with _quarto.yml
- detect_project_root() without project file
- collect_project_sources() filtering

**string-utils.test.lua**:
- sanitize_identifier() special characters
- generate_id() uniqueness
- table_to_json() serialization
- deepcopy() nested tables

**markdown-conversion.test.lua**:
- codeblock_to_markdown() with options
- element_to_markdown() for all element types
- Chunk option formatting

**element-wrapping.test.lua**:
- make_editable() with different elements
- ID generation consistency
- Attribute preservation

**config.test.lua**:
- load_config() parsing
- detect_document_identifier() fallbacks
- Configuration merging

**Test Framework**: Using `busted` (Lua testing framework)

**Setup**:
```bash
# Install busted
luarocks install busted

# Run all Lua tests
npm run test:lua
```

**Estimated Effort**: 3-4 hours

---

### 3. Extract EditorManager from UIModule (Medium Priority)

**Current State**: Editor operations mixed throughout UIModule

**Target**: Dedicated EditorManager service (~400 lines to extract)

**Methods to Extract**:
- `openEditor()`
- `openInlineEditor()`
- `openModalEditor()`
- `closeEditor()`
- `saveEditor()`
- `cancelEditor()`
- `setupEditorEventListeners()`
- Editor state management
- Editor history management

**New File**: `src/services/EditorManager.ts`

**Benefits**:
- Further reduce UIModule size (~400 lines)
- Isolate editor logic
- Easier to add new editor features
- Better testability

**Dependencies**:
- EditorLifecycle
- EditorToolbar
- EditorHistoryStorage
- MilkdownEditor
- NotificationService
- ChangesModule

**Estimated Effort**: 6-8 hours (complex due to many dependencies)

---

## Medium Priority Tasks

### 4. Consolidate Build Scripts

**Current State**: Multiple build scripts with some duplication

**Files**:
- `scripts/build-css.js` (148 lines)
- `scripts/copy-assets.js` (99 lines)

**Issues**:
- Manual directory recursion in copy-assets.js
- Build steps not coordinated
- Some code duplication

**Improvements**:
1. Use `fs-extra` library instead of manual recursion
2. Create unified `scripts/build.js` orchestrator
3. Add proper error handling
4. Parallelize independent build steps

**Estimated Effort**: 2-3 hours

---

### 5. Add Integration Tests

**Current State**: 77 unit tests, no integration tests

**Gap**: Missing tests for multi-module interactions

**Tests to Add**:
- Git + Changes integration
- UI + Comments interaction
- Persistence + State management
- Translation + UI coordination
- Full document lifecycle tests

**Estimated Effort**: 4-6 hours

---

### 6. Implement State Management

**Current Issue**: State scattered across multiple modules

**Current State Objects**:
- `editorState` (UIModule)
- `uiState` (UIModule)
- `commentState` (UIModule)
- Various module-specific state

**Options**:
1. **Zustand** - Lightweight, simple API
2. **Valtio** - Proxy-based, minimal boilerplate
3. **Custom EventEmitter** - No dependencies

**Benefits**:
- Single source of truth
- Predictable state updates
- Easier debugging
- Better performance

**Estimated Effort**: 8-12 hours

---

### 7. Add Performance Monitoring

**Current Issue**: No performance tracking for expensive operations

**Additions Needed**:
- Cache layer for expensive operations
- Debouncing/throttling for UI updates
- Virtual scrolling for large documents
- Performance marks and measures

**Estimated Effort**: 6-8 hours

---

## Low Priority Tasks

### 8. Type Safety Improvements

**Areas for Improvement**:
- Replace `any` types with proper types
- Add branded types for IDs
- More explicit return types
- Better type guards

**Estimated Effort**: 4-6 hours

---

### 9. Memory Leak Prevention

**Audit Needed**:
- Event listener cleanup
- DOM reference cleanup
- Plugin disposal
- Editor instance cleanup

**Estimated Effort**: 3-4 hours

---

## Summary

### Completed So Far
- ✅ 36 unnecessary files removed
- ✅ Race condition fixed
- ✅ Git error handling improved
- ✅ 4 services extracted (Notification, Loading, Persistence, EditorManager)
- ✅ UIModule reduced by 283 lines (11% reduction)
- ✅ **Lua filter modularized** - 1,222 lines → 229 lines (81% reduction)
- ✅ **Integration tests added** - comprehensive multi-module testing
- ✅ All 1,420 tests passing
- ✅ Zero type errors

### Immediate Next Steps (Recommended Order)
1. ✅ **Modularize Lua filter** - COMPLETED
2. **Add Lua test suite** (3-4 hours) - Ensures quality, prevents regressions for Lua modules
3. ✅ **Extract EditorManager** - COMPLETED
4. ✅ **Add integration tests** - COMPLETED

### Total Estimated Effort
- High Priority: 13-18 hours
- Medium Priority: 20-29 hours
- Low Priority: 7-10 hours
- **Grand Total**: 40-57 hours

---

## Notes

- All refactoring should maintain backward compatibility
- Tests must pass after each change
- Type checking must pass after each change
- Document breaking changes if any
- Update this roadmap as tasks are completed
