import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { FaPlay, FaCopy } from 'react-icons/fa'; // Import icons
import 'styles/LessonPage.css';
import Navbar from 'components/Navbar';
import LessonNavigation from 'components/LessonNavigation';
import { useAuth } from 'AuthContext';
import LessonContent from 'components/LessonContent';

const languageExtensions = {
  71: python(),
  74: javascript(),
  54: cpp(),
  62: java(),
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
  }, [lessonId]);

  const runCode = async () => {
    try {
      console.log('Running code...');
      setConsoleOutput('Running code...');

      if (!languageId) {
        setConsoleOutput('Language ID not available. Cannot run the code.');
        return;
      }

      if (!user || !user.token) {
        setConsoleOutput('Authorization token is missing. Please log in again.');
        return;
      }

      const encodedCode = btoa(code);

      const payload = {
        lessonId: parseInt(lessonId, 10),
        code: encodedCode,
        languageId,
      };

      console.log('Sending request to run code with payload:', payload);

      const response = await axios.post(
          '/api/run?base64_encoded=true',
          payload,
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
              'Content-Type': 'application/json',
            },
          }
      );

      console.log('Received response from server:', response.data);

      const { results } = response.data;
      if (!results || results.length === 0) {
        setConsoleOutput('No results received from the server.');
        return;
      }

      let output = 'Test Case Results:\n';
      let allPassed = true;
      results.forEach((testCase, index) => {
        const { input, expected_output, actual_output, status, compileError, error } = testCase;
        output += `Test Case ${index + 1}:\n`;
        output += `Input:\n${input}\n`;
        output += `Expected Output:\n${expected_output.trim()}\n`;
        output += `Actual Output:\n${actual_output.trim()}\n`;
        output += `Status: ${status}\n`;
        if (error) output += `Error: ${error}\n`;
        if (compileError) output += `Compile Error: ${compileError}\n`;
        output += `\n`;
      });

      setConsoleOutput(output);
      setIsAnswerCorrect(allPassed);

      await axios.put('/api/update-lesson-progress', {
        user_id: user.user_id,
        lesson_id: lessonId,
        completed: allPassed,
        submitted_code: code,
      }, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

    } catch (err) {
      console.error('Error running code:', err.response?.data || err.message);
      setConsoleOutput(err.message);
    }
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(code).then(() => {
      alert('Code copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy code: ', err);
    });
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
            <LessonContent content={lesson.content} />
          </div>

          <div className="lesson-code-area">
            <div className="code-editor">
              <h3>// Write code below 👇</h3>
              <CodeMirror
                  value={code}
                  height="400px"
                  theme="dark"
                  extensions={[languageExtensions[languageId] || javascript()]}
                  onChange={(value) => setCode(value)}
              />
              <button className="run-btn" onClick={runCode}>
                Run <FaPlay />
              </button>
              <button className="copy-btn" onClick={copyCodeToClipboard}>
                Copy Code <FaCopy />
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