// Required Modules and Middleware
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware Setup
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Database Configuration
const db = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

// Token Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401); // Unauthorized
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Forbidden
        }
        req.user = user; // Attach user data to the request object
        next();
    });
};

// Multer Configuration for File Uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit files to 5MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype.toLowerCase());
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed (jpeg, jpg, png, webp)'));
        }
    },
});

// Routes

// 1. Signup Route
app.post('/api/signup', async (req, res) => {
    const { name, email, password, country } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (name, email, password, country) VALUES ($1, $2, $3, $4)';
        await db.query(query, [name, email, hashedPassword, country]);
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        console.error('Failed to create user:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// 2. Login Route
app.post('/api/login', async (req, res) => {
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

        const token = jwt.sign(
            { userId: user.user_id, name: user.name, country: user.country },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ message: 'Login successful', token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// 3. Update Profile Route
app.put('/api/updateProfile', authenticateToken, async (req, res) => {
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

// 4. Upload Profile Picture Route
app.post('/api/uploadProfilePic', authenticateToken, upload.single('profilePic'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const filename = `profile_${userId}.jpg`;
        const filePath = path.join('uploads', filename);

        await sharp(req.file.buffer)
            .resize(200, 200)
            .jpeg({ quality: 80 })
            .toFile(filePath);

        const profileimage = `/uploads/${filename}`;
        const query = 'UPDATE users SET profileimage = $1 WHERE user_id = $2';
        await db.query(query, [profileimage, userId]);

        res.status(200).json({ message: 'Profile picture uploaded successfully', profileimage });
    } catch (err) {
        console.error('Error uploading profile picture:', err);
        res.status(500).json({ error: 'Failed to upload profile picture' });
    }
});

// 5. Remove Profile Picture Route
app.delete('/api/removeProfilePic', authenticateToken, async (req, res) => {
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

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
