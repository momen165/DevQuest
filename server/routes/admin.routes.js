const express = require("express");
const router = express.Router();
// Use the enhanced controller which includes all the analytics improvements
const {
  getAdminActivities,
  getSystemMetrics,
  getPerformanceMetrics,
  addAdmin,
  toggleMaintenanceMode,
  getSystemSettings,
  checkAdminStatus,
  getMaintenanceStatus,
  removeAdmin,
  getSiteAnalytics,
  grantFreeSubscription,
} = require("../controllers/admin.controller");
const trackVisit = require("../middleware/trackVisits");
const {
  authenticateToken,
  requireAuth,
  requireAdmin,
} = require("../middleware/auth");

// Public route - no authentication required
router.get("/system-settings", getMaintenanceStatus);
router.get("/maintenance-status", getMaintenanceStatus); // Add an alias for consistency

// Protected admin routes - these should use requireAdmin middleware
const sessionTracker = require("../middleware/sessionTracker");
router.use(authenticateToken);
router.use(requireAuth);
router.use(trackVisit); // <-- Add this so all admin routes after this will have trackVisit with req.user set
router.use(sessionTracker);
router.get("/status", checkAdminStatus);
router.get("/activities", requireAdmin, getAdminActivities);
router.get("/metrics/system", requireAdmin, getSystemMetrics);
router.get("/metrics/performance", requireAdmin, getPerformanceMetrics);
router.post("/add-admin", requireAdmin, addAdmin);
router.post("/maintenance-mode", requireAdmin, toggleMaintenanceMode);
router.get("/settings", requireAdmin, getSystemSettings);
router.post("/remove-admin", requireAdmin, removeAdmin);
router.get("/analytics", requireAdmin, getSiteAnalytics);
router.post("/grant-free-subscription", requireAdmin, grantFreeSubscription);
module.exports = router;
