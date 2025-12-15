const db = require("../config/database");
const {
  calculateLevel,
  calculateXPToNextLevel,
} = require("../utils/xpCalculator");
const badgeController = require("../controllers/badge.controller");

// Fetch all students
const getAllStudents = async (req, res) => {
  try {
    // Role-based access control
    if (!req.user.admin) {
      console.error(`Access denied for user: ${req.user.userId}`);
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    // Single optimized query that gets all student data including subscription info, enrollment counts, and stats
    const optimizedQuery = `
      WITH student_subscriptions AS (
        SELECT DISTINCT ON (u.user_id)
          u.user_id,
          u.name,
          u.email,
          u.created_at,
          u.is_verified,
          s.subscription_type,
          s.subscription_end_date,
          s.status as subscription_status,
          CASE 
            WHEN s.subscription_id IS NOT NULL AND s.status = 'active' AND s.subscription_end_date > CURRENT_TIMESTAMP THEN true
            ELSE false
          END AS has_active_subscription
        FROM users u
        LEFT JOIN user_subscription us ON u.user_id = us.user_id
        LEFT JOIN subscription s ON us.subscription_id = s.subscription_id
        WHERE NOT EXISTS (SELECT 1 FROM admins a WHERE a.admin_id = u.user_id) -- Only non-admin users
        ORDER BY u.user_id, s.subscription_start_date DESC NULLS LAST
      ),
      student_stats AS (
        SELECT 
          u.user_id,
          COUNT(DISTINCT e.course_id) as total_enrollments,
          COALESCE(AVG(e.progress), 0) as avg_progress,
          COUNT(DISTINCT CASE WHEN e.progress >= 100 THEN e.course_id END) as completed_courses,
          COALESCE(SUM(l.xp), 0) as total_xp,
          COUNT(DISTINCT CASE WHEN lp.completed = true THEN lp.lesson_id END) as exercises_completed
        FROM users u
        LEFT JOIN enrollment e ON u.user_id = e.user_id
        LEFT JOIN lesson_progress lp ON u.user_id = lp.user_id AND lp.completed = true
        LEFT JOIN lesson l ON lp.lesson_id = l.lesson_id
        WHERE NOT EXISTS (SELECT 1 FROM admins a WHERE a.admin_id = u.user_id)
        GROUP BY u.user_id
      )
      SELECT 
        ss.*,
        COALESCE(st.total_enrollments, 0) as total_enrollments,
        ROUND(COALESCE(st.avg_progress, 0)::numeric, 1) as avg_progress,
        COALESCE(st.completed_courses, 0) as completed_courses,
        COALESCE(st.total_xp, 0) as total_xp,
        COALESCE(st.exercises_completed, 0) as exercises_completed
      FROM student_subscriptions ss
      LEFT JOIN student_stats st ON ss.user_id = st.user_id
      ORDER BY ss.created_at DESC
    `;

    const { rows } = await db.query(optimizedQuery);

    // Enhanced response structure with optimization metadata
    const response = {
      students: rows,
      count: rows.length,
      metadata: {
        totalStudents: rows.length,
        verifiedStudents: rows.filter((s) => s.is_verified).length,
        activeSubscriptions: rows.filter((s) => s.has_active_subscription)
          .length,
        averageProgress:
          rows.length > 0
            ? Math.round(
                (rows.reduce(
                  (sum, s) => sum + (parseFloat(s.avg_progress) || 0),
                  0
                ) /
                  rows.length) *
                  10
              ) / 10
            : 0,
      },
      optimized: true,
    };

    res.status(200).json(response);
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
    // Single optimized query that gets all student data including courses and stats
    const optimizedQuery = `
      WITH student_info AS (
        SELECT 
          u.user_id, 
          u.name, 
          u.email, 
          u.bio, 
          u.streak,
          u.skills,
          u.profileimage
        FROM users u
        WHERE u.user_id = $1
      ),
      course_enrollments AS (
        SELECT 
          e.course_id,
          c.name as course_name,
          e.progress
        FROM enrollment e
        JOIN course c ON e.course_id = c.course_id
        WHERE e.user_id = $1
      ),
      student_stats AS (
        SELECT 
          COALESCE(SUM(l.xp), 0) as total_xp,
          COUNT(DISTINCT lp.lesson_id) as exercises_completed
        FROM lesson_progress lp
        LEFT JOIN lesson l ON lp.lesson_id = l.lesson_id
        WHERE lp.user_id = $1 AND lp.completed = true
      ),
      last_lessons AS (
        SELECT DISTINCT ON (s.course_id)
          s.course_id,
          l.lesson_id,
          l.name as lesson_name,
          sec.name as section_name,
          lp.completed_at
        FROM lesson_progress lp
        JOIN lesson l ON lp.lesson_id = l.lesson_id
        JOIN section sec ON l.section_id = sec.section_id
        JOIN course s ON sec.course_id = s.course_id
        WHERE lp.user_id = $1
        ORDER BY s.course_id, lp.completed_at DESC NULLS LAST
      )
      SELECT 
        si.*,
        COALESCE(
          json_agg(
            json_build_object(
              'course_id', ce.course_id,
              'course_name', ce.course_name,
              'progress', COALESCE(ce.progress, 0),
              'last_lesson', 
              CASE 
                WHEN ll.lesson_id IS NOT NULL THEN
                  json_build_object(
                    'lesson_id', ll.lesson_id,
                    'name', ll.lesson_name,
                    'section_name', ll.section_name,
                    'completed_at', ll.completed_at
                  )
                ELSE NULL
              END
            )
          ) FILTER (WHERE ce.course_id IS NOT NULL), 
          '[]'::json
        ) as courses,
        COALESCE(ss.total_xp, 0) as total_xp,
        COALESCE(ss.exercises_completed, 0) as exercises_completed
      FROM student_info si
      LEFT JOIN course_enrollments ce ON true
      LEFT JOIN student_stats ss ON true
      LEFT JOIN last_lessons ll ON ce.course_id = ll.course_id
      GROUP BY si.user_id, si.name, si.email, si.bio, si.streak, si.skills, 
               si.profileimage, ss.total_xp, ss.exercises_completed
    `;

    const result = await db.query(optimizedQuery, [studentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const studentData = result.rows[0];
    const totalXP = parseInt(studentData.total_xp) || 0;
    const courses = studentData.courses || [];

    // Build optimized response
    const response = {
      user_id: studentData.user_id,
      name: studentData.name,
      email: studentData.email,
      bio: studentData.bio,
      streak: studentData.streak,
      skills: studentData.skills || [],
      profileimage: studentData.profileimage,
      courses: courses,
      exercisesCompleted: parseInt(studentData.exercises_completed) || 0,
      courseXP: totalXP,
      level: calculateLevel(totalXP),
      xpToNextLevel: calculateXPToNextLevel(totalXP),
      completedCourses: courses.filter((c) => (c.progress || 0) >= 100).length,
      optimized: true,
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

// Check for XP badges when student stats are retrieved
const checkXPBadges = async (userId, totalXP) => {
  try {
    if (totalXP >= 100) {
      const badgeAwarded = await badgeController.checkAndAwardBadges(userId, 'xp_update', { totalXp: totalXP });
      return badgeAwarded;
    }
    return null;
  } catch (error) {
    console.error('Error checking XP badges:', error);
    return null;
  }
};

// Get student stats with badge checks
const getStudentStats = async (req, res) => {
  const userId = req.user.userId;

  try {
    // Optimized query to get student stats in a single database call
    const statsQuery = `
      SELECT
        COALESCE(SUM(l.xp), 0) as totalXP,
        COUNT(DISTINCT lp.lesson_id) as completed_exercises,
        COUNT(DISTINCT lp.course_id) as courses_interacted,
        MAX(lp.completed_at) as last_activity
      FROM lesson_progress lp
      JOIN lesson l ON lp.lesson_id = l.lesson_id
      WHERE lp.user_id = $1 AND lp.completed = true;
    `;

    const { rows } = await db.query(statsQuery, [userId]);
    const stats = rows[0];

    // Calculate level based on total XP
    const totalXP = parseInt(stats.totalxp) || 0;
    const level = calculateLevel(totalXP);
    const xpToNextLevel = calculateXPToNextLevel(totalXP);
    
    // Check XP badges
    let badgeAwarded = null;
    if (totalXP >= 100) {
      badgeAwarded = await checkXPBadges(userId, totalXP);
    }

    res.status(200).json({
      totalXP,
      level,
      xpToNextLevel,
      completedExercises: parseInt(stats.completed_exercises) || 0,
      coursesInteracted: parseInt(stats.courses_interacted) || 0,
      lastActivity: stats.last_activity,
      badgeAwarded
    });
  } catch (error) {
    console.error("Error fetching student stats:", error);
    res.status(500).json({ error: "Failed to retrieve student statistics" });
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
  
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Delete data sequentially to avoid deadlocks during concurrent operations
    // Follow foreign key dependency order
    await client.query("DELETE FROM recent_activity WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM lesson_progress WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM enrollment WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM feedback WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM admin_activity WHERE admin_id = $1", [userId]);
    await client.query("DELETE FROM payment WHERE user_id = $1", [userId]);

    // Delete subscription-related data
    await client.query("DELETE FROM user_subscription WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM subscription WHERE user_id = $1", [userId]);

    // Delete support tickets and user record
    await client.query(
      "DELETE FROM support WHERE user_email = (SELECT email FROM users WHERE user_id = $1)",
      [userId]
    );
    
    await client.query("DELETE FROM users WHERE user_id = $1", [userId]);

    await client.query("COMMIT");

    if (process.env.NODE_ENV === "development") {
      console.log(`Account deletion successful for user ${userId}`);
    }

    res.status(200).json({
      success: true,
      message: "Account successfully deleted",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in deleteStudentAccount:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete account",
      error: error.message,
    });
  } finally {
    client.release();
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
