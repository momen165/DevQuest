const db = require('../config/database');

const submitTicket = async (req, res) => {
  const { message } = req.body;
  const userId = req.user.user_id;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
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
      const insertMessageQuery = `
        INSERT INTO ticket_messages (ticket_id, sender_type, message_content)
        VALUES ($1, 'user', $2)
        RETURNING *;
      `;
      const insertMessageValues = [existingTicketId, message];
      const insertMessageResult = await db.query(insertMessageQuery, insertMessageValues);
      console.log('Support ticket message added:', insertMessageResult.rows[0]);
      return res.status(200).json({ message: 'Support ticket message added successfully!', ticket: insertMessageResult.rows[0] });
    } else {
      // Create a new support ticket
      const insertTicketQuery = `
        INSERT INTO support (user_message, user_email, time_opened, expiration_time, status)
        VALUES ($1, (SELECT email FROM users WHERE user_id = $2), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + interval '24 hours', 'open')
        RETURNING *;
      `;
      const insertTicketValues = [message, userId];
      const insertTicketResult = await db.query(insertTicketQuery, insertTicketValues);
      const newTicketId = insertTicketResult.rows[0].ticket_id;

      // Add the initial message to the ticket_messages table
      const insertMessageQuery = `
        INSERT INTO ticket_messages (ticket_id, sender_type, message_content)
        VALUES ($1, 'user', $2)
        RETURNING *;
      `;
      const insertMessageValues = [newTicketId, message];
      const insertMessageResult = await db.query(insertMessageQuery, insertMessageValues);
      console.log('Support ticket submitted:', insertTicketResult.rows[0]);
      return res.status(201).json({ message: 'Support ticket submitted successfully!', ticket: insertTicketResult.rows[0], message: insertMessageResult.rows[0] });
    }
  } catch (err) {
    console.error('Error submitting support ticket:', err);
    res.status(500).json({ error: 'Failed to submit support ticket.' });
  }
};

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
      ORDER BY support.time_opened DESC, ticket_messages.sent_at ASC;
    `;
    const values = [userId];
    const result = await db.query(query, values);

    const tickets = result.rows.reduce((acc, row) => {
      const { ticket_id, user_email, time_opened, expiration_time, status, message_content, sender_type, sent_at } = row;
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
    console.error('Error fetching user support tickets:', err);
    res.status(500).json({ error: 'Failed to fetch user support tickets.' });
  }
};

const getTickets = async (req, res) => {
  const isAdmin = req.user.admin;

  try {
    let query;
    let values;

    if (isAdmin) {
      query = `
        SELECT support.ticket_id, support.user_email, support.time_opened, support.expiration_time, support.status,
               ticket_messages.message_content, ticket_messages.sender_type, ticket_messages.sent_at
        FROM support
        LEFT JOIN ticket_messages ON support.ticket_id = ticket_messages.ticket_id
        ORDER BY support.time_opened DESC, ticket_messages.sent_at ASC;
      `;
      values = [];
    } else {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const result = await db.query(query, values);

    const tickets = result.rows.reduce((acc, row) => {
      const { ticket_id, user_email, time_opened, expiration_time, status, message_content, sender_type, sent_at } = row;
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
    console.error('Error fetching support tickets:', err);
    res.status(500).json({ error: 'Failed to fetch support tickets.' });
  }
};

const replyToTicket = async (req, res) => {
  const { ticketId } = req.params;
  const { reply } = req.body;

  try {
    const query = `
      INSERT INTO ticket_messages (ticket_id, sender_type, message_content)
      VALUES ($1, 'admin', $2)
      RETURNING *;
    `;
    const values = [ticketId, reply];
    const result = await db.query(query, values);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error replying to support ticket:', err);
    res.status(500).json({ error: 'Failed to reply to support ticket.' });
  }
};

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
      return res.status(404).json({ error: 'Support ticket not found.' });
    }

    res.status(200).json({ message: 'Support ticket and associated messages deleted successfully.' });
  } catch (err) {
    console.error('Error deleting support ticket:', err);
    res.status(500).json({ error: 'Failed to delete support ticket.' });
  }
};

module.exports = {
  submitTicket,
  getUserTicketsByUserId,
  getTickets,
  replyToTicket,
  deleteTicket,
};
