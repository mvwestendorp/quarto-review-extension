import { describe, it, expect, beforeEach } from 'vitest';
import { EditorToolbar } from '@modules/ui/editor/EditorToolbar';

describe('EditorToolbar collapse toggle', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('renders collapsed toolbar with toggle button', () => {
    const toolbar = new EditorToolbar();
    const element = toolbar.create();
    toolbar.attachHandlers();

    expect(element.classList.contains('review-editor-toolbar-collapsed')).toBe(
      true
    );

    const toggleBtn = element.querySelector(
      '.review-editor-toolbar-toggle'
    ) as HTMLButtonElement | null;
    expect(toggleBtn).toBeTruthy();
    expect(toggleBtn?.getAttribute('aria-label')).toBe('Expand toolbar');
    expect(toggleBtn?.textContent).toBe('⋯');
  });

  it('toggle button expands and collapses toolbar', () => {
    const toolbar = new EditorToolbar();
    const element = toolbar.create();
    toolbar.attachHandlers();

    const toggleBtn = element.querySelector(
      '.review-editor-toolbar-toggle'
    ) as HTMLButtonElement;

    toggleBtn.click();
    expect(element.classList.contains('review-editor-toolbar-collapsed')).toBe(
      false
    );
    expect(toggleBtn.getAttribute('aria-label')).toBe('Collapse toolbar');
    expect(toggleBtn.textContent).toBe('−');

    toggleBtn.click();
    expect(element.classList.contains('review-editor-toolbar-collapsed')).toBe(
      true
    );
    expect(toggleBtn.getAttribute('aria-label')).toBe('Expand toolbar');
    expect(toggleBtn.textContent).toBe('⋯');
  });
});
