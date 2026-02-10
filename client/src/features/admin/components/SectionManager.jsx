import React, { Suspense, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FiEye, FiTrash2, FiPlus, FiEdit2, FiArrowLeft, FiMove, FiFolder } from "react-icons/fi";
import SectionForm from "./SectionForm";
import "./AdminManage.css";
import ErrorAlert from "./ErrorAlert";
import { useSections } from "features/course/hooks/useSections";

const LessonList = React.lazy(() => import("./LessonList"));

const SectionManager = ({
  sections,
  courseId,
  languageId,
  onSectionUpdate,
  onDeleteSection,
  onClose,
}) => {
  const [editingSection, setEditingSection] = useState(null);
  const [viewingSection, setViewingSection] = useState(null);
  const { error: sectionError, saveSection, reorderSections } = useSections();

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const reorderedSections = Array.from(sections);
    const [movedSection] = reorderedSections.splice(result.source.index, 1);
    reorderedSections.splice(result.destination.index, 0, movedSection);

    onSectionUpdate(reorderedSections);
    await reorderSections(reorderedSections);
  };

  const handleAddSection = () => {
    setEditingSection({});
  };

  const handleSaveSection = async (sectionData) => {
    const result = await saveSection(sectionData);
    if (result.success) {
      if (result.isUpdate) {
        onSectionUpdate(
          sections.map((section) =>
            section.section_id === result.data.section_id ? result.data : section
          )
        );
      } else {
        onSectionUpdate([...sections, result.data]);
      }
      setEditingSection(null);
    }
  };

  return viewingSection ? (
    <Suspense fallback={<div className="manage-loading">Loading lessons...</div>}>
      <LessonList
        section={viewingSection}
        languageId={languageId}
        onClose={() => setViewingSection(null)}
      />
    </Suspense>
  ) : editingSection ? (
    <SectionForm
      section={editingSection}
      courseId={courseId}
      onSave={handleSaveSection}
      onCancel={() => setEditingSection(null)}
    />
  ) : (
    <div className="manage-container">
      {sectionError && <ErrorAlert message={sectionError} onClose={() => {}} />}

      <div className="manage-header">
        <button className="manage-back-btn" onClick={onClose}>
          <FiArrowLeft size={18} />
          Back to Courses
        </button>
        <button className="btn btn-primary" onClick={handleAddSection}>
          <FiPlus size={18} />
          Add Section
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="sections">
          {(provided) => (
            <div className="item-list" ref={provided.innerRef} {...provided.droppableProps}>
              {sections.length === 0 ? (
                <div className="list-empty">
                  <FiFolder className="list-empty-icon" />
                  <h3 className="list-empty-title">No sections yet</h3>
                  <p className="list-empty-text">
                    Add your first section to organize course content
                  </p>
                </div>
              ) : (
                sections.map((section, index) => (
                  <Draggable
                    key={section.section_id}
                    draggableId={String(section.section_id)}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        className={`item-card section-card ${snapshot.isDragging ? "item-card-dragging" : ""}`}
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                      >
                        <div className="item-drag-handle" {...provided.dragHandleProps}>
                          <FiMove size={16} />
                        </div>
                        <div className="item-content">
                          <span className="item-order">{index + 1}</span>
                          <span className="item-name">{section.name}</span>
                        </div>
                        <div className="item-actions">
                          <button
                            className="action-btn action-btn-sections"
                            onClick={() => setViewingSection(section)}
                            title="View Lessons"
                          >
                            <FiEye size={16} />
                          </button>
                          <button
                            className="action-btn action-btn-edit"
                            onClick={() => setEditingSection(section)}
                            title="Edit Section"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button
                            className="action-btn action-btn-delete"
                            onClick={() => onDeleteSection(section.section_id)}
                            title="Delete Section"
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
    </div>
  );
};

export default SectionManager;
