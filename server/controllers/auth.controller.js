const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { validationResult } = require("express-validator");
const logActivity = require("../utils/logger");
const Mailgun = require("mailgun.js");
const formData = require("form-data");
const crypto = require("crypto");
const NodeCache = require("node-cache");
const { setCacheHeaders } = require("../utils/cache.utils");
require("dotenv").config();

// Initialize cache for user existence checks
const userExistenceCache = new NodeCache({ stdTTL: 60 });
const USER_EXISTENCE_CACHE_KEY_PREFIX = "user_exists_";

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

// Initialize Mailgun client
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
  url: process.env.MAILGUN_API_URL || "https://api.mailgun.net",
});

// Define styles for reusability
const emailStyles = {
  container:
    "font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;",
  header:
    "background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); padding: 40px 20px; text-align: center;",
  logo: "max-width: 200px; height: auto; margin-bottom: 20px;",
  contentArea: "padding: 40px 30px; background-color: #ffffff;",
  footer:
    "background-color: #F9FAFB; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;",
  footerLinksContainer: "margin-bottom: 20px;",
  footerLink:
    "color: #6B7280; text-decoration: none; margin: 0 15px; font-size: 14px;",
  footerCopyright: "color: #9CA3AF; font-size: 12px; margin: 0;",
};

