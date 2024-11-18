import React, { useState } from 'react';
import { FaSave, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import ReactQuill from 'react-quill'; // Import ReactQuill
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
import 'pages/admin/styles/LessonEditAddComponent.css';

const LessonEditAddComponent = ({ section, lesson = null, onSave, onDelete, onCancel }) => {
  const [lessonName, setLessonName] = useState(lesson?.name || '');
  const [lessonContent, setLessonContent] = useState(lesson?.content || '');
  const [expectedOutput, setExpectedOutput] = useState(lesson?.expected_output || '');
  const [xp, setXp] = useState(lesson?.xp || 0); // XP input for the lesson
  const [testCases, setTestCases] = useState(lesson?.testCases || ['']); // Test cases input
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (lesson?.lesson_id) {
        // Update existing lesson
        const response = await axios.put(
          `http://localhost:5000/api/lessons/${lesson.lesson_id}`,
          {
            name: lessonName,
            content: lessonContent, // Save rich text content
            expected_output: expectedOutput,
            xp,
          }
        );
        onSave(response.data);
      } else {
        // Add new lesson
        const response = await axios.post('http://localhost:5000/api/lessons', {
          name: lessonName,
          content: lessonContent, // Save rich text content
          section_id: section.section_id,
          expected_output: expectedOutput,
          xp,
        });
        onSave(response.data);
      }
    } catch (err) {
      console.error('Error saving lesson:', err);
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
    }
  };

  const handleAddTestCase = () => {
    setTestCases([...testCases, '']);
  };

  const handleTestCaseChange = (index, value) => {
    const updatedTestCases = [...testCases];
    updatedTestCases[index] = value;
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
        </div>
        <div className="form-group">
          <label>Lesson Content:</label>
          <ReactQuill
            value={lessonContent}
            onChange={setLessonContent}
            placeholder="Enter lesson content"
            theme="snow"
            modules={{
              toolbar: [
                [{ header: [1, 2, false] }],
                ['bold', 'italic', 'underline', 'strike'], // Formatting
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['link', 'image'], // Links and images
                ['clean'], // Remove formatting
              ],
            }}
          />
        </div>
        <div className="form-group">
          <label>XP:</label>
          <input
            type="number"
            value={xp}
            onChange={(e) => setXp(e.target.value)}
            placeholder="Enter XP value"
          />
        </div>
        <div className="form-group">
          <label>Expected Output:</label>
          <textarea
            value={expectedOutput}
            onChange={(e) => setExpectedOutput(e.target.value)}
            placeholder="Enter expected output"
          ></textarea>
        </div>
        <div className="form-group">
          <label>Test Cases:</label>
          {testCases.map((testCase, index) => (
            <div key={index} className="test-case">
              <input
                type="text"
                value={testCase}
                onChange={(e) => handleTestCaseChange(index, e.target.value)}
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
