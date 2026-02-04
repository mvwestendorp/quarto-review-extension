import type { ElementType } from '@/types';
import { addClass } from '@utils/dom-helpers';

type FloatKind = 'FigureCaption' | 'TableCaption';

interface CaptionContext {
  element: HTMLElement;
  kind: FloatKind;
  baseId: string;
  index: number;
}

const REVIEW_ID_PREFIX = 'review';

/**
 * Check if an element is inside a modal, dialog, or other excluded container
 */
function isInExcludedContainer(element: HTMLElement): boolean {
  return !!element.closest(
    '.modal, .dialog, [role="dialog"], [aria-modal="true"]'
  );
}

export function registerSupplementalEditableSegments(): void {
  if (typeof document === 'undefined') {
    return;
  }

  annotateDocumentTitle();
  annotateFloatCaptions();
  annotateExecutableCodeBlocks();
}

function annotateDocumentTitle(): void {
  const titleElement = document.querySelector<HTMLElement>(
    '#title-block-header .quarto-title .title'
  );
  if (!titleElement || titleElement.hasAttribute('data-review-id')) {
    return;
  }

  // Skip if element is inside a modal or dialog
  if (isInExcludedContainer(titleElement)) {
    return;
  }

  const original = titleElement.textContent?.trim() ?? '';
  if (!original) {
    return;
  }

  applySegmentAttributes(titleElement, {
    id: `${REVIEW_ID_PREFIX}.document.title`,
    type: 'DocumentTitle',
    markdown: original,
    origin: 'source',
    classes: ['review-editable'],
  });
}

function annotateFloatCaptions(): void {
  const captionNodes = document.querySelectorAll<HTMLElement>(
    '.quarto-float-caption'
  );
  if (!captionNodes.length) {
    return;
  }

  const counters: Record<FloatKind, number> = {
    FigureCaption: 0,
    TableCaption: 0,
  };

  captionNodes.forEach((caption) => {
    if (caption.hasAttribute('data-review-caption-processed')) {
      return;
    }
    if (
      caption.querySelector(
        '[data-review-type="FigureCaption"], [data-review-type="TableCaption"]'
      )
    ) {
      caption.setAttribute('data-review-caption-processed', 'true');
      return;
    }

    // Skip if caption is inside a modal or dialog
    if (isInExcludedContainer(caption)) {
      caption.setAttribute('data-review-caption-processed', 'true');
      return;
    }

    const ctx = resolveCaptionContext(caption, counters);
    if (!ctx) {
      return;
    }

    const { editableNode, markdown } = extractEditableCaptionNode(ctx.element);
    if (!editableNode || !markdown.trim()) {
      return;
    }

    counters[ctx.kind] += 1;

    applySegmentAttributes(editableNode, {
      id: `${REVIEW_ID_PREFIX}.${ctx.baseId || ctx.kind.toLowerCase()}.${
        ctx.kind === 'FigureCaption' ? 'figcap' : 'tablecap'
      }-${counters[ctx.kind]}`,
      type: ctx.kind,
      markdown,
      origin: 'source',
      classes: ['review-editable', 'review-editable-inline'],
    });

    caption.setAttribute('data-review-caption-processed', 'true');
  });
}

/**
 * Annotate executable code blocks (cell-code) with review segment attributes.
 *
 * The Lua filter deliberately leaves these untouched so that Quarto's own
 * processCodeCell / resolveCellAnnotes filters can walk the CodeBlock nodes
 * without hitting a wrapper Div.  We pick them up here, after Quarto has
 * finished rendering, and stamp the same data-review-* attributes that a
 * plain code block would have received from the Lua filter.  No
 * review-editable class is added — these segments are non-editable.
 */
function annotateExecutableCodeBlocks(): void {
  const cellCodeBlocks = document.querySelectorAll<HTMLElement>(
    'div.sourceCode.cell-code'
  );
  if (!cellCodeBlocks.length) {
    return;
  }

  let counter = 0;
  cellCodeBlocks.forEach((block) => {
    if (block.hasAttribute('data-review-id')) {
      return;
    }
    if (isInExcludedContainer(block)) {
      return;
    }

    const codeEl = block.querySelector<HTMLElement>('code');
    if (!codeEl) {
      return;
    }

    const language = extractLanguageFromCode(codeEl);
    if (!language) {
      return;
    }

    const code = codeEl.textContent?.trim() ?? '';
    if (!code) {
      return;
    }

    counter += 1;
    const markdown = '```{' + language + '}\n' + code + '\n```';

    applySegmentAttributes(block, {
      id: `${REVIEW_ID_PREFIX}.cell.codeblock-${counter}`,
      type: 'CodeBlock',
      markdown,
      origin: 'source',
      // Intentionally no classes — executable code blocks are non-editable
    });
  });
}

