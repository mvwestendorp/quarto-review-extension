import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ModuleEventEmitter, MODULE_EVENTS } from '@modules/ui/shared';

/**
 * Event Listener Cleanup Test
 *
 * Tests the critical bug fix: duplicate event listeners when reopening editor
 *
 * Bug scenario (in UIModule.initializeMilkdown):
 * 1. User opens editor
 *    - UIModule calls: editor.on('module:editor:content:changed', callback1)
 * 2. User edits and closes editor
 * 3. User opens editor again
 *    - UIModule calls: editor.on('module:editor:content:changed', callback2)
 *    - OLD callback1 is still registered!
 *    - Now there are 2 listeners for the same event
 * 4. On 3rd open, there are 3 listeners, etc.
 * 5. This causes "o is not a function" error because listener chains get corrupted
 *
 * Fix: Call removeAllListeners(eventType) BEFORE adding new listener
 */

describe('Event Listener Cleanup - ModuleEventEmitter', () => {
  it('should remove all listeners for a specific event type', () => {
    const emitter = new ModuleEventEmitter();
    const callbacks: string[] = [];

    // Add first listener
    emitter.on('test-event', () => {
      callbacks.push('callback1');
    });

    // Add second listener
    emitter.on('test-event', () => {
      callbacks.push('callback2');
    });

    // Emit event - should call both
    emitter.emit('test-event');
    expect(callbacks).toHaveLength(2);

    // Remove all listeners for this event
    emitter.removeAllListeners('test-event');

    // Clear array
    callbacks.length = 0;

    // Emit again - should NOT call any listeners
    emitter.emit('test-event');
    expect(callbacks).toHaveLength(0);
  });

  it('should handle UIModule pattern: reopen without duplicate listeners', () => {
    const emitter = new ModuleEventEmitter();
    const callbackExecutions: string[] = [];

    // Simulate UIModule opening editor for first time
    emitter.removeAllListeners(MODULE_EVENTS.EDITOR_CONTENT_CHANGED);
    emitter.on(MODULE_EVENTS.EDITOR_CONTENT_CHANGED, (detail: any) => {
      callbackExecutions.push(`first-callback: ${detail.markdown}`);
    });

    // First edit
    emitter.emit(MODULE_EVENTS.EDITOR_CONTENT_CHANGED, { markdown: 'first edit' });
    expect(callbackExecutions).toHaveLength(1);

    // User closes editor
    callbackExecutions.length = 0;

    // User reopens editor - UIModule pattern is repeated
    emitter.removeAllListeners(MODULE_EVENTS.EDITOR_CONTENT_CHANGED);
    emitter.on(MODULE_EVENTS.EDITOR_CONTENT_CHANGED, (detail: any) => {
      callbackExecutions.push(`second-callback: ${detail.markdown}`);
    });

    // Second edit - should ONLY call second-callback, not both
    emitter.emit(MODULE_EVENTS.EDITOR_CONTENT_CHANGED, { markdown: 'second edit' });
    expect(callbackExecutions).toHaveLength(1);
    expect(callbackExecutions[0]).toContain('second-callback');

    // Third reopen
    callbackExecutions.length = 0;
    emitter.removeAllListeners(MODULE_EVENTS.EDITOR_CONTENT_CHANGED);
    emitter.on(MODULE_EVENTS.EDITOR_CONTENT_CHANGED, (detail: any) => {
      callbackExecutions.push(`third-callback: ${detail.markdown}`);
    });

    emitter.emit(MODULE_EVENTS.EDITOR_CONTENT_CHANGED, { markdown: 'third edit' });
    expect(callbackExecutions).toHaveLength(1);
    expect(callbackExecutions[0]).toContain('third-callback');
  });

  it('should preserve listeners for other event types when removing specific type', () => {
    const emitter = new ModuleEventEmitter();
    const results: string[] = [];

    // Add listeners for two different events
    emitter.on('event-a', () => results.push('a'));
    emitter.on('event-b', () => results.push('b'));

    // Remove only event-a listeners
    emitter.removeAllListeners('event-a');

    // Event A should not fire
    emitter.emit('event-a');
    expect(results).toEqual([]);

    // Event B should still fire
    emitter.emit('event-b');
    expect(results).toEqual(['b']);
  });

  it('should clear all listeners when removeAllListeners called without argument', () => {
    const emitter = new ModuleEventEmitter();
    const results: string[] = [];

    emitter.on('event-a', () => results.push('a'));
    emitter.on('event-b', () => results.push('b'));
    emitter.on('event-c', () => results.push('c'));

    // Clear all listeners
    emitter.removeAllListeners();

    // None should fire
    emitter.emit('event-a');
    emitter.emit('event-b');
    emitter.emit('event-c');
    expect(results).toEqual([]);
  });

  it('clearListeners should be alias for removeAllListeners', () => {
    const emitter = new ModuleEventEmitter();
    const results: string[] = [];

    emitter.on('test-event', () => results.push('test'));
    expect(results).toEqual([]);

    // Use clearListeners (old method)
    emitter.clearListeners();

    // Should have no effect
    emitter.emit('test-event');
    expect(results).toEqual([]);
  });

  it('should prevent listener accumulation over 5 open-close cycles', () => {
    const emitter = new ModuleEventEmitter();
    const executionCounts: number[] = [];

    for (let cycle = 0; cycle < 5; cycle++) {
      // Simulate UIModule.initializeMilkdown pattern
      emitter.removeAllListeners(MODULE_EVENTS.EDITOR_CONTENT_CHANGED);

      let callCount = 0;
      emitter.on(MODULE_EVENTS.EDITOR_CONTENT_CHANGED, () => {
        callCount++;
      });

      // Emit event once
      emitter.emit(MODULE_EVENTS.EDITOR_CONTENT_CHANGED);

      // Record how many times callback was called
      executionCounts.push(callCount);
    }

    // Each cycle should have exactly 1 execution
    // Without the fix, this would be [1, 2, 3, 4, 5]
    expect(executionCounts).toEqual([1, 1, 1, 1, 1]);
  });

  it('should handle multiple edits within same editor session without listener duplication', () => {
    const emitter = new ModuleEventEmitter();
    const editLog: string[] = [];

    // Simulate UIModule.initializeMilkdown for a single editor open
    emitter.removeAllListeners(MODULE_EVENTS.EDITOR_CONTENT_CHANGED);
    emitter.on(MODULE_EVENTS.EDITOR_CONTENT_CHANGED, (detail: any) => {
      editLog.push(`edit: ${detail.markdown}`);
    });

    // User makes 5 edits within the same editor session
    // Each edit should trigger the listener exactly once
    for (let i = 0; i < 5; i++) {
      emitter.emit(MODULE_EVENTS.EDITOR_CONTENT_CHANGED, { markdown: `edit ${i}` });
    }

    // Should have exactly 5 log entries (one per edit)
    // Without proper cleanup on subsequent edits, this would accumulate
    expect(editLog).toHaveLength(5);
    expect(editLog).toEqual([
      'edit: edit 0',
      'edit: edit 1',
      'edit: edit 2',
      'edit: edit 3',
      'edit: edit 4',
    ]);
  });

  it('should not accumulate listeners even when listener callback modifies state', () => {
    const emitter = new ModuleEventEmitter();
    let editCount = 0;

    // Simulate UIModule.initializeMilkdown
    emitter.removeAllListeners(MODULE_EVENTS.EDITOR_CONTENT_CHANGED);
    emitter.on(MODULE_EVENTS.EDITOR_CONTENT_CHANGED, (detail: any) => {
      editCount++; // State modification in listener
    });

    // Make 10 edits
    for (let i = 0; i < 10; i++) {
      emitter.emit(MODULE_EVENTS.EDITOR_CONTENT_CHANGED, { markdown: `edit ${i}` });
    }

    // Should increment exactly 10 times
    expect(editCount).toBe(10);

    // Now reopen editor (simulate close and reopen)
    editCount = 0;
    emitter.removeAllListeners(MODULE_EVENTS.EDITOR_CONTENT_CHANGED);
    emitter.on(MODULE_EVENTS.EDITOR_CONTENT_CHANGED, (detail: any) => {
      editCount++;
    });

    // Make another 10 edits
    for (let i = 0; i < 10; i++) {
      emitter.emit(MODULE_EVENTS.EDITOR_CONTENT_CHANGED, { markdown: `reopen edit ${i}` });
    }

    // Should still increment exactly 10 times (not 11, 12, ... if listeners accumulated)
    expect(editCount).toBe(10);
  });
});
