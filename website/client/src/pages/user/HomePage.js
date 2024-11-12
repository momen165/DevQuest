// /src/pages/HomePage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

import Navbar from 'components/Navbar';
import FAQSection from 'components/FAQSection';
import 'styles/HomePage.css';
import heroimg from 'assets/images/hero-image.svg';



const HomePage = () => {
  const navigate = useNavigate();
  return (
    <>

      <Navbar />
      <section className="hero">
        <div className="hero-content">
          <h1>Unlock Your Coding Potential</h1>
          <p>Explore our wide range of courses and take your skills to the next level.</p>
          <div className="hero-buttons">
            <button className="btn browse-btn" onClick={() => navigate('/CoursesPage')}>Browse courses</button>
            <button className="btn create-btn" onClick={()=> navigate('/RegistrationPage')}>Create account</button >
            
          </div>
        </div>
        <div className="hero-image">
          <img src={heroimg} alt="Coding" />
        </div>
      </section>
      {/*<Slider/>*/}
      <FAQSection />
    </>
  );
};

export default HomePage;
