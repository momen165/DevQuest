import React from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';
import 'pages/admin/styles/SectionEditComponent.css';
const SectionEditComponent = ({ sections, onSectionUpdate, onDeleteSection, onClose }) => {
  const handleEditLesson = (sectionIndex, lessonIndex) => {
    // Function to edit a specific lesson within a section
  };

  const handleDeleteSection = (sectionIndex) => {
    onDeleteSection(sectionIndex);
  };

  return (
    <div className="section-edit-container">
      <h3>Edit Sections</h3>
      <table className="section-table">
        <thead>
          <tr>
            <th>Section Name</th>
            <th>Lessons</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section, sectionIndex) => (
            <tr key={sectionIndex}>
              <td>{section.name}</td>
              <td>
                {section.lessons.map((lesson, lessonIndex) => (
                  <FaEdit
                    key={lessonIndex}
                    className="icon edit-lesson-icon"
                    onClick={() => handleEditLesson(sectionIndex, lessonIndex)}
                  />
                ))}
              </td>
              <td>
                <FaEdit
                  className="icon edit-section-icon"
                  onClick={() => onSectionUpdate(sectionIndex)}
                />
                <FaTrash
                  className="icon delete-section-icon"
                  onClick={() => handleDeleteSection(sectionIndex)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="save-button" onClick={onClose}>Save</button>
    </div>
  );
};

export default SectionEditComponent;
