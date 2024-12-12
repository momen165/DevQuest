import React, { useState, useEffect } from 'react';
import Sidebar from 'pages/admin/components/Sidebar';
import 'pages/admin/styles/PaymentInfo.css';
import { useAuth } from 'AuthContext';

const PaymentDetails = () => {
  const [payments, setPayments] = useState([]);
  const { user } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const token = user?.token;

        if (!token) {
          setError('No token found. Please log in again.');
          return;
        }

        const response = await fetch('http://localhost:5000/api/subscriptions', {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        setPayments(data);
      } catch (err) {
        setError('Failed to fetch payment details. Please try again later.');
      }
    };

    fetchPayments();
  }, [user]);

  if (error) {
    return <div className="admin-payment-error-message">{error}</div>;
  }

  return (
    <div className="admin-payment-container">
      <Sidebar />
      <div className="admin-payment-main-content">
        <h2 className="admin-payment-h2">Payment Details</h2>
        <table className="admin-payment-table">
          <thead>
            <tr>
              <th>Subscription ID</th>
              <th>Student Name</th>
              <th>Amount Paid</th>
              <th>Start Date</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.subscription_id}>
                <td>{payment.subscription_id}</td>
                <td>{payment.student_name}</td>
                <td>${payment.amount_paid}</td>
                <td>{new Date(payment.subscription_start_date).toLocaleDateString()}</td>
                <td>{payment.subscription_type}</td>
                <td>
                  <span className={payment.status === 'Completed' ? 'admin-payment-status-completed' : 'admin-payment-status-pending'}>
                    {payment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentDetails;
