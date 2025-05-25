const NodeCache = require("node-cache");
const db = require("../config/database");
const logActivity = require("../utils/logger");

// Initialize cache with 15 minutes TTL
const sectionCache = new NodeCache({
  stdTTL: 900, // 15 minutes
  checkperiod: 300, // Check for expired entries every 5 minutes
  useClones: false,
  deleteOnExpire: true,
});

// Clear section cache when data changes
const clearSectionCache = (courseId) => {
  sectionCache.del(`course_sections_${courseId}`);
  sectionCache.del(`admin_sections_${courseId}`);
};

// Add a new section
const addSection = async (req, res) => {
  // Role-based access control
  if (!req.user.admin) {
    console.error(`Access denied for user: ${req.user.userId}`);
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  const { course_id, name, description } = req.body;

  // Clear cache before making changes
  clearSectionCache(course_id);

  try {
    // Validate required fields
    if (!course_id || !name) {
      return res
        .status(400)
        .json({ error: "course_id and name are required." });
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
    const result = await db.query(query, [
      course_id,
      name,
      description || null,
      nextOrder,
    ]);

    await logActivity(
      "Section",
      `New section added: ${name} for course ID ${course_id}`,
      req.user.userId
    );

    // Update cache
    clearSectionCache(course_id);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding section:", err);
    res.status(500).json({ error: "Failed to add section." });
  }
};

// Admin version - simplified, no user progress
const getAdminSections = async (req, res) => {
  const { course_id } = req.query;

  if (!course_id) {
    return res.status(400).json({ error: "course_id is required" });
  }

  // Check cache first
  const cacheKey = `admin_sections_${course_id}`;
  const cachedData = sectionCache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    // Separate queries for better performance
    // 1. Get sections first
    const sectionsQuery = `
      SELECT 
        section_id, 
        name, 
        description,
        section_order
      FROM section 
      WHERE course_id = $1
      ORDER BY section_order ASC;
    `;
    const sections = await db.query(sectionsQuery, [course_id]);

    if (sections.rows.length === 0) {
      const emptyResult = [];
      sectionCache.set(cacheKey, emptyResult);
      return res.json(emptyResult);
    }

    // 2. Get all lessons for these sections in one query
    const sectionIds = sections.rows.map((s) => s.section_id);
    const lessonsQuery = `
      SELECT 
        section_id,
        lesson_id,
        name,
        lesson_order
      FROM lesson
      WHERE section_id = ANY($1)
      ORDER BY lesson_order ASC;
    `;
    const lessons = await db.query(lessonsQuery, [sectionIds]);

    // Organize data
    const result = sections.rows.map((section) => ({
      ...section,
      lessons: lessons.rows
        .filter((lesson) => lesson.section_id === section.section_id)
        .map(({ section_id, ...lesson }) => lesson),
    }));

    // Cache the result
    sectionCache.set(cacheKey, result);
    return res.json(result);
  } catch (err) {
    console.error("Error fetching admin sections:", err);
    return res.status(500).json({ error: "Failed to fetch sections" });
  }
};

// User version - includes progress tracking
const getUserSections = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.user_id;
  const cacheKey = `course_sections_${courseId}_${userId}`;

  try {
    // Check cache first
    const cachedData = sectionCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Separate queries for better performance
    // 1. Get sections first
    const sectionsQuery = `
      SELECT 
        section_id, 
        name, 
        description,
        section_order
      FROM section 
      WHERE course_id = $1
      ORDER BY section_order ASC;
    `;
    const sections = await db.query(sectionsQuery, [courseId]);

    if (sections.rows.length === 0) {
      const emptyResult = [];
      sectionCache.set(cacheKey, emptyResult);
      return res.json(emptyResult);
    }

    // 2. Get lessons and progress for all sections in one query
    const sectionIds = sections.rows.map((s) => s.section_id);
    const lessonsQuery = `
      SELECT 
        l.section_id,
        l.lesson_id,
        l.name,
        l.lesson_order,
        COALESCE(lp.completed, false) as completed
      FROM lesson l
      LEFT JOIN lesson_progress lp ON l.lesson_id = lp.lesson_id AND lp.user_id = $1
      WHERE l.section_id = ANY($2)
      ORDER BY l.lesson_order ASC;
    `;
    const lessons = await db.query(lessonsQuery, [userId, sectionIds]);

    // Organize data
    const result = sections.rows.map((section) => ({
      ...section,
      lessons: lessons.rows
        .filter((lesson) => lesson.section_id === section.section_id)
        .map(({ section_id, ...lesson }) => lesson),
    }));

    // Cache the result
    sectionCache.set(cacheKey, result);
    return res.json(result);
  } catch (err) {
    console.error("Error fetching user sections:", err);
    return res.status(500).json({ error: "Failed to fetch sections" });
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
      return res.status(404).json({ error: "Section not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching section:", err);
    res.status(500).json({ error: "Failed to fetch section details" });
  }
};

// Edit a section
const editSection = async (req, res) => {
  // Role-based access control
  if (!req.user.admin) {
    console.error(`Access denied for user: ${req.user.userId}`);
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  const { section_id } = req.params;
  const { name, description } = req.body;

  // Get course_id to clear cache
  let course_id;
  try {
    const sectionQuery = "SELECT course_id FROM section WHERE section_id = $1";
    const result = await db.query(sectionQuery, [section_id]);
    if (result.rows.length > 0) {
      course_id = result.rows[0].course_id;
      clearSectionCache(course_id);
    }
  } catch (err) {
    console.error("Error fetching course_id:", err);
  }

  try {
    // Validate section_id
    if (!section_id || isNaN(section_id)) {
      return res.status(400).json({ error: "Invalid section_id." });
    }

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: "Section name is required." });
    }

    const query = `
      UPDATE section
      SET name = $1, description = $2
      WHERE section_id = $3
      RETURNING *;
    `;
    const result = await db.query(query, [
      name,
      description || null,
      section_id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Section not found." });
    }

    await logActivity("Section", `Section updated: ${name}`, req.user.userId);

    // Update cache
    clearSectionCache(result.rows[0].course_id);

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error updating section:", err);
    res.status(500).json({ error: "Failed to update section." });
  }
};

