const db = require("../config/database");
const { sendFeedbackReplyEmail } = require("./auth.controller");
const NodeCache = require("node-cache");
const { AppError } = require("../utils/error.utils");

// Initialize cache with 5 minutes TTL
const cache = new NodeCache({ stdTTL: 300 });

// Cache key for courses data
const COURSES_CACHE_KEY = "courses_with_ratings";

// Function to clear courses cache
const clearCoursesCache = () => {
  cache.del(COURSES_CACHE_KEY);
};

// SQL Queries
const QUERIES = {
  getAllFeedback: `
    SELECT f.feedback_id, u.name AS student_name, c.name AS course_name, 

    f.comment AS feedback, f.rating, f.status, f.reply

    FROM feedback f
    JOIN users u ON f.user_id = u.user_id
    JOIN course c ON f.course_id = c.course_id
    WHERE ($1::int IS NULL OR f.course_id = $1)
    ORDER BY f.feedback_id DESC
  `,
  getPublicFeedback: `
    SELECT f.feedback_id, f.rating, f.comment, u.name, u.profileimage, 
           u.country, c.name as course_name, c.difficulty
    FROM feedback f
    JOIN users u ON f.user_id = u.user_id
    JOIN course c ON f.course_id = c.course_id
    WHERE f.rating >= 4 AND f.comment IS NOT NULL AND f.comment != ''
    ORDER BY f.rating DESC, RANDOM()
    LIMIT 5
  `,
  checkUserProgress: `
    SELECT e.progress, f.feedback_id
    FROM enrollment e
    LEFT JOIN feedback f ON f.user_id = e.user_id AND f.course_id = e.course_id
    WHERE e.user_id = $1 AND e.course_id = $2
  `,
  getRecentFeedback: `
    SELECT f.feedback_id, u.name AS student_name, c.name AS course_name, 
           f.comment, f.created_at
    FROM feedback f
    JOIN users u ON f.user_id = u.user_id
    JOIN course c ON f.course_id = c.course_id
    WHERE f.created_at >= NOW() - INTERVAL '48 HOURS'
    ORDER BY f.created_at DESC
    LIMIT 5
  `,
};

// Error handler wrapper
const handleAsync = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    console.error(`Error in ${fn.name}:`, error.message);
    res.status(500).json({ error: `Failed to ${fn.name}` });
  }
};

// Get all feedback for admins
const getFeedback = handleAsync(async (req, res) => {
  if (!req.user.admin) {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }
  const courseId = req.query.course_id ? parseInt(req.query.course_id) : null;
  const { rows } = await db.query(QUERIES.getAllFeedback, [courseId]);
  res.status(200).json(rows || []);
});

// Get courses with ratings and user counts
const getCoursesWithRatings = handleAsync(async (req, res) => {
  // Check cache first
  const cachedData = cache.get(COURSES_CACHE_KEY);
  if (cachedData) {
    return res.status(200).json(cachedData);
  }

  const [courses, userscount] = await Promise.all([
    db.query("SELECT * FROM course WHERE status = 'Published'"),
    db.query(
      "SELECT course_id, COUNT(user_id) AS userscount FROM enrollment GROUP BY course_id"
    ),
  ]);

  const userscountMap = Object.fromEntries(
    userscount.rows.map((u) => [u.course_id, u.userscount])
  );

  const responseData = {
    courses: courses.rows,
    userscount: userscountMap,
  };

  // Store in cache
  cache.set(COURSES_CACHE_KEY, responseData);

  res.status(200).json(responseData);
});

