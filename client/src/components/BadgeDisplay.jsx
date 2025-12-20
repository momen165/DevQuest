import React, { useState, memo } from 'react';
import styles from 'styles/BadgeDisplay.module.css';

/**
 * Component to display user badges with pagination (next set) functionality
 * @param {Object} props
 * @param {Array} props.badges - Array of badge objects
 * @param {boolean} props.loading - Loading state
 * @param {number} props.itemsPerPage - Number of badges to show per page (default: 4)
 */
const BadgeDisplay = ({ badges = [], loading = false, itemsPerPage = 4 }) => {
  const [currentPage, setCurrentPage] = useState(0);

  if (loading) {
    return (
      <div className={styles.badgeLoading}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading badges...</p>
      </div>
    );
  }

  // Safety check: ensure badges is an array
  const badgeList = Array.isArray(badges) ? badges : [];

  if (badgeList.length === 0) {
    return (
      <div className={styles.noBadges}>
        <p>Complete challenges to earn badges!</p>
      </div>
    );
  }

  const totalPages = Math.ceil(badgeList.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const displayedBadges = badgeList.slice(startIndex, startIndex + itemsPerPage);

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className={styles.badgeContainer}>
      <div className={styles.badgeGrid}>
        {displayedBadges.map((badge, index) => (
          <div 
            key={badge.badge_id || `${currentPage}-${index}`} 
            className={styles.badgeItem}
            style={{ 
              animation: `${styles.fadeIn} 0.4s ease-out forwards`,
              animationDelay: `${index * 0.05}s`
            }}
          >
            <div className={styles.badgeImageContainer}>
              <img 
                src={badge.image_path} 
                alt={badge.name} 
                className={styles.badgeImage}
                onError={(e) => {
                  e.target.src = 'https://cdn.dev-quest.me/badges/default_badge.png';
                }}
              />
            </div>
            <div className={styles.badgeInfo}>
              <h3 className={styles.badgeName}>{badge.name}</h3>
              <p className={styles.badgeDescription}>{badge.description}</p>
              {badge.awarded_at && (
                <p className={styles.badgeDate}>
                  Earned: {new Date(badge.awarded_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className={styles.paginationControls}>
          <button 
            className={styles.pageButton} 
            onClick={prevPage}
            disabled={currentPage === 0}
            aria-label="Previous set"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          
          <div className={styles.pageIndicator}>
            {currentPage + 1} / {totalPages}
          </div>
          
          <button 
            className={styles.pageButton} 
            onClick={nextPage}
            disabled={currentPage === totalPages - 1}
            aria-label="Next set"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(BadgeDisplay);