// Delete a section and its associated lessons
const deleteSection = async (req, res) => {
  // Role-based access control
  if (!req.user.admin) {
    console.error(`Access denied for user: ${req.user.userId}`);
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  const { section_id } = req.params;

  // Get course_id to clear cache
  let course_id;
  try {
    const sectionQuery = "SELECT course_id FROM section WHERE section_id = $1";
    const result = await db.query(sectionQuery, [section_id]);
    if (result.rows.length > 0) {
      course_id = result.rows[0].course_id;
      clearSectionCache(course_id);
    }
  } catch (err) {
    console.error("Error fetching course_id:", err);
  }

  try {
    // Validate section_id
    if (!section_id || isNaN(section_id)) {
      return res.status(400).json({ error: "Invalid section_id." });
    }

    // Begin transaction
    const client = await db.connect();
    await client.query("BEGIN");

    // Get section name for logging
    const sectionQuery = "SELECT name FROM section WHERE section_id = $1";
    const sectionResult = await client.query(sectionQuery, [section_id]);

    if (sectionResult.rowCount === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ error: "Section not found." });
    }

    const sectionName = sectionResult.rows[0].name;

    // First, get all lesson IDs in this section
    const lessonIdsQuery = "SELECT lesson_id FROM lesson WHERE section_id = $1";
    const lessonIdsResult = await client.query(lessonIdsQuery, [section_id]);
    const lessonIds = lessonIdsResult.rows.map((row) => row.lesson_id);

    if (lessonIds.length > 0) {
      // Delete lesson progress records first
      const deleteLessonProgressQuery =
        "DELETE FROM lesson_progress WHERE lesson_id = ANY($1)";
      await client.query(deleteLessonProgressQuery, [lessonIds]);
    }

    // Delete lessons associated with the section
    const deleteLessonsQuery = "DELETE FROM lesson WHERE section_id = $1";
    await client.query(deleteLessonsQuery, [section_id]);

    // Delete the section
    const deleteSectionQuery =
      "DELETE FROM section WHERE section_id = $1 RETURNING section_id";
    await client.query(deleteSectionQuery, [section_id]);

    // Commit transaction
    await client.query("COMMIT");
    client.release();

    await logActivity(
      "Section",
      `Section deleted: ${sectionName}`,
      req.user.userId
    );

    // Update cache
    clearSectionCache(section_id);

    res.status(200).json({
      message: "Section and associated lessons deleted successfully.",
    });
  } catch (err) {
    console.error("Error deleting section:", err);
    res.status(500).json({ error: "Failed to delete section." });
  }
};

// Reorder sections
const reorderSections = async (req, res) => {
  // Role-based access control
  if (!req.user.admin) {
    console.error(`Access denied for user: ${req.user.userId}`);
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  const { sections } = req.body; // Expecting an array of { section_id, order }

  try {
    if (!sections || !Array.isArray(sections)) {
      return res.status(400).json({
        error: "Invalid input format. Expected an array of sections.",
      });
    }

    const client = await db.connect();
    await client.query("BEGIN");

    // Update section order for each section
    const updatePromises = sections.map(({ section_id, order }) => {
      return client.query(
        "UPDATE section SET section_order = $1 WHERE section_id = $2",
        [order, section_id]
      );
    });

    await Promise.all(updatePromises);
    await client.query("COMMIT");
    client.release();

    // Update cache
    sections.forEach(({ section_id }) => {
      clearSectionCache(section_id);
    });

    res.status(200).json({ message: "Sections reordered successfully." });
  } catch (err) {
    console.error("Error reordering sections:", err);
    res.status(500).json({ error: "Failed to reorder sections." });
  }
};

module.exports = {
  addSection,
  getAdminSections,
  getUserSections,
  getSectionById,
  editSection,
  deleteSection,
  reorderSections,
};
