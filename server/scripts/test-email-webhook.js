/**
 * Test script for email webhook functionality
 * This simulates incoming emails from Mailgun to test the webhook processing
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const axios = require("axios");
const crypto = require("crypto");
const FormData = require("form-data");

const BASE_URL = process.env.API_URL || "http://localhost:5000";
const API_KEY = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;

if (!API_KEY) {
  console.warn("⚠️  Warning: MAILGUN_WEBHOOK_SIGNING_KEY not found in .env");
  console.warn("   Webhook verification will fail if the server enforces it.");
}

// Generate a valid Mailgun signature
function generateSignature() {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const token = crypto.randomBytes(16).toString("hex");

  if (!API_KEY) {
    return { timestamp, token, signature: "dummy-signature" };
  }

  const value = timestamp + token;
  const signature = crypto
    .createHmac("sha256", API_KEY)
    .update(value)
    .digest("hex");

  return { timestamp, token, signature };
}

// Test data simulating Mailgun webhook payload
const getTestEmailData = () => {
  const sig = generateSignature();

  return {
    // Test 1: New support ticket (no ticket ID in subject)
    newTicket: {
      sender: "test-user@example.com",
      recipient: "momen@mail.dev-quest.me",
      subject: "I need help with my account",
      "body-plain":
        "Hello, I am having trouble logging into my account. Can you please help me?",
      "stripped-text":
        "Hello, I am having trouble logging into my account. Can you please help me?",
      timestamp: sig.timestamp,
      token: sig.token,
      signature: sig.signature,
    },

    // Test 2: Reply to existing ticket (with ticket ID)
    replyToTicket: {
      sender: "test-user@example.com",
      recipient: "support@mail.dev-quest.me",
      subject: "Re: DevQuest Support - New Reply to Ticket #123",
      "body-plain": "Thank you for your help! This solved my problem.",
      "stripped-text": "Thank you for your help! This solved my problem.",
      timestamp: sig.timestamp,
      token: sig.token + "-reply", // slight variation
      signature: sig.signature, // Reuse signature (invalid in real world but maybe ok for quick test if timestamp/token same, but let's regenerate)
    },
  };
};

async function testWebhook(testName, payloadData) {
  try {
    // Regenerate signature for each request to be safe regarding timestamps / unique tokens if server checks them
    const sig = generateSignature();
    const payload = { ...payloadData, ...sig };

    console.log(`\n🧪 Testing: ${testName}`);

    // Convert to FormData to simulate real Mailgun webhook
    const form = new FormData();
    for (const [key, value] of Object.entries(payload)) {
      form.append(key, value);
    }

    console.log("📤 Sending multipart/form-data payload...");

    const response = await axios.post(`${BASE_URL}/api/email-webhook`, form, {
      headers: {
        ...form.getHeaders(),
      },

      timeout: 10000,
    });

    console.log("✅ Response Status:", response.status);
    console.log("📥 Response Data:", response.data);
  } catch (error) {
    console.error("❌ Test Failed:", error.response?.data || error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
    }
  }
}

async function runTests() {
  console.log("🚀 Starting Webhook Tests...");
  console.log(`Target: ${BASE_URL}`);

  // Get fresh data with valid signatures
  const data = getTestEmailData();

  // Test 1: New ticket creation
  await testWebhook("New Ticket Creation", data.newTicket);

  // Test 2: Reply (Optional - comment out if you don't have ticket #123)
  // await testWebhook("Reply to Ticket", data.replyToTicket);
}

runTests().catch(console.error);
