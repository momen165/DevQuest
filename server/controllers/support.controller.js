const prisma = require("../config/prisma");
const crypto = require("crypto");
const NodeCache = require("node-cache");
const {
  sendSupportReplyNotification,
  sendSupportTicketConfirmation,
  sendSupportAccessCode,
} = require("../utils/email.utils");
const { toIntId, getRequesterUserId } = require("../utils/authz.utils");

const anonymousAccessRequestCache = new NodeCache({
  stdTTL: 600,
  checkperiod: 120,
  useClones: false,
});

const anonymousAccessTokenCache = new NodeCache({
  stdTTL: 900,
  checkperiod: 120,
  useClones: false,
});

const ANONYMOUS_ACCESS_MAX_ATTEMPTS = 5;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const hashValue = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const addHours = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000);

const formatTicket = (ticket) => ({
  ticket_id: ticket.ticket_id,
  user_email: ticket.user_email,
  time_opened: ticket.time_opened,
  expiration_time: ticket.expiration_time,
  status: ticket.status,
  closed_by: ticket.closed_by,
  closed_at: ticket.closed_at,
  category: ticket.category,
  priority: ticket.priority,
  assigned_to: ticket.assigned_to,
  sla_target: ticket.sla_target,
  messages: (ticket.ticket_messages || []).map((message) => ({
    message_id: message.message_id,
    ticket_id: message.ticket_id,
    message_content: message.message_content,
    sender_type: message.sender_type,
    sent_at: message.sent_at,
    is_auto_response: message.is_auto_response,
  })),
});

const getTicketWithMessages = async (ticketId) => {
  return prisma.support.findUnique({
    where: { ticket_id: Number(ticketId) },
    include: {
      ticket_messages: {
        orderBy: { sent_at: "asc" },
      },
    },
  });
};

/**
 * Submits a new support ticket or updates an existing open ticket for a user.
 */
const submitTicket = async (req, res) => {
  const { message } = req.body;
  const userId = req.user.user_id;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }

  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { user_id: Number(userId) },
      select: { email: true, name: true },
    });

    if (!user?.email) {
      return res.status(404).json({ error: "User not found." });
    }

    const existingTicket = await prisma.support.findFirst({
      where: {
        user_email: user.email,
        status: "open",
      },
      orderBy: { time_opened: "desc" },
      select: { ticket_id: true },
    });

    if (existingTicket) {
      await prisma.support.update({
        where: { ticket_id: existingTicket.ticket_id },
        data: {
          expiration_time: addHours(new Date(), 24),
        },
      });

      const insertedMessage = await prisma.ticket_messages.create({
        data: {
          ticket_id: existingTicket.ticket_id,
          sender_type: "user",
          message_content: String(message).trim(),
        },
      });

      return res.status(200).json({
        message: "Support ticket message added successfully!",
        ticket: insertedMessage,
      });
    }

    const newTicket = await prisma.support.create({
      data: {
        user_email: user.email,
        time_opened: new Date(),
        expiration_time: addHours(new Date(), 24),
        status: "open",
      },
      select: { ticket_id: true },
    });

    await prisma.ticket_messages.create({
      data: {
        ticket_id: newTicket.ticket_id,
        sender_type: "user",
        message_content: String(message).trim(),
      },
    });

    const autoReplyMessage = `Hello there!\n\nThank you for contacting DevQuest Support. This is an automated message to confirm we've received your inquiry.\n\nYour Support Ticket ID is: #${newTicket.ticket_id}\n\nOne of our administrators will review your message and respond as soon as possible. Please note that our typical response time is within 24 hours.\n\nIf you don't receive a response within 24 hours, please contact us at Support@mail.dev-quest.me and include your Support Ticket ID (#${newTicket.ticket_id}) in your email.\n\nWe appreciate your patience!\n\nBest regards,\nDevQuest Support Team`;

    await prisma.ticket_messages.create({
      data: {
        ticket_id: newTicket.ticket_id,
        sender_type: "admin",
        message_content: autoReplyMessage,
        is_auto_response: true,
      },
    });

    const ticket = await getTicketWithMessages(newTicket.ticket_id);

    try {
      await sendSupportTicketConfirmation(user.email, user.name, newTicket.ticket_id);
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
    }

    return res.status(201).json({
      message: "Support ticket submitted successfully!",
      ticket: formatTicket(ticket),
    });
  } catch (err) {
    console.error("Error submitting support ticket:", err);
    res.status(500).json({ error: "Failed to submit support ticket." });
  }
};

