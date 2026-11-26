# BDeBooks Direct API

A high-performance REST API that directly retrieves live book metadata, covers, details, and download information from [BDeBooks](https://bdebooks.com/bn/) in real-time.

Built from scratch using Node.js, Express, Cheerio, and Vercel Serverless Functions.

---

## Features

- **100% Live Data**: Dynamically queries BDeBooks without static or manually curated JSON files.
- **Serverless Native**: Optimized for Vercel Serverless Functions.
- **Multi-Layer Caching**: In-memory TTL cache + Vercel Edge CDN cache headers (`s-maxage`, `stale-while-revalidate`).
- **Resilient Fallback**: Cheerio HTML parser backed by WordPress RSS and structured XML fallback channels.
- **Bangla Text Normalization**: Automated cleansing of Bengali unicode zero-width characters and standard title delimiters.
- **CORS Enabled**: Ready for direct access from Web, Android, iOS, or Flutter apps.

---

## API Endpoints

### 1. Health Status
`GET /api/health`
Checks API uptime, cache metrics, and connection latency to BDeBooks.

**Response:**
```json
{
  "success": true,
  "source": "BDeBooks",
  "status": "operational",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 124.5,
  "upstream": {
    "target": "https://bdebooks.com/bn/",
    "reachable": true,
    "statusCode": 200,
    "responseTimeMs": 312
  },
  "cache": {
    "keysCount": 12,
    "hits": 45,
    "misses": 12,
    "hitRate": "78.95%"
  }
}
