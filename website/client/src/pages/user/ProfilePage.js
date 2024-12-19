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
  const [stats, setStats] = useState({
    completedCourses: 0,
    exercisesCompleted: 0,
    totalXP: 0,
    level: 0,
    streak: 0
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const response = await fetch(`/api/students/${user.user_id}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile data');
        }
        const data = await response.json();
        setProfileData(data);
        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load profile data');
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user.user_id]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`/api/students/${user.user_id}/stats`, {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        
        setStats({
          completedCourses: response.data.completedCourses || 0,
          exercisesCompleted: response.data.exercisesCompleted || 0,
          totalXP: response.data.totalXP || 0,
          level: response.data.level || 0,
          streak: response.data.streak || 0
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    if (user?.user_id) {
      fetchStats();
    }
  }, [user]);

  if (loading) {
    return <div>Loading profile data...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }
  console.log(profileData);

  

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
                  <div className={styles.bioContainer}>
                    <p className={styles.bioTitle}>Bio</p>
                    <div className={styles.bioText}>
                      {profileData.bio || 'No bio available'}
                    </div>
                  </div>
                </div>


                <div className={styles.statusSection}>
                  <h3 className={styles.statusTitle}>My Status</h3>
                  <div className={styles.statusCards}>
                    {/* Level Card at Top */}
                    <div className={`${styles.statusCard} ${styles.levelCard}`}>
                      <div className={styles.firstContent}>
                        <p className={styles.statusNumber}>{stats.level|| 0}</p>
                        <p>Level</p>
                        <div className={styles.xpProgress}>
                          <div className={styles.xpProgressBar}>
                            <div 
                              className={styles.xpProgressFill} 
                              style={{
                                width: `${(stats.totalXP % 1000) / 10}%`
                              }}
                            />
                          </div>
                          <p className={styles.xpProgressText}>
                            {stats.xpToNextLevel} XP to next level
                          </p>
                        </div>
                      </div>
                      <div className={styles.secondContent}>
                        <p>Keep learning and gain levels</p>
                      </div>
                    </div>

                    {/* Other Stats Grid */}
                    <div className={styles.statsGrid}>
                      <div className={`${styles.statusCard} ${styles.xpCard}`}>
                        <div className={styles.firstContent}>
                          <p className={styles.statusNumber}>{stats.totalXP || 0}+</p>
                          <p>Course XP</p>
                        </div>
                        <div className={styles.secondContent}>
                          <p>Total Experience Points Earned</p>
                        </div>
                      </div>
                      
                      <div className={styles.statusCard}>
                        <div className={styles.firstContent}>
                          <p className={styles.statusNumber}>{stats.exercisesCompleted || 0}</p>
                          <p>Exercises</p>
                        </div>
                        <div className={styles.secondContent}>
                          <p>Completed Exercises</p>
                        </div>
                      </div>
                      
                      <div className={styles.statusCard}>
                        <div className={styles.firstContent}>
                          <p className={styles.statusNumber}>{profileData.streak || 0}</p>
                          <p>Streak</p>
                        </div>
                        <div className={styles.secondContent}>
                          <p>Days in a Row</p>
                        </div>
                      </div>
                      
                      <div className={styles.statusCard}>
                        <div className={styles.firstContent}>
                          <p className={styles.statusNumber}>{stats.completedCourses || 0}</p>
                          <p>Courses</p>
                        </div>
                        <div className={styles.secondContent}>
                          <p>Finished Courses</p>
                        </div>
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
                      <div key={course.course_id} className={styles.courseCardprofile}>
                      <div className={styles.leftsectionCourseCard}>
                        <p className={styles.courseProgcardtext}>COURSE</p>
                        <h1 className={styles.courseProgCardTitle}>{course.course_name}</h1>
                        <h4 className={styles.ViewProgCardLessons}>
                          view all lessons <i className="fa-solid fa-chevron-right" />
                        </h4>
                      </div>
                      <div className={styles.rightProgCardSection}>
                        <div className={styles.progressBarheader}>
                          <h1 className={styles.sectionNameProgCard}>Section Name</h1>
                          <div className={styles.progressbarcontainer} >
                            <div className={styles.progressbarbackground}>
                              <div className={styles.progressbarfill} style={{width: `${course.progress}%`}}/>
                            </div>
                            {/* <p className="progress-text">6/9 Challenges</p> */}
                          </div>
                        </div>
                        <h1 className={styles.lessontitleProgCard}>Callbacks &amp; Closures</h1>
                        <input type="button" defaultValue="Continue" className={styles.continuebuttonProgCard} onClick={() => navigate(`/course/${course.course_id}`)} />
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

