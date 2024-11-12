import React, { useState } from 'react';
import 'styles/PricingPage.css';
import Navbar from 'components/Navbar';

const PricingPage = () => {
  const [isMonthly, setIsMonthly] = useState(true);

  return (
    <div className="pricing-page">
      <Navbar />

      <div className="pricing-content">
        <h1>Select the best plan that suits you</h1>
        <p>Unlock the full potential of DevQuest</p>

        {/* Toggle between Monthly and Yearly Plans */}
        <div className="toggle-plan">
          <button
            className={`toggle-button ${isMonthly ? 'active' : ''}`}
            onClick={() => setIsMonthly(true)}
          >
            Monthly
          </button>
          <button
            className={`toggle-button ${!isMonthly ? 'active' : ''}`}
            onClick={() => setIsMonthly(false)}
          >
            Yearly <span className="save-badge">save 30%</span>
          </button>
        </div>

        {/* Pricing Card */}
        <div className="pricing-card">
          <h2>${isMonthly ? '20' : '14'}</h2>
          <p>/ {isMonthly ? 'month' : 'month (billed yearly)'}</p>
          <p className="plan-description">Access to everything</p>
          <p className="feature">All Courses available</p>
          <button className="choose-plan-button">Choose Plan</button>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
