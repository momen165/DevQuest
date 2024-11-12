import React from 'react';
import { FaUserGraduate, FaUserPlus, FaBook } from 'react-icons/fa';
import 'pages/admin/styles/DashboardContent.css';

const DashboardContent = () => {
  return (
    <div className="dashboard-content">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="profile">
          <span>John Doe</span>
          <p>Admin</p>
        </div>
      </header>
      
      <div className="stats-cards">
        <div className="card">
          <FaUserGraduate className="icon" />
          <h3>3280</h3>
          <p>Students</p>
        </div>
        <div className="card">
          <FaUserPlus className="icon" />
          <h3>3280</h3>
          <p>New Students in the last week</p>
        </div>
        <div className="card">
          <FaBook className="icon" />
          <h3>28</h3>
          <p>Courses</p>
        </div>
      </div>

      <div className="activity-section">
        <div className="recent-activity">
          <div className="activity-header">
            <h2>Recent Activity</h2>
            <button className="see-all-button">See all</button>
          </div>
          <ul>
            <li>New student registered: Ahmed</li>
            <li>Course "JavaScript Basics" published</li>
            <li>Section "Advanced Python" updated</li>
            <li>Lesson "Introduction to C++" deleted</li>
          </ul>
        </div>
        <div className="new-students">
          <div className="activity-header">
            <h2>New Students</h2>
            <button className="see-all-button">See all</button>
          </div>
          <ul>
            <li>Ahmed Ali</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
