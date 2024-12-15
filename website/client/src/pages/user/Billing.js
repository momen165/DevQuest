// Billing.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from 'components/Navbar';
import Sidebar from 'components/AccountSettingsSidebar';
import { useAuth } from 'AuthContext';
import 'styles/Billing.css';

function Billing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!user || !user.token) {
      navigate('/');
    } else {
      fetchSubscriptionDetails();
    }
  }, [user, navigate]);

  // website/client/src/pages/user/Billing.js
const fetchSubscriptionDetails = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/check', {
      headers: {
        'Authorization': `Bearer ${user.token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch subscription details');
    }

    const data = await response.json();
    console.log('Subscription data:', data); // Add this for debugging

    if (data.hasActiveSubscription && data.subscription) {
      setSubscriptionDetails(data.subscription);
    } else {
      setSubscriptionDetails(null);
    }
  } catch (err) {
    console.error('Error:', err);
    setError('Error fetching subscription details');
  } finally {
    setLoading(false);
  }
};

  // website/client/src/pages/user/Billing.js

const handleManageSubscription = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/create-portal-session', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create portal session');
    }

    const { url } = await response.json();
    window.location.href = url;
  } catch (error) {
    console.error('Error:', error);
    setError(error.message || 'Failed to redirect to billing portal');
  }
};

  return (
    <>
      <Navbar />
      <div className="billing-page">
        <Sidebar activeLink="billing" />
        <div className="billing-content">
          <h1>Billing & Subscription</h1>
          
          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}

          {loading ? (
            <div className="loading">Loading subscription details...</div>
          ) : (
            <div className="billing-details">
              {subscriptionDetails ? (
                <>
                  <div className="subscription-card">
                    <h2>Current Plan</h2>
                    <div className="subscription-info">
                      <div className="info-row">
                        <span>Plan Type:</span>
                        <span>{subscriptionDetails.subscription_type}</span>
                      </div>
                      <div className="info-row">
                        <span>Status:</span>
                        <span>{subscriptionDetails.status}</span>
                      </div>
                      <div className="info-row">
                        <span>Next Billing Date:</span>
                        <span>
                          {new Date(subscriptionDetails.subscription_end_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="info-row">
                        <span>Amount:</span>
                        <span>${subscriptionDetails.amount_paid}/month</span>
                      </div>
                    </div>
                    <button 
                      className="manage-subscription-btn"
                      onClick={handleManageSubscription}
                    >
                      Manage Subscription
                    </button>
                  </div>

                 
                </>
              ) : (
                <div className="no-subscription">
                  <h2>No Active Subscription</h2>
                  <p>You currently don't have an active subscription.</p>
                  <button 
                    className="subscribe-btn"
                    onClick={() => navigate('/pricing')}
                  >
                    View Available Plans
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Billing;