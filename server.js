/**
 * Local Development Server
 */

const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 BDeBooks Direct API running on port ${PORT}`);
  console.log(`📡 Local URL: http://localhost:${PORT}`);
  console.log(`🩺 Health:    http://localhost:${PORT}/api/health`);
  console.log(`📚 Books:     http://localhost:${PORT}/api/books`);
  console.log(`⚡ Latest:    http://localhost:${PORT}/api/books/latest`);
  console.log(`🔍 Search:    http://localhost:${PORT}/api/search?q=হিমু`);
  console.log(`===============================================`);
});
