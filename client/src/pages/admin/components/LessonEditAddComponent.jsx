import React, { useState, useEffect } from 'react';
import { FaSave, FaTrash, FaQuestionCircle } from 'react-icons/fa';
import axios from 'axios';
import '../../../pages/admin/styles/LessonEditAddComponent.css';
import CustomEditor from '../../../components/CustomEditor';
import SimpleMonacoEditor from '../../../components/SimpleMonacoEditor';
import ErrorAlert from './ErrorAlert';
import { useAuth } from '../../../AuthContext'; // Import useAuth for context
import { decode as decodeEntities } from 'entities'; // Import the decode function from entities

const languageMappings = {
  100: 'python',      // Python (3.12.5)
  62: 'java',        // Java (OpenJDK 13.0.1)
  105: 'cpp',        // C++ (GCC 14.1.0)
  104: 'c',          // C (Clang 18.1.8)
  102: 'javascript', // JavaScript (Node.js 22.08.0)
  68: 'php',         // PHP (7.4.1)
  72: 'ruby',        // Ruby (2.7.0)
  101: 'typescript', // TypeScript (5.6.2)
  78: 'kotlin',      // Kotlin (1.3.70)
  73: 'rust',        // Rust (1.40.0)
  51: 'csharp',      // C# (Mono 6.6.0.161)
  95: 'go',          // Go (1.18.5)
  83: 'swift',       // Swift (5.2.3)
  61: 'haskell',     // Haskell (GHC 8.8.1)
};

const DEFAULT_LESSON_TEMPLATE = `<div class="lesson-template">
  <h1 class="lesson-template-heading">Exercise</h1>

  <div class="lesson-template-text">
    [Brief explanation of the concept or feature being taught...]
  </div>

  <pre class="lesson-template-code lesson-template-code--dark">
// Example code demonstrating the concept
for (let i = 0; i < 5; i++) {
  if (i == 1) {
    continue;
  }
  console.log(i);
}
  </pre>

  <div class="lesson-template-text">
    The code above will output:
  </div>

  <pre class="lesson-template-code lesson-template-code--dark">
0
2
3
4
  </pre>

  <div class="lesson-template-text">
    [Additional explanation if needed...]
  </div>

  <h1 class="lesson-template-heading">Instructions</h1>
  <div class="lesson-template-text">
    1. [First step]<br>
    2. [Second step]<br>
    3. [Third step]<br>
  </div>

  <div class="lesson-template-text">
    The output should look like this:
  </div>

  <pre class="lesson-template-code lesson-template-code--dark">
// Expected output
2
4
6
...
42
  </pre>

  <h1 class="lesson-template-heading">Help</h1>
  <div class="lesson-template-text">
    Need help? Use the hint and solution buttons below to guide you through this exercise.
  </div>
</div>`;

