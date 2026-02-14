import React, { Suspense, useEffect, useMemo, useState } from "react";
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiLayers,
  FiAlertCircle,
  FiArrowLeft,
  FiStar,
  FiUsers,
  FiFolder,
} from "react-icons/fi";
import "./AdminDashboard.css";
import axios from "axios";
import { useAuth } from "app/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";
import useAdminCourses from "features/admin/hooks/useAdminCourses";

const CourseForm = React.lazy(() => import("features/admin/components/CourseForm"));
const SectionManager = React.lazy(() => import("features/admin/components/SectionManager"));
const CourseFeedbackModal = React.lazy(() => import("./CourseFeedbackModal"));

const AdminCourses = () => {
  const { user } = useAuth();
  const token = user?.token;
  const location = useLocation();
  const navigate = useNavigate();

  const { courses, loading, error, fetchCourses, deleteCourse, fetchSections, deleteSection } =
    useAdminCourses(token);

  const [editingCourse, setEditingCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [feedbackCourse, setFeedbackCourse] = useState(null);

  const adminCoursesBasePath = location.pathname.startsWith("/admincourses")
    ? "/admincourses"
    : "/AdminCourses";

  const [courseIdParam, sectionIdParam, lessonIdParam] = useMemo(() => {
    const match = location.pathname.match(/^\/admincourses\/?(.*)$/i);
    const routeSegments = match?.[1] ? match[1].split("/").filter(Boolean) : [];
    return [routeSegments[0], routeSegments[1], routeSegments[2]];
  }, [location.pathname]);

  const activeCourse = useMemo(
    () => courses.find((course) => String(course.course_id) === String(courseIdParam)),
    [courses, courseIdParam]
  );

  const isManagingSections = Boolean(courseIdParam);
  const hasInvalidCourseRoute = isManagingSections && !loading && !activeCourse;

  useEffect(() => {
    if (!isManagingSections) {
      setSections([]);
      return;
    }

    setIsAddingCourse(false);
    setEditingCourse(null);

    let isMounted = true;
    const loadSections = async () => {
      const sectionsData = await fetchSections(courseIdParam);
      if (!isMounted) return;
      setSections(Array.isArray(sectionsData) ? sectionsData : []);
    };
    void loadSections();

    return () => {
      isMounted = false;
    };
  }, [courseIdParam, isManagingSections]);

  const goToCoursesHome = () => {
    navigate(adminCoursesBasePath);
  };

  const goToCourseSections = (courseId) => {
    navigate(`${adminCoursesBasePath}/${courseId}`);
  };

  const goToSectionLessons = (courseId, sectionId) => {
    navigate(`${adminCoursesBasePath}/${courseId}/${sectionId}`);
  };

  const goToLessonEditor = (courseId, sectionId, lessonId) => {
    navigate(`${adminCoursesBasePath}/${courseId}/${sectionId}/${lessonId}`);
  };

  const handleEditSections = (course) => {
    goToCourseSections(course.course_id);
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
    const result = await deleteSection(sectionId);
    if (result?.success) {
      setSections((prev) => prev.filter((section) => section.section_id !== sectionId));
    }
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
    if (isManagingSections) {
      if (lessonIdParam) return "Edit Lesson";
      if (sectionIdParam) return "Manage Lessons";
      return "Manage Sections";
    }
    if (isAddingCourse) return "Create Course";
    if (editingCourse) return "Edit Course";
    return "Courses";
  };

  const lazyFallback = (
    <div className="admin-loading">
      <CircularProgress className="admin-loading-spinner" />
    </div>
  );

  return (
    <div className="admin-page">
      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-left">
            <h1 className="admin-title">{getPageTitle()}</h1>
          </div>

          {!editingCourse && !isManagingSections && !isAddingCourse && (
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
        ) : hasInvalidCourseRoute ? (
          <div className="admin-card">
            <div className="admin-empty">
              <FiAlertCircle className="admin-empty-icon" />
              <h3 className="admin-empty-title">Course not found</h3>
              <p className="admin-empty-text">
                The course in this URL no longer exists or you do not have access to it.
              </p>
              <button className="btn btn-secondary" onClick={goToCoursesHome}>
                <FiArrowLeft size={18} />
                Back to Courses
              </button>
            </div>
          </div>
        ) : isManagingSections ? (
          <Suspense fallback={lazyFallback}>
            <SectionManager
              sections={sections}
              courseId={activeCourse?.course_id || courseIdParam}
              languageId={activeCourse?.language_id}
              courseName={activeCourse?.title}
              selectedSectionId={sectionIdParam}
              selectedLessonId={lessonIdParam}
              onOpenSection={(section) => goToSectionLessons(courseIdParam, section.section_id)}
              onOpenLesson={(sectionId, lessonId) =>
                goToLessonEditor(courseIdParam, sectionId, lessonId)
              }
              onCloseLesson={() => goToSectionLessons(courseIdParam, sectionIdParam)}
              onSectionUpdate={(updatedSections) => {
                setSections(updatedSections);
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
                    const sectionsData = await fetchSections(courseIdParam);
                    if (Array.isArray(sectionsData)) {
                      setSections(sectionsData);
                    }
                  })
                  .catch((err) => console.error("Failed to reorder sections:", err));
              }}
              onDeleteSection={handleDeleteSection}
              onCloseSection={() => goToCourseSections(courseIdParam)}
              onClose={goToCoursesHome}
            />
          </Suspense>
        ) : editingCourse || isAddingCourse ? (
          <Suspense fallback={lazyFallback}>
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
          </Suspense>
        ) : (
          <div className="admin-card">
            {courses.length === 0 ? (
              <div className="admin-empty">
                <FiFolder className="admin-empty-icon" />
                <h3 className="admin-empty-title">No courses yet</h3>
                <p className="admin-empty-text">Create your first course to get started</p>
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
                            onClick={() => setFeedbackCourse(course)}
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
                            <div className="rating-stars">{renderStars(course.rating)}</div>
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

        {feedbackCourse && (
          <Suspense fallback={null}>
            <CourseFeedbackModal course={feedbackCourse} onClose={() => setFeedbackCourse(null)} />
          </Suspense>
        )}
      </main>
    </div>
  );
};

export default AdminCourses;
