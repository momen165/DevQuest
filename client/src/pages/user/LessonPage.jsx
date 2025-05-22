// LessonPage.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../AuthContext';
import Navbar from '../../components/Navbar';
import LessonNavigation from '../../components/LessonNavigation';
import LessonContent from '../../components/LessonContent';
import MonacoEditorComponent from '../../components/MonacoEditorComponent';
import '../../styles/LessonPage.css';
// import SplitPane from 'react-split-pane';
import LoadingSpinner from './CircularProgress';
import { useNavigate } from 'react-router-dom';
import { decode as decodeEntities } from 'entities';

import styled from '@emotion/styled';

const languageMappings = {
  62: 'java',
  27: 'javascript',
  100: 'python',
  104: 'c',
  105: 'cpp',
  95: 'go',
  78: 'kotlin',
  87: 'fsharp',
  73: 'rust',
  81: 'scala',
  72: 'ruby',
  98: 'php',
  82: 'sql',
  101: 'typescript',
  60: 'lua',
  80: 'r',
  59: 'fortran',
  88: 'groovy',
  77: 'cobol',
};

const CopyNotification = styled.div`
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  animation: fadeIn 0.3s ease-in-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

// Create axios instance with default config - move outside component
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  // Silence Axios errors in console
  validateStatus: (status) => true,
});

const LessonPage = () => {
  const { lessonId } = useParams();
  const { user } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [consoleOutput, setConsoleOutput] = useState('Output will appear here...');
  const [languageId, setLanguageId] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [totalLessons, setTotalLessons] = useState(0);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const navigate = useNavigate();
  const FREE_LESSON_LIMIT = 5;
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [sections, setSections] = useState([]);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [completedLessonsCount, setCompletedLessonsCount] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Improve split view with proper responsive handling
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [divider, setDivider] = useState(() => {
    if (window.innerWidth <= 1024) return 42;
    return 50;
  });

  // Listen for window resize to update layout
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [isDragging, setIsDragging] = useState(false);

  // Mouse/touch event handlers for resizing
  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragEnd = () => setIsDragging(false);
  const handleDrag = (e) => {
    if (!isDragging) return;

    // Get correct client coordinates for both mouse and touch events
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Get lesson page element for accurate calculations
    const lessonPage = document.querySelector('.lesson-page');
    if (!lessonPage) return;

    const rect = lessonPage.getBoundingClientRect();

    if (windowWidth > 1024) {
      // Calculate percentage for vertical split based on container width
      const relativeX = clientX - rect.left;
      const percent = (relativeX / rect.width) * 100;
      // Enforce stricter min/max bounds for better usability
      if (percent > 25 && percent < 75) {
        setDivider(percent);
      }
    } else {
      // Calculate percentage for horizontal split based on container height
      const relativeY = clientY - rect.top;
      const percent = (relativeY / rect.height) * 100;
      // Enforce min/max bounds
      if (percent > 20 && percent < 80) {
        setDivider(percent);
      }
    }
  };
  // Set up the drag event listeners with proper passive option for mobile
  useEffect(() => {
    if (!isDragging) return;

    // Add mouse events (these don't need passive: false)
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', handleDragEnd);

    // Add touch events with passive: false to allow preventDefault()
    window.addEventListener('touchmove', handleDrag, { passive: false });
    window.addEventListener('touchend', handleDragEnd, { passive: false });

    return () => {
      // Clean up all event listeners
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDrag, { passive: false });
      window.removeEventListener('touchend', handleDragEnd, { passive: false });
    };
  }, [isDragging]);

  const resetState = () => {
    setCode('');
    setConsoleOutput('Output will appear here...');
    setIsAnswerCorrect(false);
    setLesson(null);
    setLoading(true);
    setError('');
  };

  const showCopiedNotification = () => {
    setShowCopyNotification(true);
    setTimeout(() => setShowCopyNotification(false), 2000);
  };

  const handleCodeResult = (success) => {
    if (!success) {
      setFailedAttempts((prev) => prev + 1);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchLesson = async () => {
      if (!isMounted) return;
      setLoading(true);
      setError('');

      try {
        // Check subscription status and completed lessons count first
        const subscriptionResponse = await api.get('/check', {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (subscriptionResponse.status !== 200) {
          navigate('/pricing');
          return;
        }

        const { hasActiveSubscription: activeSubscription, completedLessons } =
          subscriptionResponse.data;
        setHasActiveSubscription(activeSubscription);
        setCompletedLessonsCount(completedLessons || 0);

        // If user has no active subscription and has completed the free lesson limit, redirect to pricing
        if (!activeSubscription && completedLessons >= FREE_LESSON_LIMIT) {
          navigate('/pricing', {
            state: {
              message:
                'You have reached the free lesson limit. Please subscribe to continue learning.',
            },
          });
          return;
        }

        // First get the lesson data
        const lessonResponse = await api.get(`/lesson/${lessonId}`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (lessonResponse.status === 403) {
          // Check if the error is due to subscription limit or lesson being locked
          if (lessonResponse.data?.status === 'subscription_required') {
            navigate('/pricing', {
              state: {
                message:
                  'You have reached the free lesson limit. Please subscribe to continue learning.',
              },
            });
            return;
          } else if (lessonResponse.data?.status === 'locked') {
            // This is a locked lesson - redirect to course page with error message
            const sectionResponse = await api.get(
              `/sections/${lessonResponse.data?.section_id || 0}`,
              {
                headers: {
                  Authorization: `Bearer ${user.token}`,
                },
              }
            );

            if (sectionResponse.status === 200 && sectionResponse.data?.course_id) {
              navigate(`/course/${sectionResponse.data.course_id}`, {
                state: {
                  errorMessage:
                    lessonResponse.data?.message || 'You need to complete previous lessons first.',
                },
              });
            } else {
              navigate('/');
            }
            return;
          }
        }

        if (lessonResponse.status !== 200) {
          navigate('/');
          return;
        }

        const lessonData = lessonResponse.data;
        setLesson(lessonData);
        setLanguageId(lessonData.language_id);

        // Get section data
        const sectionResponse = await api.get(`/sections/${lessonData.section_id}`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (sectionResponse.status !== 200 || !sectionResponse.data) {
          navigate('/');
          return;
        }

        // Get all sections for the course
        const sectionsResponse = await api.get(
          `/sections/course/${sectionResponse.data.course_id}`,
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );

        if (sectionsResponse.status === 200) {
          setSections(sectionsResponse.data || []);
        }

        // Get ALL lessons for the course
        const allLessonsResponse = await api.get('/lesson', {
          params: {
            course_id: sectionResponse.data.course_id,
          },
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (allLessonsResponse.status === 200) {
          setLessons(allLessonsResponse.data || []);
          setTotalLessons(allLessonsResponse.data.length);
        }

        const progressResponse = await api.get(`/lesson-progress`, {
          params: {
            user_id: user.user_id,
            lesson_id: lessonId,
          },
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (progressResponse.status === 200 && progressResponse.data.submitted_code) {
          setCode(progressResponse.data.submitted_code);
        } else {
          // Decode the template code before setting it
          setCode(lessonData.template_code ? decodeEntities(lessonData.template_code) : '');
        }
      } catch (_) {
        // Silently handle any errors and redirect to home
        if (isMounted) {
          navigate('/');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (lessonId && user?.token) {
      fetchLesson();
    }

    return () => {
      isMounted = false;
    };
  }, [lessonId, user, navigate]);

  if (loading)
    return (
      <div className="centered-loader">
        <LoadingSpinner />
      </div>
    );

  if (error) return <p className="error">{error}</p>;

  if (!lesson) return null;

  return (
    <>
      <Navbar />
      <div
        className="lesson-page lesson-split"
        style={{ flexDirection: windowWidth > 1024 ? 'row' : 'column', display: 'flex' }}
      >
        <div
          className="lesson-instructions"
          style={{
            ...(windowWidth > 1024
              ? { width: `${divider}%`, flex: 'none' }
              : { height: `${divider}%`, flex: 'none' }),
            minWidth: 0,
            minHeight: 0,
            transition: isDragging ? 'none' : windowWidth > 1024 ? 'width 0.2s' : 'height 0.2s',
            overflow: 'auto',
          }}
        >
          <h1>{lesson.name}</h1>
          <LessonContent
            content={lesson.content}
            hint={lesson.hint}
            solution={lesson.solution}
            failedAttempts={failedAttempts}
          />
        </div>

        {/* Draggable Gutter/Divider */}
        <div
          className="custom-gutter"
          style={{
            ...(windowWidth > 1024
              ? { cursor: 'col-resize', width: 8, minWidth: 8 }
              : { cursor: 'row-resize', height: 8, minHeight: 8 }),
            background: isDragging ? '#377ef0' : '#23263a',
            zIndex: 10,
            flex: 'none',
          }}
          onMouseDown={handleDragStart}
          ref={(el) => {
            // Add non-passive touch event listener to the gutter element
            if (el) {
              // Remove any existing listener first to prevent duplicates
              el.removeEventListener('touchstart', handleDragStart, { passive: false });
              // Add the non-passive listener
              el.addEventListener('touchstart', handleDragStart, { passive: false });
            }
          }}
        />

        <div
          className="lesson-code-area"
          style={{
            ...(windowWidth > 1024
              ? {
                width: `${100 - divider - 1}%`,
                flex: 'none',
                height: '100%',
              }
              : {
                height: `${100 - divider - 1}%`,
                flex: 'none',
                width: '100%',
              }),
            minWidth: 200,
            minHeight: 150,
            transition: isDragging ? 'none' : windowWidth > 1024 ? 'width 0.2s' : 'height 0.2s',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div className="code-editor">
            <MonacoEditorComponent
              language={languageMappings[languageId] || 'plaintext'}
              code={code}
              setCode={setCode}
              user={user}
              lessonId={lessonId}
              languageId={languageId}
              setConsoleOutput={setConsoleOutput}
              setIsAnswerCorrect={setIsAnswerCorrect}
              onCodeResult={handleCodeResult}
              templateCode={lesson?.template_code}
            />
          </div>
          <div className="console">
            <div className="console-header">
              <h3>Console</h3>
            </div>
            <pre className="console-output">{consoleOutput}</pre>
          </div>
        </div>
      </div>

      <LessonNavigation
        currentLessonId={parseInt(lessonId)}
        lessons={lessons}
        isAnswerCorrect={isAnswerCorrect}
        onNext={resetState}
        code={code}
        currentSectionId={lesson.section_id}
        sections={sections}
        lessonXp={lesson.xp}
      />
      {showCopyNotification && (
        <CopyNotification>
          <span>✓</span>
          <span>Copied!</span>
        </CopyNotification>
      )}
    </>
  );
};

export default LessonPage;
