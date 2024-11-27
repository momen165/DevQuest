import React, { useState } from 'react';
import 'styles/FilterTabs.css';

const FilterTabs = ({ onFilterChange }) => {
  const [activeTab, setActiveTab] = useState('All Courses');

  const handleTabClick = (filter) => {
    setActiveTab(filter);
    onFilterChange(filter);
  };

  return (
    <div className="filter-tabs">
      {['All Courses', 'Popular', 'Difficulty', 'Beginner','rating'].map((tab) => (
        <button
          key={tab}
          className={`filter-tab ${activeTab === tab ? 'active' : ''}`}
          onClick={() => handleTabClick(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default FilterTabs;
