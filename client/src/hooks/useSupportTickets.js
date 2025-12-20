import { useState, useEffect } from 'react';
import apiClient from 'utils/apiClient';
import { useAuth } from 'AuthContext';

export const useSupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reply, setReply] = useState({});
  const { user } = useAuth();

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/support-tickets', {
        timeout: 5000,
      });
      setTickets(response.data);
      setError(null);
    } catch (err) {
      console.error('Error details:', err);
      if (err.code === 'ECONNREFUSED') {
        setError('Unable to connect to server. Please check if the server is running.');
      } else {
        setError('Failed to load support tickets. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchTickets();
    }
  }, [user?.token]);

  const handleReply = async (ticketId, replyMessage) => {
    if (!replyMessage || replyMessage.trim() === '') {
      throw new Error('Reply message cannot be empty');
    }

    try {
      await apiClient.post(
        `/support-tickets/${ticketId}/reply`,
        { reply: replyMessage },
        { timeout: 5000 }
      );

      // Clear the reply input for this ticket
      setReply(prev => ({ ...prev, [ticketId]: '' }));

      // Refetch tickets to get the latest data
      await fetchTickets();
    } catch (err) {
      console.error('Error sending reply:', err);
      throw err;
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await apiClient.patch(
        `/support-tickets/${ticketId}`,
        { status: newStatus },
        { timeout: 5000 }
      );

      // Update local state
      setTickets(prevTickets =>
        prevTickets.map(ticket =>
          ticket.ticket_id === ticketId
            ? { ...ticket, status: newStatus }
            : ticket
        )
      );
    } catch (err) {
      console.error('Error updating ticket status:', err);
      throw err;
    }
  };

  const deleteTicket = async (ticketId) => {
    try {
      await apiClient.delete(`/support-tickets/${ticketId}`, {
        timeout: 5000,
      });

      // Update local state
      setTickets(prevTickets =>
        prevTickets.filter(ticket => ticket.ticket_id !== ticketId)
      );
    } catch (err) {
      console.error('Error deleting ticket:', err);
      throw err;
    }
  };

  return {
    tickets,
    loading,
    error,
    reply,
    setReply,
    fetchTickets,
    handleReply,
    handleStatusChange,
    deleteTicket,
  };
};

export default useSupportTickets;
