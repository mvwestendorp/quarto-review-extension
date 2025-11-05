# StateStore Integration for Translation Module

## Overview

The translation module has been refactored to use centralized state management through the `StateStore` service. This provides reactive state updates, better separation of concerns, and improved maintainability.

## Architecture

### State Management Flow

```
┌─────────────────┐
│   StateStore    │ ◄─── Central state management
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌──────────┐ ┌──────────┐
│Controller│ │   View   │ ◄─── Reactive UI updates
└──────────┘ └──────────┘
    │             │
    └──────┬──────┘
           │
           ▼
    ┌──────────────┐
    │ Translation  │ ◄─── Core translation logic
    │   Module     │
    └──────────────┘
```

### TranslationState Interface

Located in `src/modules/ui/shared/UIState.ts`:

```typescript
export interface TranslationState {
  // Translation mode active status
  isActive: boolean;

  // Selected sentences for operations
  selectedSourceSentenceId: string | null;
  selectedTargetSentenceId: string | null;

  // Translation operation status
  isBusy: boolean;
  progressPhase: 'idle' | 'running' | 'success' | 'error';
  progressMessage: string;
  progressPercent?: number;
}
```

## Components

### 1. StateStore (`src/services/StateStore.ts`)

**New Methods:**
- `getTranslationState()`: Get current translation state (read-only)
- `setTranslationState(updates)`: Update translation state
- `resetTranslationState()`: Reset to initial state

**Events:**
- `'translation:changed'`: Emitted when translation state changes

**Usage:**
```typescript
// Subscribe to translation state changes
stateStore.on<TranslationState>('translation:changed', (state) => {
  console.log('Translation state:', state);
});

// Update translation state
stateStore.setTranslationState({
  isBusy: true,
  progressPhase: 'running',
  progressMessage: 'Translating...',
});
```

### 2. TranslationController (`src/modules/ui/translation/TranslationController.ts`)

**Integration Points:**

1. **Initialization:**
   ```typescript
   constructor(config: TranslationControllerConfig) {
     if (config.stateStore) {
       this.stateStore = config.stateStore;
       this.stateStoreUnsubscribe = this.stateStore.on<TranslationState>(
         'translation:changed',
         (state) => this.handleStateStoreUpdate(state)
       );
     }
   }
   ```

2. **State Updates:**
   - Progress tracking: Updates `progressPhase`, `progressMessage`, `progressPercent`
   - Busy state: Updates `isBusy` during translation operations
   - Selection: Tracks `selectedSourceSentenceId` and `selectedTargetSentenceId`

3. **Cleanup:**
   ```typescript
   destroy(): void {
     if (this.stateStoreUnsubscribe) {
       this.stateStoreUnsubscribe();
     }
     if (this.stateStore) {
       this.stateStore.resetTranslationState();
     }
   }
   ```

### 3. TranslationView (`src/modules/ui/translation/TranslationView.ts`)

**Integration Points:**

1. **Initialization:**
   ```typescript
   constructor(
     config: TranslationViewConfig,
     callbacks: TranslationViewCallbacks,
     markdown?: MarkdownModule,
     editorBridge?: TranslationEditorBridge,
     stateStore?: StateStore
   ) {
     this.stateStore = stateStore || null;
     if (this.stateStore) {
       this.stateStoreUnsubscribe = this.stateStore.on<TranslationState>(
         'translation:changed',
         (state) => this.handleStateStoreUpdate(state)
       );
     }
   }
   ```

2. **Reactive Updates:**
   - Automatically updates UI when progress status changes
   - Syncs selected sentence highlighting
   - Updates progress bar and messages

3. **User Interactions:**
   ```typescript
   private selectSentence(sentenceId: string, side: 'source' | 'target'): void {
     this.selectedSentence = { id: sentenceId, side };

     // Update StateStore
     if (this.stateStore) {
       this.stateStore.setTranslationState({
         selectedSourceSentenceId: side === 'source' ? sentenceId : null,
         selectedTargetSentenceId: side === 'target' ? sentenceId : null,
       });
     }
   }
   ```

### 4. TranslationModule (`src/modules/translation/index.ts`)

