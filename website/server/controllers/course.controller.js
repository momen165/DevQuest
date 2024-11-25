const db = require('../config/database');
const logActivity = require('../utils/logger');
const sharp = require('sharp');

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const { v4: uuidv4 } = require('uuid');


// Configure AWS S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const addCourse = async (req, res) => {
  const { title, description, status, difficulty, language_id } = req.body;
  let imageUrl = null;

  try {
    // Validate required fields
    if (!title || !description || !status || !difficulty || !language_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Process and upload the image to S3 if provided
    if (req.file) {
      const filename = `course_${uuidv4()}.png`;

      // Process the image using sharp
      const processedBuffer = await sharp(req.file.buffer)
        .resize(800) // Resize to a max width of 800px
        .png({ quality: 80 }) // Convert to PNG format with quality
        .toBuffer();

      // Upload the image to S3
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `uploads/${filename}`, // Folder structure in the bucket
        Body: processedBuffer,
        ContentType: 'image/png', // MIME type
      };

      const command = new PutObjectCommand(params);
      await s3Client.send(command);

      // Generate the public URL for the uploaded image
      imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/uploads/${filename}`;
    }

    // Insert course details into the database
    const query = `
      INSERT INTO course (name, description, status, difficulty, language_id, image)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const result = await db.query(query, [title, description, status, difficulty, language_id, imageUrl]);

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Failed to add course' });
    }

    // Log activity
    await logActivity('Course', `New course added: ${title} by user ID ${req.user.userId}`, req.user.userId);

    // Send the newly created course as the response
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding course:', err);
    res.status(500).json({ error: 'Failed to add course' });
  }
};


// Edit a course
const editCourse = async (req, res) => {
  const { course_id } = req.params;
  const { title, description, status, difficulty, language_id } = req.body;

  try {
    // Validate required fields
    if (!course_id || isNaN(course_id)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    // Fetch the existing course data for comparison
    const oldCourseQuery = 'SELECT * FROM course WHERE course_id = $1';
    const oldCourseResult = await db.query(oldCourseQuery, [course_id]);

    if (oldCourseResult.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const oldCourse = oldCourseResult.rows[0];
    let imageUrl = null;

    // Process image and upload to S3 if provided
    if (req.file) {
      const filename = `course_${uuidv4()}.png`;

      // Process the image using sharp
      const processedBuffer = await sharp(req.file.buffer)
        .resize(800) // Resize to a max width of 800px
        .png({ quality: 80 }) // Convert to PNG format with quality
        .toBuffer();

      // Upload the image to S3
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `uploads/${filename}`, // Folder structure in the bucket
        Body: processedBuffer,
        ContentType: 'image/png', // MIME type
      };

      const command = new PutObjectCommand(params);
      await s3Client.send(command);

      // Generate the public URL for the uploaded image
      imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/uploads/${filename}`;
    }

    // Update the course in the database
    const query = `
      UPDATE course
      SET name = $1, 
          description = $2, 
          status = $3, 
          difficulty = $4, 
          language_id = $5, 
          image = COALESCE($6, image) 
      WHERE course_id = $7
      RETURNING *;
    `;
    const result = await db.query(query, [
      title,
      description,
      status,
      difficulty,
      language_id,
      imageUrl, // Use the new S3 URL if provided, else keep the old image
      course_id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const updatedCourse = result.rows[0];

    // Log the update activity
    await logActivity('Course', `Course updated: ${title} by user ID ${req.user.userId}`, req.user.userId);

    res.status(200).json(updatedCourse);
  } catch (err) {
    console.error('Error updating course:', err);
    res.status(500).json({ error: 'Failed to update course' });
  }
};


// Get all courses
// In course.controller.js
const getCourses = async (req, res) => {
  try {
    const query = `
      SELECT 
        course.language_id,
        course.course_id, 
        course.name AS title, 
        course.description, 
        course.image,
        course.difficulty,
        COUNT(enrollment.user_id) AS users
      FROM course
      LEFT JOIN enrollment ON course.course_id = enrollment.course_id
      GROUP BY 
        course.course_id, 
        course.name, 
        course.description, 
        course.image,
        course.difficulty;
    `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

// Get a specific course by ID
const getCourseById = async (req, res) => {
  const { course_id } = req.params;

  try {
    const query = `
      SELECT 
        course.course_id, 
        course.name AS title, 
        course.description, 
        course.difficulty, 
        course.language_id, 
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
        course.language_id, 
        course.image;
    `;

    const result = await db.query(query, [course_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching course:', err);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
};

// Delete a course
const deleteCourse = async (req, res) => {
  const { course_id } = req.params;

  try {
    // Delete course and related data (sections, lessons, enrollments)
    const deleteEnrollments = 'DELETE FROM enrollment WHERE course_id = $1';
    await db.query(deleteEnrollments, [course_id]);

    const deleteSections = `
      DELETE FROM section
      WHERE course_id = $1
      RETURNING section_id
    `;
    const sections = await db.query(deleteSections, [course_id]);

    for (const section of sections.rows) {
      const deleteLessons = 'DELETE FROM lesson WHERE section_id = $1';
      await db.query(deleteLessons, [section.section_id]);
    }

    const deleteCourse = 'DELETE FROM course WHERE course_id = $1 RETURNING name';
    const result = await db.query(deleteCourse, [course_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const courseName = result.rows[0].name;
    await logActivity('Course', `Course deleted: ${courseName} by user ID ${req.user.userId}`, req.user.userId);

    res.status(200).json({ message: 'Course and related data deleted successfully.' });
  } catch (err) {
    console.error('Error deleting course:', err);
    res.status(500).json({ error: 'Failed to delete course' });
  }
};

module.exports = {
  addCourse,
  editCourse,
  getCourses,
  getCourseById,
  deleteCourse,
};
