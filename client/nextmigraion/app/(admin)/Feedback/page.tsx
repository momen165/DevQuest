'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ProtectedRoute from '@/components/ProtectedRoute';
import MaintenanceCheck from '@/components/MaintenanceCheck';
import Sidebar from '@/components/admin/Sidebar';
import '@/styles/admin/FeedbackPage.css';
import { useAuth } from '@/contexts/AuthContext';
import CircularProgress from '@mui/material/CircularProgress';

interface Feedback {
  feedback_id: number;
  student_name: string;
  feedback: string;
  rating: number;
  course_name: string;
  status: string;
  reply?: string;
}

interface ReplyModalProps {
  feedback: Feedback | null;
  onClose: () => void;
}

const FeedbackPage: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [reply, setReply] = useState<string>('');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewingReply, setViewingReply] = useState<Feedback | null>(null);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        setLoading(true);

        if (!user.token) {
          setError('No token found. Please log in again.');
          setLoading(false);
          return;
        }

        const response = await axios.get<Feedback[]>(`${process.env.NEXT_PUBLIC_API_URL}/feedback`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        if (response.data.length === 0) {
          console.warn('No feedback found.');
          setFeedbacks([]);
        } else {
          setFeedbacks(response.data);
        }
        setError(null);
      } catch (err: any) {
        console.error('Error fetching feedback:', err.message);
        if (err.response?.status === 403) {
          setError('Access denied. Admins only.');
        } else {
          setError('Failed to load feedback.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, []);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback || !reply) return;

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/feedback/reply`,
        {
          feedback_id: selectedFeedback.feedback_id,
          reply,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );

      setFeedbacks(
        feedbacks.map((feedback) =>
          feedback.feedback_id === selectedFeedback.feedback_id
            ? { ...feedback, status: 'closed' }
            : feedback
        )
      );

      setReply('');
      setSelectedFeedback(null);
      alert('Reply sent successfully.');
    } catch (err: any) {
      console.error('Error sending reply:', err.response?.data?.error || err.message);
      alert(`Failed to send reply: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleReopen = async (feedbackId: number) => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/feedback/reopen`,
        { feedback_id: feedbackId },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      setFeedbacks(
        feedbacks.map((feedback) =>
          feedback.feedback_id === feedbackId ? { ...feedback, status: 'open' } : feedback
        )
      );

      alert('Feedback reopened successfully.');
    } catch (err: any) {
      console.error('Error reopening feedback:', err.message);
      alert(`Failed to reopen feedback: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleStatusSort = () => {
    const sortedFeedbacks = [...feedbacks].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.status.localeCompare(b.status);
      } else {
        return b.status.localeCompare(a.status);
      }
    });

    setFeedbacks(sortedFeedbacks);
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const ReplyModal: React.FC<ReplyModalProps> = ({ feedback, onClose }) => {
    if (!feedback) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Admin Reply to Feedback #{feedback.feedback_id}</h3>
            <button className="modal-close" onClick={onClose}>
              &times;
            </button>
          </div>
          <div className="modal-body">
            <div className="original-feedback">
              <h4>Original Feedback:</h4>
              <p>{feedback.feedback}</p>
            </div>
            <div className="admin-reply">
              <h4>Admin Reply:</h4>
              <p>{feedback.reply}</p>
            </div>
          </div>
        </div>
      </div>
    );
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
    <MaintenanceCheck>
      <ProtectedRoute adminRequired={true}>
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
                    <th className="sortable" onClick={handleStatusSort}>
                      Status {sortOrder === 'asc' ? '↑' : '↓'}
                    </th>
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
                      <td className={`status ${feedback.status}`}>{feedback.status}</td>
                      <td>
                        {feedback.status === 'open' ? (
                          <button
                            className="feedback-btn reply-btn"
                            onClick={() => setSelectedFeedback(feedback)}
                          >
                            Reply
                          </button>
                        ) : (
                          <>
                            <button
                              className="feedback-btn reopen"
                              onClick={() => handleReopen(feedback.feedback_id)}
                            >
                              Reopen
                            </button>
                            {feedback.reply && (
                              <button
                                className="feedback-btn view-btn"
                                onClick={() => setViewingReply(feedback)}
                              >
                                View Reply
                              </button>
                            )}
                          </>
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
                <button className="feedback-btn-action" type="submit">
                  Send Reply
                </button>
                <button
                  className="feedback-btn-action"
                  type="button"
                  onClick={() => setSelectedFeedback(null)}
                >
                  Cancel
                </button>
              </form>
            )}

            {viewingReply && <ReplyModal feedback={viewingReply} onClose={() => setViewingReply(null)} />}
          </div>
        </div>
      </ProtectedRoute>
    </MaintenanceCheck>
  );
};

export default FeedbackPage;
