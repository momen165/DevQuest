import React, { useState, useEffect, useRef } from 'react';
import 'styles/Navbar.css';
import Logo from 'assets/icons/logo.svg';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import defaultProfilePic from '../assets/images/default-profile-pic.png';
import Avatar from '@mui/material/Avatar';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  const toggleDropdown = () => {
    setIsDropdownOpen((prevState) => !prevState);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
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
    };
  }, []);

  useEffect(() => {
    return () => {
      document.body.classList.remove('menu-open');
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    document.body.classList.remove('menu-open');
  }, [location]);

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link className="navbar-logo" to="/">
          <img src={Logo} alt="DevQuest Logo" className="navbar-logo-image"/>
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
              <Link className="navbar-link" to="/" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
            </li>
            <li className="navbar-item">
              <Link className="navbar-link" to="/CoursesPage" onClick={() => setIsMobileMenuOpen(false)}>Courses</Link>
            </li>
          </ul>

          <input type="search" className="navbar-search" placeholder="Search..."/>

          <ul className="navbar-links navbar-right-links">
            <li className="navbar-item">
              <Link className="navbar-link" to="/pricing" onClick={() => setIsMobileMenuOpen(false)}>Pricing</Link>
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
                    <button
                      className={`value ${location.pathname === '/AccountSettings' ? 'active' : ''}`}
                      onClick={() => window.location.href = '/AccountSettings'}
                    >
                      Account Settings
                    </button>
                    <button
                      className={`value ${location.pathname === '/ProfilePage' ? 'active' : ''}`}
                      onClick={() => window.location.href = '/ProfilePage'}
                    >
                      Profile Page
                    </button>
                    {user && user.admin && (
                      <button
                        className={`value ${location.pathname === '/dashboard' ? 'active' : ''}`}
                        onClick={() => window.location.href = '/dashboard'}
                      >
                        Dashboard
                      </button>
                    )}
                    <button onClick={handleLogout} className="value logout-button">
                      Log out
                    </button>
                  </div>
                )}
              </li>
            ) : (
              <>
                <li className="navbar-item">
                  <Link className="navbar-link" to="/LoginPage" onClick={() => setIsMobileMenuOpen(false)}>Log in</Link>
                </li>
                <li className="navbar-item">
                  <Link className="navbar-link" to="/RegistrationPage" onClick={() => setIsMobileMenuOpen(false)}>Sign up</Link>
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