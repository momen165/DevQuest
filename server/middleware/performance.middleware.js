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
      const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      trackAPIPerformance(
        endpointName,
        responseTime,
        res.statusCode,
        req.method,
        req.ip
      );
    };

    // Override response methods to capture timing
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
 * Middleware to wrap database queries with performance tracking
 */
const wrapDatabaseQuery = (db) => {
  const originalQuery = db.query; // This is the original pool.query method

  db.query = async function (text, params) {
    const startTime = process.hrtime.bigint();

    // // Log pool state before query (pool.query handles connect/release)
    // console.log(
    //   `[DB Pool State Before Query] Total: ${db.pool.totalCount}, Idle: ${db.pool.idleCount}, Waiting: ${db.pool.waitingCount}`
    // );

    try {
      const result = await originalQuery.call(db, text, params);
      const endTime = process.hrtime.bigint();
      const queryTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      const queryType = text.trim().split(" ")[0].toUpperCase();

      // console.warn(
      //   `Detailed DB Query: ${queryType} - Total: ${queryTime.toFixed(
      //     2
      //   )}ms\nQuery: ${text}`
      // );

      trackDatabaseQuery(queryType, queryTime, true, text);

      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const queryTime = Number(endTime - startTime) / 1000000;

      const queryType = text.trim().split(" ")[0].toUpperCase();
      trackDatabaseQuery(queryType, queryTime, false, text);

      throw error;
    }
  };

  return db;
};

module.exports = {
  performanceMiddleware,
  wrapDatabaseQuery,
};
