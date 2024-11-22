import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FaEdit, FaTrash, FaPlusCircle } from 'react-icons/fa';
import axios from 'axios';
import LessonEditAddComponent from './LessonEditAddComponent';
import 'pages/admin/styles/ViewLessonsComponent.css';
import ErrorAlert from './ErrorAlert';

import { useAuth } from 'AuthContext';

const ViewLessonsComponent = ({ section, onClose }) => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingLesson, setEditingLesson] = useState(null);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const { user } = useAuth();
  const fetchLessons = async () => {
    setLoading(true);
    setError('');
    try {
      if (!user?.token) {
        throw new Error('Authentication token is missing. Please log in again.');
      }
  
      const response = await axios.get(`http://localhost:5000/api/lesson?section_id=${section.section_id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        }
      });
      
      setLessons(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch lessons');
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (section?.section_id) fetchLessons();
  }, [section]);

  
  const handleSaveLesson = async (lessonData) => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      const token = userData?.token;
  
      if (!token) {
        throw new Error('Authentication required');
      }
  
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };
  
      if (lessonData.lesson_id) {
        // Update existing lesson
        await axios.put(
          `http://localhost:5000/api/lesson/${lessonData.lesson_id}`,
          lessonData,
          config
        );
      } else {
        // Create new lesson
        await axios.post(
          'http://localhost:5000/api/lesson',
          lessonData,
          config
        );
      }
  
      await fetchLessons(); // Refresh lessons list
      setEditingLesson(null);
      setIsAddingLesson(false);
    } catch (err) {
      console.error('Error saving lesson:', err);
      setError(err.response?.data?.error || 'Failed to save lesson');
      throw err; // Propagate error to LessonEditAddComponent
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    setLoading(true);
    setError('');
    try {
      if (!user?.token) {
        throw new Error('Authentication token is missing. Please log in again.');
      }
  
      await axios.delete(`http://localhost:5000/api/lesson/${lessonId}`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
  
      // Refresh lessons list after successful delete
      await fetchLessons();
  
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Unauthorized. Please log in again.');
      } else {
        setError(err.message || 'Failed to delete lesson');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
  
    const reorderedLessons = Array.from(lessons);
    const [movedLesson] = reorderedLessons.splice(result.source.index, 1);
    reorderedLessons.splice(result.destination.index, 0, movedLesson);
  
    setLessons(reorderedLessons);
  
    // Map the lessons array to only include lesson_id and order
    const payload = reorderedLessons.map((lesson, index) => ({
      lesson_id: lesson.lesson_id,
      order: index,
    }));
  
    try {
      await axios.post('http://localhost:5000/api/lesson/reorder', { lessons: payload });
      console.log('Reorder successful');
    } catch (err) {
      console.error('Error updating lesson order:', err);
    }
  };
  

  return (
    <div className="view-lessons-container">
      {error && <ErrorAlert message={error} onClose={() => setError('')} />}
      <h3>{section.name} Lessons</h3>
      <button className="add-lesson-button" onClick={() => setIsAddingLesson(true)}>
        Add Lesson <FaPlusCircle />
      </button>

      {loading ? (
        <p>Loading lessons...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : isAddingLesson || editingLesson ? (
        <LessonEditAddComponent
          section={section}
          lesson={editingLesson}
          onSave={handleSaveLesson}
          onDelete={handleDeleteLesson}
          onCancel={() => {
            setEditingLesson(null);
            setIsAddingLesson(false);
          }}
        />
      ) : lessons.length > 0 ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="lessons">
            {(provided) => (
              <table className="lesson-table" ref={provided.innerRef} {...provided.droppableProps}>
                <thead>
                  <tr>
                    <th>Lesson Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((lesson, index) => (
                    <Draggable
                      key={lesson.lesson_id}
                      draggableId={String(lesson.lesson_id)}
                      index={index}
                    >
                      {(provided) => (
                        <tr
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <td>{lesson.name}</td>
                          <td>
                            <FaEdit
                              className="icon edit-section-icon"
                              onClick={() => setEditingLesson(lesson)}
                              title="Edit Lesson"
                            />
                            <FaTrash
                              className="icon delete-section-icon"
                              onClick={() => handleDeleteLesson(lesson.lesson_id)}
                              title="Delete Lesson"
                            />
                          </td>
                        </tr>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </tbody>
              </table>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <p>No lessons available for this section.</p>
      )}
      <button className="close-button" onClick={onClose}>
        Close
      </button>
    </div>
  );
};

export default ViewLessonsComponent;
