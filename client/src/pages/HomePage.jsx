import React, { Fragment } from "react";
import { useNavigate } from "react-router-dom";

// Component Imports
import Navbar from "shared/ui/Navbar";
import FAQSection from "shared/ui/FAQSection";
import CoursesSlider from "shared/ui/slider";
import SupportForm from "features/support/components/SupportForm";
import Footer from "shared/ui/Footer";
import FeedbackCardScroll from "features/feedback/components/FeedbackCardScroll";
import SEOHead from "shared/seo/SEOHead";
import AdSense from "shared/ui/AdSense";
import { useAuth } from "app/AuthContext";

// Asset Imports
import heroimg from "assets/images/logo-noText.svg";

// Style Imports
import "./HomePage.css";

const HomePage = () => {
  // Hooks
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Navigation Handlers
  const handleBrowseCourses = () => navigate("/CoursesPage");
  const handleCreateAccount = () => navigate("/RegistrationPage");
  const handleContinueLearning = () => navigate("/ProfilePage");

  // Structured data for homepage
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "DevQuest",
    "description": "Interactive coding education platform offering comprehensive programming courses",
    "url": "https://www.dev-quest.me",
    "logo": "https://www.dev-quest.me/websiteicon.ico",
    "sameAs": [],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": "English"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Programming Courses",
      "itemListElement": [
        {
          "@type": "Course",
          "name": "Python Programming",
          "description": "Comprehensive Python programming course with hands-on exercises",
          "provider": {
            "@type": "EducationalOrganization",
            "name": "DevQuest",
            "url": "https://www.dev-quest.me"
          },
          "hasCourseInstance": [{
            "@type": "CourseInstance",
            "courseMode": "online",
            "instructor": {
              "@type": "Person",
              "name": "DevQuest Team"
            },
            "startDate": "2025-01-01",
            "endDate": "2025-12-31",
            "courseWorkload": "PT20H",
            "location": {
              "@type": "VirtualLocation",
              "url": "https://www.dev-quest.me"
            }
          }],
          "offers": {
            "@type": "Offer",
            "category": "Education",
            "url": "https://www.dev-quest.me/courses",
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock"
          }
        },
        {
          "@type": "Course", 
          "name": "JavaScript Development",
          "description": "Interactive JavaScript course for web development",
          "provider": {
            "@type": "EducationalOrganization",
            "name": "DevQuest",
            "url": "https://www.dev-quest.me"
          },
          "hasCourseInstance": [{
            "@type": "CourseInstance",
            "courseMode": "online",
            "instructor": {
              "@type": "Person",
              "name": "DevQuest Team"
            },
            "startDate": "2025-01-01",
            "endDate": "2025-12-31",
            "courseWorkload": "PT25H",
            "location": {
              "@type": "VirtualLocation",
              "url": "https://www.dev-quest.me"
            }
          }],
          "offers": {
            "@type": "Offer",
            "category": "Education",
            "url": "https://www.dev-quest.me/courses",
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock"
          }
        },
        {
          "@type": "Course",
          "name": "Java Programming", 
          "description": "Object-oriented programming with Java",
          "provider": {
            "@type": "EducationalOrganization",
            "name": "DevQuest",
            "url": "https://www.dev-quest.me"
          },
          "hasCourseInstance": [{
            "@type": "CourseInstance",
            "courseMode": "online",
            "instructor": {
              "@type": "Person",
              "name": "DevQuest Team"
            },
            "startDate": "2025-01-01",
            "endDate": "2025-12-31",
            "courseWorkload": "PT30H",
            "location": {
              "@type": "VirtualLocation",
              "url": "https://www.dev-quest.me"
            }
          }],
          "offers": {
            "@type": "Offer",
            "category": "Education",
            "url": "https://www.dev-quest.me/courses",
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock"
          }
        }
      ]
    }
  };

  return (
    <div className="home-page">
      <SEOHead
        title="DevQuest - Master Coding with Interactive Programming Courses"
        description="Unlock your coding potential with DevQuest's interactive platform. Learn Python, JavaScript, Java, C++ and more through hands-on exercises, real-time feedback, and gamified learning experience. Start your programming journey today!"
        keywords="learn programming, coding courses, Python tutorial, JavaScript course, Java programming, C++ development, interactive coding, programming education, coding bootcamp, developer training"
        canonical="/"
        structuredData={structuredData}
      />
      
      {/* Navigation */}
      <Navbar />

      {/* Decorative background elements */}
      <div className="home-bg-decoration">
        <div className="home-orb home-orb--1"></div>
        <div className="home-orb home-orb--2"></div>
        <div className="home-orb home-orb--3"></div>
        <div className="home-orb home-orb--4"></div>
        <div className="home-grid-pattern"></div>
      </div>

      {/* Main Content */}
      <section className="hero">
        {/* Hero Section */}
        <div className="hero-arrange">
          <div className="hero-content">
            <span className="hero-badge">Start Learning Today</span>
            <h1 className="hero-header">
              Unlock Your <span className="hero-gradient-text">Coding Potential</span>
            </h1>
            <p className="hero-section-para">
              Explore our wide range of courses and take your skills to the next
              level.
            </p>

            {/* Action Buttons */}
            <div className="hero-buttons">
              <button className="btn browse-btn" onClick={handleBrowseCourses}>
                <span>Browse courses</span>
                <svg className="btn-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {!isAuthenticated && (
                <button
                  className="btn create-btn"
                  onClick={handleCreateAccount}
                >
                  Create account
                </button>
              )}

              {isAuthenticated && (
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
            <div className="hero-image-glow"></div>
            <img src={heroimg} alt="DevQuest interactive coding platform illustration showing programming interface and learning elements" />
          </div>
        </div>

        {/* Additional Sections */}
        {/* <AnimatedLogo /> */}

        <div className="CourseSlider-section">
          <CoursesSlider />
        </div>

        {/* Ad Unit - Between course slider and feedback */}
        <div style={{ margin: '40px auto', maxWidth: '1200px', minWidth: '300px', width: '100%', textAlign: 'center' }}>
          <AdSense />
        </div>

        <div className="feedback-wrapper">
          <FeedbackCardScroll />
        </div>

        <FAQSection />
      </section>

      {/* Support Form for all users */}
      <SupportForm />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HomePage;
