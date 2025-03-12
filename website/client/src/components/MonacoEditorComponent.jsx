import React, { useEffect, useRef, useState, useCallback } from "react";
import { Editor } from "@monaco-editor/react";
import axios from "axios";
import { FaPlay, FaCopy, FaCog } from "react-icons/fa";
import "styles/LessonPage.css";
import CircularProgress from "@mui/material/CircularProgress";
import "../styles/MonacoEditor.css";

// Unicode-safe Base64 encoding function
const encodeUnicode = (str) => {
  return btoa(
    encodeURIComponent(str).replace(
      /%([0-9A-F]{2})/g,
      function toSolidBytes(match, p1) {
        return String.fromCharCode("0x" + p1);
      },
    ),
  );
};

const languageCommentMappings = {
  python: "# Write code below \n", // ID: 100
  java: "// Write code below \n", // ID: 62
  cpp: "// Write code below \n", // ID: 105
  c: "// Write code below \n", // ID: 104
  javascript: "// Write code below \n", // ID: 102
  php: "// Write code below \n", // ID: 68
  ruby: "# Write code below \n", // ID: 72
  typescript: "// Write code below \n", // ID: 101
  kotlin: "// Write code below \n", // ID: 78
  rust: "// Write code below \n", // ID: 73
  csharp: "// Write code below \n", // ID: 51
  go: "// Write code below \n", // ID: 95
  swift: "// Write code below \n", // ID: 83
  haskell: "-- Write code below \n", // ID: 61
  plaintext: "// Write code below \n",
};

