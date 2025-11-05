/**
 * EditTrackingModule
 * Abstract base class for tracking edit operations with undo/redo support.
 * Provides core operations management that can be extended by specific modules.
 */

import type { Operation, OperationType, OperationData } from '@/types';

/**
 * Abstract base class for edit tracking modules
 * Subclasses implement specific operation handling and state reconstruction
 */
export abstract class EditTrackingModule {
  protected operations: Operation[] = [];
  protected redoStack: Operation[] = [];
  protected saved: boolean = true;
  protected nextId: number = 0;

  /**
   * Initialize tracking with existing operations (for restore/reload)
   */
  public initializeWithOperations(operations: Operation[]): void {
    this.operations = operations;
    this.redoStack = [];
    this.saved = true;
    this.nextId =
      Math.max(...operations.map((op) => parseInt(op.id, 10)), 0) + 1;
  }

  /**
   * Add an operation - must call this instead of directly pushing
   */
  public addOperation(
    type: OperationType,
    elementId: string,
    data: OperationData,
    userId?: string
  ): void {
    const operation: Operation = {
      id: String(this.nextId++),
      type,
      elementId,
      timestamp: Date.now(),
      userId,
      data,
    };

    this.operations.push(operation);
    this.redoStack = []; // Clear redo stack on new operation
    this.saved = false;
    this.onOperationAdded(operation);
  }

  /**
   * Get all operations
   */
  public getOperations(): Operation[] {
    return [...this.operations];
  }

  /**
   * Get operations filtered by type
   */
  public getOperationsByType(type: OperationType): Operation[] {
    return this.operations.filter((op) => op.type === type);
  }

  /**
   * Get operations for a specific element
   */
  public getOperationsForElement(elementId: string): Operation[] {
    return this.operations.filter((op) => op.elementId === elementId);
  }

  /**
   * Undo the last operation
   */
  public undo(): boolean {
    if (!this.canUndo()) {
      return false;
    }

    const operation = this.operations.pop();
    if (operation) {
      this.redoStack.push(operation);
      this.saved = false;
      this.onOperationUndone(operation);
      this.reconstructState();
      return true;
    }
    return false;
  }

  /**
   * Redo the last undone operation
   */
  public redo(): boolean {
    if (!this.canRedo()) {
      return false;
    }

    const operation = this.redoStack.pop();
    if (operation) {
      this.operations.push(operation);
      this.saved = false;
      this.onOperationRedone(operation);
      this.reconstructState();
      return true;
    }
    return false;
  }

  /**
   * Check if undo is available
   */
  public canUndo(): boolean {
    return this.operations.length > 0;
  }

  /**
   * Check if redo is available
   */
  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clear redo stack
   */
  public clearRedoStack(): void {
    this.redoStack = [];
  }

  /**
   * Mark as saved
   */
  public markAsSaved(): void {
    this.saved = true;
  }

  /**
   * Check if there are unsaved operations
   */
  public hasUnsavedOperations(): boolean {
    return !this.saved;
  }

  /**
   * Get count of unsaved operations
   */
  public getUnsavedOperationCount(): number {
    const savedIndex = this.operations.findIndex((op) => op.timestamp === 0); // This is a placeholder
    return savedIndex === -1
      ? this.operations.length
      : this.operations.length - savedIndex - 1;
  }

  /**
   * Reset all operations and state
   */
  public reset(): void {
    this.operations = [];
    this.redoStack = [];
    this.saved = true;
    this.nextId = 0;
    this.reconstructState();
  }

  /**
   * Hook: Called when an operation is added (for subclass logging/tracking)
   */
  protected onOperationAdded(_operation: Operation): void {
    // Subclasses can override
  }

  /**
   * Hook: Called when an operation is undone
   */
  protected onOperationUndone(_operation: Operation): void {
    // Subclasses can override
  }

  /**
   * Hook: Called when an operation is redone
   */
  protected onOperationRedone(_operation: Operation): void {
    // Subclasses can override
  }

  /**
   * Abstract method: Subclasses must implement state reconstruction
   * This is called after undo/redo to rebuild the current state
   */
  protected abstract reconstructState(): void;

  /**
   * Abstract method: Subclasses must implement to return current state
   */
  public abstract getCurrentState(): any[];
}
