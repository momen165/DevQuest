import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../../pages/admin/styles/AddEditCourseComponent.css';
import { FaUpload } from 'react-icons/fa';
import ErrorAlert from './ErrorAlert';

const EditCourseForm = ({
  course,
  onClose,
  onSave,
  languageOptions = [
    { id: '100', name: 'Python (3.12.5)' },
    { id: '62', name: 'Java (OpenJDK 13.0.1)' },
    { id: '105', name: 'C++ (GCC 14.1.0)' },
    { id: '102', name: 'JavaScript (Node.js 22.08.0)' },
    { id: '68', name: 'PHP (7.4.1)' },
    { id: '72', name: 'Ruby (2.7.0)' },
    { id: '104', name: 'C (Clang 18.1.8)' },
    { id: '101', name: 'TypeScript (5.6.2)' },
    { id: '78', name: 'Kotlin (1.3.70)' },
    { id: '73', name: 'Rust (1.40.0)' },
    { id: '51', name: 'C# (Mono 6.6.0.161)' },
    { id: '95', name: 'Go (1.18.5)' },
    { id: '83', name: 'Swift (5.2.3)' },
    { id: '61', name: 'Haskell (GHC 8.8.1)' },
  ]
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Published');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [image, setImage] = useState(null);
  const [languageId, setLanguageId] = useState(languageOptions[0]?.id || '100');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (course) {
      setTitle(course.title || '');
      setDescription(course.description || '');
      setStatus(course.status || 'Published');
      setDifficulty(course.difficulty || 'Beginner');
      setLanguageId(course.language_id?.toString() || '100');
    }
  }, [course]);

  const handleSave = async () => {
    setError('');

    if (!title.trim()) {
      setError('Course title is required.');
      return;
    }
    if (!description.trim()) {
      setError('Course description is required.');
      return;
    }

    setLoading(true);

    const userData = JSON.parse(localStorage.getItem('user'));
    const token = userData?.token;

    if (!token) {
      setError('User is not authenticated.');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('status', status);
      formData.append('difficulty', difficulty);
      formData.append('language_id', languageId);

      if (image) {
        formData.append('image', image);
      }

      if (course && course.course_id) {
        await axios.put(`${import.meta.env.VITE_API_URL}/courses/${course.course_id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/courses`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      onSave();
    } catch (err) {
      console.error('Error saving course:', err);
      setError('Failed to save the course. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-course-form">
      <h2>{course ? 'Edit Course' : 'Add New Course'}</h2>

      {error && <ErrorAlert message={error} onClose={() => setError('')} />}

      <div>
        <label>Course Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
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

      <div>
        <label>Programming Language</label>
        <select value={languageId} onChange={(e) => setLanguageId(e.target.value)}>
          {languageOptions.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.name}
            </option>
          ))}
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

      <div className="form-actions">
        <button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          className="cancel-button"
          onClick={() => {
            if (typeof onClose === 'function') {
              onClose();
            }
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default EditCourseForm;