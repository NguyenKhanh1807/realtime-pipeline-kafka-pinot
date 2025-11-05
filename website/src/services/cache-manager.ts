/**
 * Cache Manager for Performance Optimization
 * Provides intelligent caching with TTL, LRU eviction, and memory management
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated size in bytes
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalEntries: number;
  totalSize: number;
  hitRate: number;
}

export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number; // Maximum cache size in bytes
  private maxEntries: number; // Maximum number of entries
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
  };

  constructor(maxSizeMB: number = 50, maxEntries: number = 1000) {
    this.maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    this.maxEntries = maxEntries;

    // Start cleanup interval
    setInterval(() => this.cleanup(), 60000); // Clean up every minute
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    this.stats.hits++;
    this.updateHitRate();

    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, ttl: number = 300000): void { // Default 5 minutes
    const size = this.estimateSize(data);

    // Check if we need to evict entries
    if (this.stats.totalSize + size > this.maxSize || this.cache.size >= this.maxEntries) {
      this.evictEntries(size);
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      size,
    };

    // Remove old entry if exists
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.stats.totalSize -= oldEntry.size;
    }

    this.cache.set(key, entry);
    this.stats.totalSize += size;
    this.stats.totalEntries = this.cache.size;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.stats.totalSize -= entry.size;
      this.cache.delete(key);
      this.stats.totalEntries = this.cache.size;
      return true;
    }
    return false;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & {
    sizeMB: number;
    entriesUsed: number;
    entriesAvailable: number;
  } {
    return {
      ...this.stats,
      sizeMB: this.stats.totalSize / (1024 * 1024),
      entriesUsed: this.stats.totalEntries,
      entriesAvailable: this.maxEntries - this.stats.totalEntries,
    };
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    return Date.now() - entry.timestamp <= entry.ttl;
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entry metadata
   */
  getMetadata(key: string): Omit<CacheEntry, 'data'> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const { data, ...metadata } = entry;
    return metadata;
  }

  private estimateSize(data: any): number {
    try {
      // Rough estimation based on JSON string length
      const jsonString = JSON.stringify(data);
      return jsonString.length * 2; // UTF-16 characters
    } catch {
      // Fallback for non-serializable data
      return 1024; // 1KB estimate
    }
  }

  private evictEntries(requiredSize: number): void {
    // Sort entries by access frequency and recency (LRU with access count weighting)
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      entry,
      score: entry.accessCount * 0.7 + (Date.now() - entry.lastAccessed) * 0.3,
    }));

    entries.sort((a, b) => b.score - a.score); // Sort by score (higher = more important)

    let freedSize = 0;
    let evictedCount = 0;

    for (const { key, entry } of entries) {
      if (this.stats.totalSize - freedSize <= this.maxSize - requiredSize &&
          this.cache.size - evictedCount <= this.maxEntries - 1) {
        break;
      }

      this.cache.delete(key);
      freedSize += entry.size;
      evictedCount++;
      this.stats.evictions++;
    }

    this.stats.totalSize -= freedSize;
    this.stats.totalEntries = this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key);
        this.stats.totalSize -= entry.size;
      }
    }

    toDelete.forEach(key => this.cache.delete(key));
    this.stats.totalEntries = this.cache.size;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }
}

// Create singleton instance
export const cacheManager = new CacheManager();

// React hook for using cache in components
export function useCache() {
  return {
    get: cacheManager.get.bind(cacheManager),
    set: cacheManager.set.bind(cacheManager),
    delete: cacheManager.delete.bind(cacheManager),
    has: cacheManager.has.bind(cacheManager),
    clear: cacheManager.clear.bind(cacheManager),
    getStats: cacheManager.getStats.bind(cacheManager),
    getMetadata: cacheManager.getMetadata.bind(cacheManager),
  };
}

// Cached API wrapper
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyFn: (...args: T) => string,
  ttl: number = 300000
) {
  return async (...args: T): Promise<R> => {
    const key = keyFn(...args);

    // Try to get from cache first
    const cached = cacheManager.get<R>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn(...args);
    cacheManager.set(key, result, ttl);

    return result;
  };
}
