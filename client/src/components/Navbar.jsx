import React, { useState, useEffect, useRef, memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "AuthContext";
import defaultProfilePic from "assets/images/default-profile-pic.png";
import Logo from "assets/images/logo-noText.svg";
import "../styles/Navbar.css";

const Navbar = memo(() => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const location = useLocation();
  const profileDropdownRef = useRef(null);
  const profileBtnRef = useRef(null);

  // Close menus when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [location]);

  // Handle body scroll
  useEffect(() => {
    if (isMobileMenuOpen) {
      // Save scroll position
      const scrollY = window.scrollY;
      
      // Lock body scroll
      document.body.classList.add("menu-open");
      document.body.style.top = `-${scrollY}px`;
      
      // Prevent touchmove on body
      const preventScroll = (e) => {
        if (!e.target.closest('.navbar-mobile-panel-content')) {
          e.preventDefault();
        }
      };
      document.body.addEventListener('touchmove', preventScroll, { passive: false });
      
      return () => {
        document.body.classList.remove("menu-open");
        document.body.style.top = '';
        window.scrollTo(0, scrollY);
        document.body.removeEventListener('touchmove', preventScroll);
      };
    } else {
      document.body.classList.remove("menu-open");
      document.body.style.top = '';
    }
  }, [isMobileMenuOpen]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target) &&
        !profileBtnRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const mobileMenu = document.getElementById('navbar-mobile-panel');
      const menuButton = document.querySelector('.navbar-mobile-toggle-btn');
      
      if (
        isMobileMenuOpen &&
        mobileMenu &&
        !mobileMenu.contains(event.target) &&
        menuButton &&
        !menuButton.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    logout();
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  // Check if a link is active
  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo" aria-label="DevQuest Home">
          <img src={Logo} alt="DevQuest Logo" />
        </Link>

        {/* Desktop Navigation */}
        <div className="navbar-nav">
          <Link
            to="/"
            className={`nav-link ${isActive("/") ? "active" : ""}`}
            aria-current={isActive("/") ? "page" : undefined}
          >
            Home
          </Link>
          <Link
            to="/CoursesPage"
            className={`nav-link ${isActive("/CoursesPage") ? "active" : ""}`}
            aria-current={isActive("/CoursesPage") ? "page" : undefined}
          >
            Courses
          </Link>
          <Link
            to="/pricing"
            className={`nav-link ${isActive("/pricing") ? "active" : ""}`}
            aria-current={isActive("/pricing") ? "page" : undefined}
          >
            Pricing
          </Link>
        </div>

        {/* Auth Section */}
        <div className="auth-section">
          {user ? (
            <div
              className="profile-button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              ref={profileBtnRef}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="true"
              tabIndex="0"
              role="button"
              aria-label="User menu"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setIsProfileMenuOpen(!isProfileMenuOpen);
                  e.preventDefault();
                }
              }}
            >
              <img
                src={user.profileimage || defaultProfilePic}
                alt={`${user.name || 'User'}'s profile`}
                className="profile-avatar"
                onError={(e) => {
                  console.error("[Navbar] Error loading profile image:", e);
                  e.target.src = defaultProfilePic;
                }}
              />
              <div
                className={`profile-dropdown ${isProfileMenuOpen ? "active" : ""}`}
                ref={profileDropdownRef}
              >
                <Link
                  to="/ProfilePage"
                  className="dropdown-item"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  to="/AccountSettings"
                  className="dropdown-item"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  Settings
                </Link>
                {user.admin && (
                  <Link
                    to="/dashboard"
                    className="dropdown-item"
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
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
          className="navbar-mobile-toggle-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-expanded={isMobileMenuOpen}
          aria-controls="navbar-mobile-panel"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          <span className="sr-only">Open main menu</span>
          <div className={`navbar-hamburger-icon ${isMobileMenuOpen ? "is-active" : ""}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`navbar-mobile-panel ${isMobileMenuOpen ? "is-open" : ""}`}
        id="navbar-mobile-panel"
        aria-hidden={!isMobileMenuOpen}
        style={{
          position: 'fixed',
          top: '70px',
          left: 0,
          right: 0,
          bottom: 0,
          height: 'calc(100vh - 70px)',
          zIndex: 999999,
          visibility: isMobileMenuOpen ? 'visible' : 'hidden',
          opacity: isMobileMenuOpen ? 1 : 0,
          pointerEvents: isMobileMenuOpen ? 'auto' : 'none',
          transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(100%)',
          display: isMobileMenuOpen ? 'block' : 'none'
        }}
      >
        <div className="navbar-mobile-panel-content">
          {user && (
            <div className="navbar-mobile-user-info">
              <img
                src={user.profileimage || defaultProfilePic}
                alt={`${user.name || 'User'}'s profile`}
                className="profile-avatar"
                onError={(e) => {
                  console.error("[Navbar] Error loading profile image:", e);
                  e.target.src = defaultProfilePic;
                }}
              />
              <div className="user-details">
                <div className="user-name">{user.name || "User"}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
          )}

          <Link
            to="/"
            className={`navbar-mobile-link ${isActive("/") ? "is-active" : ""}`}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-current={isActive("/") ? "page" : undefined}
          >
            Home
          </Link>
          <Link
            to="/CoursesPage"
            className={`navbar-mobile-link ${isActive("/CoursesPage") ? "is-active" : ""}`}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-current={isActive("/CoursesPage") ? "page" : undefined}
          >
            Courses
          </Link>
          <Link
            to="/pricing"
            className={`navbar-mobile-link ${isActive("/pricing") ? "is-active" : ""}`}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-current={isActive("/pricing") ? "page" : undefined}
          >
            Pricing
          </Link>

          {user ? (
            <>
              <div className="navbar-mobile-divider" />
              <Link
                to="/ProfilePage"
                className="navbar-mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Profile
              </Link>
              <Link
                to="/AccountSettings"
                className="navbar-mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Settings
              </Link>
              {user.admin && (
                <Link
                  to="/dashboard"
                  className="navbar-mobile-link"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}
              <button onClick={handleLogout} className="navbar-mobile-logout-btn">
                Logout
              </button>
            </>
          ) : (
            <>
              <div className="navbar-mobile-divider" />
              <Link
                to="/LoginPage"
                className="navbar-mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                to="/RegistrationPage"
                className="navbar-mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
});

Navbar.displayName = 'Navbar';

export default Navbar;
