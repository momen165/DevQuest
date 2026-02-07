const express = require("express");
const { authenticateToken, requireAuth } = require("../middleware/auth");
const {
  getPerformanceMetrics,
  clearPerformanceMetrics,
} = require("../utils/performance.utils");

const router = express.Router();

/**
 * Get performance metrics (admin only)
 */
router.get(
  "/performance/metrics",
  authenticateToken,
  requireAuth,
  (req, res) => {
    if (!req.user.admin) {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const metrics = getPerformanceMetrics();
    res.json(metrics);
  }
);

/**
 * Clear performance metrics (admin only)
 */
router.post(
  "/performance/clear",
  authenticateToken,
  requireAuth,
  (req, res) => {
    if (!req.user.admin) {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    clearPerformanceMetrics();
    res.json({ message: "Performance metrics cleared successfully" });
  }
);

/**
 * Get performance summary for dashboard
 */
router.get(
  "/performance/summary",
  authenticateToken,
  requireAuth,
  (req, res) => {
    if (!req.user.admin) {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const metrics = getPerformanceMetrics();
    const endpoints = metrics.endpoints || [];
    const database = metrics.database || [];
    const cache = metrics.cache || [];

    const totalRequests = endpoints.reduce(
      (sum, endpoint) => sum + endpoint.totalRequests,
      0
    );

    const totalQueries = database.reduce(
      (sum, query) => sum + query.totalQueries,
      0
    );

    const totalHits = cache.reduce((sum, item) => sum + item.hits, 0);
    const totalMisses = cache.reduce((sum, item) => sum + item.misses, 0);

    const avgResponseTime =
      totalRequests > 0
        ? (
            endpoints.reduce(
              (sum, endpoint) =>
                sum + endpoint.averageResponseTime * endpoint.totalRequests,
              0
            ) / totalRequests
          ).toFixed(2)
        : "0.00";

    const avgQueryTime =
      totalQueries > 0
        ? (
            database.reduce(
              (sum, query) => sum + query.averageQueryTime * query.totalQueries,
              0
            ) / totalQueries
          ).toFixed(2)
        : "0.00";

    const successRate =
      totalQueries > 0
        ? (
            (database.reduce(
              (sum, query) => sum + query.successfulQueries,
              0
            ) /
              totalQueries) *
            100
          ).toFixed(2) + "%"
        : "0%";

    const sortedEndpoints = [...endpoints].sort(
      (a, b) => b.averageResponseTime - a.averageResponseTime
    );
    const sortedQueries = [...database].sort(
      (a, b) => b.averageQueryTime - a.averageQueryTime
    );

    res.json({
      api: {
        totalRequests,
        averageResponseTime: avgResponseTime,
        slowestEndpoint: sortedEndpoints[0]?.endpoint || null,
        fastestEndpoint:
          sortedEndpoints[sortedEndpoints.length - 1]?.endpoint || null,
      },
      database: {
        totalQueries,
        averageQueryTime: avgQueryTime,
        slowestQueryType: sortedQueries[0]?.queryType || null,
        successRate,
      },
      cache: {
        totalHits,
        totalMisses,
        hitRate:
          totalHits + totalMisses > 0
            ? ((totalHits / (totalHits + totalMisses)) * 100).toFixed(2) + "%"
            : "0%",
      },
    });
  }
);

module.exports = router;
