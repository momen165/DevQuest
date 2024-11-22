const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = process.env.PORT || 5000;
require('dotenv').config();
const sharp = require('sharp');

const fs = require('fs');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
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
   
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000'); // Frontend origin
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Update this header
  next();
}, express.static('uploads'));


app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));


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
    const filetypes = /jpeg|jpg|png|webp|svg/; // Allowed extensions
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
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).trim().escape(),
    body('name').trim().notEmpty().escape()
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
    await logActivity('User', `New user registered: ${name} (Email: ${email})`, userId);

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
            { expiresIn: '72h' }
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
  console.error('Internal Server Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
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
   

    const { title, description, status, difficulty, language_id } = req.body; // Include language_id

    // Validate required fields
    if (!title || !description || !status || !difficulty || !language_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Process image if provided
    let imagePath = null;
    if (req.file) {
      const filename = `course_${Date.now()}_${req.file.originalname.replace(/\s/g, '_')}`;
      imagePath = `/uploads/${filename}`;
      await sharp(req.file.buffer)
        .resize(800)
        .png({ quality: 80 })
        .toFile(`uploads/${filename}`);
    }

    // Insert course into the database
    const query = `
      INSERT INTO course (name, description, status, difficulty, language_id, image)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const result = await db.query(query, [title, description, status, difficulty, language_id, imagePath]);
    await logActivity('Course', `Course created: ${title} by user ID ${req.user.userId} Name (${req.user.name})`, req.user.userId);
    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Failed to add course' });
    }

    // Return the created course
    res.status(201).json(result.rows[0]);
    await logActivity('Course', `New course added: ${title} by user ${req.user.userId} (${req.user.name})`, req.user.userId);
  } catch (err) {
    console.error('Error adding course:', err);
    res.status(500).json({ error: 'Failed to add course' });
  }
});


app.put('/api/editCourses/:course_id', authenticateToken, upload.single('image'), async (req, res) => {
  const { course_id } = req.params;
  const { title, description, status, difficulty, language_id } = req.body;

  if (!course_id || isNaN(course_id)) {
    return res.status(400).json({ error: 'Invalid course ID' });
  }

  try {
    // Fetch the existing course data for comparison
    const oldCourseQuery = 'SELECT * FROM course WHERE course_id = $1';
    const oldCourseResult = await db.query(oldCourseQuery, [course_id]);

    if (oldCourseResult.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const oldCourse = oldCourseResult.rows[0];

    let imagePath = null;
    if (req.file) {
      const filename = `course_${Date.now()}_${req.file.originalname.replace(/\s/g, '_')}`;
      imagePath = `/uploads/${filename}`;
      await sharp(req.file.buffer)
        .resize(800)
        .png({ quality: 80 })
        .toFile(`uploads/${filename}`);
    }

    const query = `
      UPDATE course 
      SET 
        name = $1, 
        description = $2, 
        status = $3, 
        difficulty = $4, 
        language_id = $5, 
        image = COALESCE($6, image)
      WHERE course_id = $7
      RETURNING *;
    `;
    const result = await db.query(query, [title, description, status, difficulty, language_id, imagePath, course_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const updatedCourse = result.rows[0];

    res.status(200).json(updatedCourse);
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
        course.language_id, -- Include language_id
        course.image,
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
  const numericCourseId = parseInt(courseId, 10);

  if (isNaN(numericCourseId)) {
    return res.status(400).json({ error: 'Invalid course ID' });
  }

  try {
    const query = `
      SELECT 
        course.course_id, 
        course.name AS title, 
        course.description, 
        course.difficulty AS level, 
        course.language_id, -- Include language_id
        course.image, 
        COUNT(enrollment.user_id) AS users
      FROM course
      LEFT JOIN enrollment ON course.course_id = enrollment.course_id
      WHERE course.course_id = $1
      GROUP BY 
        course.course_id, 
        course.name, 
        course.description, 
        course.difficulty, 
        course.language_id, -- Include language_id
        course.image;
    `;
    const result = await db.query(query, [numericCourseId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.status(200).json(result.rows[0]);
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




// In server.js, add/update the sections endpoint
app.post('/api/sections', authenticateToken, async (req, res) => {
  try {
    const { course_id, name, description } = req.body;

    // Validate required fields
    if (!course_id || !name) {
      return res.status(400).json({ error: 'course_id and name are required' });
    }

    // Get the next order value
    const orderQuery = `
      SELECT COALESCE(MAX(section_order), 0) + 1 as next_order 
      FROM section 
      WHERE course_id = $1
    `;
    const orderResult = await db.query(orderQuery, [course_id]);
    const nextOrder = orderResult.rows[0].next_order;

    // Insert the new section
    const query = `
      INSERT INTO section (course_id, name, description, section_order)
      VALUES ($1, $2, $3, $4)
      RETURNING section_id, course_id, name, description, section_order;
    `;
    
    const result = await db.query(query, [course_id, name, description, nextOrder]);

    // Log activity
    await logActivity('Section', `New section added: ${name} by user ID ${req.user.userId} Name (${req.user.name})`, req.user.userId);


    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating section:', err);
    res.status(500).json({ error: 'Failed to create section' });
  }
});


app.put('/api/sections/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Input validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid title provided' });
    }

    // Description can be null/empty but if provided must be string
    if (description && typeof description !== 'string') {
      return res.status(400).json({ error: 'Invalid description format' });
    }

    // Update section with both name and description
    const updateQuery = `
      UPDATE section 
      SET name = $1,
          description = $2
          
      WHERE section_id = $3
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, [name.trim(), description, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    await logActivity('Section', `Section updated: ${name} by user ID ${req.user.userId} Name (${req.user.name})`, req.user.userId);

    res.status(200).json({ 
      message: 'Section updated successfully',
      section: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating section:', err);
    res.status(500).json({ error: 'Failed to update section' });
  }
});


app.get('/api/activities/recent', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT activity_id, action_type, action_description, created_at
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
  const courseId = req.params.courseId;

  try {
    // First get course details for logging - fixed column name
    const courseResult = await db.query('SELECT name FROM course WHERE course_id = $1', [courseId]);
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Add check for undefined title
    const name = courseResult.rows[0].name;
    if (!name) {
      return res.status(400).json({ error: 'Course name not found' });
    }

    // Get all sections for this course
    const sections = await db.query('SELECT section_id FROM section WHERE course_id = $1', [courseId]);
    
    // Delete lessons for all sections
    for (const section of sections.rows) {
      await db.query('DELETE FROM lesson WHERE section_id = $1', [section.section_id]);
    }

    // Delete sections
    await db.query('DELETE FROM section WHERE course_id = $1', [courseId]);

    // Delete enrollments
    await db.query('DELETE FROM enrollment WHERE course_id = $1', [courseId]);

    // Finally delete the course
    await db.query('DELETE FROM course WHERE course_id = $1', [courseId]);

    // Log the activity with verified title
    await logActivity('Course', `Course was deleted: ${name} by user ID ${req.user.userId} Name (${req.user.name})`, req.user.userId);
    
    res.status(200).json({ message: 'Course and all related data deleted successfully.' });
    
  } catch (err) {
    console.error('Error deleting course:', err);
    res.status(500).json({ 
      error: 'Failed to delete course',
      details: err.detail || err.message
    });
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

app.get('/api/lesson/:lessonId', async (req, res) => {
  const { lessonId } = req.params;

  try {
    // Query that joins lesson, section, and course to fetch lesson and language_id
    const query = `
      SELECT 
        lesson.*, 
        COALESCE(lesson.test_cases::json, '[{"input": "", "expected_output": ""}]'::json) as test_cases,
        course.language_id -- Fetch language_id from the course table
      FROM lesson
      JOIN section ON lesson.section_id = section.section_id
      JOIN course ON section.course_id = course.course_id
      WHERE lesson.lesson_id = $1;
    `;

    const result = await db.query(query, [lessonId]);

    if (result.rows.length === 0) {
      console.error(`Lesson with ID ${lessonId} not found.`);
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Extract lesson data
    const lessonData = result.rows[0];

    // Ensure test_cases is always an array
    try {
      lessonData.test_cases = Array.isArray(lessonData.test_cases)
        ? lessonData.test_cases.map(testCase => ({
            input: testCase.input || '',
            expectedOutput: testCase.expected_output || '', // Convert to expectedOutput for frontend
          }))
        : [{ input: '', expectedOutput: '' }];
    } catch (err) {
      console.error('Error parsing test_cases:', err);
      lessonData.test_cases = [{ input: '', expectedOutput: '' }];
    }

    console.log('Formatted lesson data with language_id:', lessonData);

    res.status(200).json(lessonData);
  } catch (err) {
    console.error('Error fetching lesson:', err.message);
    res.status(500).json({ error: 'Failed to fetch lesson data. Please try again later.' });
  }
});


app.get('/api/section', async (req, res) => {
  try {
    const { course_id } = req.query;
    

    if (!course_id || isNaN(course_id)) {
      return res.status(400).json({ error: 'Invalid or missing course_id' });
    }

    // Get sections for the course, ordered by section_order
    const query = `
      SELECT 
        section.section_id, 
        section.name, 
        section.description
      FROM section
      WHERE section.course_id = $1
      ORDER BY section_order ASC; -- Ensure sections are ordered
    `;
    const result = await db.query(query, [course_id]);

    // Return an empty array if no sections found
    res.status(200).json(result.rows || []);
  } catch (err) {
    console.error('Error fetching sections:', err);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});


app.put('/api/section/:section_id', async (req, res) => {
  try {
    const { section_id } = req.params;
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: 'name and description are required.' });
    }

    const query = `
      UPDATE section
      SET name = $1, description = $2
      WHERE section_id = $3
      RETURNING section_id, course_id, name, description;
    `;
    const values = [name, description, section_id];

    const result = await db.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Section not found.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating section:', err);
    res.status(500).json({ error: 'Failed to update section.' });
  }
});


app.delete('/api/section/:section_id', authenticateToken, async (req, res) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    const { section_id } = req.params;

    // Get section name first
    const getSectionQuery = 'SELECT name FROM section WHERE section_id = $1';
    const sectionResult = await client.query(getSectionQuery, [section_id]);
    
    if (sectionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Section not found.' });
    }
    
    const sectionName = sectionResult.rows[0].name;

    // Delete associated lessons
    const deleteLessonsQuery = `
      DELETE FROM lesson 
      WHERE section_id = $1 
      RETURNING lesson_id
    `;
    await client.query(deleteLessonsQuery, [section_id]);

    // Delete the section
    const deleteSectionQuery = `
      DELETE FROM section 
      WHERE section_id = $1 
      RETURNING section_id
    `;
    await client.query(deleteSectionQuery, [section_id]);

    await client.query('COMMIT');
    console.log('Section deleted:', sectionName);

    await logActivity(
      'Section', 
      `Section "${sectionName}" deleted by user ID ${req.user.userId} Name (${req.user.name})`, 
      req.user.userId
    );

    res.status(200).json({ message: 'Section and associated lessons deleted successfully.' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting section:', err);
    res.status(500).json({ error: 'Failed to delete section.' });
  } finally {
    client.release();
  }
});


// In server.js
app.post('/api/lessons', async (req, res) => {
  try {
    const { section_id, name, content, xp, test_cases } = req.body;

    // Validate required fields
    if (!section_id || !name || !content) {
      return res.status(400).json({ error: 'section_id, name, and content are required.' });
    }

    const query = `
      INSERT INTO lesson (section_id, name, content, xp, test_cases)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [
      section_id,
      name,
      content,
      xp || 0,
      JSON.stringify(test_cases || [])
    ];

    console.log('Saving test cases:', test_cases); // Debug log
    const result = await db.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding lesson:', err);
    res.status(500).json({ error: 'Failed to add lesson.' });
  }
});



app.get('/api/lessons', async (req, res) => {
  try {
    const { section_id } = req.query;

    if (!section_id) {
      return res.status(400).json({ error: 'section_id is required.' });
    }

    const sectionQuery = 'SELECT * FROM section WHERE section_id = $1';
    const sectionResult = await db.query(sectionQuery, [section_id]);

    if (sectionResult.rowCount === 0) {
      return res.status(404).json({ error: 'Section not found', section_id });
    }

    const query = `
      SELECT lesson_id, name, content, expected_output, xp, test_cases
      FROM lesson
      WHERE section_id = $1;
    `;
    const result = await db.query(query, [section_id]);

    if (result.rowCount === 0) {
      return res.status(200).json({
        message: 'No lessons found for this section.',
        section_id,
        lessons: [],
      });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching lessons:', err);
    res.status(500).json({ error: 'Failed to fetch lessons.', details: err.message });
  }
});



// In server.js - Update lessons PUT endpoint
// In server.js
app.put('/api/lessons/:lesson_id', authenticateToken, async (req, res) => {
  try {
    const { lesson_id } = req.params;
    const { name, content, xp, test_cases, section_id } = req.body;

    // Validate required fields
    if (!name || !content || !section_id) {
      return res.status(400).json({ error: 'Name, content and section_id are required' });
    }

    const query = `
      UPDATE lesson 
      SET name = $1, 
          content = $2, 
          xp = $3, 
          test_cases = $4,
          section_id = $5
         
      WHERE lesson_id = $6
      RETURNING *;
    `;

    const values = [
      name,
      content,
      xp || 0,
      JSON.stringify(test_cases || []), // Ensure test_cases is always an array
      section_id,
      lesson_id
    ];

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Log successful update
    console.log('Updated lesson data:', result.rows[0]);
    await logActivity('Lesson', `Lesson updated: ${name} by user ID ${req.user.userId} Name (${req.user.name})`, req.user.userId);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating lesson:', err);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});









app.delete('/api/lessons/:lesson_id', async (req, res) => {
  try {
    const { lesson_id } = req.params;

    const query = `DELETE FROM lesson WHERE lesson_id = $1 RETURNING lesson_id;`;
    const result = await db.query(query, [lesson_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }
    await logActivity('Lesson', `Lesson deleted: ${lessonId} by user ID ${req.user.userId} Name (${req.user.name})`, req.user.userId);
    res.status(200).json({ message: 'Lesson deleted successfully.', lesson_id });
  } catch (err) {
    console.error('Error deleting lesson:', err);
    res.status(500).json({ error: 'Failed to delete lesson.' });
  }
});



app.get('/api/lesson/:lessonId', async (req, res) => {
  const { lessonId } = req.params;

  try {
    const query = `
      SELECT 
        lesson.*, 
        COALESCE(lesson.test_cases::json, '[{"input": "", "expected_output": ""}]'::json) as test_cases
      FROM lesson 
      WHERE lesson_id = $1;
    `;

    const result = await db.query(query, [lessonId]);

    if (result.rows.length === 0) {
      console.error(`Lesson with ID ${lessonId} not found.`);
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Extract lesson data
    const lessonData = result.rows[0];

    // Ensure test_cases is always an array
    try {
      lessonData.test_cases = Array.isArray(lessonData.test_cases)
        ? lessonData.test_cases.map(testCase => ({
            input: testCase.input || '',
            expectedOutput: testCase.expected_output || '', // Convert to expectedOutput for frontend
          }))
        : [{ input: '', expectedOutput: '' }];
    } catch (err) {
      console.error('Error parsing test_cases:', err);
      lessonData.test_cases = [{ input: '', expectedOutput: '' }];
    }

    console.log('Formatted lesson data:', lessonData);

    res.status(200).json(lessonData);
  } catch (err) {
    console.error('Error fetching lesson:', err.message);
    res.status(500).json({ error: 'Failed to fetch lesson data. Please try again later.' });
  }
});


app.post('/api/subscribe', authenticateToken, async (req, res) => {
  const { amount_paid } = req.body;
  const userId = req.user.userId; // Extracted from the token

  try {
    // Step 1: Insert the subscription into the `subscription` table
    const subscriptionQuery = `
      INSERT INTO subscription (subscription_start_date, amount_paid, status)
      VALUES (CURRENT_DATE, $1, 'Completed')
      RETURNING subscription_id;
    `;
    const { rows: subscriptionRows } = await db.query(subscriptionQuery, [amount_paid]);

    const subscriptionId = subscriptionRows[0].subscription_id;

    // Step 2: Link user to subscription in `user_subscription`
    const userSubscriptionQuery = `
      INSERT INTO user_subscription (user_id, subscription_id)
      VALUES ($1, $2);
    `;
    await db.query(userSubscriptionQuery, [userId, subscriptionId]);

    res.status(201).json({ subscription_id: subscriptionId });
  } catch (error) {
    console.error('Error creating subscription:', error); // Debug log
    res.status(500).json({ error: 'Failed to create subscription.' });
  }
});


app.get('/api/subscriptions', authenticateToken, async (req, res) => {
  if (!req.user.admin) {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }

  try {
    const query = `
      SELECT 
        s.subscription_id,
        u.name AS student_name,
        s.amount_paid,
        s.subscription_start_date,
        s.status,
      FROM subscription s
      JOIN user_subscription us ON s.subscription_id = us.subscription_id
      JOIN users u ON us.user_id = u.user_id;
    `;
    const { rows } = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions.' });
  }
});

app.get('/api/feedbackad', async (req, res) => {
  try {
    const query = `
      SELECT 
        f.feedback_id, 
        u.name AS student_name, 
        c.name AS course_name, 
        f.comment AS feedback, 
        f.rating, 
        f.created_at AS date
      FROM feedback f
      JOIN users u ON f.user_id = u.user_id
      JOIN course c ON f.course_id = c.course_id
      ORDER BY f.created_at DESC;
    `;

    const { rows } = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});




// Judge0 configuration
const JUDGE0_API_URL = 'http://51.44.5.41:2358/submissions?base64_encoded=true';
const POLL_INTERVAL = 1000; // Polling interval in milliseconds

const { Buffer } = require('buffer'); // Node.js built-in module


app.post('/api/run', authenticateToken, async (req, res) => {
  const { lessonId, code } = req.body;

  if (!lessonId || !code) {
    return res.status(400).json({ error: 'Missing required fields: lessonId or code' });
  }

  try {
    // Get language ID and test cases in parallel
    const [langResult, lessonResult] = await Promise.all([
      db.query(`
        SELECT c.language_id
        FROM course c
        JOIN section s ON c.course_id = s.course_id
        JOIN lesson l ON s.section_id = l.section_id
        WHERE l.lesson_id = $1
      `, [lessonId]),
      db.query('SELECT test_cases FROM lesson WHERE lesson_id = $1', [lessonId])
    ]);

    // Validate language ID
    if (langResult.rowCount === 0 || !langResult.rows[0].language_id) {
      return res.status(400).json({ error: 'Language ID not found for this lesson' });
    }

    // Validate lesson and test cases
    if (lessonResult.rowCount === 0 || !Array.isArray(lessonResult.rows[0].test_cases)) {
      return res.status(404).json({ error: 'Lesson or test cases not found' });
    }

    const languageId = langResult.rows[0].language_id;
    const testCases = lessonResult.rows[0].test_cases;

    // Process test cases
    const results = await Promise.all(testCases.map(async testCase => {
      const { input, expectedOutput, expected_output } = testCase;
      const normalizedExpectedOutput = (expectedOutput || expected_output || '').replace(/\\n/g, '\n');

      // Validate test case
      if (!input || !normalizedExpectedOutput) {
        throw new Error('Invalid test case format');
      }

      // Prepare submission
      const submission = {
        source_code: Buffer.from(code).toString('base64'),
        language_id: languageId,
        stdin: Buffer.from(input).toString('base64'),
        expected_output: Buffer.from(normalizedExpectedOutput).toString('base64')
      };

      // Submit code
      const { data: { token } } = await axios.post(JUDGE0_API_URL, submission);

      // Poll for results
      let result;
      do {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        const response = await axios.get(
          `http://51.44.5.41:2358/submissions/${token}?base64_encoded=true`
        );
        result = response.data;
      } while (result.status.id < 3);

      // Process result
      const actualOutput = result.stdout 
        ? Buffer.from(result.stdout, 'base64').toString().trim()
        : '';

      return {
        input,
        expected_output: normalizedExpectedOutput.trim(),
        actual_output: actualOutput,
        status: actualOutput === normalizedExpectedOutput.trim() ? 'Passed' : 'Failed',
        error: result.stderr ? Buffer.from(result.stderr, 'base64').toString() : null
      };
    }));

    res.json({ results });

  } catch (error) {
    console.error('Error in /api/run:', error);
    res.status(500).json({ 
      error: 'Code execution failed',
      details: error.response?.data || error.message 
    });
  }
});

