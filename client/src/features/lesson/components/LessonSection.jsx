import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./LessonSection.css";
import axios from "axios";
import { useAuth } from "app/AuthContext";
import { FaLock, FaCheck } from "react-icons/fa";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 10000,
});

const FREE_LESSON_LIMIT = 5;

const LessonList = ({
  sectionName,
  sectionId,
  lessons: initialLessons,
  profileData,
  hasActiveSubscription,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchLessons = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/lessons/section/${sectionId}/progress`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (response.data) {
          const lessons = Array.isArray(response.data) ? response.data : [];
          const sortedLessons = lessons
            .map((lesson) => ({
              ...lesson,
              completed: Boolean(lesson.completed),
            }))
            .sort((a, b) => (a.lesson_order || 0) - (b.lesson_order || 0));

          setLessons(sortedLessons);
        }
      } catch (err) {
        console.error("Error fetching lessons:", err);
        setError("Failed to fetch lessons.");
      } finally {
        setLoading(false);
      }
    };

    if (sectionId && user?.token) {
      if (initialLessons && initialLessons.length > 0) {
        setLessons(initialLessons);
      } else {
        fetchLessons();
      }
    }
  }, [sectionId, user, initialLessons]);

  const toggleSection = () => {
    setIsOpen(!isOpen);
  };

  const isLessonAccessible = (index) => {
    if (index === 0) return true;
    const prevLesson = lessons[index - 1];
    return prevLesson && prevLesson.completed;
  };

  const showNotification = (message) => {
    setErrorMessage(message);
    setShowErrorMessage(true);
    setTimeout(() => {
      setShowErrorMessage(false);
    }, 3000);
  };

  const handleLessonClick = (e, lesson, index) => {
    if (!hasActiveSubscription && (profileData?.exercisesCompleted || 0) >= FREE_LESSON_LIMIT) {
      return;
    }
    if (!isLessonAccessible(index)) {
      e.preventDefault();
      showNotification("Complete previous lessons first to unlock this lesson.");
    }
  };

  const completedLessons = lessons.filter((lesson) => lesson.completed).length;
  const totalLessons = lessons.length;
  const isSectionCompleted = totalLessons > 0 && completedLessons === totalLessons;

  if (loading) {
    return (
      <div className="ls-section">
        <div className="ls-section-loading">Loading lessons...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ls-section">
        <p className="ls-error">{error}</p>
      </div>
    );
  }

  return (
    <div className={`ls-section ${isSectionCompleted ? "ls-completed" : ""}`}>
      <button className="ls-section-header" onClick={toggleSection} type="button">
        <div className="ls-section-header-left">
          <h2 className="ls-section-title">{sectionName}</h2>
          <span className="ls-section-count">
            {completedLessons}/{totalLessons} lessons
            {isSectionCompleted && (
              <span className="ls-completed-badge">
                <FaCheck size={9} />
                Done
              </span>
            )}
          </span>
        </div>

        <div className="ls-section-header-right">
          {!isSectionCompleted && totalLessons > 0 && (
            <div className="ls-mini-progress">
              <div
                className="ls-mini-progress-fill"
                style={{ width: `${(completedLessons / totalLessons) * 100}%` }}
              />
            </div>
          )}
          <svg
            className={`ls-chevron ${isOpen ? "ls-chevron-open" : ""}`}
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
          >
            <path
              d="M4.5 6.75L9 11.25L13.5 6.75"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      <div className={`ls-collapsible ${isOpen ? "ls-collapsible-open" : ""}`}>
        <div className="ls-lessons">
          {lessons
            .filter((lesson) => lesson && lesson.lesson_id)
            .map((lesson, index) => {
              const isAccessible = isLessonAccessible(index);
              const isDisabled =
                !hasActiveSubscription &&
                (profileData?.exercisesCompleted || 0) >= FREE_LESSON_LIMIT;

              return (
                <Link
                  to={`/lesson/${lesson.lesson_id}`}
                  key={lesson.lesson_id}
                  className={`ls-lesson 
                    ${lesson.completed ? "ls-lesson-done" : ""} 
                    ${!isAccessible ? "ls-lesson-locked" : ""} 
                    ${isDisabled ? "ls-lesson-disabled" : ""}`}
                  onClick={(e) => handleLessonClick(e, lesson, index)}
                >
                  <div className="ls-lesson-left">
                    <span className="ls-lesson-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="ls-lesson-name">{lesson.name}</span>
                  </div>

                  <div className="ls-lesson-right">
                    {!isAccessible && <FaLock className="ls-lock-icon" size={12} />}
                    {lesson.completed && (
                      <div className="ls-check-icon">
                        <FaCheck size={10} />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
        </div>

        {showErrorMessage && (
          <div className="ls-notification">
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonList;
