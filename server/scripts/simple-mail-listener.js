/**
 * Simple Email Webhook Listener
 * Logs all incoming emails from Mailgun
 * Great for development with ngrok
 *
 * Usage:
 *   1. node scripts/simple-mail-listener.js
 *   2. In another terminal: ngrok http 3333
 *   3. Add ngrok URL to Mailgun route: https://your-ngrok-url.ngrok.io/email
 *   4. Send test emails and see them logged here
 */

const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = 3333;

// Configure multer for form data
const upload = multer();

// Fallback parsers in case Mailgun sends URL-encoded or JSON payloads
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
};

function log(title, content, color = colors.blue) {
  console.log(
    `\n${color}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
  );
  console.log(`${color}${colors.bright}${title}${colors.reset}`);
  console.log(
    `${color}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
  );
  console.log(content);
}

function verifyWebhookSignature(body = {}) {
  const { token, timestamp, signature } = body;
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;

  if (!signingKey) {
    log(
      "⚠️  WARNING",
      "MAILGUN_WEBHOOK_SIGNING_KEY not set in .env",
      colors.yellow,
    );
    return null;
  }

  if (!token || !timestamp || !signature) {
    log("❌ ERROR", "Missing required signature fields", colors.red);
    return false;
  }

  const value = timestamp + token;
  const hash = crypto
    .createHmac("sha256", signingKey)
    .update(value)
    .digest("hex");
  const isValid = hash === signature;

  return isValid;
}

// Main webhook endpoint
app.post("/email", upload.any(), (req, res) => {
  try {
    const email = req.body || {};
    const timestamp = new Date().toLocaleString();

    if (Object.keys(email).length === 0) {
      log(
        "⚠️  EMPTY BODY",
        `No fields parsed. Check Mailgun route and request Content-Type.\nHeaders: ${JSON.stringify(
          req.headers,
          null,
          2,
        )}`,
        colors.yellow,
      );
    }

    // Verify signature
    const isValid = verifyWebhookSignature(email);
    const signatureStatus =
      isValid === null
        ? `${colors.yellow}SKIPPED (no signing key)${colors.reset}`
        : isValid
          ? `${colors.green}✓ VALID${colors.reset}`
          : `${colors.red}✗ INVALID${colors.reset}`;

    log(
      `📧 INCOMING EMAIL [${timestamp}]`,
      `Signature: ${signatureStatus}`,
      colors.cyan,
    );

    // Display email details
    console.log(`
${colors.bright}From:${colors.reset}         ${email.sender || email.from || "N/A"}
${colors.bright}To:${colors.reset}           ${email.recipient || "N/A"}
${colors.bright}Subject:${colors.reset}      ${email.subject || "(no subject)"}
${colors.bright}Message ID:${colors.reset}   ${email["Message-Id"] || "N/A"}
${colors.bright}Timestamp:${colors.reset}    ${email.timestamp || "N/A"}
    `);

    // Display email body
    const body =
      email["stripped-text"] ||
      email["body-plain"] ||
      email.text ||
      "(no body)";
    log("📝 MESSAGE BODY", body, colors.blue);

    // Display attachments if any
    if (req.files && req.files.length > 0) {
      const attachmentInfo = req.files
        .map(
          (f) =>
            `  • ${f.originalname || f.fieldname} (${(f.size / 1024).toFixed(2)} KB)`,
        )
        .join("\n");
      log("📎 ATTACHMENTS", attachmentInfo, colors.yellow);
    }

    // Display all custom variables and metadata
    const customVars = Object.keys(email).filter((k) => k.startsWith("v:"));
    if (customVars.length > 0) {
      const vars = customVars.map((k) => `  • ${k}: ${email[k]}`).join("\n");
      log("🏷️  CUSTOM VARIABLES", vars, colors.cyan);
    }

    // Respond to Mailgun
    res.json({
      status: "received",
      signatureValid: isValid !== false,
      timestamp: new Date().toISOString(),
    });

    console.log(`${colors.green}✅ Email logged successfully${colors.reset}\n`);
  } catch (error) {
    console.error(
      `${colors.red}❌ Error processing email:${colors.reset}`,
      error.message,
    );
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "listening",
    endpoint: "/email",
    signingKeyConfigured: !!process.env.MAILGUN_WEBHOOK_SIGNING_KEY,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
${colors.bright}${colors.green}🚀 Email Listener Started${colors.reset}

${colors.bright}Local URL:${colors.reset}     http://localhost:${PORT}
${colors.bright}Webhook endpoint:${colors.reset} http://localhost:${PORT}/email

${colors.bright}📍 To use with Mailgun:${colors.reset}
  1. Start ngrok: ${colors.cyan}ngrok http ${PORT}${colors.reset}
  2. Copy the ngrok URL (e.g., https://xxx.ngrok.io)
  3. Add to Mailgun Route:
     - Filter: ${colors.yellow}true${colors.reset} (catch all)
     - Action: ${colors.yellow}forward("https://xxx.ngrok.io/email")${colors.reset}
  4. Send a test email and watch it appear here!

${colors.bright}Configuration:${colors.reset}
  Signing Key: ${process.env.MAILGUN_WEBHOOK_SIGNING_KEY ? "✅ Loaded" : "❌ Not found in .env"}
  Domain: ${process.env.MAILGUN_DOMAIN || "Not set"}

${colors.yellow}Press Ctrl+C to stop${colors.reset}
  `);
});
