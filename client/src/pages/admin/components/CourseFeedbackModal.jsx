import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../AuthContext';
import CircularProgress from "@mui/material/CircularProgress";
import '../styles/CourseFeedbackModal.css';

const CourseFeedbackModal = ({ course, onClose }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/feedback`, {
          headers: { Authorization: `Bearer ${user.token}` },
          params: { course_id: course.course_id }
        });
        setFeedbacks(response.data);
      } catch (error) {
        console.error('Error fetching feedbacks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, [course.course_id, user.token]);

  return (
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal-content" onClick={e => e.stopPropagation()}>
        <div className="feedback-modal-header">
          <h2>Feedback for {course.title}</h2>
          <button className="feedback-modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="feedback-modal-body">
          {loading ? (
            <div className="feedback-loading">
              <CircularProgress />
            </div>
          ) : feedbacks.length > 0 ? (
            <div className="feedback-list">
              {feedbacks.map((feedback) => (
                <div key={feedback.feedback_id} className="feedback-item">
                  <div className="feedback-header">
                    <div className="feedback-user">{feedback.student_name}</div>
                    <div className="feedback-rating">
                      <span className="star-rating">{'★'.repeat(Math.floor(feedback.rating || 0))}</span>
                      <span className="star-empty">{'☆'.repeat(5 - Math.floor(feedback.rating || 0))}</span>
                      <span className="rating-value">({Number(feedback.rating || 0).toFixed(1)})</span>
                    </div>
                  </div>
                  {feedback.comment && (
                    <div className="feedback-comment">{feedback.comment}</div>
                  )}
                  <div className="feedback-status">
                    Status: <span className={`status-${feedback.status?.toLowerCase()}`}>
                      {feedback.status || 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-feedback">No feedback available for this course.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseFeedbackModal; 