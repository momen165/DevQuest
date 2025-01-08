import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'styles/PricingPage.css';
import Navbar from 'components/Navbar';
import { useAuth } from 'AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import SupportForm from 'components/SupportForm';
import Footer from 'components/Footer';
import { useNavigate } from 'react-router-dom';


const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
const api_url = process.env.REACT_APP_API_URL;
const PricingPage = () => {
  const [isMonthly, setIsMonthly] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { user } = useAuth(); // Get the user and token from AuthContext
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setCheckingSubscription(false);
        return;
      }
      
      try {
        setCheckingSubscription(true);
        const response = await axios.get(`${api_url}/check`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
        setHasActiveSubscription(response.data.hasActiveSubscription);
      } catch (error) {
        console.error('Error checking subscription:', error);
        setHasActiveSubscription(false);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setHasActiveSubscription(false);
      setCheckingSubscription(false);
    }
  }, [user]);

  const handleChoosePlan = async () => {
    if (!user) {
      navigate('/LoginPage', { 
        state: { 
          from: '/pricing',
          message: 'Please log in to purchase a subscription' 
        } 
      });
      return;
    }

    setLoading(true);
    try {
      const stripe = await stripePromise;
      const { data } = await axios.post(`${api_url}/create-checkout-session`, {
        priceId: isMonthly ? 'price_1QV9vuHxgK7P1VPXGB14mjGT' : 'price_1QVBWXHxgK7P1VPX5pSXWJbG', // Use actual price IDs
      }, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      const { error } = await stripe.redirectToCheckout({ sessionId: data.id });
      if (error) {
        console.error('Stripe checkout error:', error);
        setErrorMessage('Failed to redirect to checkout.');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setErrorMessage('Failed to create checkout session.');
    } finally {
      setLoading(false);
    }
  };

  const openPopup = () => {
    if (!user) {
      navigate('/LoginPage', { 
        state: { 
          from: '/pricing',
          message: 'Please log in to purchase a subscription' 
        } 
      });
      return;
    }
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  return (
    <div className="pricing-page">
      <Navbar />
      <div className="pricing-content">
        <h1>Select the best plan that suits you</h1>
        <p>Unlock the full potential of DevQuest</p>

        {checkingSubscription ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Checking subscription status...</p>
          </div>
        ) : hasActiveSubscription ? (
          <div className="active-subscription-notice">
            <h2>You already have an active subscription</h2>
            <p>You can manage your subscription in your account settings.</p>
          </div>
        ) : (
          <>
            {/* Toggle between Monthly and Yearly Plans */}
            <div className="pricing-plan-toggle-container">
              <button
                className={`pricing-plan-toggle-btn ${isMonthly ? 'pricing-plan-toggle-btn--active' : ''}`}
                onClick={() => setIsMonthly(true)}
              >
                Monthly
              </button>
              <button
                className={`pricing-plan-toggle-btn ${!isMonthly ? 'pricing-plan-toggle-btn--active' : ''}`}
                onClick={() => setIsMonthly(false)}
              >
                Yearly <span className="pricing-plan-save-badge">save 30%</span>
              </button>
            </div>

            {/* Pricing Card */}
            <div className="pricing-card">
              <h2>${isMonthly ? 10 : 100}</h2> {/* Use fixed prices */}
              <p>/ {isMonthly ? 'month' : 'month (billed yearly)'}</p>
              <button className="choose-plan-button" onClick={openPopup}>
                Choose Plan
              </button>
            </div>

            <div id="card-container"></div>
          </>
        )}
      </div>

      {/* Popup for Subscription Confirmation */}
      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h2>Confirm Your Subscription</h2>
            <p>
              You have selected the <strong>{isMonthly ? 'Monthly' : 'Yearly'}</strong> plan for
              <strong> ${isMonthly ? 10 : 100}/month</strong>.
            </p>
            <button className="confirm-button" onClick={handleChoosePlan} disabled={loading}>
              {loading ? 'Processing...' : 'Confirm'}
            </button>
            <button className="cancel-button" onClick={closePopup}>
              Cancel
            </button>
            {successMessage && <p className="success-message">{successMessage}</p>}
            {errorMessage && <p className="error-message">{errorMessage}</p>}
          </div>
        </div>
      )}
      <SupportForm/>
      <Footer />

    </div>
  );
};

export default PricingPage;