/**
 * Extract the language identifier from a <code> element inside a cell-code
 * block.  Quarto places classes like "sourceCode python" on the element;
 * the language is the first class that is not "sourceCode".
 */
function extractLanguageFromCode(codeEl: HTMLElement): string | null {
  for (const cls of codeEl.classList) {
    if (cls !== 'sourceCode') {
      return cls;
    }
  }
  return null;
}

function resolveCaptionContext(
  caption: HTMLElement,
  counters: Record<FloatKind, number>
): CaptionContext | null {
  let container = caption.closest<HTMLElement>(
    '.quarto-figure, .quarto-figure-center, .quarto-figure-container, ' +
      '.quarto-table, .quarto-table-center, .quarto-table-container, ' +
      '.quarto-float'
  );
  if (!container) {
    return null;
  }

  const figureMarkers = [
    'quarto-figure',
    'quarto-figure-center',
    'quarto-figure-container',
    'quarto-float-fig',
  ];
  const tableMarkers = [
    'quarto-table',
    'quarto-table-center',
    'quarto-table-container',
    'quarto-float-table',
  ];

  const containerClasses = new Set([...container.classList]);
  const captionClasses = new Set([...caption.classList]);

  let kind: FloatKind | null = null;
  if (
    figureMarkers.some((cls) => containerClasses.has(cls)) ||
    captionClasses.has('quarto-float-fig')
  ) {
    kind = 'FigureCaption';
  } else if (
    tableMarkers.some((cls) => containerClasses.has(cls)) ||
    captionClasses.has('quarto-float-table')
  ) {
    kind = 'TableCaption';
  }

  if (!kind) {
    return null;
  }

  const baseId =
    container.getAttribute('id') ??
    caption.getAttribute('id') ??
    `${kind.toLowerCase()}-${counters[kind] + 1}`;

  return {
    element: caption,
    kind,
    baseId: baseId.replace(/\s+/g, '-'),
    index: counters[kind] + 1,
  };
}

function extractEditableCaptionNode(caption: HTMLElement): {
  editableNode: HTMLElement | null;
  markdown: string;
} {
  const colonInfo = findColonPosition(caption);
  if (!colonInfo) {
    // Fallback: treat entire caption as editable
    const span = wrapContents(caption);
    return {
      editableNode: span,
      markdown: span?.textContent ?? '',
    };
  }

  const { node, offset } = colonInfo;
  const span = document.createElement('span');
  const tail = node.splitText(offset);
  tail.textContent = (tail.textContent ?? '').replace(/^\s+/, '');
  ensureColonSpacing(node);

  let moveNode: ChildNode | null = tail;
  while (moveNode) {
    const next: ChildNode | null = moveNode.nextSibling;
    span.appendChild(moveNode);
    moveNode = next;
  }

  caption.appendChild(span);

  return {
    editableNode: span,
    markdown: span.textContent?.trim() ?? '',
  };
}

function findColonPosition(
  caption: HTMLElement
): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(caption, NodeFilter.SHOW_TEXT, null);

  let current: Text | null = walker.nextNode() as Text | null;
  while (current) {
    const value = current.textContent ?? '';
    const index = value.indexOf(':');
    if (index !== -1) {
      return { node: current, offset: index + 1 };
    }
    current = walker.nextNode() as Text | null;
  }

  return null;
}

function wrapContents(parent: HTMLElement): HTMLElement | null {
  if (!parent.childNodes.length) {
    return null;
  }

  const span = document.createElement('span');
  while (parent.firstChild) {
    span.appendChild(parent.firstChild);
  }
  parent.appendChild(span);
  return span;
}

function ensureColonSpacing(node: Text): void {
  const value = node.textContent ?? '';
  if (!value.endsWith(':')) {
    return;
  }
  if (!/\s$/.test(value)) {
    node.textContent = `${value} `;
  }
}

function applySegmentAttributes(
  element: HTMLElement,
  descriptor: {
    id: string;
    type: ElementType;
    markdown: string;
    origin: string;
    classes?: string[];
  }
): void {
  element.setAttribute('data-review-id', descriptor.id);
  element.setAttribute('data-review-type', descriptor.type);
  element.setAttribute('data-review-markdown', descriptor.markdown);
  element.setAttribute('data-review-origin', descriptor.origin);

  if (descriptor.classes?.length) {
    descriptor.classes.forEach((cls) => addClass(element, cls));
  }
}
