import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  FiEdit2, 
  FiTrash2, 
  FiPlus, 
  FiArrowLeft,
  FiMove,
  FiFileText
} from 'react-icons/fi';
import LessonForm from './LessonForm';
import 'pages/admin/styles/AdminManage.css';
import ErrorAlert from './ErrorAlert';
import { useAuth } from 'AuthContext';
import { useLessons } from 'hooks/useLessons';
import CircularProgress from "@mui/material/CircularProgress";

const LessonList = ({ section, onClose }) => {
  const [editingLesson, setEditingLesson] = useState(null);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const { user } = useAuth();
  
  const {
    lessons,
    loading,
    error,
    saveLesson,
    deleteLesson,
    reorderLessons
  } = useLessons(section?.section_id, user?.token);
  const handleSaveLesson = async (lessonData) => {
    const result = await saveLesson(lessonData);
    if (result.success) {
      setEditingLesson(null);
      setIsAddingLesson(false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (window.confirm('Are you sure you want to delete this lesson?')) {
      await deleteLesson(lessonId);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const reorderedLessons = Array.from(lessons);
    const [movedLesson] = reorderedLessons.splice(result.source.index, 1);
    reorderedLessons.splice(result.destination.index, 0, movedLesson);

    await reorderLessons(reorderedLessons);
  };


  return (
    <div className="manage-container">
      {error && <ErrorAlert message={error} onClose={() => {}} />}
      
      <div className="manage-header">
        <button className="manage-back-btn" onClick={onClose}>
          <FiArrowLeft size={18} />
          Back to Sections
        </button>
        <div className="manage-header-title">
          <h2 className="manage-title">{section.name}</h2>
        </div>
        {!isAddingLesson && !editingLesson && (
          <button className="btn btn-primary" onClick={() => setIsAddingLesson(true)}>
            <FiPlus size={18} />
            Add Lesson
          </button>
        )}
      </div>

      {loading ? (
        <div className="manage-loading">
          <CircularProgress className="manage-loading-spinner" />
        </div>
      ) : isAddingLesson || editingLesson ? (
        <LessonForm
          section={section}
          lesson={editingLesson}
          onSave={handleSaveLesson}
          onDelete={handleDeleteLesson}
          onCancel={() => {
            setEditingLesson(null);
            setIsAddingLesson(false);
          }}
        />
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="lessons">
            {(provided) => (
              <div 
                className="item-list" 
                ref={provided.innerRef} 
                {...provided.droppableProps}
              >
                {lessons.length === 0 ? (
                  <div className="list-empty">
                    <FiFileText className="list-empty-icon" />
                    <h3 className="list-empty-title">No lessons yet</h3>
                    <p className="list-empty-text">
                      Add your first lesson to this section
                    </p>
                  </div>
                ) : (
                  lessons.map((lesson, index) => (
                    <Draggable
                      key={lesson.lesson_id}
                      draggableId={String(lesson.lesson_id)}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          className={`item-card lesson-card ${snapshot.isDragging ? 'item-card-dragging' : ''}`}
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          <div 
                            className="item-drag-handle"
                            {...provided.dragHandleProps}
                          >
                            <FiMove size={16} />
                          </div>
                          <div className="item-content">
                            <span className="item-order">{index + 1}</span>
                            <span className="item-name">{lesson.name}</span>
                          </div>
                          <div className="item-actions">
                            <button
                              className="action-btn action-btn-edit"
                              onClick={() => setEditingLesson(lesson)}
                              title="Edit Lesson"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              className="action-btn action-btn-delete"
                              onClick={() => handleDeleteLesson(lesson.lesson_id)}
                              title="Delete Lesson"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
};

export default LessonList;
