/**
 * Utility functions for text cleaning, normalization, and deduplication
 */

/**
 * Strips zero-width characters, excessive whitespace, and HTML residue
 */
function cleanText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width chars
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#8211;/gi, '–')
    .replace(/&#8217;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts and cleans book slug from any BDeBooks URL
 */
function extractSlug(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    // Typical path: /bn/books/slug-name/ or /books/slug-name/ or /slug-name/
    return pathParts[pathParts.length - 1] || '';
  } catch (e) {
    const cleaned = url.replace(/\/+$/, '').split('/');
    return cleaned[cleaned.length - 1] || '';
  }
}

/**
 * Normalizes relative or protocol-relative image URLs
 */
function normalizeUrl(url, fallbackBase = 'https://bdebooks.com') {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('/')) return `${fallbackBase}${trimmed}`;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `${fallbackBase}/${trimmed}`;
  }
  return trimmed;
}

/**
 * Removes duplicate books based on slug or URL
 */
function deduplicateBooks(books) {
  if (!Array.isArray(books)) return [];
  const seen = new Set();
  return books.filter((book) => {
    const key = (book.slug || book.url || book.title || '').toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = {
  cleanText,
  extractSlug,
  normalizeUrl,
  deduplicateBooks
};
