import React, { useState } from 'react';
import './Support.css';
import CircularProgress from '@mui/material/CircularProgress';
import useSupportTickets from 'features/support/hooks/useSupportTickets';

const Support = () => {
  const [expandedTickets, setExpandedTickets] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'open', 'closed'
  const [filterSource, setFilterSource] = useState('all'); // 'all', 'email', 'direct'

  const {
    tickets,
    loading,
    error,
    reply,
    setReply,
    handleReply,
    deleteTicket,
  } = useSupportTickets();

  const handleReplyChange = (ticketId, value) => {
    setReply({ ...reply, [ticketId]: value });
  };

  const handleReplySubmit = async (ticketId) => {
    if (!reply[ticketId] || reply[ticketId].trim() === '') {
      alert('Please enter a reply message.');
      return;
    }

    try {
      await handleReply(ticketId, reply[ticketId]);
    } catch (err) {
      console.error('Failed to send reply:', err);
      alert('Failed to send reply. Please try again.');
    }
  };

  const handleDelete = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) {
      return;
    }

    try {
      await deleteTicket(ticketId);
    } catch (err) {
      console.error('Failed to delete ticket:', err);
      alert('Failed to delete ticket. Please try again.');
    }
  };

  const toggleTicketExpansion = (ticketId) => {
    const newExpanded = new Set(expandedTickets);
    if (newExpanded.has(ticketId)) {
      newExpanded.delete(ticketId);
    } else {
      newExpanded.add(ticketId);
    }
    setExpandedTickets(newExpanded);
  };

  const getStatusDisplay = (ticket) => {
    if (ticket.status === 'closed') {
      const closedTime = new Date(ticket.closed_at).toLocaleString();
      switch (ticket.closed_by) {
        case 'user':
          return <span className="status-closed-user">Closed by user at {closedTime}</span>;
        case 'auto':
          return <span className="status-closed-auto">Auto-closed at {closedTime}</span>;
        default:
          return <span className="status-closed">Closed at {closedTime}</span>;
      }
    }
    return <span className="status-open">Open</span>;
  };

  // Determine if ticket has email messages vs direct messages
  const getTicketSource = (ticket) => {
    // Check if any message came from email (you can enhance this logic)
    const hasEmailMessages = ticket.messages.some(
      (msg) =>
        msg.message_content.includes('This is my reply to the support ticket') ||
        msg.message_content.length > 500 // Email messages tend to be longer
    );
    return hasEmailMessages ? 'email' : 'direct';
  };

  // Filter tickets based on status and source
  const filteredTickets = tickets.filter((ticket) => {
    const statusMatch = filterStatus === 'all' || ticket.status === filterStatus;
    const sourceMatch = filterSource === 'all' || getTicketSource(ticket) === filterSource;
    return statusMatch && sourceMatch;
  });

  // Get message count and latest message
  const getTicketPreview = (ticket) => {
    const messageCount = ticket.messages.length;
    const latestMessage = ticket.messages[ticket.messages.length - 1];
    const latestUserMessage = ticket.messages.filter((msg) => msg.sender_type === 'user').pop();

    return {
      messageCount,
      latestMessage: latestMessage?.message_content.substring(0, 100) + '...',
      latestUserMessage: latestUserMessage?.message_content.substring(0, 100) + '...',
      hasUnreadFromUser: latestMessage?.sender_type === 'user',
    };
  };

  if (error) return <div className="admin-support-error">{error}</div>;

  if (loading) {
    return (
      <div className="admin-support-page admin-support-container">
        <div className="centered-loader">
          <CircularProgress />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-support-page admin-support-container">
      <div className="admin-support-main-content">
        <div className="support-header">
          <h2 className="admin-support-h2">Support Tickets</h2>

          {/* Filter Controls */}
          <div className="support-filters">
            <div className="filter-group">
              <label htmlFor="status-filter">Status:</label>
              <select
                id="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="source-filter">Source:</label>
              <select
                id="source-filter"
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Sources</option>
                <option value="email">📧 Email</option>
                <option value="direct">💬 Direct</option>
              </select>
            </div>

            <div className="tickets-count">
              {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="no-tickets">
            <p>No support tickets match your current filters.</p>
          </div>
        ) : (
          <div className="tickets-container">
            {filteredTickets.map((ticket) => {
              const preview = getTicketPreview(ticket);
              const isExpanded = expandedTickets.has(ticket.ticket_id);
              const ticketSource = getTicketSource(ticket);

              return (
                <div
                  key={ticket.ticket_id}
                  className={`ticket-card ${ticket.status} ${
                    preview.hasUnreadFromUser ? 'has-unread' : ''
                  }`}
                >
                  {/* Ticket Header */}
                  <div
                    className="ticket-header"
                    onClick={() => toggleTicketExpansion(ticket.ticket_id)}
                  >
                    <div className="ticket-main-info">
                      <div className="ticket-id-status">
                        <span className="ticket-id">#{ticket.ticket_id}</span>
                        <span className={`source-badge ${ticketSource}`}>
                          {ticketSource === 'email' ? '📧 Email' : '💬 Direct'}
                        </span>
                        {getStatusDisplay(ticket)}
                        {preview.hasUnreadFromUser && <span className="unread-indicator">New</span>}
                      </div>

                      <div className="ticket-user-info">
                        <strong>{ticket.user_email}</strong>
                        <span className="ticket-time">
                          {new Date(ticket.time_opened).toLocaleString()}
                        </span>
                      </div>

                      <div className="ticket-preview">
                        <span className="message-count">
                          {preview.messageCount} message{preview.messageCount !== 1 ? 's' : ''}
                        </span>
                        <span className="latest-message">
                          {preview.latestUserMessage || preview.latestMessage}
                        </span>
                      </div>
                    </div>

                    <div className="ticket-controls">
                      <button className="expand-btn">{isExpanded ? '▼' : '▶'}</button>
                    </div>
                  </div>

                  {/* Expanded Ticket Content */}
                  {isExpanded && (
                    <div className="ticket-content">
                      <div className="ticket-details">
                        <div className="detail-item">
                          <strong>Auto-close:</strong>{' '}
                          {new Date(ticket.expiration_time).toLocaleString()}
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="messages-container">
                        <h4>Conversation History</h4>
                        <div className="messages-list">
                          {ticket.messages.map((msg, index) => (
                            <div
                              key={`${msg.message_id ?? msg.sent_at ?? 'message'}-${msg.sender_type}-${index}`}
                              className={`message ${msg.sender_type} ${
                                ticketSource === 'email' && msg.sender_type === 'user'
                                  ? 'email-message'
                                  : ''
                              }`}
                            >
                              <div className="message-header">
                                <span className="message-sender">
                                  {msg.sender_type === 'admin' ? '👨‍💼 Admin' : '👤 User'}
                                  {ticketSource === 'email' &&
                                    msg.sender_type === 'user' &&
                                    ' (via Email)'}
                                </span>
                                <span className="message-time">
                                  {new Date(msg.sent_at).toLocaleString()}
                                </span>
                              </div>
                              <div className="message-content">{msg.message_content}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Reply Section */}
                      {ticket.status === 'open' && (
                        <div className="reply-section">
                          <h4>Send Reply</h4>
                          <textarea
                            className="reply-textarea"
                            placeholder="Type your reply here... (User will receive this via email)"
                            value={reply[ticket.ticket_id] || ''}
                            onChange={(e) => handleReplyChange(ticket.ticket_id, e.target.value)}
                            rows="4"
                          />
                          <div className="reply-actions">
                            <button
                              className="reply-btn"
                              onClick={() => handleReplySubmit(ticket.ticket_id)}
                              disabled={!reply[ticket.ticket_id]?.trim()}
                            >
                              📧 Send Reply
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => handleDelete(ticket.ticket_id)}
                            >
                              🗑️ Delete Ticket
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Support;
