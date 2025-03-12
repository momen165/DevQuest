import React, { useState, useEffect } from "react";
import Sidebar from "pages/admin/components/Sidebar";
import { FaEdit, FaTrash } from "react-icons/fa";
import "pages/admin/styles/AdminCourses.css";
import EditCourseForm from "pages/admin/components/AddEditCourseComponent";
import SectionEditComponent from "pages/admin/components/SectionEditComponent";
import CourseFeedbackModal from "pages/admin/components/CourseFeedbackModal";
import axios from "axios";
import { useAuth } from "AuthContext";
import CircularProgress from "@mui/material/CircularProgress";

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  timeout: 10000,
});

const AdminCourses = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingSections, setEditingSections] = useState(false);
  const [sections, setSections] = useState([]);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const { user } = useAuth(); // Get user from AuthContext
  const token = user?.token; // Extract token from user context

  const handleError = (err, message = "An error occurred") => {
    console.error(message, err.response?.data || err.message);
    setError(message);
  };

  const fetchCourses = async () => {
    if (token) {
      setLoading(true);
      try {
        const response = await axios.get("/api/courses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCourses(response.data);
      } catch (err) {
        handleError(err, "Failed to fetch courses.");
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
      const response = await api.get(`/sections`, {
        params: {
          course_id: course.course_id,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSections(response.data);
    } catch (err) {
      handleError(err, "Failed to fetch sections.");
    }
  };

  const handleFileUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file); // Key must match the backend upload API

      const response = await axios.post("/api/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data.fileUrl; // Return the uploaded file's URL
    } catch (err) {
      handleError(err, "Failed to upload file.");
      throw err;
    }
  };

  const deleteSection = async (sectionId) => {
    try {
      await axios.delete(`/api/sections/${sectionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSections((prev) =>
        prev.filter((section) => section.section_id !== sectionId),
      );
    } catch (err) {
      handleError(err, "Failed to delete section.");
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

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`/api/courses/${courseId}`, { headers });
      setCourses((prev) =>
        prev.filter((course) => course.course_id !== courseId),
      );
    } catch (err) {
      handleError(err, "Failed to delete course.");
    }
  };

  return (
    <div className="course-page">
      <Sidebar />
      <div className="course-content">
        <div className="header">
          <h2 className="PageTitle">
            {editingSections
              ? "Edit Sections"
              : editingCourse
                ? isAddingCourse
                  ? "Add Course"
                  : "Edit Course"
                : "All Courses"}
          </h2>
          {!editingCourse && !editingSections && (
            <button
              className="add-course-button"
              onClick={handleAddCourseClick}
            >
              Add Course
            </button>
          )}
        </div>

        {error && <p className="error-message">{error}</p>}

        {loading ? (
          <div className="centered-loader">
            <CircularProgress />
          </div>
        ) : editingSections ? (
          <SectionEditComponent
            sections={sections}
            courseId={editingCourse?.course_id}
            onSectionUpdate={(updatedSections) => {
              const payload = updatedSections.map((section, index) => ({
                section_id: section.section_id,
                order: index,
              }));
              api
                .post(
                  "/sections/reorder",
                  { sections: payload },
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  },
                )
                .then(() =>
                  api.get(`/sections`, {
                    params: {
                      course_id: editingCourse?.course_id,
                    },
                    headers: { Authorization: `Bearer ${token}` },
                  }),
                )
                .then((response) => setSections(response.data))
                .catch((err) =>
                  handleError(err, "Failed to reorder sections."),
                );
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
            onFileUpload={handleFileUpload} // Pass the file upload function
          />
        ) : (
          <table className="course-table">
            <thead>
              <tr>
                <th>Course Name</th>
                <th>Number of Students Enrolled</th>
                <th>Rating</th>
                <th>Sections</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.course_id}>
                  <td>
                    <span
                      className="course-name-link"
                      onClick={() => setSelectedCourse(course)}
                    >
                      {course.title}
                    </span>
                  </td>
                  <td>{course.userscount || "0"}</td>
                  <td>
                    <div className="course-rating">
                      <span className="star-rating">
                        {"★".repeat(Math.floor(course.rating || 0))}
                      </span>
                      <span className="star-empty">
                        {"☆".repeat(5 - Math.floor(course.rating || 0))}
                      </span>
                      <span className="rating-value">
                        ({Number(course.rating || 0).toFixed(1)})
                      </span>
                    </div>
                  </td>
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

        {selectedCourse && (
          <CourseFeedbackModal
            course={selectedCourse}
            onClose={() => setSelectedCourse(null)}
          />
        )}
      </div>
    </div>
  );
};

export default AdminCourses;
