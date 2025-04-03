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
  requireAuth,
  requireAdmin,
} = require("../middleware/auth");

router.post("/support", authenticateToken, requireAuth, submitTicket);
router.get("/support-tickets", authenticateToken, requireAuth, getTickets);
router.get(
  "/user-support-tickets",
  authenticateToken,
  requireAuth,
  getUserTicketsByUserId
); // Route for user support tickets by user ID
router.post(
  "/support-tickets/:ticketId/reply",
  authenticateToken,
  requireAuth,
  replyToTicket
);
router.delete(
  "/support-tickets/:ticketId",
  authenticateToken,
  requireAuth,
  deleteTicket
); // Route for deleting a support ticket
router.post(
  "/support-tickets/:ticketId/close",
  authenticateToken,
  requireAuth,
  closeTicket
);
router.get(
  "/support-tickets/recent",
  authenticateToken,
  requireAuth,
  getRecentTickets
);

module.exports = router;
