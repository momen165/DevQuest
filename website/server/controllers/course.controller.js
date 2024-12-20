const db = require('../config/database');
const logActivity = require('../utils/logger');
const sharp = require('sharp');

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const { v4: uuidv4 } = require('uuid');


// Configure AsWS S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});


const uploadImageToS3 = async (file, courseName) => {

  const filename = `course_${uuidv4()}.png`;
  const processedBuffer = await sharp(file.buffer)
      .resize(800)
      .png({ quality: 80 })
      .toBuffer();

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `uploads/${filename}`,
    Body: processedBuffer,
    ContentType: 'image/png',
  };

  const command = new PutObjectCommand(params);
  await s3Client.send(command);

  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/uploads/${filename}`;
};

const validateCourseFields = (fields) => {
  const { title, description, status, difficulty, language_id } = fields;
  if (!title || !description || !status || !difficulty || !language_id) {
    throw new Error('Missing required fields');
  }
};

const addCourse = async (req, res) => {
  // Role-based access control
  if (!req.user || !req.user.admin) {
    console.error(`Access denied for user: ${req.user ? req.user.userId : 'unknown'}`);
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  const { title, description, status, difficulty, language_id } = req.body;
  let imageUrl = null;

  try {
    validateCourseFields(req.body);

    if (req.file) {
      imageUrl = await uploadImageToS3(req.file);
    }

    const query = `
      INSERT INTO course (name, description, status, difficulty, language_id, image)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const result = await db.query(query, [title, description, status, difficulty, language_id, imageUrl]);

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Failed to add course' });
    }

    await logActivity('Course', `New course added: ${title} by user ID ${req.user.userId}`, req.user.userId);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding course:', err);
    res.status(500).json({ error: 'Failed to add course' });
  }
};

