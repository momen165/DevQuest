// routes/upload.routes.js
const express = require("express");
const router = express.Router();
const {
  testRoute,
  uploadFile,
  uploadProfilePic,
  removeProfilePic,
  uploadEditorImage,
  uploadProfileImage,
  uploadCourseImage,
  uploadBadgeImage,
} = require("../controllers/upload.controller");
const { authenticateToken, requireAuth } = require("../middleware/auth");
const multer = require("multer");
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Session tracker
const sessionTracker = require("../middleware/sessionTracker");

// Apply authentication middleware to upload routes
router.use(authenticateToken);
router.use(requireAuth);

// Define routes
router.get("/test", testRoute);
router.post("/upload", uploadFile);
router.post("/uploadProfilePic", sessionTracker, uploadProfilePic);
router.delete("/removeProfilePic", sessionTracker, removeProfilePic);

// Add new route for editor uploads
router.post("/editor", sessionTracker, uploadEditorImage);

// Profile image upload routes
router.post("/profile-image", upload.single("image"), uploadProfileImage);
router.post("/course-image", upload.single("image"), uploadCourseImage);

// Badge image upload routes (admin only)
router.post("/badge-image", upload.single("image"), uploadBadgeImage);

module.exports = router;
