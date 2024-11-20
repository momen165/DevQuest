import React, { useState } from 'react';
import axios from 'axios';
import 'styles/PricingPage.css';
import Navbar from 'components/Navbar';

const PricingPage = () => {
  const [isMonthly, setIsMonthly] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChoosePlan = async () => {
    setLoading(true);
    setErrorMessage(""); // Reset error message
    try {
      const response = await axios.post('http://localhost:5000/api/subscribe', {
        amount_paid: isMonthly ? 20 : 168, // Only send the amount_paid
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`, // Include token
        },
      });

      if (response.status === 201) {
        setSuccessMessage("Subscription successful! Thank you for subscribing.");
        setTimeout(() => window.location.reload(), 2000); // Optional redirect or reload
      }
    } catch (err) {
      console.error("Subscription error:", err);
      setErrorMessage(err.response?.data?.error || "Subscription failed. Please try again.");
    }
    setLoading(false);
  };

  const openPopup = () => {
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    setSuccessMessage("");
    setErrorMessage("");
  };

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
          <button className="choose-plan-button" onClick={openPopup}>
            Choose Plan
          </button>
        </div>
      </div>

      {/* Popup for Subscription Confirmation */}
      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h2>Confirm Your Subscription</h2>
            <p>
              You have selected the <strong>{isMonthly ? "Monthly" : "Yearly"}</strong> plan for 
              <strong> ${isMonthly ? "20/month" : "14/month (billed yearly)"}</strong>.
            </p>
            <button className="confirm-button" onClick={handleChoosePlan} disabled={loading}>
              {loading ? "Processing..." : "Confirm"}
            </button>
            <button className="cancel-button" onClick={closePopup}>Cancel</button>
            {successMessage && <p className="success-message">{successMessage}</p>}
            {errorMessage && <p className="error-message">{errorMessage}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingPage;
