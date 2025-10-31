/**
 * Module Event System
 *
 * Provides a typed event system for module-to-module communication.
 * Enables loose coupling between modules while maintaining type safety.
 */

/**
 * Typed custom event for module communication
 */
export class ModuleEvent<T = any> extends CustomEvent<T> {
  constructor(type: string, detail?: T) {
    super(type, {
      detail,
      bubbles: true,
      cancelable: true,
    });
  }
}

/**
 * Event type definitions for module communication
 */
export const MODULE_EVENTS = {
  // Editor events
  EDITOR_READY: 'module:editor:ready',
  EDITOR_CONTENT_CHANGED: 'module:editor:content:changed',
  EDITOR_SELECTION_CHANGED: 'module:editor:selection:changed',
  EDITOR_FOCUSED: 'module:editor:focused',
  EDITOR_BLURRED: 'module:editor:blurred',

  // Comment events
  COMMENT_SUBMITTED: 'module:comment:submitted',
  COMMENT_CANCELLED: 'module:comment:cancelled',
  COMMENT_COMPOSER_OPENED: 'module:comment:composer:opened',
  COMMENT_COMPOSER_CLOSED: 'module:comment:composer:closed',

  // Toolbar events
  TOOLBAR_COMMAND_EXECUTED: 'module:toolbar:command:executed',
  TOOLBAR_STATE_UPDATED: 'module:toolbar:state:updated',

  // Sidebar events
  SIDEBAR_TOGGLED: 'module:sidebar:toggled',
  SIDEBAR_OPENED: 'module:sidebar:opened',
  SIDEBAR_CLOSED: 'module:sidebar:closed',

  // Context menu events
  CONTEXT_MENU_OPENED: 'module:context:menu:opened',
  CONTEXT_MENU_CLOSED: 'module:context:menu:closed',
} as const;

/**
 * Event detail types
 */
export interface EditorReadyDetail {
  editor: any; // Editor instance
}

export interface EditorContentChangedDetail {
  markdown: string;
}

export interface EditorSelectionChangedDetail {
  from: number;
  to: number;
}

export interface CommentSubmittedDetail {
  elementId: string;
  content: string;
  isEdit: boolean;
}

export interface CommentCancelledDetail {
  elementId: string;
}

export interface CommentComposerOpenedDetail {
  elementId: string;
  existingComment?: any;
}

export interface ToolbarCommandExecutedDetail {
  action: string;
  handled: boolean;
}

export interface ToolbarStateUpdatedDetail {
  activeStates: Record<string, boolean>;
}

export interface SidebarToggledDetail {
  isOpen: boolean;
}

export interface ContextMenuOpenedDetail {
  sectionId: string;
  x: number;
  y: number;
}

/**
 * Module event emitter mixin
 * Add event emission capability to any module
 */
export class ModuleEventEmitter {
  private listeners: Map<string, Set<(event: CustomEvent) => void>> = new Map();

  /**
   * Listen to module events
   */
  on<T = any>(eventType: string, handler: (detail: T) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add((event: CustomEvent) => {
      handler(event.detail as T);
    });
  }

  /**
   * Listen to module events once
   */
  once<T = any>(eventType: string, handler: (detail: T) => void): void {
    const wrappedHandler = (detail: T) => {
      handler(detail);
      this.off(eventType, wrappedHandler);
    };
    this.on(eventType, wrappedHandler);
  }

  /**
   * Stop listening to module events
   */
  off<T = any>(eventType: string, handler: (detail: T) => void): void {
    if (!this.listeners.has(eventType)) return;
    const handlers = this.listeners.get(eventType)!;
    handlers.forEach((h) => {
      if (h.toString() === handler.toString()) {
        handlers.delete(h);
      }
    });
  }

  /**
   * Remove all listeners for a specific event type
   * This prevents duplicate listener accumulation when components are reinitialized
   * @param eventType - The specific event type to clear listeners for. If omitted, clears all listeners.
   */
  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Emit a module event
   */
  emit<T = any>(eventType: string, detail?: T): void {
    const event = new ModuleEvent<T>(eventType, detail);
    document.dispatchEvent(event);

    // Also call local listeners
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType)!.forEach((handler) => {
        handler(event);
      });
    }
  }

  /**
   * Clean up all listeners
   * Removes all listeners for all event types
   */
  clearListeners(): void {
    this.removeAllListeners();
  }
}

/**
 * Helper to listen to module events globally
 */
export function onModuleEvent<T = any>(
  eventType: string,
  handler: (detail: T) => void
): () => void {
  const listener = (event: Event) => {
    if (event instanceof CustomEvent) {
      handler(event.detail as T);
    }
  };
  document.addEventListener(eventType, listener);

  // Return unsubscribe function
  return () => {
    document.removeEventListener(eventType, listener);
  };
}

/**
 * Helper to emit module events globally
 */
export function emitModuleEvent<T = any>(eventType: string, detail?: T): void {
  const event = new ModuleEvent<T>(eventType, detail);
  document.dispatchEvent(event);
}
