const db = require('../config/database');
const { getLastAccessedLesson } = require('./lesson.controller');


// Fetch all students
const getAllStudents = async (req, res) => {
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
};

// Fetch details of a specific student
// In website/server/controllers/student.controller.js
// In website/server/controllers/student.controller.js
// In website/server/controllers/student.controller.js

const getStudentById = async (req, res) => {
  const { studentId } = req.params;

  try {
    // Get user info
    const userQuery = `
      SELECT user_id, name, email, bio, streak
      FROM users 
      WHERE user_id = $1
    `;
    const userResult = await db.query(userQuery, [studentId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get enrolled courses with progress
    const coursesQuery = `
      SELECT 
        c.course_id,
        c.name as course_name,
        e.progress
        
      FROM enrollment e
      JOIN course c ON e.course_id = c.course_id
      WHERE e.user_id = $1
    `;
    const enrollments = (await db.query(coursesQuery, [studentId])).rows;

    // Add last lesson information to each course
    const courses = await Promise.all(enrollments.map(async (enrollment) => {
      const lastLesson = await getLastAccessedLesson(studentId, enrollment.course_id);
      return {
        ...enrollment,
        last_lesson: lastLesson,
        progress: parseFloat(enrollment.progress) || 0 // Ensure progress is a number
      };
    }));

    // Get other stats
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT lp.lesson_id) as exercises_completed,
        COALESCE(SUM(l.xp), 0) as course_xp
      FROM lesson_progress lp
      LEFT JOIN lesson l ON lp.lesson_id = l.lesson_id
      WHERE lp.user_id = $1 AND lp.completed = true
    `;
    const stats = (await db.query(statsQuery, [studentId])).rows[0];

    const response = {
      ...userResult.rows[0],
      courses,
      exercisesCompleted: parseInt(stats.exercises_completed),
      courseXP: parseInt(stats.course_xp),
      completedCourses: courses.filter(c => c.progress >= 100).length
    };

    res.json(response);
  } catch (err) {
    console.error('Error fetching student data:', err);
    res.status(500).json({ error: 'Failed to fetch student data' });
  }
};


// Fetch courses for a specific student
const getCoursesByStudentId = async (req, res) => {
  const { studentId } = req.params;
// Role-based access control
  if (!req.user.admin) {
    console.error(`Access denied for user: ${req.user.userId}`);
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }

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

    res.status(200).json(rows.length > 0 ? rows : []); // Return empty array if no courses found
  } catch (err) {
    console.error('Error fetching courses for student:', err.message || err);
    res.status(500).json({ error: 'Failed to fetch courses for the student.' });
  }
};

// Fetch enrollment status for a specific user and course


// Fetch all enrollments for a specific user
const getEnrollmentsByUserId = async (req, res) => {
  const { userId } = req.params;

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID.' });
  }

  try {
    const query = `
      SELECT course_id FROM enrollment
      WHERE user_id = $1
    `;
    const { rows } = await db.query(query, [userId]);

    const enrollments = rows.reduce((acc, row) => {
      acc[row.course_id] = true;
      return acc;
    }, {});

    res.status(200).json(enrollments);
  } catch (err) {
    console.error('Error fetching enrollments:', err.message || err);
    res.status(500).json({ error: 'Failed to fetch enrollments.' });
  }
};

// Fetch progress for a specific user
const getProgressByUserId = async (req, res) => {
  const { userId } = req.params;

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID.' });
  }

  try {
    const query = `
      SELECT course_id, progress FROM enrollment
      WHERE user_id = $1
    `;
    const { rows } = await db.query(query, [userId]);

    const progress = rows.reduce((acc, row) => {
      acc[row.course_id] = row.progress;
      return acc;
    }, {});

    res.status(200).json(progress);
  } catch (err) {
    console.error('Error fetching progress:', err.message || err);
    res.status(500).json({ error: 'Failed to fetch progress.' });
  }
};

const getStudentStats = async (req, res) => {
  const studentId = req.params.studentId;

  try {
    // Get completed courses (progress = 100%)
    const completedCoursesQuery = `
      SELECT COUNT(DISTINCT e.course_id) 
      FROM enrollment e
      WHERE e.user_id = $1 AND e.progress = 100`;

    // Get exercises completed (only count distinct completed exercises)
    const exercisesCompletedQuery = `
      SELECT COUNT(DISTINCT lp.lesson_id) 
      FROM lesson_progress lp
      WHERE lp.user_id = $1 AND lp.completed = true`;

    // Calculate total XP (sum XP only for completed lessons)
    const totalXPQuery = `
      SELECT COALESCE(SUM(l.xp), 0) as total_xp
      FROM lesson_progress lp
      JOIN lesson l ON lp.lesson_id = l.lesson_id
      WHERE lp.user_id = $1 AND lp.completed = true`;

    // Get user streak
    const streakQuery = `
      SELECT streak 
      FROM users 
      WHERE user_id = $1`;

    const [
      completedCoursesResult,
      exercisesCompletedResult,
      totalXPResult,
      streakResult
    ] = await Promise.all([
      db.query(completedCoursesQuery, [studentId]),
      db.query(exercisesCompletedQuery, [studentId]),
      db.query(totalXPQuery, [studentId]),
      db.query(streakQuery, [studentId])
    ]);

    // Define XP thresholds for each level
    const LEVEL_THRESHOLDS = [
      0,    // Level 0: 0 XP
      100,  // Level 1: 100 XP
      500,  // Level 2: 500 XP
      850,  // Level 3: 850 XP
      1200, // Level 4: 1200 XP
    ];

    const calculateLevel = (xp) => {
      for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_THRESHOLDS[i]) {
          return i;
        }
      }
      return 0;
    };

    const calculateXPToNextLevel = (xp, currentLevel) => {
      if (currentLevel >= LEVEL_THRESHOLDS.length - 1) {
        return 0; // Max level reached
      }
      return LEVEL_THRESHOLDS[currentLevel + 1] - xp;
    };

    const totalXP = parseInt(totalXPResult.rows[0].total_xp) || 0;
    const level = calculateLevel(totalXP);

    const stats = {
      completedCourses: parseInt(completedCoursesResult.rows[0].count) || 0,
      exercisesCompleted: parseInt(exercisesCompletedResult.rows[0].count) || 0,
      totalXP: totalXP,
      level: level,
      xpToNextLevel: calculateXPToNextLevel(totalXP, level),
      streak: streakResult.rows[0]?.streak || 0
    };

    res.json(stats);
  } catch (err) {
    console.error('Error fetching student stats:', err);
    res.status(500).json({ error: 'Failed to fetch student statistics' });
  }
};

// ...existing code...

module.exports = {
  getAllStudents,
  getStudentById,
  getCoursesByStudentId,
  getEnrollmentsByUserId,
  getProgressByUserId,
  getStudentStats,
};
