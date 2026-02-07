const prisma = require("../config/prisma");

const toResult = (rows) => ({
  rows,
  rowCount: rows.length,
});

const toNumber = (value) => (value === null || value === undefined ? 0 : Number(value));

const courseQueries = {
  insertCourse: async (
    title,
    description,
    status,
    difficulty,
    language_id,
    imageUrl
  ) => {
    const created = await prisma.course.create({
      data: {
        name: title,
        description,
        status,
        difficulty,
        language_id: language_id ? Number(language_id) : null,
        image: imageUrl,
      },
    });
    return toResult([created]);
  },

  updateCourse: async (
    course_id,
    title,
    description,
    status,
    difficulty,
    language_id,
    imageUrl
  ) => {
    const id = Number(course_id);
    const existing = await prisma.course.findUnique({
      where: { course_id: id },
      select: { course_id: true },
    });

    if (!existing) {
      return toResult([]);
    }

    const updated = await prisma.course.update({
      where: { course_id: id },
      data: {
        name: title,
        description,
        status,
        difficulty,
        language_id: language_id ? Number(language_id) : null,
        ...(imageUrl ? { image: imageUrl } : {}),
      },
    });

    return toResult([updated]);
  },

  deleteCourseData: async (course_id) => {
    const id = Number(course_id);
    await prisma.course.delete({
      where: { course_id: id },
    });
  },

  getAllCourses: async () => {
    const courses = await prisma.course.findMany({
      include: {
        _count: { select: { enrollment: true } },
      },
      orderBy: { course_id: "asc" },
    });

    return toResult(
      courses.map((course) => ({
        language_id: course.language_id,
        course_id: course.course_id,
        title: course.name,
        description: course.description,
        image: course.image,
        difficulty: course.difficulty,
        rating: course.rating,
        userscount: String(course._count.enrollment),
      }))
    );
  },

  getCourseById: async (course_id) => {
    const id = Number(course_id);
    const course = await prisma.course.findUnique({
      where: { course_id: id },
      include: {
        _count: { select: { enrollment: true } },
      },
    });

    if (!course) {
      return toResult([]);
    }

    return toResult([
      {
        course_id: course.course_id,
        title: course.name,
        description: course.description,
        difficulty: course.difficulty,
        language_id: course.language_id,
        status: course.status,
        image: course.image,
        rating: course.rating,
        users: String(course._count.enrollment),
      },
    ]);
  },

  getUserCourseStats: async (user_id, course_id) => {
    const userId = Number(user_id);
    const courseId = Number(course_id);

    const [user, completedProgress] = await Promise.all([
      prisma.users.findUnique({
        where: { user_id: userId },
        select: {
          name: true,
          profileimage: true,
          streak: true,
        },
      }),
      prisma.lesson_progress.findMany({
        where: {
          user_id: userId,
          completed: true,
          lesson: {
            section: {
              course_id: courseId,
            },
          },
        },
        select: {
          lesson_id: true,
          lesson: {
            select: { xp: true },
          },
        },
      }),
    ]);

    const uniqueLessons = new Set(completedProgress.map((row) => row.lesson_id));
    const totalXp = completedProgress.reduce(
      (sum, row) => sum + toNumber(row.lesson?.xp),
      0
    );

    return toResult([
      {
        name: user?.name || "",
        profileimage: user?.profileimage || "",
        streak: user?.streak || 0,
        total_xp: String(totalXp),
        completed_exercises: String(uniqueLessons.size),
      },
    ]);
  },

  enrollUser: async (user_id, course_id) => {
    const enrollment = await prisma.enrollment.create({
      data: {
        user_id: Number(user_id),
        course_id: Number(course_id),
        enrollment_date: new Date(),
      },
    });

    return toResult([enrollment]);
  },

  checkEnrollment: async (user_id, course_id) => {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        user_id: Number(user_id),
        course_id: Number(course_id),
      },
    });

    return toResult(enrollment ? [enrollment] : []);
  },

  getUserOverallStats: async (user_id) => {
    const userId = Number(user_id);
    const [user, enrollments, progressRows] = await Promise.all([
      prisma.users.findUnique({
        where: { user_id: userId },
        select: {
          name: true,
          profileimage: true,
          streak: true,
        },
      }),
      prisma.enrollment.findMany({
        where: { user_id: userId },
        select: { course_id: true },
      }),
      prisma.lesson_progress.findMany({
        where: {
          user_id: userId,
          completed: true,
        },
        select: {
          lesson_id: true,
          lesson: {
            select: {
              xp: true,
            },
          },
        },
      }),
    ]);

    const completedCourses = new Set(enrollments.map((row) => row.course_id)).size;
    const uniqueLessons = new Set(progressRows.map((row) => row.lesson_id));
    const totalXp = progressRows.reduce(
      (sum, row) => sum + toNumber(row.lesson?.xp),
      0
    );

    return toResult([
      {
        name: user?.name || "",
        profileimage: user?.profileimage || "",
        streak: user?.streak || 0,
        completed_courses: String(completedCourses),
        total_exercises_completed: String(uniqueLessons.size),
        total_xp: String(totalXp),
        level: String(Math.floor(totalXp / 100)),
      },
    ]);
  },
};

module.exports = courseQueries;
