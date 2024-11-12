import React from 'react';
import 'styles/FilterTabs.css';

const FilterTabs = () => {
  return (
    <div className="filter-tabs">
      <button className="filter-tab active">All Courses</button>
      <button className="filter-tab">Popular</button>
      <button className="filter-tab">Difficulty</button>
      <button className="filter-tab">Beginner</button>
      {/* Add more tabs as needed */}
    </div>
  );
};

export default FilterTabs;
