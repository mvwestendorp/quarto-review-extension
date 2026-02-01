import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BottomDrawer } from '@/modules/ui/sidebars/BottomDrawer';

describe('BottomDrawer content-padding compensation', () => {
  let drawer: BottomDrawer;
  let main: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    main = document.createElement('main');
    document.body.appendChild(main);

    drawer = new BottomDrawer();
    const el = drawer.create();
    document.body.appendChild(el);

    // Mock getBoundingClientRect on the drawer element so we get a
    // predictable height when expanded.
    el.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 500,
      bottom: 650,
      left: 0,
      right: 1024,
      width: 1024,
      height: 150,
    });
  });

  afterEach(() => {
    drawer.destroy();
    document.body.innerHTML = '';
  });

  it('adds padding-bottom to <main> when drawer expands', async () => {
    // Initially no padding
    expect(main.style.paddingBottom).toBe('');

    drawer.setExpanded(true);

    // updateContentPadding uses requestAnimationFrame; flush it
    await vi.waitFor(() => {
      expect(main.style.paddingBottom).toBe('150px');
    });
  });

  it('removes padding-bottom from <main> when drawer collapses', async () => {
    drawer.setExpanded(true);

    await vi.waitFor(() => {
      expect(main.style.paddingBottom).toBe('150px');
    });

    drawer.setExpanded(false);

    // Collapse removes padding synchronously
    expect(main.style.paddingBottom).toBe('');
  });

  it('does nothing when <main> is absent', () => {
    // Remove <main> from DOM
    main.remove();

    // Should not throw
    expect(() => {
      drawer.setExpanded(true);
    }).not.toThrow();
  });
});