// Optimized endpoint that combines all course data in a single request
const getOptimizedCoursesData = handleAsync(async (req, res) => {
  const {
    trackCacheHit,
    trackCacheMiss,
  } = require("../utils/performance.utils");
  const userId = req.user?.userId;
  const cacheKey = userId
    ? `optimized_courses_${userId}`
    : "optimized_courses_guest";

  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    trackCacheHit("optimized-courses", cacheKey);
    return res.status(200).json({ ...cachedData, cached: true });
  }

  trackCacheMiss("optimized-courses", cacheKey);

  try {
    // Single optimized query to get all course data
    let coursesQuery;
    let queryParams;

    if (userId) {
      // Query for authenticated users - includes enrollment and progress data
      coursesQuery = `
        WITH course_enrollments AS (
          SELECT course_id, COUNT(user_id) AS enrollment_count
          FROM enrollment
          GROUP BY course_id
        ),
        user_enrollments AS (
          SELECT course_id, progress
          FROM enrollment
          WHERE user_id = $1
        ),
        course_progress AS (
          SELECT 
            s.course_id,
            COUNT(CASE WHEN lp.completed = true THEN 1 END) * 100.0 / 
            NULLIF(COUNT(l.lesson_id), 0) as calculated_progress
          FROM section s
          LEFT JOIN lesson l ON s.section_id = l.section_id
          LEFT JOIN lesson_progress lp ON l.lesson_id = lp.lesson_id AND lp.user_id = $1
          GROUP BY s.course_id
        )
        SELECT 
          c.*,
          COALESCE(ce.enrollment_count, 0) as userscount,
          CASE WHEN ue.course_id IS NOT NULL THEN true ELSE false END as is_enrolled,
          COALESCE(ROUND(cp.calculated_progress::numeric, 0), 0) as progress
        FROM course c
        LEFT JOIN course_enrollments ce ON c.course_id = ce.course_id
        LEFT JOIN user_enrollments ue ON c.course_id = ue.course_id
        LEFT JOIN course_progress cp ON c.course_id = cp.course_id
        WHERE c.status = 'Published'
        ORDER BY c.course_id;
      `;
      queryParams = [userId];
    } else {
      // Query for guest users - only basic course data
      coursesQuery = `
        WITH course_enrollments AS (
          SELECT course_id, COUNT(user_id) AS enrollment_count
          FROM enrollment
          GROUP BY course_id
        )
        SELECT 
          c.*,
          COALESCE(ce.enrollment_count, 0) as userscount,
          false as is_enrolled,
          0 as progress
        FROM course c
        LEFT JOIN course_enrollments ce ON c.course_id = ce.course_id
        WHERE c.status = 'Published'
        ORDER BY c.course_id;
      `;
      queryParams = [];
    }

    const result = await db.query(coursesQuery, queryParams);

    // Format the response data
    const responseData = {
      courses: result.rows,
      optimized: true,
      cached: false,
    };

    // Cache the result for 5 minutes
    cache.set(cacheKey, responseData, 300);

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching optimized courses data:", error);
    res.status(500).json({ error: "Failed to fetch optimized courses data" });
  }
});

