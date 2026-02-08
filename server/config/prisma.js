const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const hasDbConfig =
  process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME;

const getSslConfig = () => {
  if (process.env.DB_SSL_MODE === "disable") {
    return undefined;
  }

  const certPath = path.join(__dirname, "../certs/ca.pem");
  const ssl = { rejectUnauthorized: true };

  if (fs.existsSync(certPath)) {
    try {
      ssl.ca = fs.readFileSync(certPath, "utf8");
    } catch (error) {
      console.warn("Failed to read Prisma DB certificate:", error.message);
    }
  }

  return ssl;
};

if (!hasDbConfig && !process.env.DATABASE_URL) {
  throw new Error(
    "Database connection is not configured. Set DB_* variables or DATABASE_URL.",
  );
}

const globalForPrisma = globalThis;

if (!globalForPrisma.__prismaPgPool) {
  const poolConfig = {
    max: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 20,
    ssl: getSslConfig(),
  };

  if (hasDbConfig) {
    poolConfig.user = process.env.DB_USER;
    poolConfig.host = process.env.DB_HOST;
    poolConfig.database = process.env.DB_NAME;
    poolConfig.password = process.env.DB_PASSWORD || "";
    poolConfig.port = parseInt(process.env.DB_PORT || "5432", 10);
  } else {
    poolConfig.connectionString = process.env.DATABASE_URL;
  }

  globalForPrisma.__prismaPgPool = new Pool(poolConfig);
}

const prismaAdapter = new PrismaPg(globalForPrisma.__prismaPgPool);

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: prismaAdapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
