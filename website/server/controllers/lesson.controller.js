const db = require('../config/database');
const logActivity = require('../utils/logger');

// Add a new lesson
const addLesson = async (req, res) => {
  try {
    const { section_id, name, content, xp, test_cases } = req.body;

    // Validate required fields
    if (!section_id || !name || !content) {
      return res.status(400).json({ error: 'section_id, name, and content are required.' });
    }

    const query = `
      INSERT INTO lesson (section_id, name, content, xp, test_cases)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [
      section_id,
      name,
      content,
      xp || 0,
      JSON.stringify(test_cases || []),
    ];

    console.log('Saving test cases:', test_cases); // Debug log
    const result = await db.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding lesson:', err);
    res.status(500).json({ error: 'Failed to add lesson.' });
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
      WHERE section_id = $1;
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
        course.language_id -- Fetch language_id from the course table
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

    // Ensure test_cases is always an array
    try {
      lessonData.test_cases = Array.isArray(lessonData.test_cases)
        ? lessonData.test_cases.map(testCase => ({
            input: testCase.input || '',
            expectedOutput: testCase.expected_output || '', // Convert to expectedOutput for frontend
          }))
        : [{ input: '', expectedOutput: '' }];
    } catch (err) {
      console.error('Error parsing test_cases:', err);
      lessonData.test_cases = [{ input: '', expectedOutput: '' }];
    }

    console.log('Formatted lesson data with language_id:', lessonData);

    res.status(200).json(lessonData);
  } catch (err) {
    console.error('Error fetching lesson:', err.message);
    res.status(500).json({ error: 'Failed to fetch lesson data. Please try again later.' });
  }
};



// Update a lesson
const editLesson = async (req, res) => {
  try {
    const { lesson_id } = req.params;
    const { name, content, xp, test_cases, section_id } = req.body;

    // Validate required fields
    if (!name || !content || !section_id) {
      return res
        .status(400)
        .json({ error: 'Name, content, and section_id are required' });
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
      content,
      xp || 0,
      JSON.stringify(test_cases || []), // Ensure test_cases is always an array
      section_id,
      lesson_id,
    ];

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Log successful update
    console.log('Updated lesson data:', result.rows[0]);
    await logActivity(
      'Lesson',
      `Lesson updated: ${name} by user ID ${req.user.userId} Name (${req.user.name})`,
      req.user.userId
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating lesson:', err);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
};


// Delete a lesson
const deleteLesson = async (req, res) => {
  const { lesson_id } = req.params;

  try {
    const query = `DELETE FROM lesson WHERE lesson_id = $1 RETURNING lesson_id;`;
    const { rows } = await db.query(query, [lesson_id]);

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

module.exports = {
  addLesson,
  getLessonsBySection,
  getLessonById,
  editLesson,
  deleteLesson,
  reorderLessons,
};
