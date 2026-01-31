# Quarto Review Extension - Refactoring Roadmap

## Executive Summary

The Quarto Review Extension is a well-structured, feature-rich application with good test coverage (71%) and solid architecture. However, it shows signs of monolithic growth, particularly in the UIModule (2,554 lines) and TranslationModule (1,558 lines).

**Total Estimated Refactoring Cost:** ~150-200 hours

---

## Project Overview

- **Total TypeScript Files:** 110 source files, 83 test files
- **Total Lines of Code:** ~8,857 lines
- **Build:** Vite + TypeScript (strict mode), outputs to `dist/review.js`
- **Test Coverage:** 71.27% line coverage
- **Architecture:** Modular with 8 main modules, extension registry pattern, event-driven

---

## 1. Critical Refactoring - Priority 1

### 1.1 UIModule Decomposition (HIGHEST PRIORITY)

**Current State:**
- Single monolithic class: 2,554 lines
- 30+ methods with mixed responsibilities
- Hard to test in isolation
- Difficult to understand control flow

**Target State:**
```
UIModule → Five focused classes:
├── ElementRenderer (rendering/DOM updates)
├── EditorController (editor lifecycle)
├── HeadingManager (heading reference tracking)
├── SegmentationService (content splitting)
└── CommentUICoordinator (comment interaction)
```

**Benefits:**
- Reduced cognitive load per class
- Easier unit testing
- Better code reuse
- Clearer dependencies

**Estimated Effort:** 40-60 hours

**Implementation Steps:**
1. Analyze all 30+ methods and group by responsibility
2. Create new classes with focused interfaces
3. Extract shared utilities
4. Update all callers
5. Add comprehensive tests for each class
6. Document the new structure

---

### 1.2 TranslationModule Refactoring

**Current State:**
- Monolithic class: 1,558 lines
- Mixing persistence, state, and translation logic
- Multiple responsibilities tangled together

**Target State:**
```
TranslationModule → Four focused classes:
├── Core TranslationEngine (sentence/alignment logic)
├── TranslationState (immutable state management)
├── TranslationPersistence (storage only)
└── TranslationUIBridge (UI integration)
```

**Benefits:**
- Testable translation logic independently of UI
- Reusable persistence layer
- Clear separation of concerns

**Estimated Effort:** 20-30 hours

---

### 1.3 Eliminate MainSidebar Legacy ✅ COMPLETE

**Status:** COMPLETED
- MainSidebar migration complete
- UnifiedSidebar: 1,371 lines (production-ready replacement)
- All callbacks properly migrated

**Completed Work:**
- ✅ All MainSidebar methods mapped to UnifiedSidebar
- ✅ All event listeners properly transferred
- ✅ Tests updated for UnifiedSidebar
- ✅ UI behavior unchanged
- ✅ No regressions in sidebar functionality

**Effort Spent:** 4-6 hours (QUICK WIN ACHIEVED)

---

## 2. Code Duplication Elimination - Priority 2

### 2.1 HTML Template Utilities

**Current Problem:**
- Modal creation repeated in 3+ files (ReviewSubmissionModal, editor, comment composer)
- Inconsistent patterns for button creation, form construction
- No shared template utility

**Solution:**
Create `src/utils/template.ts`:
```typescript
export function createModal(config: ModalConfig): HTMLElement;
export function createButton(label: string, options?: ButtonOptions): HTMLElement;
export function createForm(fields: FormField[]): HTMLElement;
export function createAction(icon: string, label: string, callback: Fn): HTMLElement;
```

**Files Affected:**
- ReviewSubmissionModal.ts
- EditorToolbar.ts
- CommentComposer.ts
- TranslationView.ts

**Estimated Effort:** 8-12 hours

---

### 2.2 Unify Event Registration Pattern

**Current Problem:**
- Event handling scattered across files
- Similar event setup in UIModule, TranslationController, CommentController
- Repetitive callback registration patterns
- No cleanup mechanism for preventing memory leaks

**Solution:**
Create `src/utils/event-binder.ts`:
```typescript
export class EventBinder {
  bind(target: Element, event: string, handler: Fn, options?: AddEventListenerOptions): void;
  unbind(target: Element, event: string, handler: Fn): void;
  cleanup(): void;  // Unbind all registered listeners
}
```

**Benefits:**
- Consistent event handling
- Automatic cleanup for memory leak prevention
- Easier testing with spy capability
- Centralized event management

**Estimated Effort:** 10-15 hours

---

### 2.3 Consolidate Git Provider Base Logic

**Current Problem:**
- Azure DevOps: 942 lines
- GitLab: 509 lines
- GitHub, Gitea: Similar reimplementation of base logic
- Each provider duplicates: error handling, auth, API calls, pagination

**Solution:**
Implement Template Method Pattern:
```typescript
abstract class GitProvider {
  async call(method: string, endpoint: string, data?: any): Promise<any>;
  async authenticate(): Promise<void>;
  protected abstract request(): Promise<any>;
}
```

