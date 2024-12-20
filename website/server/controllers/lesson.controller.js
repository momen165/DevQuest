const db = require('../config/database');
const logActivity = require('../utils/logger');
const he = require('he');

// Add a new lesson
const addLesson = async (req, res) => {
  // Role-based access control
  if (!req.user.admin) {
    console.error(`Access denied for user: ${req.user.userId}`);
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }

  try {
    const { section_id, name, content, xp, test_cases } = req.body;

    // Validate required fields
    if (!section_id || !name || !content) {
      return res.status(400).json({ error: 'section_id, name, and content are required.' });
    }

    // Get the next order value for the section
    const orderQuery = `
      SELECT COALESCE(MAX(lesson_order), -1) + 1 AS next_order 
      FROM lesson 
      WHERE section_id = $1;
    `;
    
    const orderResult = await db.query(orderQuery, [section_id]);
    const nextOrder = orderResult.rows[0].next_order;

    const query = `
      INSERT INTO lesson (section_id, name, content, xp, test_cases, lesson_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const values = [
      section_id,
      name,
      content,
      xp || 0,
      JSON.stringify(test_cases || []),
      nextOrder
    ];

    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding lesson:', err);
    res.status(500).json({ error: 'Failed to add lesson.' });
  }
};

// Add this new function to fix existing lesson orders
const fixLessonOrders = async (req, res) => {
  try {
    // Get all sections
    const sectionsQuery = 'SELECT section_id FROM section';
    const sectionsResult = await db.query(sectionsQuery);
    
    for (const section of sectionsResult.rows) {
      // Get lessons for this section ordered by lesson_id
      const lessonsQuery = `
        SELECT lesson_id 
        FROM lesson 
        WHERE section_id = $1 
        ORDER BY lesson_id ASC
      `;
      const lessonsResult = await db.query(lessonsQuery, [section.section_id]);
      
      // Update lesson_order for each lesson
      for (let i = 0; i < lessonsResult.rows.length; i++) {
        await db.query(
          'UPDATE lesson SET lesson_order = $1 WHERE lesson_id = $2',
          [i, lessonsResult.rows[i].lesson_id]
        );
      }
    }
    
    res.status(200).json({ message: 'Lesson orders fixed successfully' });
  } catch (err) {
    console.error('Error fixing lesson orders:', err);
    res.status(500).json({ error: 'Failed to fix lesson orders' });
  }
};

// Get all lessons for a specific section
const getLessonsBySection = async (req, res) => {
  const { section_id } = req.query;

  if (!section_id) {
    return res.status(400).json({ error: 'section_id is required.' });
  }

  try {
    const query = `
      SELECT lesson_id, name, content, xp, test_cases
      FROM lesson
      WHERE section_id = $1
      order by lesson_order ;
    `;
    const { rows } = await db.query(query, [section_id]);

    // Return empty array instead of 404
    return res.status(200).json(rows);
    
  } catch (err) {
    console.error('Error fetching lessons:', err);
    res.status(500).json({ error: 'Failed to fetch lessons.' });
  }
};



// Get a specific lesson by ID
const getLessonById = async (req, res) => {
  const { lessonId } = req.params;

  try {
    // Query that joins lesson, section, and course to fetch lesson and language_id
    const query = `
      SELECT 
        lesson.*, 
        COALESCE(lesson.test_cases::json, '[{"input": "", "expected_output": ""}]'::json) as test_cases,
        course.language_id
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

    // Ensure test_cases is always an array and preserve exact formatting
    try {
      lessonData.test_cases = Array.isArray(lessonData.test_cases)
        ? lessonData.test_cases.map(testCase => ({
            input: testCase.input || '',
            // Preserve exact formatting by not trimming
            expectedOutput: testCase.expected_output || '',
            // Ensure newlines are preserved
            preserveFormat: true
          }))
        : [{ input: '', expectedOutput: '', preserveFormat: true }];
    } catch (err) {
      console.error('Error parsing test_cases:', err);
      lessonData.test_cases = [{ input: '', expectedOutput: '', preserveFormat: true }];
    }

    res.status(200).json(lessonData);
  } catch (err) {
    console.error('Error fetching lesson:', err.message);
    res.status(500).json({ error: 'Failed to fetch lesson data. Please try again later.' });
  }
};



