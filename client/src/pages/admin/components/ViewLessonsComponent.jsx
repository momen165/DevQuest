import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FaEdit, FaTrash, FaPlusCircle } from 'react-icons/fa';
import axios from 'axios';
import LessonEditAddComponent from './LessonEditAddComponent';
import '../../../pages/admin/styles/ViewLessonsComponent.css';
import ErrorAlert from './ErrorAlert';


import { useAuth } from '../../../AuthContext';
import CircularProgress from "@mui/material/CircularProgress";

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

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/lesson?section_id=${section.section_id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const lessonsWithFormattedContent = response.data.map(lesson => ({
        ...lesson,
        content: lesson.content || '',
        template_code: lesson.template_code || '' // Ensure template_code is loaded as is
      }));



      setLessons(lessonsWithFormattedContent || []);
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
      setLoading(true);
      setError('');

      // Send lesson data as is, without encoding template_code
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/lesson/${lessonData.lesson_id}`,
        lessonData,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        // Update lessons list with the updated lesson
        const updatedLessons = lessons.map(lesson =>
          lesson.lesson_id === lessonData.lesson_id ? response.data : lesson
        );
        setLessons(updatedLessons);
        setEditingLesson(null);
      } else {
        setError('Failed to update lesson');
      }
    } catch (err) {
      console.error('Error saving lesson:', err);
      setError(err.response?.data?.message || 'An error occurred while saving the lesson');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    setLoading(true);
    setError('');
    try {
      if (!user?.token) {
        throw new Error('Authentication token is missing. Please log in again.');
      }

      await axios.delete(`${import.meta.env.VITE_API_URL}/lesson/${lessonId}`, {
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
      await axios.post(`${import.meta.env.VITE_API_URL}/lesson/reorder`, {
        lessons: payload
      },
        {
          headers: { Authorization: `Bearer ${user.token}` }
        }

      );

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
        <div className="centered-loader">
          <CircularProgress />
        </div>
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
