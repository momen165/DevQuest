import React, { useState, useEffect, useRef } from 'react';
import 'styles/Navbar.css';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import defaultProfilePic from '../assets/images/default-profile-pic.png';
import Logo from '../assets/icons/Logo.svg';
import Avatar from '@mui/material/Avatar';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (!isMobileMenuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
  };

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
    document.body.classList.remove('menu-open');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.classList.remove('menu-open');
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    document.body.classList.remove('menu-open');
  }, [location]);

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    document.body.classList.remove('menu-open');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link className="navbar-logo" to="/" onClick={handleLinkClick}>
          <img src={Logo} alt="DevQuest Logo" className="navbar-logo-image" width="300" height="60"/>
        </Link>

        <div className="mobile-menu-icon" onClick={toggleMobileMenu}>
          <div className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <div className={`navbar-content ${isMobileMenuOpen ? 'active' : ''}`}>
          <ul className="navbar-links navbar-left-links">
            <li className="navbar-item">
              <Link className="navbar-link" to="/" onClick={handleLinkClick}>Home</Link>
            </li>
            <li className="navbar-item">
              <Link className="navbar-link" to="/CoursesPage" onClick={handleLinkClick}>Courses</Link>
            </li>
          </ul>

          <input type="search" className="navbar-search" placeholder="Search..."/>

          <ul className="navbar-links navbar-right-links">
            <li className="navbar-item">
              <Link className="navbar-link" to="/pricing" onClick={handleLinkClick}>Pricing</Link>
            </li>

            {user ? (
              <li className="navbar-item dropdown" ref={dropdownRef}>
                <Avatar
                  src={user.profileimage ? user.profileimage : defaultProfilePic}
                  alt="User Profile"
                  className="navbar-profile-picture"
                  onClick={toggleDropdown}
                />
                {isDropdownOpen && (
                  <div className="dropdown-content dropdown-show">
                    <div className="dropdown-connector"></div>
                    <Link
                      to="/AccountSettings"
                      className={`value ${location.pathname === '/AccountSettings' ? 'active' : ''}`}
                      onClick={handleLinkClick}
                    >
                      Account Settings
                    </Link>
                    <Link
                      to="/ProfilePage"
                      className={`value ${location.pathname === '/ProfilePage' ? 'active' : ''}`}
                      onClick={handleLinkClick}
                    >
                      Profile Page
                    </Link>
                    {user && user.admin && (
                      <Link
                        to="/dashboard"
                        className={`value ${location.pathname === '/dashboard' ? 'active' : ''}`}
                        onClick={handleLinkClick}
                      >
                        Dashboard
                      </Link>
                    )}
                    <button 
                      onClick={handleLogout} 
                      className="value logout-button"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </li>
            ) : (
              <>
                <li className="navbar-item">
                  <Link className="navbar-link" to="/LoginPage" onClick={handleLinkClick}>Log in</Link>
                </li>
                <li className="navbar-item">
                  <Link className="navbar-link" to="/RegistrationPage" onClick={handleLinkClick}>Sign up</Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;