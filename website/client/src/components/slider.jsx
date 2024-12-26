import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import "../styles/Slider.css";

const languageBackgrounds = {
  71: {
    background: 'linear-gradient(145deg, rgba(48, 105, 152, 0.9), rgba(48, 105, 152, 0.2))',
    border: 'rgba(48, 105, 152, 0.5)'
  },
  102: {
    background: 'linear-gradient(145deg, rgba(247, 223, 30, 0.9), rgba(247, 223, 30, 0.2))',
    border: 'rgba(247, 223, 30, 0.5)'
  },
  105: {
    background: 'linear-gradient(145deg, rgba(0, 89, 156, 0.9), rgba(0, 89, 156, 0.2))',
    border: 'rgba(0, 89, 156, 0.5)'
  },
  62: {
    background: 'linear-gradient(145deg, rgba(248, 152, 32, 0.9), rgba(248, 152, 32, 0.2))',
    border: 'rgba(248, 152, 32, 0.5)'
  },
  101: {
    background: 'linear-gradient(145deg, rgba(49, 122, 204, 0.9), rgba(49, 122, 204, 0.2))',
    border: 'rgba(49, 122, 204, 0.5)'
  },
  100: {
    background: 'linear-gradient(145deg, rgba(83, 130, 161, 0.9), rgba(83, 130, 161, 0.2))',
    border: 'rgba(83, 130, 161, 0.5)'
  },
  104: {
    background: 'linear-gradient(145deg, rgba(85, 85, 85, 0.9), rgba(85, 85, 85, 0.2))',
    border: 'rgba(85, 85, 85, 0.5)'
  },
  28: {
    background: 'linear-gradient(145deg, rgba(0, 172, 215, 0.9), rgba(0, 172, 215, 0.2))',
    border: 'rgba(0, 172, 215, 0.5)'
  },
  68: {
    background: 'linear-gradient(145deg, rgba(119, 123, 179, 0.9), rgba(119, 123, 179, 0.2))',
    border: 'rgba(119, 123, 179, 0.5)'
  },
  72: {
    background: 'linear-gradient(145deg, rgba(204, 52, 45, 0.9), rgba(204, 52, 45, 0.2))',
    border: 'rgba(204, 52, 45, 0.5)'
  },
  78: {
    background: 'linear-gradient(145deg, rgba(147, 82, 204, 0.9), rgba(147, 82, 204, 0.2))',
    border: 'rgba(147, 82, 204, 0.5)'
  },
  73: {
    background: 'linear-gradient(145deg, rgba(222, 165, 132, 0.9), rgba(222, 165, 132, 0.2))',
    border: 'rgba(222, 165, 132, 0.5)'
  },
  default: {
    background: 'linear-gradient(145deg, rgba(30, 60, 144, 0.9), rgba(30, 60, 144, 0.2))',
    border: 'rgba(30, 60, 144, 0.5)'
  }
};

const SCROLL_SPEED = 2; // Pixels per frame
const SCROLL_INTERVAL = 16; // Approximately 60fps

const CoursesSlider = () => {
  const sliderRef = useRef(null);
  const animationFrameRef = useRef(null);
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(null);
  const [scrollLeft, setScrollLeft] = useState(null);
  const [courses, setCourses] = useState([]);
  const [ratings, setRatings] = useState({});
  const [userscount, setUserscount] = useState({});
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const fetchCoursesData = async () => {
      try {
        const response = await axios.get('/api/getCoursesWithRatings');
        const { courses, ratings, userscount } = response.data;
        
        const processedRatings = Object.entries(ratings || {}).reduce((acc, [key, value]) => {
          acc[key] = value ? Number(value) : 0;
          return acc;
        }, {});
        
        const topCourses = [...courses]
          .sort((a, b) => (processedRatings[b.course_id] || 0) - (processedRatings[a.course_id] || 0))
          .slice(0, 5);

        setCourses(topCourses);
        setRatings(processedRatings);
        setUserscount(userscount || {});
      } catch (err) {
        console.error('Error fetching courses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCoursesData();
  }, []);

  // Auto-scrolling animation
  const animate = () => {
    if (sliderRef.current && !isPaused && !isDragging) {
      const slider = sliderRef.current;
      
      // Check if we need to reset the scroll position
      if (slider.scrollLeft >= (slider.scrollWidth - slider.clientWidth) / 2) {
        slider.scrollLeft = 0;
      } else {
        slider.scrollLeft += SCROLL_SPEED;
      }
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      // Cleanup animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPaused, isDragging]);

  const onMouseEnter = () => {
    setIsPaused(true);
  };

  const onMouseLeave = () => {
    setIsPaused(false);
    setIsDragging(false);
  };

  const onMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX);
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleExplore = (courseId) => {
    navigate(`/enroll/${courseId}`);
  };

  const truncateText = (text, maxLength = 100) => {
    if (text?.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  };

  return (
    <div className="home-slider__section">
      <div className="home-slider__header">
        <h2 className="home-slider__title">Top-Rated Programming Courses</h2>
        <p className="home-slider__subtitle">Master your coding journey with our most popular courses</p>
      </div>
      <div 
        className="home-slider__container"
        ref={sliderRef}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        <div className="home-slider__track">
          {loading ? (
            <div className="home-slider__loading">
              <div className="home-slider__loading-spinner"></div>
              <span>Loading amazing courses...</span>
            </div>
          ) : (
            // Triple the courses for smooth infinite scroll
            [...courses, ...courses, ...courses].map((course, index) => {
              const languageStyle = languageBackgrounds[course.language_id] || languageBackgrounds.default;

              return (
                <div 
                  key={`${course.course_id}-${index}`}
                  className="home-slider__item"
                  style={{
                    background: languageStyle.background,
                    borderColor: languageStyle.border
                  }}
                >
                  <div className="home-slider__content-primary">
                    <div className="home-slider__icon-wrapper">
                      <img className="home-slider__icon" src={course.image} alt={course.name} />
                    </div>
                    <div className="home-slider__info">
                      <h3 className="home-slider__course-title">{course.name}</h3>
                      <div className="home-slider__stats">
                        <div className="home-slider__stat-group">
                          <div className="home-slider__rating">
                            <span className="home-slider__star-filled">{'★'.repeat(Math.floor(ratings[course.course_id] || 0))}</span>
                            <span className="home-slider__star-empty">{'☆'.repeat(5 - Math.floor(ratings[course.course_id] || 0))}</span>
                            <span className="home-slider__rating-value">{Number(ratings[course.course_id] || 0).toFixed(1)}</span>
                          </div>
                          <div className="home-slider__enrolled">
                            <span className="home-slider__enrolled-count">{userscount[course.course_id] || 0}</span>
                            <span className="home-slider__enrolled-text">students enrolled</span>
                          </div>
                        </div>
                        <span className="home-slider__difficulty-badge">{course.difficulty || 'All Levels'}</span>
                      </div>
                      <p className="home-slider__description">
                        {truncateText(course.description)}
                      </p>
                    </div>
                  </div>
                  <div className="home-slider__content-secondary">
                    <div className="home-slider__secondary-content">
                      <h3 className="home-slider__secondary-title">{course.name}</h3>
                      <p className="home-slider__full-description">{course.description}</p>
                      <button 
                        className="home-slider__explore-btn"
                        onClick={() => handleExplore(course.course_id)}
                      >
                        <span>Start Learning Now</span>
                        <svg className="home-slider__arrow-icon" viewBox="0 0 24 24">
                          <path d="M13.025 1l-2.847 2.828 6.176 6.176h-16.354v3.992h16.354l-6.176 6.176 2.847 2.828 10.975-11z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursesSlider;