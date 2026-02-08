/**
 * Simple test to check if the server is responding at all
 */

const axios = require("axios");

async function testBasicEndpoint() {
  try {
    console.log("🧪 Testing basic server health...");

    // Test a simple GET request to see if server is responsive
    const response = await axios.get("http://localhost:5000/api/health", {
      timeout: 5000,
    });

    console.log("✅ Server is responding!");
    console.log("Status:", response.status);
    console.log("Data:", response.data);
  } catch (error) {
    console.error("❌ Server test failed:", error.message);
    console.error("Error code:", error.code);
    console.error("Error config:", error.config?.url);

    if (error.code === "ECONNREFUSED") {
      console.error(
        "🔴 Server is not running or not accessible on localhost:5000",
      );
    } else if (error.code === "ENOTFOUND") {
      console.error("🔴 Cannot resolve localhost");
    } else if (error.code === "ETIMEDOUT") {
      console.error("🔴 Connection timeout");
    } else {
      console.error("🔴 Other error:", error.response?.status || "Unknown");
      if (error.response) {
        console.error("Response headers:", error.response.headers);
      }
    }
  }
}

async function testWebhookEndpoint() {
  try {
    console.log("\n🧪 Testing webhook endpoint...");

    const testPayload = {
      sender: "test@example.com",
      subject: "Test webhook",
      "body-plain": "Test message",
    };

    const response = await axios.post(
      "http://localhost:5000/api/email-webhook",
      testPayload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      },
    );

    console.log("✅ Webhook responded!");
    console.log("Status:", response.status);
    console.log("Data:", response.data);
  } catch (error) {
    console.error("❌ Webhook test failed:", error.message);

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

async function runTests() {
  await testBasicEndpoint();
  await testWebhookEndpoint();
}

runTests().catch(console.error);
