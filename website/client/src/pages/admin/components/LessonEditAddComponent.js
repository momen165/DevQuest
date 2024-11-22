import React, { useState, useEffect } from 'react';
import { FaSave, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import DOMPurify from 'dompurify';
import 'pages/admin/styles/LessonEditAddComponent.css';
import CustomEditor from '../../../components/CustomEditor';

const LessonEditAddComponent = ({ section, lesson = null, onSave, onCancel, onDelete }) => {
  const [lessonName, setLessonName] = useState(lesson?.name || '');
  const [editorData, setEditorData] = useState(lesson?.content || '');
  const [xp, setXp] = useState(lesson?.xp || 0);
  const [test_cases, setTestCases] = useState(() => {
    if (lesson?.test_cases) {
      try {
        const cases = Array.isArray(lesson.test_cases)
          ? lesson.test_cases
          : JSON.parse(lesson.test_cases);
        return cases.map(test => ({
          input: test.input || '',
          expectedOutput: test.expectedOutput || '',
        }));
      } catch (error) {
        console.error('Error parsing initial test cases:', error);
      }
    }
    return [{ input: '', expectedOutput: '' }];
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

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

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload = {
        name: lessonName,
        content: DOMPurify.sanitize(editorData),
        section_id: section.section_id,
        xp,
        testCases: test_cases.map((testCase) => ({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput.replace(/\\n/g, '\n'),
        })),
      };

      console.log('Sending payload:', payload);

      let savedLesson;
      if (lesson?.lesson_id) {
        const response = await axios.put(
          `http://localhost:5000/api/lessons/${lesson.lesson_id}`,
          payload
        );
        savedLesson = response.data;

        if (savedLesson.test_cases) {
          const parsedTestCases = Array.isArray(savedLesson.test_cases)
            ? savedLesson.test_cases
            : JSON.parse(savedLesson.test_cases);

          setTestCases(parsedTestCases.map(test => ({
            input: test.input || '',
            expectedOutput: test.expectedOutput || '',
          })));
        }
      } else {
        const response = await axios.post(
          `http://localhost:5000/api/lessons`,
          payload
        );
        savedLesson = response.data;
      }

      onSave(savedLesson);
    } catch (err) {
      console.error('Error saving lesson:', err);
      alert('Failed to save lesson. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lesson?.lesson_id) return;
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/lessons/${lesson.lesson_id}`);
      onDelete(lesson.lesson_id);
    } catch (err) {
      console.error('Error deleting lesson:', err);
      alert('Failed to delete lesson.');
    }
  };

  const handleAddTestCase = () => {
    setTestCases([...test_cases, { input: '', expectedOutput: '' }]);
  };

  const handleTestCaseChange = (index, updatedTestCase) => {
    const updatedTestCases = [...test_cases];
    updatedTestCases[index] = updatedTestCase;
    setTestCases(updatedTestCases);
  };

  const handleRemoveTestCase = (index) => {
    const updatedTestCases = test_cases.filter((_, i) => i !== index);
    setTestCases(updatedTestCases);
  };

  return (
    <div className={`lesson-edit-add-container ${isSaving ? 'loading' : ''}`}>
      {isSaving && <div className="loader">Saving...</div>}
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
                  handleTestCaseChange(index, { ...testCase, input: e.target.value })
                }
                placeholder={`Input ${index + 1}`}
              />
              <input
                type="text"
                value={testCase.expectedOutput}
                onChange={(e) =>
                  handleTestCaseChange(index, { ...testCase, expectedOutput: e.target.value })
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
            Save <FaSave />
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
