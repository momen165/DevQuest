import React, { useState, useEffect } from 'react';
import { FaSave, FaTrash } from 'react-icons/fa';
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
          expected_output: test.expected_output || ''
        }));
      } catch (error) {
        console.error('Error parsing test cases:', error);
        return [{ input: '', expected_output: '' }];
      }
    }
    return [{ input: '', expected_output: '' }];
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
      console.log('Lesson data received from API:', lesson);
      setLessonName(lesson.name || '');
      setEditorData(lesson.content || '');
      setXp(lesson.xp || 0);
      setHint(lesson.hint || '');
      setSolution(lesson.solution || '');
      
      // Ensure template code is treated as raw text
      const rawTemplateCode = lesson.template_code || '';
      console.log('Raw template code before setting:', rawTemplateCode);
      setTemplateCode(rawTemplateCode);

      if (lesson.test_cases) {
        try {
          const parsedCases = Array.isArray(lesson.test_cases)
              ? lesson.test_cases
              : JSON.parse(lesson.test_cases);
          setTestCases(
              parsedCases.map(test => ({
                input: test.input || '',
                expected_output: test.expected_output || '',
              }))
          );
        } catch (error) {
          console.error('Error parsing test cases:', error);
          setTestCases([{ input: '', expected_output: '' }]);
        }
      } else {
        setTestCases([{ input: '', expected_output: '' }]);
      }
    }
  }, [lesson]);

  const validateTestCases = () => {
    const newErrors = {};
    if (test_cases.length === 0) {
      newErrors.testCases = 'At least one test case is required.';
    } else {
      test_cases.forEach((testCase, index) => {
        if (!testCase.expected_output.trim()) {
          newErrors[`testCaseOutput${index}`] = `Test case ${index + 1} expected output is required.`;
        }
      });
    }
    return newErrors;
  };

  const validate = () => {
    const errors = {
      ...validateTestCases(),
      ...(lessonName.trim() ? {} : { lessonName: 'Lesson name is required.' }),
    };
    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditorChange = (data) => {
    console.log('Editor content changed:', data);
    setEditorData(data);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');

      // Validate required fields
      if (!lessonName.trim()) {
        setError('Lesson name is required');
        return;
      }

      if (!editorData.trim()) {
        setError('Lesson content is required');
        return;
      }

      // Format test cases - remove empty ones and preserve formatting
      const formattedTestCases = test_cases
        .filter(test => test.expected_output.trim())
        .map(test => ({
          input: test.input.trim(),
          expected_output: test.expected_output.replace(/\r\n/g, '\n').replace(/^\s+|\s+$/g, '') // Normalize whitespace
        }));

      // Prepare lesson data - ensure template code is raw
      const lessonData = {
        name: lessonName.trim(),
        content: editorData,
        section_id: section.section_id,
        xp: parseInt(xp) || 0,
        test_cases: formattedTestCases,
        template_code: templateCode ,
        hint,        // Add hint
        solution  // Use raw template code directly
      };

      if (lesson?.lesson_id) {
        lessonData.lesson_id = lesson.lesson_id;
      }

      console.log('Saving lesson with raw template code:', lessonData.template_code);
      await onSave(lessonData);
      setError('');
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
    setTestCases([...test_cases, { input: '', expected_output: '' }]);
  };

  const handleTestCaseChange = (index, field, value) => {
    const updatedTestCases = [...test_cases];
    updatedTestCases[index] = {
      ...updatedTestCases[index],
      [field]: field === 'expected_output' ? value.replace(/\r\n/g, '\n') : value
    };
    setTestCases(updatedTestCases);
  };

  const handleRemoveTestCase = (index) => {
    const updatedTestCases = test_cases.filter((_, i) => i !== index);
    setTestCases(updatedTestCases);
  };

  const [hint, setHint] = useState(lesson?.hint || '');
  const [solution, setSolution] = useState(lesson?.solution || '');

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
          {test_cases.map((testCase, index) => (
            <div key={index} className="test-case">
              <input
                type="text"
                value={testCase.input}
                onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                placeholder="Test input (optional)"
              />
              <textarea
                value={testCase.expected_output}
                onChange={(e) => handleTestCaseChange(index, 'expected_output', e.target.value)}
                placeholder="Expected output (required)"
                required
              />
              <button
                type="button"
                className="remove-test-case-button"
                onClick={() => handleRemoveTestCase(index)}
              >
                Remove Test Case
              </button>
            </div>
          ))}
          <button
            type="button"
            className="add-test-case-button"
            onClick={handleAddTestCase}
          >
            + Add New Test Case
          </button>
          {errors.testCases && <p className="error">{errors.testCases}</p>}
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
          <label className="edit-add-label">🏆 Hint</label>
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
          <button type="button" onClick={handleSave} disabled={isSaving} className="save-button">
            <FaSave /> {isSaving ? 'Saving...' : 'Save Lesson'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LessonEditAddComponent;