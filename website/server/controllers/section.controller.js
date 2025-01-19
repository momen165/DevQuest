const db = require('../config/database');
const logActivity = require('../utils/logger');

// Add a new section
const addSection = async (req, res) => {
  // Role-based access control
  if (!req.user.admin) {
    console.error(`Access denied for user: ${req.user.userId}`);
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }

  const { course_id, name, description } = req.body;

  try {
    // Validate required fields
    if (!course_id || !name) {
      return res.status(400).json({ error: 'course_id and name are required.' });
    }

    // Get the next order value
    const orderQuery = `
      SELECT COALESCE(MAX(section_order), 0) + 1 AS next_order 
      FROM section 
      WHERE course_id = $1;
    `;
    
    const orderResult = await db.query(orderQuery, [course_id]);
    const nextOrder = orderResult.rows[0].next_order;

    // Insert the new section
    const query = `
      INSERT INTO section (course_id, name, description, section_order)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await db.query(query, [course_id, name, description || null, nextOrder]);

    await logActivity('Section', `New section added: ${name} for course ID ${course_id}`, req.user.userId);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding section:', err);
    res.status(500).json({ error: 'Failed to add section.' });
  }
};

// Admin version - simplified, no user progress
const getAdminSections = async (req, res) => {
  const { course_id } = req.query;

  if (!course_id) {
    return res.status(400).json({ error: 'course_id is required' });
  }

  try {
    const query = `
      SELECT 
        s.section_id, 
        s.name, 
        s.description,
        s.section_order,
        json_agg(
          json_build_object(
            'lesson_id', l.lesson_id,
            'name', l.name,
            'lesson_order', l.lesson_order
          ) ORDER BY l.lesson_order
        ) as lessons
      FROM section s
      LEFT JOIN lesson l ON s.section_id = l.section_id
      WHERE s.course_id = $1
      GROUP BY s.section_id, s.name, s.description, s.section_order
      ORDER BY s.section_order ASC;
    `;
    const result = await db.query(query, [course_id]);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching admin sections:', err);
    return res.status(500).json({ error: 'Failed to fetch sections' });
  }
};

// User version - includes progress tracking
const getUserSections = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.user_id;

  try {
    const query = `
      SELECT 
        s.section_id, 
        s.name, 
        s.description,
        s.section_order,
        json_agg(
          json_build_object(
            'lesson_id', l.lesson_id,
            'name', l.name,
            'completed', COALESCE(lp.completed, false),
            'description', s.description
          ) ORDER BY l.lesson_order
        ) as lessons
      FROM section s
      LEFT JOIN lesson l ON s.section_id = l.section_id
      LEFT JOIN lesson_progress lp ON l.lesson_id = lp.lesson_id AND lp.user_id = $2
      WHERE s.course_id = $1
      GROUP BY s.section_id, s.name, s.description, s.section_order
      ORDER BY s.section_order ASC;
    `;
    const result = await db.query(query, [courseId, userId]);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user sections:', err);
    return res.status(500).json({ error: 'Failed to fetch sections' });
  }
};

// Get section by ID
const getSectionById = async (req, res) => {
  const { section_id } = req.params;

  try {
    const query = `
      SELECT 
        s.section_id, 
        s.course_id,
        s.name, 
        s.description,
        s.section_order
      FROM section s
      WHERE s.section_id = $1
    `;
    const result = await db.query(query, [section_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching section:', err);
    res.status(500).json({ error: 'Failed to fetch section details' });
  }
};

// Edit a section
const editSection = async (req, res) => {

  // Role-based access control
  if (!req.user.admin) {
    console.error(`Access denied for user: ${req.user.userId}`);
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }

  const { section_id } = req.params;
  const { name, description } = req.body;

  try {
    // Validate section_id
    if (!section_id || isNaN(section_id)) {
      return res.status(400).json({ error: 'Invalid section_id.' });
    }

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Section name is required.' });
    }

    const query = `
      UPDATE section
      SET name = $1, description = $2
      WHERE section_id = $3
      RETURNING *;
    `;
    const result = await db.query(query, [name, description || null, section_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Section not found.' });
    }

    await logActivity('Section', `Section updated: ${name}`, req.user.userId);

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating section:', err);
    res.status(500).json({ error: 'Failed to update section.' });
  }
};

// Delete a section and its associated lessons
const deleteSection = async (req, res) => {
  // Role-based access control
  if (!req.user.admin) {
    console.error(`Access denied for user: ${req.user.userId}`);
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }

  const { section_id } = req.params;

  try {
    // Validate section_id
    if (!section_id || isNaN(section_id)) {
      return res.status(400).json({ error: 'Invalid section_id.' });
    }

    // Begin transaction
    const client = await db.connect();
    await client.query('BEGIN');

    // Get section name for logging
    const sectionQuery = 'SELECT name FROM section WHERE section_id = $1';
    const sectionResult = await client.query(sectionQuery, [section_id]);

    if (sectionResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Section not found.' });
    }

    const sectionName = sectionResult.rows[0].name;

    // Delete lessons associated with the section
    const deleteLessonsQuery = 'DELETE FROM lesson WHERE section_id = $1';
    await client.query(deleteLessonsQuery, [section_id]);

    // Delete the section
    const deleteSectionQuery = 'DELETE FROM section WHERE section_id = $1 RETURNING section_id';
    await client.query(deleteSectionQuery, [section_id]);

    // Commit transaction
    await client.query('COMMIT');
    client.release();

    await logActivity('Section', `Section deleted: ${sectionName}`, req.user.userId);

    res.status(200).json({ message: 'Section and associated lessons deleted successfully.' });
  } catch (err) {
    console.error('Error deleting section:', err);
    res.status(500).json({ error: 'Failed to delete section.' });
  }
};

// Reorder sections
const reorderSections = async (req, res) => {
  // Role-based access control
  if (!req.user.admin) {
    console.error(`Access denied for user: ${req.user.userId}`);
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }

  const { sections } = req.body; // Expecting an array of { section_id, order }

  try {
    if (!sections || !Array.isArray(sections)) {
      return res.status(400).json({ error: 'Invalid input format. Expected an array of sections.' });
    }

    const client = await db.connect();
    await client.query('BEGIN');

    // Update section order for each section
    const updatePromises = sections.map(({ section_id, order }) => {
      return client.query(
        'UPDATE section SET section_order = $1 WHERE section_id = $2',
        [order, section_id]
      );
    });

    await Promise.all(updatePromises);
    await client.query('COMMIT');
    client.release();

    res.status(200).json({ message: 'Sections reordered successfully.' });
  } catch (err) {
    console.error('Error reordering sections:', err);
    res.status(500).json({ error: 'Failed to reorder sections.' });
  }
};

module.exports = {
  addSection,
  getAdminSections,
  getUserSections,
  getSectionById,
  editSection,
  deleteSection,
  reorderSections
};