const express = require("express");
const router = express.Router();
const {
  testRoute,
  uploadFile,
  uploadProfilePic,
  removeProfilePic,
  uploadEditorImage,
} = require("../controllers/upload.controller");
const {
  authenticateToken,
  requireAuth,
  authRateLimiter,
  sanitizeInput,
  corsOptions,
} = require("../middleware/auth");
const rateLimit = require("express-rate-limit");
const cors = require("cors");

// Define rate limiting for upload routes
const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many upload requests, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

// Define routes
router.get("/test", testRoute);
router.post("/upload", uploadRateLimiter, sanitizeInput, cors(corsOptions), uploadFile);
router.post(
  "/uploadProfilePic",
  authenticateToken,
  requireAuth,
  uploadRateLimiter,
  sanitizeInput,
  cors(corsOptions),
  uploadProfilePic
);
router.delete(
  "/removeProfilePic",
  authenticateToken,
  requireAuth,
  uploadRateLimiter,
  sanitizeInput,
  cors(corsOptions),
  removeProfilePic
);

// Add new route for editor uploads
router.post(
  "/editor",
  authenticateToken,
  requireAuth,
  uploadRateLimiter,
  sanitizeInput,
  cors(corsOptions),
  uploadEditorImage
);

module.exports = router;
