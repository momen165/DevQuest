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

const languageMappings = {
  71: 'python',
  63: 'javascript',
  54: 'cpp',
  102: 'java',
  1: 'plaintext',
  2: 'markdown',
  3: 'html',
  4: 'css',
  5: 'json',
  101: 'typescript',
  7: 'xml',
  8: 'sql',
  9: 'ruby',
  60: 'go',
  11: 'php',
  12: 'shell',
  13: 'kotlin',
  14: 'r',
  15: 'csharp',
  16: 'swift',
  17: 'dart',
  73: 'rust',
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
        // First get the lesson data
        const lessonResponse = await api.get(`/lesson/${lessonId}`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        const lessonData = lessonResponse.data;
        setLesson(lessonData);
        setLanguageId(lessonData.language_id);

        // Get section data
        const sectionResponse = await api.get(`/sections/${lessonData.section_id}`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (!sectionResponse.data) {
          throw new Error('Section not found');
        }

        // Get all sections for the course
        const sectionsResponse = await api.get(`/sections/course/${sectionResponse.data.course_id}`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        setSections(sectionsResponse.data || []);

        // Get ALL lessons for the course
        const allLessonsResponse = await api.get('/lesson', {
          params: {
            course_id: sectionResponse.data.course_id
          },
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
        console.log('All lessons:', allLessonsResponse.data);
        setLessons(allLessonsResponse.data || []);
        setTotalLessons(allLessonsResponse.data.length);

        const progressResponse = await api.get(`/lesson-progress`, {
          params: {
            user_id: user.user_id,
            lesson_id: lessonId
          },
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (progressResponse.data.submitted_code) {
          setCode(progressResponse.data.submitted_code);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching data:', err);
          setError(err.response?.data?.error || 'Failed to fetch lesson data');
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
  }, [lessonId, user]);

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
            <p>{lesson.description}</p>
            <LessonContent content={lesson.content}/>
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
              />
            </div>

            <div className="console">
              <h3>Console</h3>
              <pre id="console-output" className="console-output">
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