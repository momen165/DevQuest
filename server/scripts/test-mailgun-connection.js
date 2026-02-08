const dotenv = require("dotenv");
const path = require("path");
const Mailgun = require("mailgun.js");
const formData = require("form-data");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

async function testMailgunConnection() {
  console.log("🔍 Testing Mailgun API Connection...\n");

  // Check environment variables
  console.log("📋 Configuration:");
  console.log(
    `API Key: ${
      process.env.MAILGUN_API_KEY
        ? `${process.env.MAILGUN_API_KEY.substring(0, 15)}...`
        : "❌ Missing"
    }`,
  );
  console.log(`Domain: ${process.env.MAILGUN_DOMAIN || "❌ Missing"}`);
  console.log(
    `API URL: ${
      process.env.MAILGUN_API_URL || "https://api.mailgun.net (default)"
    }\n`,
  );

  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    console.log("❌ Missing required configuration");
    return;
  }

  try {
    // Initialize Mailgun client
    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY,
      url: process.env.MAILGUN_API_URL || "https://api.mailgun.net",
    });

    console.log("🌐 Testing API connection...");

    // Try to get domain info (this tests both API key and domain)
    const domainInfo = await mg.domains.get(process.env.MAILGUN_DOMAIN);
    console.log("✅ API connection successful!");
    console.log("📊 Domain info:", {
      name: domainInfo.name,
      state: domainInfo.state,
      type: domainInfo.type,
    });
  } catch (error) {
    console.log("❌ API connection failed:");
    console.log("Status:", error.status);
    console.log("Message:", error.message);
    console.log("Details:", error.details);

    if (error.status === 401) {
      console.log("\n💡 Possible issues:");
      console.log("1. Invalid API key");
      console.log("2. Wrong API region (try US vs EU endpoints)");
      console.log("3. API key doesn't have required permissions");
    } else if (error.status === 404) {
      console.log("\n💡 Possible issues:");
      console.log("1. Domain not found in your Mailgun account");
      console.log("2. Domain name mismatch");
      console.log("3. Domain not added to Mailgun yet");
    }
  }
}

testMailgunConnection()
  .then(() => {
    console.log("\n✨ Connection test completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test failed:", error);
    process.exit(1);
  });
