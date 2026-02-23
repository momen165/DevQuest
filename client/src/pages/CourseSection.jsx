import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import LessonList from "features/lesson/components/LessonSection";
import RatingForm from "features/feedback/components/RatingForm";
import axios from "axios";
import "./CourseSections.css";
import { useAuth } from "app/AuthContext";
import { calculateLevel, calculateLevelProgress } from "features/profile/hooks/xpCalculator";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 10000,
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (endpoint, config, retries = 0) => {
  try {
    const response = await api.get(endpoint, config);
    return response;
  } catch (err) {
    if (retries < MAX_RETRIES) {
      await sleep(RETRY_DELAY);
      return fetchWithRetry(endpoint, config, retries + 1);
    }
    throw err;
  }
};

const CourseSection = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [stats, setStats] = useState({
    courseXP: 0,
    exercisesCompleted: 0,
    streak: 0,
    name: "",
    profileImage: "",
    totalXP: 0,
    level: 0,
    xpToNextLevel: 0,
  });
  const [courseName, setCourseName] = useState("");
  const [profileData, setProfileData] = useState(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const FREE_LESSON_LIMIT = 5;

  useEffect(() => {
    const fetchOptimizedCourseSectionData = async () => {
      setLoading(true);
      setError("");
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        };
        const response = await fetchWithRetry(`/optimized-course-section/${courseId}`, config);

        if (response.data) {
          const { course, subscription, profile, sections, stats } = response.data;

          setCourseName(course.title);
          setHasActiveSubscription(subscription.hasActiveSubscription);
          setProfileData({
            name: profile.name,
            profileimage: profile.profileimage,
            streak: profile.streak,
            exercisesCompleted: profile.exercisesCompleted,
          });

          const formattedSections = sections.map((section) => ({
            ...section,
            lessons: Array.isArray(section.lessons) ? section.lessons : [],
          }));
          setSections(formattedSections);

          setStats(stats);
        }
      } catch (err) {
        console.error("Error loading optimized course section data:", err);
        await fetchDataFallback();
      } finally {
        setLoading(false);
      }
    };

    const fetchDataFallback = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        };

        try {
          const courseResponse = await fetchWithRetry(`/courses/${courseId}`, config);
          if (courseResponse.data) {
            setCourseName(courseResponse.data.title);
          }
        } catch (err) {
          if (err.response?.status === 404 || err.response?.status === 403) {
            setError(
              err.response?.data?.error || "Course not available. Redirecting to home page..."
            );
            setTimeout(() => {
              navigate("/");
            }, 2000);
            return;
          }
          throw err;
        }

        const [subscriptionResponse, profileResponse] = await Promise.all([
          fetchWithRetry("/check", config),
          fetchWithRetry(`/students/${user.user_id}`, config),
        ]);
        setHasActiveSubscription(subscriptionResponse.data.hasActiveSubscription);
        setProfileData(profileResponse.data);

        const [sectionsResponse, courseStatsResponse, overallStatsResponse] = await Promise.all([
          fetchWithRetry(`/sections/course/${courseId}`, config),
          fetchWithRetry(`/student/courses/${courseId}/stats`, config),
          fetchWithRetry(`/student/stats/${user.user_id}`, config),
        ]);

        if (sectionsResponse.data) {
          const formattedSections = sectionsResponse.data.map((section) => ({
            ...section,
            lessons: Array.isArray(section.lessons) ? section.lessons : [],
          }));
          setSections(formattedSections);
        }

        if (courseStatsResponse.data && overallStatsResponse.data) {
          const totalXP = overallStatsResponse.data.totalXP || 0;
          const userLevel = calculateLevel(totalXP);

          setStats({
            courseXP: courseStatsResponse.data.courseXP || 0,
            exercisesCompleted: courseStatsResponse.data.exercisesCompleted || 0,
            streak: courseStatsResponse.data.streak || 0,
            name: user.name,
            profileImage: user.profileimage,
            totalXP: totalXP,
            level: userLevel,
            xpToNextLevel: Math.round(overallStatsResponse.data.xpToNextLevel || 0),
          });
        }
      } catch (err) {
        console.error("Fallback error details:", err.response?.data || err.message);
        setError("Failed to fetch course data. Please try again.");
      }
    };
    if (courseId && user?.user_id) {
      fetchOptimizedCourseSectionData();
    }
  }, [courseId, user, navigate]);

  useEffect(() => {
    if (location.state?.errorMessage) {
      setErrorMessage(location.state.errorMessage);
      setShowErrorMessage(true);

      const timer = setTimeout(() => {
        setShowErrorMessage(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [location]);

  const totalLessons = sections.reduce((sum, s) => sum + (s.lessons?.length || 0), 0);
  const completedLessons = sections.reduce(
    (sum, s) => sum + (s.lessons?.filter((l) => l.completed)?.length || 0),
    0
  );
  const overallProgress =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="cs-page">
      {/* Error toast */}
      {showErrorMessage && (
        <div className="cs-toast">
          <span>{errorMessage}</span>
          <button className="cs-toast-close" onClick={() => setShowErrorMessage(false)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1L13 13M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}

      <div className="cs-container">
        {/* Main content */}
        <main className="cs-main">
          {/* Breadcrumb */}
          <nav className="cs-breadcrumb">
            <Link to="/courses">Courses</Link>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 4L10 8L6 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{courseName}</span>
          </nav>

          {/* Page header */}
          <div className="cs-header">
            <div className="cs-header-text">
              <h1 className="cs-title">{courseName}</h1>
              {!loading && totalLessons > 0 && (
                <p className="cs-subtitle">
                  {completedLessons} of {totalLessons} lessons completed
                </p>
              )}
            </div>
            {!loading && totalLessons > 0 && (
              <div className="cs-header-progress">
                <div className="cs-header-progress-bar">
                  <div
                    className="cs-header-progress-fill"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <span className="cs-header-progress-label">{overallProgress}%</span>
              </div>
            )}
          </div>

          {/* Subscription notice */}
          {profileData && !hasActiveSubscription && (
            <div className="cs-subscription-notice">
              <div className="cs-subscription-notice-content">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M9 5V9.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="9" cy="12.5" r="0.75" fill="currentColor" />
                </svg>
                <p>
                  Free trial: {profileData.exercisesCompleted || 0}/{FREE_LESSON_LIMIT} lessons
                  completed
                </p>
              </div>
              {(profileData.exercisesCompleted || 0) >= FREE_LESSON_LIMIT && (
                <Link to="/pricing" className="cs-upgrade-link">
                  Upgrade to unlock all lessons
                </Link>
              )}
            </div>
          )}

          {/* Sections list */}
          <div className="cs-sections">
            {loading ? (
              <div className="cs-loading">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="cs-skeleton-section">
                    <div className="cs-skeleton-bar cs-skeleton-title" />
                    <div className="cs-skeleton-bar cs-skeleton-line" />
                    <div className="cs-skeleton-bar cs-skeleton-line short" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="cs-error-state">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M20 12V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="20" cy="28" r="1.5" fill="currentColor" />
                </svg>
                <p>{error}</p>
              </div>
            ) : sections.length === 0 ? (
              <div className="cs-empty-state">
                <p>No sections available for this course yet.</p>
              </div>
            ) : (
              sections.map((section) => (
                <LessonList
                  key={section.section_id}
                  sectionName={section.name}
                  sectionId={section.section_id}
                  lessons={section.lessons}
                  profileData={profileData}
                  hasActiveSubscription={hasActiveSubscription}
                />
              ))
            )}
          </div>
        </main>

        {/* Sidebar */}
        <aside className="cs-sidebar">
          <div className="cs-sidebar-card">
            <div className="cs-sidebar-header">
              <span className="cs-sidebar-label">My Progress</span>
            </div>

            <div className="cs-user-row">
              <div className="cs-avatar">
                {stats.profileImage ? (
                  <img src={user.profileimage} alt="Profile" />
                ) : (
                  <span>{stats.name ? stats.name[0].toUpperCase() : "?"}</span>
                )}
              </div>
              <div className="cs-user-meta">
                <p className="cs-user-name">{stats.name}</p>
                <p className="cs-user-level">Level {stats.level}</p>
              </div>
            </div>

            <div className="cs-xp-section">
              <div className="cs-xp-bar-track">
                <div
                  className="cs-xp-bar-fill"
                  style={{
                    width: `${
                      stats.totalXP && stats.totalXP > 0 ? calculateLevelProgress(stats.totalXP) : 0
                    }%`,
                  }}
                />
              </div>
              <span className="cs-xp-label">{stats.xpToNextLevel} XP to next level</span>
            </div>

            <div className="cs-stats-grid">
              <div className="cs-stat">
                <span className="cs-stat-value">{stats.courseXP}</span>
                <span className="cs-stat-label">Course XP</span>
              </div>
              <div className="cs-stat">
                <span className="cs-stat-value">{stats.exercisesCompleted}</span>
                <span className="cs-stat-label">Completed</span>
              </div>
              <div className="cs-stat">
                <span className="cs-stat-value">{stats.streak}</span>
                <span className="cs-stat-label">Day Streak</span>
              </div>
            </div>
          </div>

          <RatingForm courseId={courseId} />
        </aside>
      </div>
    </div>
  );
};

export default CourseSection;
