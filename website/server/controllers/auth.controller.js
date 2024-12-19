const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { validationResult } = require('express-validator');
const logActivity = require('../utils/logger');
const mailjet = require('node-mailjet');

require('dotenv').config();

const getEmailTemplate = (content) => `
  <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header with gradient background -->
    <div style="background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); padding: 40px 20px; text-align: center;">
      <img src="https://devquest2.s3.eu-central-1.amazonaws.com/assets/logo.svg" alt="Devquest Logo" style="max-width: 180px; height: auto; margin-bottom: 20px;">
    </div>
    
    <!-- Main content -->
    <div style="padding: 40px 30px; background-color: #ffffff;">
      ${content}
    </div>
    
    <!-- Footer -->
    <div style="background-color: #F9FAFB; padding: 30px 20px; text-align: center;">
      <div style="margin-bottom: 20px;">
        <a href="${process.env.WEBSITE_URL}/about" style="color: #6B7280; text-decoration: none; margin: 0 10px;">About</a>
        <a href="${process.env.WEBSITE_URL}/contact" style="color: #6B7280; text-decoration: none; margin: 0 10px;">Contact</a>
        <a href="${process.env.WEBSITE_URL}/privacy" style="color: #6B7280; text-decoration: none; margin: 0 10px;">Privacy Policy</a>
      </div>
      <p style="color: #9CA3AF; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Devquest. All rights reserved.</p>
    </div>
  </div>
`;

const signup = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
    }

    const {name, email, password, country} = req.body;

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the user into the database (inactive status by default)
        const query = 'INSERT INTO users (name, email, password, country, is_verified) VALUES ($1, $2, $3, $4, $5) RETURNING user_id';
        const {rows} = await db.query(query, [name, email, hashedPassword, country, false]);
        const userId = rows[0].user_id;

        // Generate verification token
        const verificationToken = generateToken(userId);

        // Construct verification link
        const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

        // Update the email content
        const emailContent = getEmailTemplate(`
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

        // Send verification email with new template
        await sendEmail(email, 'Welcome to Devquest - Verify Your Email', emailContent);

        await logActivity('User', `Verification email sent to: ${email}`, userId);

        res.status(201).json({
            message: 'User registered successfully. Please verify your email to activate your account.',
        });
    } catch (err) {
        console.error('Error during signup:', err);
        res.status(500).json({error: 'Failed to register user'});
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
                      Name: recipient.split('@')[0]
                  }],
                  Subject: subject,
                  HTMLPart: htmlContent,
                  CustomID: `subscription-${Date.now()}`
              }]
          });

      console.log('Email sending response:', request.response.status);
      return true;
  } catch (error) {
      console.error('Detailed email sending error:', error);
      throw new Error('Failed to send email: ' + error.message);
  }
};

const sendSupportEmail = async (recipient, subject, htmlContent) => {
  // Validate environment variables
  if (!process.env.SENDER_EMAIL_SUPPORT || !process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
      throw new Error('Missing required email configuration');
  }

  try {
      const request = await mailjetClient
          .post('send', { version: 'v3.1' })
          .request({
              Messages: [{
                  From: {
                      Email: process.env.SENDER_EMAIL_SUPPORT, // Use support email
                      Name: 'Devquest Support'
                  },
                  To: [{
                      Email: recipient,
                      Name: recipient.split('@')[0] // Use email username as recipient name
                  }],
                  Subject: subject,
                  HTMLPart: htmlContent,
                  CustomID: `feedback-reply-${Date.now()}` // Add tracking ID
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

const sendPasswordResetEmail = async (req, res) => {
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

      // Update the email content
      const emailContent = getEmailTemplate(`
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

      await sendEmail(email, 'Password Reset Request - Devquest', emailContent);

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




const checkAuth = async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userQuery = 'SELECT * FROM users WHERE user_id = $1';
        const { rows } = await db.query(userQuery, [decoded.userId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const adminQuery = 'SELECT 1 FROM admins WHERE admin_id = $1';
        const adminResult = await db.query(adminQuery, [decoded.userId]);
        const isAdmin = adminResult.rowCount > 0;

        res.status(200).json({ isAuthenticated: true, isAdmin });
    } catch (err) {
        console.error('Token verification error:', err);
        res.status(401).json({ message: 'Invalid token' });
    }
};


const verifyEmail = async (req, res) => {
    const {token} = req.query;

    if (!token) {
        return res.status(400).json({message: 'Verification token is required'});
    }

    try {
        // Verify and decode the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Update user status in the database
        const query = 'UPDATE users SET is_verified = $1 WHERE user_id = $2 RETURNING *';
        const {rows} = await db.query(query, [true, decoded.id]);

        if (rows.length === 0) {
            return res.status(404).json({message: 'User not found or already verified'});
        }

        res.status(200).json({message: 'Email verified successfully. You can now log in.'});
    } catch (err) {
        console.error('Email verification error:', err);
        res.status(400).json({message: 'Invalid or expired token'});
    }
};


const sendFeedbackReplyEmail = async (email, name, comment, reply) => {
    const emailContent = getEmailTemplate(`
      <h1 style="color: #111827; font-size: 24px; font-weight: 600; margin-bottom: 24px; text-align: center;">We've Responded to Your Feedback</h1>
      
      <p style="color: #4B5563; line-height: 1.6; margin-bottom: 24px;">
        Hello ${name}, thank you for taking the time to share your thoughts with us.
      </p>
      
      <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="color: #6B7280; font-size: 15px; font-style: italic; margin: 0;">
          Your feedback: "${comment}"
        </p>
      </div>
      
      <div style="background-color: #EEF2FF; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #4F46E5;">
        <p style="color: #111827; font-size: 15px; margin: 0;">
          ${reply}
        </p>
      </div>
      
      <p style="color: #4B5563; line-height: 1.6; text-align: center; margin-top: 32px;">
        Your feedback helps us improve Devquest for everyone. Thank you for being part of our community!
      </p>
    `);

    await sendSupportEmail(email, "We've Responded to Your Feedback - Devquest", emailContent);
};


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
  sendEmail,
};