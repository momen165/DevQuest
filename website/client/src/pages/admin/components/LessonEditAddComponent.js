import React, { useState, useEffect } from 'react';
import { FaSave, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import 'pages/admin/styles/LessonEditAddComponent.css';

const LessonEditAddComponent = ({ section, lesson = null, onSave, onDelete, onCancel }) => {
  const [lessonName, setLessonName] = useState(lesson?.name || '');
  const [editorData, setEditorData] = useState(lesson?.content || '');
  const [expectedOutput, setExpectedOutput] = useState(lesson?.expected_output || '');
  const [xp, setXp] = useState(lesson?.xp || 0);
  const [testCases, setTestCases] = useState(
    lesson?.testCases?.length > 0 ? lesson.testCases : [{ input: '', expectedOutput: '' }]
  );
  
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (lesson) {
      setLessonName(lesson.name || '');
      setEditorData(lesson.content || '');
      setExpectedOutput(lesson.expected_output || '');
      setXp(lesson.xp || 0);
      setTestCases(lesson.testCases || [{ input: '', expectedOutput: '' }]);
    }
  }, [lesson]);

  const validate = () => {
    const newErrors = {};
  
    if (!lessonName.trim()) newErrors.lessonName = 'Lesson name is required.';
    if (testCases.length === 0) {
      newErrors.testCases = 'At least one test case is required.';
    } else {
      testCases.forEach((testCase, index) => {
        if (!testCase.input.trim()) {
          newErrors[`testCaseInput${index}`] = `Test case ${index + 1} input is required.`;
        }
        if (!testCase.expectedOutput.trim()) {
          newErrors[`testCaseOutput${index}`] = `Test case ${index + 1} expected output is required.`;
        }
      });
    }
  
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Return true if no errors
  };
  
  const handleSave = async () => {
    if (!validate()) return;
  
    setIsSaving(true);
    try {
      const payload = {
        name: lessonName,
        content: editorData,
        section_id: section.section_id,
        xp,
        testCases: testCases.map((testCase) => ({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput.replace(/\\n/g, '\n'), // Convert camel case to snake case
        })),
      };
      
      console.log('Payload to API:', payload); // Debug log
      
      let savedLesson;
      if (lesson?.lesson_id) {
        const response = await axios.put(
          `http://localhost:5000/api/lessons/${lesson.lesson_id}`,
          payload
        );
        savedLesson = response.data;
      } else {
        const response = await axios.post('http://localhost:5000/api/lessons', payload);
        savedLesson = response.data;
      }
  
      onSave(savedLesson);
    } catch (err) {
      console.error('Error saving lesson:', err);
    } finally {
      setIsSaving(false);
    }
    console.log('Final Test Cases:', testCases);

  };
  

  const handleDelete = async () => {
    if (!lesson?.lesson_id) return;
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/lessons/${lesson.lesson_id}`);
      onDelete(lesson.lesson_id);
    } catch (err) {
      console.error('Error deleting lesson:', err);
    }
  };

  const handleAddTestCase = () => {
    setTestCases([...testCases, { input: '', expectedOutput: '' }]);
  };

  const handleTestCaseChange = (index, updatedTestCase) => {
    const updatedTestCases = [...testCases];
    updatedTestCases[index] = updatedTestCase; // Replace the specific test case
    setTestCases(updatedTestCases);
  };
  
  const handleRemoveTestCase = (index) => {
    const updatedTestCases = testCases.filter((_, i) => i !== index);
    setTestCases(updatedTestCases);
  };

  return (
    <div className="lesson-edit-add-container">
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
          <CKEditor
            editor={ClassicEditor}
            data={editorData}
            onChange={(event, editor) => setEditorData(editor.getData())}
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
          {testCases.map((testCase, index) => (
            <div key={index} className="test-case">
              <input
                type="text"
                value={testCase.input}
                onChange={(e) =>
                  handleTestCaseChange(index, { ...testCase, input: e.target.value })
                }
                placeholder={`Input ${index + 1}`}
              />
              {errors[`testCaseInput${index}`] && (
                <p className="error">{errors[`testCaseInput${index}`]}</p>
              )}
              <input
                type="text"
                value={testCase.expectedOutput}
                onChange={(e) =>
                  handleTestCaseChange(index, { ...testCase, expectedOutput: e.target.value })
                }
                placeholder={`Expected Output ${index + 1}`}
              />
              {errors[`testCaseOutput${index}`] && (
                <p className="error">{errors[`testCaseOutput${index}`]}</p>
              )}
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
