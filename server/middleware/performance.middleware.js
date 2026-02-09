const {
  trackAPIPerformance,
  trackDatabaseQuery,
} = require("../utils/performance.utils");

/**
 * Middleware to track API endpoint performance
 */
const performanceMiddleware = (endpointName) => {
  return (req, res, next) => {
    const startTime = process.hrtime.bigint();
    const originalEnd = res.end;
    let tracked = false;

    // Use res.end override only — it is always called exactly once,
    // avoiding double-tracking when both cacheMiddleware and performanceMiddleware
    // are applied (cacheMiddleware overrides res.json, which calls res.send, which calls res.end).
    res.end = function (...args) {
      if (!tracked) {
        tracked = true;
        const endTime = process.hrtime.bigint();
        const responseTime = Number(endTime - startTime) / 1000000;
        trackAPIPerformance(
          endpointName,
          responseTime,
          res.statusCode,
          req.method,
          req.ip,
        );
      }
      return originalEnd.apply(this, args);
    };

    next();
  };
};

/**
 * Optional Prisma query instrumentation.
 */
const wrapDatabaseQuery = (prismaClient) => {
  if (!prismaClient || typeof prismaClient.$on !== "function") {
    return prismaClient;
  }

  prismaClient.$on("query", (event) => {
    const queryText = event?.query || "UNKNOWN";
    const queryType = queryText.trim().split(" ")[0].toUpperCase();
    trackDatabaseQuery(queryType, event?.duration || 0, true, queryText);
  });

  return prismaClient;
};

module.exports = {
  performanceMiddleware,
  wrapDatabaseQuery,
};
