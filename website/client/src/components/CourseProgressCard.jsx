// /src/components/CourseProgressCard.js
import React from 'react';
import styles from 'styles/CourseProgressCard.css';

const CourseProgressCard = ({ course }) => {
  return (
    <div className={styles.courseProgressCard}>
      <h4>{course.title}</h4>
      <p>{course.description}</p>
      <div className={styles.progress}>
        <div className={styles.progressBar} style={{ width: `${course.progress}%` }}></div>
      </div>
      <button className={styles.continueBtn}>Continue Learning</button>
    </div>
  );
};

export default CourseProgressCard;