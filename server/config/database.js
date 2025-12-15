const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Cache SSL certificate to avoid repeated file reads
let cachedCA = null;
const certPath = path.join(__dirname, "../certs/ca.pem");

// Read certificate synchronously only once at startup
if (fs.existsSync(certPath)) {
  try {
    cachedCA = fs.readFileSync(certPath).toString();
  } catch (err) {
    console.error("Failed to read SSL certificate:", err);
  }
}

// Configure database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME || "defaultdb",
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 10732,
  ssl: {
    rejectUnauthorized: true,
    ...(cachedCA && { ca: cachedCA }),
  },

  max: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  query_timeout: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Add event listeners for connection issues
pool.on("error", (err) => {
  console.error("Unexpected database error:", err);
  // Don't exit process, allow for reconnection attempt
});

// Export query and connect methods
module.exports = {
  query: (text, params) => pool.query(text, params), // Keep original query for direct use if needed
  connect: () => pool.connect(), // Export connect method for explicit client acquisition
  pool, // Export the pool itself for direct access if needed
};
