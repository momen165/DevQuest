import React, { useState, useEffect } from 'react';
import Sidebar from 'pages/admin/components/Sidebar';
import { FaEdit, FaTrash } from 'react-icons/fa';
import 'pages/admin/styles/AdminCourses.css';
import EditCourseForm from 'pages/admin/components/AddEditCourseComponent';
import SectionEditComponent from 'pages/admin/components/SectionEditComponent';
import axios from 'axios';

const AdminCourses = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingSections, setEditingSections] = useState(false);
  const [sections, setSections] = useState([]);
  const [isAddingCourse, setIsAddingCourse] = useState(false);

  const userData = JSON.parse(localStorage.getItem('user'));
  const token = userData?.token;

  const handleError = (err, message = 'An error occurred') => {
    console.error(message, err.response?.data || err.message);
    setError(message);
  };

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

useEffect(() => {
  fetchCourses();
}, [token]);

  const handleEditSections = async (course) => {
    setEditingCourse(course);
    setEditingSections(true);

    try {
      const response = await axios.get(
        `http://localhost:5000/api/section?course_id=${course.course_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSections(response.data);
    } catch (err) {
      handleError(err, 'Failed to fetch sections.');
    }
  };

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

  const handleCloseSections = () => {
    setEditingSections(false);
    setEditingCourse(null);
    setSections([]);
  };

  const handleAddCourseClick = () => {
    setIsAddingCourse(true);
    setEditingCourse(null);
  };

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
              const payload = updatedSections.map((section, index) => ({
                section_id: section.section_id,
                order: index,
              }));
              axios
                .post('http://localhost:5000/api/sections/reorder', { sections: payload }, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                .then(() => axios.get(`http://localhost:5000/api/section?course_id=${editingCourse?.course_id}`, {
                  headers: { Authorization: `Bearer ${token}` },
                }))
                .then((response) => setSections(response.data))
                .catch((err) => handleError(err, 'Failed to reorder sections.'));
            }}
            onDeleteSection={deleteSection}
            onClose={handleCloseSections}
          />
        ) : editingCourse || isAddingCourse ? (
          <EditCourseForm 
  course={editingCourse} 
  onClose={() => {
    setEditingCourse(null);
    setIsAddingCourse(false);
  }}
  onSave={() => {
    fetchCourses();
    setEditingCourse(null);
    setIsAddingCourse(false);
  }}
/>
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
              {courses.map((course) => (
                <tr key={course.course_id}>
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
                      onClick={() => setEditingCourse(course)}
                    />
                    <FaTrash
                      className="icon delete-icon"
                      title="Delete Course"
                      onClick={() => handleDeleteCourse(course.course_id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminCourses;
