const db = require('../config/database');

// Fetch all students
const getAllStudents = async (req, res) => {
  try {
    // Role-based access control
    if (!req.user.admin) {
      console.error(`Access denied for user: ${req.user.userId}`);
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const query = `
      SELECT 
        u.user_id, 
        u.name, 
        u.email, 
        u.created_at, -- Ensure this column exists in the database
        CASE 
          WHEN us.subscription_id IS NOT NULL THEN 'Active'
          ELSE 'Inactive'
        END AS subscription
      FROM users u
      LEFT JOIN user_subscription us ON u.user_id = us.user_id;
    `;

    const { rows } = await db.query(query);
    res.status(200).json({ students: rows, count: rows.length });
  } catch (err) {
    console.error('Error fetching students:', err.message || err);
    res.status(500).json({ error: 'An error occurred while fetching students data.' });
  }
};

// Fetch details of a specific student
const getStudentById = async (req, res) => {
  const { studentId } = req.params;

  if (!studentId || isNaN(studentId)) {
    return res.status(400).json({ error: 'Invalid student ID.' });
  }

  try {
    // Fetch student details
    const studentQuery = `
      SELECT
        u.user_id,
        u.name,
        u.email,
        u.bio,
        u.streak,
        CASE
          WHEN us.subscription_id IS NOT NULL THEN 'Active'
          ELSE 'Inactive'
          END AS subscription
      FROM users u
             LEFT JOIN user_subscription us ON u.user_id = us.user_id
      WHERE u.user_id = $1
    `;
    const { rows: studentRows } = await db.query(studentQuery, [studentId]);

    if (studentRows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Fetch courses the student is enrolled in
    const coursesQuery = `
      SELECT
        c.course_id AS course_id,
        c.name AS course_name,
        e.progress,
        c.description as course_description
      FROM enrollment e
      JOIN course c ON e.course_id = c.course_id
      WHERE e.user_id = $1
    `;
    const { rows: coursesRows } = await db.query(coursesQuery, [studentId]);



    // Combine student details and courses
    const studentData = studentRows[0];
    studentData.courses = coursesRows;

    res.status(200).json(studentData);
  } catch (err) {
    console.error('Error fetching student details:', err.message || err);
    res.status(500).json({ error: 'Failed to fetch student details.' });
  }
};

// Fetch courses for a specific student
const getCoursesByStudentId = async (req, res) => {
  const { studentId } = req.params;

  if (!studentId || isNaN(studentId)) {
    return res.status(400).json({ error: 'Invalid student ID.' });
  }

  try {
    const query = `
      SELECT 
        c.name AS course_name, 
        e.progress 
      FROM enrollment e
      JOIN course c ON e.course_id = c.course_id
      WHERE e.user_id = $1
    `;

    const { rows } = await db.query(query, [studentId]);

    res.status(200).json(rows.length > 0 ? rows : []); // Return empty array if no courses found
  } catch (err) {
    console.error('Error fetching courses for student:', err.message || err);
    res.status(500).json({ error: 'Failed to fetch courses for the student.' });
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  getCoursesByStudentId,
};
