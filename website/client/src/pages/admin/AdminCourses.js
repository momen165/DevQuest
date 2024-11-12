import React, { useState } from 'react';
import Sidebar from 'pages/admin/components/Sidebar';
import { FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import 'pages/admin/styles/AdminCourses.css';
import EditCourseForm from 'pages/admin/components/AddEditCourseComponent';
import SectionEditComponent from 'pages/admin/components/SectionEditComponent';

const AdminCourses = () => {
  const courses = [
    {
      name: 'Basic Python',
      enrolled: 200,
      sections: [
        { name: 'Variables', lessons: [] },
        { name: 'Functions', lessons: [] }
      ]
    },
    {
      name: 'Advanced JavaScript',
      enrolled: 105,
      sections: [
        { name: 'ES6', lessons: [] }
      ]
    }
  ];

  const [editingCourse, setEditingCourse] = useState(null);
  const [editingSections, setEditingSections] = useState(false);

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
    setEditingCourse(course);
  };

  const closeEditForm = () => {
    setEditingCourse(null);
  };

  return (
    <div className="course-page">
      <Sidebar />

      <div className="course-content">
        <div className="header">
          <h2 className="PageTitle">All Courses</h2>
          <button className="add-course-button" onClick={() => handleEditClick(courses)}>Add Course</button>
        </div>

        {editingSections ? (
          <SectionEditComponent
            sections={editingCourse.sections}
            onSectionUpdate={handleSectionUpdate}
            onDeleteSection={handleDeleteSection}
            onClose={handleCloseSections}
          />
        ) : editingCourse ? (
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
                  <td>{course.name}</td>
                  <td>{course.enrolled}</td>
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
                    <FaTrash className="icon delete-icon" title="Delete Course" />
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
