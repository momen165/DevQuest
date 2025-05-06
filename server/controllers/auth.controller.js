const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const { validationResult } = require("express-validator");
const logActivity = require("../utils/logger");
const mailjet = require("node-mailjet");
const crypto = require("crypto");
require("dotenv").config();

// Configuration
const CONFIG = {
  jwt: {
    accessTokenExpiresIn: "2h",
    refreshTokenExpiresIn: "7d",
    verificationExpiresIn: "1h",
  },
  bcrypt: {
    saltRounds: 10,
  },
};

// Initialize email client
const mailjetClient = mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY
);

// Define styles for reusability
const emailStyles = {
  container: `font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;`,
  header: `background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); padding: 40px 20px; text-align: center;`,
  logo: `max-width: 200px; height: auto; margin-bottom: 20px;`,
  contentArea: `padding: 40px 30px; background-color: #ffffff;`,
  footer: `background-color: #F9FAFB; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;`,
  footerLinksContainer: `margin-bottom: 20px;`,
  footerLink: `color: #6B7280; text-decoration: none; margin: 0 15px; font-size: 14px;`,
  footerCopyright: `color: #9CA3AF; font-size: 12px; margin: 0;`,
};

// Helper functions
const helpers = {
  generateToken: (userId, options = {}) => {
    const payload = {
      userId,
      ...options,
    };
    delete payload.expiresIn;
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: options.expiresIn || CONFIG.jwt.accessTokenExpiresIn,
    });
  },

  generateAccessToken: (userId, userData = {}) => {
    return jwt.sign(
      {
        userId,
        admin: userData.admin || false,
      },
      process.env.JWT_SECRET,
      { expiresIn: CONFIG.jwt.accessTokenExpiresIn }
    );
  },

  generateRefreshToken: async (userId) => {
    const refreshToken = crypto.randomBytes(40).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET token = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP`,
      [userId, refreshToken, expiresAt]
    );

    return refreshToken;
  },

  generateVerificationToken: (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: CONFIG.jwt.verificationExpiresIn,
    });
  },

  getEmailTemplate: (content) => `
    <div style="${emailStyles.container}" lang="en">
      <div style="${emailStyles.header}">
        <img src="https://cdn.dev-quest.tech/logo/logoWithOutText.png" alt="Devquest Logo" style="${
          emailStyles.logo
        }">
      </div>
      <div style="${emailStyles.contentArea}">
        ${content}
      </div>
      <div style="${emailStyles.footer}">
        <div style="${emailStyles.footerLinksContainer}">
          <a href="${process.env.FRONTEND_URL}/about" style="${
    emailStyles.footerLink
  }">About</a>
          <a href="${process.env.FRONTEND_URL}/contact" style="${
    emailStyles.footerLink
  }">Contact</a>
          <a href="${process.env.FRONTEND_URL}/privacy" style="${
    emailStyles.footerLink
  }">Privacy Policy</a>
        </div>
        <p style="${
          emailStyles.footerCopyright
        }">${new Date().getFullYear()} Devquest. All rights reserved.</p>
      </div>
    </div>
  `,

  async sendEmail(recipient, subject, htmlContent, options = {}) {
    const { senderEmail = process.env.SENDER_EMAIL, senderName = "Devquest" } =
      options;

    if (
      !senderEmail ||
      !process.env.MAILJET_API_KEY ||
      !process.env.MAILJET_SECRET_KEY
    ) {
      throw new Error("Missing required email configuration");
    }

    const response = await mailjetClient
      .post("send", { version: "v3.1" })
      .request({
        Messages: [
          {
            From: { Email: senderEmail, Name: senderName },
            To: [{ Email: recipient, Name: recipient.split("@")[0] }],
            Subject: subject,
            HTMLPart: htmlContent,
            CustomID: `${options.customId || "email"}-${Date.now()}`,
          },
        ],
      });

    if (response.response.status !== 200) {
      throw new Error(
        `Email sending failed with status: ${response.response.status}`
      );
    }

    return true;
  },
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

  const existingUser = await db.query("SELECT 1 FROM users WHERE email = $1", [
    email.toLowerCase(),
  ]);
  if (existingUser.rows.length > 0) {
    return res.status(400).json({ error: "Email already registered" });
  }

  const { rows } = await db.query(
    "INSERT INTO users (name, email, password, country, is_verified) VALUES ($1, $2, $3, $4, $5) RETURNING user_id",
    [name, email.toLowerCase(), hashedPassword, country, false]
  );

  const verificationToken = helpers.generateVerificationToken(rows[0].user_id);
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const emailContent = helpers.getEmailTemplate(`
    <div style="font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #1F2937; font-size: 28px; font-weight: 700; margin-bottom: 32px; text-align: center; 
                 text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);">
        Welcome to Devquest!
      </h1>
      <p style="color: #374151; font-size: 16px; line-height: 1.8; margin-bottom: 32px; text-align: center;">
        We're excited to have you join our community of developers! To get started, please verify your email address.
      </p>
      <div style="text-align: center; margin: 40px 0;">
        <a href="${verificationLink}" 
           style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); 
                  color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px;
                  font-weight: 600; font-size: 16px; letter-spacing: 0.5px;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                  transition: all 0.3s ease;">
          Verify Email Address
        </a>
      </div>
      <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; 
                  padding: 20px; margin-top: 40px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
        <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
          If you didn't create an account with Devquest, you can safely ignore this email.
        </p>
      </div>
    </div>
  `);

  await helpers.sendEmail(
    email,
    "Welcome to Devquest - Verify Your Email",
    emailContent
  );
  await logActivity(
    "User",
    `Verification email sent to: ${email}`,
    rows[0].user_id
  );

  res.status(201).json({
    message:
      "User registered successfully. Please verify your email to activate your account.",
  });
});

const login = handleAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const [userResult, adminResult] = await Promise.all([
    db.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]),
    db.query(
      "SELECT 1 FROM admins WHERE admin_id = (SELECT user_id FROM users WHERE email = $1)",
      [email.toLowerCase()]
    ),
  ]);

  if (userResult.rows.length === 0) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = userResult.rows[0];
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (!user.is_verified) {
    return res.status(403).json({
      error: "Please verify your email before logging in",
      needsVerification: true,
      email: user.email,
    });
  }

  const accessToken = helpers.generateAccessToken(user.user_id, {
    admin: adminResult.rowCount > 0,
  });

  const refreshToken = await helpers.generateRefreshToken(user.user_id);

  await logActivity("User", `User logged in: ${user.email}`, user.user_id);

  res.status(200).json({
    message: "Login successful",
    token: accessToken,
    refreshToken: refreshToken,
    user: {
      name: user.name,
      country: user.country,
      bio: user.bio,
      skills: user.skills || [],
      admin: adminResult.rowCount > 0,
      profileimage: user.profileimage,
    },
  });
});

const refreshAccessToken = handleAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  const tokenResult = await db.query(
    "SELECT user_id, expires_at FROM refresh_tokens WHERE token = $1",
    [refreshToken]
  );

  if (tokenResult.rows.length === 0) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const { user_id, expires_at } = tokenResult.rows[0];

  if (new Date() > new Date(expires_at)) {
    await db.query("DELETE FROM refresh_tokens WHERE token = $1", [
      refreshToken,
    ]);
    return res.status(401).json({ error: "Refresh token expired" });
  }

  const [userResult, adminResult] = await Promise.all([
    db.query(
      "SELECT name, country, bio, skills, profileimage FROM users WHERE user_id = $1",
      [user_id]
    ),
    db.query("SELECT 1 FROM admins WHERE admin_id = $1", [user_id]),
  ]);

  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: "User not found" });
  }

  const user = userResult.rows[0];
  const isAdmin = adminResult.rowCount > 0;

  const accessToken = helpers.generateAccessToken(user_id, { admin: isAdmin });

  res.status(200).json({
    token: accessToken,
    user: {
      name: user.name,
      country: user.country,
      bio: user.bio,
      skills: user.skills || [],
      admin: isAdmin,
      profileimage: user.profileimage,
    },
  });
});

const logout = handleAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await db.query("DELETE FROM refresh_tokens WHERE token = $1", [
      refreshToken,
    ]);
  }

  res.status(200).json({ message: "Logged out successfully" });
});

const updateProfile = handleAsync(async (req, res) => {
  const { name, country, bio, skills } = req.body;

  try {
    // Ensure skills is always a valid array for JSON column
    let skillsToSave = skills;
    if (skills && !Array.isArray(skills)) {
      try {
        skillsToSave = JSON.parse(skills);
      } catch {
        skillsToSave = [skills];
      }
    }

    const query = `
      UPDATE users 
      SET 
        name = COALESCE($1, name),
        country = COALESCE($2, country),
        bio = COALESCE($3, bio),
        skills = COALESCE($4, skills)
      WHERE user_id = $5
      RETURNING name, country, bio, skills, profileimage
    `;

    const values = [
      name,
      country,
      bio,
      JSON.stringify(skillsToSave),
      req.user.userId,
    ];
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = result.rows[0];

    const adminResult = await db.query(
      "SELECT 1 FROM admins WHERE admin_id = $1",
      [req.user.userId]
    );

    const isAdmin = adminResult.rowCount > 0;

    const accessToken = helpers.generateAccessToken(req.user.userId, {
      admin: isAdmin,
    });

    res.status(200).json({
      message: "Profile updated successfully",
      token: accessToken,
      user: {
        name: updatedUser.name,
        country: updatedUser.country,
        bio: updatedUser.bio,
        skills: updatedUser.skills,
        admin: isAdmin,
        profileimage: updatedUser.profileimage,
      },
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

const changePassword = handleAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { rows } = await db.query(
    "SELECT password FROM users WHERE user_id = $1",
    [req.user.userId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: "User not found" });
  }

  const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
  if (!isMatch) {
    return res.status(400).json({ error: "Current password is incorrect" });
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    CONFIG.bcrypt.saltRounds
  );
  await db.query("UPDATE users SET password = $1 WHERE user_id = $2", [
    hashedPassword,
    req.user.userId,
  ]);

  res.status(200).json({ message: "Password changed successfully" });
});

const sendPasswordResetEmail = handleAsync(async (req, res) => {
  const { email } = req.body;

  if (!email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  const { rows } = await db.query(
    "SELECT user_id FROM users WHERE email = $1",
    [email.toLowerCase()]
  );

  if (rows.length > 0) {
    const resetToken = helpers.generateToken(rows[0].user_id, {
      expiresIn: CONFIG.jwt.verificationExpiresIn,
    });
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

    await helpers.sendEmail(
      email,
      "Password Reset Request - Devquest",
      emailContent
    );
  }

  res.status(200).json({
    message:
      "If your email exists in our system, you will receive reset instructions.",
  });
});

const resetPassword = handleAsync(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ error: "Token and new password are required" });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const hashedPassword = await bcrypt.hash(
    newPassword,
    CONFIG.bcrypt.saltRounds
  );

  const { rowCount } = await db.query(
    "UPDATE users SET password = $1 WHERE user_id = $2",
    [hashedPassword, decoded.userId]
  );

  if (rowCount === 0) {
    return res.status(404).json({ error: "User not found" });
  }

  res.status(200).json({ message: "Password updated successfully" });
});

const checkAuth = handleAsync(async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const [userResult, adminResult] = await Promise.all([
    db.query("SELECT 1 FROM users WHERE user_id = $1", [decoded.userId]),
    db.query("SELECT 1 FROM admins WHERE admin_id = $1", [decoded.userId]),
  ]);

  if (userResult.rows.length === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({
    isAuthenticated: true,
    isAdmin: adminResult.rowCount > 0,
  });
});

const verifyEmail = handleAsync(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: "Verification token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);

    const userId = decoded.userId || decoded.id;

    if (!userId) {
      console.error("Token payload:", decoded);
      return res.status(400).json({ error: "Invalid token format" });
    }

    const checkUser = await db.query(
      "SELECT is_verified FROM users WHERE user_id = $1",
      [userId]
    );

    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    if (checkUser.rows[0].is_verified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    const { rowCount } = await db.query(
      "UPDATE users SET is_verified = true WHERE user_id = $1",
      [userId]
    );

    if (rowCount === 0) {
      console.error("Failed to update verification status for user:", userId);
      return res.status(500).json({ error: "Failed to verify email" });
    }

    await logActivity("User", `Email verified for user ID: ${userId}`, userId);
    res
      .status(200)
      .json({ message: "Email verified successfully. You can now log in." });
  } catch (error) {
    console.error("Token verification error:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ error: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({
        error: "Token has expired. Please request a new verification email.",
      });
    }
    throw error;
  }
});

const resendVerificationEmail = handleAsync(async (req, res) => {
  const { email } = req.body;

  if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  // Check if user exists and needs verification
  const userQuery = await db.query(
    "SELECT user_id, name, is_verified FROM users WHERE email = $1",
    [email.toLowerCase()]
  );

  if (userQuery.rows.length === 0) {
    // Don't reveal that the email doesn't exist
    return res.status(200).json({
      message:
        "If your email exists and requires verification, you will receive a verification email.",
    });
  }

  const user = userQuery.rows[0];

  // If already verified, no need to send again
  if (user.is_verified) {
    return res.status(200).json({
      message: "Your email is already verified. You can log in now.",
    });
  }

  // Generate a new verification token and send email
  const verificationToken = helpers.generateVerificationToken(user.user_id);
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const emailContent = helpers.getEmailTemplate(`
    <h1 style="color: #111827; font-size: 24px; font-weight: 600; margin-bottom: 24px; text-align: center;">Verify Your Email Address</h1>
    <p style="color: #4B5563; line-height: 1.6; margin-bottom: 24px;">
      Hello ${
        user.name || "there"
      }, you requested a new verification email. Please click the button below to verify your email address.
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
        If you didn't request this verification email, you can safely ignore it.
        This link will expire in 1 hour for security purposes.
      </p>
    </div>
  `);

  await helpers.sendEmail(email, "Verify Your Email - Devquest", emailContent);

  await logActivity(
    "User",
    `Verification email resent to: ${email}`,
    user.user_id
  );

  res.status(200).json({
    message: "Verification email sent. Please check your inbox.",
  });
});

const sendFeedbackReplyEmail = async ({
  email,
  name,
  comment,
  rating,
  courseName,
  reply,
}) => {
  try {
    if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
      throw new Error("Missing required email configuration");
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
          <strong>Your rating:</strong> ${"★".repeat(rating)}${"☆".repeat(
      5 - rating
    )}
        </p>
        <p style="color: #4B5563; margin: 8px 0;">
          <strong>Your feedback:</strong> "${comment || "No comment provided"}"
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
      .post("send", { version: "v3.1" })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.SENDER_EMAIL_SUPPORT,
              Name: "Devquest Support",
            },
            To: [
              {
                Email: email,
                Name: name,
              },
            ],
            Subject: "We've Responded to Your Feedback",
            HTMLPart: emailContent,
          },
        ],
      });

    if (response.response.status !== 200) {
      throw new Error(
        `Email sending failed with status: ${response.response.status}`
      );
    }

    return true;
  } catch (error) {
    console.error("Error sending feedback reply email:", error);
    throw new Error("Failed to send feedback reply email");
  }
};

const checkAdminStatus = handleAsync(async (req, res, next) => {
  const { rowCount } = await db.query(
    "SELECT 1 FROM admins WHERE admin_id = $1",
    [req.user.userId]
  );

  if (rowCount === 0) {
    return res
      .status(403)
      .json({ error: "Access denied. Admin privileges required." });
  }

  next();
});

const requestEmailChange = handleAsync(async (req, res) => {
  const { newEmail } = req.body;
  const userId = req.user.userId;

  if (!newEmail?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  const existingUser = await db.query("SELECT 1 FROM users WHERE email = $1", [
    newEmail.toLowerCase(),
  ]);
  if (existingUser.rows.length > 0) {
    return res.status(400).json({ error: "Email is already in use" });
  }

  const { rows } = await db.query(
    "SELECT email, name FROM users WHERE user_id = $1",
    [userId]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: "User not found" });
  }

  const currentEmail = rows[0].email;
  const userName = rows[0].name;

  const token = helpers.generateToken(userId, {
    newEmail,
    currentEmail,
    purpose: "email_change",
    expiresIn: CONFIG.jwt.verificationExpiresIn,
  });

  const verificationLink = `${process.env.FRONTEND_URL}/confirm-email-change?token=${token}`;

  const emailContent = helpers.getEmailTemplate(`
    <h1 style="color: #111827; font-size: 24px; font-weight: 600; margin-bottom: 24px; text-align: center;">Email Change Request</h1>
    <p style="color: #4B5563; line-height: 1.6; margin-bottom: 24px;">
      Hello ${userName}, we received a request to change your email address from ${currentEmail} to ${newEmail}.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${verificationLink}" 
         style="display: inline-block; background-color: #4F46E5; color: white; 
                padding: 14px 32px; text-decoration: none; border-radius: 8px;
                font-weight: 500; font-size: 16px; transition: background-color 0.2s ease;">
        Confirm Email Change
      </a>
    </div>
    <div style="background-color: #F3F4F6; border-radius: 8px; padding: 16px; margin-top: 32px;">
      <p style="color: #6B7280; font-size: 14px; margin: 0;">
        If you didn't request this change, please ignore this email or contact our support team immediately.
        This link will expire in 1 hour for security purposes.
      </p>
    </div>
  `);

  await helpers.sendEmail(
    currentEmail,
    "Confirm Your Email Change Request - Devquest",
    emailContent
  );

  res.status(200).json({
    message: "Email change verification sent to your current email address",
  });
});

const confirmEmailChange = handleAsync(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Verification token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.purpose !== "email_change") {
      return res.status(400).json({ error: "Invalid token purpose" });
    }

    const { userId, newEmail, currentEmail } = decoded;

    const existingUser = await db.query(
      "SELECT 1 FROM users WHERE email = $1 AND user_id != $2",
      [newEmail.toLowerCase(), userId]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Email is no longer available" });
    }

    const { rowCount } = await db.query(
      "UPDATE users SET email = $1 WHERE user_id = $2 AND email = $3",
      [newEmail.toLowerCase(), userId, currentEmail]
    );

    if (rowCount === 0) {
      return res
        .status(400)
        .json({ error: "Failed to update email. Please try again." });
    }

    await logActivity(
      "User",
      `Email changed from ${currentEmail} to ${newEmail}`,
      userId
    );

    res.status(200).json({
      message:
        "Email changed successfully. Please log in with your new email address.",
    });
  } catch (error) {
    console.error("Token verification error:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ error: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({
        error: "Token has expired. Please request a new email change.",
      });
    }
    throw error;
  }
});

module.exports = {
  signup,
  login,
  refreshAccessToken,
  logout,
  updateProfile,
  verifyEmail,
  resendVerificationEmail,
  changePassword,
  sendPasswordResetEmail,
  resetPassword,
  checkAuth,
  sendFeedbackReplyEmail,
  checkAdminStatus,
  requestEmailChange,
  confirmEmailChange,
};
