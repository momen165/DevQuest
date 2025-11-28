'use client';

import React from "react";
import { useRouter } from "next/navigation";

// Component Imports
import Navbar from "@/components/Navbar";
import FAQSection from "@/components/FAQSection";
import CoursesSlider from "@/components/slider";
import SupportForm from "@/components/SupportForm";
import Footer from "@/components/Footer";
import FeedbackCardScroll from "@/components/FeedbackCardScroll";

// Asset Imports
import Image from "next/image";
import heroimg from "@/public/assets/images/logo-noText.svg";

// Style Imports
import "@/styles/HomePage.css";

const HomePage = () => {
  const router = useRouter();

  // Auth State
  const user = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
  const parsedUser = user ? JSON.parse(user) : null;
  const hasToken = parsedUser && parsedUser.token;

  // Navigation Handlers
  const handleBrowseCourses = () => router.push("/CoursesPage");
  const handleCreateAccount = () => router.push("/RegistrationPage");
  const handleContinueLearning = () => router.push("/ProfilePage");

  return (
    <>
      <Navbar />
      <div className="homepage-container">
        <section className="hero-section">
          <div className="hero-content">
            <h1>Master Coding with DevQuest</h1>
            <p className="hero-subtitle">
              Interactive platform for learning Python, JavaScript, Java, C++ and more
            </p>
            <div className="hero-cta">
              {hasToken ? (
                <button onClick={handleContinueLearning} className="cta-button primary">
                  Continue Learning
                </button>
              ) : (
                <button onClick={handleCreateAccount} className="cta-button primary">
                  Get Started Free
                </button>
              )}
              <button onClick={handleBrowseCourses} className="cta-button secondary">
                Browse Courses
              </button>
            </div>
          </div>
          <div className="hero-image">
            <Image src={heroimg} alt="DevQuest Hero" width={400} height={400} priority />
          </div>
        </section>

        <CoursesSlider />
        <FeedbackCardScroll />
        <FAQSection />
        <SupportForm />
      </div>
      <Footer />
    </>
  );
};

export default HomePage;
