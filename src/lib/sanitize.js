/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org
 *
 * sanitize.js — Lightweight, dependency-free HTML sanitiser.
 * Protects against XSS when rendering CMS/news content via dangerouslySetInnerHTML.
 *
 * Strategy: parse into a detached DOM, walk the tree, strip anything not on the
 * allow-list (tags, attributes, URL schemes), then return safe innerHTML.
 * Zero external dependencies — no supply-chain risk, no bundle bloat.
 */

// Tags safe for rich article content
const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'mark', 'small', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'span', 'div', 'hr',
]);

// Attributes allowed per element (global + specific)
const ALLOWED_ATTR = new Set([
  'href', 'src', 'alt', 'title', 'target', 'rel',
  'class', 'colspan', 'rowspan', 'width', 'height', 'loading',
]);

// Only these URL schemes are permitted in href/src
const SAFE_URL = /^(https?:|mailto:|tel:|\/|#|data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,)/i;

const isSafeUrl = (val) => {
  if (!val) return false;
  const trimmed = val.trim();
  // Block javascript:, vbscript:, and other dangerous schemes
  if (/^(javascript|vbscript|data:text\/html|file):/i.test(trimmed)) return false;
  return SAFE_URL.test(trimmed);
};

/**
 * Sanitise an HTML string and return a safe HTML string.
 * @param {string} dirty - untrusted HTML
 * @returns {string} sanitised HTML safe for dangerouslySetInnerHTML
 */
export function sanitizeHtml(dirty) {
  if (!dirty || typeof dirty !== 'string') return '';

  // Use a detached <template> so nothing executes during parsing
  const template = document.createElement('template');
  template.innerHTML = dirty;

  const walk = (node) => {
    // Iterate over a static copy because we mutate during traversal
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase();

        // Remove disallowed elements entirely (script, style, iframe, etc.)
        if (!ALLOWED_TAGS.has(tag)) {
          child.remove();
          continue;
        }

        // Strip disallowed / dangerous attributes
        for (const attr of Array.from(child.attributes)) {
          const name = attr.name.toLowerCase();
          const value = attr.value;

          // Drop all event handlers (onclick, onerror, onload, …) and styles
          if (name.startsWith('on') || name === 'style' || !ALLOWED_ATTR.has(name)) {
            child.removeAttribute(attr.name);
            continue;
          }
          // Validate URL attributes
          if ((name === 'href' || name === 'src') && !isSafeUrl(value)) {
            child.removeAttribute(attr.name);
          }
        }

        // Force external links to be safe
        if (tag === 'a' && child.getAttribute('target') === '_blank') {
          child.setAttribute('rel', 'noopener noreferrer nofollow');
        }

        // Recurse
        walk(child);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
      }
    }
  };

  walk(template.content);
  return template.innerHTML;
}

/**
 * React helper — returns the prop object for dangerouslySetInnerHTML
 * already sanitised.
 * Usage: <div {...safeHtml(article.content)} />
 */
export const safeHtml = (dirty) => ({
  dangerouslySetInnerHTML: { __html: sanitizeHtml(dirty) },
});

export default sanitizeHtml;
