const express = require("express");
const router = express.Router();
const {
  submitTicket,
  replyToTicket,
  getTickets,
  getUserTicketsByUserId,
  deleteTicket,
  closeTicket,
  getRecentTickets,
  submitAnonymousTicket,
  requestAnonymousTicketAccess,
  verifyAnonymousTicketAccess,
  getAnonymousTicketsByEmail,
} = require("../controllers/support.controller");
const {
  getDashboardAnalytics,
  getRecentTicketsForDashboard,
} = require("../controllers/support-analytics.controller");
const { authenticateToken, requireAuth } = require("../middleware/auth");
const sessionTracker = require("../middleware/sessionTracker");
const {
  performanceMiddleware,
} = require("../middleware/performance.middleware");

router.post(
  "/support",
  authenticateToken,
  requireAuth,
  sessionTracker,
  submitTicket,
);

router.get(
  "/support-tickets",
  authenticateToken,
  requireAuth,
  sessionTracker,
  performanceMiddleware("support-tickets"), // Performance monitoring for support tickets
  getTickets,
);
router.get(
  "/user-support-tickets",
  authenticateToken,
  requireAuth,
  sessionTracker,
  performanceMiddleware("user-support-tickets"), // Performance monitoring for support tickets
  getUserTicketsByUserId,
); // Route for user support tickets by user ID
router.post(
  "/support-tickets/:ticketId/reply",
  authenticateToken,
  requireAuth,
  sessionTracker,
  replyToTicket,
);
router.delete(
  "/support-tickets/:ticketId",
  authenticateToken,
  requireAuth,
  sessionTracker,
  deleteTicket,
); // Route for deleting a support ticket
router.post(
  "/support-tickets/:ticketId/close",
  authenticateToken,
  requireAuth,
  sessionTracker,
  closeTicket,
);
router.get(
  "/support-tickets/recent",
  authenticateToken,
  requireAuth,
  sessionTracker,
  performanceMiddleware("user-support-tickets"),
  getRecentTickets,
);

// Public routes for anonymous support
router.post(
  "/support/anonymous",
  sessionTracker,
  performanceMiddleware("anonymous-support"),
  submitAnonymousTicket,
);

router.post(
  "/support/anonymous/access/request",
  sessionTracker,
  performanceMiddleware("anonymous-support-access-request"),
  requestAnonymousTicketAccess,
);

router.post(
  "/support/anonymous/access/verify",
  sessionTracker,
  performanceMiddleware("anonymous-support-access-verify"),
  verifyAnonymousTicketAccess,
);

router.get(
  "/support/anonymous/:email",
  sessionTracker,
  performanceMiddleware("anonymous-support-tickets"),
  getAnonymousTicketsByEmail,
);

// Support Dashboard Analytics Routes
router.get(
  "/support/analytics/dashboard",
  authenticateToken,
  requireAuth,
  sessionTracker,
  performanceMiddleware("support-dashboard-analytics"),
  getDashboardAnalytics,
);

router.get(
  "/support/tickets/recent",
  authenticateToken,
  requireAuth,
  sessionTracker,
  performanceMiddleware("support-recent-tickets"),
  getRecentTicketsForDashboard,
);

module.exports = router;
