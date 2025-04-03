const express = require("express");
const router = express.Router();
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
} = require("../controllers/admin.controller");
const {
  authenticateToken,
  requireAuth,
  requireAdmin,
} = require("../middleware/auth");

// Public route - no authentication required
router.get("/system-settings", getMaintenanceStatus);
router.get("/maintenance-status", getMaintenanceStatus); // Add an alias for consistency

// Protected admin routes - these should use requireAdmin middleware
router.use(authenticateToken);
router.use(requireAuth);
router.get("/status", checkAdminStatus);
router.get("/activities", requireAdmin, getAdminActivities);
router.get("/metrics/system", requireAdmin, getSystemMetrics);
router.get("/metrics/performance", requireAdmin, getPerformanceMetrics);
router.post("/add-admin", requireAdmin, addAdmin);
router.post("/maintenance-mode", requireAdmin, toggleMaintenanceMode);
router.get("/settings", requireAdmin, getSystemSettings);
router.post("/remove-admin", requireAdmin, removeAdmin);

module.exports = router;
