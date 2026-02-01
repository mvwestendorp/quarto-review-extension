import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MarginComments,
  MAX_COMMENT_DRIFT,
} from '@modules/ui/comments/MarginComments';

/**
 * Helper: mount section elements into the DOM and mock their
 * getBoundingClientRect so we control their viewport position.
 */
function mountSections(
  sections: Array<{ id: string; top: number; height: number }>
): HTMLElement[] {
  return sections.map((s) => {
    const el = document.createElement('div');
    el.setAttribute('data-review-id', s.id);
    el.getBoundingClientRect = vi.fn().mockReturnValue({
      top: s.top,
      bottom: s.top + s.height,
      left: 0,
      right: 200,
      width: 200,
      height: s.height,
    });
    document.body.appendChild(el);
    return el;
  });
}

describe('MarginComments drift cap', () => {
  let mc: MarginComments;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      }
    );
    vi.spyOn(window, 'pageYOffset', 'get').mockReturnValue(0);
  });

  afterEach(() => {
    mc?.destroy();
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('single comment per section stays within MAX_COMMENT_DRIFT of its section', () => {
    // Two sections 50 px apart, one comment each.
    // Index-0 comments have desired offset 0, so they land exactly at
    // sectionTop — well within the cap.
    mountSections([
      { id: 'sec-a', top: 100, height: 30 },
      { id: 'sec-b', top: 150, height: 30 },
    ]);

    mc = new MarginComments();
    document.body.appendChild(mc.create());

    const callbacks = {
      onNavigate: vi.fn(),
      onRemove: vi.fn(),
      onEdit: vi.fn(),
      onSaveEdit: vi.fn(),
      onCancelEdit: vi.fn(),
      onHover: vi.fn(),
      onLeave: vi.fn(),
    };

    mc.updateSections(
      [
        {
          element: { id: 'sec-a' },
          comments: [{ id: 'c1', content: 'A comment', resolved: false }],
        },
        {
          element: { id: 'sec-b' },
          comments: [{ id: 'c2', content: 'B comment', resolved: false }],
        },
      ] as Parameters<typeof mc.updateSections>[0],
      callbacks
    );

    const cards = document.querySelectorAll<HTMLElement>(
      '.review-margin-comment'
    );
    expect(cards.length).toBe(2);

    cards.forEach((card) => {
      const elementId = card.dataset.elementId;
      if (!elementId) return;

      const top = parseFloat(card.style.top || '0');
      const sectionEl = document.querySelector(
        `[data-review-id="${elementId}"]`
      ) as HTMLElement;
      const sectionTop = sectionEl.getBoundingClientRect().top;

      // Each comment's top must not exceed sectionTop + MAX_COMMENT_DRIFT
      expect(top).toBeLessThanOrEqual(sectionTop + MAX_COMMENT_DRIFT);
    });
  });

  it('second comment in same section is capped at MAX_COMMENT_DRIFT', () => {
    mountSections([{ id: 'sec-x', top: 200, height: 40 }]);

    mc = new MarginComments();
    document.body.appendChild(mc.create());

    const callbacks = {
      onNavigate: vi.fn(),
      onRemove: vi.fn(),
      onEdit: vi.fn(),
      onSaveEdit: vi.fn(),
      onCancelEdit: vi.fn(),
      onHover: vi.fn(),
      onLeave: vi.fn(),
    };

    // Two comments on the same section — the second would be at +140px
    // (> MAX_COMMENT_DRIFT of 60), so it should be capped.
    mc.updateSections(
      [
        {
          element: { id: 'sec-x' },
          comments: [
            { id: 'c1', content: 'First', resolved: false },
            { id: 'c2', content: 'Second', resolved: false },
          ],
        },
      ] as Parameters<typeof mc.updateSections>[0],
      callbacks
    );

    const cards = document.querySelectorAll<HTMLElement>(
      '.review-margin-comment'
    );
    expect(cards.length).toBe(2);

    // Both comments' positions must not exceed sectionTop + MAX_COMMENT_DRIFT
    cards.forEach((card) => {
      const top = parseFloat(card.style.top || '0');
      expect(top).toBeLessThanOrEqual(200 + MAX_COMMENT_DRIFT);
    });

    // The first comment should be at sectionTop (200)
    const firstCard = Array.from(cards).find(
      (c) => c.dataset.commentKey === 'sec-x:c1'
    );
    expect(parseFloat(firstCard?.style.top || '0')).toBe(200);

    // The second comment should be capped at sectionTop + MAX_COMMENT_DRIFT
    const secondCard = Array.from(cards).find(
      (c) => c.dataset.commentKey === 'sec-x:c2'
    );
    expect(parseFloat(secondCard?.style.top || '0')).toBe(
      200 + MAX_COMMENT_DRIFT
    );
  });
});
