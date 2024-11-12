import React from 'react';
import { FaMoneyCheckAlt, FaChalkboardTeacher, FaHome, FaUser, FaBook, FaComment, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import 'pages/admin/styles/Sidebar.css';

const Sidebar = () => {
  const location = useLocation();

  return (
    <div className="sidebar">
      <h2>Admin Dashboard</h2>
      <ul>
        <Link to="/Dashboard" className="link">
          <li className={location.pathname === '/Dashboard' ? 'sidebar-item active' : 'sidebar-item'}>
            <FaHome /> <span>Dashboard</span>
          </li>
        </Link>
        
        <Link to="/Students" className="link">
          <li className={location.pathname === '/Students' ? 'sidebar-item active' : 'sidebar-item'}>
            <FaUser /> <span>Students</span>
          </li>
        </Link>

        <Link to="/AdminCourses" className="link">
          <li className={location.pathname === '/AdminCourses' ? 'sidebar-item active' : 'sidebar-item'}>
            <FaChalkboardTeacher /> <span>Courses</span>
          </li>
        </Link>

        <Link to="/Payment" className="link">
          <li className={location.pathname === '/Payment' ? 'sidebar-item active' : 'sidebar-item'}>
            <FaMoneyCheckAlt /> <span>Payment</span>
          </li>
        </Link>

        <Link to="/Feedback" className="link">
          <li className={location.pathname === '/Feedback' ? 'sidebar-item active' : 'sidebar-item'}>
            <FaComment /> <span>Feedback</span>
          </li>
        </Link>

        <Link to="/Settings" className="link">
          <li className={location.pathname === '/Settings' ? 'sidebar-item active' : 'sidebar-item'}>
            <FaCog /> <span>Settings</span>
          </li>
        </Link>

        <li className="sidebar-item logout">
          <FaSignOutAlt /> <span>Logout</span>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
