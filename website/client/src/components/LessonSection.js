import React, { useState } from 'react';
import 'styles/LessonSection.css';

const LessonList = ({ lessons, sectionName }) => {
  const [isOpen, setIsOpen] = useState(true);

  const toggleList = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="lesson-list">
      <h3 onClick={toggleList} className="lesson-title">
        {sectionName} <span className="arrow">{isOpen ? '▲' : '▼'}</span>
      </h3>
      {isOpen && (
        <ul>
          {lessons.map((lesson, index) => (
            <li key={index} className="lesson">
              <input type="checkbox" /> {lesson} <span>Start ➔</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LessonList;
