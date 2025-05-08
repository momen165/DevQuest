import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheck, FaBars, FaLock } from 'react-icons/fa';
import '../styles/LessonNavigation.css'; // Assuming this file exists and contains necessary styles
import axios from 'axios';
import { useAuth } from '../AuthContext'; // Assuming this context provides user and token
import SuccessNotification from './SuccessNotification'; // Import the SuccessNotification component

const LessonNavigation = ({
  currentLessonId,
  lessons, // All lessons for the current course
  isAnswerCorrect,
  onNext, // Callback function for when the next lesson is navigated to
  code, // Submitted code for the lesson
  currentSectionId,
  sections, // All sections for the current course
  lessonXp, // XP gained for completing the lesson
}) => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Get user from AuthContext
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false); // Tracks if the current lesson is marked as completed by the user
  const [showSuccessMessage, setShowSuccessMessage] = useState(false); // Controls visibility of SuccessNotification
  const [showErrorMessage, setShowErrorMessage] = useState(false); // Controls visibility of error messages
  const [errorMessageText, setErrorMessageText] = useState(''); // Text for error messages
  const [menuSections, setMenuSections] = useState([]); // Sections and their lessons for the navigation menu
  const [courseName, setCourseName] = useState('');
  const [courseId, setCourseId] = useState(null);
  const [openSectionId, setOpenSectionId] = useState(currentSectionId); // Tracks which section is expanded in the menu
  const [loadingMenu, setLoadingMenu] = useState(false); // Loading state for menu data

  // Effect to fetch initial lesson progress (whether it's already completed)
  useEffect(() => {
    const fetchLessonProgress = async () => {
      if (!user || !currentLessonId) {
        // console.warn('User not logged in or currentLessonId missing for fetching progress.');
        return;
      }

      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/lesson-progress?user_id=${user.user_id}&lesson_id=${currentLessonId}`,
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );

        if (response.data.completed) {
          setIsCompleted(true);
        } else {
          setIsCompleted(false); // Explicitly set to false if not completed
        }
      } catch (err) {
        console.error('Error fetching lesson progress:', err);
        // Optionally, handle this error in the UI, e.g., show a generic error message
      }
    };

    fetchLessonProgress();
  }, [currentLessonId, user]);

  // Effect to fetch data for the navigation menu (course name, sections, lessons)
  useEffect(() => {
    const fetchMenuData = async () => {
      if (!currentSectionId || !user?.token) {
        // console.warn('currentSectionId or user token missing for fetching menu data.');
        return;
      }

      setLoadingMenu(true);
      try {
        // 1. Get the course ID from the current section
        const sectionResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/sections/${currentSectionId}`,
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );

        if (sectionResponse.status === 200 && sectionResponse.data) {
          const fetchedCourseId = sectionResponse.data.course_id;
          setCourseId(fetchedCourseId);

          // 2. Get course details for the name
          const courseResponse = await axios.get(
            `${import.meta.env.VITE_API_URL}/courses/${fetchedCourseId}`,
            {
              headers: {
                Authorization: `Bearer ${user.token}`,
              },
            }
          );

          if (courseResponse.status === 200) {
            setCourseName(courseResponse.data.title);
          }

          // 3. Get all sections for this course with their lessons
          // It's assumed the backend for `/sections/course/${courseId}` returns sections
          // with a nested `lessons` array, and each lesson has a `completed` status.
          const sectionsResponse = await axios.get(
            `${import.meta.env.VITE_API_URL}/sections/course/${fetchedCourseId}?user_id=${user.user_id}`, // Pass user_id to get completion status
            {
              headers: {
                Authorization: `Bearer ${user.token}`,
              },
            }
          );

          if (sectionsResponse.status === 200) {
            // Ensure lessons within sections are sorted by lesson_order
            const sortedMenuSections = (sectionsResponse.data || [])
              .map((section) => ({
                ...section,
                lessons: (section.lessons || []).sort((a, b) => a.lesson_order - b.lesson_order),
              }))
              .sort((a, b) => a.section_order - b.section_order);
            setMenuSections(sortedMenuSections);
          }
        }
      } catch (error) {
        console.error('Error fetching menu data:', error);
        showNotification('error', 'Could not load course navigation.');
      } finally {
        setLoadingMenu(false);
      }
    };

    fetchMenuData();
  }, [currentSectionId, user]); // Rerun if currentSectionId or user changes

  // Effect to check if the current lesson is accessible
  useEffect(() => {
    if (!menuSections.length || loadingMenu) return;

    // Find the current section and lesson in menuSections
    const sectionIndex = menuSections.findIndex(section =>
      section.lessons.some(lesson => lesson.lesson_id === currentLessonId)
    );

    if (sectionIndex === -1) return; // Section not found

    const section = menuSections[sectionIndex];
    const lessonIndex = section.lessons.findIndex(lesson => lesson.lesson_id === currentLessonId);

    if (lessonIndex === -1) return; // Lesson not found

    // Check if this lesson is accessible
    const accessible = isLessonAccessible(sectionIndex, lessonIndex);

    // If not accessible and not the first lesson of first section, redirect
    if (!accessible && !(sectionIndex === 0 && lessonIndex === 0)) {
      // Find the last completed lesson or the first lesson
      let redirectSectionIndex = 0;
      let redirectLessonIndex = 0;

      // Try to find the last completed lesson
      for (let i = 0; i < menuSections.length; i++) {
        const sectionLessons = menuSections[i].lessons;
        for (let j = 0; j < sectionLessons.length; j++) {
          if (sectionLessons[j].completed) {
            redirectSectionIndex = i;
            redirectLessonIndex = j;
          }
        }
      }

      // Get the next lesson after the last completed one
      const redirectSection = menuSections[redirectSectionIndex];
      let redirectLessonId;

      if (redirectLessonIndex + 1 < redirectSection.lessons.length) {
        // Next lesson in the same section
        redirectLessonId = redirectSection.lessons[redirectLessonIndex + 1].lesson_id;
      } else if (redirectSectionIndex + 1 < menuSections.length) {
        // First lesson in the next section
        redirectLessonId = menuSections[redirectSectionIndex + 1].lessons[0].lesson_id;
      } else {
        // Fallback to the first lesson of the first section
        redirectLessonId = menuSections[0].lessons[0].lesson_id;
      }

      showNotification('error', 'You need to complete previous lessons first.');
      navigate(`/lesson/${redirectLessonId}`);
    }
  }, [menuSections, currentLessonId, loadingMenu]);

  // Memoized organization of lessons by section, used for "Prev" and "Next" button logic
  const organizedSections = React.useMemo(() => {
    if (!sections || !lessons) return [];
    return sections
      .map((section) => ({
        ...section,
        lessons: lessons
          .filter((lesson) => lesson.section_id === section.section_id)
          .sort((a, b) => a.lesson_order - b.lesson_order), // Ensure lessons are sorted
      }))
      .sort((a, b) => a.section_order - b.section_order); // Ensure sections are sorted
  }, [sections, lessons]);

  // Calculate current section and lesson indices for navigation logic
  const currentSectionIndex = React.useMemo(
    () => organizedSections.findIndex((section) => section.section_id === currentSectionId),
    [organizedSections, currentSectionId]
  );

  const currentSectionForNav = React.useMemo(
    () => organizedSections[currentSectionIndex],
    [organizedSections, currentSectionIndex]
  );

  const currentSectionLessonsForNav = React.useMemo(
    () => currentSectionForNav?.lessons || [],
    [currentSectionForNav]
  );

  const lessonIndexInSection = React.useMemo(
    () => currentSectionLessonsForNav.findIndex((lesson) => lesson.lesson_id === currentLessonId),
    [currentSectionLessonsForNav, currentLessonId]
  );

  // Function to show notifications (error or general messages)
  const showNotification = (type, text) => {
    if (type === 'success') {
      setShowSuccessMessage(true);
      setShowErrorMessage(false);
    } else {
      setErrorMessageText(text);
      setShowErrorMessage(true);
      setShowSuccessMessage(false);
    }

    // Clear any existing timers
    if (window._messageTimer) {
      clearTimeout(window._messageTimer);
    }

    // Set a new timer to hide the message
    window._messageTimer = setTimeout(() => {
      setShowSuccessMessage(false);
      setShowErrorMessage(false);
    }, 4000); // 4-second notification display
  };

  // Function to handle lesson completion
  const completeLesson = async () => {
    if (!user) {
      showNotification('error', 'You must be logged in to complete a lesson.');
      return;
    }

    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/update-lesson-progress`,
        {
          user_id: user.user_id,
          lesson_id: currentLessonId,
          completed: true,
          submitted_code: code, // Send the code if available
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (response.status === 200) {
        setIsCompleted(true);
        showNotification('success', ''); // Empty text, SuccessNotification has its own message

        // Optimistically update completion status in menuSections
        setMenuSections((prevMenuSections) =>
          prevMenuSections.map((section) => ({
            ...section,
            lessons: section.lessons.map((lesson) =>
              lesson.lesson_id === currentLessonId ? { ...lesson, completed: true } : lesson
            ),
          }))
        );
      } else {
        // Handle non-200 success responses if your API uses them
        showNotification(
          'error',
          response.data?.message || 'Unable to update lesson progress. Please try again.'
        );
      }
    } catch (err) {
      console.error('Error completing lesson:', err);
      const errorMsg =
        err.response?.data?.message || err.message || 'An unexpected error occurred.';
      showNotification('error', `Error: ${errorMsg}`);
    }
  };

  // Navigation to the previous lesson
  const goToPreviousLesson = () => {
    if (lessonIndexInSection > 0) {
      // Go to previous lesson in current section
      navigate(`/lesson/${currentSectionLessonsForNav[lessonIndexInSection - 1].lesson_id}`);
    } else if (currentSectionIndex > 0) {
      // Go to last lesson of previous section
      const previousSection = organizedSections[currentSectionIndex - 1];
      const previousSectionLessons = previousSection.lessons || [];

      if (previousSectionLessons.length === 0) {
        console.error('No lessons found in previous section');
        showNotification('error', 'Previous section has no lessons.');
        return;
      }
      const lastLessonInPreviousSection = previousSectionLessons[previousSectionLessons.length - 1];
      navigate(`/lesson/${lastLessonInPreviousSection.lesson_id}`);
    }
  };

  // Navigation to the next lesson
  const goToNextLesson = () => {
    if (!isCompleted) {
      showNotification('error', 'Please complete the current lesson before moving to the next.');
      return;
    }
    if (lessonIndexInSection < currentSectionLessonsForNav.length - 1) {
      // Go to next lesson in current section
      const nextLesson = currentSectionLessonsForNav[lessonIndexInSection + 1];
      onNext(); // Call the onNext prop
      navigate(`/lesson/${nextLesson.lesson_id}`);
    } else if (currentSectionIndex < organizedSections.length - 1) {
      // Go to first lesson of next section
      const nextSection = organizedSections[currentSectionIndex + 1];
      const nextSectionLessons = nextSection.lessons || [];

      if (nextSectionLessons.length === 0) {
        showNotification('error', 'Next section has no lessons.');
        return;
      }
      const firstLessonInNextSection = nextSectionLessons[0];
      onNext(); // Call the onNext prop
      navigate(`/lesson/${firstLessonInNextSection.lesson_id}`);
    } else {
      // This is the last lesson of the last section
      showNotification(
        'success',
        'Congratulations! You have completed all lessons in this course!'
      );
      // Optionally, navigate to a course completion page or dashboard
      // navigate(`/course/${courseId}/completed`);
    }
  };

  // Toggle which section is open in the navigation menu
  const toggleSection = (sectionId) => {
    setOpenSectionId((prevId) => (sectionId === prevId ? null : sectionId));
  };

  // Function to check if a lesson is accessible
  const isLessonAccessible = (sectionIndex, lessonIndex) => {
    // First lesson of any section is always accessible
    if (lessonIndex === 0) return true;

    const section = menuSections[sectionIndex];

    // For other lessons in a section, check if the previous lesson in the same section is completed
    return section.lessons[lessonIndex - 1].completed;
  };

  // Effect to remove the general notification animation style if it was added by this component previously.
  // SuccessNotification now handles its own styles.
  useEffect(() => {
    const styleElement = document.getElementById('notification-animation-style');
    if (styleElement) {
      styleElement.remove();
    }
  }, []);

  return (
    <>
      {/* Side Navigation Menu */}
      <div className={`lesson-nav-menu ${isMenuOpen ? 'open' : ''}`}>
        {loadingMenu && <div className="loading-menu-indicator">Loading course...</div>}
        {!loadingMenu && courseName && (
          <div
            className="lesson-nav-course-header"
            onClick={() => courseId && navigate(`/course/${courseId}`)}
          >
            <h2>{courseName}</h2>
          </div>
        )}

        {!loadingMenu &&
          menuSections.map((section, sectionIndex) => (
            <div key={section.section_id} className="lesson-nav-section">
              <div
                className="lesson-nav-section-title"
                onClick={() => toggleSection(section.section_id)}
              >
                <span>{section.name}</span>
                <span className={`arrow ${openSectionId === section.section_id ? 'open' : ''}`}>
                  ▼
                </span>
              </div>
              <div
                className={`lesson-nav-section-content ${openSectionId === section.section_id ? 'open' : ''}`}
              >
                {section.lessons?.map((lesson, lessonIndex) => {
                  const accessible = isLessonAccessible(sectionIndex, lessonIndex);
                  return (
                    <div
                      key={lesson.lesson_id}
                      className={`lesson-nav-item 
                        ${lesson.lesson_id === currentLessonId ? 'active' : ''} 
                        ${lesson.completed ? 'completed' : ''} 
                        ${!accessible ? 'locked' : ''}`}
                      onClick={() => {
                        if (accessible) {
                          navigate(`/lesson/${lesson.lesson_id}`);
                          setIsMenuOpen(false); // Close menu on navigation
                        } else {
                          showNotification('error', 'Complete previous lessons first to unlock this lesson.');
                        }
                      }}
                    >
                      {lesson.name}
                      {lesson.completed && <FaCheck className="completion-icon" />}
                      {!accessible && <FaLock className="lock-icon" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        {!loadingMenu && menuSections.length === 0 && !courseName && (
          <div className="empty-menu-indicator">No lessons to display.</div>
        )}
      </div>

      {/* Success Notification */}
      {showSuccessMessage && lessonXp > 0 && <SuccessNotification xp={lessonXp} />}

      {/* Error Message */}
      {showErrorMessage && (
        <div
          className="floating-message error" // Ensure 'error' class is styled in LessonNavigation.css
          style={{
            position: 'fixed',
            top: '120px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(231, 76, 60, 0.95)', // Error color
            color: 'white',
            padding: '20px 30px',
            borderRadius: '12px',
            zIndex: '9999',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
            textAlign: 'center',
            minWidth: '320px',
            // animation: 'fadeIn 0.5s ease-out', // Assuming fadeIn is defined globally or in LessonNavigation.css
          }}
        >
          <div>{errorMessageText}</div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <div className="lesson-navigation">
        <button
          className={`lesson-menu-toggle ${isMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
        >
          <FaBars />
        </button>
        <div className="nav-buttons-wrapper">
          <button
            className="nav-button prev-button"
            onClick={goToPreviousLesson}
            disabled={currentSectionIndex === 0 && lessonIndexInSection === 0}
          >
            Prev
          </button>
          <button
            className="nav-button complete-button"
            onClick={completeLesson}
            disabled={isCompleted || !isAnswerCorrect} // Disable if already completed or no code submitted
          >
            {isCompleted ? 'Completed' : 'Complete'}
          </button>
          {/* Show Next button if not the very last lesson */}
          {!(
            lessonIndexInSection >= currentSectionLessonsForNav.length - 1 &&
            currentSectionIndex >= organizedSections.length - 1
          ) && (
              <button
                className="nav-button next-button"
                onClick={goToNextLesson}
                disabled={!isCompleted} // Enable only if current lesson is completed
              >
                Next
              </button>
            )}
        </div>
      </div>
    </>
  );
};

export default LessonNavigation;
