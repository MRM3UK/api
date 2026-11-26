/**
 * Book API Controllers
 */

const scraperService = require('../services/scraperService');
const cacheService = require('../services/cacheService');
const { checkUpstreamHealth } = require('../services/httpClient');
const { CACHE_TTL, CDN_CACHE } = require('../config/constants');
const { formatSuccess, formatError } = require('../utils/responseFormatter');

/**
 * GET /api/books
 * Supports ?page=1&limit=10&category=slug&author=slug&sort=latest
 */
async function getBooks(req, res) {
  try {
    const { page = 1, limit = 10, category, author, sort = 'latest' } = req.query;
    const cacheKey = `books:${page}:${limit}:${category || ''}:${author || ''}:${sort}`;

    const cached = cacheService.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', CDN_CACHE.LIST);
      return res.json(cached);
    }

    const data = await scraperService.getBooksListing({
      page,
      limit,
      category,
      author,
      sort
    });

    const response = formatSuccess({
      total: data.total,
      page: data.page,
      limit: data.limit,
      books: data.books
    });

    cacheService.set(cacheKey, response, CACHE_TTL.BOOKS_LIST);
    res.set('X-Cache', 'MISS');
    res.set('Cache-Control', CDN_CACHE.LIST);
    return res.json(response);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json(formatError(error.message, status));
  }
}

/**
 * GET /api/books/latest
 */
async function getLatestBooks(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const cacheKey = `latest:${limit}`;

    const cached = cacheService.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', CDN_CACHE.LIST);
      return res.json(cached);
    }

    const books = await scraperService.getLatestBooks(limit);
    const response = formatSuccess({
      total: books.length,
      limit,
      books
    });

    cacheService.set(cacheKey, response, CACHE_TTL.LATEST_BOOKS);
    res.set('X-Cache', 'MISS');
    res.set('Cache-Control', CDN_CACHE.LIST);
    return res.json(response);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json(formatError(error.message, status));
  }
}

/**
 * GET /api/books/:slug
 */
async function getBookBySlug(req, res) {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).json(formatError('Slug parameter is required', 400));
    }

    const cacheKey = `book:${slug.toLowerCase()}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', CDN_CACHE.DETAIL);
      return res.json(cached);
    }

    const book = await scraperService.getBookDetails(slug);
    const response = formatSuccess({ book });

    cacheService.set(cacheKey, response, CACHE_TTL.BOOK_DETAIL);
    res.set('X-Cache', 'MISS');
    res.set('Cache-Control', CDN_CACHE.DETAIL);
    return res.json(response);
  } catch (error) {
    const status = error.status || (error.message.includes('not found') ? 404 : 500);
    return res.status(status).json(formatError(error.message, status));
  }
}

/**
 * GET /api/search?q=keyword&page=1
 */
async function searchBooks(req, res) {
  try {
    const { q, page = 1 } = req.query;
    if (!q || !q.trim()) {
      return res
        .status(400)
        .json(formatError('Search query parameter "q" is required', 400));
    }

    const cacheKey = `search:${q.trim().toLowerCase()}:${page}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', CDN_CACHE.LIST);
      return res.json(cached);
    }

    const data = await scraperService.searchBooks(q.trim(), page);
    const response = formatSuccess({
      query: q.trim(),
      total: data.total,
      page: data.page,
      books: data.books
    });

    cacheService.set(cacheKey, response, CACHE_TTL.SEARCH);
    res.set('X-Cache', 'MISS');
    res.set('Cache-Control', CDN_CACHE.LIST);
    return res.json(response);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json(formatError(error.message, status));
  }
}

/**
 * GET /api/authors
 */
async function getAuthors(req, res) {
  try {
    const cacheKey = 'tax:authors';
    const cached = cacheService.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', CDN_CACHE.STATIC);
      return res.json(cached);
    }

    const authors = await scraperService.getAuthors();
    const response = formatSuccess({
      total: authors.length,
      authors
    });

    cacheService.set(cacheKey, response, CACHE_TTL.AUTHORS);
    res.set('X-Cache', 'MISS');
    res.set('Cache-Control', CDN_CACHE.STATIC);
    return res.json(response);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json(formatError(error.message, status));
  }
}

/**
 * GET /api/genres
 */
async function getGenres(req, res) {
  try {
    const cacheKey = 'tax:genres';
    const cached = cacheService.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', CDN_CACHE.STATIC);
      return res.json(cached);
    }

    const genres = await scraperService.getGenres();
    const response = formatSuccess({
      total: genres.length,
      genres
    });

    cacheService.set(cacheKey, response, CACHE_TTL.GENRES);
    res.set('X-Cache', 'MISS');
    res.set('Cache-Control', CDN_CACHE.STATIC);
    return res.json(response);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json(formatError(error.message, status));
  }
}

/**
 * GET /api/health
 */
async function getHealth(req, res) {
  const upstream = await checkUpstreamHealth();
  const cacheStats = cacheService.getStats();

  const isHealthy = upstream.reachable;
  const status = isHealthy ? 200 : 503;

  return res.status(status).json({
    success: isHealthy,
    source: 'BDeBooks',
    status: isHealthy ? 'operational' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    upstream: {
      target: 'https://bdebooks.com/bn/',
      ...upstream
    },
    cache: cacheStats
  });
}

module.exports = {
  getBooks,
  getLatestBooks,
  getBookBySlug,
  searchBooks,
  getAuthors,
  getGenres,
  getHealth
};
