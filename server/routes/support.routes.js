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
  getAnonymousTicketsByEmail,
} = require("../controllers/support.controller");
const { authenticateToken, requireAuth } = require("../middleware/auth");
const sessionTracker = require("../middleware/sessionTracker");
const { cacheMiddleware } = require("../utils/cache.utils");
const {
  performanceMiddleware,
} = require("../middleware/performance.middleware");

router.post(
  "/support",
  authenticateToken,
  requireAuth,
  sessionTracker,
  submitTicket
);

router.get(
  "/support-tickets",
  authenticateToken,
  requireAuth,
  sessionTracker,
  cacheMiddleware("support-tickets", 300),
  performanceMiddleware("support-tickets"), // Performance monitoring for support tickets
  getTickets
);
router.get(
  "/user-support-tickets",
  authenticateToken,
  requireAuth,
  sessionTracker,
  cacheMiddleware("user-support-tickets", 300),
  performanceMiddleware("user-support-tickets"), // Performance monitoring for support tickets
  getUserTicketsByUserId
); // Route for user support tickets by user ID
router.post(
  "/support-tickets/:ticketId/reply",
  authenticateToken,
  requireAuth,
  sessionTracker,
  replyToTicket
);
router.delete(
  "/support-tickets/:ticketId",
  authenticateToken,
  requireAuth,
  sessionTracker,
  deleteTicket
); // Route for deleting a support ticket
router.post(
  "/support-tickets/:ticketId/close",
  authenticateToken,
  requireAuth,
  sessionTracker,
  closeTicket
);
router.get(
  "/support-tickets/recent",
  authenticateToken,
  requireAuth,
  sessionTracker,
  cacheMiddleware("support-tickets/recent", 300),
  performanceMiddleware("user-support-tickets"),
  getRecentTickets
);

// Public routes for anonymous support
router.post(
  "/support/anonymous",
  sessionTracker,
  performanceMiddleware("anonymous-support"),
  submitAnonymousTicket
);

router.get(
  "/support/anonymous/:email",
  sessionTracker,
  cacheMiddleware("anonymous-support-tickets", 300),
  performanceMiddleware("anonymous-support-tickets"),
  getAnonymousTicketsByEmail
);

module.exports = router;
