import React, { useState, useEffect } from 'react';
import Navbar from 'components/Navbar'; // Adjust the path to your Navbar component
import styles from 'styles/ProfilePage.module.css';
import { useAuth } from 'AuthContext';
import defaultProfilePic from "../../assets/images/default-profile-pic.png";
import { useNavigate } from 'react-router-dom';
function ProfilePage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
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
                  <img src={user.profileimage ? user.profileimage : defaultProfilePic} alt="Profile Avatar"
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
                        <p className={styles.statusNumber}>{profileData.level || 0}</p>
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
                        <div key={course.course_id} className={styles.courseCardprofile}>
                          <div className={styles.courseCardHeader}>
                            <h4 className={styles.courseCardTitle}>{course.course_name}</h4>
                            <p className={styles.courseDescription}>{course.course_description}</p>
                          </div>
                          <div className={styles.progressContainer}>
                            <span className={styles.progressText}>Progress</span>
                            <div className={styles.progressBar}>
                              <div className={styles.progress} style={{width: `${course.progress}%`}}></div>
                            </div>
                          </div>
                          <button className={styles.continueButton}
                                  onClick={() => navigate(`/course/${course.course_id}`)}>continue learning
                          </button>
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