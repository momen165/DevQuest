import React, { useState, useEffect } from 'react';
import 'styles/Billing.css'; // Create and import this CSS file for styling
import Navbar from 'components/Navbar';
import Sidebar from 'components/AccountSettingsSidebar';
import { useAuth } from 'AuthContext';
import axios from 'axios';

function Billing() {
  const { user } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [subscriptionId, setSubscriptionId] = useState('');

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const token = user?.token;

        if (!token) {
          setErrorMessage('No token found. Please log in again.');
          return;
        }

        const response = await axios.get('http://localhost:5000/api/subscriptions', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 200 && response.data.length > 0) {
          setSubscriptionId(response.data[0].subscription_id); // Assuming the user has only one subscription
        } else {
          setErrorMessage('No active subscription found.');
        }
      } catch (error) {
        setErrorMessage('Failed to fetch subscription details. Please try again.');
      }
    };

    fetchSubscription();
  }, [user]);

  const handleCancelSubscription = async () => {
    try {
      const token = user?.token;

      if (!token) {
        setErrorMessage('No token found. Please log in again.');
        return;
      }

      const response = await axios.delete('http://localhost:5000/api/subscription', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: {
          subscriptionId, // Use the actual subscription ID
        },
      });

      if (response.status === 200) {
        setSuccessMessage('Subscription cancelled successfully.');
        setTimeout(() => window.location.reload(), 2000); // Optional redirect or reload
      } else {
        setErrorMessage('Failed to cancel subscription. Please try again.');
      }
    } catch (error) {
      setErrorMessage('Failed to cancel subscription. Please try again.');
    }
  };

  return (
    <>
      <Navbar />
      <div className="billing-page">
        <Sidebar activeLink="billing" /> {/* Set activeLink to "billing" */}
        <div className="billing-content">
          <h2>Billing</h2>
          <div className="billing-details">
            <p><strong>Subscription type:</strong> <span className="highlight">ANNUAL MEMBER</span></p>
            <p><strong>Subscription renewal:</strong> <span className="highlight">8/8/2024</span></p>
            <p>
              <strong>Payment type:</strong>
              <button className="edit-payment-btn">Edit Payment Method</button>
            </p>
            <p>
              <strong>Cancel subscription:</strong>
              <button className="cancel-btn" onClick={handleCancelSubscription}>Cancel</button>
            </p>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {successMessage && <p className="success-message">{successMessage}</p>}
          </div>
        </div>
      </div>
    </>
  );
}

export default Billing;
