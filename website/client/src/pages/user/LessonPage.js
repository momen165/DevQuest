import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

import 'styles/LessonPage.css';
import Navbar from 'components/Navbar';
import LessonNavigation from 'components/LessonNavigation'; // Import the LessonNavigation component

const LessonPage = () => {
  const { lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [code, setCode] = useState('// Write your code here');
  const totalLessons = 10; // Example total number of lessons

  useEffect(() => {
    const fetchLesson = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`http://localhost:5000/api/lesson/${lessonId}`);
        setLesson(response.data);
      } catch (err) {
        setError('Failed to fetch lesson data.');
        console.error('Error fetching lesson:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [lessonId]);

  const runCode = () => {
    document.getElementById('console-output').textContent = `Output: \n${code}`;
  };

  if (loading) return <p className="loading">Loading lesson...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <>
      <Navbar />
      <div className="lesson-page">
        {/* Left Section: Lesson Instructions */}
        <div className="lesson-instructions">
          <h1>{lesson.name}</h1>
          <h2># What is JavaScript?</h2>
          <p>{lesson.description}</p>
          <div
            className="lesson-content"
            dangerouslySetInnerHTML={{ __html: lesson.content }}
          ></div>
        </div>

        {/* Right Section: Code Editor and Console */}
        <div className="lesson-code-area">
          <div className="code-editor">
            <h3>// Write code below 👇</h3>
            <CodeMirror
              value={code}
              height="400px"
              theme="dark"
              extensions={[javascript()]}
              onChange={(value) => setCode(value)}
            />
            <button className="run-btn" onClick={runCode}>
              Run
            </button>
          </div>
          <div className="console">
            <h3>Console</h3>
            <div id="console-output" className="console-output">
              Output will appear here...
            </div>
          </div>
        </div>
      </div>

      {/* Lesson Navigation */}
      <LessonNavigation lessonId={parseInt(lessonId)} totalLessons={totalLessons} />
    </>
  );
};

export default LessonPage;
