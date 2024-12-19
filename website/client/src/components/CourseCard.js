import React from 'react';
import { useNavigate } from 'react-router-dom';
import 'styles/CourseCard.css';

const languageBackgrounds = {
  71: 'rgba(55, 118, 171, 0.5)',    // Python - Brighter blue
  63: 'rgba(240, 219, 79, 0.5)',    // JavaScript - Vibrant yellow
  54: 'rgba(101, 159, 207, 0.5)',   // C++ - Light blue
  102: 'rgba(248, 152, 32, 0.5)',   // Java - Orange
  101: 'rgba(0, 122, 204, 0.5)',    // TypeScript - Deep blue
  100: 'rgba(83, 130, 161, 0.5)',   // Python alt - Steel blue
  62: 'rgba(225, 0, 50, 0.5)',      // Java alt - Red
  105: 'rgba(0, 117, 143, 0.5)',    // C++ alt - Teal
  104: 'rgba(85, 85, 85, 0.5)',     // C - Dark gray
  95: 'rgba(0, 172, 215, 0.5)',     // Go - Cyan
  68: 'rgba(119, 123, 179, 0.5)',   // PHP - Purple
  72: 'rgba(204, 52, 45, 0.5)',     // Ruby - Ruby red
  78: 'rgba(147, 82, 204, 0.5)',    // Kotlin - Light purple
  73: 'rgba(222, 165, 132, 0.5)',   // Rust - Rust orange
  default: 'rgba(9, 20, 41, 0.7)'
};

const CourseCard = ({ title, level, rating, students, description, courseId, image, isEnrolled, progress, language_id }) => {
  const navigate = useNavigate();
  const fullImageUrl = image;

  console.log('Language received in CourseCard:', language_id); // Add this debug line

  const getBackgroundColor = (langId) => {
    const color = languageBackgrounds[langId] || languageBackgrounds.default;
    console.log('Language ID:', langId, 'Color:', color); // Debug line
    return color;
  };

  const cardBackground = `linear-gradient(145deg, 
    ${getBackgroundColor(language_id)}, 
    rgba(9, 20, 41, 0.98)
  )`;

  const handleButtonClick = () => {
    if (isEnrolled) {
      navigate(`/course/${courseId}`);
    } else {
      navigate(`/enroll/${courseId}`);
    }
  };

  return (
    <div 
      className="course-card" 
      style={{ 
        '--card-background': cardBackground
      }}
    >
      <div className="course-head">
        <div className="course-icon">
          <img src={fullImageUrl} alt={`${title} icon`} className="icon-image" />
        </div>
        <div className="course-title">
          <h3>{title}</h3>
        </div>
      </div>
      <div className="course-info">
        <div className="course-rating">⭐ {rating}</div>
        <div className="course-level">{level}</div>
        <div className="card-p">
          <p>{description}</p>
        </div>
        <div className="course-students">{students} students</div>
      </div>
      <div className="enroll-btn">
        {isEnrolled && (
          <div className="progress-container">
            <div className="progress-circle" style={{ background: `conic-gradient(green 0% ${progress}%, #2e2e2e ${progress}% 100%)` }}>
              <div className="circle-mid"></div>
            </div>
            <span className="progress-text">{progress}%</span>
          </div>
        )}
        <button
          className="enroll-button"
          onClick={handleButtonClick}
          data-enrolled={isEnrolled}
        >
          {isEnrolled ? 'Continue learning' : 'Enroll now'}
        </button>
      </div>
    </div>
  );
};

export default CourseCard;
