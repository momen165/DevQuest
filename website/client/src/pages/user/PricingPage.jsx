import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'styles/PricingPage.css';
import Navbar from 'components/Navbar';
import { useAuth } from 'AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import SupportForm from 'components/SupportForm';
import { useNavigate } from 'react-router-dom';

const stripePromise = loadStripe('pk_test_51MEwjHHxgK7P1VPXXJ1r4MdpeelwFLaBX9kslA7Z4O6V5CjE8B20DVkiSmp6XB0HPwKVnYFYacECLxYMZUOO4Fmm00m79WAvXD'); // Replace with your actual publishable key



const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

const PricingPage = () => {
  const [isMonthly, setIsMonthly] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { user } = useAuth(); // Get the user and token from AuthContext
  const [hasActiveSubscription, setHasActiveSubscription] = useState(() => {
    try {
      const stored = localStorage.getItem('subscriptionStatus');
      if (stored) {
        const data = JSON.parse(stored);
        if (data && typeof data.status === 'boolean' && typeof data.timestamp === 'number') {
          if (Date.now() - data.timestamp < CACHE_DURATION) {
            return data.status;
          }
        }
      }
    } catch (error) {
      console.error('Error parsing stored subscription status:', error);
    }
    return false;
  });
  const navigate = useNavigate();

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        // Check if we have a recent cache
        const stored = localStorage.getItem('subscriptionStatus');
        if (stored) {
          const data = JSON.parse(stored);
          if (Date.now() - data.timestamp < CACHE_DURATION) {
            return; // Use cached data if it's less than 5 minutes old
          }
        }

        // Otherwise fetch from server
        const response = await axios.get(`http://localhost:5000/api/check`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
        
        const subscriptionData = {
          status: Boolean(response.data.hasActiveSubscription),
          timestamp: Date.now()
        };
        localStorage.setItem('subscriptionStatus', JSON.stringify(subscriptionData));
        setHasActiveSubscription(subscriptionData.status);
      } catch (error) {
        console.error('Error checking subscription:', error);
        localStorage.removeItem('subscriptionStatus');
        setHasActiveSubscription(false);
      }
    };

    if (user) {
      checkSubscription();
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setHasActiveSubscription(false);
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
      const { data } = await axios.post('http://localhost:5000/api/create-checkout-session', {
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

        {hasActiveSubscription ? (
          <div className="active-subscription-notice">
            <h2>You already have an active subscription</h2>
            <p>You can manage your subscription in your account settings.</p>
          </div>
        ) : (
          <>
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
    </div>
  );
};

export default PricingPage;