/**
 * Consistent REST JSON Response Builder
 */

function formatSuccess({ books, book, total, page, limit, authors, genres, meta, ...rest }) {
  const response = {
    success: true,
    source: 'BDeBooks'
  };

  if (typeof total !== 'undefined') {
    response.total = total;
  }

  if (typeof page !== 'undefined') response.page = Number(page);
  if (typeof limit !== 'undefined') response.limit = Number(limit);

  if (books) response.books = books;
  if (book) response.book = book;
  if (authors) response.authors = authors;
  if (genres) response.genres = genres;

  if (meta) response.meta = meta;

  Object.assign(response, rest);
  return response;
}

function formatError(message, statusCode = 500, details = null) {
  return {
    success: false,
    source: 'BDeBooks',
    error: {
      message: message || 'An unexpected error occurred',
      statusCode,
      details: details || null
    }
  };
}

module.exports = {
  formatSuccess,
  formatError
};
