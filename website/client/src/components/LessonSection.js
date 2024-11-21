import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'styles/LessonSection.css';
import { useNavigate } from 'react-router-dom';

const LessonList = ({ sectionName, sectionId }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const toggleList = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const fetchLessons = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`http://localhost:5000/api/lessons?section_id=${sectionId}`);
    
        // Ensure response.data is an array
        const lessons = Array.isArray(response.data) ? response.data : [];
        // Optionally, sort lessons if the server doesn't return them in order
        const sortedLessons = lessons.sort((a, b) => (a.order || 0) - (b.order || 0));
        setLessons(sortedLessons);
      } catch (err) {
        setError('Failed to fetch lessons.');
        console.error('Error fetching lessons:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLessons();
  }, [sectionId]);

  const handleStartLesson = (lessonId) => {
    navigate(`/lesson/${lessonId}`);
  };

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
                  <input type="checkbox" /> {lesson.name}{' '}
                  <span onClick={() => handleStartLesson(lesson.lesson_id)}>Start ➔</span>
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
