import React, { useState, useEffect } from 'react';
import Sidebar from 'pages/admin/components/Sidebar';
import 'pages/admin/styles/PaymentInfo.css';
import { useAuth } from 'AuthContext';

const PaymentDetails = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const { user } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const token = user?.token;

        if (!token) {
          setError('No token found. Please log in again.');
          return;
        }

        const response = await fetch('http://localhost:5000/api/list-subscriptions', {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Fetched subscriptions:', data); // Log the fetched data
        setSubscriptions(data); // Set the fetched data directly
      } catch (err) {
        console.error('Error fetching subscriptions:', err); // Log the error
        setError('Failed to fetch subscription details. Please try again later.');
      }
    };

    fetchSubscriptions();
  }, [user]);

  if (error) {
    return <div className="admin-payment-error-message">{error}</div>;
  }

  return (
    <div className="admin-payment-container">
      <Sidebar />
      <div className="admin-payment-main-content">
        <h2 className="admin-payment-h2">Subscription Details</h2>
        <table className="admin-payment-table">
          <thead>
            <tr>
              <th>Subscription ID</th>
              <th>Subscription Type</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Amount Paid</th>
              <th>Status</th>
              <th>User Email</th>
              <th>User ID</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((subscription) => (
                <tr key={subscription.subscription_id}>
                  <td>{subscription.subscription_id}</td>
                  <td>{subscription.subscription_type}</td>
                  <td>{new Date(subscription.subscription_start_date).toLocaleDateString()}</td>
                  <td>{new Date(subscription.subscription_end_date).toLocaleDateString()}</td>
                  <td>${subscription.amount_paid}</td>
                <td>{subscription.status}</td>
                  <td>{subscription.user_email}</td>
                  <td>{subscription.user_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentDetails;