import React, { useState, useMemo } from "react";
import styles from "./ProfilePage.module.css";
import { useAuth } from "app/AuthContext";
import defaultProfilePic from "assets/images/default-profile-pic.png";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "shared/ui/LoadingSpinner";
import BadgeDisplay from "features/badge/components/BadgeDisplay";
import { useProfile } from "features/profile/hooks/useProfile";
import {
  calculateLevel,
  calculateLevelProgress,
  calculateXPToNextLevel,
} from "features/profile/hooks/xpCalculator";

function ProfilePage() {
  const { user } = useAuth();
  const {
    profileData,
    loading,
    error,
    badges,
    loadingBadges
  } = useProfile(user);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("inProgress");

  // Separate courses into in-progress and completed
  const { inProgressCourses, completedCourses } = useMemo(() => {
    const courses = profileData?.courses || [];
    return {
      inProgressCourses: courses.filter((course) => course.progress < 100),
      completedCourses: courses.filter((course) => course.progress >= 100),
    };
  }, [profileData?.courses]);

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading profile..." />;
  }

  if (error) {
    return <div>{error}</div>;
  }

  const levelProgress = calculateLevelProgress(profileData?.courseXP || 0);
  const currentLevel = calculateLevel(profileData?.courseXP || 0) || 0;

  return (
    <div className={styles.profilePage}>
      <div className={styles.profilePageContainer}>
        <div className={styles.profileContentContainer}>
          {/* Top Row - Profile Card + Status */}
          <div className={styles.topRow}>
            {/* Profile Card */}
            <div className={styles.profileCard}>
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
              <button
                className={styles.editProfileBtn}
                onClick={() => navigate("/AccountSettings")}
              >
                Edit Profile
              </button>

              {/* Skills Section */}
              <div className={styles.skillsSection}>
                <h3 className={styles.sectionTitle}>My Skills</h3>
                <div className={styles.skillsList}>
                  {profileData?.skills?.length > 0 ? (
                    profileData.skills.map((skill, index) => (
                      <span key={`${skill}-${index}`} className={styles.skillTag}>
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className={styles.noSkills}>No skills added yet</span>
                  )}
                </div>
              </div>
            </div>

            {/* Status Card */}
            <div className={styles.statusCard}>
              <h3 className={styles.statusTitle}>My Status</h3>

              {/* Circular Level Indicator */}
              <div className={styles.levelCircleContainer}>
                <svg className={styles.levelCircle} viewBox="0 0 120 120">
                  {/* Background circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="url(#levelGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(levelProgress / 100) * 327} 327`}
                    transform="rotate(-90 60 60)"
                  />
                  <defs>
                    <linearGradient
                      id="levelGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="50%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className={styles.levelNumber}>
                  <span className={styles.levelValue}>{currentLevel}</span>
                  <span className={styles.levelLabel}>LEVEL</span>
                </div>
              </div>
              <p className={styles.xpToNextLevel}>
                {Math.round(calculateXPToNextLevel(profileData?.courseXP || 0))}{" "}
                XP TO NEXT LEVEL
              </p>

              {/* Stats Grid */}
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>
                    {profileData?.courseXP || 0}+
                  </span>
                  <span className={styles.statLabel}>COURSE XP</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>
                    {profileData?.exercisesCompleted || 0}
                  </span>
                  <span className={styles.statLabel}>EXERCISES</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>
                    {profileData?.streak || 0}
                  </span>
                  <span className={styles.statLabel}>STREAK</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>
                    {profileData?.completedCourses || 0}
                  </span>
                  <span className={styles.statLabel}>COURSES</span>
                </div>
              </div>
            </div>
          </div>

          {/* Courses Section with Tabs */}
          <div className={styles.coursesSection}>
            {/* Tab Headers */}
            <div className={styles.tabHeaders}>
              <button
                className={`${styles.tabButton} ${activeTab === "inProgress" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("inProgress")}
              >
                IN PROGRESS
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === "completed" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("completed")}
              >
                COMPLETED
              </button>
            </div>

            {/* Tab Content */}
            <div className={styles.tabContent}>
              {activeTab === "inProgress" ? (
                <div className={styles.inProgressTab}>
                  {inProgressCourses.length > 0 ? (
                    inProgressCourses.map((course) => (
                      <div
                        key={course.course_id}
                        className={styles.courseCardInProgress}
                      >
                        <div className={styles.courseCardLeft}>
                          <p className={styles.courseLabel}>COURSE</p>
                          <h3 className={styles.courseTitle}>
                            {course.course_name}
                          </h3>
                          <p className={styles.continueLesson}>
                            Continue Lesson{" "}
                            {course.last_lesson?.name || "Introduction"}
                          </p>
                        </div>
                        <div className={styles.courseCardRight}>
                          <div className={styles.progressInfo}>
                            <span className={styles.sectionName}>
                              {course.last_lesson?.section_name || "Getting Started"}
                            </span>
                            <div className={styles.progressBar}>
                              <div
                                className={styles.progressFill}
                                style={{ width: `${course.progress}%` }}
                              />
                            </div>
                          </div>
                          <p className={styles.lessonTitle}>
                            {course.last_lesson?.name || "Start Learning"}
                          </p>
                          <button
                            className={styles.continueBtn}
                            onClick={() =>
                              navigate(
                                course.last_lesson
                                  ? `/lesson/${course.last_lesson.lesson_id}`
                                  : `/course/${course.course_id}`
                              )
                            }
                          >
                            CONTINUE
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.noCourses}>
                      <p>No courses in progress. Start learning today!</p>
                      <button
                        className={styles.browseCourseBtn}
                        onClick={() => navigate("/courses")}
                      >
                        Browse Courses
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.completedTab}>
                  {completedCourses.length > 0 ? (
                    completedCourses.map((course) => (
                      <div
                        key={course.course_id}
                        className={styles.courseCardCompleted}
                      >
                        <div className={styles.completedCourseInfo}>
                          <h3 className={styles.completedCourseName}>
                            {course.course_name}
                          </h3>
                          <span className={styles.completedBadge}>
                            Completed
                          </span>
                        </div>
                        <button
                          className={styles.reviewCourseBtn}
                          onClick={() => navigate(`/course/${course.course_id}`)}
                        >
                          REVIEW COURSE
                        </button>
                        <div className={styles.certificateIcon}>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M12 15l-2 5l2-2l2 2l-2-5z" />
                            <circle cx="12" cy="9" r="6" />
                          </svg>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.noCourses}>
                      <p>No completed courses yet. Keep learning!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Achievements Section */}
          <div className={styles.achievementsSection}>
            <h3 className={styles.sectionTitle}>Achievements and Badges</h3>
            <BadgeDisplay badges={badges} loading={loadingBadges} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
