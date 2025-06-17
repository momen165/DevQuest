const db = require("../config/database");

/**
 * Submits a new support ticket or updates an existing open ticket for a user.
 * @param {object} req - The request object.
 * @param {string} req.body.message - The user's message for the ticket.
 * @param {string} req.user.user_id - The ID of the user submitting the ticket.
 * @param {object} res - The response object.
 * @returns {Promise<object>} - A promise that resolves with the response.
 */
const submitTicket = async (req, res) => {
  const { message } = req.body;
  const userId = req.user.user_id;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }

  try {
    // Check if there is an open support ticket for the user
    const checkQuery = `
      SELECT ticket_id
      FROM support
      WHERE user_email = (SELECT email FROM users WHERE user_id = $1)
      AND status = 'open'
      ORDER BY time_opened DESC
      LIMIT 1;
    `;
    const checkResult = await db.query(checkQuery, [userId]);

    if (checkResult.rows.length > 0) {
      // Update the existing open support ticket with a new message
      const existingTicketId = checkResult.rows[0].ticket_id;

      // Update expiration time to 24 hours from now
      const updateExpirationQuery = `
        UPDATE support
        SET expiration_time = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + interval '24 hours'
        WHERE ticket_id = $1
        RETURNING *;
      `;
      await db.query(updateExpirationQuery, [existingTicketId]);

      // Then insert the new message
      const insertMessageQuery = `
        INSERT INTO ticket_messages (ticket_id, sender_type, message_content)
        VALUES ($1, 'user', $2)
        RETURNING *;
      `;
      const insertMessageValues = [existingTicketId, message];
      const insertMessageResult = await db.query(
        insertMessageQuery,
        insertMessageValues,
      );

      console.log("Support ticket message added:", insertMessageResult.rows[0]);
      return res.status(200).json({
        message: "Support ticket message added successfully!",
        ticket: insertMessageResult.rows[0],
      });
    } else {
      // Create a new support ticket with 24 hour expiration
      const insertTicketQuery = `
        INSERT INTO support (user_message, user_email, time_opened, expiration_time, status)
        VALUES ($1, (SELECT email FROM users WHERE user_id = $2), 
                (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), 
                (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + interval '24 hours', 
                'open')
        RETURNING *;
      `;
      const insertTicketValues = [message, userId];
      const insertTicketResult = await db.query(
        insertTicketQuery,
        insertTicketValues,
      );
      const newTicketId = insertTicketResult.rows[0].ticket_id;

      // Add the user's initial message
      const insertMessageQuery = `
        INSERT INTO ticket_messages (ticket_id, sender_type, message_content)
        VALUES ($1, 'user', $2)
        RETURNING *;
      `;
      const insertMessageValues = [newTicketId, message];
      await db.query(insertMessageQuery, insertMessageValues);

      // Add the automatic response
      const autoReplyMessage = `Hello there!

Thank you for contacting DevQuest Support. This is an automated message to confirm we've received your inquiry.

Your Support Ticket ID is: #${newTicketId}

One of our administrators will review your message and respond as soon as possible. Please note that our typical response time is within 24 hours.

If you don't receive a response within 24 hours, please contact us at Support@devquest.com and include your Support Ticket ID (#${newTicketId}) in your email.

We appreciate your patience!

Best regards,
DevQuest Support Team`;

      const insertAutoReplyQuery = `
        INSERT INTO ticket_messages (ticket_id, sender_type, message_content)
        VALUES ($1, 'admin', $2)
        RETURNING *;
      `;
      await db.query(insertAutoReplyQuery, [newTicketId, autoReplyMessage]);

      // Fetch the complete ticket with all messages
      const getTicketQuery = `
        SELECT * FROM support WHERE ticket_id = $1;
      `;
      const getMessagesQuery = `
        SELECT * FROM ticket_messages WHERE ticket_id = $1 ORDER BY sent_at ASC;
      `;
      const ticketResult = await db.query(getTicketQuery, [newTicketId]);
      const messagesResult = await db.query(getMessagesQuery, [newTicketId]);

      const ticket = {
        ...ticketResult.rows[0],
        messages: messagesResult.rows,
      };

      return res.status(201).json({
        message: "Support ticket submitted successfully!",
        ticket: ticket,
      });
    }
  } catch (err) {
    console.error("Error submitting support ticket:", err);
    res.status(500).json({ error: "Failed to submit support ticket." });
  }
};

