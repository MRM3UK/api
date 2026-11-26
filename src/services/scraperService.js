/**
 * High-Precision Scraper for BDeBooks
 */

const cheerio = require('cheerio');
const { fetchHtml } = require('./httpClient');
const {
  BASE_URL,
  BN_BASE_URL,
  RSS_FEED_URL,
  RSS_FEED_GLOBAL_URL
} = require('../config/constants');
const {
  cleanText,
  extractSlug,
  normalizeUrl,
  deduplicateBooks
} = require('../utils/cleanText');

class ScraperService {
  /**
   * Helper to parse book cards from Cheerio instance
   */
  parseCardsFromCheerio($) {
    const books = [];

    // Candidate selectors matching WordPress post layouts on BDeBooks
    const cardSelectors = [
      'article.type-books',
      'article.type-post',
      'article.post',
      '.book-card',
      '.post-item',
      '.book-item',
      '.entry-card',
      '.site-main article',
      'div.post'
    ];

    let cards = $(cardSelectors.join(', '));

    // Fallback: If no dedicated article cards matched, search for post title links
    if (!cards || cards.length === 0) {
      cards = $('.entry-title, .book-title, h2.title, h3.title')
        .map((_, el) => $(el).closest('article, div'))
        .get();
    }

    cards.each((_, el) => {
      const card = $(el);

      // Extract Title & Link
      const titleLink = card
        .find('.entry-title a, .book-title a, h2 a, h3 a, a[rel="bookmark"]')
        .first();
      const rawTitle = titleLink.text() || card.find('h2, h3, .entry-title').first().text();
      const fullTitle = cleanText(rawTitle);

      let bookUrl = titleLink.attr('href') || card.find('a').first().attr('href') || '';
      bookUrl = normalizeUrl(bookUrl);

      if (!fullTitle || !bookUrl) return;

      const slug = extractSlug(bookUrl);

      // Extract Cover Image
      const img = card.find('img.wp-post-image, .post-thumbnail img, img').first();
      const rawCover =
        img.attr('data-src') ||
        img.attr('data-lazy-src') ||
        img.attr('data-orig-file') ||
        img.attr('src') ||
        '';
      const cover = normalizeUrl(rawCover);

      // Extract Author
      let author = cleanText(
        card.find('.author a, .meta-author, span.author, .book-author').first().text()
      );

      // If author is not in meta tags, parse it from standard Bengali title patterns: "বইয়ের নাম – লেখক"
      let parsedTitle = fullTitle;
      if (!author && (fullTitle.includes('–') || fullTitle.includes('-'))) {
        const parts = fullTitle.split(/[–-]/).map((p) => cleanText(p));
        if (parts.length >= 2) {
          parsedTitle = parts[0];
          author = parts[1];
        }
      }

      // Extract Description / Summary
      const description = cleanText(
        card.find('.entry-summary, .post-excerpt, p').first().text()
      );

      // Extract Genres / Categories
      const genre = [];
      card
        .find('.cat-links a, .entry-category a, a[rel="category tag"]')
        .each((_, cat) => {
          const catText = cleanText($(cat).text());
          if (catText && !genre.includes(catText)) {
            genre.push(catText);
          }
        });

      books.push({
        title: parsedTitle || fullTitle,
        slug,
        author: author || 'অজ্ঞাত (Unknown)',
        cover,
        description,
        genre: genre.length > 0 ? genre : ['সাধারণ (General)'],
        language: 'বাংলা (Bengali)',
        url: bookUrl
      });
    });

    return deduplicateBooks(books);
  }