/**
 * Fetches open support tickets for a specific user.
 */
const getUserTicketsByUserId = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const user = await prisma.users.findUnique({
      where: { user_id: Number(userId) },
      select: { email: true },
    });

    if (!user?.email) {
      return res.status(404).json({ error: "User not found." });
    }

    const tickets = await prisma.support.findMany({
      where: {
        user_email: user.email,
        status: "open",
      },
      orderBy: { time_opened: "desc" },
      include: {
        ticket_messages: {
          orderBy: { sent_at: "asc" },
        },
      },
    });

    res.status(200).json(tickets.map(formatTicket));
  } catch (err) {
    console.error("Error fetching user support tickets:", err);
    res.status(500).json({ error: "Failed to fetch user support tickets." });
  }
};

/**
 * Fetches all support tickets (accessible only to admins).
 */
const getTickets = async (req, res) => {
  const isAdmin = req.user.admin;

  try {
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const tickets = await prisma.support.findMany({
      orderBy: { time_opened: "desc" },
      include: {
        ticket_messages: {
          orderBy: { sent_at: "asc" },
        },
      },
    });

    res.status(200).json(tickets.map(formatTicket));
  } catch (err) {
    console.error("Error fetching support tickets:", err);
    res.status(500).json({ error: "Failed to fetch support tickets." });
  }
};

/**
 * Adds a reply to a support ticket.
 */
