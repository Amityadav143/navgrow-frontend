import { describe, it, expect, vi } from 'vitest';

// jsdom provides document; sanitizeHtml walks a <template>. Import after env ready.
import { markdownToHtml, renderArticleHtml } from '@/lib/richText';

describe('markdownToHtml', () => {
  it('renders ATX headings, not literal ## text', () => {
    const out = markdownToHtml('## Choose Plants');
    expect(out).toContain('<h2>Choose Plants</h2>');
    expect(out).not.toContain('##');
  });

  it('renders unordered lists from * and - bullets', () => {
    const out = markdownToHtml('* Tomatoes\n* Chillies\n- Okra');
    expect(out).toMatch(/<ul>[\s\S]*<li>Tomatoes<\/li>[\s\S]*<li>Chillies<\/li>[\s\S]*<li>Okra<\/li>[\s\S]*<\/ul>/);
    expect(out).not.toContain('* Tomatoes');
  });

  it('renders ordered lists', () => {
    const out = markdownToHtml('1. First\n2. Second');
    expect(out).toMatch(/<ol>[\s\S]*<li>First<\/li>[\s\S]*<li>Second<\/li>[\s\S]*<\/ol>/);
  });

  it('renders bold and italic inline', () => {
    expect(markdownToHtml('This is **bold** text')).toContain('<strong>bold</strong>');
    expect(markdownToHtml('This is _italic_ text')).toContain('<em>italic</em>');
  });

  it('un-jams headings and bullets pasted onto one line', () => {
    // Mirrors the screenshot: heading and bullets run together in one blob.
    const blob = 'Observe: * Daily sunlight * Wind conditions ## 2. Choose Plants Select plants';
    const out = markdownToHtml(blob);
    expect(out).toContain('<li>Daily sunlight</li>');
    expect(out).toContain('<h2>');
  });

  it('wraps plain lines in paragraphs', () => {
    expect(markdownToHtml('Just a sentence.')).toBe('<p>Just a sentence.</p>');
  });
});

describe('renderArticleHtml', () => {
  it('leaves existing HTML content untouched (but sanitised)', () => {
    const html = '<p>Already <strong>HTML</strong> content.</p>';
    const out = renderArticleHtml(html);
    expect(out).toContain('<strong>HTML</strong>');
    // Not double-wrapped in another <p>
    expect(out).not.toContain('&lt;p&gt;');
  });

  it('converts markdown content to HTML', () => {
    const out = renderArticleHtml('## Title\n\n* one\n* two');
    expect(out).toContain('<h2>Title</h2>');
    expect(out).toContain('<li>one</li>');
  });

  it('strips dangerous markup via the sanitiser', () => {
    const out = renderArticleHtml('<p>ok</p><script>alert(1)</script>');
    expect(out).not.toContain('<script>');
    expect(out).toContain('<p>ok</p>');
  });

  it('handles empty/nullish input', () => {
    expect(renderArticleHtml('')).toBe('');
    expect(renderArticleHtml(null)).toBe('');
    expect(renderArticleHtml(undefined)).toBe('');
  });
});
