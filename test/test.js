/**
 * Automated Verification Script
 * Runs against live BDeBooks data
 */

const scraperService = require('../src/services/scraperService');
const { checkUpstreamHealth } = require('../src/services/httpClient');

async function runTestSuite() {
  console.log('--- STARTING BDEBOOKS DIRECT API VERIFICATION ---\n');

  try {
    // 1. Health check
    console.log('1. Testing BDeBooks Upstream Reachability...');
    const health = await checkUpstreamHealth();
    console.log(`   Upstream status: ${health.reachable ? 'REACHABLE' : 'UNREACHABLE'}`);
    console.log(`   Response time:   ${health.responseTimeMs}ms\n`);

    if (!health.reachable) {
      console.warn('⚠️ Warning: Upstream website is currently experiencing high latency or restrictions.');
    }

    // 2. Latest books
    console.log('2. Testing /api/books/latest ...');
    const latest = await scraperService.getLatestBooks(3);
    console.log(`   Retrieved: ${latest.length} books`);
    if (latest.length > 0) {
      console.log(`   Sample Book: "${latest[0].title}" by "${latest[0].author}"`);
      console.log(`   URL: ${latest[0].url}`);
      console.log(`   Cover: ${latest[0].cover ? 'Valid Image URL' : 'None'}\n`);
    }

    // 3. Listings with Pagination
    console.log('3. Testing /api/books (Page 1) ...');
    const listings = await scraperService.getBooksListing({ page: 1, limit: 5 });
    console.log(`   Total page items: ${listings.books.length}`);
    console.log(`   Current page:     ${listings.page}\n`);

    // 4. Book detail retrieval
    if (listings.books.length > 0) {
      const sampleSlug = listings.books[0].slug;
      console.log(`4. Testing /api/books/:slug for "${sampleSlug}" ...`);
      const details = await scraperService.getBookDetails(sampleSlug);
      console.log(`   Title:         ${details.title}`);
      console.log(`   Author:        ${details.author}`);
      console.log(`   Language:      ${details.language}`);
      console.log(`   Genres:        ${details.genre.join(', ')}`);
      console.log(`   Publisher:     ${details.publicationDetails.publisher || 'N/A'}`);
      console.log(`   Pages:         ${details.publicationDetails.pages || 'N/A'}`);
      console.log(`   Download Links:${details.downloadLinks.length} found\n`);
    }

    // 5. Search books
    console.log('5. Testing /api/search?q=হিমু ...');
    const searchResult = await scraperService.searchBooks('হিমু', 1);
    console.log(`   Found: ${searchResult.books.length} matching results\n`);

    // 6. Genres & Authors
    console.log('6. Testing Taxonomies (/api/genres & /api/authors) ...');
    const genres = await scraperService.getGenres();
    const authors = await scraperService.getAuthors();
    console.log(`   Genres discovered:  ${genres.length}`);
    console.log(`   Authors discovered: ${authors.length}\n`);

    console.log('--- ALL TESTS COMPLETED SUCCESSFULLY ---');
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

runTestSuite();
