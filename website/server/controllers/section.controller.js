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

// Get all sections for a course
const getSectionsByCourse = async (req, res) => {
  const { course_id } = req.query;

  try {
    // Validate the course_id
    if (!course_id || isNaN(course_id)) {
      return res.status(400).json({ error: 'Invalid or missing course_id.' });
    }

    // Query to fetch sections
    const query = `
      SELECT 
        section.section_id, 
        section.name, 
        section.description,
        section.section_order
      FROM section
      WHERE course_id = $1
      ORDER BY section_order ASC;
    `;
    const { rows } = await db.query(query, [course_id]);

   

    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching sections:', err.message || err);
    res.status(500).json({ error: 'Failed to fetch sections.' });
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
  getSectionsByCourse,
  editSection,
  deleteSection,
  reorderSections,
};
