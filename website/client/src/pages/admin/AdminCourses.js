import React, { useState, useEffect } from 'react';
import Sidebar from 'pages/admin/components/Sidebar';
import { FaEdit, FaTrash } from 'react-icons/fa';
import 'pages/admin/styles/AdminCourses.css';
import EditCourseForm from 'pages/admin/components/AddEditCourseComponent';
import SectionEditComponent from 'pages/admin/components/SectionEditComponent';
import axios from 'axios';

const AdminCourses = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // State for handling errors
  const [courses, setCourses] = useState([]);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingSections, setEditingSections] = useState(false);
  const [sections, setSections] = useState([]);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [editingLessons, setEditingLessons] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);

  const userData = JSON.parse(localStorage.getItem('user'));
  const token = userData?.token;

  // Centralized error handler
  const handleError = (err, message = 'An error occurred') => {
    console.error(message, err.response?.data || err.message);
    setError(message);
  };

  // Fetch all courses
  useEffect(() => {
    const fetchCourses = async () => {
      if (token) {
        setLoading(true);
        try {
          const response = await axios.get('http://localhost:5000/api/courses', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setCourses(response.data);
        } catch (err) {
          handleError(err, 'Failed to fetch courses.');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchCourses();
  }, [token]);

  // Fetch sections for a specific course
  const handleEditSections = async (course) => {
    setEditingCourse(course);
    setEditingSections(true);

    try {
      const response = await axios.get(
        `http://localhost:5000/api/section?course_id=${course.course_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSections(response.data);
    } catch (err) {
      handleError(err, 'Failed to fetch sections.');
    }
  };

  // Add a new section
  const addSection = async (newSection) => {
    try {
      const response = await axios.post('http://localhost:5000/api/section', newSection, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSections((prev) => [...prev, response.data]);
    } catch (err) {
      handleError(err, 'Failed to add section.');
    }
  };

  // Edit an existing section
  const editSection = async (updatedSection) => {
    try {
      const response = await axios.put(
        `http://localhost:5000/api/section/${updatedSection.section_id}`,
        updatedSection,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSections((prev) =>
        prev.map((section) =>
          section.section_id === updatedSection.section_id ? response.data : section
        )
      );
    } catch (err) {
      handleError(err, 'Failed to update section.');
    }
  };

  // Delete a section
  const deleteSection = async (sectionId) => {
    try {
      await axios.delete(`http://localhost:5000/api/section/${sectionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSections((prev) => prev.filter((section) => section.section_id !== sectionId));
    } catch (err) {
      handleError(err, 'Failed to delete section.');
    }
  };

  // Handle closing sections view
  const handleCloseSections = () => {
    setEditingSections(false);
    setEditingCourse(null);
    setSections([]);
  };

  // Add or edit a course
  const handleEditClick = (course) => {
    setIsAddingCourse(false);
    setEditingCourse(course);
  };

  const handleAddCourseClick = () => {
    setIsAddingCourse(true);
    setEditingCourse(null);
  };

  // Close course edit form
  const closeEditForm = () => {
    setEditingCourse(null);
    setIsAddingCourse(false);
  };

  // Delete a course
  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`http://localhost:5000/api/courses/${courseId}`, { headers });
      setCourses((prev) => prev.filter((course) => course.course_id !== courseId));
    } catch (err) {
      handleError(err, 'Failed to delete course.');
    }
  };

  return (
    <div className="course-page">
      <Sidebar />
      <div className="course-content">
        <div className="header">
          <h2 className="PageTitle">
            {editingSections
              ? 'Edit Sections'
              : editingCourse
              ? isAddingCourse
                ? 'Add Course'
                : 'Edit Course'
              : 'All Courses'}
          </h2>
          {!editingCourse && !editingSections && (
            <button className="add-course-button" onClick={handleAddCourseClick}>
              Add Course
            </button>
          )}
        </div>

        {error && <p className="error-message">{error}</p>}

        {loading ? (
          <p>Loading...</p>
        ) : editingSections ? (
          <SectionEditComponent
            sections={sections}
            courseId={editingCourse?.course_id}
            onSectionUpdate={(updatedSections) => {
              updatedSections.forEach((section) => {
                if (section.section_id) {
                  editSection(section);
                } else {
                  addSection(section);
                }
              });
            }}
            onDeleteSection={deleteSection}
            onClose={handleCloseSections}
          />
        ) : editingCourse || isAddingCourse ? (
          <EditCourseForm course={editingCourse} onClose={closeEditForm} />
        ) : (
          <table className="course-table">
            <thead>
              <tr>
                <th>Course Name</th>
                <th>Number of Students Enrolled</th>
                <th>Sections</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.length > 0 ? (
                courses.map((course, index) => (
                  <tr key={index}>
                    <td>{course.title}</td>
                    <td>{course.users || '0'}</td>
                    <td>
                      <FaEdit
                        className="icon edit-icon"
                        title="Edit Sections"
                        onClick={() => handleEditSections(course)}
                      />
                    </td>
                    <td>
                      <FaEdit
                        className="icon edit-icon"
                        title="Edit Course"
                        onClick={() => handleEditClick(course)}
                      />
                      <FaTrash
                        className="icon delete-icon"
                        title="Delete Course"
                        onClick={() => handleDeleteCourse(course.course_id)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">No courses available</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminCourses;