const toInt = (value) => Number.parseInt(value, 10);

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

    await prisma.refresh_tokens.upsert({
      where: { user_id: toInt(userId) },
      create: {
        user_id: toInt(userId),
        token: refreshToken,
        expires_at: expiresAt,
      },
      update: {
        token: refreshToken,
        expires_at: expiresAt,
        created_at: new Date(),
      },
    });

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
        <img src="https://pub-7f487491f13f461f98c43d8f13580a44.r2.dev/logo/logoWithOutText.png" alt="Devquest Logo" style="${emailStyles.logo}">
      </div>
      <div style="${emailStyles.contentArea}">
        ${content}
      </div>
      <div style="${emailStyles.footer}">
        <div style="${emailStyles.footerLinksContainer}">
          <a href="${process.env.FRONTEND_URL}/about" style="${emailStyles.footerLink}">About</a>
          <a href="${process.env.FRONTEND_URL}/contact" style="${emailStyles.footerLink}">Contact</a>
          <a href="${process.env.FRONTEND_URL}/privacy" style="${emailStyles.footerLink}">Privacy Policy</a>
        </div>
        <p style="${emailStyles.footerCopyright}">${new Date().getFullYear()} Devquest. All rights reserved.</p>
      </div>
    </div>
  `,

  async sendEmail(recipient, subject, htmlContent, options = {}) {
    const { senderEmail = process.env.SENDER_EMAIL, senderName = "Devquest" } =
      options;

    if (
      !senderEmail ||
      !process.env.MAILGUN_API_KEY ||
      !process.env.MAILGUN_DOMAIN
    ) {
      throw new Error("Missing required Mailgun configuration");
    }

    const messageData = {
      from: `${senderName} <${senderEmail}>`,
      to: `${recipient.split("@")[0]} <${recipient}>`,
      subject,
      html: htmlContent,
      "o:tag": ["auth-email", options.customId || "general"],
      "h:X-Email-Type": options.customId || "auth",
    };

    const response = await mg.messages.create(
      process.env.MAILGUN_DOMAIN,
      messageData
    );

    console.log(
      `Email sent successfully to ${recipient}. Message ID: ${response.id}`
    );
    return true;
  },
};

// Error handler wrapper
const handleAsync = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error(`Error in ${fn.name}:`, error.message);
    res.status(500).json({ error: `Failed to ${fn.name}` });
  }
};

const getAdminFlag = async (userId) => {
  const admin = await prisma.admins.findUnique({
    where: { admin_id: toInt(userId) },
    select: { admin_id: true },
  });
  return Boolean(admin);
};

// Main controller functions
const signup = handleAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, country } = req.body;
  const normalizedEmail = email.toLowerCase();
  const hashedPassword = await bcrypt.hash(password, CONFIG.bcrypt.saltRounds);

  const existingUser = await prisma.users.findUnique({
    where: { email: normalizedEmail },
    select: { user_id: true },
  });

  if (existingUser) {
    return res.status(400).json({ error: "Email already registered" });
  }

  userExistenceCache.del(USER_EXISTENCE_CACHE_KEY_PREFIX + normalizedEmail);

  const user = await prisma.users.create({
    data: {
      name,
      email: normalizedEmail,
      password: hashedPassword,
      country,
      is_verified: false,
    },
    select: { user_id: true },
  });

  const verificationToken = helpers.generateVerificationToken(user.user_id);
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
    normalizedEmail,
    "Welcome to Devquest - Verify Your Email",
    emailContent
  );

  await logActivity(
    "User",
    `Verification email sent to: ${normalizedEmail}`,
    user.user_id
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

  const normalizedEmail = email.toLowerCase();

  const user = await prisma.users.findUnique({
    where: { email: normalizedEmail },
    select: {
      user_id: true,
      name: true,
      email: true,
      password: true,
      is_verified: true,
      created_at: true,
      profileimage: true,
      country: true,
      bio: true,
      skills: true,
    },
  });

  if (user) {
    userExistenceCache.set(USER_EXISTENCE_CACHE_KEY_PREFIX + user.user_id, true);
  }

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

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

  const isAdmin = await getAdminFlag(user.user_id);

  const accessToken = helpers.generateAccessToken(user.user_id, {
    admin: isAdmin,
  });

  const refreshToken = await helpers.generateRefreshToken(user.user_id);

  res.status(200).json({
    message: "Login successful",
    token: accessToken,
    refreshToken,
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

const refreshAccessToken = handleAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  const storedToken = await prisma.refresh_tokens.findUnique({
    where: { token: refreshToken },
    select: {
      user_id: true,
      expires_at: true,
    },
  });

  if (!storedToken) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  if (new Date() > new Date(storedToken.expires_at)) {
    await prisma.refresh_tokens.deleteMany({ where: { token: refreshToken } });
    return res.status(401).json({ error: "Refresh token expired" });
  }

  const user = await prisma.users.findUnique({
    where: { user_id: storedToken.user_id },
    select: {
      name: true,
      country: true,
      bio: true,
      skills: true,
      profileimage: true,
    },
  });

  if (user) {
    userExistenceCache.set(
      USER_EXISTENCE_CACHE_KEY_PREFIX + storedToken.user_id,
      true
    );
  }

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const isAdmin = await getAdminFlag(storedToken.user_id);
  const accessToken = helpers.generateAccessToken(storedToken.user_id, {
    admin: isAdmin,
  });

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
    await prisma.refresh_tokens.deleteMany({ where: { token: refreshToken } });
  }

  res.status(200).json({ message: "Logged out successfully" });
});

const updateProfile = handleAsync(async (req, res) => {
  const { name, country, bio, skills } = req.body;

  try {
    let skillsToSave = skills;
    if (skills && !Array.isArray(skills)) {
      try {
        skillsToSave = JSON.parse(skills);
      } catch {
        skillsToSave = [skills];
      }
    }

    const data = {};
    if (name !== undefined) data.name = name;
    if (country !== undefined) data.country = country;
    if (bio !== undefined) data.bio = bio;
    if (skillsToSave !== undefined) data.skills = skillsToSave;

    const updatedUser = await prisma.users.update({
      where: { user_id: toInt(req.user.userId) },
      data,
      select: {
        name: true,
        country: true,
        bio: true,
        skills: true,
        profileimage: true,
      },
    });

    userExistenceCache.del(USER_EXISTENCE_CACHE_KEY_PREFIX + req.user.userId);

    const isAdmin = await getAdminFlag(req.user.userId);

    const accessToken = helpers.generateAccessToken(req.user.userId, {
      admin: isAdmin,
    });

    try {
      const allFieldsFilled = Boolean(
        updatedUser.name &&
          updatedUser.country &&
          updatedUser.bio &&
          updatedUser.skills &&
          updatedUser.profileimage
      );
      if (allFieldsFilled) {
        await require("../controllers/badge.controller").checkAndAwardBadges(
          req.user.userId,
          "profile_complete",
          { profileComplete: true }
        );
      }
    } catch (badgeErr) {
      console.error(
        "[Profile Badge] Error checking/awarding profile complete badge:",
        badgeErr
      );
    }

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
    if (err.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

const changePassword = handleAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.users.findUnique({
    where: { user_id: toInt(req.user.userId) },
    select: { password: true },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ error: "Current password is incorrect" });
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    CONFIG.bcrypt.saltRounds
  );

  await prisma.users.update({
    where: { user_id: toInt(req.user.userId) },
    data: { password: hashedPassword },
  });

  res.status(200).json({ message: "Password changed successfully" });
});

const sendPasswordResetEmail = handleAsync(async (req, res) => {
  const { email } = req.body;

  if (!email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  const normalizedEmail = email.toLowerCase();
  const user = await prisma.users.findUnique({
    where: { email: normalizedEmail },
    select: { user_id: true },
  });

  if (user) {
    userExistenceCache.del(USER_EXISTENCE_CACHE_KEY_PREFIX + user.user_id);

    const resetToken = helpers.generateToken(user.user_id, {
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
      normalizedEmail,
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

  const updated = await prisma.users.updateMany({
    where: { user_id: toInt(decoded.userId) },
    data: { password: hashedPassword },
  });

  if (updated.count === 0) {
    return res.status(404).json({ error: "User not found" });
  }

  res.status(200).json({ message: "Password updated successfully" });
});

const checkAuth = handleAsync(async (req, res) => {
  setCacheHeaders(res, { noStore: true });
  const userId = toInt(req.user?.userId ?? req.user?.user_id);
  if (!Number.isFinite(userId)) {
    return res.status(401).json({ message: "No token provided" });
  }

  const user = await prisma.users.findUnique({
    where: { user_id: userId },
    select: { user_id: true },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({
    isAuthenticated: true,
    isAdmin: Boolean(req.user?.admin),
  });
});

const verifyEmail = handleAsync(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: "Verification token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;

    if (!userId) {
      return res.status(400).json({ error: "Invalid token format" });
    }

    const existingUser = await prisma.users.findUnique({
      where: { user_id: toInt(userId) },
      select: { is_verified: true },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (existingUser.is_verified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    await prisma.users.update({
      where: { user_id: toInt(userId) },
      data: { is_verified: true },
    });

    await logActivity("User", `Email verified for user ID: ${userId}`, toInt(userId));
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
  let { email } = req.body;
  const { token } = req.body;

  if (!email && token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && (decoded.userId || decoded.id)) {
        const userId = decoded.userId || decoded.id;
        const user = await prisma.users.findUnique({
          where: { user_id: toInt(userId) },
          select: { email: true },
        });
        if (user) {
          email = user.email;
        }
      }
    } catch (error) {
      console.error("Error decoding token for resend:", error);
    }
  }

  if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  const normalizedEmail = email.toLowerCase();

  const user = await prisma.users.findUnique({
    where: { email: normalizedEmail },
    select: { user_id: true, name: true, is_verified: true },
  });

  if (!user) {
    return res.status(200).json({
      message:
        "If your email exists and requires verification, you will receive a verification email.",
    });
  }

  if (user.is_verified) {
    return res.status(200).json({
      message: "Your email is already verified. You can log in now.",
    });
  }

  const verificationToken = helpers.generateVerificationToken(user.user_id);
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const emailContent = helpers.getEmailTemplate(`
    <h1 style="color: #111827; font-size: 24px; font-weight: 600; margin-bottom: 24px; text-align: center;">Verify Your Email Address</h1>
    <p style="color: #4B5563; line-height: 1.6; margin-bottom: 24px;">
      Hello ${user.name || "there"}, you requested a new verification email. Please click the button below to verify your email address.
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

  await helpers.sendEmail(
    normalizedEmail,
    "Verify Your Email - Devquest",
    emailContent
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
    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
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
          <strong>Your rating:</strong> ${"★".repeat(rating)}${"☆".repeat(5 - rating)}
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

    const messageData = {
      from: `Devquest Support <${process.env.SENDER_EMAIL_SUPPORT}>`,
      to: `${name} <${email}>`,
      subject: "We've Responded to Your Feedback",
      html: emailContent,
      "o:tag": ["feedback-reply", "auth-email"],
      "h:X-Email-Type": "feedback-reply",
    };

    const response = await mg.messages.create(
      process.env.MAILGUN_DOMAIN,
      messageData
    );

    console.log(
      `Feedback reply email sent successfully to ${email}. Message ID: ${response.id}`
    );
    return true;
  } catch (error) {
    console.error("Error sending feedback reply email:", error);
    throw new Error("Failed to send feedback reply email");
  }
};

