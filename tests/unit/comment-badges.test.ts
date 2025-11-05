import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommentBadges, type CommentBadgeCallbacks } from '@modules/ui/comments/CommentBadges';
import type { SectionCommentSnapshot } from '@modules/ui/comments/CommentController';
import type { Comment } from '@/types';

describe('CommentBadges', () => {
  let badges: CommentBadges;
  let callbacks: CommentBadgeCallbacks;

  beforeEach(() => {
    document.body.innerHTML = '';
    badges = new CommentBadges();
    callbacks = {
      onShowComments: vi.fn(),
      onOpenComposer: vi.fn(),
      onHover: vi.fn(),
      onLeave: vi.fn(),
    };
  });

  const createMockSection = (
    id: string,
    commentCount: number
  ): SectionCommentSnapshot => {
    const comments: Comment[] = [];
    for (let i = 0; i < commentCount; i++) {
      comments.push({
        id: `comment-${id}-${i}`,
        elementId: id,
        userId: 'test-user',
        timestamp: Date.now(),
        content: `Comment ${i + 1}`,
        resolved: false,
        type: 'comment',
      });
    }

    return {
      element: {
        id,
        content: 'Test content',
        metadata: { type: 'Para' },
      },
      comments,
    };
  };

  const createDOMElement = (id: string): HTMLElement => {
    const element = document.createElement('div');
    element.className = 'review-editable';
    element.setAttribute('data-review-id', id);
    document.body.appendChild(element);
    return element;
  };

  describe('syncIndicators', () => {
    it('creates indicator badge for section with comment', () => {
      const domElement = createDOMElement('section-1');
      const section = createMockSection('section-1', 1);

      badges.syncIndicators([section], callbacks);

      const indicator = domElement.querySelector('.review-section-comment-indicator');
      expect(indicator).not.toBeNull();
      expect(indicator?.tagName).toBe('BUTTON');
    });

    it('shows badge icon and count for multiple comments', () => {
      const domElement = createDOMElement('section-1');
      const section = createMockSection('section-1', 3);

      badges.syncIndicators([section], callbacks);

      const countSpan = domElement.querySelector('.review-badge-count');
      expect(countSpan).not.toBeNull();
      expect(countSpan?.textContent).toBe('3');
      expect(countSpan?.classList.contains('is-hidden')).toBe(false);
    });

    it('hides count badge for single comment', () => {
      const domElement = createDOMElement('section-1');
      const section = createMockSection('section-1', 1);

      badges.syncIndicators([section], callbacks);

      const countSpan = domElement.querySelector('.review-badge-count');
      expect(countSpan?.classList.contains('is-hidden')).toBe(true);
    });

    it('updates existing indicator when called multiple times', () => {
      const domElement = createDOMElement('section-1');
      const section1 = createMockSection('section-1', 1);
      const section2 = createMockSection('section-1', 5);

      badges.syncIndicators([section1], callbacks);
      const indicator1 = domElement.querySelector('.review-badge-count');
      expect(indicator1?.textContent).toBe('1');

      badges.syncIndicators([section2], callbacks);
      const indicator2 = domElement.querySelector('.review-badge-count');
      expect(indicator2?.textContent).toBe('5');
      expect(indicator2?.classList.contains('is-hidden')).toBe(false);
    });

    it('removes indicator when section no longer has comments', () => {
      const domElement = createDOMElement('section-1');
      const section = createMockSection('section-1', 2);

      badges.syncIndicators([section], callbacks);
      expect(domElement.querySelector('.review-section-comment-indicator')).not.toBeNull();

      badges.syncIndicators([], callbacks);
      expect(domElement.querySelector('.review-section-comment-indicator')).toBeNull();
    });

    it('skips section if DOM element not found', () => {
      const section = createMockSection('missing-section', 1);

      // Should not throw
      expect(() => badges.syncIndicators([section], callbacks)).not.toThrow();
    });

    it('skips section if element is being edited', () => {
      const domElement = createDOMElement('section-1');
      domElement.classList.add('review-editable-editing');
      const section = createMockSection('section-1', 1);

      badges.syncIndicators([section], callbacks);

      expect(domElement.querySelector('.review-section-comment-indicator')).toBeNull();
    });

    it('sets position relative on static positioned elements', () => {
      const domElement = createDOMElement('section-1');
      domElement.style.position = 'static';
      const section = createMockSection('section-1', 1);

      badges.syncIndicators([section], callbacks);

      expect(domElement.style.position).toBe('relative');
    });

    it('preserves existing position on non-static elements', () => {
      const domElement = createDOMElement('section-1');
      domElement.style.position = 'absolute';
      const section = createMockSection('section-1', 1);

      badges.syncIndicators([section], callbacks);

      expect(domElement.style.position).toBe('absolute');
    });

    it('sets tooltip with comment preview', () => {
      const domElement = createDOMElement('section-1');
      const section = createMockSection('section-1', 1);

      badges.syncIndicators([section], callbacks);

      const indicator = domElement.querySelector('.review-section-comment-indicator');
      const title = indicator?.getAttribute('title');
      expect(title).toContain('Comment');
      expect(title).toContain('Comment 1');
    });

    it('sets tooltip with multiple comments count', () => {
      const domElement = createDOMElement('section-1');
      const section = createMockSection('section-1', 3);

      badges.syncIndicators([section], callbacks);

      const indicator = domElement.querySelector('.review-section-comment-indicator');
      const title = indicator?.getAttribute('title');
      expect(title).toContain('3 comments');
    });

    it('removes duplicate indicators from same element', () => {
      const domElement = createDOMElement('section-1');

      // Manually add a duplicate indicator
      const duplicate = document.createElement('div');
      duplicate.className = 'review-section-comment-indicator';
      domElement.appendChild(duplicate);

      const section = createMockSection('section-1', 1);
      badges.syncIndicators([section], callbacks);

      const indicators = domElement.querySelectorAll('.review-section-comment-indicator');
      expect(indicators.length).toBe(1);
    });
  });

  describe('indicator interactions', () => {
    it('calls onShowComments when clicked', () => {
      const domElement = createDOMElement('section-1');
      const section = createMockSection('section-1', 1);

      badges.syncIndicators([section], callbacks);

      const indicator = domElement.querySelector('.review-section-comment-indicator') as HTMLElement;
      indicator.click();

      expect(callbacks.onShowComments).toHaveBeenCalledWith('section-1', expect.any(String));
    });

    it('calls onOpenComposer when double-clicked', () => {
      const domElement = createDOMElement('section-1');
      const section = createMockSection('section-1', 1);

      badges.syncIndicators([section], callbacks);

      const indicator = domElement.querySelector('.review-section-comment-indicator') as HTMLElement;
      const dblClickEvent = new MouseEvent('dblclick', { bubbles: true });
      indicator.dispatchEvent(dblClickEvent);

      expect(callbacks.onOpenComposer).toHaveBeenCalledWith(
        'section-1',
        expect.objectContaining({ type: 'comment' })
      );
    });

    it('calls onHover when mouse enters', () => {
      const domElement = createDOMElement('section-1');
      const section = createMockSection('section-1', 1);

      badges.syncIndicators([section], callbacks);

      const indicator = domElement.querySelector('.review-section-comment-indicator') as HTMLElement;
      const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
      indicator.dispatchEvent(mouseEnterEvent);

      expect(callbacks.onHover).toHaveBeenCalledWith('section-1');
    });

    it('calls onLeave when mouse leaves', () => {
      const domElement = createDOMElement('section-1');
      const section = createMockSection('section-1', 1);

      badges.syncIndicators([section], callbacks);

      const indicator = domElement.querySelector('.review-section-comment-indicator') as HTMLElement;
      const mouseLeaveEvent = new MouseEvent('mouseleave', { bubbles: true });
      indicator.dispatchEvent(mouseLeaveEvent);

      expect(callbacks.onLeave).toHaveBeenCalled();
    });

    it('stops event propagation on mousedown', () => {
      const domElement = createDOMElement('section-1');
      const section = createMockSection('section-1', 1);

      badges.syncIndicators([section], callbacks);

      const indicator = domElement.querySelector('.review-section-comment-indicator') as HTMLElement;
      const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      const stopPropagationSpy = vi.spyOn(mouseDownEvent, 'stopPropagation');

      indicator.dispatchEvent(mouseDownEvent);

      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('stops event propagation on click', () => {
      const domElement = createDOMElement('section-1');
      const section = createMockSection('section-1', 1);

      badges.syncIndicators([section], callbacks);

      const indicator = domElement.querySelector('.review-section-comment-indicator') as HTMLElement;
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

      indicator.dispatchEvent(clickEvent);

      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('removes all indicators from DOM', () => {
      const domElement1 = createDOMElement('section-1');
      const domElement2 = createDOMElement('section-2');
      const section1 = createMockSection('section-1', 1);
      const section2 = createMockSection('section-2', 2);

      badges.syncIndicators([section1, section2], callbacks);

      expect(domElement1.querySelector('.review-section-comment-indicator')).not.toBeNull();
      expect(domElement2.querySelector('.review-section-comment-indicator')).not.toBeNull();

      badges.clearAll();

      expect(domElement1.querySelector('.review-section-comment-indicator')).toBeNull();
      expect(domElement2.querySelector('.review-section-comment-indicator')).toBeNull();
    });

    it('allows syncIndicators to be called again after clearAll', () => {
      const domElement = createDOMElement('section-1');
      const section = createMockSection('section-1', 1);

      badges.syncIndicators([section], callbacks);
      badges.clearAll();
      badges.syncIndicators([section], callbacks);

      expect(domElement.querySelector('.review-section-comment-indicator')).not.toBeNull();
    });
  });

  describe('destroy', () => {
    it('removes all indicators when destroyed', () => {
      const domElement = createDOMElement('section-1');
      const section = createMockSection('section-1', 1);

      badges.syncIndicators([section], callbacks);
      badges.destroy();

      expect(domElement.querySelector('.review-section-comment-indicator')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles section with empty comment content', () => {
      const domElement = createDOMElement('section-1');
      const section: SectionCommentSnapshot = {
        element: {
          id: 'section-1',
          content: 'Test content',
          metadata: { type: 'Para' },
        },
        comments: [{
          id: 'comment-1',
          elementId: 'section-1',
          userId: 'test-user',
          timestamp: Date.now(),
          content: '',
          resolved: false,
          type: 'comment',
        }],
      };

      badges.syncIndicators([section], callbacks);

      const indicator = domElement.querySelector('.review-section-comment-indicator');
      expect(indicator).not.toBeNull();
      const title = indicator?.getAttribute('title');
      expect(title).toBe('Comment');
    });

    it('handles indicator reconnection when DOM element is replaced', () => {
      const domElement = createDOMElement('section-1');
      const section = createMockSection('section-1', 1);

      badges.syncIndicators([section], callbacks);

      // Remove and recreate DOM element (simulating DOM replacement)
      domElement.remove();
      const newDomElement = createDOMElement('section-1');

      badges.syncIndicators([section], callbacks);

      expect(newDomElement.querySelector('.review-section-comment-indicator')).not.toBeNull();
    });

    it('handles comment key with no comments', () => {
      const domElement = createDOMElement('section-1');
      const section: SectionCommentSnapshot = {
        element: {
          id: 'section-1',
          content: 'Test content',
          metadata: { type: 'Para' },
        },
        comments: [],
      };

      // Should handle empty comments gracefully - creates indicator with default values
      badges.syncIndicators([section], callbacks);

      const indicator = domElement.querySelector('.review-section-comment-indicator');
      expect(indicator).not.toBeNull();
      expect(indicator?.getAttribute('data-comment-key')).toBe('section-1');
      expect(indicator?.getAttribute('data-comment-id')).toBe('');
    });

    it('trims whitespace in comment preview', () => {
      const domElement = createDOMElement('section-1');
      const section: SectionCommentSnapshot = {
        element: {
          id: 'section-1',
          content: 'Test content',
          metadata: { type: 'Para' },
        },
        comments: [{
          id: 'comment-1',
          elementId: 'section-1',
          userId: 'test-user',
          timestamp: Date.now(),
          content: '  Multi\n  line  \n  comment  ',
          resolved: false,
          type: 'comment',
        }],
      };

      badges.syncIndicators([section], callbacks);

      const indicator = domElement.querySelector('.review-section-comment-indicator');
      const title = indicator?.getAttribute('title');
      expect(title).toContain('Multi line comment');
      expect(title).not.toContain('\n');
    });
  });
});
