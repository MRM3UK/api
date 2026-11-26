/**
 * Application Constants and Configuration
 */

module.exports = {
  // Target BDeBooks URLs
  BASE_URL: 'https://bdebooks.com',
  BN_BASE_URL: 'https://bdebooks.com/bn',
  RSS_FEED_URL: 'https://bdebooks.com/bn/feed/',
  RSS_FEED_GLOBAL_URL: 'https://bdebooks.com/feed/',
  WP_JSON_API_URL: 'https://bdebooks.com/wp-json/wp/v2',

  // Network and client settings
  REQUEST_TIMEOUT: 12000, // 12 seconds
  DEFAULT_USER_AGENT:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',

  // Server-side In-Memory Cache TTL (in seconds)
  CACHE_TTL: {
    BOOKS_LIST: 300,       // 5 minutes
    LATEST_BOOKS: 180,     // 3 minutes
    BOOK_DETAIL: 1800,     // 30 minutes
    SEARCH: 300,           // 5 minutes
    AUTHORS: 3600,         // 1 hour
    GENRES: 3600,          // 1 hour
    HEALTH: 60             // 1 minute
  },

  // CDN HTTP Cache Control Headers
  CDN_CACHE: {
    LIST: 'public, s-maxage=300, stale-while-revalidate=600',
    DETAIL: 'public, s-maxage=1800, stale-while-revalidate=3600',
    STATIC: 'public, s-maxage=3600, stale-while-revalidate=7200'
  }
};
