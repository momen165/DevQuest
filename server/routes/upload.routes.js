// routes/upload.routes.js
const express = require("express");
const router = express.Router();
const {
  testRoute,
  uploadFile,
  uploadProfilePic,
  removeProfilePic,
  uploadEditorImage,
} = require("../controllers/upload.controller");
const { authenticateToken, requireAuth } = require("../middleware/auth");

// Session tracker
const sessionTracker = require("../middleware/sessionTracker");

// Define routes
router.get("/test", testRoute);
router.post("/upload", uploadFile);
router.post(
  "/uploadProfilePic",
  authenticateToken,
  requireAuth,
  sessionTracker,
  uploadProfilePic
);
router.delete(
  "/removeProfilePic",
  authenticateToken,
  requireAuth,
  sessionTracker,
  removeProfilePic
);

// Add new route for editor uploads
router.post("/editor", authenticateToken, requireAuth, sessionTracker, uploadEditorImage);

module.exports = router;
