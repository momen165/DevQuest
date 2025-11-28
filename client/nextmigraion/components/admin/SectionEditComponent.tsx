import React, { useState } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { FaEye, FaTrash, FaPlusCircle, FaEdit } from 'react-icons/fa';
import ViewLessonsComponent from './ViewLessonsComponent';
import AddEditSectionComponent from './AddEditSectionComponent';
import '@/styles/admin/SectionEditComponent.css';
import ErrorAlert from './ErrorAlert';
import { useAuth } from '@/contexts/AuthContext';

interface Section {
  section_id: number;
  name: string;
  description?: string;
  [key: string]: any;
}

interface SectionEditComponentProps {
  sections: Section[];
  courseId: number;
  onSectionUpdate: (sections: Section[]) => void;
  onDeleteSection: (sectionId: number) => void;
  onClose: () => void;
}

const SectionEditComponent: React.FC<SectionEditComponentProps> = ({ sections, courseId, onSectionUpdate, onDeleteSection, onClose }) => {
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [viewingSection, setViewingSection] = useState<Section | null>(null);
  const [saveError, setSaveError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const { user } = useAuth();
  const token = user?.token;

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const reorderedSections = Array.from(sections);
    const [movedSection] = reorderedSections.splice(result.source.index, 1);
    reorderedSections.splice(result.destination.index, 0, movedSection);

    onSectionUpdate(reorderedSections);

    try {
      const payload = reorderedSections.map((section, index) => ({
        section_id: section.section_id,
        order: index,
      }));
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/sections/reorder`,
        { sections: payload },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err) {
      console.error('Error reordering sections:', err);
      alert('Failed to reorder sections. Please try again.');
    }
  };

  const handleAddSection = () => {
    setIsAdding(true);
    setEditingSection(null);
  };

  const handleSaveSection = async (sectionData: any) => {
    try {
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      if (sectionData.section_id) {
        const response = await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/sections/${sectionData.section_id}`,
          sectionData,
          config
        );
        onSectionUpdate(
          sections.map((section) =>
            section.section_id === response.data.section_id ? response.data : section
          )
        );
      } else {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/sections`,
          sectionData,
          config
        );
        onSectionUpdate([...sections, response.data]);
      }
      setEditingSection(null);
      setIsAdding(false);
    } catch (err: any) {
      console.error('Error saving section:', err);
      const errorMessage =
        err.message === 'Authentication token not found'
          ? 'Please log in to continue'
          : 'Failed to save the section. Please try again.';
      setSaveError(errorMessage);
    }
  };

  return viewingSection ? (
    <ViewLessonsComponent
      section={viewingSection}
      onClose={() => setViewingSection(null)}
    />
  ) : editingSection || isAdding ? (
    <AddEditSectionComponent
      section={editingSection}
      courseId={courseId}
      onSave={handleSaveSection}
      onCancel={() => {
        setEditingSection(null);
        setIsAdding(false);
      }}
    />
  ) : (
    <div className="section-edit-container">
      {saveError && (
        <ErrorAlert
          message={saveError}
          onClose={() => setSaveError('')}
        />
      )}
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
