import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from 'pages/admin/components/Sidebar';
import 'pages/admin/styles/FeedbackPage.css';
const FeedbackPage = () => {
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/feedbackad'); // Backend endpoint
        setFeedbacks(response.data);
      } catch (err) {
        console.error('Error fetching feedback:', err);
      }
    };

    fetchFeedbacks();
  }, []);

  return (
    <div className="container">
      <Sidebar />
      <div className="main-content">
        <h2>Feedback</h2>
        <table className="feedback-table">
          <thead>
            <tr>
              <th>Feedback ID</th>
              <th>Student Name</th>
              <th>Feedback</th>
              <th>Rating</th>
              <th>Course Name</th>
              <th>Date</th>
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
                <td>{feedback.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FeedbackPage;