**New Method: `updateSegmentContent()`**

Provides public API for re-segmentation when content changes:

```typescript
translationModule.updateSegmentContent(
  elementId: string,
  newContent: string,
  role: 'source' | 'target'
)
```

**Features:**
- Re-segments content into sentences
- Updates internal sentence storage
- Handles correspondence mapping
- Marks affected sentences as out-of-sync (for source changes)
- Emits state update events

**Use Cases:**
- User edits an element's content
- External changes from other modules
- Synchronization with document state

## Benefits

### 1. Centralized State Management
- Single source of truth for translation state
- Predictable state updates
- Easy debugging with state change logging

### 2. Reactive UI Updates
- View automatically updates when state changes
- No manual UI synchronization needed
- Consistent state across components

### 3. Improved Separation of Concerns
- Controller handles business logic
- View handles UI rendering
- StateStore handles state management
- TranslationModule handles core translation

### 4. Better Testability
- State changes are observable
- Easy to mock StateStore for testing
- Clear boundaries between components

### 5. Type Safety
- Strongly typed state interface
- TypeScript catches state misuse
- IntelliSense support for state access

## Migration Guide

### For New Components

To integrate with translation state:

```typescript
import type { StateStore } from '@/services/StateStore';
import type { TranslationState } from '@modules/ui/shared';

class MyComponent {
  private stateStore: StateStore;
  private unsubscribe: (() => void) | null = null;

  constructor(stateStore: StateStore) {
    this.stateStore = stateStore;

    // Subscribe to translation state
    this.unsubscribe = this.stateStore.on<TranslationState>(
      'translation:changed',
      (state) => {
        if (state.isBusy) {
          // Handle busy state
        }
      }
    );
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
```

### For Existing Components

1. Add StateStore parameter to constructor (optional)
2. Subscribe to `'translation:changed'` events
3. Update component state based on TranslationState
4. Clean up subscription in destroy method

## Testing

### Unit Tests

```typescript
import { createStateStore } from '@/services/StateStore';

describe('Translation StateStore Integration', () => {
  it('should update translation state', () => {
    const store = createStateStore();

    store.setTranslationState({
      isBusy: true,
      progressMessage: 'Translating...',
    });

    const state = store.getTranslationState();
    expect(state.isBusy).toBe(true);
    expect(state.progressMessage).toBe('Translating...');
  });

  it('should notify listeners on state change', (done) => {
    const store = createStateStore();

    store.on<TranslationState>('translation:changed', (state) => {
      expect(state.isBusy).toBe(true);
      done();
    });

    store.setTranslationState({ isBusy: true });
  });
});
```

### Integration Tests

See `tests/unit/translation-integration.test.ts` for comprehensive integration test examples.

## Future Enhancements

### Planned Features

1. **Persistence Integration**
   - Save translation state to localStorage
   - Restore state on page reload

2. **Undo/Redo State**
   - Track state history in StateStore
   - Enable undo/redo for all state changes

3. **State Snapshots**
   - Export current state for debugging
   - Import state for testing

4. **Performance Monitoring**
   - Track state update frequency
   - Monitor listener performance

### Extension Points

The StateStore is designed to be extensible:

- Add new state slices (e.g., `translationSettings`, `translationHistory`)
- Create derived state selectors
- Implement middleware for state transformations
- Add state validation and constraints

## Troubleshooting

### Common Issues

**Issue: State updates not reflecting in UI**
- Check that component is subscribed to `'translation:changed'`
- Verify StateStore is properly initialized
- Ensure subscription is not cleaned up prematurely

**Issue: Multiple state updates causing performance issues**
- Consider batching state updates
- Use debouncing for frequent updates
- Check for unnecessary re-renders

**Issue: State inconsistencies between components**
- Verify all components use the same StateStore instance
- Check for direct state mutations (always use setters)
- Enable debug logging: `createStateStore({ debug: true })`

## References

- [StateStore API Documentation](../dev/MODULES.md#statestore)
- [Translation Module Architecture](./extension-architecture.md)
- [Phase 3: UX Stability](./phase-3-ux-stability.md)
- [Integration Tests](../../tests/unit/translation-integration.test.ts)
