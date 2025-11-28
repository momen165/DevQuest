import React, { useState, useEffect } from 'react';
import '@/styles/FilterTabs.css';

import AnimatedLogoMain from '@/public/assets/icons/Dev.svg';
import AnimatedLogoSecond from '@/public/assets/icons/Quest.svg';

const FilterTabs = ({ onFilterChange, onSearch, searchTerm }) => {
  const [activeTab, setActiveTab] = useState('All Courses');
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Trigger animation after a small delay to ensure smooth transition
    setTimeout(() => setAnimate(true), 100);
  }, []);

  const handleTabClick = (filter) => {
    setActiveTab(filter);
    onFilterChange(filter);
  };
  const handleSearch = (event) => {
    // Pass the event.target.value to the parent component's handler
    onSearch(event.target.value);
  };

  return (
    <>
      <div className={`animated-logo-card ${animate ? 'animate' : ''}`}>
        <div className="animated-logo-tools">
          <div className="animated-logo-circle">
            <span className="animated-logo-red animated-logo-box"></span>
          </div>
          <div className="animated-logo-circle">
            <span className="animated-logo-yellow animated-logo-box"></span>
          </div>
          <div className="animated-logo-circle">
            <span className="animated-logo-green animated-logo-box"></span>
          </div>
        </div>
        <div className="animated-logo-border"></div>{' '}
        <div className="animated-logo-content">
          {' '}
          <div className="animated-logo">
            <div className="animated-logo1">
              <img src={AnimatedLogoMain} alt="Dev" width="110" height="70" />
            </div>
            <div className="animated-logo2">
              <img src={AnimatedLogoSecond} alt="Quest" width="160" height="70" />
            </div>
            <div className="animated-logo-trail"></div>
          </div>
          <span className="animated-logo-content-bottom-text">
            dev-quest<b>.</b>tech
          </span>
        </div>
        <span className="animated-logo-bottom-text">universe of Coding</span>
      </div>

      <p className="hero-head">All Courses</p>
      <p className="hero-para">
        A large number of courses on different topics are waiting for you.
        <br />
        You can find there everything from self-developing to sciences, for any knowledge levels.
      </p>
      <div className="filter-container">
        <div className="search-container">
          <input
            type="text"
            className="course-search-input"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>

        <div className="filter-tabs">
          {['All Courses', 'Popular', 'Difficulty', 'Beginner', 'rating'].map((tab) => (
            <button
              key={tab}
              className={`filter-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => handleTabClick(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default FilterTabs;
