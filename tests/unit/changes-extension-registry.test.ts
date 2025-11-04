import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChangesModule } from '@modules/changes';
import type {
  ChangesExtension,
  ChangesExtensionContext,
} from '@modules/changes';

const createExtension = (
  callbacks: (ctx: ChangesExtensionContext) => void,
  disposeSpy?: () => void
): ChangesExtension => ({
  id: `test-extension-${Math.random().toString(36).slice(2)}`,
  register(context) {
    callbacks(context);
  },
  dispose: disposeSpy,
});

const setupDocument = (markdown = 'Hello world'): ChangesModule => {
  document.body.innerHTML = `
    <div data-review-id="para-1" data-review-type="Para" data-review-markdown="${markdown}">
      <p>${markdown}</p>
    </div>
  `;
  const changes = new ChangesModule();
  changes.initializeFromDOM();
  return changes;
};

describe('ChangesExtensionRegistry', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('notifies registered handlers when operations are added', () => {
    const changes = setupDocument();
    const received: string[] = [];

    const extension = createExtension((ctx) => {
      ctx.on('afterOperation', ({ operation }) => {
        received.push(`${operation.type}:${operation.elementId}`);
      });
    });

    const dispose = changes.registerExtension(extension);

    changes.edit('para-1', 'Updated content');
    changes.delete('para-1');

    expect(received).toEqual(['edit:para-1', 'delete:para-1']);

    dispose();
  });

  it('applies extension-driven edits through applyChange', () => {
    const changes = setupDocument();
    let contextRef: ChangesExtensionContext | null = null;

    const extension = createExtension((ctx) => {
      contextRef = ctx;
    });

    changes.registerExtension(extension);

    contextRef?.applyChange({
      type: 'edit',
      elementId: 'para-1',
      newContent: 'Edited via extension',
    });

    expect(
      changes.getElementById('para-1')?.content
    ).toBe('Edited via extension');
  });

  it('cleans up handlers when extension is disposed', () => {
    const changes = setupDocument();
    let handlerInvoked = 0;
    const disposeSpy = vi.fn();

    const extension = createExtension((ctx) => {
      ctx.on('afterOperation', () => {
        handlerInvoked += 1;
      });
    }, disposeSpy);

    const dispose = changes.registerExtension(extension);

    changes.edit('para-1', 'One');
    dispose();
    changes.edit('para-1', 'Two');

    expect(handlerInvoked).toBe(1);
    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });
});
