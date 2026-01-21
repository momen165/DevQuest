import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaComments, FaPaperPlane, FaUser, FaHeadset } from 'react-icons/fa';
import { useAuth } from 'app/AuthContext';
import './SupportForm.css';

const SupportForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [tickets, setTickets] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [showUserForm, setShowUserForm] = useState(false);
  const { user } = useAuth();
  const chatContainerRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  const isAuthenticated = user && user.token;

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [tickets]);

  const toggleForm = () => {
    console.log('Toggle form clicked, user:', user);
    if (!isOpen && !isAuthenticated && !userEmail) {
      setShowUserForm(true);
    }
    setIsOpen(!isOpen);
  };

  const fetchUserTickets = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await axios.get(`${apiUrl}/user-support-tickets`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setTickets(response.data);
    } catch (err) {
      console.error('Failed to fetch support tickets:', err);
      setTickets([]); // Ensure tickets is always an array
    }
  };

  const fetchAnonymousTickets = async (email) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await axios.get(
        `${apiUrl}/support/anonymous/${encodeURIComponent(email)}`
      );
      setTickets(response.data);
    } catch (err) {
      console.error('Failed to fetch anonymous support tickets:', err);
      setTickets([]); // Ensure tickets is always an array
    }
  };

  // Set up polling when form is open
  useEffect(() => {
    if (isOpen) {
      if (isAuthenticated) {
        // Initial fetch for authenticated users
        fetchUserTickets();
        // Set up polling every 10 seconds
        pollingIntervalRef.current = setInterval(fetchUserTickets, 10000);
      } else if (userEmail) {
        // Initial fetch for anonymous users
        fetchAnonymousTickets(userEmail);
        // Set up polling every 10 seconds
        pollingIntervalRef.current = setInterval(() => fetchAnonymousTickets(userEmail), 10000);
      }

      // Cleanup polling on unmount or when form closes
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [isOpen, isAuthenticated, userEmail]);

  const handleUserInfoSubmit = (e) => {
    e.preventDefault();
    if (userName && userEmail) {
      setShowUserForm(false);
      setResponseMessage('');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setResponseMessage('');

    if (message.trim()) {
      try {
        let response;
        
        if (isAuthenticated) {
          // Authenticated user
          const config = {
            headers: {
              Authorization: `Bearer ${user.token}`,
              'Content-Type': 'application/json',
            },
          };

          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          response = await axios.post(
            `${apiUrl}/support`,
            { message },
            config
          );
        } else {
          // Anonymous user
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          response = await axios.post(
            `${apiUrl}/support/anonymous`,
            { message, email: userEmail, name: userName }
          );
        }

        setMessage('');

        // Only show success message if the ticket is still open
        if (response.data.ticket.status !== 'closed') {
          setResponseMessage('Message sent successfully');
        } else {
          setResponseMessage('Starting a new support ticket...');
        }

        // Fetch latest messages immediately after sending
        if (isAuthenticated) {
          await fetchUserTickets();
        } else {
          await fetchAnonymousTickets(userEmail);
        }

        setTimeout(() => {
          setResponseMessage('');
        }, 3000);
      } catch (err) {
        console.error('Failed to send message:', err.response?.data || err.message);
        setResponseMessage('Failed to send message');
      }
    }
  };

  const handleCloseTicket = async (ticketId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      await axios.post(
        `${apiUrl}/support-tickets/${ticketId}/close`,
        {},
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );
      setResponseMessage('Support ticket closed successfully');
      await fetchUserTickets(); // Refresh tickets

      setTimeout(() => {
        setResponseMessage('');
      }, 3000);
    } catch (err) {
      console.error('Failed to close ticket:', err);
      setResponseMessage('Failed to close ticket');
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getClosedStatusText = (ticket) => {
    if (ticket.status === 'closed') {
      const closedTime = new Date(ticket.closed_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      switch (ticket.closed_by) {
        case 'user':
          return `Closed by user at ${closedTime}`;
        case 'auto':
          return `Auto-closed at ${closedTime}`;
        default:
          return `Closed at ${closedTime}`;
      }
    }
    return null;
  };

  return (
    <>
      <button className="sf-icon" onClick={toggleForm} aria-label="Toggle support chat">
        <FaComments />
      </button>

      {isOpen && (
        <div className="sf-wrapper">
          <div className="sf-header">
            <h2>Support Chat</h2>
            <button
              className="sf-close-button"
              onClick={toggleForm}
              aria-label="Close support chat"
            >
              ×
            </button>
          </div>

          {!isAuthenticated && showUserForm && (
            <div className="sf-user-info-form">
              <form onSubmit={handleUserInfoSubmit}>
                <div className="sf-form-group">
                  <label htmlFor="userName">Your Name:</label>
                  <input
                    type="text"
                    id="userName"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div className="sf-form-group">
                  <label htmlFor="userEmail">Your Email:</label>
                  <input
                    type="email"
                    id="userEmail"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <button type="submit" className="sf-user-info-submit">
                  Start Chat
                </button>
              </form>
            </div>
          )}

          {(isAuthenticated || (!showUserForm && userEmail)) && (
            <>
              <div className="sf-chat-container" ref={chatContainerRef}>
                {!Array.isArray(tickets) || tickets.length === 0 ? (
                  <div className="sf-empty-message">
                    <FaHeadset size={24} />
                    <p>How can we help you today?</p>
                  </div>
                ) : (
                  <>
                    {tickets.map((ticket) => (
                      <div key={ticket.ticket_id} className="sf-ticket-container">
                        {ticket.status === 'closed' && (
                          <div className="sf-ticket-status">{getClosedStatusText(ticket)}</div>
                        )}
                        {ticket.messages.map((msg, index) => (
                          <div
                            key={`${ticket.id}-${index}`}
                            className={`sf-message-container ${
                              msg.sender_type === 'admin' ? 'sf-message-admin' : 'sf-message-user'
                            }`}
                          >
                            <div className="sf-message-avatar">
                              {msg.sender_type === 'admin' ? <FaHeadset /> : <FaUser />}
                            </div>
                            <div className="sf-message-content">
                              <div className="sf-message-text">{msg.message_content}</div>
                              <div className="sf-message-timestamp">{formatTimestamp(msg.sent_at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                )}
              </div>

              {isAuthenticated && Array.isArray(tickets) && tickets.length > 0 && tickets.some((ticket) => ticket.status !== 'closed') && (
                <div className="sf-ticket-actions">
                  <button
                    className="sf-close-ticket-button"
                    onClick={() => handleCloseTicket(tickets[0].ticket_id)}
                  >
                    Mark as Solved
                  </button>
                </div>
              )}

              <form className="sf-form" onSubmit={handleSendMessage}>
                <div className="sf-input-container">
                  <textarea
                    className="sf-textarea"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    required
                  />
                  <button className="sf-send-button" type="submit" aria-label="Send message">
                    <FaPaperPlane />
                  </button>
                </div>
                {responseMessage && (
                  <div
                    className={`sf-response-text ${
                      responseMessage.includes('Failed') ? 'sf-error' : 'sf-success'
                    }`}
                  >
                    {responseMessage}
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default SupportForm;
