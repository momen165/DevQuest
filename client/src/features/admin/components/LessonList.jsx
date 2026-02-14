import React, { Suspense, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiArrowLeft,
  FiMove,
  FiFileText,
  FiAlertCircle,
} from "react-icons/fi";
import "./AdminManage.css";
import ErrorAlert from "./ErrorAlert";
import { useAuth } from "app/AuthContext";
import { useLessons } from "features/lesson/hooks/useLessons";
import CircularProgress from "@mui/material/CircularProgress";

const LessonForm = React.lazy(() => import("./LessonForm"));

const LessonList = ({
  section,
  languageId,
  selectedLessonId,
  onOpenLesson,
  onCloseLesson,
  onClose,
}) => {
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const { user } = useAuth();

  const { lessons, loading, error, fetchLessons, deleteLesson, reorderLessons } = useLessons(
    section?.section_id,
    user?.token
  );

  const editingLesson = useMemo(() => {
    if (!selectedLessonId) return null;
    return lessons.find((lesson) => String(lesson.lesson_id) === String(selectedLessonId));
  }, [lessons, selectedLessonId]);

  const isEditingLesson = Boolean(selectedLessonId);

  const handleSaveLesson = async () => {
    await fetchLessons();
    if (isEditingLesson) {
      onCloseLesson?.();
    } else {
      setIsAddingLesson(false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (window.confirm("Are you sure you want to delete this lesson?")) {
      const result = await deleteLesson(lessonId);
      if (result?.success && String(selectedLessonId) === String(lessonId)) {
        onCloseLesson?.();
      }
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
    <div
      className={`manage-container ${isAddingLesson || isEditingLesson ? "manage-container-wide" : ""}`}
    >
      {error && <ErrorAlert message={error} onClose={() => {}} />}

      <div className="manage-header">
        <button className="manage-back-btn" onClick={onClose}>
          <FiArrowLeft size={18} />
          Back to Sections
        </button>
        <div className="manage-header-title">
          <h2 className="manage-title">{section.name}</h2>
        </div>
        {!isAddingLesson && !isEditingLesson && (
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
      ) : isEditingLesson && !editingLesson ? (
        <div className="list-empty">
          <FiAlertCircle className="list-empty-icon" />
          <h3 className="list-empty-title">Lesson not found</h3>
          <p className="list-empty-text">This lesson URL is invalid or the lesson was removed.</p>
          <button className="manage-back-btn" onClick={onCloseLesson}>
            <FiArrowLeft size={18} />
            Back to Lessons
          </button>
        </div>
      ) : isAddingLesson || isEditingLesson ? (
        <Suspense fallback={<div className="manage-loading">Loading lesson form...</div>}>
          <LessonForm
            section={section}
            lesson={editingLesson}
            languageId={languageId}
            onSave={handleSaveLesson}
            onDelete={handleDeleteLesson}
            onCancel={() => {
              if (isEditingLesson) {
                onCloseLesson?.();
              } else {
                setIsAddingLesson(false);
              }
            }}
          />
        </Suspense>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="lessons">
            {(provided) => (
              <div className="item-list" ref={provided.innerRef} {...provided.droppableProps}>
                {lessons.length === 0 ? (
                  <div className="list-empty">
                    <FiFileText className="list-empty-icon" />
                    <h3 className="list-empty-title">No lessons yet</h3>
                    <p className="list-empty-text">Add your first lesson to this section</p>
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
                          className={`item-card lesson-card ${snapshot.isDragging ? "item-card-dragging" : ""}`}
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          <div className="item-drag-handle" {...provided.dragHandleProps}>
                            <FiMove size={16} />
                          </div>
                          <div className="item-content">
                            <span className="item-order">{index + 1}</span>
                            <button
                              type="button"
                              className="item-name-button"
                              onClick={() =>
                                onOpenLesson?.(section.section_id, lesson.lesson_id)
                              }
                            >
                              {lesson.name}
                            </button>
                          </div>
                          <div className="item-actions">
                            <button
                              className="action-btn action-btn-edit"
                              onClick={() => onOpenLesson?.(section.section_id, lesson.lesson_id)}
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
