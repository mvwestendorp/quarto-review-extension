import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import {
  trapFocus,
  FocusManager,
  announceToScreenReader,
  createSkipLink,
} from '@utils/focus-management';

let rafMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  document.body.innerHTML = '';
  rafMock = vi.fn((callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  vi.stubGlobal('requestAnimationFrame', rafMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('trapFocus', () => {
  it('cycles focus between first and last focusable elements and restores previous focus', () => {
    const previous = document.createElement('button');
    previous.textContent = 'before';
    document.body.appendChild(previous);
    previous.focus();

    const container = document.createElement('div');
    const first = document.createElement('button');
    first.textContent = 'first';
    const middle = document.createElement('a');
    middle.href = '#';
    middle.textContent = 'link';
    const last = document.createElement('button');
    last.textContent = 'last';

    container.append(first, middle, last);
    document.body.appendChild(container);

    const cleanup = trapFocus(container);

    expect(document.activeElement).toBe(first);

    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })
    );
    expect(document.activeElement).toBe(last);

    last.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    );
    expect(document.activeElement).toBe(first);

    cleanup();
    expect(document.activeElement).toBe(previous);
  });

  it('returns a no-op cleanup function when no focusable elements exist', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const cleanup = trapFocus(container);

    expect(typeof cleanup).toBe('function');
    cleanup();
    expect(document.activeElement).not.toBe(container);
  });
});

describe('FocusManager', () => {
  it('traps focus within the element and restores previous focus on deactivate', () => {
    const previous = document.createElement('button');
    previous.textContent = 'launch';
    document.body.appendChild(previous);
    previous.focus();

    const container = document.createElement('div');
    const first = document.createElement('button');
    first.textContent = 'first';
    const second = document.createElement('button');
    second.textContent = 'second';
    const last = document.createElement('button');
    last.textContent = 'last';
    container.append(first, second, last);
    document.body.appendChild(container);

    const manager = new FocusManager(container);
    manager.activate();

    expect(document.activeElement).toBe(first);

    last.focus();
    last.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    );
    expect(document.activeElement).toBe(first);

    first.focus();
    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })
    );
    expect(document.activeElement).toBe(last);

    manager.deactivate();
    expect(document.activeElement).toBe(previous);

    manager.destroy();
  });
});

describe('announceToScreenReader', () => {
  it('creates and removes a live region with the provided message', () => {
    vi.useFakeTimers();
    try {
      announceToScreenReader('Processing', 'assertive');
      const liveRegion = document.querySelector('[role="status"]');
      expect(liveRegion).toBeTruthy();
      expect(liveRegion?.getAttribute('aria-live')).toBe('assertive');
      expect(liveRegion?.textContent).toBe('Processing');

      vi.advanceTimersByTime(1000);
      expect(liveRegion && document.body.contains(liveRegion)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('createSkipLink', () => {
  it('builds an accessible skip link element', () => {
    const link = createSkipLink('content', 'Skip to content');

    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('#content');
    expect(link.textContent).toBe('Skip to content');
    expect(link.getAttribute('tabindex')).toBe('0');
    expect(link.className).toBe('skip-link');
  });
});
