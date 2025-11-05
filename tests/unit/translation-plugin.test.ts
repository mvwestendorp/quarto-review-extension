import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TranslationModule, TranslationModuleConfig } from '@modules/translation';

vi.mock('@modules/ui/translation/TranslationController', () => {
  const initialize = vi.fn().mockResolvedValue(undefined);
  const destroy = vi.fn();

  const controllerMock = vi.fn(function (this: any) {
    this.initialize = initialize;
    this.destroy = destroy;
  });

  return {
    TranslationController: controllerMock,
  };
});

import { TranslationPlugin } from '@modules/ui/plugins/TranslationPlugin';
import { TranslationController } from '@modules/ui/translation/TranslationController';

describe('TranslationPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('mounts controller and disposes cleanly', async () => {
    const baseConfig: TranslationModuleConfig = {
      config: {
        enabled: true,
        sourceLanguage: 'en',
        targetLanguage: 'nl',
        defaultProvider: 'manual',
        autoTranslateOnEdit: false,
        autoTranslateOnLoad: false,
        showCorrespondenceLines: true,
        highlightOnHover: true,
        providers: {},
      },
      changes: {} as any,
      markdown: {} as any,
      exporter: undefined,
      documentId: 'test-doc',
    };

    const translationModule = {
      getModuleConfig: vi.fn().mockImplementation(() => ({
        ...baseConfig,
        config: { ...baseConfig.config },
      })),
    } as unknown as TranslationModule;

    const notify = vi.fn();
    const progress = vi.fn();
    const busy = vi.fn();

    const plugin = new TranslationPlugin({
      translationModule,
      resolveConfig: () => translationModule.getModuleConfig(),
      notify,
      onProgress: progress,
      onBusyChange: busy,
    });

    const container = document.createElement('div');
    const disposeEvent = vi.fn();
    const events = {
      on: vi.fn().mockReturnValue(disposeEvent),
    };

    const handle = plugin.mount({ container, events });

    expect(events.on).toHaveBeenCalledWith(
      'translation:state-updated',
      expect.any(Function)
    );

    await handle.ready;

    const ControllerMock = TranslationController as unknown as vi.Mock;
    expect(ControllerMock).toHaveBeenCalledTimes(1);

    const controllerInstance = ControllerMock.mock.results[0]
      .value as {
      initialize: vi.Mock;
      destroy: vi.Mock;
    };

    expect(controllerInstance.initialize).toHaveBeenCalledTimes(1);

    handle.dispose();

    expect(disposeEvent).toHaveBeenCalledTimes(1);
    expect(controllerInstance.destroy).toHaveBeenCalledTimes(1);
    expect(container.innerHTML).toBe('');
  });
});
