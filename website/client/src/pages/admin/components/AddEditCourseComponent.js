import React, { useState } from 'react';
import axios from 'axios';
import 'pages/admin/styles/AddEditCourseComponent.css';

const EditCourseForm = ({ course, onClose }) => {
  const [title, setTitle] = useState(course ? course.title : ''); // Update to use course.title
  const [description, setDescription] = useState(course ? course.description : '');
  const [status, setStatus] = useState(course?.status || 'Published');
  const [difficulty, setDifficulty] = useState(course?.difficulty || 'Beginner');
  const [image, setImage] = useState(null); // New state for image file
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setError('');

    const userData = JSON.parse(localStorage.getItem('user'));
    const token = userData.token;

    try {
      const formData = new FormData();
      formData.append('title', title); // Update to send title instead of name
      formData.append('description', description);
      formData.append('status', status);
      formData.append('difficulty', difficulty);
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
        console.log('Course updated:', response.data);
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
        console.log('Course added:', response.data);
      }
      onClose();
    } catch (err) {
      setError('Failed to save the course. Please try again.');
      console.error('Error saving course:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-course-form">
      <h2>{course ? 'Edit Course' : 'Add New Course'}</h2>
      {error && <div className="error-message">{error}</div>}
      <div>
        <label>Course Title</label> {/* Update label to "Course Title" */}
        <input
          type="text"
          value={title} // Update to use title
          onChange={(e) => setTitle(e.target.value)} // Update to setTitle
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
      <div>
        <label className="Course-Image-uploadBtn">Course Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
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
