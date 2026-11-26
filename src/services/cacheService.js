/**
 * In-Memory TTL Cache Service
 */

class CacheService {
  constructor() {
    this.store = new Map();
    this.hits = 0;
    this.misses = 0;

    // Run garbage collection of stale keys every 5 minutes
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
    }
  }

  set(key, value, ttlSeconds = 300) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value;
  }

  has(key) {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  del(key) {
    return this.store.delete(key);
  }

  flush() {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  getStats() {
    return {
      keysCount: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate:
        this.hits + this.misses > 0
          ? `${((this.hits / (this.hits + this.misses)) * 100).toFixed(2)}%`
          : '0%'
    };
  }
}

module.exports = new CacheService();
