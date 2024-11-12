// /src/components/Navbar.js
import React, { useState } from 'react';
import 'styles/Navbar.css';
import Logo from 'assets/icons/logo.svg';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const toggleDropdown = () => {
    setIsDropdownOpen((prevState) => !prevState);
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
          <li className="navbar-item dropdown">
            <img
              src={user.profilePicture || 'default-profile-pic-url.png'}
              alt="User Profile"
              className="navbar-profile-picture"
              onClick={toggleDropdown} // Toggle dropdown on click
            />
            {isDropdownOpen && (
              <div className="dropdown-content">
                <Link to="/Profile">Profile</Link>
                <button onClick={logout} className="logout-button">Log out</button>
              </div>
            )}
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