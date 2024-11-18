import React, { useState } from 'react';
import { FaEye, FaTrash, FaPlusCircle, FaEdit } from 'react-icons/fa';
import AddEditSectionComponent from './AddEditSectionComponent';
import ViewLessonsComponent from './ViewLessonsComponent'; // Import the View Lessons component
import 'pages/admin/styles/SectionEditComponent.css';

const SectionEditComponent = ({
  sections,
  courseId,
  onSectionUpdate,
  onDeleteSection,
  onClose,
}) => {
  const [isEditingSection, setIsEditingSection] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [isViewingLessons, setIsViewingLessons] = useState(false); // State for toggling view lessons
  const [viewingSection, setViewingSection] = useState(null); // Track the section for viewing lessons

  // Handle adding a new section
  const handleAddSection = () => {
    setEditingSection(null); // Clear any previous editing state
    setIsEditingSection(true); // Enable Add mode
  };

  // Handle editing an existing section
  const handleEditSection = (section) => {
    setEditingSection(section); // Set the section to be edited
    setIsEditingSection(true); // Enable Edit mode
  };

  // Save a new or edited section
  const handleSaveSection = (newSection) => {
    const updatedSections = editingSection
      ? sections.map((section) =>
          section.section_id === newSection.section_id ? newSection : section
        )
      : [...sections, newSection];
    onSectionUpdate(updatedSections); // Update sections in parent component
    setIsEditingSection(false); // Exit Add/Edit mode
  };

  // Cancel Add/Edit section operation
  const handleCancel = () => {
    setIsEditingSection(false);
  };

  // Handle viewing lessons for a specific section
  const handleViewLessons = (section) => {
    setViewingSection(section); // Set the section for which lessons are being viewed
    setIsViewingLessons(true); // Enable view lessons mode
  };

  // Close the view lessons mode
  const handleCloseLessons = () => {
    setIsViewingLessons(false); // Disable view lessons mode
    setViewingSection(null); // Clear selected section for lessons
  };

  // Render Lessons View
  if (isViewingLessons) {
    return (
      <ViewLessonsComponent
        section={viewingSection} // Pass the section object for context
        onClose={handleCloseLessons}
      />
    );
  }

  // Render Add/Edit Section View
  if (isEditingSection) {
    return (
      <AddEditSectionComponent
        section={editingSection}
        courseId={courseId}
        onSave={handleSaveSection}
        onCancel={handleCancel}
      />
    );
  }

  // Render Default Section Table
  return (
    <div className="section-edit-container">
      <h3>Manage Sections</h3>
      <div className="add-section-container">
        <button className="add-section-button" onClick={handleAddSection}>
          Add Section <FaPlusCircle />
        </button>
      </div>
      <table className="section-table">
        <thead>
          <tr>
            <th>Section Name</th>
            <th>Lessons</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <tr key={section.section_id}>
              <td>{section.name}</td>
              <td>
                <FaEye
                  className="icon view-lessons-icon"
                  onClick={() => handleViewLessons(section)} // Trigger view lessons
                  title="View Lessons"
                />
              </td>
              <td>
                <FaEdit
                  className="icon edit-section-icon"
                  onClick={() => handleEditSection(section)}
                  title="Edit Section"
                />
                <FaTrash
                  className="icon delete-section-icon"
                  onClick={() => onDeleteSection(section.section_id)}
                  title="Delete Section"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="save-button" onClick={onClose}>
        Close
      </button>
    </div>
  );
};

export default SectionEditComponent;
