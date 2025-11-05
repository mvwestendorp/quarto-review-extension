# Translation Module Logging Taxonomy

## Overview

This document defines the logging standards, conventions, and taxonomy for the translation module. Consistent logging enables effective debugging, monitoring, and troubleshooting in both development and production environments.

## Logging Infrastructure

### Logger Creation

All translation module components use the centralized `createModuleLogger` utility:

```typescript
import { createModuleLogger } from '@utils/debug';

const logger = createModuleLogger('TranslationModule');
```

### Log Levels

The translation module uses standard log levels with specific semantic meanings:

| Level | Method | Use Case | Example |
|-------|--------|----------|---------|
| **DEBUG** | `logger.debug()` | Development diagnostics, state transitions, detailed flow | `logger.debug('Re-segmented element', { elementId, sentenceCount })` |
| **INFO** | `logger.info()` | Normal operations, milestone events, user actions | `logger.info('Translation initialized', { docId })` |
| **WARN** | `logger.warn()` | Recoverable issues, deprecated usage, unexpected but handled states | `logger.warn('Source content changed since initialization')` |
| **ERROR** | `logger.error()` | Errors that affect functionality but allow continued operation | `logger.error('Failed to translate sentence', error)` |

### Enabling Debug Logging

Debug logging can be enabled via:

1. **Browser Console:**
   ```javascript
   localStorage.setItem('debug', 'quarto-review:translation*');
   ```

2. **URL Parameter:**
   ```
   ?debug=quarto-review:translation*
   ```

3. **Wildcard Patterns:**
   ```
   localStorage.setItem('debug', 'quarto-review:*'); // All modules
   localStorage.setItem('debug', 'quarto-review:Translation*'); // All translation logs
   ```

## Module-Specific Taxonomy

### 1. TranslationModule (`src/modules/translation/index.ts`)

**Logger Name:** `TranslationModule`

**Key Events:**

| Event | Level | Message Pattern | Context Data |
|-------|-------|-----------------|--------------|
| Initialization | INFO | `Translation persistence initialized` | `{ docId }` |
| Document initialized | INFO | `Translation module initialized` | `{ sourceCount, targetCount }` |
| State updated | DEBUG | `Translation module updated` | N/A |
| Save operation | DEBUG | `Translation auto-saved to storage` | N/A |
| Re-segmentation | INFO | `Updating segment content with re-segmentation` | `{ elementId, role, contentLength }` |
| Re-segmentation complete | INFO | `Segment content updated successfully` | `{ elementId, role, newSentenceCount }` |
| Sentence updated | DEBUG | `Updating sentence` | `{ sentenceId, isSource, newContent }` |
| Pair updated | DEBUG | `Updating pair metadata after target edit` | `{ pairId, status, trimmedLength }` |
| Source hash mismatch | WARN | `Source content has changed since translation initialization` | `{ originalHash, currentHash }` |
| Storage unavailable | WARN | `Skipping translation persistence setup: local storage unavailable` | N/A |
| Restore failed | ERROR | `Failed to restore translation from storage` | error object |

**Example Log Output:**
```
[TranslationModule] Translation persistence initialized { docId: 'doc-en-nl-abc123' }
[TranslationModule] Translation module initialized { sourceCount: 45, targetCount: 45 }
[TranslationModule] Segment content updated successfully { elementId: 'para-1', role: 'target', newSentenceCount: 3 }
```

### 2. TranslationController (`src/modules/ui/translation/TranslationController.ts`)

**Logger Name:** `TranslationController`

**Key Events:**

| Event | Level | Message Pattern | Context Data |
|-------|-------|-----------------|--------------|
| Initialization | INFO | `TranslationController initialized` | `{ sourceLanguage, targetLanguage, userSettings, hasStateStore }` |
| Translation started | INFO | `Starting document translation` | `{ provider, sourceLanguage, targetLanguage }` |
| Sentence translation | INFO | `Translating selected sentence` | `{ sentenceId }` |
| Translation complete | INFO | `Document translation completed` | `{ translatedCount }` |
| Settings changed | INFO | `Translation settings updated` | `{ setting, value }` |
| Keyboard shortcuts | INFO | `Keyboard shortcuts registered for translation` | N/A |
| Error handling | ERROR | `Translation failed` | error object |
| Destroy | INFO | `Destroying translation controller` | N/A |

