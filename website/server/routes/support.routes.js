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
const authenticateToken = require("../middleware/auth");

router.post("/support", authenticateToken, submitTicket);
router.get("/support-tickets", authenticateToken, getTickets);
router.get("/user-support-tickets", authenticateToken, getUserTicketsByUserId); // Route for user support tickets by user ID
router.post(
  "/support-tickets/:ticketId/reply",
  authenticateToken,
  replyToTicket,
);
router.delete("/support-tickets/:ticketId", authenticateToken, deleteTicket); // Route for deleting a support ticket
router.post("/support-tickets/:ticketId/close", authenticateToken, closeTicket);
router.get("/support-tickets/recent", authenticateToken, getRecentTickets);

module.exports = router;
