import React from 'react';
import styles from '@/styles/BadgeDisplay.module.css';

/**
 * Component to display user badges
 * @param {Object} props
 * @param {Array} props.badges - Array of badge objects
 * @param {boolean} props.loading - Loading state
 */
const BadgeDisplay = ({ badges = [], loading = false }) => {
  if (loading) {
    return (
      <div className={styles.badgeLoading}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading badges...</p>
      </div>
    );
  }

  if (!badges || badges.length === 0) {
    return (
      <div className={styles.noBadges}>
        <p>Complete challenges to earn badges!</p>
      </div>
    );
  }

  return (
    <div className={styles.badgeGrid}>
      {badges.map((badge) => (
        <div key={badge.badge_id} className={styles.badgeItem}>
          <div className={styles.badgeImageContainer}>
            <img 
              src={badge.image_path} 
              alt={badge.name} 
              className={styles.badgeImage} 
            />
          </div>
          <div className={styles.badgeInfo}>
            <h3 className={styles.badgeName}>{badge.name}</h3>
            <p className={styles.badgeDescription}>{badge.description}</p>
            <p className={styles.badgeDate}>
              Earned: {new Date(badge.awarded_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BadgeDisplay; 