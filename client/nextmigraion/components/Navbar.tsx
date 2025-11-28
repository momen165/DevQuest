'use client';

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import defaultProfilePic from "@/public/assets/images/default-profile-pic.png";
import Logo from "@/public/assets/images/logo-noText.svg";
import "@/styles/Navbar.css";

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const pathname = usePathname();
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const profileBtnRef = useRef<HTMLDivElement>(null);

  // Close menus when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [pathname]);

  // Handle body scroll
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
    }
    return () => {
      document.body.classList.remove("menu-open");
    };
  }, [isMobileMenuOpen]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node) &&
        profileBtnRef.current &&
        !profileBtnRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  // Check if a link is active
  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === path;
    }
    return pathname?.startsWith(path);
  };

  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar-container">
        {/* Logo */}
        <Link href="/" className="navbar-logo" aria-label="DevQuest Home">
          <Image src={Logo} alt="DevQuest Logo" width={40} height={40} />
        </Link>

        {/* Desktop Navigation */}
        <div className="navbar-nav">
          <Link
            href="/"
            className={`nav-link ${isActive("/") ? "active" : ""}`}
            aria-current={isActive("/") ? "page" : undefined}
          >
            Home
          </Link>
          <Link
            href="/CoursesPage"
            className={`nav-link ${isActive("/CoursesPage") ? "active" : ""}`}
            aria-current={isActive("/CoursesPage") ? "page" : undefined}
          >
            Courses
          </Link>
          <Link
            href="/pricing"
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
              tabIndex={0}
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
                src={user.profileimage || defaultProfilePic.src}
                alt={`${user.name || 'User'}'s profile`}
                className="profile-avatar"
                onError={(e) => {
                  console.error("[Navbar] Error loading profile image:", e);
                  (e.target as HTMLImageElement).src = defaultProfilePic.src;
                }}
              />
              <div
                className={`profile-dropdown ${isProfileMenuOpen ? "active" : ""}`}
                ref={profileDropdownRef}
              >
                <Link
                  href="/ProfilePage"
                  className="dropdown-item"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  href="/AccountSettings"
                  className="dropdown-item"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  Settings
                </Link>
                {user.admin && (
                  <Link
                    href="/Dashboard"
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
              <Link href="/LoginPage" className="login-button">
                Log in
              </Link>
              <Link href="/RegistrationPage" className="signup-button">
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          <span className="sr-only">Open main menu</span>
          <div className={`hamburger ${isMobileMenuOpen ? "active" : ""}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`mobile-menu ${isMobileMenuOpen ? "active" : ""}`}
        id="mobile-menu"
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="mobile-menu-content">
          {user && (
            <div className="mobile-user-info">
              <img
                src={user.profileimage || defaultProfilePic.src}
                alt={`${user.name || 'User'}'s profile`}
                className="profile-avatar"
                onError={(e) => {
                  console.error("[Navbar] Error loading profile image:", e);
                  (e.target as HTMLImageElement).src = defaultProfilePic.src;
                }}
              />
              <div className="user-details">
                <div className="user-name">{user.name || "User"}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
          )}

          <Link
            href="/"
            className={`mobile-nav-link ${isActive("/") ? "active" : ""}`}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-current={isActive("/") ? "page" : undefined}
          >
            Home
          </Link>
          <Link
            href="/CoursesPage"
            className={`mobile-nav-link ${isActive("/CoursesPage") ? "active" : ""}`}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-current={isActive("/CoursesPage") ? "page" : undefined}
          >
            Courses
          </Link>
          <Link
            href="/pricing"
            className={`mobile-nav-link ${isActive("/pricing") ? "active" : ""}`}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-current={isActive("/pricing") ? "page" : undefined}
          >
            Pricing
          </Link>

          {user ? (
            <>
              <div className="mobile-divider" />
              <Link
                href="/ProfilePage"
                className="mobile-nav-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Profile
              </Link>
              <Link
                href="/AccountSettings"
                className="mobile-nav-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Settings
              </Link>
              {user.admin && (
                <Link
                  href="/Dashboard"
                  className="mobile-nav-link"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
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
              <Link
                href="/LoginPage"
                className="mobile-nav-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/RegistrationPage"
                className="mobile-nav-link"
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
};

export default Navbar;
