const { cacheManager } = require("./cache.utils");

// Performance monitoring utility for DevQuest
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
  }

  // Start timing an operation
  startTimer(operationName, metadata = {}) {
    const key = `${operationName}_${Date.now()}_${Math.random()}`;
    this.startTimes.set(key, {
      start: process.hrtime.bigint(),
      name: operationName,
      metadata,
    });
    return key;
  }

  // End timing and record metrics
  endTimer(timerKey) {
    const timerData = this.startTimes.get(timerKey);
    if (!timerData) return null;

    const duration =
      Number(process.hrtime.bigint() - timerData.start) / 1000000; // Convert to milliseconds
    this.startTimes.delete(timerKey);

    // Store metric
    const metric = {
      operation: timerData.name,
      duration,
      timestamp: new Date(),
      metadata: timerData.metadata,
    };

    if (!this.metrics.has(timerData.name)) {
      this.metrics.set(timerData.name, []);
    }

    const operationMetrics = this.metrics.get(timerData.name);
    operationMetrics.push(metric);

    // Keep only last 100 measurements per operation
    if (operationMetrics.length > 100) {
      operationMetrics.shift();
    }

    return metric;
  }

  // Get performance statistics for an operation
  getStats(operationName) {
    const operations = this.metrics.get(operationName);
    if (!operations || operations.length === 0) {
      return null;
    }

    const durations = operations.map((op) => op.duration);
    const avg = durations.reduce((sum, dur) => sum + dur, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const p95 = this.percentile(durations, 95);
    const p99 = this.percentile(durations, 99);

    return {
      operation: operationName,
      count: operations.length,
      averageDuration: Math.round(avg * 100) / 100,
      minDuration: Math.round(min * 100) / 100,
      maxDuration: Math.round(max * 100) / 100,
      p95Duration: Math.round(p95 * 100) / 100,
      p99Duration: Math.round(p99 * 100) / 100,
      lastMeasurement: operations[operations.length - 1],
    };
  }

  // Get all performance statistics
  getAllStats() {
    const stats = {};
    for (const [operationName] of this.metrics) {
      stats[operationName] = this.getStats(operationName);
    }
    return stats;
  }

  // Calculate percentile
  percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sorted.length) return sorted[sorted.length - 1];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  // Clear metrics
  clear() {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Middleware to automatically track API response times
const performanceMiddleware = (req, res, next) => {
  const timerKey = performanceMonitor.startTimer(
    `API_${req.method}_${req.route?.path || req.path}`,
    {
      method: req.method,
      path: req.path,
      userAgent: req.get("User-Agent"),
      userId: req.user?.userId,
    }
  );

  // Override res.end to capture completion time
  const originalEnd = res.end;
  res.end = function (...args) {
    const metric = performanceMonitor.endTimer(timerKey);
    // Only log slow requests - different thresholds for production
    const threshold = process.env.NODE_ENV === "production" ? 2000 : 1000;
    if (metric && metric.duration > threshold) {
      console.warn(
        `Slow API request detected: ${metric.operation} took ${metric.duration}ms`
      );
    }
    originalEnd.apply(this, args);
  };
  next();
};

// Log performance summary
const logPerformanceSummary = () => {
  // Skip logging in production unless explicitly enabled
  if (process.env.NODE_ENV === "production" && !process.env.ENABLE_PERFORMANCE_LOGS) {
    return;
  }

  const stats = performanceMonitor.getAllStats();
  console.log("\n=== Performance Summary ===");

  for (const [operation, data] of Object.entries(stats)) {
    if (data.averageDuration > 100) {
      // Only show operations taking > 100ms on average
      console.log(
        `${operation}: avg=${data.averageDuration}ms, p95=${data.p95Duration}ms, count=${data.count}`
      );
    }
  }

  // Cache statistics
  const cacheStats = {
    courses: cacheManager.getStats("courses"),
    user: cacheManager.getStats("user"),
    static: cacheManager.getStats("static"),
    feedback: cacheManager.getStats("feedback"),
    analytics: cacheManager.getStats("analytics"),
  };

  console.log("\n=== Cache Statistics ===");
  for (const [cacheType, stats] of Object.entries(cacheStats)) {
    if (stats.keys > 0) {
      const hitRate = (
        (stats.hits / (stats.hits + stats.misses)) *
        100
      ).toFixed(1);
      console.log(`${cacheType}: ${stats.keys} keys, ${hitRate}% hit rate`);
    }
  }
  console.log("========================\n");
};

// Log performance summary every 5 minutes (only in dev or if explicitly enabled)
if (process.env.NODE_ENV === "development" || process.env.ENABLE_PERFORMANCE_LOGS) {
  setInterval(logPerformanceSummary, 5 * 60 * 1000);
}

// API Performance tracking functions for middleware
const apiMetrics = {
  endpoints: new Map(),
  database: new Map(),
  cache: new Map(),
};

/**
 * Track API endpoint performance
 */
const trackAPIPerformance = (
  endpointName,
  responseTime,
  statusCode,
  method
) => {
  const key = `${method}_${endpointName}`;

  if (!apiMetrics.endpoints.has(key)) {
    apiMetrics.endpoints.set(key, {
      endpoint: endpointName,
      method,
      totalRequests: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      statusCodes: new Map(),
      lastRequest: null,
    });
  }

  const metrics = apiMetrics.endpoints.get(key);
  metrics.totalRequests++;
  metrics.totalResponseTime += responseTime;
  metrics.averageResponseTime =
    metrics.totalResponseTime / metrics.totalRequests;
  metrics.minResponseTime = Math.min(metrics.minResponseTime, responseTime);
  metrics.maxResponseTime = Math.max(metrics.maxResponseTime, responseTime);
  metrics.lastRequest = new Date();

  // Track status codes
  if (!metrics.statusCodes.has(statusCode)) {
    metrics.statusCodes.set(statusCode, 0);
  }
  metrics.statusCodes.set(statusCode, metrics.statusCodes.get(statusCode) + 1);

  // Log slow requests - only in production if > 2s, in dev if > 1s
  const threshold = process.env.NODE_ENV === "production" ? 2000 : 1000;
  if (responseTime > threshold) {
    console.warn(
      `🐌 Slow API request: ${key} took ${responseTime.toFixed(2)}ms`
    );
  }
};

/**
 * Track database query performance
 */
const trackDatabaseQuery = (queryType, queryTime, success, queryText = "") => {
  if (!apiMetrics.database.has(queryType)) {
    apiMetrics.database.set(queryType, {
      queryType,
      totalQueries: 0,
      totalQueryTime: 0,
      averageQueryTime: 0,
      minQueryTime: Infinity,
      maxQueryTime: 0,
      successfulQueries: 0,
      failedQueries: 0,
      lastQuery: null,
    });
  }

  const metrics = apiMetrics.database.get(queryType);
  metrics.totalQueries++;
  metrics.totalQueryTime += queryTime;
  metrics.averageQueryTime = metrics.totalQueryTime / metrics.totalQueries;
  metrics.minQueryTime = Math.min(metrics.minQueryTime, queryTime);
  metrics.maxQueryTime = Math.max(metrics.maxQueryTime, queryTime);
  metrics.lastQuery = new Date();

  if (success) {
    metrics.successfulQueries++;
  } else {
    metrics.failedQueries++;
  }

  // Log slow queries with environment-specific thresholds
  const threshold = process.env.NODE_ENV === "production" ? 1000 : 100;
  if (queryTime > threshold) {
    console.warn(
      `🐌 Slow database query: ${queryType} took ${queryTime.toFixed(2)}ms`
    );
  }
};

/**
 * Track cache performance
 */
const trackCacheHit = (cacheType) => {
  if (!apiMetrics.cache.has(cacheType)) {
    apiMetrics.cache.set(cacheType, {
      type: cacheType,
      hits: 0,
      misses: 0,
      hitRate: 0,
      lastAccess: null,
    });
  }

  const metrics = apiMetrics.cache.get(cacheType);
  metrics.hits++;
  metrics.hitRate = (metrics.hits / (metrics.hits + metrics.misses)) * 100;
  metrics.lastAccess = new Date();
};

const trackCacheMiss = (cacheType) => {
  if (!apiMetrics.cache.has(cacheType)) {
    apiMetrics.cache.set(cacheType, {
      type: cacheType,
      hits: 0,
      misses: 0,
      hitRate: 0,
      lastAccess: null,
    });
  }

  const metrics = apiMetrics.cache.get(cacheType);
  metrics.misses++;
  metrics.hitRate = (metrics.hits / (metrics.hits + metrics.misses)) * 100;
  metrics.lastAccess = new Date();
};

/**
 * Get API performance metrics
 */
const getAPIMetrics = () => {
  const result = {
    endpoints: Array.from(apiMetrics.endpoints.values()),
    database: Array.from(apiMetrics.database.values()),
    cache: Array.from(apiMetrics.cache.values()),
  };

  return result;
};

const getPerformanceMetrics = () => getAPIMetrics();

/**
 * Get performance summary
 */
const getPerformanceSummary = () => {
  const endpoints = Array.from(apiMetrics.endpoints.values());
  const database = Array.from(apiMetrics.database.values());
  const cache = Array.from(apiMetrics.cache.values());

  const summary = {
    overview: {
      totalEndpoints: endpoints.length,
      totalDatabaseQueries: database.reduce(
        (sum, db) => sum + db.totalQueries,
        0
      ),
      totalCacheAccesses: cache.reduce((sum, c) => sum + c.hits + c.misses, 0),
      timestamp: new Date(),
    },
    performance: {
      averageAPIResponseTime:
        endpoints.length > 0
          ? endpoints.reduce((sum, ep) => sum + ep.averageResponseTime, 0) /
            endpoints.length
          : 0,
      averageDBQueryTime:
        database.length > 0
          ? database.reduce((sum, db) => sum + db.averageQueryTime, 0) /
            database.length
          : 0,
      overallCacheHitRate:
        cache.length > 0
          ? cache.reduce((sum, c) => sum + c.hitRate, 0) / cache.length
          : 0,
    },
    topSlowEndpoints: endpoints
      .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
      .slice(0, 5),
    topSlowQueries: database
      .sort((a, b) => b.averageQueryTime - a.averageQueryTime)
      .slice(0, 5),
  };

  return summary;
};

const clearPerformanceMetrics = () => {
  performanceMonitor.clear();
  apiMetrics.endpoints.clear();
  apiMetrics.database.clear();
  apiMetrics.cache.clear();
};

module.exports = {
  performanceMonitor,
  performanceMiddleware,
  trackDatabaseQuery,
  trackAPIPerformance,
  trackCacheHit,
  trackCacheMiss,
  getPerformanceMetrics,
  clearPerformanceMetrics,
  getAPIMetrics,
  getPerformanceSummary,
  logPerformanceSummary,
};
