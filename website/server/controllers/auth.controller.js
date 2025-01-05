const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { validationResult } = require('express-validator');
const logActivity = require('../utils/logger');
const mailjet = require('node-mailjet');
require('dotenv').config();

// Configuration
const CONFIG = {
  jwt: {
    expiresIn: '72h',
    verificationExpiresIn: '1h'
  },
  bcrypt: {
    saltRounds: 10
  }
};

// Initialize email client
const mailjetClient = mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY
);

// Helper functions
const helpers = {
  generateToken: (userId, options = {}) => {
    const payload = {
      userId,
      ...options
    };
    delete payload.expiresIn;
    return jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: options.expiresIn || CONFIG.jwt.expiresIn }
    );
  },

  generateVerificationToken: (userId) => {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: CONFIG.jwt.verificationExpiresIn }
    );
  },

  getEmailTemplate: (content) => `
    <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); padding: 40px 20px; text-align: center;">
        <img src="https://devquest2.s3.eu-central-1.amazonaws.com/assets/logo.svg" alt="Devquest Logo" style="max-width: 180px; height: auto; margin-bottom: 20px;">
      </div>
      <div style="padding: 40px 30px; background-color: #ffffff;">
        ${content}
      </div>
      <div style="background-color: #F9FAFB; padding: 30px 20px; text-align: center;">
        <div style="margin-bottom: 20px;">
          <a href="${process.env.WEBSITE_URL}/about" style="color: #6B7280; text-decoration: none; margin: 0 10px;">About</a>
          <a href="${process.env.WEBSITE_URL}/contact" style="color: #6B7280; text-decoration: none; margin: 0 10px;">Contact</a>
          <a href="${process.env.WEBSITE_URL}/privacy" style="color: #6B7280; text-decoration: none; margin: 0 10px;">Privacy Policy</a>
        </div>
        <p style="color: #9CA3AF; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Devquest. All rights reserved.</p>
      </div>
    </div>
  `,

  async sendEmail(recipient, subject, htmlContent, options = {}) {
    const { senderEmail = process.env.SENDER_EMAIL, senderName = 'Devquest' } = options;

    if (!senderEmail || !process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
      throw new Error('Missing required email configuration');
    }

    const response = await mailjetClient
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [{
          From: { Email: senderEmail, Name: senderName },
          To: [{ Email: recipient, Name: recipient.split('@')[0] }],
          Subject: subject,
          HTMLPart: htmlContent,
          CustomID: `${options.customId || 'email'}-${Date.now()}`
        }]
      });

    if (response.response.status !== 200) {
      throw new Error(`Email sending failed with status: ${response.response.status}`);
    }

    return true;
  }
};

// Error handler wrapper
const handleAsync = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    console.error(`Error in ${fn.name}:`, error.message);
    res.status(500).json({ error: `Failed to ${fn.name}` });
  }
};

// Main controller functions
const signup = handleAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, country } = req.body;
  const hashedPassword = await bcrypt.hash(password, CONFIG.bcrypt.saltRounds);

  // Check if email already exists
  const existingUser = await db.query('SELECT 1 FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existingUser.rows.length > 0) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  // Create new user
  const { rows } = await db.query(
    'INSERT INTO users (name, email, password, country, is_verified) VALUES ($1, $2, $3, $4, $5) RETURNING user_id',
    [name, email.toLowerCase(), hashedPassword, country, false]
  );

  // Generate verification token with only userId in payload
  const verificationToken = helpers.generateVerificationToken(rows[0].user_id);
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const emailContent = helpers.getEmailTemplate(`
    <h1 style="color: #111827; font-size: 24px; font-weight: 600; margin-bottom: 24px; text-align: center;">Welcome to Devquest!</h1>
    <p style="color: #4B5563; line-height: 1.6; margin-bottom: 24px;">
      We're excited to have you join our community of developers! To get started, please verify your email address.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${verificationLink}" 
         style="display: inline-block; background-color: #4F46E5; color: white; 
                padding: 14px 32px; text-decoration: none; border-radius: 8px;
                font-weight: 500; font-size: 16px; transition: background-color 0.2s ease;">
        Verify Email Address
      </a>
    </div>
    <div style="background-color: #F3F4F6; border-radius: 8px; padding: 16px; margin-top: 32px;">
      <p style="color: #6B7280; font-size: 14px; margin: 0;">
        If you didn't create an account with Devquest, you can safely ignore this email.
      </p>
    </div>
  `);

  await helpers.sendEmail(email, 'Welcome to Devquest - Verify Your Email', emailContent);
  await logActivity('User', `Verification email sent to: ${email}`, rows[0].user_id);

  res.status(201).json({
    message: 'User registered successfully. Please verify your email to activate your account.'
  });
});

