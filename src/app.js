/**
 * Express Application Setup
 */

const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/apiRoutes');
const { formatError } = require('./utils/responseFormatter');

const app = express();

// Middlewares
app.use(cors({ origin: '*', methods: ['GET', 'OPTIONS'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Standard Security & Content Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Interactive API Documentation on root URL
app.get(['/', '/api'], (req, res) => {
  res.json({
    name: 'BDeBooks Direct API',
    description: 'Real-time REST API for live BDeBooks metadata',
    version: '1.0.0',
    source: 'https://bdebooks.com/bn/',
    endpoints: {
      health: {
        method: 'GET',
        path: '/api/health',
        description: 'Check API and BDeBooks connectivity status'
      },
      books: {
        method: 'GET',
        path: '/api/books',
        params: ['page', 'limit', 'category', 'author', 'sort'],
        description: 'Fetch book listings with pagination and sorting'
      },
      latest: {
        method: 'GET',
        path: '/api/books/latest',
        params: ['limit'],
        description: 'Fetch the most recently published books'
      },
      detail: {
        method: 'GET',
        path: '/api/books/:slug',
        description: 'Fetch complete book details, download links, and metadata'
      },
      search: {
        method: 'GET',
        path: '/api/search?q=:keyword',
        params: ['q', 'page'],
        description: 'Search books by Bengali or English keywords'
      },
      authors: {
        method: 'GET',
        path: '/api/authors',
        description: 'Fetch list of authors'
      },
      genres: {
        method: 'GET',
        path: '/api/genres',
        description: 'Fetch categories and genres'
      }
    }
  });
});

// Mount API routes under /api
app.use('/api', apiRoutes);

// 404 Handler
app.use((req, res) => {
  res
    .status(404)
    .json(formatError(`Endpoint not found: ${req.method} ${req.originalUrl}`, 404));
});

// Central Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  return res
    .status(statusCode)
    .json(formatError(err.message || 'Internal Server Error', statusCode));
});

module.exports = app;
