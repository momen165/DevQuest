import React from 'react';
import Navbar from 'components/Navbar'; // Adjust the path to your Navbar component
import styles from 'styles/ProfilePage.module.css';

function ProfilePage() {
  return (
    <>
      <Navbar />
      <div className={styles.profilePageContainer}>
        <div className={styles.profileContentContainer}>
          {/* Left Column: Profile Info and Status */}
          <div className={styles.leftColumn}>
            <div className={styles.profileHeader}>
              <img src="https://via.placeholder.com/100" alt="Profile Avatar" className={styles.profileAvatar} />
              <h2 className={styles.profileName}>Ahmed</h2>
              <p className={styles.bioTitle}>Bio</p>
              <div className={styles.bioText}>
                
              </div>
            </div>

            <div className={styles.statusSection}>
  <h3 className={styles.statusTitle}>My Status</h3>
  <div className={styles.statusCards}>
    {/* First Row */}
    <div className={styles.statusRow}>
      <div className={`${styles.statusCard} ${styles.xpCard}`}>
        <p className={styles.statusNumber}>170+</p>
        <p>Course XP</p>
      </div>
      <div className={styles.statusCard}>
        <p className={styles.statusNumber}>20</p>
        <p>Exercises Completed</p>
      </div>
      <div className={styles.statusCard}>
        <p className={styles.statusNumber}>3</p>
        <p>Streak</p>
      </div>
    </div>

    {/* Second Row */}
    <div className={styles.statusRow}>
      <div className={styles.statusCard}>
        <p className={styles.statusNumber}>2</p>
        <p>Completed Courses</p>
      </div>
      <div className={styles.statusCard}>
        <p className={styles.statusNumber}>5</p>
        <p>Level</p>
      </div>
    </div>
  </div>
</div>




          </div>

          {/* Right Column: Courses */}
          <div className={styles.rightColumn}>
            <h3 className={styles.coursesTitle}>My Courses</h3>
            <div className={`${styles.courseCard} ${styles.courseCardYellow}`}>
              <h4>JavaScript Basics</h4>
              <p>Learn the fundamentals of JavaScript and start building interactive websites.</p>
              <div className={styles.progress}>
                <div className={styles.progressBar} style={{ width: '50%' }}></div>
              </div>
              <button className={styles.continueBtn}>Continue Learning</button>
            </div>

            <div className={`${styles.courseCard} ${styles.courseCardBlue}`}>
              <h4>Introduction to Python</h4>
              <p>Master the basics of Python programming for data science and web development.</p>
              <div className={styles.progress}>
                <div className={styles.progressBar} style={{ width: '30%' }}></div>
              </div>
              <button className={styles.continueBtn}>Continue Learning</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ProfilePage;
