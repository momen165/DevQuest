const express = require('express');
const authController = require('../controllers/auth.controller');
const authenticateToken = require('../middleware/auth');
const { body } = require('express-validator');
const upload = require('../config/multer'); // Import multer configuration

const router = express.Router();

// Validation middleware
const validateSignup = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('country').trim().notEmpty().withMessage('Country is required')
];

// Routes
router.post('/signup', validateSignup, authController.signup);
router.post('/login', authController.login);
router.post(
  '/uploadProfilePic',
  authenticateToken,
  upload.single('profilePic'), // Use the multer configuration
  authController.uploadProfilePic
);
router.delete('/removeProfilePic', authenticateToken, authController.removeProfilePic);
router.post('/changePassword', authenticateToken, authController.changePassword);
router.post('/updateProfile', authenticateToken, authController.updateProfile);

module.exports = router;
