'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Badge,
} from '@mui/material';
import {
  AccessTime,
  PriorityHigh,
  CheckCircle,
  Email,
  Warning,
} from '@mui/icons-material';
import Sidebar from '@/components/admin/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import MaintenanceCheck from '@/components/MaintenanceCheck';

interface Analytics {
  totalTickets: number;
  resolvedTickets: number;
  avgResponseTime: number;
  overdueTickets: number;
  categoryBreakdown: { name: string; count: number }[];
  priorityBreakdown: { name: string; count: number }[];
}

interface Ticket {
  ticket_id: number;
  category: string;
  priority: string;
  status: string;
  user_email: string;
  age_seconds: number;
  is_overdue: boolean;
}

const SupportDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cardSx = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(6px)',
    boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); 
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) {
        throw new Error('NEXT_PUBLIC_API_URL env var not set');
      }
      
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const token = userData?.token;
      
      if (!token) {
          // Handle no token
          return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [analyticsRes, ticketsRes] = await Promise.all([
        axios.get(`${baseUrl}/support/analytics/dashboard`, { headers }),
        axios.get(`${baseUrl}/support/tickets/recent`, { headers }),
      ]);

      setAnalytics(analyticsRes.data);
      setRecentTickets(ticketsRes.data);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Failed to load support analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'billing':
        return '💳';
      case 'technical':
        return '🔧';
      case 'course':
        return '📚';
      default:
        return '💬';
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  const resolutionRate = analytics?.totalTickets
    ? ((analytics.resolvedTickets / analytics.totalTickets) * 100).toFixed(1)
    : '0.0';

  return (
    <MaintenanceCheck>
      <ProtectedRoute adminRequired={true}>
        <div style={{ display: 'flex' }}>
          <Sidebar />
          <Box
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(180deg, #1a2942 0%, #2c3e50 100%)',
              color: '#ffffff',
              gap: 3,
              height: '100vh',
              overflow: 'auto',
              flexGrow: 1,
              boxSizing: 'border-box',
            }}
          >
            <Typography variant="h4" gutterBottom>
              Support Dashboard
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={cardSx}>
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <Email color="primary" sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="h4" sx={{ color: '#fff' }}>
                          {analytics?.totalTickets || 0}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.75)' }}>
                          Total Tickets (30d)
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={cardSx}>
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <AccessTime color="info" sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="h4" sx={{ color: '#fff' }}>
                          {formatTime(analytics?.avgResponseTime || 0)}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.75)' }}>
                          Avg Response Time
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={cardSx}>
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <PriorityHigh color="warning" sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="h4" sx={{ color: '#fff' }}>
                          {analytics?.overdueTickets || 0}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.75)' }}>
                          Overdue Tickets
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={cardSx}>
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <CheckCircle color="success" sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="h4" sx={{ color: '#fff' }}>
                          {resolutionRate}%
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.75)' }}>
                          Resolution Rate
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={cardSx}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: '#fff' }}>
                      Tickets by Category
                    </Typography>
                    {analytics?.categoryBreakdown?.map((category) => (
                      <Box key={category.name} sx={{ mb: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography sx={{ color: '#fff' }}>
                            {getCategoryIcon(category.name)} {category.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            {category.count} tickets
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={analytics.totalTickets ? (category.count / analytics.totalTickets) * 100 : 0}
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={cardSx}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: '#fff' }}>
                      Priority Distribution
                    </Typography>
                    {analytics?.priorityBreakdown?.map((priority) => (
                      <Box key={priority.name} sx={{ mb: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Chip
                            label={priority.name}
                            color={getPriorityColor(priority.name) as any}
                            size="small"
                          />
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            {priority.count} tickets
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={analytics.totalTickets ? (priority.count / analytics.totalTickets) * 100 : 0}
                          color={getPriorityColor(priority.name) as any}
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Card sx={{ ...cardSx, overflow: 'hidden' }}>
              <CardContent sx={{ color: '#fff' }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#fff' }}>
                  Recent Tickets
                </Typography>

                {analytics && analytics.overdueTickets > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <strong>{analytics.overdueTickets}</strong> tickets are overdue and need immediate
                    attention!
                  </Alert>
                )}

                <TableContainer sx={{ background: 'transparent' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ background: 'rgba(255,255,255,0.06)' }}>
                        <TableCell sx={{ color: '#fff' }}>Ticket ID</TableCell>
                        <TableCell sx={{ color: '#fff' }}>Category</TableCell>
                        <TableCell sx={{ color: '#fff' }}>Priority</TableCell>
                        <TableCell sx={{ color: '#fff' }}>Status</TableCell>
                        <TableCell sx={{ color: '#fff' }}>User</TableCell>
                        <TableCell sx={{ color: '#fff' }}>Age</TableCell>
                        <TableCell sx={{ color: '#fff' }}>SLA Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentTickets.map((ticket) => (
                        <TableRow
                          key={ticket.ticket_id}
                          sx={{ '& td': { borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#fff' }}>
                              #{ticket.ticket_id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              {getCategoryIcon(ticket.category)}
                              <Typography variant="body2" sx={{ ml: 1 }}>
                                {ticket.category}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={ticket.priority}
                              color={getPriorityColor(ticket.priority) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={ticket.status}
                              color={ticket.status === 'open' ? 'warning' : 'success'}
                              variant="outlined"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#fff' }}>
                              {ticket.user_email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#fff' }}>
                              {formatTime(ticket.age_seconds)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {ticket.is_overdue ? (
                              <Badge badgeContent={<Warning />} color="error">
                                <Chip label="Overdue" color="error" size="small" />
                              </Badge>
                            ) : (
                              <Chip label="On Track" color="success" size="small" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        </div>
      </ProtectedRoute>
    </MaintenanceCheck>
  );
};

export default SupportDashboard;
