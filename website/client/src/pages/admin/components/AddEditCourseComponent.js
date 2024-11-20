import React, { useState } from 'react';
import axios from 'axios';
import 'pages/admin/styles/AddEditCourseComponent.css';
import { FaUpload } from 'react-icons/fa';

const EditCourseForm = ({ course, onClose }) => {
  const [title, setTitle] = useState(course ? course.title : '');
  const [description, setDescription] = useState(course ? course.description : '');
  const [status, setStatus] = useState(course?.status || 'Published');
  const [difficulty, setDifficulty] = useState(course?.level || '');
  const [image, setImage] = useState(null);
  const [languageId, setLanguageId] = useState(course?.language_id || ''); // New state for language_id
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setError('');

    // Input validation
    if (!title.trim() || !description.trim() || !status || !difficulty || !languageId) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);

    const userData = JSON.parse(localStorage.getItem('user'));
    const token = userData.token;

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('status', status);
      formData.append('difficulty', difficulty);
      formData.append('language_id', languageId); // Add language_id
      if (image) {
        formData.append('image', image);
      }

      if (course && course.course_id) {
        const response = await axios.put(
          `http://localhost:5000/api/editCourses/${course.course_id}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      } else {
        const response = await axios.post(
          'http://localhost:5000/api/addCourses',
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      }
      onClose();
    } catch (err) {
      setError('Failed to save the course. Please try again.');
      console.error('Error saving course:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseError = () => {
    setError('');
  };

  return (
    <div className="edit-course-form">
      <h2>{course ? 'Edit Course' : 'Add New Course'}</h2>

      {error && (
        <div className="alert">
          {error}
          <span className="closebtn" onClick={handleCloseError}>
            &times;
          </span>
        </div>
      )}

      <div>
        <label>Course Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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

      {/* New language selector */}
      <div>
        <label>Programming Language</label>
        <select value={languageId} onChange={(e) => setLanguageId(e.target.value)}>
        <option value="">Select Language</option>
        <option value="71">Python (3.8.1)</option>
        <option value="62">Java (OpenJDK 13.0.1)</option>
        <option value="54">C++ (GCC 9.2.0)</option>
        <option value="63">JavaScript (Node.js 12.14.0)</option>
        <option value="68">PHP (7.4.1)</option>
        <option value="72">Ruby (2.7.0)</option>
        <option value="50">C (GCC 9.2.0)</option>
        <option value="74">TypeScript (3.7.4)</option>
        <option value="78">Kotlin (1.3.70)</option>
        <option value="73">Rust (1.40.0)</option>
        <option value="51">C# (Mono 6.6.0.161)</option>
        <option value="60">Go (1.13.5)</option>


        </select>
      </div>

      <div className="file-upload-container-isolated">
        <label htmlFor="file-upload-isolated" className="upload-button-isolated">
          <FaUpload className="upload-icon-isolated" />
          Upload Image
        </label>
        <input
          id="file-upload-isolated"
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
          style={{ display: 'none' }}
        />
      </div>
      <button onClick={handleSave} disabled={loading}>
        {loading ? 'Saving...' : 'Save'}
      </button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
};

export default EditCourseForm;