const editLesson = async (req, res) => {
  try {
    const { lesson_id } = req.params;
    const { name, content, xp, test_cases, section_id } = req.body;

    // Add debug logging
    console.log('Received lesson content:', content);

    // Validate required fields
    if (!name || !content || !section_id) {
      return res.status(400).json({ error: 'Name, content, and section_id are required' });
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
      content, // Store raw content without modification
      xp || 0,
      JSON.stringify(test_cases || []),
      section_id,
      lesson_id,
    ];

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Add debug logging
    console.log('Saved lesson content:', result.rows[0].content);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating lesson:', err);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
};

// Delete a lesson
const deleteLesson = async (req, res) => {
  // Role-based access control
  if (!req.user.admin) {
    console.error(`Access denied for user: ${req.user.userId}`);
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }

  const { lesson_id } = req.params;

  try {
      // Delete lesson progress related to the lesson
      const deleteLessonProgress = `
          DELETE
          FROM lesson_progress
          WHERE lesson_id = $1;
      `;
      await db.query(deleteLessonProgress, [lesson_id]);

      // Delete the lesson
      const deleteLessonQuery = `DELETE
                                 FROM lesson
                                 WHERE lesson_id = $1
                                 RETURNING lesson_id;`;
      const {rows} = await db.query(deleteLessonQuery, [lesson_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    res.status(200).json({ message: 'Lesson deleted successfully.' });
  } catch (err) {
    console.error('Error deleting lesson:', err);
    res.status(500).json({ error: 'Failed to delete lesson.' });
  }
};

// Reorder lessons
const reorderLessons = async (req, res) => {
  const { lessons } = req.body;

  try {
    if (!Array.isArray(lessons)) {
      return res.status(400).json({ error: 'Invalid request format. Expected an array of lessons.' });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const updatePromises = lessons.map(({ lesson_id, order }) =>
        client.query('UPDATE lesson SET lesson_order = $1 WHERE lesson_id = $2', [order, lesson_id])
      );

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
  } catch (err) {
    console.error('Error reordering lessons:', err);
    res.status(500).json({ error: 'Failed to reorder lessons.' });
  }
};

/**
 * Updates the progress of a lesson for a user.
 *
 * This asynchronous function updates a user's progress for a specific lesson.
 * It handles both the creation of new progress records and updates to existing ones.
 * Additionally, it calculates and updates the user's overall progress for the course
 * associated with the lesson.
 */


const updateLessonProgress = async (req, res) => {
  const { user_id, lesson_id, completed, submitted_code } = req.body;

  if (!user_id || !lesson_id || completed === undefined) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const courseQuery = `
      SELECT course.course_id
      FROM course
             JOIN section ON course.course_id = section.course_id
             JOIN lesson ON section.section_id = lesson.section_id
      WHERE lesson.lesson_id = $1;
    `;
    const courseResult = await db.query(courseQuery, [lesson_id]);

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found or not linked to a course.' });
    }

    const courseId = courseResult.rows[0].course_id;

    const checkQuery = `
      SELECT * FROM lesson_progress
      WHERE user_id = $1 AND lesson_id = $2;
    `;
    const checkResult = await db.query(checkQuery, [user_id, lesson_id]);

    // Decode submitted_code if needed
    const sanitizedCode = he.decode(submitted_code);

    if (checkResult.rows.length > 0) {
      const updateQuery = `
        UPDATE lesson_progress
        SET completed = $1, completed_at = $2, submitted_code = $3
        WHERE user_id = $4 AND lesson_id = $5
        RETURNING *;
      `;
      const updateValues = [
        completed,
        completed ? new Date() : null,
        sanitizedCode,
        user_id,
        lesson_id,
      ];
      const updateResult = await db.query(updateQuery, updateValues);

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Error updating progress.' });
      }
    } else {
      const insertQuery = `
        INSERT INTO lesson_progress (user_id, lesson_id, completed, completed_at, course_id, submitted_code)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const insertValues = [
        user_id,
        lesson_id,
        completed,
        completed ? new Date() : null,
        courseId,
        sanitizedCode,
      ];
      const insertResult = await db.query(insertQuery, insertValues);
    }

    // Calculate progress
    const totalLessonsQuery = `
      SELECT COUNT(*) AS total_lessons
      FROM lesson
             JOIN section ON lesson.section_id = section.section_id
      WHERE section.course_id = $1;
    `;
    const totalLessonsResult = await db.query(totalLessonsQuery, [courseId]);
    const totalLessons = parseInt(totalLessonsResult.rows[0].total_lessons, 10);

    const completedLessonsQuery = `
      SELECT COUNT(*) AS completed_lessons
      FROM lesson_progress
      WHERE user_id = $1 AND course_id = $2 AND completed = true;
    `;
    const completedLessonsResult = await db.query(completedLessonsQuery, [
      user_id,
      courseId,
    ]);
    const completedLessons = parseInt(completedLessonsResult.rows[0].completed_lessons, 10);

    const progress = (completedLessons / totalLessons) * 100;

    // Update enrollment progress
    const updateEnrollmentQuery = `
      UPDATE enrollment
      SET progress = $1
      WHERE user_id = $2 AND course_id = $3
      RETURNING *;
    `;
    const updateEnrollmentValues = [progress, user_id, courseId];
    const updateEnrollmentResult = await db.query(updateEnrollmentQuery, updateEnrollmentValues);

    if (updateEnrollmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found.' });
    }

    res.status(200).json({
      message: 'Lesson progress and enrollment updated.',
      data: updateEnrollmentResult.rows[0],
    });
  } catch (err) {
    console.error('Error updating lesson progress:', err);
    res.status(500).json({ error: 'Internal server error. Please try again later.' });
  }
};

module.exports = {updateLessonProgress};


const getLessonProgress = async (req, res) => {
  const { user_id, lesson_id } = req.query;

  if (!user_id || !lesson_id) {
    return res.status(400).json({ error: 'user_id and lesson_id are required.' });
  }

  try {
    const query = `
      SELECT completed, completed_at, submitted_code
      FROM lesson_progress
      WHERE user_id = $1 AND lesson_id = $2;
    `;
    const { rows } = await db.query(query, [user_id, lesson_id]);

    if (rows.length === 0) {
      return res.status(200).json({ completed: false, completed_at: null, submitted_code: '' });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error fetching lesson progress:', err);
    res.status(500).json({ error: 'Failed to fetch lesson progress.' });
  }
};

const getLastAccessedLesson = async (userId, courseId) => {
  try {
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
    
    const result = await db.query(query, [userId, courseId]);
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error fetching last accessed lesson:', err);
    return null;
  }
};

const getLessons = async (req, res) => {
    const { section_id, course_id } = req.query;

    try {
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
        } else if (course_id) {
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
        } else {
            return res.status(400).json({ error: 'Either section_id or course_id must be provided.' });
        }

        const result = await db.query(query, params);
        console.log('Fetched lessons with ordering:', result.rows);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching lessons:', err);
        res.status(500).json({ error: 'Failed to fetch lessons.' });
    }
};

module.exports = {
  addLesson,
  getLessonsBySection,
  getLessonById,
  editLesson,
  deleteLesson,
  reorderLessons,
  updateLessonProgress,
  getLessonProgress,
  getLastAccessedLesson,
  getLessons,
  fixLessonOrders
};
