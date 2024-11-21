import React, { useState } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FaEye, FaTrash, FaPlusCircle, FaEdit } from 'react-icons/fa';
import ViewLessonsComponent from './ViewLessonsComponent';
import AddEditSectionComponent from './AddEditSectionComponent';
import 'pages/admin/styles/SectionEditComponent.css';

const SectionEditComponent = ({ sections, courseId, onSectionUpdate, onDeleteSection, onClose }) => {
  const [editingSection, setEditingSection] = useState(null);
  const [viewingSection, setViewingSection] = useState(null);

  // Handle drag-and-drop reordering
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const reorderedSections = Array.from(sections);
    const [movedSection] = reorderedSections.splice(result.source.index, 1);
    reorderedSections.splice(result.destination.index, 0, movedSection);

    // Update local state
    onSectionUpdate(reorderedSections);

    // Send reordering to the backend
    try {
      const payload = reorderedSections.map((section, index) => ({
        section_id: section.section_id,
        order: index,
      }));
      await axios.post('http://localhost:5000/api/sections/reorder', { sections: payload });
    } catch (err) {
      console.error('Error reordering sections:', err);
      alert('Failed to reorder sections. Please try again.');
    }
  };

  // Open Add Section form
  const handleAddSection = () => {
    setEditingSection({}); // Set to empty object for new section
  };

  // Save section (add or edit)
  const handleSaveSection = async (sectionData) => {
    try {
      if (sectionData.section_id) {
        // Update existing section
        const response = await axios.put(
          `http://localhost:5000/api/section/${sectionData.section_id}`,
          sectionData
        );
        onSectionUpdate(
          sections.map((section) =>
            section.section_id === response.data.section_id ? response.data : section
          )
        );
      } else {
        // Add new section
        const response = await axios.post(
          `http://localhost:5000/api/section`,
          sectionData
        );
        onSectionUpdate([...sections, response.data]);
      }
      setEditingSection(null); // Reset editing state
    } catch (err) {
      console.error('Error saving section:', err);
      alert('Failed to save the section. Please try again.');
    }
  };

  return viewingSection ? (
    <ViewLessonsComponent
      section={viewingSection}
      onClose={() => setViewingSection(null)}
    />
  ) : editingSection ? (
    <AddEditSectionComponent
      section={editingSection}
      courseId={courseId}
      onSave={handleSaveSection}
      onCancel={() => setEditingSection(null)}
    />
  ) : (
    <div className="section-edit-container">
      <h3>Manage Sections</h3>
      <div className="add-section-container">
        <button className="add-section-button" onClick={handleAddSection}>
          Add Section <FaPlusCircle />
        </button>
      </div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="sections">
          {(provided) => (
            <table className="section-table" ref={provided.innerRef} {...provided.droppableProps}>
              <thead>
                <tr>
                  <th>Section Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section, index) => (
                  <Draggable
                    key={section.section_id}
                    draggableId={String(section.section_id)}
                    index={index}
                  >
                    {(provided) => (
                      <tr
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <td>{section.name}</td>
                        <td>
                          <FaEye
                            className="icon view-lessons-icon"
                            onClick={() => setViewingSection(section)}
                            title="View Lessons"
                          />
                          <FaEdit
                             className="icon edit-section-icon"
                            onClick={() => setEditingSection(section)}
                            title="Edit Section"
                          />
                          <FaTrash
                            className="icon delete-section-icon"
                            onClick={() => onDeleteSection(section.section_id)}
                            title="Delete Section"
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
      <button className="close-button" onClick={onClose}>
        Close
      </button>
    </div>
  );
};

export default SectionEditComponent;