/**
 * Fetches open support tickets for a specific user.
 * @param {object} req - The request object.
 * @param {string} req.user.user_id - The ID of the user requesting the tickets.
 * @param {object} res - The response object.
 * @returns {Promise<object>} - A promise that resolves with the response.
 */
const getUserTicketsByUserId = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const query = `
      SELECT support.ticket_id, support.user_email, support.time_opened, support.expiration_time, support.status,
             ticket_messages.message_content, ticket_messages.sender_type, ticket_messages.sent_at
      FROM support
      JOIN users ON support.user_email = users.email
      LEFT JOIN ticket_messages ON support.ticket_id = ticket_messages.ticket_id
      WHERE users.user_id = $1
      AND support.status = 'open'
      ORDER BY support.time_opened DESC, ticket_messages.sent_at ASC;
    `;
    const values = [userId];
    const result = await db.query(query, values);

    const tickets = result.rows.reduce((acc, row) => {
      const {
        ticket_id,
        user_email,
        time_opened,
        expiration_time,
        status,
        message_content,
        sender_type,
        sent_at,
      } = row;
      if (!acc[ticket_id]) {
        acc[ticket_id] = {
          ticket_id,
          user_email,
          time_opened,
          expiration_time,
          status,
          messages: [],
        };
      }
      acc[ticket_id].messages.push({ message_content, sender_type, sent_at });
      return acc;
    }, {});

    res.status(200).json(Object.values(tickets));
  } catch (err) {
    console.error("Error fetching user support tickets:", err);
    res.status(500).json({ error: "Failed to fetch user support tickets." });
  }
};

/**
 * Fetches all support tickets (accessible only to admins).
 * @param {object} req - The request object.
 * @param {boolean} req.user.admin - Indicates if the requesting user is an admin.
 * @param {object} res - The response object.
 * @returns {Promise<object>} - A promise that resolves with the response.
 */
const getTickets = async (req, res) => {
  const isAdmin = req.user.admin;

  try {
    if (isAdmin) {
      const query = `
        SELECT support.ticket_id, support.user_email, support.time_opened, 
               support.expiration_time, support.status, support.closed_by, 
               support.closed_at, ticket_messages.message_content, 
               ticket_messages.sender_type, ticket_messages.sent_at
        FROM support
        LEFT JOIN ticket_messages ON support.ticket_id = ticket_messages.ticket_id
        ORDER BY support.time_opened DESC, ticket_messages.sent_at ASC;
      `;
      const result = await db.query(query);

      const tickets = result.rows.reduce((acc, row) => {
        const {
          ticket_id,
          user_email,
          time_opened,
          expiration_time,
          status,
          closed_by,
          closed_at,
          message_content,
          sender_type,
          sent_at,
        } = row;

        if (!acc[ticket_id]) {
          acc[ticket_id] = {
            ticket_id,
            user_email,
            time_opened,
            expiration_time,
            status,
            closed_by,
            closed_at,
            messages: [],
          };
        }
        if (message_content) {
          acc[ticket_id].messages.push({
            message_content,
            sender_type,
            sent_at,
          });
        }
        return acc;
      }, {});

      res.status(200).json(Object.values(tickets));
    } else {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }
  } catch (err) {
    console.error("Error fetching support tickets:", err);
    res.status(500).json({ error: "Failed to fetch support tickets." });
  }
};

/**
 * Adds a reply to a support ticket.
 * @param {object} req - The request object.
 * @param {string} req.params.ticketId - The ID of the ticket to reply to.
 * @param {string} req.body.reply - The reply message.
 * @param {boolean} req.user.admin - Indicates if the requesting user is an admin.
 * @param {object} res - The response object.
 * @returns {Promise<object>} - A promise that resolves with the response.
 */
