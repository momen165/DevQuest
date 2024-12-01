import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import 'styles/EnrollmentPage.css';
import { useAuth } from 'AuthContext';

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
    const fetchCourseData = async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch course data');
        }
        const data = await response.json();
        setCourse(data);

        // Check if the user is already enrolled in the course
        ///courses/:course_id/enrollments/:user_id
        const enrollmentResponse = await fetch(`/api/courses/${courseId}/enrollments/${user.user_id}`);
        if (!enrollmentResponse.ok) {
          throw new Error('Failed to check enrollment status');
        }
        const enrollmentData = await enrollmentResponse.json();
        setIsEnrolled(enrollmentData.isEnrolled);

        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load course data');
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId, user.user_id]);

  if (loading) {
    return <div>Loading course data...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!course) {
    return <div>Course not found</div>;
  }

  const fullImageUrl = course.image ? course.image : '/fallback-image.png';

  const handleStartLearning = () => {
    if (!isEnrolled) {
      fetch('/api/enrollCourse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          user_id: user.user_id,
          course_id: courseId,
        }),
      })
          .then(response => {
            if (!response.ok) {
              return response.text().then(text => { throw new Error(text) });
            }
            return response.json();
          })
          .then(data => {
            setIsEnrolled(true);
            navigate(`/course/${courseId}`);
          })
          .catch(error => {
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
        <div className="enroll-info">
          <header className="enrollment-header">
            <h2 className="course-intro">Introduction to {course.title}</h2>
            <h1 className="course-titl">Master the Language of the Future</h1>
            <p className="course-description">{course.description || 'Course description goes here.'}</p>
            <button className="start-button" onClick={handleStartLearning}>
              {isEnrolled ? 'Continue learning' : 'Start learning'} {course.title}
            </button>
          </header>
        </div>
        <div className="enroll-img">
          <img
              src={fullImageUrl}
              alt={`Course: ${course.title}`}
              style={{ width: '700px', height: 'auto' }}
              onError={handleImageError}
          />
        </div>
      </div>
  );
};

export default EnrollmentPage;