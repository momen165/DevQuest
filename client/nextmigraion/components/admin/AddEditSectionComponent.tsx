import React, { useState } from 'react';
import '@/styles/admin/SectionEditComponent.css';
import ErrorAlert from './ErrorAlert';

interface Section {
  section_id?: number;
  name: string;
  description?: string;
}

interface AddEditSectionComponentProps {
  section: Section | null;
  courseId: number;
  onSave: (section: any) => void;
  onCancel: () => void;
}

const AddEditSectionComponent: React.FC<AddEditSectionComponentProps> = ({ section, courseId, onSave, onCancel }) => {
  const [sectionName, setSectionName] = useState(section?.name || '');
  const [sectionDescription, setSectionDescription] = useState(section?.description || '');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (sectionName.trim()) {
      onSave({
        section_id: section?.section_id || null,
        course_id: courseId,
        name: sectionName,
        description: sectionDescription,
      });
    } else {
      setError('Section name is required.');
    }
  };

  return (
    <div className="edit-course-form">
      <h2>{section?.section_id ? 'Edit Section' : 'Add Section'}</h2>
      {error && (
        <ErrorAlert 
          message={error}
          onClose={() => setError('')}
        />
      )}
      <label>Section Name</label>
      <input
        type="text"
        value={sectionName}
        onChange={(e) => setSectionName(e.target.value)}
        placeholder="Enter section name"
      />
      <label>Description</label>
      <textarea
        value={sectionDescription}
        onChange={(e) => setSectionDescription(e.target.value)}
        placeholder="Enter section description"
      ></textarea>
      <div>
        <button onClick={handleSave}>Save</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

export default AddEditSectionComponent;