const MonacoEditorComponent = ({
  language,
  code,
  setCode,
  user,
  lessonId,
  languageId,
  setConsoleOutput,
  setIsAnswerCorrect,
  onCodeResult,
  templateCode,
}) => {
  const editorRef = useRef(null);
  const initialCommentSet = useRef(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editorSettings, setEditorSettings] = useState(() => {
    try {
      const savedSettings = localStorage.getItem("editorSettings");
      return savedSettings
        ? JSON.parse(savedSettings)
        : {
            theme: "vs-dark",
            fontSize: 16,
            minimap: false,
            lineNumbers: "on",
          };
    } catch (error) {
      console.warn("Failed to load editor settings from localStorage:", error);
      return {
        theme: "vs-dark",
        fontSize: 16,
        minimap: false,
        lineNumbers: "on",
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
      if (templateCode) {
        setCode(templateCode);
      } else {
        const initialComment =
          languageCommentMappings[language] || "// Write code below\n";
        setCode(initialComment);
      }
      initialCommentSet.current = true;
    }
  }, [code, setCode, language, templateCode]);

  const runCode = useCallback(async () => {
    if (isRunning || cooldown || !code.trim()) {
      return;
    }

    try {
      setIsRunning(true);
      setCooldown(true);
      console.log("Running code...");
      setConsoleOutput(<CircularProgress />);

      if (!languageId) {
        setConsoleOutput("Language ID not available. Cannot run the code.");
        return;
      }

      if (!user || !user.token) {
        setConsoleOutput(
          "Authorization token is missing. Please log in again.",
        );
        return;
      }

      // Use the Unicode-safe Base64 encoding function
      const encodedCode = encodeUnicode(code);

      const payload = {
        lessonId: parseInt(lessonId, 10),
        code: encodedCode,
        languageId,
      };

      console.log("Sending request to run code with payload:", payload);

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/run?base64_encoded=true`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
            "Content-Type": "application/json",
          },
        },
      );
      console.log("sent request to run code with payload:", payload);
      console.log("Received response from server:", response.data);

      const { results, success } = response.data;
      if (!results || results.length === 0) {
        setConsoleOutput("No results received from the server.");
        return;
      }

      let output = "";
      let allPassed = true;
      // Check if any test case has auto_detect enabled
      const isAutoDetect = results.some((testCase) => testCase.auto_detect);

      results.forEach((testCase, index) => {
        const {
          input,
          expected_output,
          actual_output,
          status,
          auto_detect,
          use_pattern,
          error,
        } = testCase;
        const isCorrect = status === "Passed";
        if (!isCorrect) {
          allPassed = false;
        }

        if (auto_detect) {
          output += `Console Output:\n${actual_output}\n\n`;
          if (!isCorrect && error) {
            output += `❌ ${error}\n\n`;
          }
        } else if (use_pattern) {
          output += `Console Output:\n${actual_output}\n\n`;
          output += `Pattern: ${testCase.pattern}\n\n`;
          if (isCorrect) {
            output += `✅ Output matches the pattern\n\n`;
          } else {
            output += `❌ ${error}\n\n`;
          }
        } else {
          output += `📋 Test Case ${index + 1}\n`;
          output += `${"─".repeat(40)}\n\n`;
          output += `📥 Input:\n${input}\n\n`;
          output += `✨ Expected Output:\n${expected_output}\n\n`;
          output += `📤 Your Output:\n${actual_output}\n\n`;
          output += `${isCorrect ? "✅ Status: Passed" : "❌ Status: Failed"}`;
          if (!isCorrect && error) {
            output += `\n❗ ${error}`;
          }
          output += "\n\n";
        }
      });

      if (allPassed) {
        output += "✅ All validations passed!\n";
      } else {
        output +=
          "❌ Validation failed. Please check the requirements and try again.";
      }

      setConsoleOutput(output);
      setIsAnswerCorrect(success);

      // Call onCodeResult with the success status
      if (onCodeResult) {
        onCodeResult(success);
      }
    } catch (err) {
      console.error("Error running code:", err.response?.data || err.message);
      let errorMessage = "❌ Error Running Code\n\n";

      const errorData = err.response?.data;
      if (errorData) {
        errorMessage += `${errorData.error}\n`;
        if (errorData.details) {
          errorMessage += `\n${errorData.details}`;
        }
      } else {
        errorMessage += err.message || "An unexpected error occurred.";
      }

      // Add helpful tips based on the error
      if (err.response?.status === 413) {
        errorMessage += "\n\n💡 Tips:\n";
        errorMessage += "• Reduce the number of output statements\n";
        errorMessage += "• Consider using fewer loop iterations\n";
        errorMessage += "• Check for infinite loops";
      } else if (err.response?.status === 408) {
        errorMessage += "\n\n💡 Tips:\n";
        errorMessage += "• Check for infinite loops\n";
        errorMessage += "• Reduce the complexity of your code\n";
        errorMessage += "• Consider using more efficient algorithms";
      } else if (err.response?.status === 429) {
        errorMessage += "\n\n💡 Tips:\n";
        errorMessage += "• Wait a few minutes before trying again\n";
        errorMessage += "• Each user is limited to 50 requests per 15 minutes";
      }

      setConsoleOutput(errorMessage);

      // Also call onCodeResult with false on error
      if (onCodeResult) {
        onCodeResult(false);
      }
    } finally {
      setIsRunning(false);
      // Start cooldown timer
      setTimeout(() => {
        setCooldown(false);
      }, COOLDOWN_DURATION);
    }
  }, [
    code,
    languageId,
    user,
    setConsoleOutput,
    setIsAnswerCorrect,
    onCodeResult,
    lessonId,
    isRunning,
    cooldown,
  ]);

  const copyCodeToClipboard = () => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        alert("Code copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy code: ", err);
      });
  };

  const updateEditorSettings = (setting, value) => {
    const newSettings = {
      ...editorSettings,
      [setting]: value,
    };

    setEditorSettings(newSettings);

    try {
      localStorage.setItem("editorSettings", JSON.stringify(newSettings));
    } catch (error) {
      console.warn("Failed to save editor settings to localStorage:", error);
    }

    if (editorRef.current) {
      // For all settings including fontSize, just use updateOptions
      editorRef.current.updateOptions({
        [setting]: value,
      });
    }
  };

  const adjustFontSize = (increment) => {
    const newSize = editorSettings.fontSize + increment;
    if (newSize >= 12 && newSize <= 32) {
      updateEditorSettings("fontSize", newSize);
    }
  };

  const resetToTemplate = () => {
    if (
      window.confirm(
        "Are you sure you want to reset your code to the template? This will erase your current changes.",
      )
    ) {
      setCode(
        templateCode ||
          languageCommentMappings[language] ||
          "// Write code below\n",
      );
      setConsoleOutput("Output will appear here...");
      setIsAnswerCorrect(false);
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
              onChange={(e) => updateEditorSettings("theme", e.target.value)}
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
              onChange={(e) =>
                updateEditorSettings("lineNumbers", e.target.value)
              }
            >
              <option value="on">Show</option>
              <option value="off">Hide</option>
            </select>
          </div>

          <div className="settings-group">
            <label className="settings-label">Minimap</label>
            <select
              className="settings-select"
              value={editorSettings.minimap ? "on" : "off"}
              onChange={(e) =>
                updateEditorSettings("minimap", e.target.value === "on")
              }
            >
              <option value="off">Hide</option>
              <option value="on">Show</option>
            </select>
          </div>

          <div className="settings-group">
            <button
              className="reset-button"
              onClick={resetToTemplate}
              title="Reset code to template"
            >
              Reset to Template
            </button>
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
          // Quick Suggestions
          quickSuggestions: true,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "on",
          tabCompletion: "on",
          suggestSelection: "first",
          formatOnType: true,
          formatOnPaste: true,
          snippetSuggestions: "on",
        }}
        value={code}
        onChange={(value) => setCode(value)}
        onMount={(editor) => {
          editorRef.current = editor;
        }}
      />
      <div className="editor-controls">
        <button
          className={`editor-button run-btn ${isRunning || cooldown ? "disabled" : ""}`}
          onClick={runCode}
          disabled={isRunning || cooldown}
        >
          {isRunning ? "Running..." : cooldown ? "Wait..." : "Run"} <FaPlay />
        </button>
        <button
          className="editor-button copy-btn"
          onClick={copyCodeToClipboard}
        >
          <FaCopy />
        </button>
      </div>
    </div>
  );
};

export default MonacoEditorComponent;
