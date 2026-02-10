import React, { useEffect, useMemo, useState } from 'react';
import { 
  Search, 
  RefreshCw, 
  Download, 
  Plus, 
  MessageSquare, 
  ArrowLeft, 
  CheckCircle, 
  Trash2, 
  X, 
  Zap, 
  StickyNote,
  Inbox,
  Clock,
  Globe,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import './Support.css';
import useSupportTickets from 'features/support/hooks/useSupportTickets';

const STATUS_TABS = [
  { id: 'all', label: 'All', icon: Inbox },
  { id: 'open', label: 'Open', icon: MessageSquare },
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'solved', label: 'Solved', icon: CheckCircle },
  { id: 'closed', label: 'Closed', icon: X },
];

const truncateText = (value, maxLength = 80) => {
  if (!value) return 'No message content';
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
};

const formatDate = (value) => {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  
  const now = new Date();
  const diffInHours = Math.abs(now - date) / 36e5;
  
  if (diffInHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffInHours < 168) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const Support = () => {
  const {
    tickets,
    loading,
    error,
    reply,
    setReply,
    fetchTickets,
    handleReply,
    handleStatusChange,
    deleteTicket,
  } = useSupportTickets();

  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPreviewId, setSelectedPreviewId] = useState(null);
  const [bulkSelection, setBulkSelection] = useState([]);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;

  // Stats
  const stats = useMemo(() => ({
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    pending: tickets.filter(t => t.status === 'pending' || t.status === 'unread').length,
    solved: tickets.filter(t => t.status === 'solved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  }), [tickets]);

  // Filter & Search logic
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesTab = activeTab === 'all' || 
                        (activeTab === 'pending' ? (t.status === 'pending' || t.status === 'unread') : t.status === activeTab);
      const matchesSearch = searchTerm.trim() === '' || 
                          t.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.ticket_id?.toString().includes(searchTerm) ||
                          t.messages?.some(m => m.message_content?.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesTab && matchesSearch;
    }).sort((a, b) => new Date(b.time_opened) - new Date(a.time_opened));
  }, [tickets, activeTab, searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  // Pagination derived values
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / ITEMS_PER_PAGE));
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTickets.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTickets, currentPage]);

  // Initial preview selection
  useEffect(() => {
    if (paginatedTickets.length > 0 && !paginatedTickets.find(t => t.ticket_id === selectedPreviewId)) {
      setSelectedPreviewId(paginatedTickets[0].ticket_id);
    }
  }, [paginatedTickets, selectedPreviewId]);

  const selectedTicket = useMemo(() => 
    tickets.find(t => t.ticket_id === selectedPreviewId),
  [tickets, selectedPreviewId]);

  const toggleBulkSelect = (id, e) => {
    e.stopPropagation();
    setBulkSelection(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const onReplyChange = (value) => {
    if (selectedPreviewId) {
      setReply(prev => ({ ...prev, [selectedPreviewId]: value }));
    }
  };

  const submitReply = async () => {
    const message = reply[selectedPreviewId];
    if (!message?.trim()) return;
    try {
      await handleReply(selectedPreviewId, message);
    } catch (err) {
      alert('Failed to send reply');
    }
  };

  const updateStatus = async (status) => {
    try {
      await handleStatusChange(selectedPreviewId, status);
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const removeTicket = async () => {
    if (!window.confirm('Delete this ticket permanently?')) return;
    try {
      await deleteTicket(selectedPreviewId);
      setSelectedPreviewId(null);
    } catch (err) {
      alert('Failed to delete ticket');
    }
  };

  const handleBulkAction = async (action) => {
    if (!window.confirm(`Apply ${action} to ${bulkSelection.length} tickets?`)) return;
    try {
      for (const id of bulkSelection) {
        if (action === 'delete') await deleteTicket(id);
        else await handleStatusChange(id, action);
      }
      setBulkSelection([]);
    } catch (err) {
      alert(`Bulk ${action} failed`);
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="support-workspace">
        <div className="sw-loading">
          <div className="sw-spinner" />
          <p>Loading your inbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="support-workspace">
      {/* Top App Header */}
      <header className="sw-header">
        <div className="sw-header-title">
          <h1>Support Tickets</h1>
          <p>Inbox • Manage customer conversations</p>
        </div>
        <div className="sw-header-actions">
          <button className="sw-btn sw-btn-secondary">
            <Download size={16} /> Export
          </button>
          <button className="sw-btn sw-btn-primary">
            <Plus size={16} /> New Ticket
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="sw-toolbar">
        <div className="sw-toolbar-top">
          <div className="sw-search-wrapper">
            <span className="sw-search-icon">
              <Search size={18} />
            </span>
            <input 
              type="text" 
              className="sw-search-field" 
              placeholder="Search by ID, email, or message content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="sw-header-actions">
            <button className="sw-btn sw-btn-secondary" onClick={fetchTickets}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
        <div className="sw-toolbar-bottom">
          <nav className="sw-tabs">
            {STATUS_TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`sw-tab-btn ${activeTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={14} />
                  {tab.label}
                  <span className="sw-tab-count">{stats[tab.id]}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Pane */}
      <main className="sw-main">
        {/* Left Pane: Ticket List */}
        <aside className="sw-list-pane">
          <div className="sw-list-content">
            {filteredTickets.length === 0 ? (
              <div className="sw-detail-empty">
                <Inbox size={40} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.4 }} />
                <p>No tickets match your filters.</p>
                <button className="sw-btn sw-btn-ghost" onClick={() => { setActiveTab('all'); setSearchTerm(''); }}>Clear filters</button>
              </div>
            ) : (
              paginatedTickets.map(ticket => (
                <article 
                  key={ticket.ticket_id}
                  className={`sw-ticket-row ${selectedPreviewId === ticket.ticket_id ? 'is-selected' : ''} ${ticket.status === 'unread' ? 'is-unread' : ''}`}
                  onClick={() => {
                    setSelectedPreviewId(ticket.ticket_id);
                    setIsMobileDetailOpen(true);
                  }}
                >
                  <input 
                    type="checkbox" 
                    className="sw-row-checkbox"
                    checked={bulkSelection.includes(ticket.ticket_id)}
                    onChange={(e) => toggleBulkSelect(ticket.ticket_id, e)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="sw-row-main">
                    <div className="sw-row-top">
                      <span className="sw-ticket-id">#{ticket.ticket_id}</span>
                      <span className="sw-ticket-time">{formatDate(ticket.time_opened)}</span>
                    </div>
                    <h3 className="sw-ticket-subject">{ticket.user_email}</h3>
                    <p className="sw-ticket-preview">
                      {truncateText(ticket.messages?.[ticket.messages?.length - 1]?.message_content)}
                    </p>
                    <div className="sw-row-meta">
                      <span className={`sw-status-pill ${ticket.status}`}>
                        {ticket.status}
                      </span>
                      {ticket.source && (
                        <span className="sw-ticket-id" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Globe size={10} /> via {ticket.source}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* Pagination Footer */}
          {filteredTickets.length > 0 && (
            <div className="sw-pagination">
              <span className="sw-pagination-info">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredTickets.length)} of {filteredTickets.length}
              </span>
              <div className="sw-pagination-controls">
                <button
                  className="sw-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    className={`sw-page-btn ${currentPage === page ? 'is-active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className="sw-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Right Pane: Ticket Details Preview */}
        <section className={`sw-detail-pane ${isMobileDetailOpen ? 'is-open' : ''}`}>
          {!selectedTicket ? (
            <div className="sw-detail-empty">
              <MessageSquare size={48} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <h2>Select a ticket to view</h2>
              <p>Choose a conversation from the left to see the full thread and reply.</p>
            </div>
          ) : (
            <>
              <header className="sw-detail-header">
                <div className="sw-detail-header-top">
                  <div className="sw-detail-title">
                    <button 
                      className="sw-btn sw-btn-ghost sw-mobile-back" 
                      onClick={() => setIsMobileDetailOpen(false)}
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    <span className="sw-ticket-id">TICKET #{selectedTicket.ticket_id}</span>
                    <h2>{selectedTicket.user_email}</h2>
                  </div>
                  <div className="sw-header-actions">
                    <button className="sw-btn sw-btn-secondary" onClick={() => updateStatus('solved')}>
                      <CheckCircle size={16} /> Mark Solved
                    </button>
                    <button className="sw-btn sw-btn-danger" onClick={removeTicket}>
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
                <div className="sw-detail-info-grid">
                  <div className="sw-info-item">
                    <label>Status</label>
                    <span className={`sw-status-pill ${selectedTicket.status}`}>{selectedTicket.status}</span>
                  </div>
                  <div className="sw-info-item">
                    <label>Requested On</label>
                    <span>{new Date(selectedTicket.time_opened).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                  <div className="sw-info-item">
                    <label>Channel</label>
                    <span>{selectedTicket.source || 'Direct Inbox'}</span>
                  </div>
                </div>
              </header>

              <div className="sw-thread">
                {selectedTicket.messages?.map((msg, i) => (
                  <div key={i} className={`sw-message ${msg.sender_type === 'admin' ? 'admin' : 'user'}`}>
                    <div className="sw-message-bubble">
                      {msg.message_content}
                    </div>
                    <div className="sw-message-meta">
                      {msg.sender_type === 'admin' ? 'Support Agent' : 'Customer'} • {formatDate(msg.sent_at)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="sw-composer">
                <div className="sw-textarea-wrapper">
                  <textarea 
                    className="sw-textarea" 
                    placeholder="Type your reply here..."
                    value={reply[selectedPreviewId] || ''}
                    onChange={(e) => onReplyChange(e.target.value)}
                  />
                </div>
                <div className="sw-composer-actions">
                  <div className="sw-header-actions">
                    <button className="sw-btn sw-btn-ghost">
                      <StickyNote size={14} /> Add Note
                    </button>
                    <button className="sw-btn sw-btn-ghost">
                      <Zap size={14} /> Macros
                    </button>
                  </div>
                  <button 
                    className="sw-btn sw-btn-primary" 
                    disabled={!reply[selectedPreviewId]?.trim()}
                    onClick={submitReply}
                  >
                    Send Reply
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Bulk Action Bar */}
      {bulkSelection.length > 0 && (
        <div className="sw-bulk-bar">
          <span style={{ fontWeight: 600 }}>{bulkSelection.length} selected</span>
          <div className="sw-header-actions">
            <button className="sw-btn sw-btn-ghost" style={{ color: 'white' }} onClick={() => handleBulkAction('solved')}>
              <CheckCircle size={14} /> Solve
            </button>
            <button className="sw-btn sw-btn-ghost" style={{ color: 'white' }} onClick={() => handleBulkAction('closed')}>
              <X size={14} /> Close
            </button>
            <button className="sw-btn sw-btn-ghost" style={{ color: '#f87171' }} onClick={() => handleBulkAction('delete')}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
          <button className="sw-btn" style={{ background: '#334155', color: 'white' }} onClick={() => setBulkSelection([])}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default Support;
