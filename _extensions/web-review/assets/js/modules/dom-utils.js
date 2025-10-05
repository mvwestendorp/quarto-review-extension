/**
 * DOM Utilities Module
 * Provides helper functions for DOM manipulation and range calculations
 */

/**
 * Calculate character offset from the beginning of parentElement to a position within node
 * @param {Element} parentElement - The parent element to measure from
 * @param {Node} node - The node containing the position
 * @param {number} offset - The offset within the node
 * @returns {number} The character offset from the start of parentElement
 */
function getOffsetForNode(parentElement, node, offset) {
  let charOffset = 0;

  // Create a range from the start of parent to the target position
  const range = document.createRange();
  range.setStart(parentElement, 0);
  range.setEnd(node, offset);

  // Get the text content of this range - this gives us the character count
  charOffset = range.toString().length;

  return charOffset;
}

/**
 * Creates a DOM Range from character offsets within an element
 * @param {Element} element - The parent element containing the text
 * @param {number} startOffset - The starting character offset
 * @param {number} endOffset - The ending character offset
 * @returns {Range|null} A DOM Range object, or null if offsets are invalid
 */
function createRangeFromOffsets(element, startOffset, endOffset) {
  const treeWalker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let charCount = 0;
  let currentNode;
  let startNode = null;
  let startNodeOffset = 0;
  let endNode = null;
  let endNodeOffset = 0;

  while ((currentNode = treeWalker.nextNode())) {
    const nodeLength = currentNode.textContent.length;

    // Find start position
    if (startNode === null && charCount + nodeLength >= startOffset) {
      startNode = currentNode;
      startNodeOffset = startOffset - charCount;
    }

    // Find end position
    if (endNode === null && charCount + nodeLength >= endOffset) {
      endNode = currentNode;
      endNodeOffset = endOffset - charCount;
      break;
    }

    charCount += nodeLength;
  }

  if (startNode && endNode) {
    const range = document.createRange();
    range.setStart(startNode, startNodeOffset);
    range.setEnd(endNode, endNodeOffset);
    return range;
  }

  return null;
}
