const NodeCache = require("node-cache");

const createCache = (stdTTL, maxKeys) =>
  new NodeCache({
    stdTTL,
    maxKeys,
    checkperiod: Math.max(30, Math.ceil(stdTTL / 2)),
    useClones: false,
  });

// Create different cache instances for different data types with bounded size.
const coursesCache = createCache(300, 2000); // 5 minutes
const userCache = createCache(180, 5000); // 3 minutes
const staticCache = createCache(900, 1000); // 15 minutes
const feedbackCache = createCache(300, 2000); // 5 minutes
const analyticsCache = createCache(300, 1000); // 5 minutes
const warnedUnknownCacheTypes = new Set();

const getUserScope = (req) =>
  String(req.user?.user_id ?? req.user?.userId ?? "guest");

const normalizeQueryValue = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry))
      .sort()
      .join(",");
  }
  if (value !== null && typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};

const buildCacheKey = (req) => {
  const query = req.query || {};
  const queryEntries = Object.entries(query).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  // Avoid key explosion with unbounded query cardinality.
  if (queryEntries.length > 20) return null;

  const queryPart = queryEntries
    .map(([key, value]) => {
      const normalizedKey = String(key).slice(0, 80);
      const normalizedValue = normalizeQueryValue(value).slice(0, 200);
      return `${normalizedKey}=${normalizedValue}`;
    })
    .join("&");

  const routePath =
    `${req.baseUrl || ""}${req.path || ""}` ||
    req.originalUrl?.split("?")[0] ||
    req.url ||
    "";

  const key = `${req.method}:${routePath}:${queryPart}:${getUserScope(req)}`;
  return key.length > 1024 ? null : key;
};

// Enhanced caching utility with different strategies
const cacheManager = {
  // Get cached data
  get: (cacheType, key) => {
    const cache = getCacheInstance(cacheType);
    if (!cache) return undefined;
    return cache.get(key);
  },

  // Set cached data with TTL
  set: (cacheType, key, data, ttl = null) => {
    const cache = getCacheInstance(cacheType);
    if (!cache) return false;
    if (ttl) {
      return cache.set(key, data, ttl);
    }
    return cache.set(key, data);
  },

  // Delete cached data
  del: (cacheType, key) => {
    const cache = getCacheInstance(cacheType);
    if (!cache) return 0;
    return cache.del(key);
  },

  // Clear all cache of specific type
  clear: (cacheType) => {
    const cache = getCacheInstance(cacheType);
    if (!cache) return false;
    return cache.flushAll();
  },

  // Get cache statistics
  getStats: (cacheType) => {
    const cache = getCacheInstance(cacheType);
    if (!cache) {
      return { hits: 0, misses: 0, keys: 0, ksize: 0, vsize: 0 };
    }
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
    case "feedback":
      return feedbackCache;
    case "analytics":
      return analyticsCache;
    default:
      return null;
  }
};

const warnUnknownCacheType = (cacheType) => {
  if (warnedUnknownCacheTypes.has(cacheType)) return;
  warnedUnknownCacheTypes.add(cacheType);
  console.warn(
    `[cache] Unknown cache type "${cacheType}". Caching disabled for this route.`,
  );
};

// Invalidate all user-scoped entries in the shared user cache.
const invalidateUserCache = (userId) => {
  const normalizedUserId = String(userId ?? "").trim();
  if (!normalizedUserId) return 0;

  const keys = userCache
    .keys()
    .filter((key) => key.endsWith(`:${normalizedUserId}`));

  if (keys.length === 0) return 0;
  return userCache.del(keys);
};

// Middleware for automatic caching based on route patterns
const cacheMiddleware = (cacheType = "courses", ttl = 300) => {
  return (req, res, next) => {
    const cache = getCacheInstance(cacheType);
    if (!cache) {
      warnUnknownCacheType(cacheType);
      return next();
    }

    const requestCacheControl = String(req.headers["cache-control"] || "");
    const requestPragma = String(req.headers.pragma || "");
    const bypassCache =
      requestCacheControl.includes("no-cache") ||
      requestCacheControl.includes("no-store") ||
      requestPragma.includes("no-cache");

    if (bypassCache) {
      setCacheHeaders(res, { noStore: true });
      return next();
    }

    const key = buildCacheKey(req);
    if (!key) {
      setCacheHeaders(res, { noStore: true });
      return next();
    }

    // Try to get cached response
    const cachedData = cache.get(key);
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
        cache.set(key, data, ttl);

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
  invalidateUserCache,
};
