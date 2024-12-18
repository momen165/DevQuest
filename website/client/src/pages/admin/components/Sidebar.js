import React , { useState } from 'react';
import {FaMoneyCheckAlt, FaChalkboardTeacher, FaHome, FaUser, FaComment, FaCog, FaSignOutAlt} from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import 'pages/admin/styles/Sidebar.css';
import { useAuth } from 'AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true); // Show confirmation dialog
  };

  const confirmLogout = () => {
    logout(); // Perform logout
    setShowLogoutConfirm(false); // Hide confirmation dialog
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false); // Hide confirmation dialog
  };
  return (
    <div className="sidebar">
      <h2>Admin Dashboard</h2>
      <ul>
        <Link to="/Dashboard" className="link">
          <li className={`sidebar-item ${location.pathname === '/Dashboard' ? 'active' : ''}`}>
            <FaHome /> <span>Dashboard</span>
          </li>
        </Link>
        
        <Link to="/Students" className="link">
          <li className={`sidebar-item ${location.pathname === '/Students' ? 'active' : ''}`}>
            <FaUser /> <span>Students</span>
          </li>
        </Link>

        <Link to="/AdminCourses" className="link">
          <li className={`sidebar-item ${location.pathname === '/AdminCourses' ? 'active' : ''}`}>
            <FaChalkboardTeacher /> <span>Courses</span>
          </li>
        </Link>

        

        <Link to="/PaymentInfo" className="link">
          <li className={`sidebar-item ${location.pathname === '/PaymentInfo' ? 'active' : ''}`}>
            <FaMoneyCheckAlt /> <span>Payment</span>
          </li>
        </Link>

        <Link to="/Feedback" className="link">
          <li className={`sidebar-item ${location.pathname === '/Feedback' ? 'active' : ''}`}>
            <FaComment /> <span>Feedback</span>
          </li>
        </Link>
        <Link to="/Support" className="link">
          <li className={`sidebar-item ${location.pathname === '/Support' ? 'active' : ''}`}>
            <FaComment /> <span>Support</span>
          </li>
        </Link>

        <Link to="/AdminSettingsPage" className="link">
          <li className={`sidebar-item ${location.pathname === '/AdminSettingsPage' ? 'active' : ''}`}>
            <FaCog /> <span>Settings</span>
          </li>
        </Link>
       
        <li className="sidebar-item logout" onClick={handleLogout}>
          <FaSignOutAlt /> <span>Logout</span>
        </li>
      </ul>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="logout-confirmation">
          <div className="logout-dialog">
            <p>Are you sure you want to logout?</p>
            <div className="dialog-buttons">
              <button className="confirm-button" onClick={confirmLogout}>Logout</button>
              <button className="cancel-button" onClick={cancelLogout}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
