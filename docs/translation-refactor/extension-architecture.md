## Translation Extension Architecture Blueprint

**Purpose:** describe how the translation feature integrates with the core review engine once the refactor is complete. This blueprint serves as the contract for every phase that follows.

---

### 1. Layered Responsibilities

| Layer | Ownership | Responsibilities | Key Artifacts |
| --- | --- | --- | --- |
| Core Review Engine | `@modules/changes`, markdown pipeline | Maintains authoritative document model, exposes extension hooks, manages persistence, change history, exports. | `ChangesModule`, markdown converters, new `ChangesExtensionRegistry`. |
| Translation Domain Extension | `@modules/translation` | Implements translation-specific state, provider orchestration, sentence mapping, and change adapters registered through the core extension API. | `TranslationExtension`, `TranslationChangeAdapter`, provider registry/cache. |
| UI Plugin Layer | `@modules/ui` + `/translation` plugin | Mounts/unmounts translation experience as a plugin, listens to extension events, updates sidebar + view, forwards user actions to the extension. | `ReviewUIModule.registerPlugin`, `TranslationUIPlugin`. |

---

### 2. Extension Contracts (Core API)

```ts
interface ChangesExtension {
  id: string;
  register(registry: ChangesExtensionRegistry): void;
  dispose(): void;
}

interface ChangesExtensionRegistry {
  on(event: 'beforeEdit' | 'afterEdit' | 'documentChanged', handler: ExtensionEventHandler): void;
  emit(event: ExtensionEvent, payload: ExtensionEventPayload): void;
  applyChange(change: ExtensionChange): void;
  getElement(id: string): Element | null;
  getDocument(): Element[];
}
```

*Implementation notes*
- Core exposes only read APIs plus `applyChange` which wraps existing `ChangesModule` operations (`insert`, `edit`, `delete`, `move`).
- Extension events bubble to interested plugins (translation UI, logging, telemetry).
- `applyChange` enforces `ExtensionChange.source` metadata so core can audit which extension generated which operation.

---

### 3. Translation Extension Responsibilities

1. **Sentence Mapping**
   - Maintain bi-directional maps between source/target sentences and the underlying elements.
   - Emit `translation:sentence-updated`, `translation:sentence-status`, `translation:document-sync` events via registry.

2. **Change Application**
   - Convert sentence edits to `ExtensionChange` objects with operation subtype `translation-edit`.
   - Guard source vs. target updates (source updates core markdown immediately; target updates remain isolated until merge).

3. **Provider Orchestration**
   - Own the provider registry/cache.
   - Surface provider lifecycle events (`initialising`, `ready`, `error`, `cache-hit`, `cache-miss`).

4. **Persistence**
   - Store translation-specific state via local storage/session storage keyed by document ID & language pair.
   - Support hydration by validating source sentence compatibility before replay.

5. **Lifecycle**
   - `register()` attaches event listeners, subscribes to core change events, initialises state.
   - `dispose()` removes listeners, flushes pending persistence, detaches provider registry, issues `translation:disposed`.

---

### 4. UI Plugin Contract

```ts
interface ReviewUIPlugin {
  id: string;
  mount(context: ReviewUIContext): PluginHandle;
}

interface PluginHandle {
  dispose(): void;
}
```

`ReviewUIContext` exposes:
- `events`: emitter subscribed to extension registry events.
- `commands`: wrapper around translation actions (translate sentence, swap languages, merge).
- `sidebar`: API for contributing sections, toggles, and status indicators.
- `view`: API for injecting center-pane content (mounting translation view component).

**Translation UI Plugin Flow**
1. `mount` registers sidebar sections and view container, binds event handlers.
2. Listens for `translation:*` events to update status chips, progress bars, undo availability.
3. Calls `commands` to trigger domain actions (e.g., translate document, merge changes).
4. `dispose` tears down DOM nodes, unsubscribes, restores review UI layout.

---

### 5. Cross-Cutting Concerns

| Concern | Decision |
| --- | --- |
| Undo/Redo | Translation extension pushes operations through `applyChange`; undo stack remains unified. UI enables translation undo buttons by delegating to translation extension history helpers. |
| Auto-translate toggle | Stored in translation extension state; UI plugin reflects status from `translation:settings` events. |
| Source edit isolation | When auto-translate is disabled, extension suppresses target change updates, emitting an `out-of-sync` status so UI can display a badge. |
| Performance | Extension debounces batch updates and uses `requestIdleCallback` where available; UI plugin virtualises sentence rendering and listens for `translation:render-window` hints. |
| Telemetry | Extension emits structured logs (`logger.info('translation:update', payload)`); UI plugin consumes provider metrics for display only. |

---

### 6. Migration Strategy

1. **Introduce Extension Registry** (Phase 1 T1–T3)
   - Add registry scaffolding behind feature flag; plug translation adapter into it while keeping old paths for fallback.
2. **Port Translation Module** (Phase 1 T2/T4/T6)
   - Rework `TranslationModule` to implement `ChangesExtension`; migrate sentence mapping and change flow.
3. **Adopt UI Plugin** (Phase 1 T5 & Phase 3 T0)
   - Wrap existing `TranslationController` behaviour into plugin; remove direct DOM manipulation from core UI module.
4. **Retire Legacy Paths**
   - Once extension + plugin stable, delete legacy hooks, update documentation, and feature flag removal.

---

### 7. Open Questions / Next Steps

- **Extension API stability**: evaluate whether other features (comments, tracked changes) could reuse the registry to avoid bespoke integrations.
- **Provider sandboxing**: confirm how long-running providers communicate progress without blocking UI threads.
- **Export pipeline**: decide whether translation merged content should travel through core exporters automatically or be exposed via plugin-specific exporters.
- **Testing**: design contract tests for extension registration to guard against regressions when core change semantics evolve.

Document authored to guide the upcoming implementation phases; update as decisions land.