const replyToTicket = async (req, res) => {
  const { ticketId } = req.params;
  const { reply } = req.body;
  const isAdmin = req.user.admin;
  const requesterUserId = getRequesterUserId(req);
  const sender_type = isAdmin ? "admin" : "user";

  try {
    if (!reply || !reply.trim()) {
      return res.status(400).json({ error: "Reply message is required." });
    }

    const normalizedTicketId = toIntId(ticketId);
    if (!normalizedTicketId) {
      return res.status(400).json({ error: "Invalid ticket ID." });
    }

    const ticket = await prisma.support.findUnique({
      where: { ticket_id: normalizedTicketId },
      select: { user_email: true },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Support ticket not found." });
    }

    const ownerUser = await prisma.users.findFirst({
      where: { email: ticket.user_email },
      select: { user_id: true },
    });

    if (!isAdmin) {
      const ownerUserId = toIntId(ownerUser?.user_id);
      if (!requesterUserId || !ownerUserId || requesterUserId !== ownerUserId) {
        return res
          .status(403)
          .json({ error: "Not authorized to reply to this ticket." });
      }
    }

    const insertedMessage = await prisma.ticket_messages.create({
      data: {
        ticket_id: normalizedTicketId,
        sender_type,
        message_content: reply.trim(),
      },
    });

    if (!isAdmin) {
      await prisma.support.update({
        where: { ticket_id: normalizedTicketId },
        data: {
          expiration_time: addHours(new Date(), 24),
        },
      });
    } else {
      try {
        await sendSupportReplyNotification(
          ticket.user_email,
          normalizedTicketId,
          reply.trim()
        );
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }
    }

    res.status(200).json(insertedMessage);
  } catch (err) {
    console.error("Error replying to support ticket:", err);
    res.status(500).json({ error: "Failed to reply to support ticket." });
  }
};

/**
 * Deletes a support ticket and its associated messages.
 */
const deleteTicket = async (req, res) => {
  const { ticketId } = req.params;
  const requesterUserId = getRequesterUserId(req);
  const isAdmin = Boolean(req.user?.admin);

  try {
    const normalizedTicketId = toIntId(ticketId);
    if (!normalizedTicketId) {
      return res.status(400).json({ error: "Invalid ticket ID." });
    }

    const ticket = await prisma.support.findUnique({
      where: { ticket_id: normalizedTicketId },
      select: { user_email: true },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Support ticket not found." });
    }

    if (!isAdmin) {
      const owner = await prisma.users.findFirst({
        where: { email: ticket.user_email },
        select: { user_id: true },
      });
      const ownerUserId = toIntId(owner?.user_id);
      if (!requesterUserId || !ownerUserId || requesterUserId !== ownerUserId) {
        return res
          .status(403)
          .json({ error: "Not authorized to delete this ticket." });
      }
    }

    await prisma.support.delete({
      where: { ticket_id: normalizedTicketId },
    });

    res.status(200).json({
      message: "Support ticket and associated messages deleted successfully.",
    });
  } catch (err) {
    console.error("Error deleting support ticket:", err);
    res.status(500).json({ error: "Failed to delete support ticket." });
  }
};

/**
 * Closes any support tickets that have expired.
 */
const closeExpiredTickets = async () => {
  try {
    const result = await prisma.support.updateMany({
      where: {
        status: "open",
        expiration_time: { lt: new Date() },
      },
      data: {
        status: "closed",
        closed_by: "auto",
        closed_at: new Date(),
      },
    });

    if (result.count > 0) {
      console.log(`Closed ${result.count} expired tickets`);
    }
  } catch (err) {
    console.error("Error closing expired tickets:", err);
  }
};

/**
 * Closes a specific support ticket for a user.
 */
const closeTicket = async (req, res) => {
  const { ticketId } = req.params;
  const userId = req.user.user_id;

  try {
    const user = await prisma.users.findUnique({
      where: { user_id: Number(userId) },
      select: { email: true },
    });

    if (!user?.email) {
      return res.status(404).json({ error: "User not found" });
    }

    const ticket = await prisma.support.findFirst({
      where: {
        ticket_id: Number(ticketId),
        user_email: user.email,
      },
      select: { ticket_id: true },
    });

    if (!ticket) {
      return res
        .status(403)
        .json({ error: "Not authorized to close this ticket" });
    }

    await prisma.support.update({
      where: { ticket_id: Number(ticketId) },
      data: {
        status: "closed",
        closed_by: "user",
        closed_at: new Date(),
      },
    });

    res.status(200).json({ message: "Support ticket closed successfully." });
  } catch (err) {
    console.error("Error closing support ticket:", err);
    res.status(500).json({ error: "Failed to close support ticket." });
  }
};

/**
 * Fetches recent support tickets (accessible only to admins).
 */
const getRecentTickets = async (req, res) => {
  const isAdmin = req.user.admin;

  try {
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tickets = await prisma.support.findMany({
      where: {
        time_opened: { gt: since },
      },
      orderBy: { time_opened: "desc" },
      take: 5,
      select: {
        ticket_id: true,
        user_email: true,
        time_opened: true,
        status: true,
      },
    });

    res.status(200).json(tickets);
  } catch (err) {
    console.error("Error fetching recent tickets:", err);
    res.status(500).json({ error: "Failed to fetch recent tickets." });
  }
};

/**
 * Submits a new anonymous support ticket.
 */
const submitAnonymousTicket = async (req, res) => {
  const { message, name } = req.body;
  const email = normalizeEmail(req.body.email);

  if (!email || !message || !name) {
    return res
      .status(400)
      .json({ error: "Email, name, and message are required." });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res
      .status(400)
      .json({ error: "Please provide a valid email address." });
  }

  try {
    const existingTicket = await prisma.support.findFirst({
      where: {
        user_email: email,
        status: "open",
      },
      orderBy: { time_opened: "desc" },
      select: { ticket_id: true },
    });

    if (existingTicket) {
      await prisma.support.update({
        where: { ticket_id: existingTicket.ticket_id },
        data: {
          expiration_time: addHours(new Date(), 24),
        },
      });

      const insertedMessage = await prisma.ticket_messages.create({
        data: {
          ticket_id: existingTicket.ticket_id,
          sender_type: "user",
          message_content: message,
        },
      });

      return res.status(200).json({
        message: "Support ticket message added successfully!",
        ticket: insertedMessage,
      });
    }

    const newTicket = await prisma.support.create({
      data: {
        user_email: email,
        time_opened: new Date(),
        expiration_time: addHours(new Date(), 24),
        status: "open",
      },
      select: { ticket_id: true },
    });

    await prisma.ticket_messages.create({
      data: {
        ticket_id: newTicket.ticket_id,
        sender_type: "user",
        message_content: message,
      },
    });

    const autoReplyMessage = `Hello ${name}!\n\nThank you for contacting DevQuest Support. This is an automated message to confirm we've received your inquiry.\n\nYour Support Ticket ID is: #${newTicket.ticket_id}\n\nOne of our administrators will review your message and respond as soon as possible. Please note that our typical response time is within 24 hours.\n\nIf you don't receive a response within 24 hours, please contact us at Support@mail.dev-quest.me and include your Support Ticket ID (#${newTicket.ticket_id}) in your email.\n\nWe appreciate your patience!\n\nBest regards,\nDevQuest Support Team`;

    await prisma.ticket_messages.create({
      data: {
        ticket_id: newTicket.ticket_id,
        sender_type: "admin",
        message_content: autoReplyMessage,
        is_auto_response: true,
      },
    });

    const ticket = await getTicketWithMessages(newTicket.ticket_id);

    try {
      await sendSupportTicketConfirmation(email, name, newTicket.ticket_id);
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
    }

    return res.status(201).json({
      message: "Support ticket submitted successfully!",
      ticket: formatTicket(ticket),
    });
  } catch (err) {
    console.error("Error submitting anonymous support ticket:", err);
    res.status(500).json({ error: "Failed to submit support ticket." });
  }
};

/**
 * Requests an email verification code for anonymous support ticket access.
 */
const requestAnonymousTicketAccess = async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!EMAIL_REGEX.test(email)) {
    return res
      .status(400)
      .json({ error: "Please provide a valid email address." });
  }

  const requestId = crypto.randomUUID();
  const verificationCode = String(crypto.randomInt(100000, 1000000)).padStart(
    6,
    "0"
  );
  const verificationHash = hashValue(`${requestId}:${verificationCode}`);

  anonymousAccessRequestCache.set(requestId, {
    email,
    verificationHash,
    attempts: 0,
  });

  const emailSent = await sendSupportAccessCode(email, verificationCode);

  const response = {
    message:
      "If this email has active tickets, a verification code has been sent.",
    requestId,
  };

  if (!emailSent && process.env.NODE_ENV !== "production") {
    response.devVerificationCode = verificationCode;
  }

  if (!emailSent && process.env.NODE_ENV === "production") {
    return res.status(503).json({
      error: "Unable to send verification code right now. Please try again.",
    });
  }

  return res.status(200).json(response);
};

