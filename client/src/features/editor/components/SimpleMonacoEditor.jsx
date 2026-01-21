import React, { useRef, useState } from "react";
import { Editor } from "@monaco-editor/react";
import { FaCog } from "react-icons/fa";
import "./SimpleMonacoEditor.css";

const SimpleMonacoEditor = ({ code, setCode, language }) => {
  const editorRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [theme, setTheme] = useState("vs-dark");
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showMinimap, setShowMinimap] = useState(false);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Log language information
    

    // Configure editor for the specific language
    if (language) {
      monaco.editor.setModelLanguage(editor.getModel(), getMonacoLanguage());
    }
  };

  const handleEditorChange = (value) => {
    setCode(value);
  };

  const handleSettingsClick = (e) => {
    e.preventDefault();
    setShowSettings(!showSettings);
  };

  // Map language to Monaco's language identifier
  const getMonacoLanguage = () => {
   

    switch (language?.toLowerCase()) {
      case "cpp":
        return "cpp";
      case "c":
        return "c";
      case "python":
        return "python";
      case "javascript":
        return "javascript";
      case "typescript":
        return "typescript";
      case "java":
        return "java";
      case "ruby":
        return "ruby";
      case "go":
        return "go";
      case "rust":
        return "rust";
      case "php":
        return "php";
      case "csharp":
        return "csharp";
      case "swift":
        return "swift";
      case "kotlin":
        return "kotlin";
      default:
      
        return "plaintext";
    }
  };

  return (
    <div className="monaco-editor-container">
      <div className="editor-header">
        <div className="editor-settings">
          <button
            className="settings-button"
            onClick={handleSettingsClick}
            title="Editor Settings"
            type="button"
          >
            <FaCog />
          </button>
          {showSettings && (
            <div className="settings-panel">
              <div className="setting-item">
                <label>Theme:</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                >
                  <option value="vs-dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>
              <div className="setting-item">
                <label>Font Size:</label>
                <input
                  type="number"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  min="8"
                  max="30"
                />
              </div>
              <div className="setting-item">
                <label>Line Numbers:</label>
                <input
                  type="checkbox"
                  checked={showLineNumbers}
                  onChange={(e) => setShowLineNumbers(e.target.checked)}
                />
              </div>
              <div className="setting-item">
                <label>Minimap:</label>
                <input
                  type="checkbox"
                  checked={showMinimap}
                  onChange={(e) => setShowMinimap(e.target.checked)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <Editor
        height="100%"
        language={getMonacoLanguage()}
        value={code}
        theme={theme}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize: fontSize,
          lineNumbers: showLineNumbers ? "on" : "off",
          minimap: { enabled: showMinimap },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          formatOnPaste: true,
          formatOnType: true,
          renderWhitespace: "selection",
          bracketPairColorization: true,
          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          matchBrackets: "always",
          folding: true,
          detectIndentation: true,
          dragAndDrop: true,
          links: true,
          suggest: {
            showKeywords: true,
          },
          hover: {
            enabled: false,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
          parameterHints: {
            enabled: false,
          },
          inlayHints: {
            enabled: false,
          },
          suggestLineHeight: 22,
          suggestFontSize: 12,
          "accessibility.verbosity.commandCenter": false,
          hideCommandCenter: true,
        }}
      />
    </div>
  );
};

export default SimpleMonacoEditor;
