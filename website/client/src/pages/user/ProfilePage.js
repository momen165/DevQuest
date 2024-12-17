import React, { useState, useEffect } from 'react';
import Navbar from 'components/Navbar'; // Adjust the path to your Navbar component
import styles from 'styles/ProfilePage.module.css';
import { useAuth } from 'AuthContext';
import defaultProfilePic from "../../assets/images/default-profile-pic.png";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function ProfilePage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

 // In ProfilePage.js
useEffect(() => {
  const fetchProfileData = async () => {
    try {
      const response = await axios.get(`/api/students/${user.user_id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      console.log('Profile Data:', response.data); // Debug log
      console.log('Courses:', response.data.courses); // Debug log
      console.log('Completed Courses:', response.data.courses?.filter(c => c.progress >= 100)); // Debug log
      setProfileData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load profile data');
      setLoading(false);
    }
  };

  if (user && user.user_id) {
    fetchProfileData();
  }
}, [user]);

  if (loading) {
    return <div>Loading profile data...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }
  
  const getCompletedCoursesCount = (courses) => {
    if (!courses || !Array.isArray(courses)) return 0;
    return courses.filter(course => course.progress >= 100).length;
  };

// Level calculation constants
const BASE_XP = 100;  // Base XP required for level 1
const SCALING_FACTOR = 1.5;  // How much more XP each level requires

// Function to calculate level based on XP
const calculateLevel = (xp) => {
  if (xp < BASE_XP) return 1;
  
  // Formula: level = floor(log(xp/BASE_XP)/log(SCALING_FACTOR)) + 1
  const level = Math.floor(
    Math.log(xp / BASE_XP) / Math.log(SCALING_FACTOR)
  ) + 1;
  
  return Math.max(1, level); // Ensure minimum level is 1
};

// Function to calculate XP progress towards next level
const calculateLevelProgress = (xp) => {
  const currentLevel = calculateLevel(xp);
  const currentLevelXP = BASE_XP * Math.pow(SCALING_FACTOR, currentLevel - 1);
  const nextLevelXP = BASE_XP * Math.pow(SCALING_FACTOR, currentLevel);
  const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  return Math.min(100, Math.max(0, progress)); // Ensure progress is between 0 and 100
};

  return (
      <>
        <Navbar />
        <div className={styles.profilePage}>
          <div className={styles.profilePageContainer}>
            <div className={styles.profileContentContainer}>
              {/* Left Column: Profile Info and Status */}
              <div className={styles.leftColumn}>
                <div className={styles.profileHeader}>
                  <img src={user.profileimage ? `${user.profileimage}?${new Date().getTime()}` : defaultProfilePic}
                       alt="Profile Avatar"
                       className={styles.profileAvatar}/>
                  <h2 className={styles.profileName}>{user.name}</h2>
                  <p className={styles.bioTitle}>Bio</p>
                  <div className={styles.bioText}>
                    {profileData.bio || 'No bio available'}
                  </div>
                </div>

                <div className={styles.statusSection}>
                  <h3 className={styles.statusTitle}>My Status</h3>
                  <div className={styles.statusCards}>
                    {/* First Row */}
                    <div className={styles.statusRow}>
                      <div className={`${styles.statusCard} ${styles.xpCard}`}>
                        <p className={styles.statusNumber}>{profileData.courseXP || 0}+</p>
                        <p>Course XP</p>
                      </div>
                      <div className={styles.statusCard}>
                        <p className={styles.statusNumber}>{profileData.exercisesCompleted || 0}</p>
                        <p>Exercises Completed</p>
                      </div>
                      <div className={styles.statusCard}>
                        <p className={styles.statusNumber}>{profileData.streak || 0}</p>
                        <p>Streak</p>
                      </div>
                    </div>

                    {/* Second Row */}
                    <div className={styles.statusRow}>
                      <div className={styles.statusCard}>
                        <p className={styles.statusNumber}>{profileData.completedCourses || 0}</p>
                        <p>Completed Courses</p>
                      </div>
                      <div className={styles.statusCard}>
                        <p className={styles.statusNumber}>{calculateLevel(profileData.courseXP) || 0}</p>
                        <p>Level</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Courses */}
              <div className={styles.rightColumn}>
                <h3 className={styles.coursesTitle}>My Courses</h3>
               

                        {profileData && profileData.courses && profileData.courses.length > 0 ? (
                          profileData.courses.map(course => (
                            <div key={course.course_id} className={styles.courseCardprofile} data-completed={course.progress >= 100}>
                              <div className={styles.leftsectionCourseCard}>
                                <p className={styles.courseProgcardtext}>COURSE</p>
                                <h1 className={styles.courseProgCardTitle}>{course.course_name}</h1>
                                <h4 className={styles.ViewProgCardLessons}>
                                  {course.progress >= 100 
                                    ? 'Course Completed!' 
                                    : course.last_lesson 
                                      ? `Continue Lesson ${course.last_lesson.name}` 
                                      : 'Start Course'} 
                                  <i className="fa-solid fa-chevron-right" />
                                </h4>
                              </div>
                              <div className={styles.rightProgCardSection}>
                                <div className={styles.progressBarheader}>
                                  <h1 className={styles.sectionNameProgCard}>
                                    {course.progress >= 100 
                                      ? 'Completed' 
                                      : course.last_lesson 
                                        ? course.last_lesson.section_name 
                                        : 'Get Started'}
                                  </h1>
                                  <div className={styles.progressbarcontainer}>
                                    <div className={styles.progressbarbackground}>
                                      <div 
                                        className={`${styles.progressbarfill} ${course.progress >= 100 ? styles.completed : ''}`} 
                                        style={{width: `${course.progress}%`}}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <h1 className={styles.lessontitleProgCard}>
                                  {course.progress >= 100 
                                    ? 'Congratulations on completing this course!' 
                                    : course.last_lesson 
                                      ? course.last_lesson.name 
                                      : 'Begin Your Journey'}
                                </h1>
                                <input 
                                  type="button" 
                                  value={course.progress >= 100 ? "Review Course" : "Continue"} 
                                  className={`${styles.continuebuttonProgCard} ${course.progress >= 100 ? styles.reviewButton : ''}`}
                                  onClick={() => navigate(course.last_lesson ? 
                                    `/lesson/${course.last_lesson.lesson_id}` : 
                                    `/course/${course.course_id}`)} 
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          <p>No courses available</p>
                        )}
              </div>
            </div>
          </div>
        </div>
      </>
  );
}

export default ProfilePage;