const replyToTicket = async (req, res) => {
  const { ticketId } = req.params;
  const { reply } = req.body;
  const isAdmin = req.user.admin;
  const sender_type = isAdmin ? "admin" : "user";

  try {
    // Insert the reply
    const messageQuery = `
      INSERT INTO ticket_messages (ticket_id, sender_type, message_content)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const messageValues = [ticketId, sender_type, reply];
    const messageResult = await db.query(messageQuery, messageValues);

    // If the reply is from user, update the expiration time to 24 hours
    if (!isAdmin) {
      const updateExpirationQuery = `
        UPDATE support
        SET expiration_time = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + interval '24 hours'
        WHERE ticket_id = $1
        RETURNING *;
      `;
      await db.query(updateExpirationQuery, [ticketId]);
    }

    res.status(200).json(messageResult.rows[0]);
  } catch (err) {
    console.error("Error replying to support ticket:", err);
    res.status(500).json({ error: "Failed to reply to support ticket." });
  }
};

/**
 * Deletes a support ticket and its associated messages.
 * @param {object} req - The request object.
 * @param {string} req.params.ticketId - The ID of the ticket to delete.
 * @param {object} res - The response object.
 * @returns {Promise<object>} - A promise that resolves with the response.
 */
const deleteTicket = async (req, res) => {
  const { ticketId } = req.params;

  try {
    const query = `
      DELETE FROM support
      WHERE ticket_id = $1
      RETURNING *;
    `;
    const values = [ticketId];
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Support ticket not found." });
    }

    res
      .status(200)
      .json({
        message: "Support ticket and associated messages deleted successfully.",
      });
  } catch (err) {
    console.error("Error deleting support ticket:", err);
    res.status(500).json({ error: "Failed to delete support ticket." });
  }
};

/**
 * Closes any support tickets that have expired.
 * @returns {Promise<void>} - A promise indicating when the process completes.
 */
const closeExpiredTickets = async () => {
  try {
    const query = `
      UPDATE support
      SET status = 'closed',
          closed_by = 'auto',
          closed_at = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
      WHERE status = 'open'
      AND expiration_time < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
      RETURNING *;
    `;
    const result = await db.query(query);
    if (result.rows.length > 0) {
      console.log(`Closed ${result.rows.length} expired tickets`);
    }
  } catch (err) {
    console.error("Error closing expired tickets:", err);
  }
};

/**
 * Closes a specific support ticket for a user.
 * @param {object} req - The request object.
 * @param {string} req.params.ticketId - The ID of the ticket to close.
 * @param {string} req.user.user_id - The ID of the user closing the ticket.
 * @param {object} res - The response object.
 * @returns {Promise<object>} - A promise that resolves with the response.
 */
const closeTicket = async (req, res) => {
  const { ticketId } = req.params;
  const userId = req.user.user_id;

  try {
    // Verify the ticket belongs to the user before closing
    const verifyQuery = `
      SELECT ticket_id FROM support 
      WHERE ticket_id = $1 
      AND user_email = (SELECT email FROM users WHERE user_id = $2)
    `;
    const verifyResult = await db.query(verifyQuery, [ticketId, userId]);

    if (verifyResult.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Not authorized to close this ticket" });
    }

    const query = `
      UPDATE support
      SET status = 'closed',
          closed_by = 'user',
          closed_at = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
      WHERE ticket_id = $1
      RETURNING *;
    `;
    const result = await db.query(query, [ticketId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Support ticket not found." });
    }

    res.status(200).json({ message: "Support ticket closed successfully." });
  } catch (err) {
    console.error("Error closing support ticket:", err);
    res.status(500).json({ error: "Failed to close support ticket." });
  }
};

/**
 * Fetches recent support tickets (accessible only to admins).
 * @param {object} req - The request object.
 * @param {boolean} req.user.admin - Indicates if the requesting user is an admin.
 * @param {object} res - The response object.
 * @returns {Promise<object>} - A promise that resolves with the response.
 */
const getRecentTickets = async (req, res) => {
  const isAdmin = req.user.admin;

  try {
    if (isAdmin) {
      const query = `
        SELECT ticket_id, user_email, time_opened, status
        FROM support
        WHERE time_opened > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' - INTERVAL '24 hours')
        ORDER BY time_opened DESC
        LIMIT 5;
      `;
      const result = await db.query(query);
      res.status(200).json(result.rows);
    } else {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }
  } catch (err) {
    console.error("Error fetching recent tickets:", err);
    res.status(500).json({ error: "Failed to fetch recent tickets." });
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
};