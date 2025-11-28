'use client';

import React, { useState } from 'react';
import {
  FaMoneyCheckAlt,
  FaChalkboardTeacher,
  FaHome,
  FaUser,
  FaComment,
  FaCog,
  FaSignOutAlt,
  FaArrowLeft,
  FaChartLine,
  FaTachometerAlt,
} from 'react-icons/fa';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import '@/styles/admin/Sidebar.css';
import { useAuth } from '@/contexts/AuthContext';

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <h2>Admin Dashboard</h2>
        <ul>
          <Link href="/Dashboard" className="link">
            <li className={`sidebar-item ${pathname === '/Dashboard' ? 'active' : ''}`}>
              <FaHome /> <span>Dashboard</span>
            </li>
          </Link>

          <Link href="/Students" className="link">
            <li className={`sidebar-item ${pathname === '/Students' ? 'active' : ''}`}>
              <FaUser /> <span>Students</span>
            </li>
          </Link>

          <Link href="/AdminCourses" className="link">
            <li className={`sidebar-item ${pathname === '/AdminCourses' ? 'active' : ''}`}>
              <FaChalkboardTeacher /> <span>Courses</span>
            </li>
          </Link>

          <Link href="/Analytics" className="link">
            <li className={`sidebar-item ${pathname === '/Analytics' ? 'active' : ''}`}>
              <FaChartLine /> <span>Analytics</span>
            </li>
          </Link>

          <Link href="/PaymentInfo" className="link">
            <li className={`sidebar-item ${pathname === '/PaymentInfo' ? 'active' : ''}`}>
              <FaMoneyCheckAlt /> <span>Payment</span>
            </li>
          </Link>

          <Link href="/Feedback" className="link">
            <li className={`sidebar-item ${pathname === '/Feedback' ? 'active' : ''}`}>
              <FaComment /> <span>Feedback</span>
            </li>
          </Link>
          <Link href="/Support" className="link">
            <li className={`sidebar-item ${pathname === '/Support' ? 'active' : ''}`}>
              <FaComment /> <span>Support</span>
            </li>
          </Link>

          <Link href="/SupportDashboard" className="link">
            <li
              className={`sidebar-item ${
                pathname === '/SupportDashboard' ? 'active' : ''
              }`}
            >
              <FaTachometerAlt /> <span>Support Analytics</span>
            </li>
          </Link>

          <Link href="/AdminSettingsPage" className="link">
            <li
              className={`sidebar-item ${
                pathname === '/AdminSettingsPage' ? 'active' : ''
              }`}
            >
              <FaCog /> <span>Settings</span>
            </li>
          </Link>

          <li className="sidebar-item logout" onClick={handleLogout}>
            <FaSignOutAlt /> <span>Logout</span>
          </li>
        </ul>
        <Link href="/" className="link">
          <li className="sidebar-item back-to-home">
            <FaArrowLeft /> <span>Back to Home</span>
          </li>
        </Link>
      </div>
      
      {showLogoutConfirm && (
        <div className="logout-confirmation">
          <div className="logout-dialog">
            <p>Are you sure you want to logout?</p>
            <div className="dialog-buttons">
              <button className="confirm-button" onClick={confirmLogout}>
                Logout
              </button>
              <button className="cancel-button" onClick={cancelLogout}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
