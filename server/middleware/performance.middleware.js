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
    const originalSend = res.send;
    const originalJson = res.json;

    // Track response time when response is sent
    const trackResponse = () => {
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1000000;

      trackAPIPerformance(
        endpointName,
        responseTime,
        res.statusCode,
        req.method,
        req.ip
      );
    };

    res.send = function (...args) {
      trackResponse();
      return originalSend.apply(this, args);
    };

    res.json = function (...args) {
      trackResponse();
      return originalJson.apply(this, args);
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
