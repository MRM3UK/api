/**
 * Resilient HTTP Client for BDeBooks
 */

const axios = require('axios');
const { DEFAULT_USER_AGENT, REQUEST_TIMEOUT, BASE_URL } = require('../config/constants');

const client = axios.create({
  timeout: REQUEST_TIMEOUT,
  headers: {
    'User-Agent': DEFAULT_USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Referer': BASE_URL
  },
  maxRedirects: 5
});

/**
 * Fetch HTML content with fallback and retry
 */
async function fetchHtml(url) {
  try {
    const response = await client.get(url);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      const notFoundError = new Error(`Resource not found at ${url}`);
      notFoundError.status = 404;
      throw notFoundError;
    }
    const fetchError = new Error(`Failed to fetch upstream content: ${error.message}`);
    fetchError.status = error.response ? error.response.status : 502;
    throw fetchError;
  }
}

/**
 * Quick ping to check upstream availability and latency
 */
async function checkUpstreamHealth() {
  const start = Date.now();
  try {
    const response = await client.get(BASE_URL, {
      timeout: 5000,
      headers: { 'User-Agent': DEFAULT_USER_AGENT }
    });
    return {
      reachable: response.status >= 200 && response.status < 400,
      statusCode: response.status,
      responseTimeMs: Date.now() - start
    };
  } catch (error) {
    return {
      reachable: false,
      statusCode: error.response ? error.response.status : null,
      errorMessage: error.message,
      responseTimeMs: Date.now() - start
    };
  }
}

module.exports = {
  fetchHtml,
  checkUpstreamHealth
};
