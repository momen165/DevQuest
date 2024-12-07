import React, { useState, useEffect, useRef } from 'react';
import 'styles/Navbar.css';
import Logo from 'assets/icons/logo.svg';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import defaultProfilePic from '../assets/images/default-profile-pic.png';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.profileimage ? `${user.profileimage}?${new Date().getTime()}` : defaultProfilePic);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    setProfileImage(user?.profileimage ? `${user.profileimage}?${new Date().getTime()}` : defaultProfilePic);
  }, [user]);

  const toggleDropdown = () => {
    setIsDropdownOpen((prevState) => !prevState);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prevState) => !prevState);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    window.location.reload();
  };

  useEffect(() => {
    document.body.classList.add('body-padding-top-80');
    return () => {
      document.body.classList.remove('body-padding-top-80');
    };
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link className="navbar-logo" to="/">
          <img src={Logo} alt="DevQuest Logo" className="navbar-logo-image" />
        </Link>

        <button
          className={`mobile-menu-button ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          <span className="menu-icon"></span>
        </button>

        <div className={`mobile-menu-container ${isMobileMenuOpen ? 'active' : ''}`} ref={mobileMenuRef}>
          <ul className={`navbar-links navbar-left-links ${isMobileMenuOpen ? 'active' : ''}`}>
            <li className="navbar-item">
              <Link className="navbar-link" to="/" onClick={() => setIsMobileMenuOpen(false)}>
                Home
              </Link>
            </li>
            <li className="navbar-item">
              <Link className="navbar-link" to="/CoursesPage" onClick={() => setIsMobileMenuOpen(false)}>
                Courses
              </Link>
            </li>
          </ul>

          <input type="search" className="navbar-search" placeholder="Search..." aria-label="Search" />

          <ul className={`navbar-links navbar-right-links ${isMobileMenuOpen ? 'active' : ''}`}>
            <li className="navbar-item">
              <Link className="navbar-link" to="/pricing" onClick={() => setIsMobileMenuOpen(false)}>
                Pricing
              </Link>
            </li>

            {user ? (
              <li className="navbar-item dropdown" ref={dropdownRef}>
                <div className="profile-container" onClick={toggleDropdown}>
                  <img src={profileImage} alt="User Profile" className="navbar-profile-picture" />
                </div>
                <div className={`dropdown-content ${isDropdownOpen ? 'show' : ''}`}>
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
              </li>
            ) : (
              <>
                <li className="navbar-item">
                  <Link className="navbar-link" to="/LoginPage" onClick={() => setIsMobileMenuOpen(false)}>
                    Log in
                  </Link>
                </li>
                <li className="navbar-item">
                  <Link className="navbar-link" to="/RegistrationPage" onClick={() => setIsMobileMenuOpen(false)}>
                    Sign up
                  </Link>
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
