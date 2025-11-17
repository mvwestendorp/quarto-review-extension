/**
 * DOM manipulation helper utilities
 * Provides common DOM operations used throughout the application
 */

/**
 * Adds a CSS class to an element
 * Safe to call with null elements (no-op)
 * @param element - The element to add the class to
 * @param className - The class name to add
 */
export function addClass(
  element: HTMLElement | null | undefined,
  className: string
): void {
  element?.classList.add(className);
}

/**
 * Removes a CSS class from an element
 * Safe to call with null elements (no-op)
 * @param element - The element to remove the class from
 * @param className - The class name to remove
 */
export function removeClass(
  element: HTMLElement | null | undefined,
  className: string
): void {
  element?.classList.remove(className);
}

/**
 * Toggles a CSS class on an element
 * Safe to call with null elements (no-op)
 * @param element - The element to toggle the class on
 * @param className - The class name to toggle
 * @param force - Optional boolean to force add (true) or remove (false)
 * @returns true if the class is now present, false otherwise
 */
export function toggleClass(
  element: HTMLElement | null | undefined,
  className: string,
  force?: boolean
): boolean {
  if (!element) {
    return false;
  }
  return element.classList.toggle(className, force);
}

/**
 * Checks if an element has a CSS class
 * Safe to call with null elements (returns false)
 * @param element - The element to check
 * @param className - The class name to check for
 * @returns true if the element has the class, false otherwise
 */
export function hasClass(
  element: HTMLElement | null | undefined,
  className: string
): boolean {
  return element?.classList.contains(className) ?? false;
}

/**
 * Creates a simple button element with text content
 * @param text - The button text
 * @param className - Optional CSS class name(s)
 * @param type - Button type (default: 'button')
 * @returns The created button element
 */
export function createButton(
  text: string,
  className?: string,
  type: 'button' | 'submit' | 'reset' = 'button'
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = type;
  button.textContent = text;
  if (className) {
    button.className = className;
  }
  return button;
}

/**
 * Creates a span element with icon/emoji content
 * @param icon - The icon text (emoji or symbol)
 * @param className - Optional CSS class name(s)
 * @returns The created span element
 */
export function createIcon(icon: string, className?: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.textContent = icon;
  if (className) {
    span.className = className;
  }
  return span;
}

/**
 * Creates a div element with optional class name
 * @param className - Optional CSS class name(s)
 * @returns The created div element
 */
export function createDiv(className?: string): HTMLDivElement {
  const div = document.createElement('div');
  if (className) {
    div.className = className;
  }
  return div;
}

/**
 * Sets multiple attributes on an element
 * @param element - The element to set attributes on
 * @param attributes - Object mapping attribute names to values
 */
export function setAttributes(
  element: HTMLElement,
  attributes: Record<string, string | number | boolean>
): void {
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });
}

/**
 * Safely removes an element from the DOM
 * Safe to call with null elements (no-op)
 * @param element - The element to remove
 */
export function removeElement(element: HTMLElement | null | undefined): void {
  element?.remove();
}

/**
 * Escapes HTML special characters in a string
 * @param text - The text to escape
 * @returns The escaped text safe for HTML insertion
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
