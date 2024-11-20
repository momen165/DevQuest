import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import 'styles/LessonPage.css';
import Navbar from 'components/Navbar';
import LessonNavigation from 'components/LessonNavigation';

const languageExtensions = {
  71: python(), // Python
  74: javascript(), // JavaScript
  54: cpp(), // C++
  62: java(), // Java

};

const LessonPage = () => {
  const { lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [code, setCode] = useState('// Write your code here');
  const [consoleOutput, setConsoleOutput] = useState('Output will appear here...');
  const [languageId, setLanguageId] = useState(null); // To store language_id
  const totalLessons = 10;

  useEffect(() => {
    const fetchLesson = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`http://localhost:5000/api/lesson/${lessonId}`);
        setLesson(response.data);
        setLanguageId(response.data.language_id); // Set language_id from API response
      } catch (err) {
        setError('Failed to fetch lesson data.');
        console.error('Error fetching lesson:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [lessonId]);

  const runCode = async () => {
    try {
      setConsoleOutput('Running code...');
      if (!languageId) {
        setConsoleOutput('Language ID not available. Cannot run the code.');
        return;
      }
  
      const payload = {
        lessonId: parseInt(lessonId), // Assuming lessonId is from useParams
        code,
        languageId,
      };
  
      console.log('Payload:', payload);
  
      const response = await axios.post('http://localhost:5000/api/run', payload);
  
      console.log('Response:', response.data);
  
      const { status, stdout, stderr, compile_output } = response.data;
  
      if (status === 'Accepted') {
        setConsoleOutput(stdout || 'No output.');
      } else {
        let errorMessage = `Status: ${status}\n`;
        if (compile_output) errorMessage += `Compilation Error:\n${compile_output}\n`;
        if (stderr) errorMessage += `Runtime Error:\n${stderr}\n`;
        if (stdout) errorMessage += `Output:\n${stdout}\n`;
  
        setConsoleOutput(errorMessage.trim());
      }
    } catch (err) {
      console.error('Error running code:', err.response?.data || err.message);
      setConsoleOutput('An error occurred while running the code.');
    }
  };
  

  if (loading) return <p className="loading">Loading lesson...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <>
      <Navbar />
      <div className="lesson-page">
        <div className="lesson-instructions">
          <h1>{lesson.name}</h1>
          <p>{lesson.description}</p>
          <div
            className="lesson-content"
            dangerouslySetInnerHTML={{ __html: lesson.content }}
          ></div>
        </div>

        <div className="lesson-code-area">
          <div className="code-editor">
            <h3>// Write code below 👇</h3>
            <CodeMirror
              value={code}
              height="400px"
              theme="dark"
              extensions={[languageExtensions[languageId] || javascript()]} // Dynamically set the extension
              onChange={(value) => setCode(value)} // Update code state
            />
            <button className="run-btn" onClick={runCode}>
              Run
            </button>
          </div>
          <div className="console">
            <h3>Console</h3>
            <pre id="console-output" className="console-output">
              {consoleOutput}
            </pre>
          </div>
        </div>
      </div>

      <LessonNavigation lessonId={parseInt(lessonId)} totalLessons={totalLessons} />
    </>
  );
};

export default LessonPage;
