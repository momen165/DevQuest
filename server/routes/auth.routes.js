const express = require("express");
const authController = require("../controllers/auth.controller");
const { authenticateToken, requireAuth } = require("../middleware/auth");
const { body } = require("express-validator");
const { cacheMiddleware } = require("../utils/cache.utils");
const {
  performanceMiddleware,
} = require("../middleware/performance.middleware");

// Create router instance
const router = express.Router();

// Validation middleware
const validateSignup = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character"
    ),
  body("country").trim().notEmpty().withMessage("Country is required"),
];

const validatePasswordChange = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "New password must be at least 8 characters and contain uppercase, lowercase, number, and special character"
    ),
];

// Public auth routes
router.post("/signup", validateSignup, authController.signup);
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshAccessToken);
router.post("/logout", authController.logout);
router.get("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerificationEmail);
router.post("/password-reset", authController.sendPasswordResetEmail);
router.post("/reset-password", authController.resetPassword);
router.get(
  "/check-auth",
  authenticateToken,
  performanceMiddleware("check-auth"),
  cacheMiddleware("user", 120),
  authController.checkAuth
); // Only needs token, no force requirement

// Protected routes - require valid authentication
router.use(authenticateToken);
router.use(requireAuth);

// Track visits and sessions for all authenticated actions
const trackVisit = require("../middleware/trackVisits");
const sessionTracker = require("../middleware/sessionTracker");
router.use(trackVisit);
router.use(sessionTracker);

router.put("/update-profile", authController.updateProfile);
router.post(
  "/change-password",
  validatePasswordChange,
  authController.changePassword
);
router.post("/requestEmailChange", authController.requestEmailChange);
router.post("/confirmEmailChange", authController.confirmEmailChange);

// Export the router as a CommonJS module
module.exports = router;
