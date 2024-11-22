import React, { useState, useEffect } from 'react';
import Sidebar from 'pages/admin/components/Sidebar';
import 'pages/admin/styles/PaymentInfo.css';
import { useAuth } from 'AuthContext'; // Import AuthContext for token management

const PaymentDetails = () => {
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState(null);
  const { user } = useAuth(); // Retrieve the token and user data from AuthContext

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
            Authorization: `Bearer ${token}`,
          },
        });
    
        console.log('Raw Response:', response);
    
        if (!response.ok) {
          console.error(`HTTP Error: ${response.status}`);
          throw new Error(`HTTP Error: ${response.status}`);
        }
    
        const data = await response.json(); // This is where the error occurs
        console.log('Fetched Data:', data);
        setPayments(data);
      } catch (err) {
        console.error('Error fetching payment details:', err.message);
        setError('Failed to fetch payment details. Please try again later.');
      }
    };
    

    fetchPayments();
  }, [user]);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

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
                <td>
                  {new Date(payment.subscription_start_date).toLocaleDateString()}
                </td>
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
