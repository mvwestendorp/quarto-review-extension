## Translation Module Modernisation Plan

This programme addresses the remaining gaps between the current translation prototype and a production-ready, modular extension for the review application.

### Strategic Objectives

1. **Stabilise persistence** – translation edits must be first-class operations within the existing change tracking stack.
2. **Separate core & extensions** – the changes/markdown pipeline remains in core modules; translation augments it via explicit extension contracts (domain + UI).
3. **Modularise translation services** – providers, caching, and background processing plug into a consistent abstraction layered on top of the core contracts.
4. **Harden the user experience** – the editing surface must feel native (predictable focus, precise state indicators, responsive rendering).
5. **Deepen observability, documentation, and tests** – end-to-end quality gates and runtime diagnostics expose translation behaviour.

### Architectural Tenets

- **Core-first change model**: `ChangesModule`, markdown reconcilers, and persistence remain the single source of truth; extensions subscribe via well-defined events and adapters.
- **Extension-friendly translation domain**: Translation logic implements extension interfaces (e.g., operation adapter, provider registry) rather than mutating core modules directly.
- **Pluggable UI surface**: Translation UI ships as a plugin layered on the core review UI module, registered/destroyed via lifecycle hooks instead of ad-hoc DOM manipulation.
- **Thin orchestration layer**: Translation controllers focus on wiring extension points together; business rules live in either core or extension modules, not inside UI glue.

### Execution Phases

| Phase | Focus | Status | Detail |
| --- | --- | --- | --- |
| 0 | Extension architecture blueprint | ✅ COMPLETE | [`extension-architecture.md`](extension-architecture.md) |
| 1 | Translation ⇄ Changes integration | ✅ COMPLETE | See `TRANSLATION_REFACTORING_PROGRESS.md` (archived) |
| 2 | Provider architecture & caching | ✅ COMPLETE | See `TRANSLATION_REFACTORING_PROGRESS.md` (archived) |
| 3 | UX contracts & editor reliability | 🔄 IN PROGRESS (8/10 tasks) | [`phase-3-ux-stability.md`](phase-3-ux-stability.md) |
| 4 | Observability, tests, docs | 🔄 IN PROGRESS (5/8 tasks) | [`phase-4-observability-and-quality.md`](phase-4-observability-and-quality.md) |
| 5 | Launch readiness checklist | 📋 PLANNED | [`phase-5-launch-readiness.md`](phase-5-launch-readiness.md) |

**Note:** Historical documentation for completed phases (1-2) has been archived. Refer to commit history for implementation details.

### Working Practices

- Each phase document captures:
  - Design background & constraints
  - Implementation tasks (with acceptance criteria)
  - Validation strategy (tests, manual QA)
  - Risk assessment & mitigations
- Cross-phase dependencies are referenced explicitly to allow parallelisation where possible.
- Files live in `docs/translation-refactor/` to keep scope local to this effort.

### Status Tracking

A lightweight Kanban board will be maintained separately (e.g., GitHub Projects). Each phase document contains its own status section for auditability.
