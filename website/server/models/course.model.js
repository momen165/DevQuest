const db = require("../config/database");

const courseQueries = {
  insertCourse: async (
    title,
    description,
    status,
    difficulty,
    language_id,
    imageUrl,
  ) => {
    const query = `
      INSERT INTO course (name, description, status, difficulty, language_id, image)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    try {
      const result = await db.query(query, [
        title,
        description,
        status,
        difficulty,
        language_id,
        imageUrl,
      ]);
      console.log(`Course inserted: ${title}`);
      return result;
    } catch (error) {
      console.error("Error inserting course:", error);
      throw error;
    }
  },

  updateCourse: async (
    course_id,
    title,
    description,
    status,
    difficulty,
    language_id,
    imageUrl,
  ) => {
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
    try {
      const result = await db.query(query, [
        title,
        description,
        status,
        difficulty,
        language_id,
        imageUrl,
        course_id,
      ]);
      console.log(`Course updated: ${title}`);
      return result;
    } catch (error) {
      console.error("Error updating course:", error);
      throw error;
    }
  },

  deleteCourseData: async (course_id) => {
    const queries = [
      {
        text: `DELETE FROM lesson_progress
               WHERE lesson_id IN (SELECT lesson_id
                                 FROM lesson
                                 WHERE section_id IN (SELECT section_id
                                                    FROM section
                                                    WHERE course_id = $1));`,
        values: [course_id],
      },
      {
        text: `DELETE FROM lesson
               WHERE section_id IN (SELECT section_id
                                  FROM section
                                  WHERE course_id = $1);`,
        values: [course_id],
      },
      {
        text: "DELETE FROM section WHERE course_id = $1;",
        values: [course_id],
      },
      {
        text: "DELETE FROM enrollment WHERE course_id = $1;",
        values: [course_id],
      },
      {
        text: "DELETE FROM feedback WHERE course_id = $1;",
        values: [course_id],
      },
      {
        text: "DELETE FROM course WHERE course_id = $1 RETURNING name;",
        values: [course_id],
      },
    ];

    try {
      for (const query of queries) {
        await db.query(query.text, query.values);
      }
      console.log(`Course data deleted for course ID: ${course_id}`);
    } catch (error) {
      console.error("Error deleting course data:", error);
      throw error;
    }
  },

  getAllCourses: async () => {
    const query = `
      SELECT 
        course.language_id,
        course.course_id, 
        course.name AS title, 
        course.description, 
        course.image,
        course.difficulty,
        course.rating,
        COUNT(enrollment.user_id) AS userscount
      FROM course
      LEFT JOIN enrollment ON course.course_id = enrollment.course_id
      GROUP BY 
        course.course_id, 
        course.name, 
        course.description, 
        course.image,
        course.difficulty,
        course.rating;
    `;
    try {
      const result = await db.query(query);
      console.log("Fetched all courses");
      return result;
    } catch (error) {
      console.error("Error fetching all courses:", error);
      throw error;
    }
  },

  getCourseById: async (course_id) => {
    const query = `
      SELECT 
        course.course_id, 
        course.name AS title, 
        course.description, 
        course.difficulty, 
        course.language_id,
        course.status,
        course.image, 
        course.rating,
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
        course.status,
        course.image,
        course.rating;
    `;
    try {
      const result = await db.query(query, [course_id]);
      console.log(`Fetched course by ID: ${course_id}`);
      return result;
    } catch (error) {
      console.error("Error fetching course by ID:", error);
      throw error;
    }
  },

  getUserCourseStats: async (user_id, course_id) => {
    const query = `
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
    try {
      const result = await db.query(query, [user_id, course_id]);
      console.log(`Fetched user course stats for user ID: ${user_id}, course ID: ${course_id}`);
      return result;
    } catch (error) {
      console.error("Error fetching user course stats:", error);
      throw error;
    }
  },

  enrollUser: async (user_id, course_id) => {
    const query = `
      INSERT INTO enrollment (user_id, course_id, enrollment_date)
      VALUES ($1, $2, NOW())
      RETURNING *;
    `;
    try {
      const result = await db.query(query, [user_id, course_id]);
      console.log(`User enrolled: user ID ${user_id}, course ID ${course_id}`);
      return result;
    } catch (error) {
      console.error("Error enrolling user:", error);
      throw error;
    }
  },

  checkEnrollment: async (user_id, course_id) => {
    const query = `
      SELECT * FROM enrollment
      WHERE user_id = $1 AND course_id = $2
    `;
    try {
      const result = await db.query(query, [user_id, course_id]);
      console.log(`Checked enrollment: user ID ${user_id}, course ID ${course_id}`);
      return result;
    } catch (error) {
      console.error("Error checking enrollment:", error);
      throw error;
    }
  },

  getUserOverallStats: async (user_id) => {
    const query = `
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
    try {
      const result = await db.query(query, [user_id]);
      console.log(`Fetched user overall stats for user ID: ${user_id}`);
      return result;
    } catch (error) {
      console.error("Error fetching user overall stats:", error);
      throw error;
    }
  },
};

module.exports = courseQueries;
