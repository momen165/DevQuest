const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../config/database");
const {
  categorizeTicket,
  sendAutoResponse,
  routeTicket,
} = require("../utils/auto-response.utils");

/**
 * Verify that the webhook request came from Mailgun
 * @param {string} apiKey - Mailgun API key
 * @param {string} token - Token from webhook
 * @param {string} timestamp - Timestamp from webhook
 * @param {string} signature - Signature from webhook
 * @returns {boolean} - True if signature is valid
 */
function verifyMailgunWebhook(apiKey, token, timestamp, signature) {
  const value = timestamp + token;
  const hash = crypto.createHmac("sha256", apiKey).update(value).digest("hex");
  return hash === signature;
}

/**
 * Webhook endpoint to handle incoming email replies from Mailgun
 * This endpoint receives emails sent to support@mail.dev-quest.me and automatically
 * adds them as replies to the corresponding support tickets
 */
router.post("/email-webhook", async (req, res) => {
  try {
    console.log("Received email webhook:", JSON.stringify(req.body, null, 2));

    // Verify webhook authenticity (optional but recommended for production)
    const { token, timestamp, signature } = req.body;
    if (
      token &&
      timestamp &&
      signature &&
      process.env.MAILGUN_API_KEY &&
      process.env.NODE_ENV === "production"
    ) {
      const isValid = verifyMailgunWebhook(
        process.env.MAILGUN_API_KEY,
        token,
        timestamp,
        signature
      );
      if (!isValid) {
        console.warn("Invalid Mailgun webhook signature");
        return res.status(401).json({ error: "Invalid webhook signature" });
      }
    } else if (process.env.NODE_ENV !== "production") {
      console.log("Development mode: Skipping webhook signature verification");
    }

    // Mailgun sends individual message data directly in the body
    const messageData = req.body;

    await processIncomingEmail(messageData);

    res.status(200).json({ success: true, processed: 1 });
  } catch (error) {
    console.error("Error processing email webhook:", error);
    res.status(500).json({ error: "Failed to process email webhook" });
  }
});

