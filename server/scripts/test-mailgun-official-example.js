const dotenv = require("dotenv");
const path = require("path");
const FormData = require("form-data");
const Mailgun = require("mailgun.js");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

async function sendSimpleMessage() {
  console.log("🧪 Testing Mailgun with Official Example...\n");

  // Check configuration
  console.log("📋 Configuration:");
  console.log(
    `API Key: ${
      process.env.MAILGUN_API_KEY
        ? `${process.env.MAILGUN_API_KEY.substring(0, 15)}...`
        : "❌ Missing"
    }`
  );
  console.log(`Domain: ${process.env.MAILGUN_DOMAIN || "❌ Missing"}`);
  console.log(`EU Endpoint: https://api.eu.mailgun.net\n`);

  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({
    username: "api",
    key: process.env.MAILGUN_API_KEY,
    // When you have an EU-domain, you must specify the endpoint:
    url: "https://api.eu.mailgun.net",
  });

  try {
    console.log("📧 Sending test email...");

    const data = await mg.messages.create("dev-quest.me", {
      from: "DevQuest Support <postmaster@mail.dev-quest.me>",
      to: ["Momen Aabed <momendw@gmail.com>"],
      subject: "Hello Momen - Mailgun Test",
      text: "Congratulations Momen! Your Mailgun integration is working correctly. The migration from  has been successful!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366F1;">🎉 Mailgun Integration Success!</h2>
          <p>Hi Momen,</p>
          <p>Congratulations! Your Mailgun integration is working correctly.</p>
          <p>The migration from  to Mailgun has been completed successfully!</p>
          <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>✅ What's working:</strong>
            <ul>
              <li>Mailgun API connection</li>
              <li>EU endpoint configuration</li>
              <li>Domain verification</li>
              <li>Email sending functionality</li>
            </ul>
          </div>
          <p>Best regards,<br>DevQuest Support System</p>
        </div>
      `,
    });

    console.log("✅ Email sent successfully!");
    console.log("📊 Response data:", {
      id: data.id,
      message: data.message,
    });
  } catch (error) {
    console.log("❌ Error sending email:");
    console.log("Status:", error.status);
    console.log("Message:", error.message);
    console.log("Details:", error.details);

    if (error.status === 401) {
      console.log("\n💡 API Key Issues:");
      console.log(
        "- Make sure you're using the correct Private API key from Mailgun dashboard"
      );
      console.log("- Verify the key starts with 'key-'");
      console.log("- Check if you're using the right account/region");
    }
  }
}

sendSimpleMessage()
  .then(() => {
    console.log("\n✨ Test completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test failed:", error);
    process.exit(1);
  });
