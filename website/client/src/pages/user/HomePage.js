// /src/pages/HomePage.js
import React from 'react';
import Navbar from 'components/Navbar';
import FAQSection from 'components/FAQSection';
import 'styles/HomePage.css';
import heroimg from 'assets/images/hero-image.svg';



const HomePage = () => {
  return (
    <>
      <Navbar />
      <section className="hero">
        <div className="hero-content">
          <h1>Unlock Your Coding Potential</h1>
          <p>Explore our wide range of courses and take your skills to the next level.</p>
          <div className="hero-buttons">
            <button className="btn browse-btn">Browse courses</button>
            <button className="btn create-btn">Create account</button>
          </div>
        </div>
        <div className="hero-image">
          <img src={heroimg} alt="Coding" />
        </div>
      </section>
      <FAQSection />
    </>
  );
};

export default HomePage;