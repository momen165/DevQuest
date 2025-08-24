const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from server directory (go up one level since we're in scripts/)
dotenv.config({ path: path.join(__dirname, "../.env") });

const {
  sendSupportReplyNotification,
  sendSupportTicketConfirmation,
} = require("../utils/email.utils");

async function testMailgunMigration() {
  console.log("🧪 Testing Mailgun Migration...\n");

  // Check if required environment variables are set
  console.log("📋 Environment Check:");
  console.log(
    `MAILGUN_API_KEY: ${process.env.MAILGUN_API_KEY ? "✅ Set" : "❌ Missing"}`
  );
  console.log(
    `MAILGUN_DOMAIN: ${process.env.MAILGUN_DOMAIN ? "✅ Set" : "❌ Missing"}`
  );
  console.log(
    `SENDER_EMAIL_SUPPORT: ${
      process.env.SENDER_EMAIL_SUPPORT ? "✅ Set" : "❌ Missing"
    }`
  );
  console.log("");

  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    console.log("❌ Missing required Mailgun configuration. Please set:");
    console.log("   - MAILGUN_API_KEY");
    console.log("   - MAILGUN_DOMAIN");
    console.log("\nAdd these to your server/.env file");
    return;
  }

  try {
    // Test ticket confirmation email (this is safer to test)
    console.log("📧 Testing Support Ticket Confirmation Email...");
    const testEmail = process.env.SENDER_EMAIL_SUPPORT || "test@example.com";
    const testUser = "Test User";
    const testTicketId = "TEST-" + Date.now();

    const confirmationResult = await sendSupportTicketConfirmation(
      testEmail,
      testUser,
      testTicketId
    );

    if (confirmationResult) {
      console.log("✅ Support ticket confirmation email test PASSED");
    } else {
      console.log("❌ Support ticket confirmation email test FAILED");
    }

    console.log("\n📧 Testing Support Reply Notification Email...");
    const replyResult = await sendSupportReplyNotification(
      testEmail,
      testUser,
      testTicketId,
      "Test Admin",
      "This is a test reply to verify the Mailgun migration is working correctly."
    );

    if (replyResult) {
      console.log("✅ Support reply notification email test PASSED");
    } else {
      console.log("❌ Support reply notification email test FAILED");
    }

    console.log("\n🎉 Mailgun migration test completed!");
    console.log(
      "Note: Check your email inbox to verify messages were received."
    );
  } catch (error) {
    console.error("❌ Error during Mailgun migration test:", error);
  }
}

// Run the test
testMailgunMigration()
  .then(() => {
    console.log("\n✨ Test script finished. Exiting...");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test script failed:", error);
    process.exit(1);
  });