  /**
   * Fallback parser using WordPress RSS feeds
   */
  async parseRssFeed(feedUrl) {
    try {
      const xmlData = await fetchHtml(feedUrl);
      const $ = cheerio.load(xmlData, { xmlMode: true });
      const books = [];

      $('item').each((_, item) => {
        const $item = $(item);
        const fullTitle = cleanText($item.find('title').text());
        const link = normalizeUrl($item.find('link').text());
        const creator = cleanText($item.find('dc\\:creator, creator').text());
        const rawDesc = $item.find('description').text();
        const $desc = cheerio.load(rawDesc || '');
        const description = cleanText($desc.text());

        let author = creator;
        let title = fullTitle;
        if (!author && (fullTitle.includes('–') || fullTitle.includes('-'))) {
          const parts = fullTitle.split(/[–-]/).map((p) => cleanText(p));
          if (parts.length >= 2) {
            title = parts[0];
            author = parts[1];
          }
        }

        // Cover from RSS CDATA or enclosure
        let cover =
          $item.find('enclosure[type*="image"]').attr('url') ||
          $desc('img').first().attr('src') ||
          '';

        const genres = [];
        $item.find('category').each((_, cat) => {
          const c = cleanText($(cat).text());
          if (c && !genres.includes(c)) genres.push(c);
        });

        books.push({
          title,
          slug: extractSlug(link),
          author: author || 'অজ্ঞাত (Unknown)',
          cover: normalizeUrl(cover),
          description,
          genre: genres.length > 0 ? genres : ['সাধারণ (General)'],
          language: 'বাংলা (Bengali)',
          url: link
        });
      });

      return deduplicateBooks(books);
    } catch (e) {
      return [];
    }
  }

  /**
   * Fetch book listings with pagination and filtering
   */
  async getBooksListing({ page = 1, limit = 10, category = null, author = null, sort = 'latest' } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    let targetUrl;

    if (category) {
      targetUrl =
        pageNum === 1
          ? `${BN_BASE_URL}/category/${encodeURIComponent(category)}/`
          : `${BN_BASE_URL}/category/${encodeURIComponent(category)}/page/${pageNum}/`;
    } else if (author) {
      targetUrl =
        pageNum === 1
          ? `${BN_BASE_URL}/author/${encodeURIComponent(author)}/`
          : `${BN_BASE_URL}/author/${encodeURIComponent(author)}/page/${pageNum}/`;
    } else {
      targetUrl = pageNum === 1 ? `${BN_BASE_URL}/` : `${BN_BASE_URL}/page/${pageNum}/`;
    }

    let books = [];
    try {
      const html = await fetchHtml(targetUrl);
      const $ = cheerio.load(html);
      books = this.parseCardsFromCheerio($);
    } catch (error) {
      // If HTML pagination fails or returns 404, fallback to RSS on first page
      if (pageNum === 1 && !category && !author) {
        books = await this.parseRssFeed(RSS_FEED_URL);
        if (books.length === 0) {
          books = await this.parseRssFeed(RSS_FEED_GLOBAL_URL);
        }
      } else {
        throw error;
      }
    }

    // Apply sorting
    if (sort === 'title_asc') {
      books.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'title_desc') {
      books.sort((a, b) => b.title.localeCompare(a.title));
    } else if (sort === 'oldest') {
      books.reverse();
    }

    const maxLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const paginatedBooks = books.slice(0, maxLimit);

    return {
      total: books.length,
      page: pageNum,
      limit: maxLimit,
      books: paginatedBooks
    };
  }

  /**
   * Fetch latest books from source
   */
  async getLatestBooks(limit = 10) {
    const result = await this.getBooksListing({ page: 1, limit });
    return result.books;
  }

