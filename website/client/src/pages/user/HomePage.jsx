import React from 'react';
import { useNavigate } from 'react-router-dom';

import Navbar from 'components/Navbar';
import FAQSection from 'components/FAQSection';
import 'styles/HomePage.css';
import SupportForm from 'components/SupportForm';
import heroimg from 'assets/images/hero-img.webp';

const HomePage = () => {
    const navigate = useNavigate();
    const user = localStorage.getItem('user');
    const parsedUser = user ? JSON.parse(user) : null;
    const hasToken = parsedUser && parsedUser.token;

    return (
        <>
            <Navbar />
            <section className="hero">
                <div className="hero-content">
                    <h1>Unlock Your Coding Potential</h1>
                    <p>Explore our wide range of courses and take your skills to the next level.</p>
                    <div className="hero-buttons">
                        <button className="btn browse-btn" onClick={() => navigate('/CoursesPage')}>Browse courses</button>
                        {!hasToken && (
                            <button className="btn create-btn" onClick={() => navigate('/RegistrationPage')}>Create account</button>
                        )}
                        {hasToken && ( // Conditionally render the button
                            <button className="btn continue-btn" onClick={() => navigate('/ProfilePage')}>Continue learning</button>
                        )}
                    </div>
                </div>
                <div className="hero-image">
                    <img src={heroimg} alt="Coding" />
                </div>
            </section>
            {hasToken && <SupportForm />}
            <FAQSection />
        </>
    );
};

export default HomePage;