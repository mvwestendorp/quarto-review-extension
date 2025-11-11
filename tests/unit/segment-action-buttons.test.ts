import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SegmentActionButtons } from '@/modules/ui/comments/SegmentActionButtons';

describe('SegmentActionButtons extended hover zone', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps buttons visible while the pointer stays in the same row', () => {
    const segment = document.createElement('div');
    segment.setAttribute('data-review-id', 'segment-1');
    document.body.appendChild(segment);

    vi.spyOn(segment, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 100,
      top: 100,
      right: 400,
      bottom: 140,
      left: 0,
      width: 400,
      height: 40,
      toJSON() {
        return {};
      },
    });

    const buttons = new SegmentActionButtons();
    buttons.syncButtons(['segment-1']);

    document.dispatchEvent(new MouseEvent('mousemove', { clientY: 120 }));
    expect(segment.classList.contains('review-segment-hovered')).toBe(true);

    segment.dispatchEvent(new Event('mouseleave'));
    expect(segment.classList.contains('review-segment-hovered')).toBe(true);

    document.dispatchEvent(new MouseEvent('mousemove', { clientY: 20 }));
    expect(segment.classList.contains('review-segment-hovered')).toBe(false);
  });
});