**Example Log Output:**
```
[TranslationController] TranslationController initialized { sourceLanguage: 'en', targetLanguage: 'nl', hasStateStore: true }
[TranslationController] Starting document translation { provider: 'openai', sourceLanguage: 'en', targetLanguage: 'nl' }
[TranslationController] Document translation completed { translatedCount: 45 }
```

### 3. TranslationView (`src/modules/ui/translation/TranslationView.ts`)

**Logger Name:** `TranslationView`

**Key Events:**

| Event | Level | Message Pattern | Context Data |
|-------|-------|-----------------|--------------|
| State update | DEBUG | `StateStore translation state updated in view` | `{ isBusy, progressPhase, hasSelectedSource, hasSelectedTarget }` |
| Document rendered | DEBUG | `Translation view document rendered` | `{ sourceCount, targetCount }` |
| Sentence focused | DEBUG | `Focusing on sentence` | `{ sentenceId, side, scrollIntoView }` |
| Editor activated | DEBUG | `Activating inline editor` | `{ sentenceId, side }` |
| Editor saved | DEBUG | `Saving inline editor` | `{ sentenceId, content }` |
| Editor cancelled | DEBUG | `Cancelling inline editor` | `{ sentenceId }` |
| Progress updated | DEBUG | `Document progress updated` | `{ phase, message, percent }` |

**Example Log Output:**
```
[TranslationView] StateStore translation state updated in view { isBusy: true, progressPhase: 'running', hasSelectedSource: true }
[TranslationView] Translation view document rendered { sourceCount: 45, targetCount: 45 }
```

### 4. TranslationState (`src/modules/translation/storage/TranslationState.ts`)

**Logger Name:** `TranslationState`

**Key Events:**

| Event | Level | Message Pattern | Context Data |
|-------|-------|-----------------|--------------|
| Initialization | DEBUG | `Initializing translation state` | `{ sentenceCount }` |
| Sentence added | DEBUG | `Adding target sentences` | `{ count }` |
| Pair added | DEBUG | `Adding translation pair` | `{ pairId, sourceId, targetId }` |
| Sentence updated | DEBUG | `Updating sentence` | `{ sentenceId, isSource }` |
| Pair updated | DEBUG | `Updating pair` | `{ pairId, updates }` |
| Sentence removed | DEBUG | `Removing sentence` | `{ sentenceId, isSource }` |
| State reset | DEBUG | `Resetting translation state` | N/A |

### 5. StateStore (`src/services/StateStore.ts`)

**Logger Name:** `StateStore`

**Key Events:**

| Event | Level | Message Pattern | Context Data |
|-------|-------|-----------------|--------------|
| Initialization | DEBUG | `State store initialized` | state object |
| State update | DEBUG | `Translation state updated` | `{ prev, next }` |
| State reset | DEBUG | `All state reset` | state object |
| Event emission error | WARN | `Error in state change listener` | error object |

**Example Log Output:**
```
[StateStore] Translation state updated { prev: { isBusy: false }, next: { isBusy: true } }
```

## Logging Patterns

### 1. State Transitions

Always log state transitions with before/after context:

```typescript
logger.debug('Translation state updated', {
  prev: { progressPhase: 'idle' },
  next: { progressPhase: 'running' },
});
```

### 2. User Actions

Log user-initiated actions at INFO level:

```typescript
logger.info('User started translation', {
  trigger: 'button-click',
  provider: 'openai',
});
```

### 3. System Events

Log automatic system events at DEBUG level:

```typescript
logger.debug('Auto-save triggered', {
  sentenceCount: doc.targetSentences.length,
});
```

### 4. Error Handling

Always include error context and recovery information:

```typescript
logger.error('Translation failed', {
  sentenceId,
  provider,
  error: error.message,
  retryable: true,
});
```

### 5. Performance Metrics

Log performance-sensitive operations with timing:

