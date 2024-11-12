import React from 'react';
import { useNavigate } from 'react-router-dom';
import 'styles/CourseCard.css';


const CourseCard = ({ title, level, rating, students, description,icon,color,btnpath,courseId }) => {
  const navigate = useNavigate();
  return (
    <div className="course-card" style={{backgroundColor : color}}>
      <div className="course-head">

        <div className='course-icon'>
          <img src={icon} alt={`${title} icon`} className="icon-image" />
        </div>

        <div className='course-title'>
          <h3>{title}</h3>
        </div>

      </div>
      <div className='course-info'>

        <div className="course-rating">
          ⭐ {rating}
        </div>

        <div className="course-level">
          Level: {level}
        </div>

      <div className='card-p'><p >{description}</p>
      </div>

        <div className="course-students">
          {students} students
        </div>
        
      </div>

      <div className='enroll-btn'>
        <button className="enroll-button"onClick={() => navigate(`/enroll/${courseId}`)}  >Enroll now</button>
      </div>
    </div>
  );
    
};

export default CourseCard;
