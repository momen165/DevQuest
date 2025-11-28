'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/AccountSettingsSidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import MaintenanceCheck from '@/components/MaintenanceCheck';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/Billing.css';

interface Subscription {
  subscription_type: string;
  status: string;
  subscription_end_date: string;
  amount_paid: number;
}

const Billing: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [subscriptionDetails, setSubscriptionDetails] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!user || !user.token) {
      router.push('/');
    } else {
      fetchSubscriptionDetails();
    }
  }, [user, router]);

  const fetchSubscriptionDetails = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/check`,
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
    } catch (err: any) {
      console.error('Error:', err);
      setError(
        err.response?.data?.error || 'Error fetching subscription details',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/create-portal-session`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      );

      window.location.href = response.data.url;
    } catch (error: any) {
      console.error('Error:', error);
      setError(
        error.response?.data?.error || 'Failed to redirect to billing portal',
      );
    }
  };

  return (
    <MaintenanceCheck>
      <ProtectedRoute>
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
                        onClick={() => router.push('/pricing')}
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
      </ProtectedRoute>
    </MaintenanceCheck>
  );
};

export default Billing;
