const db = require('../config/database');
const { AppError } = require('../utils/error.utils');

const lessonQueries = {
  // Get next order value for a section
  getNextOrder: async (section_id) => {
    const query = `
      SELECT COALESCE(MAX(lesson_order), -1) + 1 AS next_order 
      FROM lesson 
      WHERE section_id = $1;
    `;
    const result = await db.query(query, [section_id]);
    return result.rows[0].next_order;
  },

  // Insert a new lesson
  insertLesson: async (section_id, name, content, xp, test_cases, lesson_order, template_code, hint, solution) => {
    const query = `
      INSERT INTO lesson (
        section_id, name, content, xp, test_cases, lesson_order, 
        template_code, hint, solution, auto_detect
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    // Process test cases to include pattern validation
    const processedTestCases = test_cases.map(test => ({
      input: test.input || '',
      expected_output: test.expected_output || '',
      auto_detect: test.auto_detect || false,
      use_pattern: test.use_pattern || false,
      pattern: test.pattern || ''
    }));

    const values = [
      section_id, 
      name, 
      content, 
      xp || 0, 
      JSON.stringify(processedTestCases), 
      lesson_order,
      template_code || '', 
      hint || '', 
      solution || '',
      processedTestCases[0]?.auto_detect || false
    ];
    return db.query(query, values);
  },

  // Get lessons by section with user progress
  getLessonsBySection: async (userId, sectionId) => {
    const query = `
      SELECT 
        l.lesson_id,
        l.name,
        l.lesson_order,
        l.xp,
        COALESCE(lp.completed, false) as completed
      FROM lesson l
      LEFT JOIN lesson_progress lp ON l.lesson_id = lp.lesson_id 
        AND lp.user_id = $1
      WHERE l.section_id = $2
      ORDER BY l.lesson_order ASC
    `;
    return db.query(query, [userId, sectionId]);
  },

  // Get lesson by ID with course language
  getLessonById: async (lessonId) => {
    const query = `
      SELECT 
        lesson.*, 
        COALESCE(
          lesson.test_cases,
          '[{"input": "", "expected_output": "", "auto_detect": false, "use_pattern": false, "pattern": ""}]'::jsonb
        ) as test_cases,
        course.language_id,
        lesson.hint,
        lesson.solution,
        lesson.auto_detect
      FROM lesson
      JOIN section ON lesson.section_id = section.section_id
      JOIN course ON section.course_id = course.course_id
      WHERE lesson.lesson_id = $1;
    `;
    return db.query(query, [lessonId]);
  },

  // Update lesson
  updateLesson: async (
    lesson_id, 
    name, 
    content, 
    xp, 
    test_cases, 
    section_id, 
    template_code, 
    hint, 
    solution
  ) => {
    // Process test cases while preserving all fields
    const processedTestCases = test_cases.map(test => ({
      input: test.input || '',
      expected_output: test.expected_output || '',
      auto_detect: test.auto_detect === true,  // Force boolean
      use_pattern: test.use_pattern === true,  // Force boolean
      pattern: test.pattern || ''
    }));

    const query = `
      UPDATE lesson
      SET 
        name = $1,
        content = $2,
        xp = $3,
        test_cases = $4::jsonb,
        section_id = $5,
        template_code = $6,
        hint = $7,
        solution = $8
      WHERE lesson_id = $9
      RETURNING *;
    `;

    const values = [
      name,
      content,
      xp || 0,
      JSON.stringify(processedTestCases),
      section_id,
      template_code || '',
      hint || '',
      solution || '',
      lesson_id
    ];

    return db.query(query, values);
  },

  // Delete lesson progress
  deleteLessonProgress: async (lesson_id) => {
    const query = `
      DELETE FROM lesson_progress
      WHERE lesson_id = $1;
    `;
    return db.query(query, [lesson_id]);
  },

  // Delete lesson
  deleteLesson: async (lesson_id) => {
    const query = `
      DELETE FROM lesson
      WHERE lesson_id = $1
      RETURNING lesson_id;
    `;
    return db.query(query, [lesson_id]);
  },

  // Update lesson order
  updateLessonOrder: async (lesson_id, order, client = db) => {
    const query = 'UPDATE lesson SET lesson_order = $1 WHERE lesson_id = $2';
    return client.query(query, [order, lesson_id]);
  },

  // Get course ID for lesson
  getCourseIdForLesson: async (lesson_id) => {
    const query = `
      SELECT course.course_id
      FROM course
      JOIN section ON course.course_id = section.course_id
      JOIN lesson ON section.section_id = lesson.section_id
      WHERE lesson.lesson_id = $1;
    `;
    return db.query(query, [lesson_id]);
  },

  // Check lesson progress
  checkLessonProgress: async (user_id, lesson_id) => {
    const query = `
      SELECT * FROM lesson_progress
      WHERE user_id = $1 AND lesson_id = $2;
    `;
    return db.query(query, [user_id, lesson_id]);
  },

  // Update lesson progress
  updateLessonProgress: async (user_id, lesson_id, completed, completed_at, submitted_code) => {
    const query = `
      UPDATE lesson_progress
      SET completed = $1, completed_at = $2, submitted_code = $3
      WHERE user_id = $4 AND lesson_id = $5
      RETURNING *;
    `;
    return db.query(query, [completed, completed_at, submitted_code, user_id, lesson_id]);
  },

  // Insert lesson progress
  insertLessonProgress: async (user_id, lesson_id, completed, completed_at, course_id, submitted_code) => {
    const query = `
      INSERT INTO lesson_progress (user_id, lesson_id, completed, completed_at, course_id, submitted_code)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    return db.query(query, [user_id, lesson_id, completed, completed_at, course_id, submitted_code]);
  },

  // Get total lessons count for course
  getTotalLessonsCount: async (course_id) => {
    const query = `
      SELECT COUNT(*) AS total_lessons
      FROM lesson
      JOIN section ON lesson.section_id = section.section_id
      WHERE section.course_id = $1;
    `;
    return db.query(query, [course_id]);
  },

  // Get completed lessons count
  getCompletedLessonsCount: async (user_id, course_id) => {
    const query = `
      SELECT COUNT(*) AS completed_lessons
      FROM lesson_progress
      WHERE user_id = $1 AND course_id = $2 AND completed = true;
    `;
    return db.query(query, [user_id, course_id]);
  },

  // Update enrollment progress
  updateEnrollmentProgress: async (progress, user_id, course_id) => {
    const query = `
      UPDATE enrollment
      SET progress = $1
      WHERE user_id = $2 AND course_id = $3
      RETURNING *;
    `;
    return db.query(query, [progress, user_id, course_id]);
  },

  // Get lesson progress
  getLessonProgress: async (user_id, lesson_id) => {
    const query = `
      SELECT completed, completed_at, submitted_code
      FROM lesson_progress
      WHERE user_id = $1 AND lesson_id = $2;
    `;
    return db.query(query, [user_id, lesson_id]);
  },

  // Get last accessed lesson
  getLastAccessedLesson: async (userId, courseId) => {
    const query = `
      SELECT 
        l.lesson_id,
        l.name,
        s.name as section_name,
        lp.completed_at
      FROM lesson_progress lp
      JOIN lesson l ON lp.lesson_id = l.lesson_id
      JOIN section s ON l.section_id = s.section_id
      WHERE lp.user_id = $1 
      AND s.course_id = $2
      ORDER BY lp.completed_at DESC
      LIMIT 1;
    `;
    return db.query(query, [userId, courseId]);
  },

  // Get lessons by section or course
  getLessons: async (section_id, course_id) => {
    let query;
    let params;

    if (section_id) {
      query = `
        SELECT 
          lesson.*,
          section.section_order,
          section.name as section_name
        FROM lesson
        JOIN section ON lesson.section_id = section.section_id
        WHERE lesson.section_id = $1
        ORDER BY lesson.lesson_order ASC;
      `;
      params = [section_id];
    } else {
      query = `
        SELECT 
          lesson.*,
          section.section_id,
          section.name as section_name,
          section.section_order
        FROM lesson
        JOIN section ON lesson.section_id = section.section_id
        WHERE section.course_id = $1
        ORDER BY 
          section.section_order ASC,
          lesson.lesson_order ASC;
      `;
      params = [course_id];
    }

    return db.query(query, params);
  },

  // Get all sections
  getAllSections: async () => {
    return db.query('SELECT section_id FROM section');
  },

  // Get lessons by section for ordering
  getLessonsBySection: async (section_id) => {
    const query = `
      SELECT lesson_id 
      FROM lesson 
      WHERE section_id = $1 
      ORDER BY lesson_id ASC
    `;
    return db.query(query, [section_id]);
  },

  getCourseIdFromSection: async (section_id) => {
    const query = `
      SELECT course_id 
      FROM section 
      WHERE section_id = $1
    `;
    return db.query(query, [section_id]);
  },

  recalculateProgressForCourse: async (course_id) => {
    const query = `
      WITH enrolled_users AS (
        SELECT DISTINCT user_id 
        FROM enrollment 
        WHERE course_id = $1
      ),
      progress_calc AS (
        SELECT 
          eu.user_id,
          COUNT(DISTINCT lp.lesson_id)::float / 
          (SELECT COUNT(*)::float FROM lesson l 
           JOIN section s ON l.section_id = s.section_id 
           WHERE s.course_id = $1) * 100 as new_progress
        FROM enrolled_users eu
        LEFT JOIN lesson_progress lp ON eu.user_id = lp.user_id
        WHERE lp.completed = true
        AND lp.course_id = $1
        GROUP BY eu.user_id
      )
      UPDATE enrollment e
      SET progress = COALESCE(pc.new_progress, 0)
      FROM progress_calc pc
      WHERE e.user_id = pc.user_id
      AND e.course_id = $1
    `;
    return db.query(query, [course_id]);
  }
};

module.exports = lessonQueries; 