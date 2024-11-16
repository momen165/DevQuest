const express = require('express');
const db = require('../config/database');
const authenticateToken = require('../middlewares/authenticateToken');
const upload = require('../middlewares/multerConfig');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.post('/uploadProfilePic', authenticateToken, upload.single('profilePic'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const filename = `profile_${userId}.jpg`;
        const filePath = `uploads/${filename}`;
        const profileimage = `/${filePath}`;

        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads', { recursive: true });
        }

        await sharp(req.file.buffer)
            .jpeg({ quality: 80 })
            .toFile(filePath);

        const query = 'UPDATE users SET profileimage = $1 WHERE user_id = $2';
        await db.query(query, [profileimage, userId]);

        res.status(200).json({
            message: 'Profile picture uploaded successfully',
            profileimage,
        });
    } catch (err) {
        console.error('Error uploading profile picture:', err);
        res.status(500).json({ error: 'Failed to upload profile picture' });
    }
});

router.post('/updateProfile', authenticateToken, async (req, res) => {
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
});

router.delete('/removeProfilePic', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const querySelect = 'SELECT profileimage FROM users WHERE user_id = $1';
        const { rows } = await db.query(querySelect, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const profileimage = rows[0].profileimage;

        if (profileimage) {
            const filePath = path.join(__dirname, profileimage);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            const queryUpdate = 'UPDATE users SET profileimage = NULL WHERE user_id = $1';
            await db.query(queryUpdate, [userId]);

            res.status(200).json({ message: 'Profile picture removed successfully' });
        } else {
            res.status(400).json({ error: 'No profile picture to remove' });
        }
    } catch (err) {
        console.error('Error removing profile picture:', err);
        res.status(500).json({ error: 'Failed to remove profile picture' });
    }
});

router.get('/students', authenticateToken, async (req, res) => {
    try {
        if (!req.user.admin) {
            console.error(`Access denied for user: ${req.user.userId}`);
            return res.status(403).json({ error: 'Access denied. Admins only.' });
        }

        const query = `
            SELECT 
                u.user_id, 
                u.name, 
                u.email, 
                u.created_at,
                CASE 
                    WHEN us.subscription_id IS NOT NULL THEN 'Active'
                    ELSE 'Inactive'
                END AS subscription
            FROM users u
            LEFT JOIN user_subscription us ON u.user_id = us.user_id;
        `;

        const { rows } = await db.query(query);
        res.status(200).json({ students: rows, count: rows.length });
    } catch (err) {
        console.error('Error fetching students:', err.message || err);
        res.status(500).json({ error: 'An error occurred while fetching students data.' });
    }
});

router.get('/students/:studentId', authenticateToken, async (req, res) => {
    const { studentId } = req.params;

    if (!studentId || isNaN(studentId)) {
        return res.status(400).json({ error: 'Invalid student ID.' });
    }

    try {
        const query = `
            SELECT 
                u.user_id, 
                u.name, 
                u.email, 
                CASE 
                    WHEN us.subscription_id IS NOT NULL THEN 'Active'
                    ELSE 'Inactive'
                END AS subscription
            FROM users u
            LEFT JOIN user_subscription us ON u.user_id = us.user_id
            WHERE u.user_id = $1
        `;

        const { rows } = await db.query(query, [studentId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Student not found.' });
        }

        res.status(200).json(rows[0]);
    } catch (err) {
        console.error('Error fetching student details:', err);
        res.status(500).json({ error: 'Failed to fetch student details.' });
    }
});

router.get('/students/:studentId/courses', authenticateToken, async (req, res) => {
    const { studentId } = req.params;

    if (!studentId || isNaN(studentId)) {
        return res.status(400).json({ error: 'Invalid student ID.' });
    }

    try {
        const query = `
            SELECT 
                c.name AS course_name, 
                e.progress 
            FROM enrollment e
            JOIN course c ON e.course_id = c.course_id
            WHERE e.user_id = $1
        `;

        const { rows } = await db.query(query, [studentId]);

        if (rows.length === 0) {
            return res.status(200).json([]);
        }

        res.status(200).json(rows);
    } catch (err) {
        console.error('Error fetching courses for student:', err);
        res.status(500).json({ error: 'Failed to fetch courses for the student.' });
    }
});

module.exports = router;