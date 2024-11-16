// /src/components/Navbar.js
import React, { useState, useEffect, useRef } from 'react';
import 'styles/Navbar.css';
import Logo from 'assets/icons/logo.svg';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import defaultProfilePic from '../assets/images/default-profile-pic.png';
const Navbar = () => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null); // Reference for the dropdown

  const toggleDropdown = () => {
    setIsDropdownOpen((prevState) => !prevState);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    window.location.reload(); // Refresh the page after logging out
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link className="navbar-logo" to="/">
          <img src={Logo} alt="DevQuest Logo" className="navbar-logo-image" />
        </Link>
        <ul className="navbar-links navbar-left-links">
          <li className="navbar-item">
            <Link className="navbar-link" to="/">Home</Link>
          </li>
          <li className="navbar-item">
            <Link className="navbar-link" to="/CoursesPage">Courses</Link>
          </li>
        </ul>

        <input type="search" className="navbar-search" placeholder="Search..." />

        <ul className="navbar-links navbar-right-links">
          <li className="navbar-item">
            <Link className="navbar-link" to="/pricing">Pricing</Link>
          </li>

          {user ? (
            <li className="navbar-item dropdown" ref={dropdownRef}>
              <img
                src={user.profileimage  ? `http://localhost:5000${user.profileimage}?${new Date().getTime()}` : defaultProfilePic}
                alt="User Profile"
                className="navbar-profile-picture"
                onClick={toggleDropdown} // Toggle dropdown on click
              />
              <div className={`dropdown-content ${isDropdownOpen ? 'show' : ''}`}>
                <Link to="/AccountSettings">Account Settings</Link>
                {user && user.admin && (
                  <Link className="navbar-dropdown-item" to="/dashboard">Dashboard</Link>
                )}
                <button onClick={handleLogout} className="logout-button">Log out</button>
              </div>
            </li>
          ) : (
            <>
              <li className="navbar-item">
                <Link className="navbar-link" to="/LoginPage">Log in</Link>
              </li>
              <li className="navbar-item">
                <Link className="navbar-link" to="/RegistrationPage">Sign up</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
