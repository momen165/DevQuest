import React, { useState, useEffect } from 'react';
import { FaSave, FaTrash, FaQuestionCircle } from 'react-icons/fa';
import axios from 'axios';
import 'pages/admin/styles/LessonEditAddComponent.css';
import CustomEditor from '../../../components/CustomEditor';
import SimpleMonacoEditor from '../../../components/SimpleMonacoEditor';
import ErrorAlert from './ErrorAlert';
import { useAuth } from 'AuthContext'; // Import useAuth for context
import he from 'he'; // Import the he library for HTML entity decoding

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
  const [lessonName, setLessonName] = useState(lesson?.name || '');
  const [editorData, setEditorData] = useState(() => {
    if (lesson?.content) {
      return lesson.content;
    }
    return DEFAULT_LESSON_TEMPLATE;
  });
  const [xp, setXp] = useState(lesson?.xp || 0);
  const [error, setError] = useState('');
  const { user } = useAuth(); // Get user from context
  const [languageId, setLanguageId] = useState(null);

  const [test_cases, setTestCases] = useState(() => {
    if (lesson?.test_cases) {
      try {
        const cases = Array.isArray(lesson.test_cases) 
          ? lesson.test_cases 
          : JSON.parse(lesson.test_cases);
        return cases.map(test => ({
          input: test.input || '',
          expected_output: test.expected_output || '',
          auto_detect: Boolean(test.auto_detect),
          use_pattern: Boolean(test.use_pattern),
          pattern: test.pattern || ''
        }));
      } catch (error) {
        console.error('Error parsing test cases:', error);
        return [{ input: '', expected_output: '', auto_detect: false, use_pattern: false, pattern: '' }];
      }
    }
    return [{ input: '', expected_output: '', auto_detect: false, use_pattern: false, pattern: '' }];
  });

  const [templateCode, setTemplateCode] = useState(lesson?.template_code || '');

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  useEffect(() => {
    console.log('Lesson data:', lesson);
    console.log('Parsed test cases:', test_cases);
  }, [lesson, test_cases]);
  useEffect(() => {
    const fetchCourseLanguage = async () => {
      try {
        if (!section?.section_id) {
          console.log('No section_id available:', section);
          return;
        }

        // First get section data to get course_id
        console.log('Fetching section data:', section);
        const sectionResponse = await axios.get(`http://localhost:5000/api/sections/${section.section_id}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });

        if (!sectionResponse.data?.course_id) {
          console.error('No course_id in section response:', sectionResponse.data);
          return;
        }

        // Then get course data to get language_id
        console.log('Fetching course data for course_id:', sectionResponse.data.course_id);
        const courseResponse = await axios.get(`http://localhost:5000/api/courses/${sectionResponse.data.course_id}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        
        if (courseResponse.data?.language_id) {
          const courseLanguageId = courseResponse.data.language_id;
          console.log('Course Language ID:', courseLanguageId);
          console.log('Language Mapping:', languageMappings[courseLanguageId]);
          setLanguageId(courseLanguageId);
        } else {
          console.error('No language_id found in course data:', courseResponse.data);
        }
      } catch (err) {
        if (err.response?.status === 403) {
          // Token expired, try to refresh or redirect to login
          console.error('Token expired, please log in again');
          // You might want to trigger a logout or token refresh here
        } else {
          console.error('Error fetching course language:', err);
          setError('Failed to fetch course language');
        }
      }
    };

    if (section?.section_id) {
      fetchCourseLanguage();
    } else {
      console.log('No section_id available:', section);
    }
  }, [section, user.token]);

  useEffect(() => {
    if (lesson) {
      setLessonName(lesson.name || '');
      setEditorData(lesson.content || '');
      setXp(lesson.xp || 0);
      setTemplateCode(lesson.template_code || '');
      
      // Process test cases with pattern validation data
      if (lesson.test_cases) {
        const processedTestCases = lesson.test_cases.map(test => ({
          input: test.input || '',
          expected_output: test.expected_output || '',
          auto_detect: test.auto_detect || false,
          use_pattern: test.use_pattern || false,
          pattern: test.pattern || ''
        }));
        setTestCases(processedTestCases);
      }
    }
  }, [lesson]);

  const validateTestCases = () => {
    const newErrors = {};
    
    // Require at least one test case
    if (test_cases.length === 0) {
      newErrors.testCases = 'At least one test case is required.';
      return newErrors;
    }

    test_cases.forEach((testCase, index) => {
      // Input is always required
      if (!testCase.input.trim()) {
        newErrors[`testCase${index}`] = `Test case ${index + 1} input is required.`;
      }

      // Only check for expected output if auto-detect is OFF and pattern validation is OFF
      if (!testCase.auto_detect && !testCase.use_pattern && !testCase.expected_output.trim()) {
        newErrors[`testCaseOutput${index}`] = `Test case ${index + 1} expected output is required.`;
      }

      // If auto-detect is on, only check for console.log presence
      if (testCase.auto_detect && !testCase.input.includes('console.log')) {
        newErrors[`testCase${index}`] = `Test case ${index + 1} must include at least one console.log statement when auto-detect is enabled.`;
      }
    });

    return newErrors;
  };

  const validate = () => {
    if (!lessonName.trim()) {
      setError('Lesson name is required');
      return false;
    }

    // Validate test cases
    for (const testCase of test_cases) {
      // Only require expected output if neither auto-detect nor pattern validation is enabled
      if (!testCase.auto_detect && !testCase.use_pattern && !testCase.expected_output.trim()) {
        setError('Test case expected output is required');
        return false;
      }
      // Require pattern if pattern validation is enabled
      if (testCase.use_pattern && !testCase.pattern.trim()) {
        setError('Pattern is required when pattern validation is enabled');
        return false;
      }
    }

    return true;
  };

  const handleEditorChange = (data) => {
    console.log('Editor content changed:', data);
    setEditorData(data);
  };

  // Helper function to extract console.log content
  const extractConsoleLogOutput = (code) => {
    try {
      // Match different types of console.log patterns
      const patterns = [
        /console\.log\((["'`])(.*?)\1\)/g,  // String literals
        /console\.log\(([^"'`\n]+)\)/g,      // Variables and expressions
        /console\.log\(`([^`]+)`\)/g         // Template literals
      ];

      let outputs = [];
      for (const regex of patterns) {
        const matches = [...code.matchAll(regex)];
        outputs = outputs.concat(matches.map(match => match[2] || match[1]));
      }

      return outputs.join('\n');
    } catch (error) {
      console.error('Error extracting console.log output:', error);
      return '';
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');

      if (!validate()) return;

      const lessonData = {
        name: lessonName,
        content: editorData,
        xp: parseInt(xp),
        test_cases: test_cases.map(test => ({
          input: test.input || '',
          expected_output: test.auto_detect ? null : (test.expected_output || ''),
          auto_detect: Boolean(test.auto_detect),
          use_pattern: Boolean(test.use_pattern),
          pattern: test.pattern || ''
        })),
        section_id: section.section_id,
        template_code: templateCode,
        hint,
        solution
      };

      if (lesson?.lesson_id) {
        lessonData.lesson_id = lesson.lesson_id;
      }

      await onSave(lessonData);
    } catch (error) {
      console.error('Error saving lesson:', error);
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lesson?.lesson_id) return;
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await axios.delete(`/api/lesson/${lesson.lesson_id}`,{
        headers: { Authorization: `Bearer ${user.token}` }, // Use token from context
      });
      onDelete(lesson.lesson_id);
    } catch (err) {
      console.error('Error deleting lesson:', err);
      alert('Failed to delete lesson.');
    }
  };

  const handleAddTestCase = () => {
    setTestCases([
      ...test_cases,
      {
        input: '',
        expected_output: '',
        auto_detect: false,
        use_pattern: false,
        pattern: ''  // e.g., "Heads|Tails" for coin flip
      }
    ]);
  };

  const handleTestCaseChange = (index, field, value) => {
    const updatedTestCases = [...test_cases];
    
    if (field === 'auto_detect') {
      updatedTestCases[index] = {
        ...updatedTestCases[index],
        auto_detect: value,
        // When auto-detect is enabled, we don't need expected output
        expected_output: '',
        // Disable pattern validation when auto-detect is enabled
        use_pattern: false,
        pattern: ''
      };
    } else if (field === 'use_pattern') {
      updatedTestCases[index] = {
        ...updatedTestCases[index],
        use_pattern: value,
        // Disable auto-detect when pattern validation is enabled
        auto_detect: false,
        pattern: value ? updatedTestCases[index].pattern : '',
        expected_output: ''
      };
    } else {
      updatedTestCases[index] = {
        ...updatedTestCases[index],
        [field]: value
      };
    }
    
    setTestCases(updatedTestCases);
  };

  const handleRemoveTestCase = (index) => {
    const updatedTestCases = test_cases.filter((_, i) => i !== index);
    setTestCases(updatedTestCases);
  };

  const [hint, setHint] = useState(lesson?.hint || '');
  const [solution, setSolution] = useState(lesson?.solution || '');

  // Add debug logs
  useEffect(() => {
    console.log('Lesson loaded:', lesson);
  }, [lesson]);

  // Add a new state for pattern validation
  const [usePatternValidation, setUsePatternValidation] = useState(false);
  const [validationPattern, setValidationPattern] = useState('');

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
          {errors.lessonName && <p className="error">{errors.lessonName}</p>}
        </div>

        <div className="form-group">
          <label className="edit-add-label">📚 Lesson Content</label>
          <div className="editor-container">
            <CustomEditor
              initialData={editorData}
              onChange={handleEditorChange}
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