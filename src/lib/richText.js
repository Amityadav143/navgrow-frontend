/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * richText.js — turns article/news body content into safe HTML for display.
 *
 * WHY: admin-authored articles are written in **Markdown** (`## Heading`,
 * `* bullet`, `**bold**`), but the news page rendered the raw string as HTML.
 * Markdown syntax then showed up as literal text — "## 2. Choose Plants",
 * "* Daily sunlight" — which is the broken formatting in the report. Seeded
 * demo articles, by contrast, are already HTML. So this module:
 *   1. detects whether the content is already HTML, and if so leaves it alone;
 *   2. otherwise converts a practical subset of Markdown to HTML;
 *   3. always finishes by running the result through the existing sanitiser.
 *
 * Deliberately dependency-free (no marked/remark) to avoid bundle bloat and
 * supply-chain risk, matching the approach already taken in sanitize.js.
 */
import { sanitizeHtml } from './sanitize';

// Heuristic: does this string already contain block-level HTML? If an author (or
// the seed data) wrote real tags, we must not Markdown-process it.
function looksLikeHtml(s) {
  return /<(p|div|h[1-6]|ul|ol|li|table|blockquote|br|img|strong|em|span|a|figure)\b[^>]*>/i.test(s);
}

const escapeHtml = (s) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

// Inline: bold, italic, inline code, links. Applied to already-escaped text.
function inline(text) {
  return text
    // links [label](url)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`)
    // bold **text** or __text__
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '<strong>$2</strong>')
    // italic *text* or _text_
    .replace(/(^|[^*])\*(?=\S)([^*\n]+?\S)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_(?=\S)([^_\n]+?\S)_/g, '$1<em>$2</em>')
    // inline code `code`
    .replace(/`([^`\n]+)`/g, '<code>$1</code>');
}

/**
 * Convert a practical subset of Markdown to HTML: ATX headings (#..######),
 * unordered lists (-, *, •), ordered lists (1.), blockquotes (>), horizontal
 * rules (---), and paragraphs. Handles the common case in the report where
 * headings/bullets were jammed onto one line (e.g. "text ## Heading * item")
 * by splitting on inline "##" and "* " run-ons.
 */
export function markdownToHtml(src) {
  if (!src || typeof src !== 'string') return '';

  // Normalise newlines and un-jam block markers that authors sometimes paste on
  // a single line: force a break before "## ", "### " and before each "* "/"- "
  // item. Applied repeatedly so a run of "* A * B * C" all split, not just once.
  let text = src.replace(/\r\n/g, '\n');
  text = text.replace(/\s+(#{1,6}\s)/g, '\n\n$1');   // " ## H" → newline + "## H"
  // Break before an inline bullet that follows other text on the same line.
  // Runs until stable so multiple bullets on one line each get their own line.
  let prev;
  do {
    prev = text;
    text = text.replace(/(\S[^\n]*?[.!?:;,)"'\w])\s+([*•]\s)/g, '$1\n$2');
    text = text.replace(/(\S[^\n]*?[.!?:;,)"'\w])\s+(-\s)/g, '$1\n$2');
  } while (text !== prev);

  const lines = text.split('\n');
  const html = [];
  let listType = null;      // 'ul' | 'ol' | null
  let inQuote = false;
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inline(escapeHtml(paragraph.join(' ')))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => { if (listType) { html.push(`</${listType}>`); listType = null; } };
  const closeQuote = () => { if (inQuote) { html.push('</blockquote>'); inQuote = false; } };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) { flushParagraph(); closeList(); closeQuote(); continue; }

    // Horizontal rule
    if (/^(\*\*\*|---|___)$/.test(line)) { flushParagraph(); closeList(); closeQuote(); html.push('<hr/>'); continue; }

    // Heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushParagraph(); closeList(); closeQuote();
      const level = h[1].length;
      html.push(`<h${level}>${inline(escapeHtml(h[2].trim()))}</h${level}>`);
      continue;
    }

    // Blockquote
    const bq = line.match(/^>\s?(.*)$/);
    if (bq) {
      flushParagraph(); closeList();
      if (!inQuote) { html.push('<blockquote>'); inQuote = true; }
      html.push(`<p>${inline(escapeHtml(bq[1]))}</p>`);
      continue;
    } else {
      closeQuote();
    }

    // Ordered list item
    const ol = line.match(/^(\d+)[.)]\s+(.*)$/);
    // Unordered list item (-, *, •)
    const ul = line.match(/^[-*•]\s+(.*)$/);

    if (ol) {
      flushParagraph();
      if (listType !== 'ol') { closeList(); html.push('<ol>'); listType = 'ol'; }
      html.push(`<li>${inline(escapeHtml(ol[2]))}</li>`);
      continue;
    }
    if (ul) {
      flushParagraph();
      if (listType !== 'ul') { closeList(); html.push('<ul>'); listType = 'ul'; }
      html.push(`<li>${inline(escapeHtml(ul[1]))}</li>`);
      continue;
    }

    // Plain text → accumulate into a paragraph
    closeList();
    paragraph.push(line);
  }
  flushParagraph(); closeList(); closeQuote();
  return html.join('\n');
}

/**
 * Public entry point used by the news/article pages. Returns SANITISED HTML,
 * whether the source was HTML or Markdown.
 */
export function renderArticleHtml(content) {
  if (!content || typeof content !== 'string') return '';
  const html = looksLikeHtml(content) ? content : markdownToHtml(content);
  return sanitizeHtml(html);
}

/**
 * Strip Markdown/HTML to readable plain text for excerpts and meta descriptions.
 * Never returns markup, so it's safe to drop straight into a text node.
 */
export function toPlainText(content, maxLen = 200) {
  if (!content || typeof content !== 'string') return '';
  let t = content
    .replace(/<[^>]+>/g, ' ')                 // strip HTML tags
    .replace(/^#{1,6}\s+/gm, '')              // heading markers
    .replace(/(\*\*|__|[*_`>#-])/g, ' ')      // stray md punctuation
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // links → label
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length > maxLen) t = t.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
  return t;
}

export default renderArticleHtml;