const checkAdminStatus = handleAsync(async (req, res, next) => {
  const isAdmin = await getAdminFlag(req.user.userId);

  if (!isAdmin) {
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

  const normalizedEmail = newEmail.toLowerCase();

  const existingUser = await prisma.users.findUnique({
    where: { email: normalizedEmail },
    select: { user_id: true },
  });

  if (existingUser) {
    return res.status(400).json({ error: "Email is already in use" });
  }

  const user = await prisma.users.findUnique({
    where: { user_id: toInt(userId) },
    select: { email: true, name: true },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const token = helpers.generateToken(userId, {
    newEmail: normalizedEmail,
    currentEmail: user.email,
    purpose: "email_change",
    expiresIn: CONFIG.jwt.verificationExpiresIn,
  });

  const verificationLink = `${process.env.FRONTEND_URL}/confirm-email-change?token=${token}`;

  const emailContent = helpers.getEmailTemplate(`
    <h1 style="color: #111827; font-size: 24px; font-weight: 600; margin-bottom: 24px; text-align: center;">Email Change Request</h1>
    <p style="color: #4B5563; line-height: 1.6; margin-bottom: 24px;">
      Hello ${user.name}, we received a request to change your email address from ${user.email} to ${normalizedEmail}.
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
    user.email,
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

    const existingUser = await prisma.users.findFirst({
      where: {
        email: newEmail.toLowerCase(),
        NOT: { user_id: toInt(userId) },
      },
      select: { user_id: true },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email is no longer available" });
    }

    const updated = await prisma.users.updateMany({
      where: {
        user_id: toInt(userId),
        email: currentEmail,
      },
      data: {
        email: newEmail.toLowerCase(),
      },
    });

    if (updated.count === 0) {
      return res
        .status(400)
        .json({ error: "Failed to update email. Please try again." });
    }

    await logActivity(
      "User",
      `Email changed from ${currentEmail} to ${newEmail}`,
      toInt(userId)
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