// Optimized endpoint for CourseSection.jsx that combines multiple API calls
const getOptimizedCourseSectionData = handleAsync(async (req, res) => {
  const {
    trackCacheHit,
    trackCacheMiss,
  } = require("../utils/performance.utils");

  const { courseId } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const cacheKey = `optimized_course_section_${courseId}_${userId}`;

  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    trackCacheHit("optimized-course-section", cacheKey);
    return res.status(200).json({ ...cachedData, cached: true });
  }

  trackCacheMiss("optimized-course-section", cacheKey);

  try {
    // Single optimized query that combines all the data needed by CourseSection.jsx
    const optimizedQuery = `
      WITH course_info AS (
        SELECT 
          c.course_id,
          c.name as title,
          c.description,
          c.status
        FROM course c
        WHERE c.course_id = $1 AND c.status = 'Published'
      ),
      subscription_info AS (        SELECT 
          CASE 
            WHEN s.status = 'active' AND s.subscription_end_date > NOW() THEN true 
            ELSE false 
          END as has_active_subscription,
          COALESCE(
            (SELECT COUNT(*) 
             FROM lesson_progress lp 
             WHERE lp.user_id = $2 AND lp.completed = true), 0
          ) as completed_lessons_count
        FROM users u
        LEFT JOIN subscription s ON u.user_id = s.user_id
        WHERE u.user_id = $2
      ),
      user_profile AS (
        SELECT 
          u.name,
          u.profileimage,
          u.streak,
          COALESCE(
            (SELECT COUNT(*) 
             FROM lesson_progress lp 
             WHERE lp.user_id = u.user_id AND lp.completed = true), 0
          ) as exercises_completed
        FROM users u
        WHERE u.user_id = $2
      ),
      sections_with_lessons AS (
        SELECT 
          s.section_id,
          s.name,
          s.description,
          s.section_order,
          json_agg(
            json_build_object(
              'lesson_id', l.lesson_id,
              'name', l.name,
              'lesson_order', l.lesson_order,
              'completed', COALESCE(lp.completed, false)
            ) ORDER BY l.lesson_order
          ) as lessons
        FROM section s
        LEFT JOIN lesson l ON s.section_id = l.section_id
        LEFT JOIN lesson_progress lp ON l.lesson_id = lp.lesson_id AND lp.user_id = $2
        WHERE s.course_id = $1
        GROUP BY s.section_id, s.name, s.description, s.section_order
        ORDER BY s.section_order
      ),
      course_stats AS (
        SELECT 
          COALESCE(SUM(l.xp), 0) as course_xp,
          COUNT(DISTINCT lp.lesson_id) as exercises_completed
        FROM lesson_progress lp
        JOIN lesson l ON lp.lesson_id = l.lesson_id
        JOIN section s ON l.section_id = s.section_id
        WHERE lp.user_id = $2 
        AND s.course_id = $1
        AND lp.completed = true
      ),
      overall_stats AS (
        SELECT 
          COALESCE(SUM(l.xp), 0) as total_xp,
          COUNT(DISTINCT lp.lesson_id) as total_exercises_completed
        FROM lesson_progress lp
        LEFT JOIN lesson l ON lp.lesson_id = l.lesson_id
        WHERE lp.user_id = $2 AND lp.completed = true
      )
      SELECT 
        ci.course_id,
        ci.title,
        ci.description,
        ci.status,
        si.has_active_subscription,
        si.completed_lessons_count,
        up.name as user_name,
        up.profileimage as user_profile_image,
        up.streak as user_streak,
        up.exercises_completed as user_exercises_completed,
        COALESCE(cs.course_xp, 0) as course_xp,
        COALESCE(cs.exercises_completed, 0) as course_exercises_completed,
        COALESCE(os.total_xp, 0) as total_xp,
        COALESCE(os.total_exercises_completed, 0) as total_exercises_completed,
        (
          SELECT json_agg(
            json_build_object(
              'section_id', swl.section_id,
              'name', swl.name,
              'description', swl.description,
              'section_order', swl.section_order,
              'lessons', swl.lessons
            ) ORDER BY swl.section_order
          )
          FROM sections_with_lessons swl
        ) as sections
      FROM course_info ci
      CROSS JOIN subscription_info si
      CROSS JOIN user_profile up
      CROSS JOIN course_stats cs
      CROSS JOIN overall_stats os;
    `;

    const result = await db.query(optimizedQuery, [courseId, userId]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Course not found or not available" });
    }

    const data = result.rows[0];

    // Calculate level and XP to next level
    const calculateLevel = (totalXP) => {
      return Math.floor(totalXP / 100) + 1;
    };

    const calculateXPToNextLevel = (totalXP) => {
      const currentLevel = calculateLevel(totalXP);
      const xpForNextLevel = currentLevel * 100;
      return xpForNextLevel - totalXP;
    };

    const level = calculateLevel(data.total_xp);
    const xpToNextLevel = calculateXPToNextLevel(data.total_xp);

    // Format the response data
    const responseData = {
      course: {
        course_id: data.course_id,
        title: data.title,
        description: data.description,
        status: data.status,
      },
      subscription: {
        hasActiveSubscription: data.has_active_subscription,
        completedLessonsCount: data.completed_lessons_count,
      },
      profile: {
        name: data.user_name,
        profileimage: data.user_profile_image,
        streak: data.user_streak,
        exercisesCompleted: data.user_exercises_completed,
      },
      sections: data.sections || [],
      stats: {
        courseXP: data.course_xp,
        exercisesCompleted: data.course_exercises_completed,
        streak: data.user_streak,
        name: data.user_name,
        profileImage: data.user_profile_image,
        totalXP: data.total_xp,
        level: level,
        xpToNextLevel: xpToNextLevel,
      },
      optimized: true,
      cached: false,
    };

    // Cache the result for 3 minutes (course section data changes more frequently)
    cache.set(cacheKey, responseData, 180);

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching optimized course section data:", error);
    res.status(500).json({ error: "Failed to fetch course section data" });
  }
});

// Add this before submitFeedback function
const checkFeedbackEligibility = async (userId, courseId) => {
  const { rows } = await db.query(QUERIES.checkUserProgress, [
    userId,
    courseId,
  ]);

  if (!rows.length) {
    throw new AppError("User is not enrolled in this course", 400);
  }

  const progress = parseFloat(rows[0].progress) || 0;
  const existingFeedback = rows[0].feedback_id;

  return {
    canSubmitFeedback: progress >= 30 || (existingFeedback && progress === 100),
    hasExistingFeedback: !!existingFeedback,
    progress,
  };
};

