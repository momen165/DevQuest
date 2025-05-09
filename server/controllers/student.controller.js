const db = require("../config/database");
const { getLastAccessedLesson } = require("./lesson.controller");
const {
  calculateLevel,
  calculateXPToNextLevel,
} = require("../utils/xpCalculator");

// Fetch all students
const getAllStudents = async (req, res) => {
  try {
    // Role-based access control
    if (!req.user.admin) {
      console.error(`Access denied for user: ${req.user.userId}`);
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const query = `
      SELECT 
        u.user_id, 
        u.name, 
        u.email, 
        u.created_at,
        u.is_verified,
        s.subscription_type,
        s.subscription_end_date,
        CASE 
          WHEN s.subscription_id IS NOT NULL AND s.status = 'active' AND s.subscription_end_date > CURRENT_TIMESTAMP THEN true
          ELSE false
        END AS has_active_subscription
      FROM users u
      LEFT JOIN user_subscription us ON u.user_id = us.user_id
      LEFT JOIN subscription s ON us.subscription_id = s.subscription_id
      WHERE (s.subscription_id IS NULL 
        OR (s.status = 'active' AND s.subscription_end_date > CURRENT_TIMESTAMP));
    `;

    const { rows } = await db.query(query);
    res.status(200).json({ students: rows, count: rows.length });
  } catch (err) {
    console.error("Error fetching students:", err.message || err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching students data." });
  }
};

// Fetch details of a specific student
// In website/server/controllers/student.controller.js
// In website/server/controllers/student.controller.js
// In website/server/controllers/student.controller.js

const getStudentById = async (req, res) => {
  const { studentId } = req.params;

  try {
    // Update the user info query to include skills
    const userQuery = `
      SELECT 
        user_id, 
        name, 
        email, 
        bio, 
        streak,
        skills,
        profileimage
      FROM users 
      WHERE user_id = $1
    `;
    const userResult = await db.query(userQuery, [studentId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
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
    const courses = await Promise.all(
      enrollments.map(async (enrollment) => {
        const lastLesson = await getLastAccessedLesson(
          studentId,
          enrollment.course_id,
        );
        return {
          ...enrollment,
          last_lesson: lastLesson,
          progress: parseFloat(enrollment.progress) || 0,
        };
      }),
    );

    // Get stats
    const statsQuery = `
      SELECT 
        COALESCE(SUM(l.xp), 0) as totalXP,
        COUNT(DISTINCT lp.lesson_id) as exercises_completed
      FROM lesson_progress lp
      LEFT JOIN lesson l ON lp.lesson_id = l.lesson_id
      WHERE lp.user_id = $1 AND lp.completed = true
    `;
    const stats = (await db.query(statsQuery, [studentId])).rows[0];
    const totalXP = parseInt(stats.totalxp) || 0;

    // Combine all data
    const response = {
      ...userResult.rows[0],
      courses,
      exercisesCompleted: parseInt(stats.exercises_completed),
      courseXP: totalXP,
      level: calculateLevel(totalXP),
      xpToNextLevel: calculateXPToNextLevel(totalXP),
      completedCourses: courses.filter((c) => c.progress >= 100).length,
      skills: userResult.rows[0].skills || [],
    };

    res.json(response);
  } catch (err) {
    console.error("Error fetching student data:", err);
    res.status(500).json({ error: "Failed to fetch student data" });
  }
};

// Fetch courses for a specific student
const getCoursesByStudentId = async (req, res) => {
  const { studentId } = req.params;
  // Role-based access control
  if (!req.user.admin) {
    console.error(`Access denied for user: ${req.user.userId}`);
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  if (!studentId || isNaN(studentId)) {
    return res.status(400).json({ error: "Invalid student ID." });
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
    console.error("Error fetching courses for student:", err.message || err);
    res.status(500).json({ error: "Failed to fetch courses for the student." });
  }
};

// Fetch enrollment status for a specific user and course

// Fetch all enrollments for a specific user
const getEnrollmentsByUserId = async (req, res) => {
  const { userId } = req.params;

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID." });
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
    console.error("Error fetching enrollments:", err.message || err);
    res.status(500).json({ error: "Failed to fetch enrollments." });
  }
};

// Fetch progress for a specific user
const getProgressByUserId = async (req, res) => {
  const { userId } = req.params;

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID." });
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
    console.error("Error fetching progress:", err.message || err);
    res.status(500).json({ error: "Failed to fetch progress." });
  }
};

const getStudentStats = async (req, res) => {
  const { userId } = req.params;

  try {
    const query = `
            SELECT 
                COALESCE(SUM(l.xp), 0) as totalXP,
                COUNT(DISTINCT lp.lesson_id) as exercisesCompleted
            FROM lesson_progress lp
            LEFT JOIN lesson l ON lp.lesson_id = l.lesson_id
            WHERE lp.user_id = $1 AND lp.completed = true
        `;
    const result = await db.query(query, [userId]);

    // Calculate level based on total XP
    const stats = result.rows[0];
    const totalXP = parseInt(stats.totalxp) || 0;
    const level = calculateLevel(totalXP);
    const xpToNextLevel = calculateXPToNextLevel(totalXP);

    res.json({
      totalXP,
      exercisesCompleted: parseInt(stats.exercisescompleted) || 0,
      level,
      xpToNextLevel,
    });
  } catch (err) {
    console.error("Error fetching student stats:", err);
    res.status(500).json({ error: "Failed to fetch student statistics" });
  }
};

const getCourseStats = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.user_id;

  try {
    const query = `
            WITH stats AS (
                SELECT 
                    COALESCE(SUM(l.xp), 0) as courseXP,
                    COUNT(DISTINCT lp.lesson_id) as exercisesCompleted
                FROM lesson_progress lp
                JOIN lesson l ON lp.lesson_id = l.lesson_id
                JOIN section s ON l.section_id = s.section_id
                WHERE lp.user_id = $1 
                AND s.course_id = $2
                AND lp.completed = true
            )
            SELECT 
                stats.*,
                u.streak
            FROM stats
            CROSS JOIN users u
            WHERE u.user_id = $1
        `;
    const result = await db.query(query, [userId, courseId]);

    // Handle case where no rows are returned
    const stats = result.rows[0] || {
      coursexp: 0,
      exercisescompleted: 0,
      streak: 0,
    };

    const courseXP = parseInt(stats.coursexp) || 0;

    res.json({
      courseXP,
      exercisesCompleted: parseInt(stats.exercisescompleted) || 0,
      streak: parseInt(stats.streak) || 0,
      level: calculateLevel(courseXP),
      xpToNextLevel: calculateXPToNextLevel(courseXP),
    });
  } catch (err) {
    console.error("Error fetching course stats:", err);
    res.status(500).json({ error: "Failed to fetch course statistics" });
  }
};

const deleteStudentAccount = async (req, res) => {
  const userId = req.user.user_id;
  console.log("Attempting to delete account for user:", userId);

  try {
    await db.query("BEGIN");
    console.log("Transaction started");

    // Delete data in the correct order based on foreign key dependencies
    const deleteQueries = [
      // First, delete records from tables that reference the user
      "DELETE FROM recent_activity WHERE user_id = $1",
      "DELETE FROM lesson_progress WHERE user_id = $1",
      "DELETE FROM enrollment WHERE user_id = $1",
      "DELETE FROM feedback WHERE user_id = $1",
      "DELETE FROM admin_activity WHERE admin_id = $1",
      "DELETE FROM payment WHERE user_id = $1",
      "DELETE FROM user_subscription WHERE user_id = $1",
      "DELETE FROM subscription WHERE user_id = $1",
      "DELETE FROM support WHERE user_email = (SELECT email FROM users WHERE user_id = $1)",
      "DELETE FROM users WHERE user_id = $1",
    ];

    // Execute all delete queries in sequence with logging
    for (const query of deleteQueries) {
      try {
        const result = await db.query(query, [userId]);
        console.log(
          `Query executed:`,
          query.split(" ")[2],
          `Rows affected:`,
          result.rowCount,
        );
      } catch (err) {
        console.error(`Error executing query: ${query}`, err);
        throw err;
      }
    }

    await db.query("COMMIT");
    console.log("Account deletion successful - all data removed");

    res.status(200).json({
      success: true,
      message: "Account successfully deleted",
    });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Error in deleteStudentAccount:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete account",
      error: error.message,
    });
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  getCoursesByStudentId,
  getEnrollmentsByUserId,
  getProgressByUserId,
  getStudentStats,
  getCourseStats,
  deleteStudentAccount,
};
