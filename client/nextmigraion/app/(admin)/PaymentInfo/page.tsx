'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProtectedRoute from '@/components/ProtectedRoute';
import MaintenanceCheck from '@/components/MaintenanceCheck';
import Sidebar from '@/components/admin/Sidebar';
import '@/styles/admin/PaymentInfo.css';
import { useAuth } from '@/contexts/AuthContext';

interface Subscription {
  subscription_id: number;
  subscription_type: string;
  subscription_start_date: string;
  subscription_end_date: string;
  amount_paid: number;
  status: string;
  user_email: string;
  user_id: number;
}

const PaymentDetails: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const { user } = useAuth();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const token = user?.token;

        if (!token) {
          setError('No token found. Please log in again.');
          return;
        }

        const response = await axios.get<Subscription[]>(
          `${process.env.NEXT_PUBLIC_API_URL}/api/list-subscriptions`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setSubscriptions(response.data);
      } catch (err: any) {
        console.error('Error fetching subscriptions:', err);
        setError('Failed to fetch subscription details. Please try again later.');
      }
    };

    fetchSubscriptions();
  }, [user]);

  if (error) {
    return <div className="admin-payment-error-message">{error}</div>;
  }

  return (
    <MaintenanceCheck>
      <ProtectedRoute adminRequired={true}>
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
                {Array.isArray(subscriptions) &&
                  subscriptions.map((subscription) => (
                    <tr key={subscription.subscription_id}>
                      <td>{subscription.subscription_id}</td>
                      <td>{subscription.subscription_type}</td>
                      <td>{new Date(subscription.subscription_start_date).toLocaleDateString()}</td>
                      <td>{new Date(subscription.subscription_end_date).toLocaleDateString()}</td>
                      <td>${subscription.amount_paid}</td>
                      <td className={`admin-payment-status-${subscription.status.toLowerCase()}`}>
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
      </ProtectedRoute>
    </MaintenanceCheck>
  );
};

export default PaymentDetails;
