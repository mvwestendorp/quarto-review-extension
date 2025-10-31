import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initializeDebugTools } from '@utils/debug-tools';
import { debugLogger } from '@utils/debug';

describe('DebugTools helpers', () => {
  beforeEach(() => {
    debugLogger.enable('debug');
    document.body.innerHTML = '';
    delete (window as any).reviewDebug;
  });

  afterEach(() => {
    debugLogger.disable();
    document.body.innerHTML = '';
    delete (window as any).reviewDebug;
  });

  it('registers helpers on window.reviewDebug and inspects elements', () => {
    const operations: any[] = [];
    const changes = {
      addOperation: vi.fn((type, elementId, data) => {
        operations.push({ type, elementId, data });
      }),
      replaceElementWithSegments: vi
        .fn()
        .mockReturnValue({ elementIds: [], removedIds: [] }),
      getOperations: vi.fn(() => operations),
      getElementContent: vi.fn(() => 'Example markdown content'),
    } as any;

    const tools = initializeDebugTools({
      changes,
    });

    expect(tools).toBeDefined();
    expect((window as any).reviewDebug).toBeDefined();

    const element = document.createElement('div');
    element.setAttribute('data-review-id', 'element-1');
    element.innerHTML = '<p>Rendered content</p>';
    document.body.appendChild(element);

    const helpers = (window as any).reviewDebug;
    const inspection = helpers.inspectElement('element-1');
    expect(inspection).toEqual(
      expect.objectContaining({
        elementId: 'element-1',
        markdown: 'Example markdown content',
        html: '<p>Rendered content</p>',
      })
    );

    helpers.printElement('element-1');
    changes.addOperation('edit', 'element-1', { value: 'test' });
    expect(operations).toHaveLength(1);
  });
});