  /**
   * Fetch full book details by slug
   */
  async getBookDetails(slug) {
    if (!slug) {
      throw new Error('A valid book slug is required');
    }

    const cleanSlug = cleanText(slug).toLowerCase().replace(/^\/+|\/+$/g, '');

    // Potential URL candidates on BDeBooks
    const candidates = [
      `${BN_BASE_URL}/books/${cleanSlug}/`,
      `${BASE_URL}/books/${cleanSlug}/`,
      `${BN_BASE_URL}/${cleanSlug}/`,
      `${BASE_URL}/${cleanSlug}/`
    ];

    let html = null;
    let finalUrl = candidates[0];

    for (const url of candidates) {
      try {
        html = await fetchHtml(url);
        finalUrl = url;
        break;
      } catch (err) {
        // Try next candidate URL
      }
    }

    if (!html) {
      const error = new Error(`Book not found with slug: ${cleanSlug}`);
      error.status = 404;
      throw error;
    }

    const $ = cheerio.load(html);

    // 1. Title
    const rawTitle =
      $('h1.entry-title, h1.book-title, .entry-header h1, h1').first().text() ||
      cleanSlug;
    const fullTitle = cleanText(rawTitle);

    // 2. Cover image (checking OpenGraph tags, then DOM image elements)
    let cover =
      $('meta[property="og:image"]').attr('content') ||
      $('.book-cover img, .wp-post-image, .entry-content img').first().attr('src') ||
      '';
    cover = normalizeUrl(cover);

    // 3. Extract Metadata table & details (Publisher, Pages, Size, Language, etc.)
    const publicationDetails = {
      publisher: '',
      pages: '',
      fileSize: '',
      format: 'PDF',
      isbn: ''
    };

    let author = '';
    const genre = [];

    // Parse taxonomy badges
    $('.cat-links a, .entry-category a, a[rel="category tag"]').each((_, el) => {
      const g = cleanText($(el).text());
      if (g && !genre.includes(g)) genre.push(g);
    });

    // Check author tag
    author = cleanText(
      $('.author-name a, .entry-meta .author a, span.author a, .book-author').first().text()
    );

    // Examine every text paragraph and list item for Bangla key-value metadata
    $('.entry-content p, .entry-content li, .entry-content tr, .book-info tr').each(
      (_, el) => {
        const text = cleanText($(el).text());

        // Author matching
        if (!author && /লেখক[:\s]+(.+)/i.test(text)) {
          const match = text.match(/লেখক[:\s]+([^,\n\r]+)/i);
          if (match && match[1]) author = cleanText(match[1]);
        }

        // Publisher matching
        if (/প্রকাশক|প্রকাশনী[:\s]+(.+)/i.test(text)) {
          const match = text.match(/(?:প্রকাশক|প্রকাশনী)[:\s]+([^,\n\r]+)/i);
          if (match && match[1]) publicationDetails.publisher = cleanText(match[1]);
        }

        // Pages matching
        if (/পৃষ্ঠা|পাতা[:\s]+(.+)/i.test(text)) {
          const match = text.match(/(?:পৃষ্ঠা|পাতা)(?:\s*সংখ্যা)?[:\s]+([^,\n\r]+)/i);
          if (match && match[1]) publicationDetails.pages = cleanText(match[1]);
        }

        // Size matching
        if (/সাইজ|আকার[:\s]+(.+)/i.test(text)) {
          const match = text.match(/(?:সাইজ|আকার|ফাইল সাইজ)[:\s]+([^,\n\r]+)/i);
          if (match && match[1]) publicationDetails.fileSize = cleanText(match[1]);
        }

        // Category/Genre matching
        if (/ক্যাটাগরি|বিষয়|বিভাগ[:\s]+(.+)/i.test(text)) {
          const match = text.match(/(?:ক্যাটাগরি|বিষয়|বিভাগ)[:\s]+([^,\n\r]+)/i);
          if (match && match[1]) {
            const parsedCat = cleanText(match[1]);
            if (parsedCat && !genre.includes(parsedCat)) genre.push(parsedCat);
          }
        }
      }
    );

    // If author is still empty, attempt title splitting
    let bookTitle = fullTitle;
    if (!author && (fullTitle.includes('–') || fullTitle.includes('-'))) {
      const parts = fullTitle.split(/[–-]/).map((p) => cleanText(p));
      if (parts.length >= 2) {
        bookTitle = parts[0];
        author = parts[1];
      }
    }

    // 4. Clean Description extraction
    const descParagraphs = [];
    $('.entry-content p').each((_, p) => {
      const pText = cleanText($(p).text());
      // Skip paragraphs that contain meta indicators or download buttons
      if (
        !pText ||
        pText.includes('বইয়ের নামঃ') ||
        pText.includes('লেখকঃ') ||
        pText.includes('পৃষ্ঠা সংখ্যাঃ') ||
        pText.includes('ডাউনলোড লিংক') ||
        pText.includes('Download PDF')
      ) {
        return;
      }
      descParagraphs.push(pText);
    });

    const description =
      descParagraphs.length > 0
        ? descParagraphs.slice(0, 4).join('\n\n')
        : cleanText($('meta[name="description"]').attr('content') || '');

    // 5. Download links extraction
    const downloadLinks = [];
    $('a[href]').each((_, a) => {
      const href = $(a).attr('href') || '';
      const anchorText = cleanText($(a).text());

      const isDownload =
        href.endsWith('.pdf') ||
        href.includes('drive.google.com') ||
        href.includes('mediafire.com') ||
        anchorText.toLowerCase().includes('download') ||
        anchorText.includes('ডাউনলোড');

      if (isDownload && !href.startsWith('#') && !href.includes('javascript:')) {
        let provider = 'BDeBooks Direct';
        if (href.includes('drive.google.com')) provider = 'Google Drive';
        else if (href.includes('mediafire.com')) provider = 'MediaFire';

        downloadLinks.push({
          title: anchorText || 'PDF Download',
          provider,
          url: href
        });
      }
    });

    return {
      title: bookTitle || fullTitle,
      slug: cleanSlug,
      author: author || 'অজ্ঞাত (Unknown)',
      cover,
      description: description || 'কোনো বিবরণ পাওয়া যায়নি (No description available)',
      genre: genre.length > 0 ? genre : ['সাধারণ (General)'],
      language: 'বাংলা (Bengali)',
      publicationDetails,
      downloadLinks,
      url: finalUrl
    };
  }

