const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = process.env.PORT || 5000;
require('dotenv').config();
app.use('/uploads', express.static('uploads'));
const sharp = require('sharp');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

app.use(cors());
app.use(express.json());

const db = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

const storage = multer.memoryStorage();


const tempDir = 'uploads/temp';

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
  }
  


// Set up storage engine
const upload = multer({
    storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit files to 5MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/; // Allowed extensions
    const mimetype = filetypes.test(file.mimetype.toLowerCase());
    const extname = filetypes.test(require('path').extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed (jpeg, jpg, png)'));
    }
  },
});
  
  

// Corrected middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Extract token from 'Bearer <token>'
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.sendStatus(401); // Unauthorized
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Forbidden
        }
        req.user = user;
        next();
    });
};






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

        const adminQuery = 'SELECT 1 FROM admins WHERE admin_id = $1';
        const adminResult = await db.query(adminQuery, [user.user_id]);
        const isAdmin = adminResult.rowCount > 0;

        // Log to confirm country and bio data
        console.log('User Data:', { name: user.name, country: user.country, bio: user.bio });

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
            { expiresIn: '1h' }
        );

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



app.post('/api/uploadProfilePic', authenticateToken, upload.single('profilePic'), async (req, res) => {
    try {
      const userId = req.user.userId;
      const filename = `profile_${userId}.jpg`; // Use .jpg extension for consistency
      const filePath = `uploads/${filename}`;
      const profileimage = `/${filePath}`;
  
      // Ensure 'uploads' directory exists
      const fs = require('fs');
      if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads', { recursive: true });
      }
  
      // Process and save the image from buffer
      await sharp(req.file.buffer)
        //.resize(200, 200) // Resize the image
        .jpeg({ quality: 80 }) // Convert to JPEG format
        .toFile(filePath); // Save to disk
  
      // No need to delete temporary files
  
      // Update user's profileimage in the database
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
  

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});





// server.js

app.post('/api/updateProfile', authenticateToken, async (req, res) => {
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
  

  app.delete('/api/removeProfilePic', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.userId;
  
      // Retrieve the current profile picture URL from the database
      const querySelect = 'SELECT profileimage FROM users WHERE user_id = $1';
      const { rows } = await db.query(querySelect, [userId]);
  
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      const profileimage = rows[0].profileimage;
  
      if (profileimage) {
        // Construct the file path
        const filePath = path.join(__dirname, profileimage);
  
        // Delete the file if it exists
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
  
        // Update the database to remove the profileimage
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