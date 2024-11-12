import React from 'react';
import { useParams } from 'react-router-dom';
import LessonList from 'components/LessonSection';
import Navbar from 'components/Navbar';
import RatingForm from 'components/RatingForm';
import coursesData from 'data/courseData'; // Import course data
import 'styles/CourseSections.css';

const CourseSection = () => {
  const { courseId } = useParams(); 
  const course = coursesData[courseId]; 

  if (!course) {
    return <div>Course not found</div>;
  }

  return (
    <>
      <Navbar />
      <div className="Page">
        <div className="Section">
          <h1>{course.title}</h1> 
          {course.sections.map((section, index) => (
            <LessonList 
              key={index} 
              sectionName={section.sectionTitle} 
              lessons={section.lessons} 
            />
          ))}
        </div>

        <div className="rating">
          <div className="user-sidebar">
            <p className="status-title">My Status</p>
            <div className="user-info">
              <div className="user-icon" />
              <div className="user-details">
                <p className="username">Username</p>
                <p className="user-level">Level 0</p>
              </div>
            </div>
            <div className="user-progress">
              <div className="progress-box">
                <p className="progress-value">170+</p>
                <p className="progress-label">Course XP</p>
              </div>
              <div className="progress-box">
                <p className="progress-value">20</p>
                <p className="progress-label">Exercises Completed</p>
              </div>
              <div className="progress-box">
                <p className="progress-value">3</p>
                <p className="progress-label">Day Streak</p>
              </div>
            </div>
          </div>
          <RatingForm />
        </div>
      </div>
    </>
  );
};

export default CourseSection;
