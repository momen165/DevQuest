import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../../pages/admin/components/Sidebar";
import "../../pages/admin/styles/PaymentInfo.css";
import { useAuth } from "../../AuthContext";

const PaymentDetails = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const { user } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const token = user?.token;

        if (!token) {
          setError("No token found. Please log in again.");
          return;
        }

        const response = await axios.get(
          `${import.meta.env.REACT_APP_API_URL}/api/list-subscriptions`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        
        setSubscriptions(response.data); // With axios, we can directly use response.data
      } catch (err) {
        console.error("Error fetching subscriptions:", err); // Log the error
        setError(
          "Failed to fetch subscription details. Please try again later.",
        );
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
            {Array.isArray(subscriptions) && subscriptions.map((subscription) => (
              <tr key={subscription.subscription_id}>
                <td>{subscription.subscription_id}</td>
                <td>{subscription.subscription_type}</td>
                <td>
                  {new Date(
                    subscription.subscription_start_date,
                  ).toLocaleDateString()}
                </td>
                <td>
                  {new Date(
                    subscription.subscription_end_date,
                  ).toLocaleDateString()}
                </td>
                <td>${subscription.amount_paid}</td>
                <td
                  className={`admin-payment-status-${subscription.status.toLowerCase()}`}
                >
                  {subscription.status}
                </td>
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
