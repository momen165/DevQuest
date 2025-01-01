const validateCourseFields = (fields) => {
  const { title, description, status, difficulty, language_id } = fields;
  if (!title || !description || !status || !difficulty || !language_id) {
    throw new Error('Missing required fields');
  }
};

const validateAdmin = (user) => {
  if (!user || !user.admin) {
    throw new Error('Access denied. Admins only.');
  }
};

const validateCourseId = (course_id) => {
  if (!course_id || isNaN(course_id)) {
    throw new Error('Invalid course ID');
  }
};

const validateEnrollmentFields = (fields) => {
  const { user_id, course_id } = fields;
  if (!user_id || !course_id) {
    throw new Error('user_id and course_id are required');
  }
};

module.exports = {
  validateCourseFields,
  validateAdmin,
  validateCourseId,
  validateEnrollmentFields,
}; 