import React, { useState, useEffect } from 'react';
import styles from 'styles/BadgeNotification.module.css';

/**
 * Component to display a notification when a user earns a badge
 * @param {Object} props
 * @param {Object} props.badge - Badge object containing badge details
 * @param {Function} props.onClose - Function to close the notification
 */
const BadgeNotification = ({ badge, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (badge) {
      setIsVisible(true);
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [badge]);
  
  const handleClose = () => {
    setIsVisible(false);
    
    // Wait for exit animation to complete before calling onClose
    setTimeout(() => {
      if (onClose) onClose();
    }, 500);
  };
  
  if (!badge) return null;
  
  return (
    <div className={`${styles.notificationContainer} ${isVisible ? styles.visible : styles.hidden}`}>
      <div className={styles.badgeNotification}>
        <div className={styles.header}>
          <div className={styles.confetti} />
          <h3>New Badge Earned!</h3>
          <button className={styles.closeButton} onClick={handleClose}>×</button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.badgeImageWrapper}>
            <img 
              src={badge.image_path} 
              alt={badge.name} 
              className={styles.badgeImage} 
            />
          </div>
          <div className={styles.badgeInfo}>
            <h4 className={styles.badgeName}>{badge.name}</h4>
            <p className={styles.badgeDescription}>{badge.description}</p>
          </div>
        </div>
        
        <div className={styles.footer}>
          <button className={styles.viewButton} onClick={handleClose}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default BadgeNotification; 