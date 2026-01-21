import React, { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './CourseCard.css';

const languageAccents = {
  71: '48, 105, 152', // Python
  102: '247, 223, 30', // JavaScript
  105: '0, 89, 156', // C++
  62: '248, 152, 32', // Java
  101: '49, 122, 204', // TypeScript
  100: '83, 130, 161', // Python alt
  104: '85, 85, 85', // C
  28: '0, 172, 215', // Go
  68: '119, 123, 179', // PHP
  72: '204, 52, 45', // Ruby
  78: '147, 82, 204', // Kotlin
  73: '222, 165, 132', // Rust
};

const languageLabels = {
  71: 'Python',
  102: 'JavaScript',
  105: 'C++',
  62: 'Java',
  101: 'TypeScript',
  100: 'Python',
  104: 'C',
  28: 'Go',
  68: 'PHP',
  72: 'Ruby',
  78: 'Kotlin',
  73: 'Rust',
};

const CourseCard = memo(
  ({
    title,
    level,
    rating,
    students,
    description,
    courseId,
    image,
    isEnrolled,
    progress,
    language_id,
  }) => {
    const navigate = useNavigate();
    const fullImageUrl = image;
    const accentRgb = languageAccents[language_id] || languageAccents[28];
    const languageLabel = languageLabels[language_id] || 'Course';

    // Memoize expensive calculations
    const cardStyles = useMemo(() => {
      return {
        '--accent-rgb': accentRgb,
      };
    }, [accentRgb]);

    // Memoize progress circle styles
    const progressStyles = useMemo(() => {
      if (!isEnrolled || progress == null) return {};

      return {
        background: `conic-gradient(green 0% ${progress}%, #2e2e2e ${progress}% 100%)`,
      };
    }, [isEnrolled, progress]);

    const handleButtonClick = () => {
      if (isEnrolled) {
        navigate(`/course/${courseId}`);
      } else {
        navigate(`/enroll/${courseId}`);
      }
    };
    return (
      <div className="dq-course-card" style={cardStyles}>
        <img src={fullImageUrl} alt={`${title} cover`} className="dq-course-image" />
        <div className="dq-card-overlay"></div>

        {/* Hover description modal */}
        <div className="dq-description-modal">
          <div className="dq-description-content">
            <h3 className="dq-description-title">{title}</h3>
            {description && <p className="dq-description-text">{description}</p>}
            <div className="dq-description-meta">
              <span className="dq-description-level">{level}</span>
              <span className="dq-description-lang">{languageLabel}</span>
            </div>
            <div className="dq-modal-actions">
              {isEnrolled && progress != null && (
                <div className="dq-progress-container">
                  <div className="dq-progress-circle" style={progressStyles}>
                    <div className="dq-circle-mid"></div>
                  </div>
                  <span className="dq-progress-text">{progress}%</span>
                </div>
              )}
              <button
                className="dq-enroll-btn"
                onClick={handleButtonClick}
                data-enrolled={isEnrolled}
              >
                {isEnrolled ? 'Continue learning' : 'Enroll now'}
              </button>
            </div>
          </div>
        </div>

        <div className="dq-card-content">
          <div className="dq-bottom-section">
            <div className="dq-left-info">
              <div className="dq-rating">
                <span className="dq-star">★</span>
                <span>
                  {rating} {level}
                </span>
              </div>
              <div className="dq-students">{students} students</div>
            </div>
          </div>
        </div>

        <div className="dq-decorative-star"></div>
      </div>
    );
  }
);

export default CourseCard;
