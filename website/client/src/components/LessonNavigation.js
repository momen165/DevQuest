import React from 'react';
import { useNavigate } from 'react-router-dom';
import 'styles/LessonNavigation.css';

const LessonNavigation = ({ lessonId, totalLessons }) => {
  const navigate = useNavigate();

  const goToPreviousLesson = () => {
    if (lessonId > 1) navigate(`/lesson/${lessonId - 1}`);
  };

  const goToNextLesson = () => {
    if (lessonId < totalLessons) navigate(`/lesson/${lessonId + 1}`);
  };

  const completeLesson = () => {
    alert('Lesson marked as complete!');
    // You can implement backend logic here
  };

  return (
    <div className="lesson-navigation">
      <button
        className="nav-button prev-button"
        onClick={goToPreviousLesson}
        disabled={lessonId <= 1}
      >
        Prev
      </button>
      <button className="nav-button complete-button" onClick={completeLesson}>
        Complete
      </button>
      <button
        className="nav-button next-button"
        onClick={goToNextLesson}
        disabled={lessonId >= totalLessons}
      >
        Next
      </button>
    </div>
  );
};

export default LessonNavigation;