app.post('/api/sections/reorder', async (req, res) => {
  const { sections } = req.body; // Expect an array of { section_id, order }

  if (!sections || !Array.isArray(sections)) {
    return res.status(400).json({ error: 'Invalid request format. Expected an array of sections.' });
  }

  const client = await db.connect(); // Use 'db' instead of 'pool'


  try {
    await client.query('BEGIN');

    // Update section order for each section
    const updatePromises = sections.map(({ section_id, order }) => {
      return client.query(
        'UPDATE section SET section_order = $1 WHERE section_id = $2',
        [order, section_id]
      );
    });

    await Promise.all(updatePromises);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error reordering sections:', err);
    res.status(500).json({ error: 'Failed to reorder sections.' });
  } finally {
    client.release();
  }
});


// Reorder lessons
app.post('/api/lessons/reorder', async (req, res) => {
  const { lessons } = req.body; // Expect an array of { lesson_id, order }

  if (!lessons || !Array.isArray(lessons)) {
    return res.status(400).json({ error: 'Invalid request format. Expected an array of lessons.' });
  }

  const client = await db.connect(); // Use 'db' instead of 'pool'


  try {
    await client.query('BEGIN');

    // Update lesson order for each lesson
    const updatePromises = lessons.map(({ lesson_id, order }) => {
      return client.query(
        'UPDATE lesson SET lesson_order = $1 WHERE lesson_id = $2',
        [order, lesson_id]
      );
    });

    await Promise.all(updatePromises);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error reordering lessons:', err);
    res.status(500).json({ error: 'Failed to reorder lessons.' });
  } finally {
    client.release();
  }
});
