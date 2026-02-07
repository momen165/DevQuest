const validateCourseFields = (fields) => {
  const { title, description, status, difficulty, language_id } = fields;
  if (!title || !description || !status || !difficulty || !language_id) {
    throw new Error("Missing required fields");
  }
};

const validateAdmin = (user) => {
  if (!user || !user.admin) {
    throw new Error("Access denied. Admins only.");
  }
};

const validateCourseId = (course_id) => {
  if (!course_id || isNaN(course_id)) {
    throw new Error("Invalid course ID");
  }
};

const validateEnrollmentFields = (fields) => {
  const { course_id } = fields;
  if (!course_id) {
    throw new Error("course_id is required");
  }
};

module.exports = {
  validateCourseFields,
  validateAdmin,
  validateCourseId,
  validateEnrollmentFields,
};