const login = handleAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const [userResult, adminResult] = await Promise.all([
    db.query('SELECT * FROM users WHERE email = $1', [email]),
    db.query('SELECT 1 FROM admins WHERE admin_id = (SELECT user_id FROM users WHERE email = $1)', [email])
  ]);

  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = userResult.rows[0];
  const isMatch = await bcrypt.compare(password, user.password);
  
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const userData = {
    userId: user.user_id,
    name: user.name,
    country: user.country,
    bio: user.bio,
    admin: adminResult.rowCount > 0,
    profileimage: user.profileimage
  };

  const token = helpers.generateToken(user.user_id, userData);

  res.status(200).json({
    message: 'Login successful',
    token,
    user: {
      name: user.name,
      country: user.country,
      bio: user.bio,
      admin: adminResult.rowCount > 0,
      profileimage: user.profileimage
    }
  });
});

const updateProfile = handleAsync(async (req, res) => {
  const { name, country, bio } = req.body;
  await db.query(
    'UPDATE users SET name = $1, country = $2, bio = $3 WHERE user_id = $4',
    [name, country, bio, req.user.userId]
  );
  res.status(200).json({ message: 'Profile updated successfully' });
});

const changePassword = handleAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { rows } = await db.query('SELECT password FROM users WHERE user_id = $1', [req.user.userId]);

  if (rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
  if (!isMatch) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, CONFIG.bcrypt.saltRounds);
  await db.query('UPDATE users SET password = $1 WHERE user_id = $2', [hashedPassword, req.user.userId]);
  
  res.status(200).json({ message: 'Password changed successfully' });
});

const sendPasswordResetEmail = handleAsync(async (req, res) => {
  const { email } = req.body;

  if (!email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  const { rows } = await db.query('SELECT user_id FROM users WHERE email = $1', [email.toLowerCase()]);
  
  if (rows.length > 0) {
    const resetToken = helpers.generateToken(rows[0].user_id, { expiresIn: CONFIG.jwt.verificationExpiresIn });
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const emailContent = helpers.getEmailTemplate(`
      <h1 style="color: #111827; font-size: 24px; font-weight: 600; margin-bottom: 24px; text-align: center;">Reset Your Password</h1>
      <p style="color: #4B5563; line-height: 1.6; margin-bottom: 24px;">
        We received a request to reset your password. Use the button below to set up a new password for your account.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetLink}" 
           style="display: inline-block; background-color: #4F46E5; color: white; 
                  padding: 14px 32px; text-decoration: none; border-radius: 8px;
                  font-weight: 500; font-size: 16px; transition: background-color 0.2s ease;">
          Reset Password
        </a>
      </div>
      <div style="background-color: #F3F4F6; border-radius: 8px; padding: 16px; margin-top: 32px;">
        <p style="color: #6B7280; font-size: 14px; margin: 0;">
          This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact our support team.
        </p>
      </div>
    `);

    await helpers.sendEmail(email, 'Password Reset Request - Devquest', emailContent);
  }

  // Always return the same message for security
  res.status(200).json({
    message: 'If your email exists in our system, you will receive reset instructions.'
  });
});

const resetPassword = handleAsync(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const hashedPassword = await bcrypt.hash(newPassword, CONFIG.bcrypt.saltRounds);
  
  const { rowCount } = await db.query(
    'UPDATE users SET password = $1 WHERE user_id = $2',
    [hashedPassword, decoded.userId]
  );

  if (rowCount === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.status(200).json({ message: 'Password updated successfully' });
});

const checkAuth = handleAsync(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const [userResult, adminResult] = await Promise.all([
    db.query('SELECT 1 FROM users WHERE user_id = $1', [decoded.userId]),
    db.query('SELECT 1 FROM admins WHERE admin_id = $1', [decoded.userId])
  ]);

  if (userResult.rows.length === 0) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json({ 
    isAuthenticated: true, 
    isAdmin: adminResult.rowCount > 0 
  });
});

