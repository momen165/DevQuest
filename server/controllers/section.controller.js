const NodeCache = require("node-cache");
const prisma = require("../config/prisma");
const logActivity = require("../utils/logger");
const { clearLessonCacheForCourse } = require("../utils/lesson-cache.utils");

// Initialize cache with 15 minutes TTL
const sectionCache = new NodeCache({
  stdTTL: 900,
  checkperiod: 300,
  useClones: false,
  deleteOnExpire: true,
});

// Clear section cache when data changes
const clearSectionCache = (courseId) => {
  sectionCache.del(`course_sections_${courseId}`);
  sectionCache.del(`admin_sections_${courseId}`);
  clearLessonCacheForCourse(courseId);
};

const clearAllSectionCache = () => {
  sectionCache.flushAll();
};

const toInt = (value) => Number.parseInt(value, 10);

// Add a new section
const addSection = async (req, res) => {
  if (!req.user.admin) {
    console.error(`Access denied for user: ${req.user.userId}`);
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  const { course_id, name, description } = req.body;
  const normalizedCourseId = toInt(course_id);

  try {
    if (!normalizedCourseId || !name) {
      return res
        .status(400)
        .json({ error: "course_id and name are required." });
    }

    const lastSection = await prisma.section.findFirst({
      where: { course_id: normalizedCourseId },
      orderBy: { section_order: "desc" },
      select: { section_order: true },
    });

    const nextOrder = (lastSection?.section_order || 0) + 1;

    const created = await prisma.section.create({
      data: {
        course_id: normalizedCourseId,
        name,
        description: description || null,
        section_order: nextOrder,
      },
    });

    await logActivity(
      "Section",
      `New section added: ${name} for course ID ${normalizedCourseId}`,
      req.user.userId,
    );

    clearSectionCache(normalizedCourseId);

    res.status(201).json(created);
  } catch (err) {
    console.error("Error adding section:", err);
    res.status(500).json({ error: "Failed to add section." });
  }
};

// Admin version - simplified, no user progress
const getAdminSections = async (req, res) => {
  const { course_id } = req.query;
  const normalizedCourseId = toInt(course_id);

  if (!normalizedCourseId) {
    return res.status(400).json({ error: "course_id is required" });
  }

  const cacheKey = `admin_sections_${normalizedCourseId}`;
  const cachedData = sectionCache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const sections = await prisma.section.findMany({
      where: { course_id: normalizedCourseId },
      orderBy: { section_order: "asc" },
      include: {
        lesson: {
          orderBy: { lesson_order: "asc" },
          select: {
            lesson_id: true,
            name: true,
            lesson_order: true,
          },
        },
      },
    });

    const result = sections.map((section) => ({
      section_id: section.section_id,
      name: section.name,
      description: section.description,
      section_order: section.section_order,
      lessons: section.lesson,
    }));

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

  try {
    const sections = await prisma.section.findMany({
      where: { course_id: toInt(courseId) },
      orderBy: { section_order: "asc" },
      include: {
        lesson: {
          orderBy: { lesson_order: "asc" },
          include: {
            lesson_progress: {
              where: { user_id: Number(userId) },
              select: { completed: true },
              take: 1,
            },
          },
        },
      },
    });

    const formatted = sections.map((section) => ({
      section_id: section.section_id,
      name: section.name,
      description: section.description,
      section_order: section.section_order,
      lessons: section.lesson.map((lesson) => ({
        lesson_id: lesson.lesson_id,
        name: lesson.name,
        lesson_order: lesson.lesson_order,
        completed: Boolean(lesson.lesson_progress[0]?.completed),
      })),
    }));

    return res.json(formatted);
  } catch (err) {
    console.error("Error fetching user sections:", err);
    return res.status(500).json({ error: "Failed to fetch sections" });
  }
};

// Get section by ID - optimized version with enhanced data
const getSectionById = async (req, res) => {
  const { section_id } = req.params;
  const userId = req.user?.user_id;

  try {
    const lessonProgressInclude = userId
      ? {
          where: { user_id: Number(userId) },
          select: { completed: true },
          take: 1,
        }
      : {
          take: 0,
          select: { completed: true },
        };

    const section = await prisma.section.findUnique({
      where: { section_id: toInt(section_id) },
      include: {
        course: {
          select: {
            name: true,
            status: true,
          },
        },
        lesson: {
          orderBy: { lesson_order: "asc" },
          include: {
            lesson_progress: lessonProgressInclude,
          },
        },
      },
    });

    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }

    const lessons = section.lesson.map((lesson) => ({
      lesson_id: lesson.lesson_id,
      lesson_name: lesson.name,
      lesson_order: lesson.lesson_order,
      xp: lesson.xp,
      completed: userId
        ? Boolean(lesson.lesson_progress?.[0]?.completed)
        : false,
    }));

    const totalLessons = lessons.length;
    const completedLessons = lessons.filter(
      (lesson) => lesson.completed,
    ).length;
    const totalXp = lessons.reduce(
      (sum, lesson) => sum + Number(lesson.xp || 0),
      0,
    );
    const earnedXp = lessons
      .filter((lesson) => lesson.completed)
      .reduce((sum, lesson) => sum + Number(lesson.xp || 0), 0);

    const response = {
      section_id: section.section_id,
      course_id: section.course_id,
      name: section.name,
      description: section.description,
      section_order: section.section_order,
      course_name: section.course?.name,
      course_status: section.course?.status,
      lessons,
      stats: {
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
        total_xp: totalXp,
        earned_xp: earnedXp,
        completion_percentage:
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 1000) / 10
            : 0,
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
  if (!req.user.admin) {
    console.error(`Access denied for user: ${req.user.userId}`);
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  const { section_id } = req.params;
  const { name, description } = req.body;
  const normalizedSectionId = toInt(section_id);

  try {
    if (!normalizedSectionId) {
      return res.status(400).json({ error: "Invalid section_id." });
    }

    if (!name) {
      return res.status(400).json({ error: "Section name is required." });
    }

    const section = await prisma.section.findUnique({
      where: { section_id: normalizedSectionId },
      select: { course_id: true },
    });

    if (!section) {
      return res.status(404).json({ error: "Section not found." });
    }

    const updated = await prisma.section.update({
      where: { section_id: normalizedSectionId },
      data: {
        name,
        description: description || null,
      },
    });

    await logActivity("Section", `Section updated: ${name}`, req.user.userId);

    clearSectionCache(section.course_id);

    res.status(200).json(updated);
  } catch (err) {
    console.error("Error updating section:", err);
    res.status(500).json({ error: "Failed to update section." });
  }
};

// Delete a section and its associated lessons
const deleteSection = async (req, res) => {
  if (!req.user.admin) {
    console.error(`Access denied for user: ${req.user.userId}`);
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  const { section_id } = req.params;
  const normalizedSectionId = toInt(section_id);

  try {
    if (!normalizedSectionId) {
      return res.status(400).json({ error: "Invalid section_id." });
    }

    const section = await prisma.section.findUnique({
      where: { section_id: normalizedSectionId },
      include: {
        lesson: {
          select: { lesson_id: true },
        },
      },
    });

    if (!section) {
      return res.status(404).json({ error: "Section not found." });
    }

    const sectionName = section.name;
    const courseId = section.course_id;
    const lessonIds = section.lesson.map((row) => row.lesson_id);

    await prisma.$transaction(async (tx) => {
      if (lessonIds.length > 0) {
        await tx.lesson_progress.deleteMany({
          where: { lesson_id: { in: lessonIds } },
        });
      }

      await tx.lesson.deleteMany({
        where: { section_id: normalizedSectionId },
      });

      await tx.section.delete({
        where: { section_id: normalizedSectionId },
      });
    });

    await logActivity(
      "Section",
      `Section deleted: ${sectionName}`,
      req.user.userId,
    );

    clearSectionCache(courseId);

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
  if (!req.user.admin) {
    console.error(`Access denied for user: ${req.user.userId}`);
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  const { sections } = req.body;

  try {
    if (!sections || !Array.isArray(sections)) {
      return res.status(400).json({
        error: "Invalid input format. Expected an array of sections.",
      });
    }

    await prisma.$transaction(async (tx) => {
      await Promise.all(
        sections.map(({ section_id, order }) =>
          tx.section.update({
            where: { section_id: Number(section_id) },
            data: { section_order: Number(order) },
          }),
        ),
      );
    });

    if (sections.length > 0) {
      const firstSection = await prisma.section.findUnique({
        where: { section_id: Number(sections[0].section_id) },
        select: { course_id: true },
      });
      if (firstSection) {
        clearSectionCache(firstSection.course_id);
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
  clearSectionCache,
  clearAllSectionCache,
};
