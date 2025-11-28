import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { FaEdit, FaTrash, FaPlusCircle } from 'react-icons/fa';
import axios from 'axios';
import LessonEditAddComponent from './LessonEditAddComponent';
import '@/styles/admin/ViewLessonsComponent.css';
import ErrorAlert from './ErrorAlert';
import { useAuth } from '@/contexts/AuthContext';
import CircularProgress from "@mui/material/CircularProgress";

interface Section {
  section_id: number;
  name: string;
}

interface Lesson {
  lesson_id: number;
  name: string;
  content?: string;
  template_code?: string;
  [key: string]: any;
}

interface ViewLessonsComponentProps {
  section: Section;
  onClose: () => void;
}

const ViewLessonsComponent: React.FC<ViewLessonsComponentProps> = ({ section, onClose }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const { user } = useAuth();

  const fetchLessons = async () => {
    setLoading(true);
    setError('');
    try {
      if (!user?.token) {
        throw new Error('Authentication token is missing. Please log in again.');
      }      
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/lessons?section_id=${section.section_id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const lessonsWithFormattedContent = response.data.map((lesson: Lesson) => ({
        ...lesson,
        content: lesson.content || '',
        template_code: lesson.template_code || ''
      }));

      setLessons(lessonsWithFormattedContent || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch lessons');
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (section?.section_id) fetchLessons();
  }, [section]);


  const handleSaveLesson = async (lessonData: Lesson) => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/lesson/${lessonData.lesson_id}`,
        lessonData,
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        const updatedLessons = lessons.map(lesson =>
          lesson.lesson_id === lessonData.lesson_id ? response.data : lesson
        );
        setLessons(updatedLessons);
        setEditingLesson(null);
      } else {
        setError('Failed to update lesson');
      }
    } catch (err: any) {
      console.error('Error saving lesson:', err);
      setError(err.response?.data?.message || 'An error occurred while saving the lesson');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: number) => {
    setLoading(true);
    setError('');
    try {
      if (!user?.token) {
        throw new Error('Authentication token is missing. Please log in again.');
      }

      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/lesson/${lessonId}`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });

      await fetchLessons();

    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Unauthorized. Please log in again.');
      } else {
        setError(err.message || 'Failed to delete lesson');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const reorderedLessons = Array.from(lessons);
    const [movedLesson] = reorderedLessons.splice(result.source.index, 1);
    reorderedLessons.splice(result.destination.index, 0, movedLesson);

    setLessons(reorderedLessons);

    const payload = reorderedLessons.map((lesson, index) => ({
      lesson_id: lesson.lesson_id,
      order: index,
    }));

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/lesson/reorder`, {
        lessons: payload
      },
        {
          headers: { Authorization: `Bearer ${user?.token}` }
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
