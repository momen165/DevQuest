import React, { useState, useEffect } from "react";
import Navbar from "../../components/Navbar"; // Adjust the path to your Navbar component
import styles from "../../styles/ProfilePage.module.css";
import { useAuth } from "../../AuthContext";
import Footer from "../../components/Footer"; // Adjust the path to your Footer component
import defaultProfilePic from "../../assets/images/default-profile-pic.png";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import CircularProgress from "./CircularProgress"; // Adjust the path to your CircularProgress component
import BadgeDisplay from "../../components/BadgeDisplay";
import {
  calculateLevel,
  calculateLevelProgress,
  calculateXPToNextLevel,
} from "../../utils/xpCalculator";

function ProfilePage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const profileResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/students/${user.user_id}`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
          },
        );

        setProfileData(profileResponse.data);
        setLoading(false);
      } catch (err) {
        console.error("Error:", err);
        setError(err.response?.data?.error || "Failed to load profile data");
        setLoading(false);
      }
    };

    const fetchUserBadges = async () => {
      try {
        setLoadingBadges(true);
        const badgeResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/badges/user`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
          }
        );
        
        if (badgeResponse.data.success && badgeResponse.data.badges) {
          setBadges(badgeResponse.data.badges);
        }
      } catch (err) {
        console.error("Error fetching badges:", err);
      } finally {
        setLoadingBadges(false);
      }
    };

    if (user && user.user_id) {
      fetchProfileData();
      fetchUserBadges();
    }
  }, [user]);

  if (loading) {
    return <div><CircularProgress /></div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <>
      <Navbar />
      <div className={styles.profilePage}>
        <div className={styles.profilePageContainer}>
          <div className={styles.profileContentContainer}>
            {/* Profile Header */}
            <div className={styles.profileHeader}>
              <img
                src={profileData?.profileimage || defaultProfilePic}
                alt="Profile"
                className={styles.profileAvatar}
              />
              <h2 className={styles.profileName}>{profileData?.name}</h2>
              <p className={styles.bioTitle}>Bio</p>
              <div className={styles.bioText}>
                {profileData?.bio || "No bio available"}
              </div>
              <div className={styles.skillsSection}>
                <h3 className={styles.sectionTitle}>My Skills</h3>
                <div className={styles.skillsList}>
                  {profileData?.skills?.map((skill, index) => (
                    <span key={index} className={styles.skillTag}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className={styles.mainContent}>
              {/* Left Column - Courses */}
              <div className={styles.leftColumn}>
                {profileData?.courses?.map((course) => (
                  <div
                    key={course.course_id}
                    className={styles.courseCardprofile}
                    data-completed={course.progress >= 100 ? "true" : "false"}
                  >
                    <div className={styles.leftsectionCourseCard}>
                      <p className={styles.courseProgcardtext}>COURSE</p>
                      <h1 className={styles.courseProgCardTitle}>
                        {course.course_name}
                      </h1>
                      <h4 className={styles.ViewProgCardLessons}>
                        {course.progress >= 100
                          ? "Course Completed!"
                          : course.last_lesson
                            ? `Continue Lesson ${course.last_lesson.name}`
                            : "Start Course"}
                        <i className="fa-solid fa-chevron-right" />
                      </h4>
                    </div>
                    <div className={styles.rightProgCardSection}>
                      <div className={styles.progressBarheader}>
                        <h1 className={styles.sectionNameProgCard}>
                          {course.progress >= 100
                            ? "Completed"
                            : course.last_lesson
                              ? course.last_lesson.section_name
                              : "Get Started"}
                        </h1>
                        <div className={styles.progressbarcontainer}>
                          <div className={styles.progressbarbackground}>
                            <div
                              className={`${styles.progressbarfill} ${course.progress >= 100 ? styles.completed : ""}`}
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <h1 className={styles.lessontitleProgCard}>
                        {course.progress >= 100
                          ? "Congratulations on completing this course!"
                          : course.last_lesson
                            ? course.last_lesson.name
                            : "Begin Your Journey"}
                      </h1>
                      <input
                        type="button"
                        value={
                          course.progress >= 100 ? "Review Course" : "Continue"
                        }
                        className={`${styles.continuebuttonProgCard} ${course.progress >= 100 ? styles.reviewButton : ""}`}
                        onClick={() =>
                          navigate(
                            course.last_lesson
                              ? `/lesson/${course.last_lesson.lesson_id}`
                              : `/course/${course.course_id}`,
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column - Stats and Achievements */}
              <div className={styles.rightColumn}>
                <div className={styles.statusSection}>
                  <h3 className={styles.statusTitle}>My Status</h3>
                  <div className={styles.statusCards}>
                    {/* Level Card */}
                    <div className={`${styles.statusCard} ${styles.levelCard}`}>
                      <div className={styles.firstContent}>
                        <p className={styles.statusNumber}>
                          {calculateLevel(profileData.courseXP) || 0}
                        </p>
                        <p>Level</p>
                        <div className={styles.xpProgress}>
                          <div className={styles.xpProgressBar}>
                            <div
                              className={styles.xpProgressFill}
                              style={{
                                width: `${calculateLevelProgress(profileData.courseXP)}%`,
                              }}
                            />
                          </div>
                          <p className={styles.xpProgressText}>
                            {Math.round(
                              calculateXPToNextLevel(profileData.courseXP),
                            )}{" "}
                            XP to next level
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
                          <p className={styles.statusNumber}>
                            {profileData.courseXP || 0}+
                          </p>
                          <p>Course XP</p>
                        </div>
                        <div className={styles.secondContent}>
                          <p>Total Experience Points Earned</p>
                        </div>
                      </div>

                      <div className={styles.statusCard}>
                        <div className={styles.firstContent}>
                          <p className={styles.statusNumber}>
                            {profileData.exercisesCompleted || 0}
                          </p>
                          <p>Exercises</p>
                        </div>
                        <div className={styles.secondContent}>
                          <p>Completed Exercises</p>
                        </div>
                      </div>

                      <div className={styles.statusCard}>
                        <div className={styles.firstContent}>
                          <p className={styles.statusNumber}>
                            {profileData.streak || 0}
                          </p>
                          <p>Streak</p>
                        </div>
                        <div className={styles.secondContent}>
                          <p>Days in a Row</p>
                        </div>
                      </div>

                      <div className={styles.statusCard}>
                        <div className={styles.firstContent}>
                          <p className={styles.statusNumber}>
                            {profileData.completedCourses || 0}
                          </p>
                          <p>Courses</p>
                        </div>
                        <div className={styles.secondContent}>
                          <p>Finished Courses</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.achievementsSection}>
                  <h3 className={styles.sectionTitle}>
                    Achievements and Badges
                  </h3>
                  <BadgeDisplay badges={badges} loading={loadingBadges} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default ProfilePage;
