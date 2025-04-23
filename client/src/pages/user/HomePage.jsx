import React, { Fragment } from "react";
import { useNavigate } from "react-router-dom";

// Component Imports
import Navbar from "components/Navbar";
import FAQSection from "components/FAQSection";

import CoursesSlider from "components/Slider";
import SupportForm from "components/SupportForm";
import Footer from "components/Footer";
import FeedbackCardScroll from "components/FeedbackCardScroll";

// Asset Imports
import heroimg from "assets/images/logo-noText.svg";

// Style Imports
import "styles/HomePage.css";

const HomePage = () => {
  // Hooks
  const navigate = useNavigate();

  // Auth State
  const user = localStorage.getItem("user");
  const parsedUser = user ? JSON.parse(user) : null;
  const hasToken = parsedUser && parsedUser.token;

  // Navigation Handlers
  const handleBrowseCourses = () => navigate("/CoursesPage");
  const handleCreateAccount = () => navigate("/RegistrationPage");
  const handleContinueLearning = () => navigate("/ProfilePage");

  return (
    <>
      {/* Navigation */}
      <Navbar />

      {/* Main Content */}
      <section className="hero">
        {/* Hero Section */}
        <div className="hero-arrange">
          <div className="hero-content">
            <h1 className="hero-header">Unlock Your Coding Potential</h1>
            <p className="hero-section-para">
              Explore our wide range of courses and take your skills to the next
              level.
            </p>

            {/* Action Buttons */}
            <div className="hero-buttons">
              <button className="btn browse-btn" onClick={handleBrowseCourses}>
                Browse courses
              </button>

              {!hasToken && (
                <button
                  className="btn create-btn"
                  onClick={handleCreateAccount}
                >
                  Create account
                </button>
              )}

              {hasToken && (
                <button
                  className="btn continue-btn"
                  onClick={handleContinueLearning}
                >
                  Continue learning
                </button>
              )}
            </div>
          </div>

          {/* Hero Image */}
          <div className="hero-image">
            <img src={heroimg} alt="Coding" />
          </div>
        </div>

        {/* Additional Sections */}
        {/* <AnimatedLogo /> */}

        <div className="CourseSlider-section">
          <CoursesSlider />
        </div>

        <div className="feedback-wrapper">
          <FeedbackCardScroll />
        </div>

        <FAQSection />
      </section>

      {/* Conditional Support Form */}
      {hasToken && <SupportForm />}

      {/* Footer */}
      <Footer />
    </>
  );
};

export default HomePage;
