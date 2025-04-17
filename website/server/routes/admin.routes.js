const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const sanitizeInput = require("../middleware/sanitizeInput");
const cors = require("cors");
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

// Rate limiting for admin routes
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

// Public route - no authentication required
router.get("/system-settings", getMaintenanceStatus);
router.get("/maintenance-status", getMaintenanceStatus); // Add an alias for consistency

// Apply rate limiting, input sanitization, and CORS policies to all admin routes
router.use(adminRateLimiter);
router.use(sanitizeInput);
router.use(cors());

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
