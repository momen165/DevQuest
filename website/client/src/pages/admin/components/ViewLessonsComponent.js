import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlusCircle } from 'react-icons/fa';
import axios from 'axios';
import LessonEditAddComponent from './LessonEditAddComponent';
import 'pages/admin/styles/ViewLessonsComponent.css';

const ViewLessonsComponent = ({ section, onClose }) => {
  const [lessons, setLessons] = useState([]); // Lessons state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingLesson, setEditingLesson] = useState(null); // Track lesson being edited
  const [isAddingLesson, setIsAddingLesson] = useState(false); // Track if adding a new lesson
  const [isProcessing, setIsProcessing] = useState(false); // Track save/delete actions

  // Fetch lessons for the given section
  const fetchLessons = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(
        `http://localhost:5000/api/lessons?section_id=${section.section_id}`
      );
      setLessons(Array.isArray(response.data) ? response.data : []); // Ensure it's an array
    } catch (err) {
      console.error('Error fetching lessons:', err);
      setError('Failed to fetch lessons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (section?.section_id) {
      fetchLessons();
    }
  }, [section]);

  // Handle save operation from LessonEditAddComponent
  const handleSaveLesson = async () => {
    setIsProcessing(true);
    try {
      // After saving, refresh lessons by fetching from backend
      await fetchLessons();
    } catch (error) {
      console.error('Error saving lesson:', error);
      setError('Failed to save lesson.');
    } finally {
      setEditingLesson(null);
      setIsAddingLesson(false);
      setIsProcessing(false);
    }
  };

  // Handle delete operation for lessons
  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) {
      return;
    }
    setIsProcessing(true);
    try {
      await axios.delete(`http://localhost:5000/api/lessons/${lessonId}`);
      // Refresh lessons after deletion
      await fetchLessons();
    } catch (err) {
      console.error('Error deleting lesson:', err);
      setError('Failed to delete lesson.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Add Lesson form
  const handleAddLesson = () => {
    setEditingLesson(null); // Clear any editing state
    setIsAddingLesson(true); // Enable Add mode
  };

  // Open Edit Lesson form
  const handleEditLesson = (lesson) => {
    setEditingLesson(lesson); // Set the lesson being edited
    setIsAddingLesson(false); // Ensure not in add mode
  };

  // Close Add/Edit Lesson form
  const handleCancel = () => {
    setEditingLesson(null);
    setIsAddingLesson(false);
  };

  return (
    <div className="view-lessons-container">
      <h3>{section.name} Lessons</h3>

      <div className="add-lesson-container">
        <button
          className="add-lesson-button"
          onClick={handleAddLesson} // Trigger Add Lesson form
        >
          Add Lesson <FaPlusCircle />
        </button>
      </div>

      {loading ? (
        <p>Loading lessons...</p>
      ) : error ? (
        <p className="error">{error}</p> // Display the error message if set
      ) : isAddingLesson || editingLesson ? (
        <LessonEditAddComponent
          section={section}
          lesson={editingLesson} // Pass lesson if editing, null if adding
          onSave={handleSaveLesson} // Save handler
          onDelete={handleDeleteLesson} // Delete handler (only for edit mode)
          onCancel={handleCancel} // Cancel handler
        />
      ) : lessons.length > 0 ? (
        <table className="lesson-table">
          <thead>
            <tr>
              <th>Lesson Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson) => (
              <tr key={lesson.lesson_id}>
                <td>{lesson.name}</td>
                <td>
                  <FaEdit
                    className="icon edit-lesson-icon"
                    onClick={() => handleEditLesson(lesson)} // Open Edit Lesson form
                    title="Edit Lesson"
                    aria-label="Edit Lesson"
                  />
                  <FaTrash
                    className="icon delete-lesson-icon"
                    onClick={() => handleDeleteLesson(lesson.lesson_id)} // Trigger delete
                    title="Delete Lesson"
                    aria-label="Delete Lesson"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No lessons available for this section.</p> // Show message if no lessons are present
      )}

      <button className="save-button" onClick={onClose}>
        Close
      </button>
    </div>
  );
};

export default ViewLessonsComponent;