const verifyEmail = handleAsync(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    // Handle both old and new token formats
    const userId = decoded.userId || decoded.id;

    if (!userId) {
      console.error('Token payload:', decoded);
      return res.status(400).json({ error: 'Invalid token format' });
    }

    // First check if user exists and isn't verified
    const checkUser = await db.query(
      'SELECT is_verified FROM users WHERE user_id = $1',
      [userId]
    );

    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (checkUser.rows[0].is_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Update verification status
    const { rowCount } = await db.query(
      'UPDATE users SET is_verified = true WHERE user_id = $1',
      [userId]
    );

    if (rowCount === 0) {
      console.error('Failed to update verification status for user:', userId);
      return res.status(500).json({ error: 'Failed to verify email' });
    }

    await logActivity('User', `Email verified for user ID: ${userId}`, userId);
    res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error('Token verification error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Token has expired. Please request a new verification email.' });
    }
    throw error;
  }
});

const sendFeedbackReplyEmail = async ({ email, name, comment, rating, courseName, reply }) => {
  try {
    if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
      throw new Error('Missing required email configuration');
    }

    const emailContent = helpers.getEmailTemplate(`
      <h1 style="color: #111827; font-size: 24px; font-weight: 600; margin-bottom: 24px; text-align: center;">We've Responded to Your Feedback</h1>
      <p style="color: #4B5563; line-height: 1.6; margin-bottom: 24px;">
        Hello ${name}, thank you for taking the time to share your thoughts with us.
      </p>
      <div style="background-color: #F3F4F6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="color: #4B5563; margin: 8px 0;">
          <strong>Course:</strong> ${courseName}
        </p>
        <p style="color: #4B5563; margin: 8px 0;">
          <strong>Your rating:</strong> ${'★'.repeat(rating)}${'☆'.repeat(5-rating)}
        </p>
        <p style="color: #4B5563; margin: 8px 0;">
          <strong>Your feedback:</strong> "${comment || 'No comment provided'}"
        </p>
      </div>
      <div style="background-color: #EEF2FF; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="color: #4B5563; margin: 8px 0;">
          <strong>Our response:</strong>
        </p>
        <p style="color: #4B5563; margin: 8px 0;">${reply}</p>
      </div>
      <p style="color: #6B7280; font-size: 14px; text-align: center; margin-top: 32px;">
        Your feedback helps us improve Devquest for everyone. Thank you for being part of our community!
      </p>
    `);

    const response = await mailjetClient
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [{
          From: {
            Email: process.env.SENDER_EMAIL_SUPPORT,
            Name: 'Devquest Support'
          },
          To: [{
            Email: email,
            Name: name
          }],
          Subject: "We've Responded to Your Feedback",
          HTMLPart: emailContent
        }]
      });

    if (response.response.status !== 200) {
      throw new Error(`Email sending failed with status: ${response.response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error sending feedback reply email:', error);
    throw new Error('Failed to send feedback reply email');
  }
};

const checkAdminStatus = handleAsync(async (req, res, next) => {
  const { rowCount } = await db.query('SELECT 1 FROM admins WHERE admin_id = $1', [req.user.userId]);
  
  if (rowCount === 0) {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  
  next();
});

module.exports = {
  signup,
  login,
  updateProfile,
  verifyEmail,
  changePassword,
  sendPasswordResetEmail,
  resetPassword,
  checkAuth,
  sendFeedbackReplyEmail,
  checkAdminStatus
};