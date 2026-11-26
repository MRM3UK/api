/**
 * REST API Router
 */

const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

// Books Endpoints
router.get('/books', bookController.getBooks);
router.get('/books/latest', bookController.getLatestBooks);
router.get('/books/:slug', bookController.getBookBySlug);

// Search Endpoint
router.get('/search', bookController.searchBooks);

// Taxonomies Endpoints
router.get('/authors', bookController.getAuthors);
router.get('/genres', bookController.getGenres);

// Status / Health Endpoint
router.get('/health', bookController.getHealth);

module.exports = router;