/**
 * Verifies an anonymous ticket access code and returns a short-lived access token.
 */
const verifyAnonymousTicketAccess = async (req, res) => {
  const { requestId, code } = req.body || {};

  if (!requestId || !code) {
    return res
      .status(400)
      .json({ error: "requestId and verification code are required." });
  }

  const accessRequest = anonymousAccessRequestCache.get(String(requestId));
  if (!accessRequest) {
    return res.status(400).json({ error: "Verification request expired." });
  }

  if (accessRequest.attempts >= ANONYMOUS_ACCESS_MAX_ATTEMPTS) {
    anonymousAccessRequestCache.del(String(requestId));
    return res.status(429).json({
      error: "Too many failed attempts. Please request a new code.",
    });
  }

  const isValidCode =
    hashValue(`${requestId}:${String(code).trim()}`) ===
    accessRequest.verificationHash;

  if (!isValidCode) {
    accessRequest.attempts += 1;
    anonymousAccessRequestCache.set(String(requestId), accessRequest);
    return res.status(401).json({ error: "Invalid verification code." });
  }

  anonymousAccessRequestCache.del(String(requestId));

  const accessToken = crypto.randomBytes(32).toString("hex");
  anonymousAccessTokenCache.set(accessToken, {
    email: accessRequest.email,
  });

  return res.status(200).json({
    accessToken,
    expiresInSeconds: 900,
  });
};

/**
 * Fetches open support tickets for a specific email (anonymous users).
 */
const getAnonymousTicketsByEmail = async (req, res) => {
  const email = normalizeEmail(req.params.email);
  const accessToken = String(req.query.token || "");

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Email is required." });
  }

  if (!accessToken) {
    return res.status(401).json({ error: "Access token is required." });
  }

  const accessRecord = anonymousAccessTokenCache.get(accessToken);
  if (!accessRecord) {
    return res.status(401).json({ error: "Invalid or expired access token." });
  }

  if (accessRecord.email !== email) {
    return res
      .status(403)
      .json({ error: "Access token does not match requested email." });
  }

  try {
    const tickets = await prisma.support.findMany({
      where: {
        user_email: email,
        status: "open",
      },
      orderBy: { time_opened: "desc" },
      include: {
        ticket_messages: {
          orderBy: { sent_at: "asc" },
        },
      },
    });

    res.status(200).json(tickets.map(formatTicket));
  } catch (err) {
    console.error("Error fetching anonymous support tickets:", err);
    res.status(500).json({ error: "Failed to fetch support tickets." });
  }
};

module.exports = {
  submitTicket,
  getUserTicketsByUserId,
  getTickets,
  replyToTicket,
  deleteTicket,
  closeExpiredTickets,
  closeTicket,
  getRecentTickets,
  submitAnonymousTicket,
  requestAnonymousTicketAccess,
  verifyAnonymousTicketAccess,
  getAnonymousTicketsByEmail,
};
