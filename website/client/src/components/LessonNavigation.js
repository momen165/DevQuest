import React from 'react';
import { useNavigate } from 'react-router-dom';
import 'styles/LessonNavigation.css';

const LessonNavigation = ({ currentLessonId, lessons }) => {
  const navigate = useNavigate();


  // Find current lesson index
  const currentIndex = lessons?.findIndex((lesson) => lesson.lesson_id === currentLessonId);

  // Handle invalid currentLessonId or empty lessons array
  if (currentIndex === -1 || !lessons?.length) {
    console.error(
      `Invalid currentLessonId (${currentLessonId}) or empty lessons array.`
    );
    return null; // Don't render navigation
  }

  const goToPreviousLesson = () => {
    if (currentIndex > 0) {
      navigate(`/lesson/${lessons[currentIndex - 1].lesson_id}`);
    }
  };

  const goToNextLesson = () => {
    if (currentIndex < lessons.length - 1) {
      navigate(`/lesson/${lessons[currentIndex + 1].lesson_id}`);
    }
  };

  const completeLesson = () => {
    alert(`Lesson ${currentLessonId} marked as complete!`);
  };

  return (
    <div className="lesson-navigation">
      <button
        className="nav-button prev-button"
        onClick={goToPreviousLesson}
        disabled={currentIndex === 0}
      >
        Prev
      </button>
      <button className="nav-button complete-button" onClick={completeLesson}>
        Complete
      </button>
      <button
        className="nav-button next-button"
        onClick={goToNextLesson}
        disabled={currentIndex === lessons.length - 1}
      >
        Next
      </button>
    </div>
  );
};

export default LessonNavigation;
