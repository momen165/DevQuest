import React, { useState, useEffect } from 'react';
import { FaSave, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import 'pages/admin/styles/LessonEditAddComponent.css';
import CustomEditor from '../../../components/CustomEditor';
import ErrorAlert from './ErrorAlert';
import { useAuth } from 'AuthContext'; // Import useAuth for context

const LessonEditAddComponent = ({ section, lesson = null, onSave, onCancel, onDelete }) => {
  const [lessonName, setLessonName] = useState(lesson?.name || '');
  const [editorData, setEditorData] = useState(lesson?.content || '');
  const [xp, setXp] = useState(lesson?.xp || 0);
  const [error, setError] = useState('');
  const { user } = useAuth(); // Get user from context

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

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  useEffect(() => {
    console.log('Lesson data:', lesson);
    console.log('Parsed test cases:', test_cases);
  }, [lesson, test_cases]);
  useEffect(() => {
    if (lesson) {
      console.log('Lesson data received from API:', lesson);
      setLessonName(lesson.name || '');
      setEditorData(lesson.content || '');
      setXp(lesson.xp || 0);
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
          input: test.input,
          expected_output: test.expected_output.replace(/\r\n/g, '\n') // Normalize line endings
        }));

      // Prepare lesson data
      const lessonData = {
        name: lessonName.trim(),
        content: editorData,
        section_id: section.section_id,
        xp: parseInt(xp) || 0,
        test_cases: formattedTestCases
      };

      if (lesson?.lesson_id) {
        lessonData.lesson_id = lesson.lesson_id;
      }

      console.log('Saving lesson with data:', lessonData);
      await onSave(lessonData);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to save lesson');
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