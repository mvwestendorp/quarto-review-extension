import type { PluginHandle, ReviewUIContext, ReviewUIPlugin } from './types';
import {
  TranslationController,
  type TranslationProgressStatus,
} from '../translation/TranslationController';
import type {
  TranslationModule,
  TranslationModuleConfig,
} from '@modules/translation';

export interface TranslationPluginOptions {
  translationModule: TranslationModule;
  resolveConfig: () => TranslationModuleConfig;
  notify: (
    message: string,
    type: 'info' | 'success' | 'warning' | 'error'
  ) => void;
  onProgress: (status: TranslationProgressStatus) => void;
  onBusyChange: (busy: boolean) => void;
}

export class TranslationPlugin implements ReviewUIPlugin {
  public readonly id = 'translation-ui';

  private controller: TranslationController | null = null;
  private readyPromise: Promise<void> | null = null;
  private cleanupHandlers: Array<() => void> = [];
  private container: HTMLElement | null = null;

  constructor(private readonly options: TranslationPluginOptions) {}

  mount(context: ReviewUIContext): PluginHandle {
    this.dispose();

    this.container = context.container;

    const moduleConfig = this.options.resolveConfig();
    const controller = new TranslationController({
      container: context.container,
      translationModuleConfig: moduleConfig,
      onNotification: this.options.notify,
      onProgressUpdate: this.options.onProgress,
      onBusyChange: this.options.onBusyChange,
      translationModuleInstance: this.options.translationModule,
    });

    this.controller = controller;

    // Allow plugins to observe translation events if provided
    if (typeof context.events?.on === 'function') {
      const disposeState = context.events.on(
        'translation:state-updated',
        () => {
          // No-op placeholder to retain hook capability.
          // TranslationController manages updates internally via injected module.
        }
      );
      this.cleanupHandlers.push(disposeState);
    }

    this.readyPromise = controller.initialize().catch((error) => {
      // Ensure cleanup runs if initialization fails
      this.dispose();
      throw error;
    });

    return {
      dispose: () => {
        this.dispose();
      },
      ready: this.readyPromise,
    };
  }

  getController(): TranslationController | null {
    return this.controller;
  }

  private dispose(): void {
    this.cleanupHandlers.forEach((dispose) => {
      try {
        dispose?.();
      } catch {
        /* swallow cleanup failures */
      }
    });
    this.cleanupHandlers = [];

    if (this.controller) {
      this.controller.destroy();
      this.controller = null;
    }

    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }

    this.readyPromise = null;
  }
}
