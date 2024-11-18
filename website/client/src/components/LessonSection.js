import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'styles/LessonSection.css';

const LessonList = ({ sectionName, sectionId }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleList = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const fetchLessons = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`http://localhost:5000/api/lessons?section_id=${sectionId}`);
        setLessons(response.data.lessons || response.data); // Handle cases where lessons array exists
      } catch (err) {
        setError('Failed to fetch lessons.');
        console.error('Error fetching lessons:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [sectionId]);

  return (
    <div className="lesson-list">
      <h3 onClick={toggleList} className="lesson-title">
        {sectionName} <span className="arrow">{isOpen ? '▲' : '▼'}</span>
      </h3>
      {isOpen && (
        <div>
          {loading ? (
            <p>Loading lessons...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : lessons.length === 0 ? (
            <p>No lessons found for this section.</p>
          ) : (
            <ul>
              {lessons.map((lesson) => (
                <li key={lesson.lesson_id} className="lesson">
                  <input type="checkbox" /> {lesson.name} <span>Start ➔</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default LessonList;