const LessonEditAddComponent = ({ section, lesson = null, onSave, onCancel, onDelete }) => {
  const { user } = useAuth();

  // Helper function for default test case - Move this BEFORE any state declarations
  const getDefaultTestCase = () => ({
    input: '',
    expected_output: '',
    auto_detect: false,
    use_pattern: false,
    pattern: ''
  });

  // Group related state together
  // Lesson basic info
  const [lessonName, setLessonName] = useState(lesson?.name || '');
  const [editorData, setEditorData] = useState(() => lesson?.content || DEFAULT_LESSON_TEMPLATE);
  const [xp, setXp] = useState(lesson?.xp || 0);
  const [templateCode, setTemplateCode] = useState(() => {
    // Decode HTML entities when loading template code
    if (lesson?.template_code) {
      return decodeEntities(lesson.template_code);
    }
    return '';
  });
  const [hint, setHint] = useState(lesson?.hint || '');
  const [solution, setSolution] = useState(lesson?.solution || '');

  // UI state
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [languageId, setLanguageId] = useState(null);

  // Test cases state
  const [test_cases, setTestCases] = useState(() => {
    if (lesson?.test_cases) {
      try {
        const cases = Array.isArray(lesson.test_cases)
          ? lesson.test_cases
          : JSON.parse(lesson.test_cases);
        return cases.map(test => ({
          input: test.input || '',
          expected_output: test.auto_detect ? '' : (test.expected_output || ''),
          auto_detect: test.auto_detect === true,
          use_pattern: test.use_pattern === true,
          pattern: test.pattern || ''
        }));
      } catch (error) {
        console.error('Error parsing test cases:', error);
        return [getDefaultTestCase()];
      }
    }
    return [getDefaultTestCase()];
  });


  useEffect(() => {
    const fetchCourseLanguage = async () => {
      if (!section?.section_id) return;

      try {
        const sectionResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/sections/${section.section_id}`,
          { headers: { Authorization: `Bearer ${user.token}` } }
        );

        if (!sectionResponse.data?.course_id) return;

        const courseResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/courses/${sectionResponse.data.course_id}`,
          { headers: { Authorization: `Bearer ${user.token}` } }
        );

        if (courseResponse.data?.language_id) {
          setLanguageId(courseResponse.data.language_id);
        }
      } catch (err) {
        console.error('Error fetching course language:', err);
        setError('Failed to fetch course language');
      }
    };

    fetchCourseLanguage();
  }, [section, user.token]);

  // Validation function
  const validate = () => {
    if (!lessonName.trim()) {
      setError('Lesson name is required');
      return false;
    }

    for (const testCase of test_cases) {
      if (!testCase.auto_detect && !testCase.use_pattern && !testCase.expected_output.trim()) {
        setError('Test case expected output is required when not using auto-detect or pattern validation');
        return false;
      }

      if (testCase.use_pattern && !testCase.pattern.trim()) {
        setError('Pattern is required when pattern validation is enabled');
        return false;
      }
    }

    return true;
  };

  // Handler functions
  const handleTestCaseChange = (index, field, value) => {
    const updatedTestCases = [...test_cases];

    if (field === 'auto_detect') {
      updatedTestCases[index] = {
        ...updatedTestCases[index],
        auto_detect: value === true,
        expected_output: '',
        use_pattern: false,
        pattern: ''
      };
    } else if (field === 'use_pattern') {
      updatedTestCases[index] = {
        ...updatedTestCases[index],
        use_pattern: value === true,
        auto_detect: false,
        expected_output: '',
        pattern: value ? updatedTestCases[index].pattern : ''
      };
    } else {
      updatedTestCases[index] = {
        ...updatedTestCases[index],
        [field]: value
      };
    }

    setTestCases(updatedTestCases);
  };

  const handleAddTestCase = () => {
    setTestCases([...test_cases, getDefaultTestCase()]);
  };

  const handleRemoveTestCase = (index) => {
    setTestCases(test_cases.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    setIsSaving(true);
    setError('');

    const processedTestCases = test_cases.map(test => ({
      input: test.input || '',
      auto_detect: test.auto_detect === true,
      use_pattern: test.use_pattern === true,
      pattern: test.pattern || '',
      expected_output: test.auto_detect ? '' : (test.expected_output || '')
    }));


    try {

      const lessonData = {
        section_id: section.section_id,
        name: lessonName,
        content: editorData,
        xp: parseInt(xp),

        test_cases: processedTestCases,

        template_code: templateCode,
        hint,
        solution,
        auto_detect: test_cases[0]?.auto_detect || false
      };

      if (lesson) {
        // Update existing lesson
        const response = await axios.put(
          `${import.meta.env.VITE_API_URL}/lesson/${lesson.lesson_id}`,
          lessonData,
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.status === 200) {
          onSave(response.data);
        } else {
          setError('Failed to update lesson');
        }
      } else {
        // Create new lesson
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/lesson`,
          lessonData,
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.status === 201) {
          onSave(response.data);
        } else {
          setError('Failed to create lesson');
        }
      }
    } catch (err) {
      console.error('Error saving lesson:', err);
      setError(err.response?.data?.message || 'An error occurred while saving the lesson');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lesson?.lesson_id) return;
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/lesson/${lesson.lesson_id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      onDelete(lesson.lesson_id);
    } catch (err) {
      console.error('Error deleting lesson:', err);
      alert('Failed to delete lesson.');
    }
  };

  return (
    <div className={`lesson-edit-add-container ${isSaving ? 'loading' : ''}`}>
      {isSaving && <div className="loader">Saving...</div>}
      {error && <ErrorAlert message={error} onClose={() => setError('')} />}

      <h3 className="form-title">
        {lesson ? '✏️ Edit Lesson' : '➕ Add New Lesson'}
      </h3>

      <form className="lesson-form">
        <div className="form-group">
          <label className="edit-add-label">📝 Lesson Name</label>
          <input
            type="text"
            value={lessonName}
            onChange={(e) => setLessonName(e.target.value)}
            placeholder="Enter a descriptive name for the lesson"
          />
          {error && <p className="error">{error}</p>}
        </div>

        <div className="form-group">
          <label className="edit-add-label">📚 Lesson Content</label>
          <div className="editor-container">
            <CustomEditor
              initialData={editorData}
              onChange={setEditorData}
              className="lesson-editor"
              config={{
                placeholder: "Start writing your lesson content here...",
              }}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="edit-add-label">🏆 Experience Points (XP)</label>
          <input
            type="number"
            value={xp}
            onChange={(e) => setXp(Number(e.target.value))}
            placeholder="Enter XP value"
            min="0"
          />
        </div>

        <div className="form-group">
          <label className="edit-add-label">🧪 Test Cases</label>

          <div className="test-cases">
            <h3>Test Cases</h3>
            {test_cases.map((testCase, index) => (
              <div key={index} className="test-case">
                <div className="test-case-header">
                  <h4>Test Case {index + 1}</h4>
                  <button type="button" onClick={() => handleRemoveTestCase(index)}>Remove</button>
                </div>

                {/* Input and Expected Output */}
                <div className="test-case-inputs">
                  <div className="form-group">
                    <label>Input</label>
                    <textarea
                      value={testCase.input}
                      onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Expected Output</label>
                    <textarea
                      value={testCase.expected_output}
                      onChange={(e) => handleTestCaseChange(index, 'expected_output', e.target.value)}
                    />
                  </div>
                </div>

                {/* Validation Options */}
                <div className="validation-options">
                  {/* Normal Test Case */}
                  <div className="validation-option">
                    <label>
                      <input
                        type="checkbox"
                        checked={!testCase.auto_detect && !testCase.use_pattern}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleTestCaseChange(index, 'auto_detect', false);
                            handleTestCaseChange(index, 'use_pattern', false);
                          }
                        }}
                      />
                      Normal Test Case
                      <FaQuestionCircle className="help-icon" title="Use this when you want to check for an exact match between the student's output and your expected output." />
                    </label>
                  </div>

                  {/* Auto-detect Option */}
                  <div className="validation-option">
                    <label>
                      <input
                        type="checkbox"
                        checked={testCase.auto_detect}
                        onChange={(e) => handleTestCaseChange(index, 'auto_detect', e.target.checked)}
                      />
                      Auto-detect Output
                      <FaQuestionCircle className="help-icon" title="Use this when you want to accept any console output. Useful for exercises where the output might vary (e.g., random numbers, user input)." />
                    </label>
                  </div>

                  {/* Pattern Validation */}
                  <div className="validation-option">
                    <label>
                      <input
                        type="checkbox"
                        checked={testCase.use_pattern}
                        onChange={(e) => handleTestCaseChange(index, 'use_pattern', e.target.checked)}
                      />
                      Use Pattern Validation
                      <FaQuestionCircle className="help-icon" title="Use this when you want to accept multiple possible outputs. Define valid outputs separated by | (e.g., 'Yes|No|Maybe' will accept any of these three answers)." />
                    </label>
                    {testCase.use_pattern && (
                      <div className="pattern-input">
                        <input
                          type="text"
                          value={testCase.pattern}
                          onChange={(e) => handleTestCaseChange(index, 'pattern', e.target.value)}
                          placeholder="e.g., Heads|Tails"
                        />
                        <span className="pattern-hint">
                          Separate valid outputs with | (e.g., Yes|No|Maybe)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={handleAddTestCase}>Add Test Case</button>
          </div>
        </div>

        <div className="form-group">
          <label className="edit-add-label">🔧 Starter Template Code</label>
          <div className="editor-container" style={{ height: "400px", marginBottom: "1rem" }}>
            <SimpleMonacoEditor
              code={templateCode}
              setCode={setTemplateCode}
              language={languageId ? (languageMappings[languageId] || 'plaintext') : 'plaintext'}
            />
          </div>
          <small className="form-text text-muted">
            This code will be provided as a starting point for students.
            {languageId && languageMappings[languageId] && (
              <span> (Language: {languageMappings[languageId]})</span>
            )}
          </small>
        </div>

        <div className="form-group">
          <label className="edit-add-label">💡 Hint</label>
          <div className="editor-container">
            <CustomEditor
              initialData={hint}
              onChange={setHint}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="edit-add-label">✨ Solution</label>
          <div className="editor-container">
            <CustomEditor
              initialData={solution}
              onChange={setSolution}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="cancel-button">
            Cancel
          </button>
          {lesson?.lesson_id && (
            <button type="button" onClick={handleDelete} className="delete-button">
              <FaTrash /> Delete Lesson
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="save-button"
          >
            <FaSave /> {isSaving ? 'Saving...' : 'Save Lesson'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LessonEditAddComponent;

