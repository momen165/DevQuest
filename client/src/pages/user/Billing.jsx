// Billing.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "components/Navbar";
import Sidebar from "components/AccountSettingsSidebar";
import { useAuth } from "AuthContext";
import "styles/Billing.css";

function Billing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!user || !user.token) {
      navigate("/");
    } else {
      fetchSubscriptionDetails();
    }
  }, [user, navigate]);

  const fetchSubscriptionDetails = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/check`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      );

      const data = response.data;
     

      if (data.hasActiveSubscription && data.subscription) {
        setSubscriptionDetails(data.subscription);
      } else {
        setSubscriptionDetails(null);
      }
    } catch (err) {
      console.error("Error:", err);
      setError(
        err.response?.data?.error || "Error fetching subscription details",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/create-portal-session`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      );

      window.location.href = response.data.url;
    } catch (error) {
      console.error("Error:", error);
      setError(
        error.response?.data?.error || "Failed to redirect to billing portal",
      );
    }
  };

  return (
    <>
      <Navbar />
      <div className="billing-container">
        <Sidebar activeLink="billing" />
        <div className="billing-main">
          <h1 className="billing-main-title">Billing & Subscription</h1>

          {error && <div className="billing-error-message">{error}</div>}
          {successMessage && (
            <div className="billing-success-message">{successMessage}</div>
          )}

          {loading ? (
            <div className="billing-loading-text">
              Loading subscription details...
            </div>
          ) : (
            <div className="billing-details-container">
              {subscriptionDetails ? (
                <>
                  <div className="billing-subscription-card">
                    <h2 className="billing-subscription-title">Current Plan</h2>
                    <div className="billing-subscription-info">
                      <div className="billing-info-row">
                        <span className="billing-info-label">Plan Type:</span>
                        <span className="billing-info-value">
                          {subscriptionDetails.subscription_type}
                        </span>
                      </div>
                      <div className="billing-info-row">
                        <span className="billing-info-label">Status:</span>
                        <span className="billing-info-value">
                          {subscriptionDetails.status}
                        </span>
                      </div>
                      <div className="billing-info-row">
                        <span className="billing-info-label">
                          Next Billing Date:
                        </span>
                        <span className="billing-info-value">
                          {new Date(
                            subscriptionDetails.subscription_end_date,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="billing-info-row">
                        <span className="billing-info-label">Amount:</span>
                        <span className="billing-info-value">
                          ${subscriptionDetails.amount_paid}/month
                        </span>
                      </div>
                    </div>
                    <button
                      className="billing-button"
                      onClick={handleManageSubscription}
                    >
                      Manage Subscription
                    </button>
                  </div>
                </>
              ) : (
                <div className="billing-no-subscription">
                  <h2 className="billing-no-subscription-title">
                    No Active Subscription
                  </h2>
                  <p className="billing-no-subscription-text">
                    You currently don't have an active subscription.
                  </p>
                  <button
                    className="billing-button"
                    onClick={() => navigate("/pricing")}
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
