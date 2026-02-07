import React, { useRef, useState, useEffect, memo } from 'react';
import axios from 'axios';
import { useAuth } from 'app/AuthContext';
import CourseCard from 'features/course/components/CourseCard';
import './Slider.css';

const SCROLL_SPEED = 0.5; // Pixels per frame

const CoursesSlider = () => {
  const { user } = useAuth();
  const sliderRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(null);
  const [scrollLeft, setScrollLeft] = useState(null);
  const [courses, setCourses] = useState([]);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const fetchCoursesData = async () => {
      try {
        const config = user?.token
          ? {
              headers: { Authorization: `Bearer ${user.token}` },
            }
          : {};

        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/optimized-courses`,
          config
        );
        const { courses } = response.data;

        const topCourses = [...courses]
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 5);
        setCourses(topCourses);
      } catch (err) {
        console.error('Error fetching courses:', err);
      }
    };

    fetchCoursesData();
  }, [user]);

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
    const walk = x - startX;
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div className="home-slider__section">
      <div className="home-slider__header">
        <h2 className="home-slider__title">Most popular Programming Courses</h2>
        <p className="home-slider__subtitle">
          Master your coding journey with our most popular courses
        </p>
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
          {/* Triple the courses for smooth infinite scroll */}
          {[...courses, ...courses, ...courses].map((course, index) => {
            return (
              <div key={`${course.course_id}-${index}`} className="home-slider__item">
                <CourseCard
                  title={course.name}
                  level={course.difficulty || 'All Levels'}
                  rating={Number(course.rating || 0).toFixed(1)}
                  students={course.userscount || 0}
                  description={course.description}
                  courseId={course.course_id}
                  image={course.image}
                  language_id={course.language_id}
                  isEnrolled={course.is_enrolled}
                  progress={course.progress}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const MemoizedCoursesSlider = memo(CoursesSlider);
MemoizedCoursesSlider.displayName = 'CoursesSlider';

export default MemoizedCoursesSlider;
