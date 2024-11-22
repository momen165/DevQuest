import React, { useState, useEffect } from 'react';
import { FaSave, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import DOMPurify from 'dompurify';
import 'pages/admin/styles/LessonEditAddComponent.css';
import CustomEditor from '../../../components/CustomEditor';
import ErrorAlert from './ErrorAlert';

const LessonEditAddComponent = ({ section, lesson = null, onSave, onCancel, onDelete }) => {
  const [lessonName, setLessonName] = useState(lesson?.name || '');
  const [editorData, setEditorData] = useState(lesson?.content || '');
  const [xp, setXp] = useState(lesson?.xp || 0);
  const [error, setError] = useState('');
  const [test_cases, setTestCases] = useState(() => {
    // Initialize test cases properly
    if (lesson?.test_cases) {
      try {
        const cases = Array.isArray(lesson.test_cases) 
          ? lesson.test_cases 
          : JSON.parse(lesson.test_cases);
        return cases.map(test => ({
          input: test.input || '',
          expectedOutput: test.expected_output || test.expectedOutput || ''
        }));
      } catch (error) {
        console.error('Error parsing test cases:', error);
        return [{ input: '', expectedOutput: '' }];
      }
    }
    return [{ input: '', expectedOutput: '' }];
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
              expectedOutput: test.expectedOutput || '',
            }))
          );
        } catch (error) {
          console.error('Error parsing test cases:', error);
          setTestCases([{ input: '', expectedOutput: '' }]);
        }
      } else {
        setTestCases([{ input: '', expectedOutput: '' }]);
      }
    }
  }, [lesson]);

  const validateTestCases = () => {
    const newErrors = {};
    if (test_cases.length === 0) {
      newErrors.testCases = 'At least one test case is required.';
    } else {
      test_cases.forEach((testCase, index) => {
        if (!testCase.input.trim()) {
          newErrors[`testCaseInput${index}`] = `Test case ${index + 1} input is required.`;
        }
        if (!testCase.expectedOutput.trim()) {
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

  const validateForm = () => {
    const errors = [];
    
    if (!lessonName.trim()) {
      errors.push('Lesson name is required');
    }
    
    if (!editorData.trim()) {
      errors.push('Lesson content is required');
    }
    
    if (!xp || xp <= 0) {
      errors.push('XP must be a positive number');
    }
  
    // Validate test cases if they exist
    if (test_cases.length > 0) {
      const invalidTests = test_cases.some(test => !test.input.trim() || !test.expectedOutput.trim());
      if (invalidTests) {
        errors.push('All test cases must have both input and expected output');
      }
    }
  
    return errors;
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
  
      // Format test cases - remove empty ones and format properly
      const formattedTestCases = test_cases
        .filter(test => test.input.trim() && test.expectedOutput.trim())
        .map(test => ({
          input: test.input.trim(),
          expected_output: test.expectedOutput.trim() // Match database column name
        }));
  
      // Prepare lesson data
      const lessonData = {
        name: lessonName.trim(),
        content: editorData.trim(),
        section_id: section.section_id,
        xp: parseInt(xp) || 0,
        test_cases: formattedTestCases // Send formatted test cases
      };
  
      if (lesson?.lesson_id) {
        lessonData.lesson_id = lesson.lesson_id;
      }
  
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
      await axios.delete(`http://localhost:5000/api/lesson/${lesson.lesson_id}`);
      onDelete(lesson.lesson_id);
    } catch (err) {
      console.error('Error deleting lesson:', err);
      alert('Failed to delete lesson.');
    }
  };

  const handleAddTestCase = () => {
    setTestCases([...test_cases, { input: '', expectedOutput: '' }]);
  };

  const handleTestCaseChange = (index, field, value) => {
    const updatedTestCases = [...test_cases];
    updatedTestCases[index] = {
      ...updatedTestCases[index],
      [field]: value
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
      {error && (
        <ErrorAlert 
          message={error}
          onClose={() => setError('')}
        />
      )}
      <h3 className="form-title">{lesson ? 'Edit Lesson' : 'Add Lesson'}</h3>
      <form className="lesson-form">
        <div className="form-group">
          <label>Lesson Name:</label>
          <input
            type="text"
            value={lessonName}
            onChange={(e) => setLessonName(e.target.value)}
            placeholder="Enter lesson name"
          />
          {errors.lessonName && <p className="error">{errors.lessonName}</p>}
        </div>

        <div className="editor-container">
          <CustomEditor
            initialData={editorData}
            onChange={(data) => setEditorData(data)}
            className="lesson-editor"
            config={{
              placeholder: "Enter lesson content here...",
            }}
          />
        </div>

        <div className="form-group">
          <label>XP:</label>
          <input
            type="number"
            value={xp}
            onChange={(e) => setXp(Number(e.target.value))}
            placeholder="Enter XP value"
          />
        </div>

        <div className="form-group">
          <label>Test Cases:</label>
          {test_cases.map((testCase, index) => (
            <div key={index} className="test-case">
              <input
                type="text"
                value={testCase.input}
                onChange={(e) =>
                  handleTestCaseChange(index, 'input', e.target.value)
                }
                placeholder={`Input ${index + 1}`}
              />
              <input
                type="text"
                value={testCase.expectedOutput}
                onChange={(e) =>
                  handleTestCaseChange(index, 'expectedOutput', e.target.value)
                }
                placeholder={`Expected Output ${index + 1}`}
              />
              <button
                type="button"
                className="remove-test-case-button"
                onClick={() => handleRemoveTestCase(index)}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="add-test-case-button"
            onClick={handleAddTestCase}
          >
            Add More Test Cases
          </button>
          {errors.testCases && <p className="error">{errors.testCases}</p>}
        </div>

        <div className="form-actions">
          <button type="button" onClick={handleSave} disabled={isSaving} className="save-button">
            {isSaving ? 'Saving...' : 'Save'} <FaSave />
          </button>
          {lesson?.lesson_id && (
            <button type="button" onClick={handleDelete} className="delete-button">
              Delete <FaTrash />
            </button>
          )}
          <button type="button" onClick={onCancel} className="cancel-button">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default LessonEditAddComponent;
