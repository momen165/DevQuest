import React, { useState, useEffect } from 'react';
import { FaSave, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import { CKEditor } from '@ckeditor/ckeditor5-react'; // Corrected import
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import 'pages/admin/styles/LessonEditAddComponent.css';


const LessonEditAddComponent = ({ section, lesson = null, onSave, onDelete, onCancel }) => {
  const [lessonName, setLessonName] = useState(lesson?.name || '');
  const [editorData, setEditorData] = useState(lesson?.content || '');  // Default CKEditor data
  const [expectedOutput, setExpectedOutput] = useState(lesson?.expected_output || '');
  const [xp, setXp] = useState(lesson?.xp || 0);
  const [testCases, setTestCases] = useState(lesson?.testCases || ['']);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (lesson) {
      setEditorData(lesson.content || '');  // Update CKEditor content when lesson changes
      setExpectedOutput(lesson.expected_output || '');
      setXp(lesson.xp || 0);
      setTestCases(lesson.testCases || ['']);
    }
  }, [lesson]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const rawContent = editorData; // CKEditor content
      let savedLesson;
  
      if (lesson?.lesson_id) {
        const response = await axios.put(
          `http://localhost:5000/api/lessons/${lesson.lesson_id}`,
          { name: lessonName, content: rawContent, expected_output: expectedOutput, xp }
        );
        savedLesson = response.data;
      } else {
        const response = await axios.post('http://localhost:5000/api/lessons', {
          name: lessonName,
          content: rawContent,
          section_id: section.section_id,
          expected_output: expectedOutput,
          xp,
        });
        savedLesson = response.data;
      }
  
      // Pass the saved lesson back to the parent
      onSave(savedLesson);
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

        {/* CKEditor Container */}
        <div className="editor-container">
          <CKEditor
            editor={ClassicEditor}
            data={editorData}  // Bind data to CKEditor
            onChange={(event, editor) => {
              setEditorData(editor.getData());  // Capture CKEditor data
            }}
          />
        </div>

        {/* Additional fields for expected output and XP */}
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

        {/* Action buttons */}
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