  /**
   * Search books dynamically on BDeBooks
   */
  async searchBooks(keyword, page = 1) {
    if (!keyword || typeof keyword !== 'string') {
      return { total: 0, page: 1, books: [] };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const searchUrl =
      pageNum === 1
        ? `${BN_BASE_URL}/?s=${encodeURIComponent(keyword)}`
        : `${BN_BASE_URL}/page/${pageNum}/?s=${encodeURIComponent(keyword)}`;

    const html = await fetchHtml(searchUrl);
    const $ = cheerio.load(html);
    const books = this.parseCardsFromCheerio($);

    return {
      total: books.length,
      page: pageNum,
      books
    };
  }

  /**
   * Scrape authors from BDeBooks
   */
  async getAuthors() {
    // Attempt dedicated authors archive
    const targetUrl = `${BN_BASE_URL}/authors/`;
    let authors = [];

    try {
      const html = await fetchHtml(targetUrl);
      const $ = cheerio.load(html);

      $('a[href*="/author/"], a[href*="/writer/"], .author-list a').each((_, el) => {
        const name = cleanText($(el).text());
        const href = $(el).attr('href');
        if (name && href && !authors.some((a) => a.name === name)) {
          authors.push({
            name,
            slug: extractSlug(href),
            url: normalizeUrl(href)
          });
        }
      });
    } catch (e) {
      // Fallback: Extract active authors from home feed
      const booksResult = await this.getBooksListing({ page: 1, limit: 30 });
      const uniqueAuthors = new Map();

      for (const book of booksResult.books) {
        if (book.author && book.author !== 'অজ্ঞাত (Unknown)') {
          uniqueAuthors.set(book.author, {
            name: book.author,
            slug: encodeURIComponent(book.author.toLowerCase().replace(/\s+/g, '-')),
            url: `${BN_BASE_URL}/?s=${encodeURIComponent(book.author)}`
          });
        }
      }

      authors = Array.from(uniqueAuthors.values());
    }

    return authors;
  }

  /**
   * Scrape genres and categories from BDeBooks
   */
  async getGenres() {
    const targetUrl = `${BN_BASE_URL}/`;
    const html = await fetchHtml(targetUrl);
    const $ = cheerio.load(html);
    const genres = [];

    $('a[href*="/category/"]').each((_, el) => {
      const name = cleanText($(el).text());
      const href = $(el).attr('href');

      if (
        name &&
        href &&
        !name.includes('...') &&
        !genres.some((g) => g.name === name)
      ) {
        genres.push({
          name,
          slug: extractSlug(href),
          url: normalizeUrl(href)
        });
      }
    });

    return genres;
  }
}

module.exports = new ScraperService();