const editCourse = async (req, res) => {
  // Role-based access control
  if (!req.user || !req.user.admin) {
    console.error(`Access denied for user: ${req.user ? req.user.userId : 'unknown'}`);
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  const { course_id } = req.params;
  const { title, description, status, difficulty, language_id } = req.body;

  try {
    if (!course_id || isNaN(course_id)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    validateCourseFields(req.body);

    const oldCourseQuery = 'SELECT * FROM course WHERE course_id = $1';
    const oldCourseResult = await db.query(oldCourseQuery, [course_id]);

    if (oldCourseResult.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadImageToS3(req.file, title);
    }

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
      imageUrl,
      course_id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    await logActivity('Course', `Course updated: ${title} by user ID ${req.user.userId}`, req.user.userId);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating course:', err);
    res.status(500).json({ error: 'Failed to update course' });
  }
};

const deleteCourse = async (req, res) => {
  // Role-based access control
  if (!req.user || !req.user.admin) {
    console.error(`Access denied for user: ${req.user ? req.user.userId : 'unknown'}`);
      return res.status(403).json({error: 'Access denied. Admins only.'});
  }

    const {course_id} = req.params;

  try {
      // Delete lesson progress related to lessons of the course
      const deleteLessonProgress = `
          DELETE
          FROM lesson_progress
          WHERE lesson_id IN (SELECT lesson_id
                              FROM lesson
                              WHERE section_id IN (SELECT section_id
                                                   FROM section
                                                   WHERE course_id = $1));
      `;
      await db.query(deleteLessonProgress, [course_id]);

    // Delete lessons related to sections of the course
    const deleteLessons = `
      DELETE
      FROM lesson
      WHERE section_id IN (SELECT section_id
                           FROM section
                           WHERE course_id = $1);
    `;
    await db.query(deleteLessons, [course_id]);

    // Delete sections related to the course
    const deleteSections = `
      DELETE
      FROM section
      WHERE course_id = $1;
    `;
    await db.query(deleteSections, [course_id]);

    // Delete enrollments related to the course
    const deleteEnrollments = 'DELETE FROM enrollment WHERE course_id = $1';
    await db.query(deleteEnrollments, [course_id]);

    // Delete feedback related to the course
    const deleteFeedback = 'DELETE FROM feedback WHERE course_id = $1';
    await db.query(deleteFeedback, [course_id]);

    // Delete the course
    const deleteCourse = 'DELETE FROM course WHERE course_id = $1 RETURNING name';
    const result = await db.query(deleteCourse, [course_id]);

    if (result.rowCount === 0) {
        return res.status(404).json({error: 'Course not found'});
    }

    const courseName = result.rows[0].name;
    await logActivity('Course', `Course deleted: ${courseName} by user ID ${req.user.userId}`, req.user.userId);

      res.status(200).json({message: 'Course and related data deleted successfully.'});
  } catch (err) {
    console.error('Error deleting course:', err);
      res.status(500).json({error: 'Failed to delete course'});
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
        COUNT(enrollment.user_id) AS userscount
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

const getUserCourseStats = async (req, res) => {
  const { course_id, user_id } = req.params;

  try {
    // Modified query to only count lessons and XP from the specific course
    const statsQuery = `
      SELECT 
        u.name,
        u.profileimage,
        u.streak,
        (
          SELECT COALESCE(SUM(l.xp), 0)
          FROM lesson_progress lp
          JOIN lesson l ON lp.lesson_id = l.lesson_id
          JOIN section s ON l.section_id = s.section_id
          WHERE lp.user_id = u.user_id 
          AND s.course_id = $2
          AND lp.completed = true
        ) as total_xp,
        (
          SELECT COUNT(DISTINCT lp.lesson_id)
          FROM lesson_progress lp
          JOIN lesson l ON lp.lesson_id = l.lesson_id
          JOIN section s ON l.section_id = s.section_id
          WHERE lp.user_id = u.user_id 
          AND s.course_id = $2
          AND lp.completed = true
        ) as completed_exercises
      FROM users u
      WHERE u.user_id = $1;
    `;

    const result = await db.query(statsQuery, [user_id, course_id]);
    
    const stats = {
      name: result.rows[0]?.name || '',
      profileImage: result.rows[0]?.profileimage || '',
      courseXP: parseInt(result.rows[0]?.total_xp) || 0,
      exercisesCompleted: parseInt(result.rows[0]?.completed_exercises) || 0,
      streak: result.rows[0]?.streak || 0
    };

    res.status(200).json(stats);
  } catch (err) {
    console.error('Error fetching user course stats:', err);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
};

const enrollUserInCourse = async (user_id, course_id) => {
  const query = `
    INSERT INTO enrollment (user_id, course_id, enrollment_date)
    VALUES ($1, $2, NOW())
    RETURNING *;
  `;
  const result = await db.query(query, [user_id, course_id]);
  return result.rows[0];
};

const enrollCourse = async (req, res) => {
  try {
    const { user_id, course_id } = req.body;
    console.log('Request body:', req.body);

    if (!user_id || !course_id) {
      return res.status(400).json({ error: 'user_id and course_id are required' });
    }

    const result = await enrollUserInCourse(user_id, course_id);

    res.status(200).json({ message: 'Enrollment successful', result });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ error: 'Failed to enroll in course' });
  }
};


const checkEnrollmentStatus = async (req, res) => {
  const { user_id, course_id } = req.params;

  try {
    const query = `
      SELECT * FROM enrollment
      WHERE user_id = $1 AND course_id = $2
    `;
    const result = await db.query(query, [user_id, course_id]);

    if (result.rowCount > 0) {
      res.status(200).json({ isEnrolled: true });
    } else {
      res.status(200).json({ isEnrolled: false });
    }
  } catch (error) {
    console.error('Error checking enrollment status:', error);
    res.status(500).json({ error: 'Failed to check enrollment status' });
  }
};

const getUserOverallStats = async (req, res) => {
  const { user_id } = req.params;

  try {
    const statsQuery = `
      WITH user_stats AS (
        SELECT 
          u.name,
          u.profileimage,
          u.streak,
          COUNT(DISTINCT e.course_id) as completed_courses,
          (
            SELECT COUNT(DISTINCT lp.lesson_id)
            FROM lesson_progress lp
            WHERE lp.user_id = u.user_id 
            AND lp.completed = true
          ) as total_exercises_completed,
          (
            SELECT COALESCE(SUM(l.xp), 0)
            FROM lesson_progress lp
            JOIN lesson l ON lp.lesson_id = l.lesson_id
            WHERE lp.user_id = u.user_id 
            AND lp.completed = true
          ) as total_xp
        FROM users u
        LEFT JOIN enrollment e ON u.user_id = e.user_id
        WHERE u.user_id = $1
        GROUP BY u.user_id
      )
      SELECT 
        name,
        profileimage,
        streak,
        completed_courses,
        total_exercises_completed,
        total_xp,
        FLOOR(total_xp / 100) as level
      FROM user_stats;
    `;

    const result = await db.query(statsQuery, [user_id]);
    
    const stats = {
      name: result.rows[0]?.name || '',
      profileImage: result.rows[0]?.profileimage || '',
      completedCourses: parseInt(result.rows[0]?.completed_courses) || 0,
      exercisesCompleted: parseInt(result.rows[0]?.total_exercises_completed) || 0,
      totalXP: parseInt(result.rows[0]?.total_xp) || 0,
      level: parseInt(result.rows[0]?.level) || 0,
      streak: result.rows[0]?.streak || 0
    };

    res.status(200).json(stats);
  } catch (err) {
    console.error('Error fetching user overall stats:', err);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
};

module.exports = {
  addCourse,
  editCourse,
  getCourses,
  getCourseById,
  deleteCourse,
  enrollCourse,
  checkEnrollmentStatus,
  getUserCourseStats,
  getUserOverallStats,
};