```typescript
const startTime = performance.now();
// ... operation ...
logger.debug('Translation completed', {
  sentenceCount: 45,
  duration: performance.now() - startTime,
  provider: 'openai',
});
```

## Structured Log Format

All logs should include structured data for easy parsing and filtering:

```typescript
logger.info('Event description', {
  // Identifiers
  documentId: string,
  sentenceId: string,
  elementId: string,

  // Counts and metrics
  count: number,
  duration: number,
  percent: number,

  // States and flags
  isSource: boolean,
  isBusy: boolean,
  hasErrors: boolean,

  // Configuration
  provider: string,
  sourceLanguage: string,
  targetLanguage: string,

  // Operations
  operation: string,
  trigger: string,
  phase: string,
});
```

## Debug Scenarios

### Scenario 1: Tracking a Translation Workflow

**Enable:** `debug=quarto-review:Translation*`

**Expected Logs:**
```
[TranslationController] Starting document translation
[TranslationModule] Translating sentences
[TranslationEngine] Translation batch request
[TranslationState] Adding target sentences
[TranslationView] Document progress updated
[StateStore] Translation state updated { isBusy: true }
[TranslationController] Document translation completed
```

### Scenario 2: Debugging State Sync Issues

**Enable:** `debug=quarto-review:StateStore,quarto-review:TranslationView`

**Expected Logs:**
```
[StateStore] Translation state updated
[TranslationView] StateStore translation state updated in view
[TranslationView] Focusing on sentence
```

### Scenario 3: Investigating Performance Issues

**Enable:** `debug=quarto-review:*`

**Focus On:**
- Duration measurements
- Sentence counts
- Batch sizes
- API call timing

## Production Logging

### Recommended Production Settings

- **Default Level:** INFO
- **Error Tracking:** ERROR and above
- **Sampling:** DEBUG logs only for specific users/sessions

### Sensitive Data

**Never log:**
- API keys
- User authentication tokens
- Personal identifiable information (PII)
- Full document content (use truncated previews or hashes)

**Safe to log:**
- Document IDs (anonymized)
- Sentence counts
- Language codes
- Provider names (without credentials)
- Error messages (sanitized)

### Performance Considerations

- Use `logger.debug()` for verbose logging (can be disabled in production)
- Avoid logging large objects in tight loops
- Use lazy evaluation for expensive log data:
  ```typescript
  if (logger.isDebugEnabled()) {
    logger.debug('Complex operation', expensiveComputation());
  }
  ```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Error Rate:**
   - Translation failures
   - State sync failures
   - Storage failures

2. **Performance:**
   - Translation duration
   - Re-segmentation time
   - State update frequency

3. **User Actions:**
   - Translation sessions started
   - Sentences translated
   - Manual edits made

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error rate | > 5% | > 15% |
| Translation duration | > 5s | > 15s |
| State update failures | > 1% | > 5% |

## Troubleshooting Guide

### Common Log Patterns

**Problem:** Translation not saving
**Look for:** `Translation auto-saved` logs
**Check:** StateStore update logs, localStorage availability

**Problem:** Performance degradation
**Look for:** Duration values > 1000ms
**Check:** Sentence count, provider response times

**Problem:** State inconsistencies
**Look for:** `Source content has changed` warnings
**Check:** State update sequence, event emission order

## Future Enhancements

1. **Structured Logging Service**
   - Centralized log aggregation
   - Log streaming to analytics platform
   - Real-time log viewing dashboard

2. **Performance Profiling**
   - Built-in performance marks
   - Automatic bottleneck detection
   - Performance regression tracking

3. **Log Levels Per Module**
   - Fine-grained control over log verbosity
   - Runtime log level adjustment
   - User-specific logging

4. **Error Tracking Integration**
   - Automatic error reporting (Sentry, Rollbar)
   - Error context enrichment
   - User feedback integration

## References

- [Debug Utility Documentation](../dev/DEBUG.md)
- [StateStore API](../dev/MODULES.md#statestore)
- [Translation Module Architecture](./extension-architecture.md)
- [Phase 4: Observability and Quality](./phase-4-observability-and-quality.md)
