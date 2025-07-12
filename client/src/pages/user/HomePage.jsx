import React, { Fragment } from "react";
import { useNavigate } from "react-router-dom";

// Component Imports
import Navbar from "../../components/Navbar";
import FAQSection from "../../components/FAQSection";
import CoursesSlider from "../../components/slider";
import SupportForm from "../../components/SupportForm";
import Footer from "../../components/Footer";
import FeedbackCardScroll from "../../components/FeedbackCardScroll";
import SEOHead from "../../components/SEOHead";

// Asset Imports
import heroimg from "../../assets/images/logo-noText.svg";

// Style Imports
import "../../styles/HomePage.css";

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

  // Structured data for homepage
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "DevQuest",
    "description": "Interactive coding education platform offering comprehensive programming courses",
    "url": "https://www.dev-quest.tech",
    "logo": "https://www.dev-quest.tech/websiteicon.ico",
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
            "url": "https://www.dev-quest.tech"
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
              "url": "https://www.dev-quest.tech"
            }
          }],
          "offers": {
            "@type": "Offer",
            "category": "Education",
            "url": "https://www.dev-quest.tech/courses",
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
            "url": "https://www.dev-quest.tech"
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
              "url": "https://www.dev-quest.tech"
            }
          }],
          "offers": {
            "@type": "Offer",
            "category": "Education",
            "url": "https://www.dev-quest.tech/courses",
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
            "url": "https://www.dev-quest.tech"
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
              "url": "https://www.dev-quest.tech"
            }
          }],
          "offers": {
            "@type": "Offer",
            "category": "Education",
            "url": "https://www.dev-quest.tech/courses",
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock"
          }
        }
      ]
    }
  };

  return (
    <>
      <SEOHead
        title="DevQuest - Master Coding with Interactive Programming Courses"
        description="Unlock your coding potential with DevQuest's interactive platform. Learn Python, JavaScript, Java, C++ and more through hands-on exercises, real-time feedback, and gamified learning experience. Start your programming journey today!"
        keywords="learn programming, coding courses, Python tutorial, JavaScript course, Java programming, C++ development, interactive coding, programming education, coding bootcamp, developer training"
        canonical="/"
        structuredData={structuredData}
      />
      
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
            <img src={heroimg} alt="DevQuest interactive coding platform illustration showing programming interface and learning elements" />
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
