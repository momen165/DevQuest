import React, { useState, useEffect } from 'react';
import Sidebar from 'pages/admin/components/Sidebar';
import { FaEdit, FaTrash } from 'react-icons/fa';
import 'pages/admin/styles/AdminCourses.css';
import EditCourseForm from 'pages/admin/components/AddEditCourseComponent';
import SectionEditComponent from 'pages/admin/components/SectionEditComponent';
import axios from 'axios';

const AdminCourses = () => {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingSections, setEditingSections] = useState(false);
  const [isAddingCourse, setIsAddingCourse] = useState(false); // State to track add mode

  const userData = JSON.parse(localStorage.getItem('user'));
  const token = userData ? userData.token : null;

  useEffect(() => {
    const fetchCourses = async () => {
      if (token) {
        setLoading(true);
        try {
          const response = await axios.get('http://localhost:5000/api/courses', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        
          setCourses(response.data);
        } catch (err) {
          console.error('Error fetching courses:', err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchCourses();
  }, [token]);

  const handleEditSections = (course) => {
    setEditingCourse(course);
    setEditingSections(true);
  };

  const handleCloseSections = () => {
    setEditingSections(false);
    setEditingCourse(null);
  };

  const handleSectionUpdate = (sectionIndex) => {
    // Update the section logic here
  };

  const handleDeleteSection = (sectionIndex) => {
    // Delete the section logic here
  };

  const handleEditClick = (course) => {
    setIsAddingCourse(false); // Ensure we're in edit mode
    setEditingCourse(course);
  };

  const handleAddCourseClick = () => {
    setIsAddingCourse(true); // Set to add mode
    setEditingCourse(null); // Ensure no course is being edited
  };

  const closeEditForm = () => {
    setEditingCourse(null);
    setIsAddingCourse(false); // Reset add mode when closing
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) {
      return; // User canceled deletion
    }

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };
      await axios.delete(`http://localhost:5000/api/courses/${courseId}`, { headers });
      setCourses((prevCourses) => prevCourses.filter((course) => course.course_id !== courseId));
      
    } catch (err) {
      console.error('Error deleting course:', err.response?.data || err.message);
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

        {editingSections ? (
          <SectionEditComponent
            sections={editingCourse.sections}
            onSectionUpdate={handleSectionUpdate}
            onDeleteSection={handleDeleteSection}
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
              {courses.map((course, index) => (
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminCourses;
