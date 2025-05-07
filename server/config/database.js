const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Configure database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME || "defaultdb", // Default to 'defaultdb' if not specified
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 10732, // Default to Aiven's port if not specified
  // Configure SSL for Aiven PostgreSQL
  ssl: {
    rejectUnauthorized: true, // Validate SSL certificate (more secure)
    // Check if CA certificate file exists and use it
    ...(fs.existsSync(path.join(__dirname, "../certs/ca.pem")) && {
      ca: fs.readFileSync(path.join(__dirname, "../certs/ca.pem")).toString(),
    }),
  },

  connectionTimeoutMillis: 10000,
  statement_timeout: 10000,
  query_timeout: 10000,
  connectionLimit: process.env.DB_CONNECTION_LIMIT || 20,
});

// Add event listeners for connection issues
pool.on("error", (err) => {
  console.error("Unexpected database error:", err);
  // Don't exit process, allow for reconnection attempt
});

// Export query and connect methods
module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
  pool, // Export the pool itself for direct access if needed
};
