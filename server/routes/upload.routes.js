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

// Define routes
router.get("/test", testRoute);
router.post("/upload", uploadFile);
router.post(
  "/uploadProfilePic",
  authenticateToken,
  requireAuth,
  uploadProfilePic
);
router.delete(
  "/removeProfilePic",
  authenticateToken,
  requireAuth,
  removeProfilePic
);

// Add new route for editor uploads
router.post("/editor", authenticateToken, requireAuth, uploadEditorImage);

module.exports = router;
