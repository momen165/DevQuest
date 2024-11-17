import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import 'styles/EnrollmentPage.css';

const EnrollmentPage = () => {
  const { courseId } = useParams(); // Get the courseId from the URL
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch course data based on courseId
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/courses/${courseId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch course data');
        }
        const data = await response.json();
        setCourse(data); // Set the fetched course data
        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load course data');
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId]); // Fetch course data whenever courseId changes

  if (loading) {
    return <div>Loading course data...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!course) {
    return <div>Course not found</div>;
  }

  const fullImageUrl = course.image
    ? `http://localhost:5000${course.image}`
    : '/fallback-image.png';

  return (
    <div className="enrollment-page">
      <div className="enroll-info">
        <header className="enrollment-header">
          <h2 className="course-intro">Introduction to {course.title}</h2>
          <h1 className="course-titl">Master the Language of the Future</h1>
          <p className="course-description">{course.description || 'Course description goes here.'}</p>

          {/* Start Learning Button */}
          <button className="start-button">
            Start learning {course.title}
          </button>
        </header>
      </div>

      {/* Dynamic Image with Fallback */}
      <div className="enroll-img">
        <img
          src={fullImageUrl}
          alt={`Course: ${course.title}`}
          style={{
            width: '700px', // Smaller width
            height: 'auto', // Maintain aspect ratio
           
          }}
          onError={(e) => {
            console.error('Image failed to load, falling back to placeholder');
            e.target.src = '/fallback-image.png';
          }}
        />
      </div>
    </div>
  );
};

export default EnrollmentPage;
