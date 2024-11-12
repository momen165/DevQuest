// EditCourseForm.js
import React, { useState } from 'react';
import 'pages/admin/styles/AddEditCourseComponent.css';

const EditCourseForm = ({ course, onClose }) => {
  const [name, setName] = useState(course.name);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Published');
  const [difficulty, setDifficulty] = useState('Beginner');

  const handleSave = () => {
    // Add logic to save the edited course details
    onClose(); // Close the form after saving
  };

  return (
    <div className="edit-course-form">
      <h2>Add/Edit Course</h2>
      <div>
        <label>Course Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
        </select>
      </div>
      <div>
        <label>Difficulty</label>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
      </div>
      <button onClick={handleSave}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
};

export default EditCourseForm;
