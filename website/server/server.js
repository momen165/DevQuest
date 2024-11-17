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

// Add security headers
const helmet = require('helmet');
app.use(helmet());

// Add rate limiting
// const rateLimit = require('express-rate-limit');
// app.use(rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 100
// }));

// // Add request size limit
// app.use(express.json({ limit: '10kb' }));

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
  
  
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
      return res.status(401).json({ error: 'Token missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
          console.error('Token verification failed:', err.message); // Log error
          return res.status(403).json({ error: 'Invalid token' });
      }
      req.user = user;
      next();
  });
};

// Add input validation middleware
const { body, validationResult } = require('express-validator');
const validateSignup = [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty()
];

app.post('/api/signup', validateSignup, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
  }
  const { name, email, password, country } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Use RETURNING to get the new user's ID
    const query = 'INSERT INTO users (name, email, password, country) VALUES ($1, $2, $3, $4) RETURNING user_id';
    const { rows } = await db.query(query, [name, email, hashedPassword, country]);

    const userId = rows[0].user_id;

    // Log the activity
    await logActivity('User', `New user registered: ${name}`, userId);

    // Send the response after logging activity
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


  // Add this endpoint in your server.js

app.post('/api/changePassword', authenticateToken, async (req, res) => {
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
});

// Add new course with image upload
app.post('/api/addCourses', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    console.log('Request Body:', req.body);
    console.log('Uploaded File:', req.file);

    const { title, description, status, difficulty } = req.body; // Updated to use "title"

    // Validate required fields
    if (!title || !description || !status || !difficulty) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Process image if provided
    let imagePath = null;
    if (req.file) {
      const filename = `course_${Date.now()}_${req.file.originalname.replace(/\s/g, '_')}`;
      imagePath = `/uploads/${filename}`;
      await sharp(req.file.buffer)
        .resize(800) // Adjust size if needed
        .png({ quality: 80 }) // Keep the image in PNG format
        .toFile(`uploads/${filename}`);
    }

    // Insert course into the database
    const query = `
      INSERT INTO course (name, description, status, difficulty, image)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const result = await db.query(query, [title, description, status, difficulty, imagePath]);

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Failed to add course' });
    }

    // Return the created course
    res.status(201).json(result.rows[0]);
    await logActivity('Course', `New course added: ${title}`, req.user.userId);
  } catch (err) {
    console.error('Error adding course:', err);
    if (err.code === '23502') {
      res.status(400).json({ error: 'Missing required fields (name, description, status, difficulty).' });
    } else {
      res.status(500).json({ error: 'Failed to add course' });
    }
  }
});

// Update course with image upload
app.put('/api/editCourses/:course_id', authenticateToken, upload.single('image'), async (req, res) => {
  const { course_id } = req.params;
  const { title, description, status, difficulty } = req.body; // Updated to use "title"

  if (!course_id || isNaN(course_id)) {
    return res.status(400).json({ error: 'Invalid course ID' });
  }

  try {
    let imagePath = null;

    if (req.file) {
      const filename = `course_${Date.now()}_${req.file.originalname.replace(/\s/g, '_')}`;
      imagePath = `/uploads/${filename}`;
      await sharp(req.file.buffer)
        .resize(800) // Adjust size if needed
        .png({ quality: 80 }) // Keep the image in PNG format
        .toFile(`uploads/${filename}`);
    }

    const query =
      'UPDATE course SET name = $1, description = $2, status = $3, difficulty = $4, image = COALESCE($5, image) WHERE course_id = $6 RETURNING *';
    const result = await db.query(query, [title, description, status, difficulty, imagePath, course_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating course:', err);
    res.status(500).json({ error: 'Failed to update course' });
  }
});


app.get('/api/courses', async (req, res) => {
  try {
    const query = `
      SELECT 
        course.course_id, 
        course.name AS title, 
        course.description, 
        course.difficulty AS level, 
        course.image, -- Include the image column
        COUNT(enrollment.user_id) AS users
      FROM course
      LEFT JOIN enrollment ON course.course_id = enrollment.course_id
      GROUP BY course.course_id;
    `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
    
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});


app.get('/api/courses/:courseId', async (req, res) => {
  const { courseId } = req.params;

  try {
    const query = `
      SELECT 
        course.course_id, 
        course.name AS title, 
        course.description, 
        course.difficulty AS level, 
        course.image, 
        COUNT(enrollment.user_id) AS users
      FROM course
      LEFT JOIN enrollment ON course.course_id = enrollment.course_id
      WHERE course.course_id = $1
      GROUP BY course.course_id;
    `;
    const result = await db.query(query, [courseId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.status(200).json(result.rows[0]); // Return the single course data
  } catch (err) {
    console.error('Error fetching course:', err);
    res.status(500).json({ error: 'Failed to fetch course data' });
  }
});


app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    

    // Role-based access control
    if (!req.user.admin) {
      console.error(`Access denied for user: ${req.user.userId}`);
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const query = `
      SELECT 
        u.user_id, 
        u.name, 
        u.email, 
        u.created_at, -- Ensure this column exists in the database
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






app.get('/api/students/:studentId', authenticateToken, async (req, res) => {
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


app.get('/api/students/:studentId/courses', authenticateToken, async (req, res) => {
  const { studentId } = req.params;

  // Validate studentId
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

    // Return empty array if no courses found
    if (rows.length === 0) {
      return res.status(200).json([]); // Empty array indicates no courses
    }

    res.status(200).json(rows); // Return the list of courses
  } catch (err) {
    console.error('Error fetching courses for student:', err);
    res.status(500).json({ error: 'Failed to fetch courses for the student.' });
  }
});




app.post('/api/sections', authenticateToken, async (req, res) => {
  try {
    const { courseId, title } = req.body;

    const query = `
      INSERT INTO sections (course_id, title)
      VALUES ($1, $2) RETURNING section_id
    `;
    const { rows } = await db.query(query, [courseId, title]);

    // Log activity
    await logActivity('Section', `New section added: ${title}`, req.user.userId);

    res.status(201).json({ message: 'Section added successfully' });
  } catch (err) {
    console.error('Error adding section:', err.message || err);
    res.status(500).json({ error: 'Failed to add section' });
  }
});

app.put('/api/sections/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const query = `
      UPDATE sections SET title = $1 WHERE section_id = $2
    `;
    await db.query(query, [title, id]);

    // Log activity
    await logActivity('Section', `Section updated: ${title}`, req.user.userId);

    res.status(200).json({ message: 'Section updated successfully' });
  } catch (err) {
    console.error('Error updating section:', err.message || err);
    res.status(500).json({ error: 'Failed to update section' });
  }
});



app.get('/api/activities/recent', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT action_type, action_description, created_at
      FROM recent_activity
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const { rows } = await db.query(query);

    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching recent activity:', err);
    res.status(500).json({ error: 'Failed to fetch recent activity.' });
  }
});



const logActivity = async (actionType, actionDescription, userId = null) => {
  try {
    const query = `
      INSERT INTO recent_activity (action_type, action_description, user_id)
      VALUES ($1, $2, $3)
    `;
    await db.query(query, [actionType, actionDescription, userId]);
  } catch (err) {
    console.error('Error logging activity:', err.message || err);
  }
};



app.delete('/api/courses/:courseId', authenticateToken, async (req, res) => {
  const { courseId } = req.params;

  try {
    // Delete related records in the enrollment table
    await db.query('DELETE FROM enrollment WHERE course_id = $1', [courseId]);

    // Delete the course itself
    await db.query('DELETE FROM course WHERE course_id = $1', [courseId]);

    res.status(200).json({ message: 'Course and related enrollments deleted successfully.' });
  } catch (err) {
    console.error('Error deleting course:', err);
    res.status(500).json({ error: 'Failed to delete course.' });
  }
});


// server.js
app.get('/api/feedback', async (req, res) => {
  try {
      const result = await db.query('SELECT course_id, Round(AVG(rating)) as average_rating FROM feedback GROUP BY course_id');
      const ratings = result.rows.reduce((acc, row) => {
          acc[row.course_id] = row.average_rating;
          return acc;
      }, {});
      res.json(ratings); // Returns an object with course_id as key and average_rating as value
  } catch (error) {
      console.error('Error fetching feedback:', error);
      res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});
