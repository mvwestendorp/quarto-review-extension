/**
 * Element query helper utilities
 * Provides common element selection operations for review elements
 */

/**
 * Finds a review element by its data-review-id attribute
 * @param elementId - The review ID to search for
 * @param root - Optional root element to search within (default: document)
 * @returns The element if found, null otherwise
 */
export function findReviewElement(
  elementId: string,
  root: Document | HTMLElement = document
): HTMLElement | null {
  return root.querySelector(
    `[data-review-id="${elementId}"]`
  ) as HTMLElement | null;
}

/**
 * Finds all review elements in the document or within a container
 * @param root - Optional root element to search within (default: document)
 * @returns NodeList of all elements with data-review-id attribute
 */
export function findAllReviewElements(
  root: Document | HTMLElement = document
): NodeListOf<HTMLElement> {
  return root.querySelectorAll('[data-review-id]');
}

/**
 * Finds a review element by its data-review-id and ensures it matches a specific type
 * @param elementId - The review ID to search for
 * @param type - The expected review type (e.g., 'Para', 'Header', 'CodeBlock')
 * @param root - Optional root element to search within (default: document)
 * @returns The element if found and type matches, null otherwise
 */
export function findReviewElementByType(
  elementId: string,
  type: string,
  root: Document | HTMLElement = document
): HTMLElement | null {
  const element = findReviewElement(elementId, root);
  if (!element) {
    return null;
  }

  const elementType = element.getAttribute('data-review-type');
  return elementType === type ? element : null;
}

/**
 * Gets the review ID from an element
 * @param element - The element to get the review ID from
 * @returns The review ID if present, null otherwise
 */
export function getReviewId(element: HTMLElement | null): string | null {
  return element?.getAttribute('data-review-id') ?? null;
}

/**
 * Gets the review type from an element
 * @param element - The element to get the review type from
 * @returns The review type if present, null otherwise
 */
export function getReviewType(element: HTMLElement | null): string | null {
  return element?.getAttribute('data-review-type') ?? null;
}

/**
 * Checks if an element is a review element (has data-review-id)
 * @param element - The element to check
 * @returns true if the element is a review element, false otherwise
 */
export function isReviewElement(element: HTMLElement | null): boolean {
  return element?.hasAttribute('data-review-id') ?? false;
}

/**
 * Finds the closest review element ancestor of a given element
 * @param element - The starting element
 * @returns The closest review element ancestor, or null if not found
 */
export function findClosestReviewElement(
  element: HTMLElement | null
): HTMLElement | null {
  return element?.closest('[data-review-id]') as HTMLElement | null;
}

/**
 * Finds all review elements of a specific type
 * @param type - The review type to filter by (e.g., 'Para', 'Header')
 * @param root - Optional root element to search within (default: document)
 * @returns Array of elements matching the type
 */
export function findReviewElementsByType(
  type: string,
  root: Document | HTMLElement = document
): HTMLElement[] {
  const elements = findAllReviewElements(root);
  return Array.from(elements).filter(
    (el) => el.getAttribute('data-review-type') === type
  );
}

/**
 * Finds a comment-related element by element ID and comment ID
 * @param elementId - The review element ID
 * @param commentId - The comment ID
 * @returns The comment element if found, null otherwise
 */
export function findCommentItem(
  elementId: string,
  commentId: string
): HTMLElement | null {
  const selector = `[data-element-id="${elementId}"][data-comment-id="${commentId}"]`;
  return document.querySelector(selector) as HTMLElement | null;
}
