import React, { useState, useEffect } from 'react';
import Sidebar from 'pages/admin/components/Sidebar';
import axios from 'axios';
import { useAuth } from 'AuthContext';
import './styles/AdminSettingsPage.css';

const ActivityDebug = ({ data }) => (
  <div style={{ 
    padding: '10px', 
    background: '#f0f0f0', 
    marginTop: '10px',
    fontSize: '12px' 
  }}>
    <pre>{JSON.stringify(data, null, 2)}</pre>
  </div>
);

const AdminSettingsPage = () => {
  const [newAdminId, setNewAdminId] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [adminActivity, setAdminActivity] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Get the user object from localStorage
    const userObj = JSON.parse(localStorage.getItem('user'));
    if (userObj?.token) {
      // Set default headers for all axios requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${userObj.token}`;
      axios.defaults.baseURL = 'http://localhost:3000'; // Add your backend URL here
    }
  }, []);

  useEffect(() => {
    if (user?.userId) {
      fetchInitialData();
      fetchSystemSettings();
    }
  }, [user]);

  const fetchInitialData = async () => {
    try {
      const [
        activityResponse,
        metricsResponse,
        performanceResponse
      ] = await Promise.all([
        axios.get('/api/admin/activities'), // Updated endpoint
        axios.get('/api/admin/metrics/system'), // Updated endpoint
        axios.get('/api/admin/metrics/performance') // Updated endpoint
      ]);

      setAdminActivity(activityResponse.data);
      setMetrics(metricsResponse.data);
      setPerformanceMetrics(performanceResponse.data);

    } catch (err) {
      if (err.response?.status === 403) {
        setError('Access denied. Admin privileges required.');
        // Optionally redirect to home page
        // window.location.href = '/';
      } else {
        console.error('Error fetching admin data:', err);
        setError(err.response?.data?.error || 'Failed to fetch data');
      }
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const response = await axios.get('/api/admin/system-settings');
      setMaintenanceMode(response.data.maintenanceMode);
    } catch (err) {
      console.error('Error fetching system settings:', err);
      setError('Failed to fetch system settings');
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newAdminId || isNaN(newAdminId)) {
      setError('Please enter a valid user ID');
      return;
    }

    try {
      const response = await axios.post('/api/admin/add-admin', { // Updated endpoint
        userId: parseInt(newAdminId, 10)  // Convert to integer
      });
      console.log('Response:', response); // Debug response
      setSuccess(response.data.message);
      setNewAdminId('');
      // Refresh the activity list
      fetchInitialData();
    } catch (err) {
      console.error('Error details:', err.response || err); // Debug error
      setError(err.response?.data?.error || 'Error adding admin');
      console.error('Error adding admin:', err);
    }
  };

  const handleMaintenanceToggle = async () => {
    try {
      const response = await axios.post('/api/admin/maintenance-mode', { // Updated endpoint
        enabled: !maintenanceMode 
      });
      setMaintenanceMode(!maintenanceMode);
      setSuccess(response.data.message);
      
      // Log the activity
      await axios.post('/api/admin/activities/log', {
        type: 'System',
        description: `Maintenance mode ${!maintenanceMode ? 'enabled' : 'disabled'}`
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Error toggling maintenance mode');
    }
  };

  return (
    <div className="admin-settings-container">
      <Sidebar />
      <div className="admin-settings-main">
        <h2>Admin Settings</h2>
        
        <section className="settings-section">
          <h3>Add Admin</h3>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <form onSubmit={handleAddAdmin}>
            <input
              type="number"  // Changed to number type
              value={newAdminId}
              onChange={(e) => setNewAdminId(e.target.value)}
              placeholder="Enter user ID"
              min="1"  // Only allow positive numbers
            />
            <button type="submit">Add Admin</button>
          </form>
        </section>

        <section className="settings-section">
          <h3>Maintenance Mode</h3>
          <div className="maintenance-toggle">
            <label>
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={handleMaintenanceToggle}
              />
              Enable Maintenance Mode
            </label>
          </div>
        </section>

        <section className="settings-section">
          <h3>Your Recent Activity</h3>
          <div className="activity-list">
            {adminActivity && adminActivity.length > 0 ? (
              adminActivity.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-details">
                    <span className="activity-type">{activity.type}</span>
                    <p>{activity.description}</p>
                    <small>{new Date(activity.created_at).toLocaleString()}</small>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-activity">No activities found</div>
            )}
          </div>
        </section>

        {metrics && (
          <section className="settings-section">
            <h3>System Metrics</h3>
            <div className="metrics-grid">
              <div className="metric-card">
                <h4>Total Users</h4>
                <p>{metrics.total_users}</p>
              </div>
              <div className="metric-card">
                <h4>Total Courses</h4>
                <p>{metrics.total_courses}</p>
              </div>
              <div className="metric-card">
                <h4>New Enrollments (24h)</h4>
                <p>{metrics.new_enrollments_24h}</p>
              </div>
            </div>
          </section>
        )}

        {performanceMetrics && (
          <section className="settings-section">
            <h3>Performance Metrics</h3>
            <div className="metrics-grid">
              <div className="metric-card">
                <h4>Avg. Lesson Completion Time</h4>
                <p>{Math.round(performanceMetrics.avgLessonCompletionTime / 60)} minutes</p>
              </div>
              <div className="metric-card">
                <h4>Active Users (7 days)</h4>
                <p>{performanceMetrics.activeUsers7Days}</p>
              </div>
              <div className="metric-card">
                <h4>Total Lessons Completed</h4>
                <p>{performanceMetrics.totalLessonsCompleted}</p>
              </div>
            </div>
            <div className="top-courses">
              <h4>Top Courses by Enrollment</h4>
              <ul>
                {performanceMetrics.topCourses.map((course, index) => (
                  <li key={index}>
                    {course.course_name}: {course.enrollment_count} enrollments
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminSettingsPage;
