import React, {useEffect, useRef, useState, useCallback} from 'react';
import {Editor} from '@monaco-editor/react';
import axios from 'axios';
import {FaPlay, FaCopy, FaCog} from 'react-icons/fa';
import 'styles/LessonPage.css';
import CircularProgress from "@mui/material/CircularProgress";
import '../styles/MonacoEditor.css';

const languageCommentMappings = {
    python: '# Write code below \n',
    javascript: '// Write code below \n',
    cpp: '// Write code below \n',
    java: '// Write code below \n',
    plaintext: '// Write code below \n',
  // Add other languages as needed
};

const MonacoEditorComponent = ({

      language,
      code,
      setCode,
      user,
      lessonId,
      languageId,
      setConsoleOutput,
      setIsAnswerCorrect
}) => {
  const editorRef = useRef(null);
  const initialCommentSet = useRef(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editorSettings, setEditorSettings] = useState(() => {
    try {
      const savedSettings = localStorage.getItem('editorSettings');
      return savedSettings ? JSON.parse(savedSettings) : {
        theme: 'vs-dark',
        fontSize: 16,
        minimap: false,
        lineNumbers: 'on',
      };
    } catch (error) {
      console.warn('Failed to load editor settings from localStorage:', error);
      return {
        theme: 'vs-dark',
        fontSize: 16,
        minimap: false,
        lineNumbers: 'on',
      };
    }
  });
  const [isRunning, setIsRunning] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const COOLDOWN_DURATION = 2000; // 2 seconds cooldown

  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!initialCommentSet.current && !code) {
        const initialComment = languageCommentMappings[language] || '// Write code below\n';
      setCode(initialComment);
      initialCommentSet.current = true;
    }
  }, [code, setCode, language]);

    const runCode = useCallback(async () => {
        if (isRunning || cooldown || !code.trim()) {
            return;
        }

        try {
            setIsRunning(true);
            setCooldown(true);
            console.log('Running code...');
            setConsoleOutput(<CircularProgress/>);

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

            const {results} = response.data;
            if (!results || results.length === 0) {
                setConsoleOutput('No results received from the server.');
                return;
            }

            let output = 'Test Case Results:\n\n';
            let allPassed = true;
            results.forEach((testCase, index) => {
                const {input, expected_output, actual_output, status, compileError, error} = testCase;
                const isCorrect = actual_output.trim() === expected_output.trim();
                if (!isCorrect) {
                    allPassed = false;
                }
                output += `Test Case ${index + 1}:\n`;
                output += `Input:\n${input}\n`;
                output += `Expected Output:\n${expected_output.trim()}\n`;
                output += `Actual Output:\n${actual_output.trim()}\n`;
                output += `Status: ${isCorrect ? 'Passed ✅' : 'Failed ❌'}\n`;
                if (error) output += `Error: ${error}\n`;
                if (compileError) output += `Compile Error: ${compileError}\n`;
                output += `\n`;
            });

            output += allPassed ? 'All test cases passed! 🎉' : 'Some test cases failed. Please review your code.';

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
            setConsoleOutput(`Error: ${err.message}`);
        } finally {
            setIsRunning(false);
            // Start cooldown timer
            setTimeout(() => {
                setCooldown(false);
            }, COOLDOWN_DURATION);
        }
    }, [code, languageId, user, setConsoleOutput, setIsAnswerCorrect, lessonId]);

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(code).then(() => {
      alert('Code copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy code: ', err);
    });
  };

  const updateEditorSettings = (setting, value) => {
    const newSettings = {
        ...editorSettings,
        [setting]: value
    };
    
    setEditorSettings(newSettings);
    
    try {
        localStorage.setItem('editorSettings', JSON.stringify(newSettings));
    } catch (error) {
        console.warn('Failed to save editor settings to localStorage:', error);
    }
    
    if (editorRef.current) {
        // For all settings including fontSize, just use updateOptions
        editorRef.current.updateOptions({
            [setting]: value
        });
    }
};

const adjustFontSize = (increment) => {
  const newSize = editorSettings.fontSize + increment;
  if (newSize >= 12 && newSize <= 32) {
      updateEditorSettings('fontSize', newSize);
  }
};

  return (
    <div className="editor-container">
      <button 
        className="editor-settings-button"
        onClick={() => setShowSettings(!showSettings)}
      >
        <FaCog />
      </button>

      {showSettings && (
        <div className="editor-settings-menu">
          <div className="settings-group">
            <label className="settings-label">Theme</label>
            <select 
              className="settings-select"
              value={editorSettings.theme}
              onChange={(e) => updateEditorSettings('theme', e.target.value)}
            >
              <option value="vs-dark">Dark</option>
              <option value="light">Light</option>
              <option value="hc-black">High Contrast</option>
            </select>
          </div>

          <div className="settings-group">
            <label className="settings-label">Font Size</label>
            <div className="font-size-control">
              <button 
                className="font-size-button"
                onClick={() => adjustFontSize(-1)}
              >
                -
              </button>
              <span className="font-size-value">{editorSettings.fontSize}</span>
              <button 
                className="font-size-button"
                onClick={() => adjustFontSize(1)}
              >
                +
              </button>
            </div>
          </div>

          <div className="settings-group">
            <label className="settings-label">Line Numbers</label>
            <select 
              className="settings-select"
              value={editorSettings.lineNumbers}
              onChange={(e) => updateEditorSettings('lineNumbers', e.target.value)}
            >
              <option value="on">Show</option>
              <option value="off">Hide</option>
            </select>
          </div>

          <div className="settings-group">
            <label className="settings-label">Minimap</label>
            <select 
              className="settings-select"
              value={editorSettings.minimap ? 'on' : 'off'}
              onChange={(e) => updateEditorSettings('minimap', e.target.value === 'on')}
            >
              <option value="off">Hide</option>
              <option value="on">Show</option>
            </select>
          </div>
        </div>
      )}

<Editor
    height="100%"
    theme={editorSettings.theme}
    language={language}
    className="monaco-editor-override"
    options={{
        fontSize: editorSettings.fontSize,
        lineNumbers: editorSettings.lineNumbers,
        minimap: { enabled: editorSettings.minimap },
        padding: { top: 16 },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: true,
        roundedSelection: true,
        automaticLayout: true,
    }}
    value={code}
    onChange={(value) => setCode(value)}
    onMount={(editor) => {
        editorRef.current = editor;
    }}
/>
      <div className="editor-controls">
        <button 
            className={`editor-button run-btn ${(isRunning || cooldown) ? 'disabled' : ''}`}
            onClick={runCode}
            disabled={isRunning || cooldown}
        >
            {isRunning ? 'Running...' : cooldown ? 'Wait...' : 'Run'} <FaPlay />
        </button>
        <button className="editor-button copy-btn" onClick={copyCodeToClipboard}>
          <FaCopy />
        </button>
      </div>
    </div>
  );
};

export default MonacoEditorComponent;