**Consolidated Methods:**
- Error handling
- Rate limit handling
- Authentication flow
- API response parsing
- Retry logic

**Estimated Effort:** 15-20 hours

---

### 2.4 Extract Content Normalization

**Current Problem:**
- Content normalization repeated in UIModule, TranslationView, ChangesModule
- Functions: removeNestedDivs, cleanCriticMarkup, normalizeLineEndings, trimWhitespace
- Inconsistent implementations across modules

**Solution:**
Create `src/utils/content-normalizer.ts`:
```typescript
export class ContentNormalizer {
  removeNestedDivs(html: string): string;
  cleanCriticMarkup(text: string): string;
  normalizeLineEndings(text: string): string;
  trimWhitespace(text: string): string;
  normalize(text: string, options?: NormalizeOptions): string;
}
```

**Estimated Effort:** 6-10 hours

---

## 3. Architectural Improvements - Priority 2

### 3.1 Unify State Management

**Current Problem:**
- Multiple sources of truth: StateStore + individual module state + DOM attributes
- State duplication between layers
- Difficult to debug state changes
- Race conditions possible

**Target:**
Single reactive state tree with event propagation

**Implementation Steps:**
1. Audit all state locations (StateStore, modules, DOM)
2. Design single state schema
3. Implement state tree with watchers
4. Update all modules to use single source
5. Add state inspection/debugging tools

**Estimated Effort:** 25-35 hours

---

### 3.2 Expand Plugin System

**Current State:**
- TranslationPlugin exists but partial
- Other features are hardcoded

**Target:**
Make all major features optional plugins:
- Comments plugin
- Search plugin
- ChangesSummary plugin
- CriticMarkup plugin

**Benefits:**
- Optional features
- Easier testing
- Modularity
- Extensibility for users

**Estimated Effort:** 30-40 hours

---

### 3.3 Central Service Registry

**Current Pattern:**
- Modules passed via config objects
- Hard to track dependencies
- Testing requires manual wiring

**Target:**
Service locator pattern:
```typescript
export class ServiceRegistry {
  register(name: string, service: any): void;
  get<T>(name: string): T;
  has(name: string): boolean;
}
```

**Estimated Effort:** 10-15 hours

---

### 3.4 Standardize Error Handling

**Current Problem:**
- Inconsistent patterns: try/catch, callbacks, silent failures
- Poor error reporting to users
- Hard to debug failures

**Solution:**
ErrorBoundary pattern with recovery strategies:
```typescript
export class ErrorBoundary {
  catch(error: Error, context: string): void;
  recover(strategy: RecoveryStrategy): Promise<void>;
}
```

**Estimated Effort:** 12-18 hours

---

## 4. Documentation Improvements - Priority 3

### 4.1 Algorithm Documentation

**Missing Docs:**
- Correspondence mapping algorithm (alignment-algorithm.ts)
- Sentence segmentation strategy
- Diff computation in converters.ts

**Documentation Template:**
1. Algorithm purpose and use case
2. Input/output specifications
3. Key steps and logic flow
4. Time/space complexity
5. Edge cases and limitations
6. Code examples

**Estimated Effort:** 8-12 hours

---

### 4.2 Internal API Documentation

**Missing Docs:**
- Extension registry system
- StateStore reactive patterns
- EditorManager operation locking
- Plugin lifecycle hooks

**Estimated Effort:** 10-15 hours

---

### 4.3 Troubleshooting Guide

**Topics:**
- Common error scenarios
- Performance optimization tips
- Memory management in long sessions
- Git provider configuration issues
- Translation accuracy troubleshooting

**Estimated Effort:** 6-10 hours

---

### 4.4 Code Examples & Guides

**Content:**
- Module composition examples
- Extension development guide
- Plugin creation walkthrough
- Custom UI component examples

**Estimated Effort:** 8-12 hours

---

## 5. Test Improvements - Priority 3

### 5.1 Improve UIModule Coverage

**Current:** Hard to test due to monolithic structure
**Target:** >90% coverage after decomposition
**Approach:**
- Unit tests for each extracted class
- Integration tests for class interactions
- Mock external dependencies

**Estimated Effort:** 15-20 hours

---

### 5.2 Add Missing Test Scenarios

**Gaps:**
- Error recovery scenarios
- Memory leak prevention in listeners
- Concurrent edit handling
- Large document performance (1000+ elements)

**Estimated Effort:** 10-15 hours

---

## 6. Performance Optimization - Priority 4

### 6.1 DOM Rendering Optimization

**Current Issue:** Creates temporary DOM for every element render, no diffing

**Solution Options:**
1. Virtual DOM library (Lit, Preact)
2. Manual diffing with caching
3. Incremental rendering

**Potential Gain:** 50-70% faster

**Estimated Effort:** 30-40 hours

---

### 6.2 Translation Processing Optimization

