## Phase 2 · Provider Architecture & Caching

**Status:** ☐ Not Started  
**Objective:** Modular provider system with deterministic caching, lifecycle management, and clear status reporting.

### 1. Motivation

- Current Local AI provider handles caching internally and binds tightly to `TranslationModule`.
- No interface exists for network providers (e.g., OpenAI, DeepL), blocking extensibility.
- Cache management is opaque; clearing the cache requires a full page refresh.

### 2. Design Principles

1. **Provider Abstraction** – Standardise methods for availability, initialisation, translation, and teardown.
2. **Extension-first integration** – Providers plug into the translation extension layer, not directly into `TranslationModule`, keeping the core contract clean.
3. **Provider Registry** – Allow modules to register/unregister providers at runtime.
4. **Cache Service** – Shared cache keyed by provider/model/lang pair with explicit lifecycle controls.
5. **Status Propagation** – Sidebar/UI receives structured provider info (backend, mode, cost notice, cache hit/miss) via plugin events.

### 3. Implementation Tasks

| ID | Task | Deliverable / Acceptance |
| --- | --- | --- |
| P2-T1 | Define `TranslationProvider` interface (v2) | Methods: `initialize`, `translate`, `translateBatch`, `isAvailable`, `getInfo`, `dispose`. |
| P2-T2 | Implement provider registry | New `ProviderRegistry` class responsible for discovery, default selection, and event emission; exposed via the translation extension API. |
| P2-T3 | Refactor Local AI provider | Move caching logic to shared cache service; add progressive loading events; ensure WebGPU detection pluggable. |
| P2-T4 | Add mock HTTP provider | Simple REST-backed provider demonstrating latency handling and retries. |
| P2-T5 | Extension events for providers | Emit registry updates via `translationExtension.emit('provider:update', payload)` consumed by UI plugins. |
| P2-T6 | Expose provider status to UI plugin | Extend translation UI plugin to subscribe to provider events and render backend + cache info panes. |
| P2-T7 | Cache management API | `TranslationCacheService` with `get`, `set`, `invalidate`, `stats`. Hook clear-cache button to this service. |
| P2-T8 | Telemetry hooks | Emit provider metrics (load time, cache hits, errors) through debug logger. |
| P2-T9 | Documentation | Provider onboarding guide, registry lifecycle, and cache behaviour documentation anchored to the extension concept. |

### 4. Architectural Sketch

- **Core modules**
  - `src/modules/translation/providers/registry.ts`
  - `src/modules/translation/cache/TranslationCacheService.ts`
- **Events**
  - `provider:registered`, `provider:ready`, `provider:error`, `cache:hit/miss/invalidate`
- **UI plugin**
  - Sidebar status module displays provider name, backend, cache status, and warning icons by subscribing to extension events.
- **Extensibility**
  - Third parties implement the interface and register via `ProviderRegistry.register(...)`.

### 5. Validation

- **Unit tests**
  - Registry operations (register/unregister/default selection).
  - Cache service eviction policies.
  - Provider contracts (local, mock HTTP).
- **Integration tests**
  - Switch providers mid-session; translation uses new provider.
  - Cache clear button invalidates and requires reload of model.
- **Manual QA**
  - Simulate offline for Local AI; ensure remote provider fallback.
  - Verify debug logs expose provider events.

### 6. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Increased complexity in provider lifecycle | Document lifecycle states; add debug logger output for state transitions. |
| Cache invalidation causing stale data | Implement cache versioning and auto-invalidate on provider updates. |
| UI overload | Keep sidebar concise; allow collapsible provider details panel. |

### 7. Dependencies

- Builds on Phase 1 adapter for operation persistence (provider changes feed into same pipeline).
- Phase 3 will rely on registry events for status chips in view.

### 8. Definition of Done

- Two providers (Local AI + HTTP mock) fully functional under registry.
- Cache stats accessible via `reviewDebug.providers()`.
- Documentation published; QA sign-off on provider switching and cache clear flows.
