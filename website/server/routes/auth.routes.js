const express = require("express");
const authController = require("../controllers/auth.controller");
const authenticateToken = require("../middleware/auth");
const { body } = require("express-validator");

const router = express.Router();

// Validation middleware
const validateSignup = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("country").trim().notEmpty().withMessage("Country is required"),
];

// Auth routes
router.post("/signup", validateSignup, authController.signup);
router.post("/login", authController.login);
router.get("/verify-email", authController.verifyEmail);
router.get("/check-auth", authController.checkAuth);

// Protected routes
router.use(authenticateToken);
router.put("/update-profile", authController.updateProfile);
router.post("/change-password", authController.changePassword);
router.post("/password-reset", authController.sendPasswordResetEmail);
router.post("/reset-password", authController.resetPassword);
router.post("/requestEmailChange", authController.requestEmailChange);
router.post("/confirmEmailChange", authController.confirmEmailChange);

module.exports = router;
