import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from 'pages/admin/components/Sidebar';
import 'pages/admin/styles/FeedbackPage.css';
import {useAuth} from 'AuthContext';
import CircularProgress from "@mui/material/CircularProgress"; // Assuming you use an Auth context

const FeedbackPage = () => {
  const [feedbacks, setFeedbacks] = useState([]); // Feedback data
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(null); // Error state
  const { user } = useAuth();
  const [reply, setReply] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        setLoading(true); // Start loading
        console.log(user.token);

        if (!user.token) {
          setError('No token found. Please log in again.');
          setLoading(false);
          return;
        }

        const response = await axios.get('http://localhost:5000/api/feedback', {

          headers: { Authorization: `Bearer ${user.token}` },
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

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!selectedFeedback || !reply) return;

    try {
      await axios.post('http://localhost:5000/api/feedback/reply', {
        feedback_id: selectedFeedback.feedback_id,
        reply,
      }, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      setReply('');
      setSelectedFeedback(null);
      alert('Reply sent successfully.');
    } catch (err) {
      console.error('Error sending reply:', err.message);
      alert(`Failed to send reply: ${err.response?.data?.error || err.message}`);
    }
  };

  
 
  if (error) return <div className="feedback-error">{error}</div>;

  if (loading) {
    return (
      <div className="feedback-page feedback-layout">
        <Sidebar />
        <div className="centered-loader">
          <CircularProgress />
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-page feedback-layout">
      <Sidebar />
      <div className="feedback-content">
        <h2 className="feedback-title">Feedback</h2>
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
                <th>Status</th>
                <th>Actions</th>
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
                  <td>{feedback.status}</td>
                  <td>
                    {feedback.status === 'open' ? (
                      <button 
                        className="feedback-btn" 
                        onClick={() => setSelectedFeedback(feedback)}
                      >
                        Reply
                      </button>
                    ) : (
                      <span className="feedback-status-closed">Closed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {selectedFeedback && (
          <form onSubmit={handleReplySubmit} className="feedback-form">
            <h3>Reply to Feedback #{selectedFeedback.feedback_id}</h3>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your reply here"
            />
            <button className="feedback-btn-action" type="submit">Send Reply</button>
            <button className="feedback-btn-action" type="button" onClick={() => setSelectedFeedback(null)}>Cancel</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage;