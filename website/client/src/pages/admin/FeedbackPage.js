import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from 'pages/admin/components/Sidebar';
import 'pages/admin/styles/FeedbackPage.css';

const FeedbackPage = () => {
  const [feedbacks, setFeedbacks] = useState([]); // Feedback data
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(null); // Error state

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        setLoading(true); // Start loading
        const userData = JSON.parse(localStorage.getItem('user'));
        const token = userData ? userData.token : null;

        if (!token) {
          setError('No token found. Please log in again.');
          setLoading(false);
          return;
        }

        const response = await axios.get('http://localhost:5000/api/feedback', {

          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.length === 0) {
          console.warn('No feedback found.');
          setFeedbacks([]);
        } else {
          setFeedbacks(response.data);
        }
        setError(null); // Clear any previous error
      } catch (err) {
        console.error('Error fetching feedback:', err.message);
        if (err.response?.status === 403) {
          setError('Access denied. Admins only.');
        } else {
          setError('Failed to load feedback.');
        }
      } finally {
        setLoading(false); // Stop loading
      }
    };

    fetchFeedbacks();
  }, []);

  // Conditional rendering for loading and errors
  if (loading) return <div>Loading feedback...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="container">
      <Sidebar />
      <div className="main-content">
        <h2>Feedback</h2>
        {feedbacks.length === 0 ? (
          <p>No feedback available at the moment.</p>
        ) : (
          <table className="feedback-table">
            <thead>
              <tr>
                <th>Feedback ID</th>
                <th>Student Name</th>
                <th>Feedback</th>
                <th>Rating</th>
                <th>Course Name</th>
                {/* <th>Date</th> */}
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((feedback) => (
                <tr key={feedback.feedback_id}>
                  <td>#{feedback.feedback_id}</td>
                  <td>{feedback.student_name}</td>
                  <td>{feedback.feedback}</td>
                  <td>{feedback.rating}</td>
                  <td>{feedback.course_name}</td>
                  {/* <td>{feedback.date}</td> */}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage;