const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { authenticateToken } = require("./middleware/auth");
const updateUserStreak = require("./middleware/updateUserStreak");
const sanitizeInput = require("./middleware/sanitizeInput");
const { handleError } = require("./utils/error.utils");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { closeExpiredTickets } = require("./controllers/support.controller");
const {
  router: paymentRouter,
  webhookHandler,
} = require("./routes/payment.routes");

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const db = require("./config/database");
db.query("SELECT NOW()", (err, result) => {
  if (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  } else {
    console.log("Database connected:", result.rows[0].now);
  }
});

// Enable trust proxy
app.set("trust proxy", 1);

// Middleware for CORS
app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Security headers
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://m.stripe.network",
        "https://fonts.gstatic.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://fonts.googleapis.com",
        "data:",
      ],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
      ],
      frameSrc: ["'self'", "https://js.stripe.com"],
      objectSrc: ["'none'"],
      styleSrcElem: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://m.stripe.network",
      ],
      upgradeInsecureRequests: [],
    },
  })
);

// Define stricter rate limits for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

// Regular rate limiting for other routes
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

// Disable 'X-Powered-By' header
app.disable("x-powered-by");

// IMPORTANT: Place this before any middleware that parses the body
app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  webhookHandler
);

// Middleware for parsing JSON and URL-encoded data
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Apply sanitization to all routes
app.use(sanitizeInput);

// Import routes
const authRoutes = require("./routes/auth.routes");
const courseRoutes = require("./routes/course.routes");
const lessonRoutes = require("./routes/lesson.routes");
const sectionRoutes = require("./routes/section.routes");
const studentRoutes = require("./routes/student.routes");
const subscriptionRoutes = require("./routes/subscription.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const activityRoutes = require("./routes/activity.routes");
const codeExecutionRoutes = require("./routes/codeExecution.routes");
const uploadRoutes = require("./routes/upload.routes");
const supportRoutes = require("./routes/support.routes");
const adminRoutes = require("./routes/admin.routes");

// Import controllers for public endpoints
const {
  getCoursesWithRatings,
  getPublicFeedback,
} = require("./controllers/feedback.controller");
const { getMaintenanceStatus } = require("./controllers/admin.controller");

// Apply specific rate limiting to auth endpoints
app.use("/api/login", authLimiter);
app.use("/api/signup", authLimiter);
app.use("/api/password-reset", authLimiter);

// Apply standard rate limiting to all other routes
app.use(standardLimiter);

// Define public endpoints explicitly before any authentication middleware is applied
// System status endpoints
app.get("/api/admin/system-settings", getMaintenanceStatus);
app.get("/api/admin/maintenance-status", getMaintenanceStatus);

// Public data endpoints
app.get("/api/getCoursesWithRatings", getCoursesWithRatings);
app.get("/api/feedback/public", getPublicFeedback);

// Health check route - no auth required
app.get("/api/health", (req, res) => {
  db.query("SELECT NOW()", (err, result) => {
    if (err) {
      console.error("Health check error:", err.message);
      res.status(500).json({
        status: "ERROR",
        database: "Disconnected",
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(200).json({
        status: "OK",
        database: "Connected",
        timestamp: result.rows[0].now,
      });
    }
  });
});

// Mount routes - auth routes need special handling
app.use("/api", authRoutes);

// Each route file now handles its own authentication requirements internally
app.use("/api", courseRoutes);
app.use("/api", lessonRoutes);
app.use("/api", sectionRoutes);
app.use("/api", studentRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", feedbackRoutes);
app.use("/api", activityRoutes);
app.use("/api", codeExecutionRoutes);
app.use("/api", uploadRoutes);
app.use("/api", supportRoutes);
app.use("/api", paymentRouter);
app.use("/api/admin", adminRoutes);

// For streak updates, apply the middleware to all routes that need it
app.use(updateUserStreak);

// Checkout session endpoint - requires auth but handled in its route
app.get("/api/checkout-session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json(session);
  } catch (error) {
    console.error("Error retrieving checkout session:", error);
    res.status(404).json({ error: "Session not found" });
  }
});

// Block cloud metadata access
app.use((req, res, next) => {
  if (req.path.startsWith("/latest/meta-data")) {
    return res.status(403).send("Access Denied");
  }
  next();
});

// Add additional security headers
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  res.status(statusCode).json({
    error: err.message || "Internal Server Error",
    code: err.code || "INTERNAL_ERROR",
  });
});

// Check for expired tickets every 5 minutes
setInterval(closeExpiredTickets, 5 * 60 * 1000);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Log all registered routes for debugging
if (process.env.NODE_ENV !== "production") {
  setTimeout(() => {
    console.log("\nRegistered Routes:");
    app._router.stack
      .filter((r) => r.route)
      .forEach((r) => {
        const methods = Object.keys(r.route.methods)
          .filter((m) => r.route.methods[m])
          .join(", ")
          .toUpperCase();
        console.log(`${methods} ${r.route.path}`);
      });
    console.log("\n");
  }, 1000);
}
