import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import coursesData from 'data/courseData'; // Import course data
import 'styles/EnrollmentPage.css';

const EnrollmentPage = () => {
  const { courseId } = useParams(); // Get the course ID from the URL
  const navigate = useNavigate();
  const course = coursesData[courseId]; // Retrieve course data based on courseId

  if (!course) {
    return <div>Course not found</div>;
  }

  return (
    <div className="enrollment-page">
      <div className='enroll-info'>
        <header className="enrollment-header">
            <h2 className="course-intro">Introduction to {course.title}</h2>
            <h1 className="course-titl">Master the Language of the Future</h1>
            <p className="course-description">
            {course.description || 'Course description goes here.'}
            </p>
            
            {/* Start Learning Button */}
            <button className="start-button" onClick={() => navigate(`/CourseSection/${courseId}`)}>
            Start learning {course.title}
            </button>
        </header>
      </div>
            <div >
                <img className='enroll-img' src='' alt=''/>
            </div>
            
    </div>
  );
};

export default EnrollmentPage;