**Current Issue:** Re-processes all elements on any change

**Solution:** Incremental segmentation with caching

**Potential Gain:** 60-80% faster

**Estimated Effort:** 20-30 hours

---

### 6.3 Change Tracking Optimization

**Current Issue:** Applies all operations sequentially, no caching

**Solution:** Memo-ized state tree

**Potential Gain:** 40-50% faster

**Estimated Effort:** 15-20 hours

---

### 6.4 Comment Rendering Optimization

**Current Issue:** Re-renders all comments on any change, no virtualization

**Solution:** Virtualized list with memoization

**Potential Gain:** 80-90% faster

**Estimated Effort:** 10-15 hours

---

## 7. Security Hardening - Priority 4

### Current Strengths
- XSS prevention: `escapeHtml()` used consistently
- HTML sanitization in CriticMarkup handling
- No eval or dynamic code execution
- Proper error handling

### Gaps to Address
- LocalStorage injection risks (user-controlled data)
- Missing CSRF token validation for Git operations
- No input validation on file operations
- Git token storage could be more secure

**Estimated Effort:** 8-12 hours

---

## 8. Implementation Timeline

### Phase 1: Quick Wins (Weeks 1-2)
- [ ] Remove MainSidebar (4-6 hours)
- [ ] Extract HTML template utilities (8-12 hours)
- [ ] Extract content normalizer (6-10 hours)
- **Total:** ~20 hours

### Phase 2: Core Refactoring (Weeks 3-8)
- [ ] UIModule decomposition (40-60 hours)
- [ ] TranslationModule refactoring (20-30 hours)
- [ ] Unify event registration (10-15 hours)
- [ ] Consolidate Git providers (15-20 hours)
- **Total:** ~100-130 hours

### Phase 3: Architecture & Documentation (Weeks 9-14)
- [ ] Unify state management (25-35 hours)
- [ ] Add algorithm documentation (8-12 hours)
- [ ] Add troubleshooting guides (6-10 hours)
- [ ] Improve test coverage (15-20 hours)
- **Total:** ~55-80 hours

### Phase 4: Polish & Performance (Weeks 15+)
- [ ] Performance optimization (50-100 hours)
- [ ] Expand plugin system (30-40 hours)
- [ ] Security hardening (8-12 hours)
- **Total:** ~90-150 hours

---

## 9. Success Metrics

After refactoring completion:

| Metric | Current | Target |
|--------|---------|--------|
| Largest class size | 2,554 lines | <500 lines |
| Code duplication | High (template, events, providers) | Minimal |
| Test coverage | 71% | >85% |
| UIModule testability | Low (monolithic) | High (modular) |
| Documentation completeness | 70% | 95% |
| Performance (100+ elements) | Slow | 50-70% faster |
| Cyclomatic complexity avg | High | Medium |
| Maintainability Index | Medium | High |

---

## 10. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking existing functionality | Comprehensive test suite before/after, gradual rollout |
| Regression in performance | Benchmark suite before/after refactoring |
| Loss of plugin compatibility | Version the plugin API, provide migration guide |
| Team context loss | Document decisions, record architecture decisions |
| Over-engineering | Follow YAGNI principle, measure actual needs |

---

## 11. Recommended Starting Points

### For Quick Impact (1-2 weeks)
1. **Remove MainSidebar** - Quick win, clear code
2. **Extract template utilities** - Reduces duplication immediately
3. **Document algorithms** - Improves maintainability

### For Long-term Health (2-3 months)
1. **UIModule decomposition** - Biggest architectural improvement
2. **Unify state management** - Foundation for all other improvements
3. **Expand test coverage** - Enables confident refactoring

### For Complete Modernization (3-6 months)
1. Follow Phase 1-4 timeline sequentially
2. Focus on stabilizing Phase 1 before Phase 2
3. Get team buy-in on architectural changes

---

## Appendix: Complexity Hotspots

| File | Lines | Issue | Priority |
|------|-------|-------|----------|
| UIModule/index.ts | 2,554 | Monolithic god class | P1 |
| TranslationModule/index.ts | 1,558 | Large feature with many responsibilities | P1 |
| UnifiedSidebar.ts | 1,371 | Complex UI coordinator | P2 |
| TranslationView.ts | 1,624 | Dual-pane UI implementation | P2 |
| MainSidebar.ts | 1,299 | Legacy sidebar (should be removed) | P1 |
| EditorToolbar.ts | 757 | Large toolbar management | P3 |
| AzureProvider.ts | 942 | Provider implementation duplication | P2 |
| GitLabProvider.ts | 509 | Provider implementation duplication | P2 |

---

## Notes for Implementation

- All refactoring should be done on feature branches with thorough testing
- Include clear commit messages explaining changes
- Update documentation as code changes
- Consider team training on new patterns/architecture
- Schedule code reviews for major refactoring PRs
- Maintain backwards compatibility where possible
