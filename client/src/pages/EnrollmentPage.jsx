import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './EnrollmentPage.css';
import { useAuth } from 'app/AuthContext';
import CircularProgress from '@mui/material/CircularProgress';

const api_url = import.meta.env.VITE_API_URL;

const EnrollmentPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/loginPage');
      return;
    }

    const fetchCourseData = async () => {
      try {
        const { data } = await axios.get(`${api_url}/courses/${courseId}`);
        setCourse(data);

        // Check if the user is already enrolled in the course
        if (user.user_id) {
          const { data: enrollmentData } = await axios.get(
            `${api_url}/courses/${courseId}/enrollments/${user.user_id}`
          );
          setIsEnrolled(enrollmentData.isEnrolled);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load course data');
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId, user, navigate]);
  if (loading) {
    return (
      <div className="enrollment-page loading">
        <div className="loading-container">
          <CircularProgress size={60} style={{ color: '#4776c9' }} />
          <p className="loading-text">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="enrollment-page error">
        <div className="error-container">
          <h2>⚠️ Something went wrong</h2>
          <p>{error}</p>
          <button className="retry-button" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const fullImageUrl = course.image ? course.image : '/fallback-image.png';

  const handleStartLearning = () => {
    if (!isEnrolled) {
      axios
        .post(
          `${import.meta.env.VITE_API_URL}/courses/enroll`,
          {
            user_id: user.user_id,
            course_id: courseId,
          },
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        )
        .then(({ data }) => {
          setIsEnrolled(true);
          navigate(`/course/${courseId}`);
        })
        .catch((error) => {
          console.error('Error enrolling in course:', error);
        });
    } else {
      navigate(`/course/${courseId}`);
    }
  };

  const handleImageError = (e) => {
    if (!isUsingFallback) {
      setIsUsingFallback(true);
      e.target.src = '/fallback-image.png';
    } else {
      e.target.style.display = 'none';
    }
  };
  return (
    <div className="enrollment-page">
      {/* Floating particles for visual appeal */}
      <div className="floating-particles">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`particle particle-${i + 1}`}></div>
        ))}
      </div>

      <div className="enroll-info">
        <header className="enrollment-header">
          <div className="course-intro">Introduction to {course.title}</div>
          <h1 className="course-titl">Master the Language of the Future</h1>
          <p className="course-description">
            {course.description ||
              'Embark on an exciting journey to master cutting-edge technologies and transform your career. Our comprehensive course is designed to take you from beginner to expert with hands-on projects, real-world applications, and industry-standard practices.'}
          </p>

          {/* Course highlights */}
          <div className="course-highlights">
            <div className="highlight-item">
              <span className="highlight-icon">🚀</span>
              <span>Interactive Learning</span>
            </div>
            <div className="highlight-item">
              <span className="highlight-icon">💡</span>
              <span>Real Projects</span>
            </div>
            <div className="highlight-item">
              <span className="highlight-icon">🏆</span>
              <span>Industry Certified</span>
            </div>
          </div>

          <button className="start-button" onClick={handleStartLearning}>
            <span className="button-text">
              {isEnrolled ? 'Continue learning' : 'Start learning'} {course.title}
            </span>
            <span className="button-arrow">→</span>
          </button>
        </header>
      </div>

      <div className="enroll-img">
        <div className="image-container">
          <img src={fullImageUrl} alt={`Course: ${course.title}`} onError={handleImageError} />
          <div className="image-glow"></div>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentPage;
