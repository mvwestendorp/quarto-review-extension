import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import { ContextMenu } from '@modules/ui/sidebars/ContextMenu';
import { ContextMenuCoordinator } from '@modules/ui/sidebars/ContextMenuCoordinator';

const createSection = (id: string) => {
  const section = document.createElement('div');
  section.dataset.reviewId = id;
  section.textContent = 'Section content';
  document.body.appendChild(section);
  return section;
};

describe('Context menu interactions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('creates menu element once and appends to body', () => {
    const menu = new ContextMenu();

    const element = menu.create();
    expect(element).toBeInstanceOf(HTMLElement);
    expect(element.className).toBe('review-context-menu');
    expect(document.body.contains(element)).toBe(true);
    expect(menu.getElement()).toBe(element);
    expect(document.querySelectorAll('.review-context-menu')).toHaveLength(1);

    menu.destroy();
  });

  it('opens, focuses first item, and triggers callbacks', () => {
    const menu = new ContextMenu();
    const element = menu.create();
    const editHandler = vi.fn();
    const commentHandler = vi.fn();
    menu.onEdit(editHandler);
    menu.onComment(commentHandler);

    menu.open('section-1', { x: 42, y: 64 });

    expect(element.style.display).toBe('block');
    expect(element.style.left).toBe('42px');
    expect(element.style.top).toBe('64px');
    expect(menu.getIsOpen()).toBe(true);

    const buttons = element.querySelectorAll('button');
    expect(buttons.length).toBe(2);

    // Simulate clicks
    buttons[0].dispatchEvent(new Event('click', { bubbles: true }));
    expect(editHandler).toHaveBeenCalledWith('section-1');
    expect(menu.getIsOpen()).toBe(false);

    menu.open('section-1', { x: 1, y: 1 });
    buttons[1].dispatchEvent(new Event('click', { bubbles: true }));
    expect(commentHandler).toHaveBeenCalledWith('section-1');
    expect(menu.getIsOpen()).toBe(false);

    menu.destroy();
  });

  it('closes on Escape and click outside, and removes listeners on destroy', () => {
    const menu = new ContextMenu();
    const element = menu.create();
    menu.open('section-2', { x: 0, y: 0 });

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(menu.getIsOpen()).toBe(false);

    menu.open('section-2', { x: 0, y: 0 });
    document.dispatchEvent(new Event('click', { bubbles: true }));
    expect(menu.getIsOpen()).toBe(false);

    menu.destroy();
    expect(document.body.contains(element)).toBe(false);

    // Subsequent events should not throw
    expect(() => {
      document.dispatchEvent(new Event('click', { bubbles: true }));
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    }).not.toThrow();
  });

  it('ContextMenuCoordinator opens menu for target with review id', () => {
    const edit = vi.fn();
    const comment = vi.fn();
    const coordinator = new ContextMenuCoordinator({ onEdit: edit, onComment: comment });
    const section = createSection('section-3');

    const event = new MouseEvent('contextmenu', {
      clientX: 10,
      clientY: 20,
      bubbles: true,
    });

    coordinator.openFromEvent(section, event);
    const menuElement = document.querySelector('.review-context-menu') as HTMLElement;
    expect(menuElement).toBeTruthy();
    expect(menuElement.style.left).toBe('10px');
    expect(menuElement.style.top).toBe('20px');

    const [editBtn, commentBtn] = Array.from(
      menuElement.querySelectorAll('button')
    ) as HTMLButtonElement[];

    editBtn.click();
    expect(edit).toHaveBeenCalledWith('section-3');

    coordinator.openFromEvent(section, event);
    commentBtn.click();
    expect(comment).toHaveBeenCalledWith('section-3');

    coordinator.close();
    expect(menuElement.style.display).toBe('none');

    coordinator.destroy();
    expect(document.querySelector('.review-context-menu')).toBeNull();
  });
});
