import React, { useEffect, useState } from 'react';
import Navbar from 'components/Navbar'; // Adjust the path to your Navbar component
import styles from 'styles/ProfilePage.module.css';
import axios from 'axios';
import CourseProgressCard from 'components/CourseProgressCard';

const ProfilePage = () => {
  const [userInfo, setUserInfo] = useState({ username: '', profile_image: '' });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // Retrieve and parse token from localStorage
        const userData = JSON.parse(localStorage.getItem('user'));
        const token = userData ? userData.token : null;

        if (!token) {
          throw new Error('No token found. Please log in again.');
        }

        // Fetch user info from API
        const response = await axios.get('/api/userInforoutes', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUserInfo(response.data);
      } catch (err) {
        console.error('Error fetching user info:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Failed to fetch user info.');
      }
    };

    fetchUserInfo();
  }, []);

  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.profilePage}>
      <Navbar />
      <div className={styles.profileContainer}>
        <h1 className={styles.profileTitle}>Profile Page</h1>
        <div className={styles.profileDetails}>
          <img
            src={userInfo.profile_image || '/default-profile-pic.png'}
            alt="Profile"
            className={styles.profileImage}
          />
          <p className={styles.username}>Username: {userInfo.username || 'N/A'}</p>
        </div>
      </div>
    </div>

  );
};

export default ProfilePage;