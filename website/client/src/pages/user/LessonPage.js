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
import { useAuth } from 'AuthContext'; // Ensure you import useAuth



const languageExtensions = {
  71: python(), // Python
  74: javascript(), // JavaScript
  54: cpp(), // C++
  62: java(), // Java
};

const LessonPage = () => {
  const { lessonId } = useParams();
  const { user } = useAuth(); // Access user from AuthContext
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [code, setCode] = useState('// Write your code here');
  const [consoleOutput, setConsoleOutput] = useState('Output will appear here...');
  const [languageId, setLanguageId] = useState(null); // To store language_id
  const [lessons, setLessons] = useState([]); // For navigation
  const [totalLessons, setTotalLessons] = useState(0); // Dynamically set total lessons

  useEffect(() => {
    const fetchLesson = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`http://localhost:5000/api/lesson/${lessonId}`);
        const lessonData = response.data;
        setLesson(lessonData);
        setLanguageId(lessonData.language_id); // Set language_id for code editor
        
        // Fetch lessons in the same section for navigation
        const lessonsResponse = await axios.get(`http://localhost:5000/api/lessons?section_id=${lessonData.section_id}`);
        setLessons(lessonsResponse.data || []);
        setTotalLessons(lessonsResponse.data.length); // Dynamically set total lessons
      } catch (err) {
        setError('Failed to fetch lesson data.');
        console.error('Error fetching lesson:', err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchLesson();
  }, [lessonId]);

  // Fetch all lessons for navigation
  useEffect(() => {
    const fetchAllLessons = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/lessons?section_id=${lesson?.section_id}`);
        setLessons(response.data || []);
        setTotalLessons(response.data.length); // Update total lessons count
      } catch (err) {
        console.error('Failed to fetch lessons for navigation:', err);
      }
    };

    if (lesson?.section_id) fetchAllLessons();
  }, [lesson?.section_id]);
  
  const runCode = async () => {
    try {
      setConsoleOutput('Running code...');
      
      if (!languageId) {
        setConsoleOutput('Language ID not available. Cannot run the code.');
        return;
      }
  
      if (!user || !user.token) {
        setConsoleOutput('Authorization token is missing. Please log in again.');
        return;
      }
  
      const payload = {
        lessonId: parseInt(lessonId, 10),
        code,
        languageId,
      };
  
      console.log('Payload sent to API:', payload);
  
      const response = await axios.post(
        'http://localhost:5000/api/run',
        payload,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
  
      console.log('Response from API:', response.data);
  
      const { results } = response.data;
      if (!results || results.length === 0) {
        setConsoleOutput('No results received from the server.');
        return;
      }
  
      let output = 'Test Case Results:\n';
      results.forEach((testCase, index) => {
        const { input, expected_output, actual_output, status } = testCase;
        output += `Test Case ${index + 1}:\n`;
        output += `Input:\n${input}\n`;
        output += `Expected Output:\n${expected_output.trim()}\n`;
        output += `Actual Output:\n${actual_output.trim()}\n`;
        output += `Status: ${status}\n\n`;
      });
  
      setConsoleOutput(output);
  
    } catch (err) {
      console.error('Error running code:', err.response?.data || err.message);
      setConsoleOutput('An error occurred while running the code. Please try again.');
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
            <button className="run-btn" onClick={() => runCode(user)}>
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

      {/* Lesson Navigation with all lessons */}
      <LessonNavigation
        currentLessonId={parseInt(lessonId)}
        lessons={lessons} // Pass lessons array for navigation
        
      />
      {/* Debugging Logs */}
    
    </>
  );
};

export default LessonPage;
