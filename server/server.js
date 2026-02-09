const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { authenticateToken } = require("./middleware/auth");
const sanitizeInput = require("./middleware/sanitizeInput");
const { wrapDatabaseQuery } = require("./middleware/performance.middleware");
const { logger } = require("./utils/logger");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { closeExpiredTickets } = require("./controllers/support.controller");
const {
  router: paymentRouter,
  webhookHandler,
} = require("./routes/payment.routes");
const { createBadgesTable } = require("./models/badge.model");

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const prisma = require("./config/prisma");

// Wrap database with performance tracking
wrapDatabaseQuery(prisma);

(async () => {
  try {
    await prisma.$connect();
    logger.info("Database connected");

    // Initialize badge data after database connection is successful
    await createBadgesTable();
  } catch (error) {
    logger.error("Database initialization error:", error);
    process.exit(1);
  }
})();

// Enable trust proxy
app.set("trust proxy", 1);

// Middleware for CORS
// Use CLIENT_URL for consistency (FRONTEND_URL is deprecated - use CLIENT_URL)
app.use(
  cors({
    origin: [process.env.CLIENT_URL || process.env.FRONTEND_URL],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Pragma",
      "sentry-trace",
      "baggage",
    ],
  }),
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
  }),
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

// Enable gzip/brotli compression for all responses
app.use(compression());

// IMPORTANT: Place this before any middleware that parses the body
app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  webhookHandler,
);

// Middleware for parsing JSON and URL-encoded data (1mb default, upload routes use higher limit)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Apply sanitization to all routes
app.use(sanitizeInput);

// Remove global trackVisit middleware. It is now applied only after authentication in protected routes.
// app.use(trackVisit);

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
const pageviewRoutes = require("./routes/pageview.routes");
const performanceRoutes = require("./routes/performance.routes");
const badgeRoutes = require("./routes/badge.routes");
const emailWebhookRoutes = require("./routes/email-webhook.routes");

// Import controllers for public endpoints
const {
  getCoursesWithRatings,
  getPublicFeedback,
} = require("./controllers/feedback.controller");

// Apply specific rate limiting to auth endpoints
app.use("/api/login", authLimiter);
app.use("/api/signup", authLimiter);
app.use("/api/password-reset", authLimiter);

// Apply standard rate limiting to all other routes
app.use(standardLimiter);

// Define public endpoints explicitly before any authentication middleware is applied
// Public data endpoints
app.get("/api/getCoursesWithRatings", getCoursesWithRatings);
app.get("/api/feedback/public", getPublicFeedback);

// Health check route - no auth required
app.get("/api/health", (req, res) => {
  prisma.users
    .findFirst({ select: { user_id: true } })
    .then(() => {
      res.status(200).json({
        status: "OK",
        database: "Connected",
        timestamp: new Date().toISOString(),
      });
    })
    .catch((err) => {
      console.error("Health check error:", err.message);
      res.status(500).json({
        status: "ERROR",
        database: "Disconnected",
        timestamp: new Date().toISOString(),
      });
    });
});

// --- SESSION TRACKER: Ping endpoint for real page loads ---
// --- SESSION TRACKER: Ping endpoint for real page loads ---
const sessionTracker = require("./middleware/sessionTracker");
app.post("/api/ping-session", express.json(), async (req, res) => {
  try {
    if (req.headers.authorization) {
      // Extract token and add it to req.user for sessionTracker
      const token = req.headers.authorization.split(" ")[1];
      const decoded = require("jsonwebtoken").verify(
        token,
        process.env.JWT_SECRET,
      );
      req.user = { user_id: decoded.userId };
      await sessionTracker(req, res, () => {
        res.status(200).json({ ok: true });
      });
    } else {
      res.status(200).json({ ok: false, reason: "No auth token" });
    }
  } catch (err) {
    logger.warn("[Session Ping] Error:", err);
    res.status(200).json({ ok: false, reason: "Error" });
  }
});
// Mount routes - auth routes need special handling
app.use("/api", authRoutes);
app.use("/api", pageviewRoutes);

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
app.use("/api", emailWebhookRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", performanceRoutes);
app.use("/api/badges", badgeRoutes);

// Checkout session endpoint - secured with authentication and returns minimal payload
app.get(
  "/api/checkout-session/:sessionId",
  authenticateToken,
  async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      // Verify the session belongs to the authenticated user
      if (session.client_reference_id !== userId.toString()) {
        return res.status(403).json({ error: "Access denied to this session" });
      }

      // Return minimal payload instead of full session object
      res.json({
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        customer_email: session.customer_email,
        amount_total: session.amount_total,
        currency: session.currency,
        subscription: session.subscription,
      });
    } catch (error) {
      console.error("Error retrieving checkout session:", error);
      res.status(404).json({ error: "Session not found" });
    }
  },
);

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
    "max-age=31536000; includeSubDomains",
  );
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );
  next();
});

// Serve React frontend

app.get("/", (req, res) => {
  res.send("API is alive!");
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500; // Handle both statusCode and legacy status
  console.error(`[${new Date().toISOString()}] Error:`, err.message);

  // IMPORTANT: Check if headers have already been sent
  if (res.headersSent) {
    return next(err); // Delegate to default Express error handler if headers already sent
  }

  res.status(statusCode).json({
    error: err.message || "Internal Server Error",
    code: err.code || "INTERNAL_ERROR",
    status: err.status || "error", // Include status as a field in the response if needed
  });
});

// Check for expired tickets every 5 minutes (wrapped to prevent uncaught exceptions)
setInterval(() => {
  try {
    closeExpiredTickets().catch((err) => {
      console.error("[closeExpiredTickets] Error:", err.message);
    });
  } catch (err) {
    console.error("[closeExpiredTickets] Sync error:", err.message);
  }
}, 5 * 60 * 1000);

// Start server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
