import React, { useState, useEffect } from 'react';
import Sidebar from 'pages/admin/components/Sidebar';
import 'pages/admin/styles/PaymentInfo.css';


const PaymentDetails = () => {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await fetch('/api/subscriptions', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        setPayments(data);
      } catch (error) {
        console.error('Error fetching payment details:', error);
      }
    };

    fetchPayments();
  }, []);

  return (
    <div className="container">
      <Sidebar />
      <div className="main-content">
        <h2>Payment Details</h2>
        <table className="payment-table">
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
                  <span
                    className={
                      payment.status === 'Completed'
                        ? 'status-completed'
                        : 'status-pending'
                    }
                  >
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
