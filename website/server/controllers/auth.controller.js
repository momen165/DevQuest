const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { validationResult } = require('express-validator');
const logActivity = require('../utils/logger');

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





module.exports = {
  signup,
  login,
  updateProfile,
  
  changePassword,
   
};