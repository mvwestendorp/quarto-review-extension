import { createModuleLogger, debugLogger } from './debug';
import type { ChangesModule } from '@modules/changes';
import type { Operation } from '@/types';

type InstrumentedChangesModule = ChangesModule & {
  __debugInstrumented?: boolean;
};

interface DebugToolsOptions {
  changes: ChangesModule;
}

interface ReviewDebugHelpers {
  operations: () => Readonly<Operation[]>;
  inspectElement: (elementId: string) => {
    elementId: string;
    markdown?: string;
    html?: string | null;
  } | null;
  printElement: (elementId: string) => void;
}

export class DebugTools {
  private readonly logger = createModuleLogger('DebugTools');
  private readonly changes: InstrumentedChangesModule;
  private helpersRegistered = false;

  constructor(options: DebugToolsOptions) {
    this.changes = options.changes as InstrumentedChangesModule;
  }

  enable(): void {
    if (!debugLogger.getConfig().enabled) {
      return;
    }
    this.instrumentChangesModule();
    this.registerGlobalHelpers();
  }

  private instrumentChangesModule(): void {
    if (this.changes.__debugInstrumented) {
      return;
    }
    const originalAddOperation = this.changes.addOperation.bind(this.changes);
    this.changes.addOperation = ((type, elementId, data, userId) => {
      this.logger.debug('Operation recorded', {
        type,
        elementId,
        data,
        userId,
      });
      return originalAddOperation(type, elementId, data, userId);
    }) as ChangesModule['addOperation'];

    const originalReplace = this.changes.replaceElementWithSegments?.bind(
      this.changes
    );
    if (originalReplace) {
      this.changes.replaceElementWithSegments = ((elementId, segments) => {
        this.logger.debug('replaceElementWithSegments invoked', {
          elementId,
          segmentCount: segments.length,
        });
        return originalReplace(elementId, segments);
      }) as ChangesModule['replaceElementWithSegments'];
    }

    this.changes.__debugInstrumented = true;
  }

  private registerGlobalHelpers(): void {
    if (this.helpersRegistered) {
      return;
    }

    const helpers: ReviewDebugHelpers = {
      operations: () =>
        Array.isArray(this.changes.getOperations?.())
          ? this.changes.getOperations()
          : [],
      inspectElement: (elementId: string) => {
        if (!elementId) {
          this.logger.warn('inspectElement called without an elementId');
          return null;
        }

        const markdownContent = this.safeInvoke(() =>
          this.changes.getElementContent?.(elementId)
        );
        const element = document.querySelector(
          `[data-review-id="${elementId}"]`
        ) as HTMLElement | null;
        const html = element?.innerHTML ?? null;

        this.logger.info('Inspect element', {
          elementId,
          markdown: markdownContent,
          html,
        });

        return {
          elementId,
          markdown: markdownContent ?? undefined,
          html,
        };
      },
      printElement: (elementId: string) => {
        const inspection = helpers.inspectElement(elementId);
        if (!inspection) return;
        console.groupCollapsed(`[reviewDebug] ${elementId}`);
        console.info('Markdown:\n', inspection.markdown ?? '(none)');
        console.info(
          'Rendered HTML:\n',
          inspection.html ?? '(element missing)'
        );
        console.groupEnd();
      },
    };

    const existing = (window as any).reviewDebug ?? {};
    (window as any).reviewDebug = {
      ...existing,
      ...helpers,
    };

    this.logger.info('reviewDebug helpers registered', {
      helpers: Object.keys(helpers),
    });
    this.helpersRegistered = true;
  }

  private safeInvoke<T>(fn: () => T): T | undefined {
    try {
      return fn();
    } catch (error) {
      this.logger.warn('Debug helper invocation failed', error);
      return undefined;
    }
  }
}

export function initializeDebugTools(options: DebugToolsOptions): DebugTools {
  const tools = new DebugTools(options);
  tools.enable();
  return tools;
}
