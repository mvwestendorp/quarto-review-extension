import { ContextMenu, type MenuPosition } from './ContextMenu';

export interface ContextMenuCoordinatorHandlers {
  onEdit(sectionId: string): void;
  onComment(sectionId: string): void;
}

export class ContextMenuCoordinator {
  private readonly menu: ContextMenu;

  constructor(handlers: ContextMenuCoordinatorHandlers) {
    this.menu = new ContextMenu();
    this.menu.onEdit(handlers.onEdit);
    this.menu.onComment(handlers.onComment);
  }

  openFromEvent(target: HTMLElement, event: MouseEvent): void {
    const sectionId = target.getAttribute('data-review-id');
    if (!sectionId) {
      return;
    }

    const position: MenuPosition = {
      x: event.clientX,
      y: event.clientY,
    };

    this.menu.open(sectionId, position);
  }

  close(): void {
    this.menu.close();
  }

  destroy(): void {
    this.menu.destroy();
  }
}
