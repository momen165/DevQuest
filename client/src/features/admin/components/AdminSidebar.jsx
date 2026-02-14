import { useState } from "react";
import {
  FaMoneyCheckAlt,
  FaChalkboardTeacher,
  FaHome,
  FaUser,
  FaComment,
  FaCog,
  FaSignOutAlt,
  FaArrowLeft,
  FaChartLine, // Add chart icon
  FaTachometerAlt, // Add dashboard icon
} from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import "./Sidebar.css";
import { useAuth } from "app/AuthContext";

const AdminSidebar = ({ children }) => {
  const location = useLocation();
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isActivePath = (path) => {
    const currentPath = location.pathname.toLowerCase();
    const targetPath = path.toLowerCase();

    // Exact match
    if (currentPath === targetPath) {
      return true;
    }

    // Match nested routes (e.g., "/support" active for "/support/tickets")
    return currentPath.startsWith(`${targetPath}/`);
  };
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
          <Link to="/Dashboard" className="link">
            <li className={`sidebar-item ${isActivePath("/Dashboard") ? "active" : ""}`}>
              <FaHome /> <span>Dashboard</span>
            </li>
          </Link>

          <Link to="/Students" className="link">
            <li className={`sidebar-item ${isActivePath("/Students") ? "active" : ""}`}>
              <FaUser /> <span>Students</span>
            </li>
          </Link>

          <Link to="/AdminCourses" className="link">
            <li className={`sidebar-item ${isActivePath("/AdminCourses") ? "active" : ""}`}>
              <FaChalkboardTeacher /> <span>Courses</span>
            </li>
          </Link>

          {/* Add Analytics link */}
          <Link to="/Analytics" className="link">
            <li className={`sidebar-item ${isActivePath("/Analytics") ? "active" : ""}`}>
              <FaChartLine /> <span>Analytics</span>
            </li>
          </Link>

          <Link to="/PaymentInfo" className="link">
            <li className={`sidebar-item ${isActivePath("/PaymentInfo") ? "active" : ""}`}>
              <FaMoneyCheckAlt /> <span>Payment</span>
            </li>
          </Link>

          <Link to="/Feedback" className="link">
            <li className={`sidebar-item ${isActivePath("/Feedback") ? "active" : ""}`}>
              <FaComment /> <span>Feedback</span>
            </li>
          </Link>
          <Link to="/Support" className="link">
            <li className={`sidebar-item ${isActivePath("/Support") ? "active" : ""}`}>
              <FaComment /> <span>Support</span>
            </li>
          </Link>

          <Link to="/SupportDashboard" className="link">
            <li className={`sidebar-item ${isActivePath("/SupportDashboard") ? "active" : ""}`}>
              <FaTachometerAlt /> <span>Support Analytics</span>
            </li>
          </Link>

          <Link to="/AdminSettingsPage" className="link">
            <li className={`sidebar-item ${isActivePath("/AdminSettingsPage") ? "active" : ""}`}>
              <FaCog /> <span>Settings</span>
            </li>
          </Link>

          <li className="sidebar-item logout" onClick={handleLogout}>
            <FaSignOutAlt /> <span>Logout</span>
          </li>
        </ul>
        <Link to="/" className="link">
          <li className="sidebar-item back-to-home">
            <FaArrowLeft /> <span>Back to Home</span>
          </li>
        </Link>
      </div>
      <main className="admin-main-content">{children}</main>
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

export default AdminSidebar;
