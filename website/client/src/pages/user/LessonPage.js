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
import CircularProgress from '@mui/material/CircularProgress';
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
};

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

  const resetState = () => {
    setCode('');
    setConsoleOutput('Output will appear here...');
    setIsAnswerCorrect(false);
    setLesson(null);
    setLoading(true);
    setError('');
  };

  useEffect(() => {
    const fetchLesson = async () => {
      setLoading(true);
      setError('');
      try {
        console.log(`Fetching lesson data for lessonId: ${lessonId}`);
        const response = await axios.get(`/api/lesson/${lessonId}`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        const lessonData = response.data;
        setLesson(lessonData);
        setLanguageId(lessonData.language_id);

        const lessonsResponse = await axios.get(`/api/lesson?section_id=${lessonData.section_id}`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
        setLessons(lessonsResponse.data || []);
        setTotalLessons(lessonsResponse.data.length);

        const progressResponse = await axios.get(`/api/lesson-progress?user_id=${user.user_id}&lesson_id=${lessonId}`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (progressResponse.data.submitted_code) {
          setCode(progressResponse.data.submitted_code);
        }
      } catch (err) {
        setError('Failed to fetch lesson data.');
        console.error('Error fetching lesson:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [lessonId, user.token, user.user_id]);

  if (loading) return <div className="centered-loader">
    <CircularProgress/>
  </div>;
  if (error) return <p className="error">{error}</p>;

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
        />
      </>
  );
};

export default LessonPage;