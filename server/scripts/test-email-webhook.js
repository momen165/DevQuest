/**
 * Test script for email webhook functionality
 * This simulates incoming emails from Mailgun to test the webhook processing
 */

const axios = require("axios");

const BASE_URL = "https://3716aff38871.ngrok-free.app"; // Test with your ngrok URL

// Test data simulating Mailgun webhook payload
const testEmailData = {
  // Test 1: New support ticket (no ticket ID in subject)
  newTicket: {
    sender: "test-user@example.com",
    recipient: "support@mail.dev-quest.me",
    subject: "I need help with my account",
    "body-plain":
      "Hello, I am having trouble logging into my account. Can you please help me?",
    "stripped-text":
      "Hello, I am having trouble logging into my account. Can you please help me?",
    timestamp: Math.floor(Date.now() / 1000).toString(),
    token: "test-token-" + Date.now(),
    signature: "test-signature",
  },

  // Test 2: Reply to existing ticket (with ticket ID)
  replyToTicket: {
    sender: "test-user@example.com",
    recipient: "support@mail.dev-quest.me",
    subject: "Re: DevQuest Support - New Reply to Ticket #123",
    "body-plain": "Thank you for your help! This solved my problem.",
    "stripped-text": "Thank you for your help! This solved my problem.",
    timestamp: Math.floor(Date.now() / 1000).toString(),
    token: "test-token-" + Date.now(),
    signature: "test-signature",
  },
};

async function testWebhook(testName, payload) {
  try {
    console.log(`\n🧪 Testing: ${testName}`);
    console.log("📤 Sending payload:", JSON.stringify(payload, null, 2));

    const response = await axios.post(
      `${BASE_URL}/api/email-webhook`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

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
  console.log("🚀 Starting Email Webhook Tests...");
  console.log("📍 Target URL:", `${BASE_URL}/api/email-webhook`);

  // Test 1: New ticket creation
  await testWebhook("New Support Ticket Creation", testEmailData.newTicket);

  // Wait a bit between tests
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Test 2: Reply to existing ticket (this will fail if ticket #123 doesn't exist)
  await testWebhook("Reply to Existing Ticket", testEmailData.replyToTicket);

  console.log("\n🏁 Email webhook tests completed!");
  console.log("\n📝 Notes:");
  console.log("- Test 1 should create a new support ticket");
  console.log("- Test 2 may fail if ticket #123 doesn't exist (expected)");
  console.log("- Check your database for new tickets and messages");
  console.log("- Monitor server logs for detailed processing information");
}

// Run the tests
runTests().catch(console.error);
