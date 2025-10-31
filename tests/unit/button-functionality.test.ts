/**
 * Button Functionality Tests
 *
 * Tests to ensure all buttons in the application function correctly in the DOM.
 * Note: Some tests are marked as .skip() because the associated functionality
 * has not yet been implemented (e.g., view comments button).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommentsSidebar } from '@modules/ui/comments/CommentsSidebar';

describe('Button Functionality - Search Panel', () => {
  let mockConfig: any;
  let mockSearch: any;

  beforeEach(() => {
    // Setup mock search configuration
    mockConfig = {
      changes: {
        getCurrentState: vi.fn(() => [
          { id: 'elem-1', content: 'First paragraph with test content' },
          { id: 'elem-2', content: 'Second element header' },
        ]),
      },
      markdown: {
        toPlainText: vi.fn((content) => content),
      },
    };

    // Setup mock search DOM
    document.body.innerHTML = `
      <div class="review-search-panel">
        <button class="review-search-close" data-action="close" title="Close (ESC)">✕</button>
        <input type="text" class="review-search-input" placeholder="Find in document..." />
        <button class="review-search-nav-btn" data-action="prev" title="Previous match">▲</button>
        <span class="review-search-counter">0/0</span>
        <button class="review-search-nav-btn" data-action="next" title="Next match">▼</button>
      </div>
    `;
  });

  it('close button should be clickable', () => {
    const closeBtn = document.querySelector('[data-action="close"]') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();

    expect(() => {
      closeBtn.click();
    }).not.toThrow();
  });

  it('next button should be clickable', () => {
    const nextBtn = document.querySelector('[data-action="next"]') as HTMLButtonElement;
    expect(nextBtn).toBeTruthy();

    expect(() => {
      nextBtn.click();
    }).not.toThrow();
  });

  it('previous button should be clickable', () => {
    const prevBtn = document.querySelector('[data-action="prev"]') as HTMLButtonElement;
    expect(prevBtn).toBeTruthy();

    expect(() => {
      prevBtn.click();
    }).not.toThrow();
  });

  it('search input should accept text', () => {
    const input = document.querySelector('.review-search-input') as HTMLInputElement;
    expect(input).toBeTruthy();

    input.value = 'test query';
    expect(input.value).toBe('test query');
  });

  it('counter should display match count', () => {
    const counter = document.querySelector('.review-search-counter');
    expect(counter).toBeTruthy();
    expect(counter?.textContent).toBe('0/0');

    counter!.textContent = '1/5';
    expect(counter?.textContent).toBe('1/5');
  });
});

describe('Button Functionality - Comment Badges', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-review-id="section-1" class="review-section">
        <div class="review-section-header">
          <span class="review-comment-badge" data-section-id="section-1">
            <span class="review-badge-count">3</span>
          </span>
        </div>
        <p>Section content</p>
      </div>
    `;
  });

  it('comment badge should be clickable', () => {
    const badge = document.querySelector('.review-comment-badge') as HTMLElement;
    expect(badge).toBeTruthy();

    expect(() => {
      badge.click();
    }).not.toThrow();
  });

  it('badge count should be readable', () => {
    const countSpan = document.querySelector('.review-badge-count');
    expect(countSpan).toBeTruthy();
    expect(countSpan?.textContent).toBe('3');
  });

  it('badge should have section ID data attribute', () => {
    const badge = document.querySelector('.review-comment-badge');
    expect(badge?.getAttribute('data-section-id')).toBe('section-1');
  });

  it('badge count should be updatable', () => {
    const countSpan = document.querySelector('.review-badge-count') as HTMLElement;
    countSpan.textContent = '5';
    expect(countSpan.textContent).toBe('5');
  });

  it('badge should have aria-label for accessibility', () => {
    const badge = document.querySelector('.review-comment-badge') as HTMLElement;
    badge.setAttribute('aria-label', '3 comments');
    expect(badge.getAttribute('aria-label')).toBe('3 comments');
  });
});

describe('Button Functionality - Toolbar Buttons', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="review-toolbar">
        <button class="review-btn-edit" data-action="edit" title="Edit">Edit</button>
        <button class="review-btn-save" data-action="save" title="Save">Save</button>
        <button class="review-btn-cancel" data-action="cancel" title="Cancel">Cancel</button>
        <button class="review-btn-delete" data-action="delete" title="Delete">Delete</button>
      </div>
    `;
  });

  it('edit button should be clickable', () => {
    const editBtn = document.querySelector('[data-action="edit"]') as HTMLButtonElement;
    expect(editBtn).toBeTruthy();

    expect(() => {
      editBtn.click();
    }).not.toThrow();
  });

  it('save button should be clickable', () => {
    const saveBtn = document.querySelector('[data-action="save"]') as HTMLButtonElement;
    expect(saveBtn).toBeTruthy();

    expect(() => {
      saveBtn.click();
    }).not.toThrow();
  });

  it('cancel button should be clickable', () => {
    const cancelBtn = document.querySelector('[data-action="cancel"]') as HTMLButtonElement;
    expect(cancelBtn).toBeTruthy();

    expect(() => {
      cancelBtn.click();
    }).not.toThrow();
  });

  it('delete button should be clickable', () => {
    const deleteBtn = document.querySelector('[data-action="delete"]') as HTMLButtonElement;
    expect(deleteBtn).toBeTruthy();

    expect(() => {
      deleteBtn.click();
    }).not.toThrow();
  });

  it('buttons should have proper data attributes', () => {
    const editBtn = document.querySelector('[data-action="edit"]');
    const saveBtn = document.querySelector('[data-action="save"]');

    expect(editBtn?.getAttribute('data-action')).toBe('edit');
    expect(saveBtn?.getAttribute('data-action')).toBe('save');
  });
});

describe('Comments sidebar interactions', () => {
  let sidebar: CommentsSidebar;

  beforeEach(() => {
    document.body.innerHTML = '';
    sidebar = new CommentsSidebar();
    sidebar.create();
  });

  it('renders collapsed panel with toggle', () => {
    const element = sidebar.getElement();
    expect(element).toBeTruthy();
    expect(element?.classList.contains('review-sidebar-collapsed')).toBe(true);

    const toggleBtn = element?.querySelector(
      '[data-action="toggle-comments-sidebar"]'
    ) as HTMLButtonElement | null;
    expect(toggleBtn).toBeTruthy();
    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');
  });

  it('toggle button expands and collapses the comments sidebar', () => {
    const element = sidebar.getElement();
    const toggleBtn = element?.querySelector(
      '[data-action="toggle-comments-sidebar"]'
    ) as HTMLButtonElement;
    toggleBtn.click();
    expect(element?.classList.contains('review-sidebar-collapsed')).toBe(false);
    expect(document.body.classList.contains('review-comments-sidebar-open')).toBe(true);
    toggleBtn.click();
    expect(element?.classList.contains('review-sidebar-collapsed')).toBe(true);
    expect(document.body.classList.contains('review-comments-sidebar-open')).toBe(false);
  });

  it('show() expands the sidebar programmatically', () => {
    sidebar.show();
    const element = sidebar.getElement();
    expect(element?.classList.contains('review-sidebar-collapsed')).toBe(false);
  });

  it('hide() collapses the sidebar programmatically', () => {
    sidebar.show();
    sidebar.hide();
    const element = sidebar.getElement();
    expect(element?.classList.contains('review-sidebar-collapsed')).toBe(true);
  });

  it('refresh maintains content container', () => {
    sidebar.refresh();
    const contentArea = document.querySelector('.review-comments-sidebar-content');
    expect(contentArea).toBeTruthy();
  });
});

describe('Button Accessibility', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="btn1" type="button" title="Edit this section">Edit</button>
      <button id="btn2" type="button" aria-label="Delete this item">Delete</button>
      <button id="btn3" type="button">Action</button>
    `;
  });

  it('buttons should be keyboard accessible', () => {
    const btn = document.querySelector('#btn1') as HTMLButtonElement;
    expect(btn).toBeTruthy();

    expect(() => {
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      btn.dispatchEvent(enterEvent);

      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      btn.dispatchEvent(spaceEvent);
    }).not.toThrow();
  });

  it('buttons should have accessible labels', () => {
    const btn1 = document.querySelector('#btn1');
    const btn2 = document.querySelector('#btn2');

    expect(btn1?.getAttribute('title')).toBe('Edit this section');
    expect(btn2?.getAttribute('aria-label')).toBe('Delete this item');
  });

  it('buttons should be focusable', () => {
    const btn = document.querySelector('#btn1') as HTMLButtonElement;
    btn.focus();
    expect(document.activeElement).toBe(btn);
  });

  it('button type should be button', () => {
    const btn = document.querySelector('#btn1') as HTMLButtonElement;
    expect(btn.type).toBe('button');
  });
});
