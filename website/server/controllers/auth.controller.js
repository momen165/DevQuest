const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { validationResult } = require('express-validator');
const logActivity = require('../utils/logger');
const mailjet = require('node-mailjet');
const path = require('path');
const fs = require('fs');
require('dotenv').config();



const signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, country } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (name, email, password, country) VALUES ($1, $2, $3, $4) RETURNING user_id';
    const { rows } = await db.query(query, [name, email, hashedPassword, country]);
    await logActivity('User', `New user registered: ${name} (${email})`, rows[0].user_id);
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  // Check for missing fields
  if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
      // Fetch user details from the database
      const userQuery = 'SELECT * FROM users WHERE email = $1';
      const { rows } = await db.query(userQuery, [email]);

      // Check if user exists
      if (rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
      }

      const user = rows[0];

      // Validate password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if the user is an admin
      const adminQuery = 'SELECT 1 FROM admins WHERE admin_id = $1';
      const adminResult = await db.query(adminQuery, [user.user_id]);
      const isAdmin = adminResult.rowCount > 0;

      // Generate a JWT token
      const token = jwt.sign(
          {
              userId: user.user_id,
              name: user.name,
              country: user.country,
              bio: user.bio,
              admin: isAdmin,
              profileimage: user.profileimage, // Include profileimage
          },
          process.env.JWT_SECRET,
          { expiresIn: '72h' }
      );

      // Respond with token and user details
      res.status(200).json({
          message: 'Login successful',
          token,
          user: {
              name: user.name,
              country: user.country,
              bio: user.bio,
              admin: isAdmin,
              profileimage: user.profileimage,
          },
      });
  } catch (err) {
      // Log the error and send a generic message to avoid exposing internal details
      console.error('Login error:', err.message);
      res.status(500).json({ error: 'An unexpected error occurred during login' });
  }
};


const updateProfile = async (req, res) => {
  const { name, country, bio } = req.body;
  const userId = req.user.userId;

  try {
    const query = 'UPDATE users SET name = $1, country = $2, bio = $3 WHERE user_id = $4';
    await db.query(query, [name, country, bio, userId]);
    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};





// Change Password
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId; // Get user ID from the JWT token

  try {
    // Fetch the user's current password from the database
    const userQuery = 'SELECT password FROM users WHERE user_id = $1';
    const { rows } = await db.query(userQuery, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];

    // Compare current password with the stored password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password in the database
    const updateQuery = 'UPDATE users SET password = $1 WHERE user_id = $2';
    await db.query(updateQuery, [hashedPassword, userId]);

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
};



const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = '1h'; // Token expires in 1 hour
  return jwt.sign({ id: userId }, secret, { expiresIn });
};


const mailjetClient = mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY
);



const sendEmail = async (recipient, subject, htmlContent) => {
  // Validate environment variables
  if (!process.env.SENDER_EMAIL || !process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
      throw new Error('Missing required email configuration');
  }

  try {
      const request = await mailjetClient
          .post('send', { version: 'v3.1' })
          .request({
              Messages: [{
                  From: {
                      Email: process.env.SENDER_EMAIL,
                      Name: 'Devquest'
                  },
                  To: [{
                      Email: recipient,
                      Name: recipient.split('@')[0] // Use email username as recipient name
                  }],
                  Subject: subject,
                  HTMLPart: htmlContent,
                  CustomID: `reset-pwd-${Date.now()}` // Add tracking ID
              }]
          });

      if (request.response.status !== 200) {
          throw new Error(`Email sending failed with status: ${request.response.status}`);
      }

      return true;
  } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send email: ' + error.message);
  }
};


const sendPasswordResetEmail = async (req,
res) => {
  const { email } = req.body;

  // Input validation
  if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
      // Check if user exists and account is active
      const result = await db.query(
          'SELECT user_id FROM users WHERE email = $1',
          [email.toLowerCase()]
      );

      // Don't reveal if user exists
      if (result.rows.length === 0 ) {
        
          return res.status(200).json({
              message: 'If your email exists in our system, you will receive reset instructions.'
          });
      }

      const userId = result.rows[0].user_id;
      const resetToken = generateToken(userId);

      
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      // Enhanced email template
      await sendEmail(
          email,
          'Password Reset Request',
          `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Password Reset Request</h1>
              <p>We received a request to reset your password. Click the button below to reset it:</p>
              <div style="margin: 20px 0;">
                  <a href="${resetLink}" 
                     style="background-color: #007bff; color: white; padding: 10px 20px; 
                            text-decoration: none; border-radius: 5px; display: inline-block;">
                      Reset Password
                  </a>
              </div>
              <p>This link will expire in 1 hour for security reasons.</p>
              <p>If you didn't request this reset, please ignore this email or contact support.</p>
          </div>`
      );

      return res.status(200).json({
          message: 'If your email exists in our system, you will receive reset instructions.'
      });

  } catch (error) {
      console.error('Password reset error:', error);
      return res.status(500).json({
          error: 'An error occurred while processing your request'
      });
  }
};


const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
  }

  try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password in database
      const query = 'UPDATE users SET password = $1 WHERE user_id = $2 RETURNING *';
      const result = await db.query(query, [hashedPassword, decoded.id]);
      
      if (result.rowCount === 0) {
          return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json({ message: 'Password updated successfully' });

  } catch (error) {
      if (error.name === 'JsonWebTokenError') {
          return res.status(400).json({ message: 'Invalid or expired token' });
      }
      console.error('Password reset error:', error);
      res.status(500).json({ message: 'Server error while resetting password' });
  }
};



module.exports = {
  signup,
  login,
  updateProfile,
  
  changePassword,
  sendPasswordResetEmail
    ,resetPassword
};