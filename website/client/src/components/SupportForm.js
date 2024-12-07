import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'styles/SupportForm.css';
import { FaComments } from 'react-icons/fa';
import { useAuth } from 'AuthContext';

const SupportForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [tickets, setTickets] = useState([]);
  const { user } = useAuth();

  const toggleForm = () => {
    setIsOpen(!isOpen);
  };

  const fetchUserTickets = async () => {
    try {
      const response = await axios.get('/api/user-support-tickets', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setTickets(response.data);
    } catch (err) {
      console.error('Failed to fetch support tickets:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUserTickets();
    }
  }, [isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setResponseMessage('');

    if (message.trim()) {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
        };

        const response = await axios.post('/api/support', { message }, config);
        console.log('Response from server:', response.data);
        setMessage('');
        setResponseMessage('Message sent to admin.');
        fetchUserTickets(); // Fetch tickets again to update the list
      } catch (err) {
        console.error('Failed to send message:', err.response?.data || err.message);
        setResponseMessage('Failed to send message.');
      }
    }
  };

  return (
    <>
      <div className="support-icon" onClick={toggleForm}>
        <FaComments />
      </div>
      {isOpen && (
        <div className="support-form">
          <form onSubmit={handleSendMessage}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
              required
            />
            <button type="submit">Send</button>
          </form>
          {responseMessage && <p className="response-message">{responseMessage}</p>}
          <div className="ticket-list">
            {tickets.length === 0 ? (
              <p>No support tickets available.</p>
            ) : (
              tickets.map((ticket) => (
                <div key={ticket.ticket_id} className="ticket">
                  <p><strong>Time Opened:</strong> {new Date(ticket.time_opened).toLocaleString()}</p>
                  {ticket.messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender_type}`}>
                      <p><strong>{msg.sender_type === 'admin' ? 'Admin Reply' : 'Message'}:</strong> {msg.message_content}</p>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SupportForm;
