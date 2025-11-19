import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SegmentActionButtons } from '@/modules/ui/comments/SegmentActionButtons';

describe('SegmentActionButtons extended hover zone', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
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

    // First mousemove within the row range
    document.dispatchEvent(new MouseEvent('mousemove', { clientY: 120 }));
    vi.advanceTimersByTime(33); // Advance past throttle delay
    expect(segment.classList.contains('review-segment-hovered')).toBe(true);

    // Mouse leaves the segment but stays in row range
    segment.dispatchEvent(new Event('mouseleave'));
    expect(segment.classList.contains('review-segment-hovered')).toBe(true);

    // Mouse moves outside the row range
    document.dispatchEvent(new MouseEvent('mousemove', { clientY: 20 }));
    vi.advanceTimersByTime(33); // Advance past throttle delay
    expect(segment.classList.contains('review-segment-hovered')).toBe(false);
  });
});
