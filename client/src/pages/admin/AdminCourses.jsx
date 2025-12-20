import React, { useState } from "react";
import Sidebar from "pages/admin/components/Sidebar";
import { 
  FiEdit2, 
  FiTrash2, 
  FiPlus, 
  FiLayers, 
  FiAlertCircle,
  FiStar,
  FiUsers,
  FiFolder
} from "react-icons/fi";
import "pages/admin/styles/AdminDashboard.css";
import CourseForm from "pages/admin/components/CourseForm";
import SectionManager from "pages/admin/components/SectionManager";
import CourseFeedbackModal from "pages/admin/components/CourseFeedbackModal";
import axios from "axios";
import { useAuth } from "AuthContext";
import CircularProgress from "@mui/material/CircularProgress";
import useAdminCourses from "hooks/useAdminCourses";

const AdminCourses = () => {
  const { user } = useAuth();
  const token = user?.token;
  
  const { 
    courses, 
    loading, 
    error, 
    fetchCourses, 
    deleteCourse,
    fetchSections,
    deleteSection 
  } = useAdminCourses(token);

  const [editingCourse, setEditingCourse] = useState(null);
  const [editingSections, setEditingSections] = useState(false);
  const [sections, setSections] = useState([]);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const handleEditSections = async (course) => {
    setEditingCourse(course);
    setEditingSections(true);

    const sectionsData = await fetchSections(course.course_id);
    if (sectionsData) {
      setSections(sectionsData);
    }
  };

  const handleFileUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data.fileUrl;
    } catch (err) {
      console.error("Failed to upload file:", err);
      throw err;
    }
  };

  const handleDeleteSection = async (sectionId) => {
    const success = await deleteSection(sectionId);
    if (success) {
      setSections((prev) =>
        prev.filter((section) => section.section_id !== sectionId)
      );
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
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    await deleteCourse(courseId);
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating || 0);
    const stars = [];
    
    for (let i = 0; i < 5; i++) {
      stars.push(
        <FiStar
          key={i}
          className={i < fullStars ? "rating-star" : "rating-star-empty"}
          fill={i < fullStars ? "currentColor" : "none"}
        />
      );
    }
    return stars;
  };

  const getPageTitle = () => {
    if (editingSections) return "Manage Sections";
    if (isAddingCourse) return "Create Course";
    if (editingCourse) return "Edit Course";
    return "Courses";
  };

  return (
    <div className="admin-page">
      <Sidebar />
      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-left">
            <h1 className="admin-title">{getPageTitle()}</h1>
          </div>
          
          {!editingCourse && !editingSections && (
            <button className="btn btn-primary" onClick={handleAddCourseClick}>
              <FiPlus size={18} />
              Add Course
            </button>
          )}
        </header>

        {error && (
          <div className="admin-error">
            <FiAlertCircle className="admin-error-icon" size={20} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="admin-loading">
            <CircularProgress className="admin-loading-spinner" />
          </div>
        ) : editingSections ? (
          <SectionManager
            sections={sections}
            courseId={editingCourse?.course_id}
            courseName={editingCourse?.title}
            onSectionUpdate={(updatedSections) => {
              const payload = updatedSections.map((section, index) => ({
                section_id: section.section_id,
                order: index,
              }));
              axios
                .post(
                  `${import.meta.env.VITE_API_URL}/sections/reorder`,
                  { sections: payload },
                  { headers: { Authorization: `Bearer ${token}` } }
                )
                .then(async () => {
                  const sectionsData = await fetchSections(editingCourse?.course_id);
                  if (sectionsData) {
                    setSections(sectionsData);
                  }
                })
                .catch((err) => console.error("Failed to reorder sections:", err));
            }}
            onDeleteSection={handleDeleteSection}
            onClose={handleCloseSections}
          />
        ) : editingCourse || isAddingCourse ? (
          <CourseForm
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
            onFileUpload={handleFileUpload}
          />
        ) : (
          <div className="admin-card">
            {courses.length === 0 ? (
              <div className="admin-empty">
                <FiFolder className="admin-empty-icon" />
                <h3 className="admin-empty-title">No courses yet</h3>
                <p className="admin-empty-text">
                  Create your first course to get started
                </p>
                <button className="btn btn-primary" onClick={handleAddCourseClick}>
                  <FiPlus size={18} />
                  Create Course
                </button>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Students</th>
                      <th>Rating</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course) => (
                      <tr key={course.course_id}>
                        <td>
                          <span
                            className="table-cell-name"
                            onClick={() => setSelectedCourse(course)}
                          >
                            {course.title}
                          </span>
                        </td>
                        <td>
                          <span className="table-cell-count">
                            <FiUsers size={14} />
                            {course.userscount || 0}
                          </span>
                        </td>
                        <td>
                          <div className="rating-display">
                            <div className="rating-stars">
                              {renderStars(course.rating)}
                            </div>
                            <span className="rating-value">
                              {Number(course.rating || 0).toFixed(1)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="table-cell-actions">
                            <button
                              className="action-btn action-btn-sections"
                              onClick={() => handleEditSections(course)}
                              title="Manage Sections"
                            >
                              <FiLayers size={16} />
                            </button>
                            <button
                              className="action-btn action-btn-edit"
                              onClick={() => setEditingCourse(course)}
                              title="Edit Course"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              className="action-btn action-btn-delete"
                              onClick={() => handleDeleteCourse(course.course_id)}
                              title="Delete Course"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {selectedCourse && (
          <CourseFeedbackModal
            course={selectedCourse}
            onClose={() => setSelectedCourse(null)}
          />
        )}
      </main>
    </div>
  );
};

export default AdminCourses;
