const NodeCache = require("node-cache");

// Create different cache instances for different data types
const coursesCache = new NodeCache({ stdTTL: 300 }); // 5 minutes for courses
const userCache = new NodeCache({ stdTTL: 180 }); // 3 minutes for user data
const staticCache = new NodeCache({ stdTTL: 900 }); // 15 minutes for static data

// Enhanced caching utility with different strategies
const cacheManager = {
  // Get cached data
  get: (cacheType, key) => {
    const cache = getCacheInstance(cacheType);
    return cache.get(key);
  },

  // Set cached data with TTL
  set: (cacheType, key, data, ttl = null) => {
    const cache = getCacheInstance(cacheType);
    if (ttl) {
      return cache.set(key, data, ttl);
    }
    return cache.set(key, data);
  },

  // Delete cached data
  del: (cacheType, key) => {
    const cache = getCacheInstance(cacheType);
    return cache.del(key);
  },

  // Clear all cache of specific type
  clear: (cacheType) => {
    const cache = getCacheInstance(cacheType);
    return cache.flushAll();
  },

  // Get cache statistics
  getStats: (cacheType) => {
    const cache = getCacheInstance(cacheType);
    return cache.getStats();
  },
};

// Helper function to get cache instance by type
const getCacheInstance = (cacheType) => {
  switch (cacheType) {
    case "courses":
      return coursesCache;
    case "user":
      return userCache;
    case "static":
      return staticCache;
    default:
      return coursesCache; // Default fallback
  }
};

// Middleware for automatic caching based on route patterns
const cacheMiddleware = (cacheType = "courses", ttl = 300) => {
  return (req, res, next) => {
    const key = `${req.method}:${req.originalUrl}:${
      req.user?.userId || "guest"
    }`;

    // Try to get cached response
    const cachedData = cacheManager.get(cacheType, key);
    if (cachedData) {
      // Set browser cache headers for cached responses
      setCacheHeaders(res, {
        public: false, // private cache for user-specific data
        maxAge: ttl,
        staleWhileRevalidate: 60,
      });
      return res.json(cachedData);
    }

    // Store original res.json
    const originalJson = res.json;

    // Override res.json to cache the response
    res.json = function (data) {
      // Cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheManager.set(cacheType, key, data, ttl);

        // Set browser cache headers for fresh responses
        setCacheHeaders(res, {
          public: false, // private cache for user-specific data
          maxAge: ttl,
          staleWhileRevalidate: 60,
        });
      }

      // Call original res.json
      return originalJson.call(this, data);
    };

    next();
  };
};

const setCacheHeaders = (res, options = {}) => {
  const {
    public = false,
    maxAge = 0, // in seconds
    staleWhileRevalidate = 0, // in seconds
    mustRevalidate = false,
    noStore = false,
  } = options;

  if (noStore) {
    res.set("Cache-Control", "no-store");
    return;
  }

  let cacheControl = public ? "public" : "private";

  if (maxAge > 0) {
    cacheControl += `, max-age=${maxAge}`;
  }

  if (staleWhileRevalidate > 0) {
    cacheControl += `, stale-while-revalidate=${staleWhileRevalidate}`;
  }

  if (mustRevalidate) {
    cacheControl += ", must-revalidate";
  }

  res.set("Cache-Control", cacheControl);
};

module.exports = {
  setCacheHeaders,
  cacheManager,
  cacheMiddleware,
};
