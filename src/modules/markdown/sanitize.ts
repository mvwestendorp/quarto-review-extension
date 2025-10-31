/**
 * Lightweight HTML sanitizer for browser/JSDOM contexts.
 * Removes script tags and inline event handlers while preserving markup.
 */
export function sanitizeHtml(html: string): string {
  if (typeof document === 'undefined') {
    return html;
  }

  const temp = document.createElement('div');
  temp.innerHTML = html;

  temp.querySelectorAll('script').forEach((node) => {
    const replacement = document.createTextNode(node.outerHTML);
    node.replaceWith(replacement);
  });

  temp.querySelectorAll<HTMLElement>('*').forEach((element) => {
    Array.from(element.attributes).forEach((attr) => {
      if (attr.name.toLowerCase().startsWith('on')) {
        element.removeAttribute(attr.name);
      }
    });
  });

  const serialized = temp.innerHTML;
  return normalizeEntities(serialized);
}

function normalizeEntities(value: string): string {
  return value
    .replace(/&#x26;/gi, '&amp;')
    .replace(/&#x3c;/gi, '&lt;')
    .replace(/&#x3e;/gi, '&gt;');
}
