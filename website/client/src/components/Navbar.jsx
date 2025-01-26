import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import defaultProfilePic from '../assets/images/default-profile-pic.png';
import Logo from '../assets/images/logo-noText.svg';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [imageKey, setImageKey] = useState(Date.now());
  const location = useLocation();

  // Update imageKey when user profile image changes
  useEffect(() => {
    if (user?.profileimage) {
      setImageKey(Date.now());
    }
  }, [user?.profileimage]);

  // Close menus when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [location]);

  // Handle body scroll
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
    return () => {
      document.body.classList.remove('menu-open');
    };
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    logout();
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <img src={Logo} alt="DevQuest Logo" />
        </Link>

        {/* Desktop Navigation */}
        <div className="navbar-nav">
          <Link to="/" className="nav-link">
            Home
          </Link>
          <Link to="/CoursesPage" className="nav-link">
            Courses
          </Link>
          <Link to="/pricing" className="nav-link">
            Pricing
          </Link>
        </div>

        {/* Auth Section */}
        <div className="auth-section">
          {user ? (
            <div className="profile-button" onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
              <img 
                key={imageKey}
                src={`${user.profileimage || defaultProfilePic}${user.profileimage ? `?t=${imageKey}` : ''}`}
                alt="Profile" 
                className="profile-avatar"
                onError={(e) => {
                  console.error('[Navbar] Error loading profile image:', e);
                  e.target.src = defaultProfilePic;
                }}
              />
              <div className={`profile-dropdown ${isProfileMenuOpen ? 'active' : ''}`}>
                <Link to="/ProfilePage" className="dropdown-item" onClick={() => setIsProfileMenuOpen(false)}>
                  Profile
                </Link>
                <Link to="/AccountSettings" className="dropdown-item" onClick={() => setIsProfileMenuOpen(false)}>
                  Settings
                </Link>
                {user.admin && (
                  <Link to="/dashboard" className="dropdown-item" onClick={() => setIsProfileMenuOpen(false)}>
                    Dashboard
                  </Link>
                )}
                <button onClick={handleLogout} className="dropdown-item logout">
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link to="/LoginPage" className="login-button">
                Log in
              </Link>
              <Link to="/RegistrationPage" className="signup-button">
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="sr-only">Open main menu</span>
          <div className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-content">
          {user && (
            <div className="mobile-user-info">
              <img
                key={imageKey}
                src={`${user.profileimage || defaultProfilePic}${user.profileimage ? `?t=${imageKey}` : ''}`}
                alt="Profile"
                className="profile-avatar"
                onError={(e) => {
                  console.error('[Navbar] Error loading profile image:', e);
                  e.target.src = defaultProfilePic;
                }}
              />
              <div className="user-details">
                <div className="user-name">{user.name || 'User'}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
          )}

          <Link to="/" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
            Home
          </Link>
          <Link to="/CoursesPage" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
            Courses
          </Link>
          <Link to="/pricing" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
            Pricing
          </Link>

          {user ? (
            <>
              <div className="mobile-divider" />
              <Link to="/ProfilePage" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                Profile
              </Link>
              <Link to="/AccountSettings" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                Settings
              </Link>
              {user.admin && (
                <Link to="/dashboard" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                  Dashboard
                </Link>
              )}
              <button onClick={handleLogout} className="mobile-logout-button">
                Logout
              </button>
            </>
          ) : (
            <>
              <div className="mobile-divider" />
              <Link to="/LoginPage" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                Log in
              </Link>
              <Link to="/RegistrationPage" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;