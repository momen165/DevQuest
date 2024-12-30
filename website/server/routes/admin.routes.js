const express = require('express');
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
  removeAdmin
} = require('../controllers/admin.controller');
const authenticateToken = require('../middleware/auth');

// Public route - no authentication required
router.get('/system-settings', getMaintenanceStatus);

// Protected admin routes
router.use(authenticateToken);
router.get('/status', checkAdminStatus);
router.get('/activities', getAdminActivities);
router.get('/metrics/system', getSystemMetrics);
router.get('/metrics/performance', getPerformanceMetrics);
router.post('/add-admin', addAdmin);
router.post('/maintenance-mode', toggleMaintenanceMode);
router.get('/settings', getSystemSettings);
router.post('/remove-admin', removeAdmin);

module.exports = router;