import React from 'react';
import { useNavigate } from 'react-router-dom';
import 'styles/CourseCard.css';

const CourseCard = ({ title, level, rating, students, description, courseId, image, isEnrolled, progress }) => {
  const navigate = useNavigate();
  const fullImageUrl = image;

  const handleButtonClick = () => {
    if (isEnrolled) {
      navigate(`/course/${courseId}`);
    } else {
      navigate(`/enroll/${courseId}`);
    }
  };

  return (
    <div className="course-card">
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
        <div className="course-level">Level: {level}</div>
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
        >
          {isEnrolled ? 'Continue learning' : 'Enroll now'}
        </button>
      </div>
    </div>
  );
};

export default CourseCard;
