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
  const [sections, setSections] = useState([]);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [editingLessons, setEditingLessons] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);

  const userData = JSON.parse(localStorage.getItem('user'));
  const token = userData ? userData.token : null;

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
          console.error('Error fetching courses:', err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchCourses();
  }, [token]);

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
      console.error('Error fetching sections:', err);
    }
  };
  
  const addSection = async (newSection) => {
    try {
      console.log('Payload being sent to API:', newSection); // Debugging line
      const response = await axios.post('http://localhost:5000/api/section', newSection, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSections((prevSections) => [...prevSections, response.data]);
    } catch (err) {
      console.error('Error adding section:', err.response?.data || err.message);
    }
  };
  
  const handleEditLessons = (section) => {
    setSelectedSection(section); // Set the selected section for lesson editing
    setEditingLessons(true); // Show the lesson editing view
  };

  const handleSaveLesson = async (lessonData) => {
    try {
      const response = await axios.post('http://localhost:5000/api/lessons', {
        ...lessonData,
        section_id: selectedSection.section_id,
      });
      console.log('Lesson saved successfully:', response.data);
      setEditingLessons(false); // Close the lesson editor
    } catch (err) {
      console.error('Error saving lesson:', err.response?.data || err.message);
    }
  };

  const handleCloseLessons = () => {
    setEditingLessons(false); // Close lesson editing
    setSelectedSection(null);
  };


  const editSection = async (updatedSection) => {
    try {
      const response = await axios.put(
        `http://localhost:5000/api/section/${updatedSection.section_id}`,
        updatedSection,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSections((prevSections) =>
        prevSections.map((section) =>
          section.section_id === updatedSection.section_id ? response.data : section
        )
      );
    } catch (err) {
      console.error('Error updating section:', err);
    }
  };
  
  const deleteSection = async (sectionId) => {
    try {
      await axios.delete(`http://localhost:5000/api/section/${sectionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSections((prevSections) =>
        prevSections.filter((section) => section.section_id !== sectionId)
      );
    } catch (err) {
      console.error('Error deleting section:', err);
    }
  };
  

  const handleCloseSections = () => {
    setEditingSections(false);
    setEditingCourse(null);
    setSections([]);
  };

  const handleEditClick = (course) => {
    setIsAddingCourse(false);
    setEditingCourse(course);
  };

  const handleAddCourseClick = () => {
    setIsAddingCourse(true);
    setEditingCourse(null);
  };

  const closeEditForm = () => {
    setEditingCourse(null);
    setIsAddingCourse(false);
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) {
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
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
            sections={sections}
            courseId={editingCourse?.course_id} // Pass the course_id from editingCourse
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
