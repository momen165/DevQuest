import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaComments, FaPaperPlane, FaUser, FaHeadset } from 'react-icons/fa';
import { useAuth } from 'AuthContext';
import 'styles/SupportForm.css';

const SupportForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [tickets, setTickets] = useState([]);
  const { user } = useAuth();
  const chatContainerRef = useRef(null);
  const pollingIntervalRef = useRef(null);

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

  // Set up polling when form is open
  useEffect(() => {
    if (isOpen && user) {
      // Initial fetch
      fetchUserTickets();

      // Set up polling every 5 seconds
      pollingIntervalRef.current = setInterval(fetchUserTickets, 10000);

      // Cleanup polling on unmount or when form closes
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [isOpen, user]);

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
        
        // Only show success message if the ticket is still open
        if (response.data.ticket.status !== 'closed') {
          setResponseMessage('Message sent successfully');
        } else {
          setResponseMessage('Starting a new support ticket...');
        }
        
        // Fetch latest messages immediately after sending
        await fetchUserTickets();
        
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
      await axios.post(`/api/support-tickets/${ticketId}/close`, {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
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
      minute: '2-digit' 
    });
  };

  const getClosedStatusText = (ticket) => {
    if (ticket.status === 'closed') {
      const closedTime = new Date(ticket.closed_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
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
      <button 
        className="sf-icon" 
        onClick={toggleForm}
        aria-label="Toggle support chat"
      >
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

          <div className="sf-chat-container" ref={chatContainerRef}>
            {tickets.length === 0 ? (
              <div className="sf-empty-message">
                <FaHeadset size={24} />
                <p>How can we help you today?</p>
              </div>
            ) : (
              <>
                {tickets.map((ticket) => (
                  <div key={ticket.ticket_id} className="sf-ticket-container">
                    {ticket.status === 'closed' && (
                      <div className="sf-ticket-status">
                        {getClosedStatusText(ticket)}
                      </div>
                    )}
                    {ticket.messages.map((msg, index) => (
                      <div
                        key={`${ticket.id}-${index}`}
                        className={`sf-message-container ${
                          msg.sender_type === 'admin' ? 'sf-message-admin' : 'sf-message-user'
                        }`}
                      >
                        <div className="sf-message-avatar">
                          {msg.sender_type === 'admin' ? 
                            <FaHeadset /> : 
                            <FaUser />
                          }
                        </div>
                        <div className="sf-message-content">
                          <div className="sf-message-text">{msg.message_content}</div>
                          <div className="sf-message-timestamp">
                            {formatTimestamp(msg.sent_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>

          {tickets.length > 0 && tickets.some(ticket => ticket.status !== 'closed') && (
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
              <button 
                className="sf-send-button" 
                type="submit"
                aria-label="Send message"
              >
                <FaPaperPlane />
              </button>
            </div>
            {responseMessage && (
              <div className={`sf-response-text ${
                responseMessage.includes('Failed') ? 'sf-error' : 'sf-success'
              }`}>
                {responseMessage}
              </div>
            )}
          </form>
        </div>
      )}
    </>
  );
};

export default SupportForm;