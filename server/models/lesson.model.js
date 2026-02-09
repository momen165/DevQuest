const prisma = require("../config/prisma");

const toInt = (value) => Number.parseInt(value, 10);
const toResult = (rows) => ({
  rows,
  rowCount: rows.length,
});

// Unlock hint for a user/lesson (create row if needed)
const unlockHint = async (user_id, lesson_id) => {
  const userId = toInt(user_id);
  const lessonId = toInt(lesson_id);

  const lesson = await prisma.lesson.findUnique({
    where: { lesson_id: lessonId },
    select: {
      lesson_id: true,
      section: {
        select: {
          course_id: true,
        },
      },
    },
  });

  const courseId = lesson?.section?.course_id;
  if (!courseId) {
    throw new Error("Course not found for lesson");
  }

  const record = await prisma.lesson_progress.upsert({
    where: {
      user_id_lesson_id: {
        user_id: userId,
        lesson_id: lessonId,
      },
    },
    update: {
      hint_unlocked: true,
    },
    create: {
      user_id: userId,
      lesson_id: lessonId,
      course_id: courseId,
      hint_unlocked: true,
      completed: false,
    },
  });

  return toResult([record]);
};

// Unlock solution for a user/lesson (create row if needed)
const unlockSolution = async (user_id, lesson_id) => {
  const userId = toInt(user_id);
  const lessonId = toInt(lesson_id);

  const lesson = await prisma.lesson.findUnique({
    where: { lesson_id: lessonId },
    select: {
      lesson_id: true,
      section: {
        select: {
          course_id: true,
        },
      },
    },
  });

  const courseId = lesson?.section?.course_id;
  if (!courseId) {
    throw new Error("Course not found for lesson");
  }

  const record = await prisma.lesson_progress.upsert({
    where: {
      user_id_lesson_id: {
        user_id: userId,
        lesson_id: lessonId,
      },
    },
    update: {
      solution_unlocked: true,
    },
    create: {
      user_id: userId,
      lesson_id: lessonId,
      course_id: courseId,
      solution_unlocked: true,
      completed: false,
    },
  });

  return toResult([record]);
};

