import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from 'pages/admin/components/Sidebar';
import 'pages/admin/styles/Support.css';
import { useAuth } from 'AuthContext';
import CircularProgress from "@mui/material/CircularProgress";

const Support = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [reply, setReply] = useState({}); // State to hold replies for each ticket

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/support-tickets', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setTickets(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to load support tickets.');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [user.token]);

  const handleReplyChange = (ticketId, value) => {
    setReply({ ...reply, [ticketId]: value });
  };

  const handleReply = async (ticketId) => {
    try {
      await axios.post(`/api/support-tickets/${ticketId}/reply`, { reply: reply[ticketId] }, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setTickets(tickets.map(ticket => ticket.ticket_id === ticketId ? { ...ticket, messages: [...ticket.messages, { sender_type: 'admin', message_content: reply[ticketId], sent_at: new Date() }] } : ticket));
      setReply({ ...reply, [ticketId]: '' }); // Clear the reply input field
    } catch (err) {
      console.error('Failed to send reply:', err);
    }
  };

  const handleDelete = async (ticketId) => {
    try {
      await axios.delete(`/api/support-tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setTickets(tickets.filter(ticket => ticket.ticket_id !== ticketId));
    } catch (err) {
      console.error('Failed to delete ticket:', err);
    }
  };

    if (loading) return <div className="centered-loader">
        <CircularProgress/>
    </div>;
  if (error) return <div className="admin-support-error">{error}</div>;

  return (
    <div className="admin-support-page admin-support-container">
      <Sidebar />
      <div className="admin-support-main-content">
        <h2 className="admin-support-h2">Support Tickets</h2>
        {tickets.length === 0 ? (
          <p>No support tickets available at the moment.</p>
        ) : (
          <table className="admin-support-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>User Email</th>
                <th>Time Opened</th>
                <th>Expiration Time</th>
                <th>Messages</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.ticket_id}>
                  <td>#{ticket.ticket_id}</td>
                  <td>{ticket.user_email}</td>
                  <td>{new Date(ticket.time_opened).toLocaleString()}</td>
                  <td>{new Date(ticket.expiration_time).toLocaleString()}</td>
                  <td>
                    {ticket.messages.map((msg, index) => (
                      <div key={index} className={`admin-support-message ${msg.sender_type}`}>
                        <p><strong>{msg.sender_type === 'admin' ? 'Admin Reply' : 'Message'}:</strong> {msg.message_content}</p>
                      </div>
                    ))}
                    <textarea
                      className="admin-support-textarea"
                      placeholder="Enter your reply..."
                      value={reply[ticket.ticket_id] || ''}
                      onChange={(e) => handleReplyChange(ticket.ticket_id, e.target.value)}
                    />
                    <button className="admin-support-button" onClick={() => handleReply(ticket.ticket_id)}>Send</button>
                  </td>
                  <td>
                    <button className="admin-support-delete-btn" onClick={() => handleDelete(ticket.ticket_id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Support;
