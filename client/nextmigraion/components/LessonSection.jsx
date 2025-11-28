import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CircularProgressbarWithChildren } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import '@/styles/LessonSection.css';
import '@/styles/CourseSections.css';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { CircularProgressbar } from 'react-circular-progressbar';
import { FaLock } from 'react-icons/fa'; // Import lock icon

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
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
  const [error, setError] = useState('');
  const { user } = useAuth();
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchLessons = async () => {
      setLoading(true);
      setError('');
      try {
        // Get lessons with progress
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
              completed: Boolean(lesson.completed), // Ensure completed is boolean
            }))
            .sort((a, b) => (a.lesson_order || 0) - (b.lesson_order || 0));

          // Debug information
          // console.log(`Section ${sectionId} - First few lessons:`, sortedLessons.slice(0, 2));
          // console.log(`Section ${sectionId} - section_order:`, sortedLessons[0]?.section_order);

          setLessons(sortedLessons);
        }
      } catch (err) {
        console.error('Error fetching lessons:', err);
        setError('Failed to fetch lessons.');
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
  // Check if a lesson is accessible based on previous lessons completion
  const isLessonAccessible = (index) => {
    // FIXED VERSION: Make all first lessons in any section accessible
    // This matches server-side behavior where the first lesson in a section is always allowed
    if (index === 0) {
      return true; // All first lessons in any section should be accessible
    }

    // For other lessons, check if previous lesson is completed
    const prevLesson = lessons[index - 1];
    return prevLesson && prevLesson.completed;
  };

  // Show error message for locked lessons
  const showNotification = (message) => {
    setErrorMessage(message);
    setShowErrorMessage(true);

    // Hide the message after 3 seconds
    setTimeout(() => {
      setShowErrorMessage(false);
    }, 3000);
  };

  // Handle lesson click with access check
  const handleLessonClick = (e, lesson, index) => {
    // Check for subscription limit
    if (!hasActiveSubscription && (profileData?.exercisesCompleted || 0) >= FREE_LESSON_LIMIT) {
      return; // Let the class "disabled" handle the styling
    }

    // Check if lesson is accessible
    if (!isLessonAccessible(index)) {
      e.preventDefault(); // Prevent navigation
      showNotification('Complete previous lessons first to unlock this lesson.');
    }
  };
  // Calculate section completion stats
  const completedLessons = lessons.filter((lesson) => lesson.completed).length;
  const totalLessons = lessons.length;
  const isSectionCompleted = totalLessons > 0 && completedLessons === totalLessons;

  const renderProgressSegments = () => {
    const completedCount = lessons.filter((lesson) => lesson.completed).length;
    const totalCount = lessons.length;
    const percentage = Math.round((completedCount / totalCount) * 100) || 0;

    return (
      <div style={{ width: '100%', height: '100%' }}>
        <CircularProgressbar
          value={percentage}
          text={`${completedCount}/${totalCount}`}
          styles={{
            root: {
              filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.5))',
              backgroundColor: '#1a1a1a',
              borderRadius: '50%',
            },
            path: {
              stroke: '#00fff2',
              strokeLinecap: 'round',
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
              filter: 'drop-shadow(0px 0px 8px rgba(0, 255, 255, 0.6))',
            },
            trail: {
              stroke: 'rgba(255, 255, 255, 0.05)',
              strokeLinecap: 'round',
            },
            text: {
              fill: '#fff',
              fontSize: '26px',
              fontWeight: '600',
              filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.8))',
              fontFamily: "'Inter', -apple-system, sans-serif",
              dominantBaseline: 'middle',
              textAnchor: 'middle',
              animation: 'textPulse 2s infinite',
            },
            background: {
              fill: '#0a0a0a',
            },
          }}
          strokeWidth={12}
          background={true}
        />
        <style>
          {`
                        @keyframes textPulse {
                            0% { opacity: 0.8; }
                            50% { opacity: 1; }
                            100% { opacity: 0.8; }
                        }
                    `}
        </style>
      </div>
    );
  };

  if (loading) {
    return <p>Loading lessons...</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  return (
    <div
      className={`lesson-section ${isSectionCompleted ? 'section-completed' : ''} ${
        isOpen ? 'content-open' : ''
      }`}
    >
      <div className="section-header" onClick={toggleSection}>
        <div className="section-header-content">
          <h2>{sectionName}</h2>
          {isOpen && lessons[0]?.description && (
            <p className="section-description">{lessons[0].description}</p>
          )}
          {!isSectionCompleted && (
            <div
              className={`lesson-section-progress ${isOpen ? 'right-aligned' : 'center-aligned'}`}
            >
              {renderProgressSegments()}
            </div>
          )}
        </div>
        <button
          className={`toggle-button ${isOpen ? 'open' : ''}`}
          aria-label={isOpen ? 'Collapse section' : 'Expand section'}
        >
          ▼
        </button>
      </div>
      <div className={`lesson-section-collapsible ${isOpen ? 'open' : ''}`}>
        <div className="lesson-list">
          {lessons
            .filter((lesson) => lesson && lesson.lesson_id)
            .map((lesson, index) => {
              const isAccessible = isLessonAccessible(index);
              return (
                <Link
                  href={`/lesson/${lesson.lesson_id}`}
                  key={lesson.lesson_id}
                  className={`lesson-item 
                    ${lesson.completed ? 'completed' : ''} 
                    ${!isAccessible ? 'locked' : ''} 
                    ${
                      !hasActiveSubscription &&
                      (profileData?.exercisesCompleted || 0) >= FREE_LESSON_LIMIT
                        ? 'disabled'
                        : ''
                    }`}
                  onClick={(e) => handleLessonClick(e, lesson, index)}
                >
                  <span>
                    <span className="lesson-number">Lesson {index + 1}</span>
                    <span className="lesson-title">{lesson.name}</span>
                  </span>
                  <div className="lesson-item-right">
                    {!isAccessible && <FaLock className="lesson-lock-icon" />}
                    <div className="checkbox-wrapper-31">
                      <input type="checkbox" checked={lesson.completed} readOnly />
                      <svg viewBox="0 0 35.6 35.6">
                        <circle className="background" cx="17.8" cy="17.8" r="17.8"></circle>
                        <circle className="stroke" cx="17.8" cy="17.8" r="14.37"></circle>
                        <polyline
                          className="check"
                          points="11.78 18.12 15.55 22.23 25.17 12.87"
                        ></polyline>
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
        </div>
        {/* Error Message */}
        {showErrorMessage && <div className="lesson-error-message">{errorMessage}</div>}
      </div>
    </div>
  );
};

const LessonSection = () => {
  return (
    <div style={{ position: 'relative', width: '200px', height: '200px' }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 36 36"
        style={{
          border: '1px solid red', // Debug border
          position: 'absolute',
        }}
      >
        <g transform="translate(18, 18)">{/* SVG content here */}</g>
      </svg>
    </div>
  );
};

export default LessonList;
export { LessonSection };
