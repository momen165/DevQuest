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

    // Clear cache once after all changes
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
    const lessons = await db.query(lessonsQuery, [sectionIds]); // Organize data
    const result = sections.rows.map((section) => ({
      ...section,
      lessons: lessons.rows
        .filter((lesson) => lesson.section_id === section.section_id)
        .map((lesson) => {
          /* eslint-disable-next-line no-unused-vars */
          const { section_id: _unused, ...lessonWithoutSectionId } = lesson;
          return lessonWithoutSectionId;
        }),
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

  // Note: We're not using this internal cache anymore since we've added cacheMiddleware
  // The route-level caching is more efficient and prevents duplicate caching logic

  try {
    // Use a more efficient query with Common Table Expressions (CTE) to get all data in one go
    const optimizedQuery = `
      WITH section_data AS (
        SELECT 
          s.section_id, 
          s.name, 
          s.description,
          s.section_order
        FROM section s
        WHERE s.course_id = $1
        ORDER BY s.section_order ASC
      ),
      lesson_data AS (
        SELECT 
          l.section_id,
          l.lesson_id,
          l.name,
          l.lesson_order,
          COALESCE(lp.completed, false) as completed
        FROM lesson l
        LEFT JOIN lesson_progress lp ON l.lesson_id = lp.lesson_id AND lp.user_id = $2
        WHERE l.section_id IN (SELECT section_id FROM section_data)
        ORDER BY l.lesson_order ASC
      )
      SELECT 
        sd.*,
        json_agg(
          CASE WHEN ld.lesson_id IS NULL THEN NULL
          ELSE json_build_object(
            'lesson_id', ld.lesson_id,
            'name', ld.name,
            'lesson_order', ld.lesson_order,
            'completed', ld.completed
          ) END
        ) FILTER (WHERE ld.lesson_id IS NOT NULL) AS lessons
      FROM section_data sd
      LEFT JOIN lesson_data ld ON sd.section_id = ld.section_id
      GROUP BY sd.section_id, sd.name, sd.description, sd.section_order
      ORDER BY sd.section_order ASC;
    `;

    const result = await db.query(optimizedQuery, [courseId, userId]);

    // If no sections found, return empty array
    if (result.rows.length === 0) {
      return res.json([]);
    }

    // Handle case where lessons might be null for a section
    const formattedResult = result.rows.map((section) => ({
      ...section,
      lessons: section.lessons || [],
    }));

    return res.json(formattedResult);
  } catch (err) {
    console.error("Error fetching user sections:", err);
    return res.status(500).json({ error: "Failed to fetch sections" });
  }
};

// Get section by ID - Optimized version with enhanced data
const getSectionById = async (req, res) => {
  const { section_id } = req.params;
  const userId = req.user?.user_id;

  try {
    // Single optimized query using CTE for comprehensive section data
    const optimizedQuery = `
      WITH section_info AS (
        SELECT 
          s.section_id, 
          s.course_id,
          s.name, 
          s.description,
          s.section_order,
          c.name as course_name,
          c.status as course_status
        FROM section s
        JOIN course c ON s.course_id = c.course_id
        WHERE s.section_id = $1
      ),
      section_lessons AS (
        SELECT 
          l.lesson_id,
          l.name as lesson_name,
          l.lesson_order,
          l.xp,
          CASE 
            WHEN $2 IS NOT NULL THEN COALESCE(lp.completed, false)
            ELSE false
          END as completed
        FROM lesson l
        LEFT JOIN lesson_progress lp ON l.lesson_id = lp.lesson_id AND lp.user_id = $2
        WHERE l.section_id = $1
        ORDER BY l.lesson_order ASC
      ),
      section_stats AS (
        SELECT 
          COUNT(sl.lesson_id) as total_lessons,
          COALESCE(SUM(CASE WHEN sl.completed THEN 1 ELSE 0 END), 0) as completed_lessons,
          COALESCE(SUM(l.xp), 0) as total_xp,
          COALESCE(SUM(CASE WHEN sl.completed THEN l.xp ELSE 0 END), 0) as earned_xp
        FROM section_lessons sl
        LEFT JOIN lesson l ON sl.lesson_id = l.lesson_id
      )
      SELECT 
        si.*,
        COALESCE(
          json_agg(
            json_build_object(
              'lesson_id', sl.lesson_id,
              'lesson_name', sl.lesson_name,
              'lesson_order', sl.lesson_order,
              'xp', sl.xp,
              'completed', sl.completed
            ) ORDER BY sl.lesson_order
          ) FILTER (WHERE sl.lesson_id IS NOT NULL), 
          '[]'::json
        ) as lessons,
        ss.total_lessons,
        ss.completed_lessons,
        ss.total_xp,
        ss.earned_xp,
        CASE 
          WHEN ss.total_lessons > 0 THEN 
            ROUND((ss.completed_lessons::decimal / ss.total_lessons::decimal) * 100, 1)
          ELSE 0 
        END as completion_percentage
      FROM section_info si
      CROSS JOIN section_stats ss
      LEFT JOIN section_lessons sl ON true
      GROUP BY si.section_id, si.course_id, si.name, si.description, si.section_order, 
               si.course_name, si.course_status, ss.total_lessons, ss.completed_lessons, 
               ss.total_xp, ss.earned_xp
    `;

    const result = await db.query(optimizedQuery, [section_id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Section not found" });
    }

    const sectionData = result.rows[0];

    // Build optimized response structure
    const response = {
      section_id: sectionData.section_id,
      course_id: sectionData.course_id,
      name: sectionData.name,
      description: sectionData.description,
      section_order: sectionData.section_order,
      course_name: sectionData.course_name,
      course_status: sectionData.course_status,
      lessons: sectionData.lessons || [],
      stats: {
        total_lessons: sectionData.total_lessons,
        completed_lessons: sectionData.completed_lessons,
        total_xp: sectionData.total_xp,
        earned_xp: sectionData.earned_xp,
        completion_percentage: sectionData.completion_percentage,
      },
      optimized: true,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
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

  try {
    // Validate section_id
    if (!section_id || isNaN(section_id)) {
      return res.status(400).json({ error: "Invalid section_id." });
    }

    // Begin transaction
    const client = await db.connect();
    await client.query("BEGIN");

    // Get section name and course_id in one query
    const sectionQuery = "SELECT name, course_id FROM section WHERE section_id = $1";
    const sectionResult = await client.query(sectionQuery, [section_id]);

    if (sectionResult.rowCount === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ error: "Section not found." });
    }

    const sectionName = sectionResult.rows[0].name;
    const course_id = sectionResult.rows[0].course_id;

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

    // Clear cache once after all changes with the correct course_id
    clearSectionCache(course_id);

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

    // Use a single batch update query with parameterized arrays for safety
    const sectionIds = sections.map(({ section_id }) => section_id);
    const orders = sections.map(({ order }) => order);
    
    const batchUpdateQuery = `
      UPDATE section AS s SET
        section_order = v.new_order
      FROM (
        SELECT 
          UNNEST($1::int[]) AS section_id,
          UNNEST($2::int[]) AS new_order
      ) AS v
      WHERE s.section_id = v.section_id
    `;
    
    await client.query(batchUpdateQuery, [sectionIds, orders]);
    await client.query("COMMIT");
    client.release();

    // Clear cache once for the course (all sections belong to same course)
    // Get course_id from first section
    if (sections.length > 0) {
      const firstSectionResult = await db.query(
        "SELECT course_id FROM section WHERE section_id = $1",
        [sections[0].section_id]
      );
      if (firstSectionResult.rows.length > 0) {
        clearSectionCache(firstSectionResult.rows[0].course_id);
      }
    }

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
