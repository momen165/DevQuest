// LessonPage.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {useAuth} from 'AuthContext';
import Navbar from 'components/Navbar';
import LessonNavigation from 'components/LessonNavigation';
import LessonContent from 'components/LessonContent';
import MonacoEditorComponent from 'components/MonacoEditorComponent';
import 'styles/LessonPage.css';
import LoadingSpinner from './CircularProgress';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import he from 'he'; // Import he library for HTML entity decoding

const languageMappings = {
  91: 'java',
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
  77: 'cobol'
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
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    timeout: 10000,
    // Silence Axios errors in console
    validateStatus: status => true
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
          }
        });

        if (subscriptionResponse.status !== 200) {
          navigate('/pricing');
          return;
        }

        const { hasActiveSubscription: activeSubscription, completedLessons } = subscriptionResponse.data;
        setHasActiveSubscription(activeSubscription);
        setCompletedLessonsCount(completedLessons || 0);

        // If user has no active subscription and has completed the free lesson limit, redirect to pricing
        if (!activeSubscription && completedLessons >= FREE_LESSON_LIMIT) {
          navigate('/pricing', { 
            state: { 
              message: 'You have reached the free lesson limit. Please subscribe to continue learning.' 
            } 
          });
          return;
        }

        // First get the lesson data
        const lessonResponse = await api.get(`/lesson/${lessonId}`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          }
        });

        if (lessonResponse.status === 403) {
          navigate('/pricing', { 
            state: { 
              message: 'You have reached the free lesson limit. Please subscribe to continue learning.'
            } 
          });
          return;
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
          }
        });

        if (sectionResponse.status !== 200 || !sectionResponse.data) {
          navigate('/');
          return;
        }

        // Get all sections for the course
        const sectionsResponse = await api.get(`/sections/course/${sectionResponse.data.course_id}`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          }
        });

        if (sectionsResponse.status === 200) {
          setSections(sectionsResponse.data || []);
        }

        // Get ALL lessons for the course
        const allLessonsResponse = await api.get('/lesson', {
          params: {
            course_id: sectionResponse.data.course_id
          },
          headers: {
            Authorization: `Bearer ${user.token}`,
          }
        });
        
        if (allLessonsResponse.status === 200) {
          setLessons(allLessonsResponse.data || []);
          setTotalLessons(allLessonsResponse.data.length);
        }

        const progressResponse = await api.get(`/lesson-progress`, {
          params: {
            user_id: user.user_id,
            lesson_id: lessonId
          },
          headers: {
            Authorization: `Bearer ${user.token}`,
          }
        });

        if (progressResponse.status === 200 && progressResponse.data.submitted_code) {
          setCode(progressResponse.data.submitted_code);
        } else {
          // Decode the template code before setting it
          setCode(lessonData.template_code ? he.decode(lessonData.template_code) : '');
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

    return () => { isMounted = false; };
  }, [lessonId, user, navigate]);

  if (loading) return <div className="centered-loader">
    <LoadingSpinner/>
  </div>;
  
  if (error) return <p className="error">{error}</p>;

  if (!lesson) return null;

  return (
      <>
        <Navbar/>
        <div className="lesson-page">
        <div className="lesson-instructions">
          <h1>{lesson.name}</h1>
          <LessonContent 
            content={lesson.content}
            hint={lesson.hint}
            solution={lesson.solution}
          />
        </div>

          <div className="lesson-code-area">
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
                  onCopy={showCopiedNotification}
                  templateCode={lesson?.template_code}
              />
            </div>

            <div className="console">
              <div className="console-header">
              <h3>Console</h3></div>
              <pre className="console-output">
              {consoleOutput}
            </pre>
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