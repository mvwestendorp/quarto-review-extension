/**
 * NotificationService
 * Handles user notifications and messages
 */

import { UI_CONSTANTS, getAnimationDuration } from '@modules/ui/constants';

export type NotificationType = 'info' | 'success' | 'error' | 'warning';

export interface NotificationOptions {
  /** Duration in milliseconds to show the notification (default: 3000) */
  duration?: number;
  /** Whether the notification can be dismissed by clicking (default: true) */
  dismissible?: boolean;
}

/**
 * Service for showing user notifications
 */
export class NotificationService {
  private activeNotifications: Set<HTMLElement> = new Set();

  /**
   * Show a notification to the user
   */
  public show(
    message: string,
    type: NotificationType = 'info',
    options: NotificationOptions = {}
  ): void {
    const {
      duration = UI_CONSTANTS.NOTIFICATION_DISPLAY_DURATION_MS,
      dismissible = true,
    } = options;

    const notification = this.createNotificationElement(
      message,
      type,
      dismissible
    );
    document.body.appendChild(notification);
    this.activeNotifications.add(notification);

    // Show with animation
    setTimeout(() => {
      notification.classList.add('review-notification-show');
    }, 10);

    // Auto-hide after duration
    setTimeout(() => {
      this.hide(notification);
    }, duration);
  }

  /**
   * Show an info notification
   */
  public info(message: string, options?: NotificationOptions): void {
    this.show(message, 'info', options);
  }

  /**
   * Show a success notification
   */
  public success(message: string, options?: NotificationOptions): void {
    this.show(message, 'success', options);
  }

  /**
   * Show an error notification
   */
  public error(message: string, options?: NotificationOptions): void {
    this.show(message, 'error', options);
  }

  /**
   * Show a warning notification
   */
  public warning(message: string, options?: NotificationOptions): void {
    this.show(message, 'warning', options);
  }

  /**
   * Hide a specific notification
   */
  public hide(notification: HTMLElement): void {
    if (!this.activeNotifications.has(notification)) {
      return;
    }

    notification.classList.remove('review-notification-show');

    setTimeout(() => {
      notification.remove();
      this.activeNotifications.delete(notification);
    }, getAnimationDuration('SLOW'));
  }

  /**
   * Hide all active notifications
   */
  public hideAll(): void {
    this.activeNotifications.forEach((notification) => {
      this.hide(notification);
    });
  }

  /**
   * Create notification DOM element
   */
  private createNotificationElement(
    message: string,
    type: NotificationType,
    dismissible: boolean
  ): HTMLElement {
    const notification = document.createElement('div');
    notification.className = `review-notification review-notification-${type}`;
    notification.textContent = message;

    if (dismissible) {
      notification.style.cursor = 'pointer';
      notification.addEventListener('click', () => {
        this.hide(notification);
      });
    }

    return notification;
  }

  /**
   * Clean up all notifications
   */
  public destroy(): void {
    this.activeNotifications.forEach((notification) => {
      notification.remove();
    });
    this.activeNotifications.clear();
  }
}

// Singleton instance
let notificationServiceInstance: NotificationService | null = null;

/**
 * Get the singleton notification service instance
 */
export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}
