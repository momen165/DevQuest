const express = require("express");
const crypto = require("crypto");
const multer = require("multer");
const router = express.Router();
const prisma = require("../config/prisma");

// Configure multer to handle multipart/form-data from Mailgun
const upload = multer();

const {
  categorizeTicket,
  sendAutoResponse,
  routeTicket,
} = require("../utils/auto-response.utils");

function verifyMailgunWebhook(apiKey, token, timestamp, signature) {
  const value = timestamp + token;
  const hash = crypto.createHmac("sha256", apiKey).update(value).digest("hex");
  return hash === signature;
}

const normalizeEmail = (value) => {
  const input = String(value || "").trim().toLowerCase();
  const match = input.match(/<([^>]+)>/);
  return match ? match[1].trim().toLowerCase() : input;
};

const addHours = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000);

const parseSlaToHours = (sla) => {
  const normalized = String(sla || "").trim().toLowerCase();
  const match = normalized.match(/^(\d+)h$/);
  if (!match) return 24;
  return Number.parseInt(match[1], 10);
};

/**
 * Webhook endpoint to handle incoming email replies from Mailgun
 */
router.post("/email-webhook", upload.any(), async (req, res) => {
  try {
    console.log("Received email webhook:", JSON.stringify(req.body, null, 2));

    const { token, timestamp, signature } = req.body;
    if (
      token &&
      timestamp &&
      signature &&
      process.env.MAILGUN_WEBHOOK_SIGNING_KEY
    ) {
      const isValid = verifyMailgunWebhook(
        process.env.MAILGUN_WEBHOOK_SIGNING_KEY,
        token,
        timestamp,
        signature
      );
      if (!isValid) {
        console.warn("Invalid Mailgun webhook signature");
        return res.status(401).json({ error: "Invalid webhook signature" });
      }
      console.log("Webhook signature verified successfully");
    } else {
      console.log(
        "Webhook signature verification skipped (no signing key configured)"
      );
    }

    await processIncomingEmail(req.body);

    res.status(200).json({ success: true, processed: 1 });
  } catch (error) {
    console.error("Error processing email webhook:", error);
    res.status(500).json({ error: "Failed to process email webhook" });
  }
});

async function processIncomingEmail(message) {
  try {
    const fromRaw = message.sender || message.from || message.From;
    const from = normalizeEmail(fromRaw);
    const subject = message.subject || message.Subject || "";
    const textContent =
      message["stripped-text"] ||
      message["body-plain"] ||
      message.text ||
      message.TextPart ||
      "";

    console.log(`Processing email from: ${from}, subject: "${subject}"`);

    const ticketIdMatch = subject.match(/#(\d+)/);

    if (!ticketIdMatch) {
      console.log("No ticket ID found in subject, treating as new ticket");
      await handleNewSupportEmail(from, subject, textContent);
      return;
    }

    const ticketId = Number.parseInt(ticketIdMatch[1], 10);
    console.log(`Found ticket ID: ${ticketId}`);

    const ticket = await prisma.support.findUnique({
      where: { ticket_id: ticketId },
      select: {
        ticket_id: true,
        user_email: true,
        status: true,
      },
    });

    if (!ticket) {
      console.log(`Ticket #${ticketId} not found`);
      return;
    }

    if (from !== normalizeEmail(ticket.user_email)) {
      console.log(
        `Email from ${from} doesn't match ticket owner ${ticket.user_email}`
      );
      return;
    }

    if (ticket.status === "closed") {
      await prisma.support.update({
        where: { ticket_id: ticketId },
        data: {
          status: "open",
          expiration_time: addHours(new Date(), 24),
        },
      });
    }

    const cleanContent = cleanEmailContent(textContent);

    await prisma.ticket_messages.create({
      data: {
        ticket_id: ticketId,
        sender_type: "user",
        message_content: cleanContent,
      },
    });

    await prisma.support.update({
      where: { ticket_id: ticketId },
      data: { expiration_time: addHours(new Date(), 24) },
    });

    console.log(`Successfully added email reply to ticket #${ticketId}`);
  } catch (error) {
    console.error("Error processing individual email:", error);
  }
}

async function handleNewSupportEmail(from, subject, content) {
  try {
    const existingTicket = await prisma.support.findFirst({
      where: { user_email: from, status: "open" },
      orderBy: { time_opened: "desc" },
      select: { ticket_id: true },
    });

    if (existingTicket) {
      await prisma.ticket_messages.create({
        data: {
          ticket_id: existingTicket.ticket_id,
          sender_type: "user",
          message_content: content,
        },
      });

      console.log(`Added email to existing ticket #${existingTicket.ticket_id}`);
      return;
    }

    const newTicket = await prisma.support.create({
      data: {
        user_email: from,
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
        message_content: content,
      },
    });

    // Smart categorization and auto-response for new tickets
    const analysis = categorizeTicket(subject, content);
    const routing = routeTicket(analysis.category, analysis.priority);
    const slaHours = parseSlaToHours(routing.sla);

    await prisma.support.update({
      where: { ticket_id: newTicket.ticket_id },
      data: {
        category: analysis.category,
        priority: analysis.priority,
        assigned_to: routing.assignTo,
        sla_target: addHours(new Date(), slaHours),
      },
    });

    if (analysis.confidence > 0.6) {
      await sendAutoResponse(
        newTicket.ticket_id,
        from,
        analysis.category,
        analysis.autoResponse
      );

      await prisma.ticket_messages.create({
        data: {
          ticket_id: newTicket.ticket_id,
          sender_type: "system",
          message_content: `Auto-response sent (${analysis.category}): ${analysis.autoResponse.substring(0, 100)}...`,
          is_auto_response: true,
        },
      });
    }

    console.log(
      `Created new ticket #${newTicket.ticket_id} from email with category: ${analysis.category} (confidence: ${analysis.confidence})`
    );
  } catch (error) {
    console.error("Error handling new support email:", error);
  }
}

function cleanEmailContent(content) {
  const lines = String(content || "").split("\n");
  const cleanedLines = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

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
