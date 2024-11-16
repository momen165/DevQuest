const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const logActivity = require('../utils/logActivity');
const router = express.Router();

router.post('/signup', async (req, res) => {
    const { name, email, password, country } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (name, email, password, country) VALUES ($1, $2, $3, $4) RETURNING user_id';
        const { rows } = await db.query(query, [name, email, hashedPassword, country]);
        const userId = rows[0].user_id;
        await logActivity('User', `New user registered: ${name}`, userId);
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        console.error('Failed to create user:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const userQuery = 'SELECT * FROM users WHERE email = $1';
        const { rows } = await db.query(userQuery, [email]);

        if (rows.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const adminQuery = 'SELECT 1 FROM admins WHERE admin_id = $1';
        const adminResult = await db.query(adminQuery, [user.user_id]);
        const isAdmin = adminResult.rowCount > 0;

        const token = jwt.sign({
            userId: user.user_id,
            name: user.name,
            country: user.country,
            bio: user.bio,
            admin: isAdmin,
            profileimage: user.profileimage,
        }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            message: 'Login successful',
            token,
            name: user.name,
            country: user.country,
            bio: user.bio,
            admin: isAdmin,
            profileimage: user.profileimage,
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Failed to login' });
    }
});

router.post('/changePassword', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    try {
        const userQuery = 'SELECT password FROM users WHERE user_id = $1';
        const { rows } = await db.query(userQuery, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updateQuery = 'UPDATE users SET password = $1 WHERE user_id = $2';
        await db.query(updateQuery, [hashedPassword, userId]);

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Error changing password:', err);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

module.exports = router;