const lessonQueries = {
  unlockHint,
  unlockSolution,

  // Get next order value for a section
  getNextOrder: async (section_id) => {
    const sectionId = toInt(section_id);
    const lesson = await prisma.lesson.findFirst({
      where: { section_id: sectionId },
      orderBy: { lesson_order: "desc" },
      select: { lesson_order: true },
    });

    return lesson ? lesson.lesson_order + 1 : 0;
  },

  // Insert a new lesson
  insertLesson: async (
    section_id,
    name,
    content,
    xp,
    test_cases,
    lesson_order,
    template_code,
    hint,
    solution,
  ) => {
    const processedTestCases = (test_cases || []).map((test) => ({
      input: test.input || "",
      expected_output: test.expected_output || "",
      auto_detect: test.auto_detect || false,
      use_pattern: test.use_pattern || false,
      pattern: test.pattern || "",
    }));

    const created = await prisma.lesson.create({
      data: {
        section_id: toInt(section_id),
        name,
        content,
        xp: xp || 0,
        test_cases: processedTestCases,
        lesson_order: toInt(lesson_order),
        template_code: template_code || "",
        hint: hint || "",
        solution: solution || "",
        auto_detect: processedTestCases[0]?.auto_detect || false,
      },
    });

    return toResult([created]);
  },

  // Get lessons by section with user progress
  getLessonsBySection: async (userId, sectionId) => {
    const section = toInt(sectionId);
    const user = toInt(userId);

    const lessons = await prisma.lesson.findMany({
      where: { section_id: section },
      orderBy: { lesson_order: "asc" },
      select: {
        lesson_id: true,
        name: true,
        lesson_order: true,
        xp: true,
        lesson_progress: {
          where: { user_id: user },
          select: { completed: true },
          take: 1,
        },
      },
    });

    return toResult(
      lessons.map((lesson) => ({
        lesson_id: lesson.lesson_id,
        name: lesson.name,
        lesson_order: lesson.lesson_order,
        xp: lesson.xp,
        completed: lesson.lesson_progress[0]?.completed || false,
      })),
    );
  },

  getLessonById: async (lessonId) => {
    const lessonIdInt = toInt(lessonId);

    const lesson = await prisma.lesson.findUnique({
      where: { lesson_id: lessonIdInt },
      include: {
        section: {
          include: {
            course: {
              select: {
                course_id: true,
                name: true,
                status: true,
                language_id: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      return toResult([]);
    }

    return toResult([
      {
        ...lesson,
        section_name: lesson.section?.name,
        section_order: lesson.section?.section_order,
        course_id: lesson.section?.course?.course_id,
        course_name: lesson.section?.course?.name,
        course_status: lesson.section?.course?.status,
        language_id: lesson.section?.course?.language_id ?? null,
      },
    ]);
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
    solution,
  ) => {
    const lessonId = toInt(lesson_id);
    const sectionId = toInt(section_id);

    const processedTestCases = (test_cases || []).map((test) => ({
      input: test.input || "",
      expected_output: test.expected_output || "",
      auto_detect: test.auto_detect === true,
      use_pattern: test.use_pattern === true,
      pattern: test.pattern || "",
    }));

    const exists = await prisma.lesson.findUnique({
      where: { lesson_id: lessonId },
      select: { lesson_id: true },
    });

    if (!exists) {
      return toResult([]);
    }

    const updated = await prisma.lesson.update({
      where: { lesson_id: lessonId },
      data: {
        name,
        content,
        xp: xp || 0,
        test_cases: processedTestCases,
        section_id: sectionId,
        template_code: template_code || "",
        hint: hint || "",
        solution: solution || "",
      },
    });

    return toResult([updated]);
  },

  // Delete lesson progress
  deleteLessonProgress: async (lesson_id) => {
    const lessonId = toInt(lesson_id);
    const result = await prisma.lesson_progress.deleteMany({
      where: { lesson_id: lessonId },
    });

    return { rows: [], rowCount: result.count };
  },

  // Delete lesson
  deleteLesson: async (lesson_id) => {
    const lessonId = toInt(lesson_id);
    const existing = await prisma.lesson.findUnique({
      where: { lesson_id: lessonId },
      select: { lesson_id: true },
    });

    if (!existing) {
      return toResult([]);
    }

    const deleted = await prisma.lesson.delete({
      where: { lesson_id: lessonId },
      select: { lesson_id: true },
    });

    return toResult([deleted]);
  },

  // Update lesson order
  updateLessonOrder: async (lesson_id, order, client = prisma) => {
    const updated = await client.lesson.update({
      where: { lesson_id: toInt(lesson_id) },
      data: { lesson_order: toInt(order) },
    });

    return toResult([updated]);
  },

  // Get course ID for lesson
  getCourseIdForLesson: async (lesson_id) => {
    const lesson = await prisma.lesson.findUnique({
      where: { lesson_id: toInt(lesson_id) },
      select: {
        section: {
          select: {
            course_id: true,
          },
        },
      },
    });

    if (!lesson?.section?.course_id) {
      return toResult([]);
    }

    return toResult([{ course_id: lesson.section.course_id }]);
  },

  // Check lesson progress
  checkLessonProgress: async (user_id, lesson_id) => {
    const progress = await prisma.lesson_progress.findUnique({
      where: {
        user_id_lesson_id: {
          user_id: toInt(user_id),
          lesson_id: toInt(lesson_id),
        },
      },
    });

    return toResult(progress ? [progress] : []);
  },

  // Update lesson progress
  updateLessonProgress: async (
    user_id,
    lesson_id,
    completed,
    completed_at,
    submitted_code,
  ) => {
    const progress = await prisma.lesson_progress.update({
      where: {
        user_id_lesson_id: {
          user_id: toInt(user_id),
          lesson_id: toInt(lesson_id),
        },
      },
      data: {
        completed,
        completed_at,
        submitted_code,
      },
    });

    return toResult([progress]);
  },

  // Insert lesson progress
  insertLessonProgress: async (
    user_id,
    lesson_id,
    completed,
    completed_at,
    course_id,
    submitted_code,
  ) => {
    const progress = await prisma.lesson_progress.create({
      data: {
        user_id: toInt(user_id),
        lesson_id: toInt(lesson_id),
        completed,
        completed_at,
        course_id: toInt(course_id),
        submitted_code,
      },
    });

    return toResult([progress]);
  },

  // Get total lessons count for course
  getTotalLessonsCount: async (course_id) => {
    const total = await prisma.lesson.count({
      where: {
        section: {
          course_id: toInt(course_id),
        },
      },
    });

    return toResult([{ total_lessons: String(total) }]);
  },

  // Get completed lessons count
  getCompletedLessonsCount: async (user_id, course_id) => {
    const completed = await prisma.lesson_progress.count({
      where: {
        user_id: toInt(user_id),
        course_id: toInt(course_id),
        completed: true,
      },
    });

    return toResult([{ completed_lessons: String(completed) }]);
  },

  // Update enrollment progress
  updateEnrollmentProgress: async (progress, user_id, course_id) => {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        user_id: toInt(user_id),
        course_id: toInt(course_id),
      },
      select: { enrollment_id: true },
    });

    if (!enrollment) {
      return toResult([]);
    }

    const updated = await prisma.enrollment.update({
      where: { enrollment_id: enrollment.enrollment_id },
      data: { progress },
    });

    return toResult([updated]);
  },

  // Get lesson progress
  getLessonProgress: async (user_id, lesson_id) => {
    const progress = await prisma.lesson_progress.findUnique({
      where: {
        user_id_lesson_id: {
          user_id: toInt(user_id),
          lesson_id: toInt(lesson_id),
        },
      },
      select: {
        completed: true,
        completed_at: true,
        submitted_code: true,
        hint_unlocked: true,
        solution_unlocked: true,
      },
    });

    return toResult(progress ? [progress] : []);
  },

  // Get last accessed lesson
  getLastAccessedLesson: async (userId, courseId) => {
    const row = await prisma.lesson_progress.findFirst({
      where: {
        user_id: toInt(userId),
        lesson: {
          section: {
            course_id: toInt(courseId),
          },
        },
      },
      orderBy: { completed_at: "desc" },
      select: {
        completed_at: true,
        lesson: {
          select: {
            lesson_id: true,
            name: true,
            section: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!row?.lesson) {
      return toResult([]);
    }

    return toResult([
      {
        lesson_id: row.lesson.lesson_id,
        name: row.lesson.name,
        section_name: row.lesson.section?.name,
        completed_at: row.completed_at,
      },
    ]);
  },

  getLessons: async (section_id, course_id) => {
    if (section_id) {
      const sectionId = toInt(section_id);
      const lessons = await prisma.lesson.findMany({
        where: { section_id: sectionId },
        orderBy: { lesson_order: "asc" },
        include: {
          section: {
            include: {
              course: {
                select: {
                  course_id: true,
                  name: true,
                  status: true,
                  language_id: true,
                },
              },
            },
          },
        },
      });

      return toResult(
        lessons.map((lesson) => ({
          ...lesson,
          section_order: lesson.section?.section_order,
          section_name: lesson.section?.name,
          course_id: lesson.section?.course?.course_id,
          course_name: lesson.section?.course?.name,
          course_status: lesson.section?.course?.status,
          language_id: lesson.section?.course?.language_id ?? null,
        })),
      );
    }

    const courseId = toInt(course_id);
    const lessons = await prisma.lesson.findMany({
      where: {
        section: {
          course_id: courseId,
        },
      },
      orderBy: [{ section: { section_order: "asc" } }, { lesson_order: "asc" }],
      // Return metadata only for course-level listing — exclude heavy content fields
      select: {
        lesson_id: true,
        section_id: true,
        name: true,
        xp: true,
        lesson_order: true,
        auto_detect: true,
        section: {
          select: {
            section_order: true,
            name: true,
            course: {
              select: {
                course_id: true,
                name: true,
                status: true,
                language_id: true,
              },
            },
          },
        },
      },
    });

    return toResult(
      lessons.map((lesson) => ({
        ...lesson,
        section_order: lesson.section?.section_order,
        section_name: lesson.section?.name,
        course_id: lesson.section?.course?.course_id,
        course_name: lesson.section?.course?.name,
        course_status: lesson.section?.course?.status,
        language_id: lesson.section?.course?.language_id ?? null,
      })),
    );
  },

  // Get all sections
  getAllSections: async () => {
    const sections = await prisma.section.findMany({
      select: { section_id: true },
      orderBy: { section_id: "asc" },
    });

    return toResult(sections);
  },

  // Get lessons by section for ordering
  getLessonsBySectionForOrdering: async (section_id) => {
    const lessons = await prisma.lesson.findMany({
      where: { section_id: toInt(section_id) },
      select: { lesson_id: true },
      orderBy: { lesson_order: "asc" },
    });

    return toResult(lessons);
  },

  getCourseIdFromSection: async (section_id) => {
    const section = await prisma.section.findUnique({
      where: { section_id: toInt(section_id) },
      include: {
        course: {
          select: {
            course_id: true,
            name: true,
          },
        },
      },
    });

    if (!section) {
      return toResult([]);
    }

    return toResult([
      {
        course_id: section.course_id,
        section_id: section.section_id,
        section_name: section.name,
        course_name: section.course?.name,
      },
    ]);
  },

  recalculateProgressForCourse: async (course_id) => {
    const courseId = toInt(course_id);
    const totalLessons = await prisma.lesson.count({
      where: {
        section: {
          course_id: courseId,
        },
      },
    });

    if (totalLessons === 0) {
      await prisma.enrollment.updateMany({
        where: { course_id: courseId },
        data: { progress: 0 },
      });
      return { rows: [], rowCount: 0 };
    }

    // Batch: get completed counts per user in a single query instead of N+1
    const completedCounts = await prisma.lesson_progress.groupBy({
      by: ["user_id"],
      where: {
        course_id: courseId,
        completed: true,
      },
      _count: { lesson_id: true },
    });

    const completedByUser = new Map(
      completedCounts.map((row) => [row.user_id, row._count.lesson_id]),
    );

    const enrollments = await prisma.enrollment.findMany({
      where: { course_id: courseId },
      select: { enrollment_id: true, user_id: true },
    });

    // Batch update all enrollments in a single transaction
    if (enrollments.length > 0) {
      await prisma.$transaction(
        enrollments.map((enrollment) => {
          const completed = completedByUser.get(enrollment.user_id) || 0;
          const progress = (completed / totalLessons) * 100;
          return prisma.enrollment.update({
            where: { enrollment_id: enrollment.enrollment_id },
            data: { progress },
          });
        }),
      );
    }

    return { rows: [], rowCount: enrollments.length };
  },

  // Check if all lessons in a section are completed by a user
  checkSectionCompletion: async (user_id, section_id) => {
    const userId = toInt(user_id);
    const sectionId = toInt(section_id);

    const lessons = await prisma.lesson.findMany({
      where: { section_id: sectionId },
      select: { lesson_id: true },
    });

    const totalLessons = lessons.length;

    if (totalLessons === 0) {
      return {
        total: 0,
        completed: 0,
        allCompleted: false,
      };
    }

    const lessonIds = lessons.map((lesson) => lesson.lesson_id);
    const progressRows = await prisma.lesson_progress.findMany({
      where: {
        user_id: userId,
        lesson_id: { in: lessonIds },
        completed: true,
      },
      select: { lesson_id: true },
    });

    const completedLessons = new Set(progressRows.map((row) => row.lesson_id))
      .size;

    return {
      total: totalLessons,
      completed: completedLessons,
      allCompleted: totalLessons > 0 && completedLessons === totalLessons,
    };
  },
};

module.exports = lessonQueries;