async function processIncomingEmail(message) {
  try {
    // Mailgun webhook data structure - handle multiple possible field names
    const from = message.sender || message.from || message.From;
    const subject = message.subject || message.Subject || "";
    // Prefer stripped-text (cleaner) over body-plain, fallback to other formats
    const textContent =
      message["stripped-text"] ||
      message["body-plain"] ||
      message.text ||
      message.TextPart ||
      "";

    console.log(`Processing email from: ${from}, subject: "${subject}"`);

    // Extract ticket ID from subject line (format: "Re: DevQuest Support - New Reply to Ticket #123")
    const ticketIdMatch = subject.match(/#(\d+)/);

    if (!ticketIdMatch) {
      console.log("No ticket ID found in subject, treating as new ticket");
      await handleNewSupportEmail(from, subject, textContent);
      return;
    }

    const ticketId = parseInt(ticketIdMatch[1]);
    console.log(`Found ticket ID: ${ticketId}`);

    // Check if the ticket exists and get the user email
    const ticketQuery = `
      SELECT ticket_id, user_email, status FROM support 
      WHERE ticket_id = $1;
    `;
    const ticketResult = await db.query(ticketQuery, [ticketId]);

    if (ticketResult.rows.length === 0) {
      console.log(`Ticket #${ticketId} not found`);
      return;
    }

    const ticket = ticketResult.rows[0];

    // Verify the email is from the ticket owner
    if (from.toLowerCase() !== ticket.user_email.toLowerCase()) {
      console.log(
        `Email from ${from} doesn't match ticket owner ${ticket.user_email}`
      );
      return;
    }

    // If ticket is closed, reopen it
    if (ticket.status === "closed") {
      await db.query(
        `UPDATE support SET status = 'open', 
         expiration_time = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + interval '24 hours'
         WHERE ticket_id = $1`,
        [ticketId]
      );
    }

    // Clean the email content (remove quoted replies, signatures, etc.)
    const cleanContent = cleanEmailContent(textContent);

    // Add the reply to the ticket
    const insertMessageQuery = `
      INSERT INTO ticket_messages (ticket_id, sender_type, message_content)
      VALUES ($1, 'user', $2)
      RETURNING *;
    `;

    await db.query(insertMessageQuery, [ticketId, cleanContent]);

    // Update expiration time
    await db.query(
      `UPDATE support SET expiration_time = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + interval '24 hours'
       WHERE ticket_id = $1`,
      [ticketId]
    );

    console.log(`Successfully added email reply to ticket #${ticketId}`);
  } catch (error) {
    console.error("Error processing individual email:", error);
  }
}

async function handleNewSupportEmail(from, subject, content) {
  try {
    // Check if there's an existing open ticket for this email
    const existingTicketQuery = `
      SELECT ticket_id FROM support 
      WHERE user_email = $1 AND status = 'open'
      ORDER BY time_opened DESC LIMIT 1;
    `;

    const existingResult = await db.query(existingTicketQuery, [from]);

    if (existingResult.rows.length > 0) {
      // Add to existing ticket
      const ticketId = existingResult.rows[0].ticket_id;

      await db.query(
        `INSERT INTO ticket_messages (ticket_id, sender_type, message_content)
         VALUES ($1, 'user', $2)`,
        [ticketId, content]
      );

      console.log(`Added email to existing ticket #${ticketId}`);
    } else {
      // Create new ticket
      const newTicketQuery = `
        INSERT INTO support (user_email, time_opened, expiration_time, status)
        VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + interval '24 hours', 'open')
        RETURNING ticket_id;
      `;

      const newTicketResult = await db.query(newTicketQuery, [from]);
      const newTicketId = newTicketResult.rows[0].ticket_id;

      await db.query(
        `INSERT INTO ticket_messages (ticket_id, sender_type, message_content)
         VALUES ($1, 'user', $2)`,
        [newTicketId, content]
      );

      // Smart categorization and auto-response for new tickets
      const analysis = categorizeTicket(subject, content);
      const routing = routeTicket(analysis.category, analysis.priority);

      // Update ticket with category and routing info
      await db.query(
        `UPDATE support SET 
         category = $1, priority = $2, assigned_to = $3, sla_target = CURRENT_TIMESTAMP + interval '${routing.sla}'
         WHERE ticket_id = $4`,
        [analysis.category, analysis.priority, routing.assignTo, newTicketId]
      );

      // Send auto-response if confidence is high enough
      if (analysis.confidence > 0.6) {
        await sendAutoResponse(
          newTicketId,
          from,
          analysis.category,
          analysis.autoResponse
        );

        // Log auto-response in ticket messages
        await db.query(
          `INSERT INTO ticket_messages (ticket_id, sender_type, message_content, is_auto_response)
           VALUES ($1, 'system', $2, true)`,
          [
            newTicketId,
            `Auto-response sent (${
              analysis.category
            }): ${analysis.autoResponse.substring(0, 100)}...`,
          ]
        );
      }

      console.log(
        `Created new ticket #${newTicketId} from email with category: ${analysis.category} (confidence: ${analysis.confidence})`
      );
    }
  } catch (error) {
    console.error("Error handling new support email:", error);
  }
}

function cleanEmailContent(content) {
  // Remove common email signatures and quoted replies
  const lines = content.split("\n");
  const cleanedLines = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Stop at common reply indicators
    if (
      trimmedLine.startsWith(">") ||
      (trimmedLine.startsWith("On ") && trimmedLine.includes("wrote:")) ||
      trimmedLine.includes("-----Original Message-----") ||
      (trimmedLine.includes("From:") && trimmedLine.includes("Sent:")) ||
      trimmedLine === "--" ||
      trimmedLine.startsWith("Best regards") ||
      trimmedLine.startsWith("Sincerely") ||
      trimmedLine.startsWith("Thanks")
    ) {
      break;
    }

    cleanedLines.push(line);
  }

  return cleanedLines.join("\n").trim();
}

module.exports = router;
