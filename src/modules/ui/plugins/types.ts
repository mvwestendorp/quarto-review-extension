export interface ReviewUIContext {
  container: HTMLElement;
  events: {
    on: (event: string, handler: (...args: any[]) => void) => () => void;
  };
}

export interface ReviewUIPlugin {
  id: string;
  mount(context: ReviewUIContext): PluginHandle;
}

export interface PluginHandle {
  dispose(): void;
  ready?: Promise<void>;
}
