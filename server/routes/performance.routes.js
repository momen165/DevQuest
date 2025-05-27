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

    // Calculate summary statistics
    const summary = {
      api: {
        totalRequests: Object.values(metrics.apiCalls).reduce(
          (sum, calls) => sum + calls.length,
          0
        ),
        averageResponseTime: 0,
        slowestEndpoint: null,
        fastestEndpoint: null,
      },
      database: {
        totalQueries: Object.values(metrics.databaseQueries).reduce(
          (sum, queries) => sum + queries.length,
          0
        ),
        averageQueryTime: 0,
        slowestQueryType: null,
        successRate: 0,
      },
      cache: {
        totalHits: metrics.cacheHits,
        totalMisses: metrics.cacheMisses,
        hitRate:
          metrics.cacheHits + metrics.cacheMisses > 0
            ? (
                (metrics.cacheHits /
                  (metrics.cacheHits + metrics.cacheMisses)) *
                100
              ).toFixed(2) + "%"
            : "0%",
      },
    };

    // Calculate API averages
    const allApiCalls = Object.values(metrics.apiCalls).flat();
    if (allApiCalls.length > 0) {
      summary.api.averageResponseTime = (
        allApiCalls.reduce((sum, call) => sum + call.responseTime, 0) /
        allApiCalls.length
      ).toFixed(2);

      // Find slowest and fastest endpoints
      const endpointAvgs = Object.entries(metrics.apiCalls).map(
        ([endpoint, calls]) => ({
          endpoint,
          avgTime:
            calls.reduce((sum, call) => sum + call.responseTime, 0) /
            calls.length,
        })
      );

      endpointAvgs.sort((a, b) => b.avgTime - a.avgTime);
      summary.api.slowestEndpoint = endpointAvgs[0]?.endpoint;
      summary.api.fastestEndpoint =
        endpointAvgs[endpointAvgs.length - 1]?.endpoint;
    }

    // Calculate database averages
    const allDbQueries = Object.values(metrics.databaseQueries).flat();
    if (allDbQueries.length > 0) {
      summary.database.averageQueryTime = (
        allDbQueries.reduce((sum, query) => sum + query.queryTime, 0) /
        allDbQueries.length
      ).toFixed(2);

      summary.database.successRate =
        (
          (allDbQueries.filter((query) => query.success).length /
            allDbQueries.length) *
          100
        ).toFixed(2) + "%";

      // Find slowest query type
      const queryAvgs = Object.entries(metrics.databaseQueries).map(
        ([type, queries]) => ({
          type,
          avgTime:
            queries.reduce((sum, query) => sum + query.queryTime, 0) /
            queries.length,
        })
      );

      queryAvgs.sort((a, b) => b.avgTime - a.avgTime);
      summary.database.slowestQueryType = queryAvgs[0]?.type;
    }

    res.json(summary);
  }
);

module.exports = router;