// Modify submitFeedback function
const submitFeedback = handleAsync(async (req, res) => {
  const { course_id, rating, comment } = req.body;

  if (!course_id || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      error:
        "Invalid input. Provide a valid course ID and a rating between 1 and 5.",
    });
  }

  const eligibility = await checkFeedbackEligibility(
    req.user.userId,
    course_id
  );

  if (!eligibility.canSubmitFeedback) {
    return res.status(403).json({
      error:
        "You need to complete at least 30% of the course to submit feedback",
      progress: eligibility.progress,
    });
  }

  if (eligibility.hasExistingFeedback && eligibility.progress < 100) {
    return res.status(403).json({
      error:
        "You need to complete the entire course to submit additional feedback",
      progress: eligibility.progress,
    });
  }

  const courseExists = await db.query(
    "SELECT 1 FROM course WHERE course_id = $1",
    [course_id]
  );
  if (!courseExists.rowCount) {
    return res.status(404).json({ error: "Course not found." });
  }

  await db.query("BEGIN");
  try {
    // Insert the feedback
    const { rows } = await db.query(
      "INSERT INTO feedback (user_id, course_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.user.userId, course_id, rating, comment || null]
    );

    // Update course rating
    await db.query(
      `UPDATE course 
       SET rating = (
         SELECT ROUND(AVG(rating)::numeric, 2)
         FROM feedback 
         WHERE course_id = $1
       )
       WHERE course_id = $1`,
      [course_id]
    );

    await db.query("COMMIT");
    clearCoursesCache();
    res
      .status(201)
      .json({ message: "Feedback submitted successfully!", feedback: rows[0] });
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
});

// Reply to feedback
const replyToFeedback = handleAsync(async (req, res) => {
  const { feedback_id, reply } = req.body;

  if (!feedback_id || !reply) {
    return res
      .status(400)
      .json({ error: "Feedback ID and reply message are required." });
  }

  await db.query("BEGIN");
  try {
    // Get user details and feedback content with a more specific query
    const userDetails = await db.query(
      `SELECT u.email, u.name, f.comment, f.rating, c.name as course_name
       FROM feedback f 
       JOIN users u ON f.user_id = u.user_id 
       JOIN course c ON f.course_id = c.course_id
       WHERE f.feedback_id = $1`,
      [feedback_id]
    );

    if (!userDetails.rows.length) {
      await db.query("ROLLBACK");
      return res.status(404).json({ error: "Feedback not found" });
    }

    // Update the feedback status to 'closed'
    const updateResult = await db.query(
      "UPDATE feedback SET status = $1, reply = $2 WHERE feedback_id = $3 RETURNING *",
      ["closed", reply, feedback_id]
    );

    const { email, name, comment, rating, course_name } = userDetails.rows[0];

    // Send email with all the necessary information
    try {
      await sendFeedbackReplyEmail({
        email,
        name,
        comment,
        rating,
        courseName: course_name,
        reply,
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Continue with the transaction even if email fails
    }

    await db.query("COMMIT");

    res.status(200).json({
      message: "Reply sent successfully and feedback closed.",
      feedback: updateResult.rows[0],
    });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Error in replyToFeedback:", error);
    res.status(500).json({
      error: "Failed to process feedback reply",
      details: error.message,
    });
  }
});

// Get public feedback
const getPublicFeedback = handleAsync(async (req, res) => {
  const { rows } = await db.query(QUERIES.getPublicFeedback);
  res.status(200).json(rows);
});

// Add this function to get recent feedback
const getRecentFeedback = handleAsync(async (req, res) => {
  const { rows } = await db.query(QUERIES.getRecentFeedback);
  res.status(200).json(rows || []);
});

const reopenFeedback = handleAsync(async (req, res) => {
  const { feedback_id } = req.body;

  if (!feedback_id) {
    return res.status(400).json({ error: "Feedback ID is required." });
  }

  const updateResult = await db.query(
    "UPDATE feedback SET status = $1 WHERE feedback_id = $2 RETURNING *",
    ["open", feedback_id]
  );

  if (!updateResult.rows.length) {
    return res.status(404).json({ error: "Feedback not found" });
  }

  res.status(200).json({
    message: "Feedback reopened successfully",
    feedback: updateResult.rows[0],
  });
});

module.exports = {
  getFeedback,
  submitFeedback,
  getCoursesWithRatings,
  getOptimizedCoursesData, // Export the new optimized endpoint
  replyToFeedback,
  getPublicFeedback,
  checkFeedbackEligibility,
  getRecentFeedback,
  reopenFeedback,
  clearCoursesCache,
  getOptimizedCourseSectionData,
};
