import type { ChangesModule } from '../index';
import type { Element, ElementMetadata, InsertData, Operation } from '@/types';

export type BuiltInExtensionEvent = 'beforeOperation' | 'afterOperation';
export type ChangesExtensionEvent = BuiltInExtensionEvent | string;

export type ExtensionEventPayload<E extends ChangesExtensionEvent> =
  E extends BuiltInExtensionEvent ? { operation: Operation } : unknown;

export type ExtensionEventHandler<
  E extends ChangesExtensionEvent = ChangesExtensionEvent,
> = (payload: ExtensionEventPayload<E>) => void;

export type ExtensionChange =
  | {
      type: 'edit';
      elementId: string;
      newContent: string;
      metadata?: ElementMetadata;
      source?: string;
    }
  | {
      type: 'insert';
      content: string;
      metadata: ElementMetadata;
      position: InsertData['position'];
      source?: string;
      options?: { parentId?: string; generated?: boolean };
    }
  | {
      type: 'delete';
      elementId: string;
      source?: string;
    }
  | {
      type: 'move';
      elementId: string;
      fromPosition: number;
      toPosition: number;
      source?: string;
    };

export interface ChangesExtensionContext {
  on<E extends ChangesExtensionEvent>(
    event: E,
    handler: ExtensionEventHandler<E>
  ): () => void;
  emit<E extends ChangesExtensionEvent>(
    event: E,
    payload: ExtensionEventPayload<E>
  ): void;
  applyChange(change: ExtensionChange): string | void;
  getElement(id: string): Element | null;
  getDocument(): Element[];
}

export interface ChangesExtension {
  id: string;
  register(context: ChangesExtensionContext): void;
  dispose?(): void;
}

type HandlerEntry = {
  event: ChangesExtensionEvent;
  handler: ExtensionEventHandler;
};

const BUILT_IN_EVENTS: BuiltInExtensionEvent[] = [
  'beforeOperation',
  'afterOperation',
];

export class ChangesExtensionRegistry {
  private handlers = new Map<
    ChangesExtensionEvent,
    Set<ExtensionEventHandler>
  >();
  private extensionHandlers = new Map<string, HandlerEntry[]>();

  constructor(private readonly host: ChangesModule) {
    BUILT_IN_EVENTS.forEach((event) => {
      this.handlers.set(event, new Set());
    });
  }

  registerExtension(extension: ChangesExtension): () => void {
    if (this.extensionHandlers.has(extension.id)) {
      throw new Error(
        `Extension with id "${extension.id}" already registered with ChangesModule`
      );
    }

    const context: ChangesExtensionContext = {
      on: (event, handler) => this.addHandler(extension.id, event, handler),
      emit: (event, payload) => {
        this.emit(event, payload);
      },
      applyChange: (change) =>
        this.host.applyExtensionChange({
          ...change,
          source: change.source ?? extension.id,
        }),
      getElement: (id) => this.host.getElementById(id),
      getDocument: () => this.host.getCurrentState(),
    };

    extension.register(context);

    const dispose = () => {
      this.removeHandlers(extension.id);
      extension.dispose?.();
    };

    return dispose;
  }

  emit<E extends ChangesExtensionEvent>(
    event: E,
    payload: ExtensionEventPayload<E>
  ): void {
    const handlers = this.handlers.get(event);
    if (!handlers || handlers.size === 0) {
      return;
    }

    const frozenPayload =
      typeof payload === 'object' && payload !== null
        ? (Object.freeze({ ...payload }) as ExtensionEventPayload<E>)
        : payload;

    handlers.forEach((handler) => {
      handler(frozenPayload);
    });
  }

  private addHandler<E extends ChangesExtensionEvent>(
    extensionId: string,
    event: E,
    handler: ExtensionEventHandler<E>
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    const handlers = this.handlers.get(event);
    handlers?.add(handler as ExtensionEventHandler);

    const entries = this.extensionHandlers.get(extensionId) ?? [];
    entries.push({ event, handler: handler as ExtensionEventHandler });
    this.extensionHandlers.set(extensionId, entries);

    return () => {
      handlers?.delete(handler as ExtensionEventHandler);
      this.removeHandlerEntry(
        extensionId,
        event,
        handler as ExtensionEventHandler
      );
    };
  }

  private removeHandlers(extensionId: string): void {
    const entries = this.extensionHandlers.get(extensionId);
    if (!entries) {
      return;
    }

    entries.forEach(({ event, handler }) => {
      const handlers = this.handlers.get(event);
      handlers?.delete(handler);
    });

    this.extensionHandlers.delete(extensionId);
  }

  private removeHandlerEntry(
    extensionId: string,
    event: ChangesExtensionEvent,
    handler: ExtensionEventHandler
  ): void {
    const entries = this.extensionHandlers.get(extensionId);
    if (!entries) {
      return;
    }

    this.extensionHandlers.set(
      extensionId,
      entries.filter(
        (entry) => entry.event !== event || entry.handler !== handler
      )
    );
  }
}
