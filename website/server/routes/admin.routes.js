const express = require('express');
const router = express.Router();
const {
  getAdminActivities,
  getSystemMetrics,
  getPerformanceMetrics,
  addAdmin,
  toggleMaintenanceMode,
  getSystemSettings,
  checkAdminStatus
} = require('../controllers/admin.controller');
const authenticateToken = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Admin routes - removed duplicate authenticateToken
router.get('/status', checkAdminStatus);
router.get('/activities', getAdminActivities);
router.get('/metrics/system', getSystemMetrics);
router.get('/metrics/performance', getPerformanceMetrics);
router.post('/add-admin', addAdmin);
router.post('/maintenance-mode', toggleMaintenanceMode);
router.get('/settings', getSystemSettings);

module.exports = router;