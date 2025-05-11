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
} = require("../controllers/support.controller");
const {
  authenticateToken,
  requireAuth
} = require("../middleware/auth");
const sessionTracker = require("../middleware/sessionTracker");


router.post("/support", authenticateToken, requireAuth, sessionTracker, submitTicket);
router.get("/support-tickets", authenticateToken, requireAuth, sessionTracker, getTickets);
router.get(
  "/user-support-tickets",
  authenticateToken,
  requireAuth,
  sessionTracker,
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
  getRecentTickets
);

module.exports = router;
