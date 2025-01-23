const db = require('../config/database');

const courseQueries = {
  insertCourse: async (title, description, status, difficulty, language_id, imageUrl) => {
    const query = `
      INSERT INTO course (name, description, status, difficulty, language_id, image)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    return db.query(query, [title, description, status, difficulty, language_id, imageUrl]);
  },

  updateCourse: async (course_id, title, description, status, difficulty, language_id, imageUrl) => {
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
    return db.query(query, [title, description, status, difficulty, language_id, imageUrl, course_id]);
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
        values: [course_id]
      },
      {
        text: `DELETE FROM lesson
               WHERE section_id IN (SELECT section_id
                                  FROM section
                                  WHERE course_id = $1);`,
        values: [course_id]
      },
      {
        text: 'DELETE FROM section WHERE course_id = $1;',
        values: [course_id]
      },
      {
        text: 'DELETE FROM enrollment WHERE course_id = $1;',
        values: [course_id]
      },
      {
        text: 'DELETE FROM feedback WHERE course_id = $1;',
        values: [course_id]
      },
      {
        text: 'DELETE FROM course WHERE course_id = $1 RETURNING name;',
        values: [course_id]
      }
    ];

    for (const query of queries) {
      await db.query(query.text, query.values);
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
    return db.query(query);
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
    return db.query(query, [course_id]);
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
    return db.query(query, [user_id, course_id]);
  },

  enrollUser: async (user_id, course_id) => {
    const query = `
      INSERT INTO enrollment (user_id, course_id, enrollment_date)
      VALUES ($1, $2, NOW())
      RETURNING *;
    `;
    return db.query(query, [user_id, course_id]);
  },

  checkEnrollment: async (user_id, course_id) => {
    const query = `
      SELECT * FROM enrollment
      WHERE user_id = $1 AND course_id = $2
    `;
    return db.query(query, [user_id, course_id]);
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
    return db.query(query, [user_id]);
  }
};

module.exports = courseQueries;