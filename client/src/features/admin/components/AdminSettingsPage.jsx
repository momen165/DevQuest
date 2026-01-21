import React, { useState, useEffect } from 'react';
import Sidebar from 'features/admin/components/Sidebar';
import axios from 'axios';
import { useAuth } from 'app/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import './AdminSettingsPage.css';

// GrantFreeSubscriptionForm component
function GrantFreeSubscriptionForm() {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGrant = async (e) => {
    e.preventDefault();
    if (!userId || Number.isNaN(userId)) {
      toast.error('Please enter a valid user ID');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/grant-free-subscription`,
        {
          userId: parseInt(userId, 10),
        }
      );
      toast.success(response.data.message || 'Free subscription granted');
      setUserId('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to grant free subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="admin-settings-form" onSubmit={handleGrant} style={{ marginTop: 8 }}>
      <input
        className="admin-settings-input"
        type="number"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        placeholder="Enter user ID"
        min="1"
        disabled={loading}
      />
      <button
        className="admin-settings-submit-btn"
        type="submit"
        disabled={loading}
        style={{ marginLeft: 8 }}
      >
        {loading ? 'Granting...' : 'Grant Free Subscription'}
      </button>
    </form>
  );
}

const AdminSettingsPage = () => {
  const [newAdminId, setNewAdminId] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(true); // New state to track mode
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [adminActivity, setAdminActivity] = useState([]);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const userObj = JSON.parse(localStorage.getItem('user'));
    if (userObj?.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${userObj.token}`;
      axios.defaults.baseURL = `${import.meta.env.VITE_API_URL}`;
    }

    // Immediately fetch admin activities when component mounts
    fetchAdminActivities();
  }, []);

  const formatActivity = (activity) => {
    return {
      id: activity.activity_id || activity.id,
      type: activity.action_type || activity.type,
      description: activity.action_description || activity.description,
      created_at: activity.created_at,
      is_course_activity: activity.is_course_activity || false,
    };
  };

  const fetchAdminActivities = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/activities`);
      if (Array.isArray(response.data)) {
        const formattedActivities = response.data.map(formatActivity);
        setAdminActivity(formattedActivities);
      } else {
        console.error('Invalid activities data format:', response.data);
        setAdminActivity([]);
      }
    } catch (err) {
      console.error('Error fetching admin activities:', err);
      setAdminActivity([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.userId) return;

    const checkAdminStatus = async () => {
      try {
        const statusResponse = await axios.get(`${import.meta.env.VITE_API_URL}/admin/status`);
        if (!statusResponse.data.isAdmin) {
          setError('Access denied. Admin privileges required.');
          return false;
        }
        return true;
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to verify admin status');
        return false;
      }
    };

    const loadData = async () => {
      const isAdmin = await checkAdminStatus();
      if (isAdmin) {
        try {
          await fetchSystemSettings();
        } catch (err) {
          console.error('Error loading system settings:', err);
        }
      }
    };

    loadData();
  }, [user?.userId]);

  // Add useEffect specifically for maintenance mode
  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/system-settings`);
        setMaintenanceMode(!!response.data.maintenanceMode); // Convert to boolean
      } catch (err) {
        console.error('Error fetching maintenance status:', err);
        toast.error('Failed to fetch maintenance status');
      }
    };

    fetchMaintenanceStatus();
  }, []); // Run once on component mount

  // Replace showNotification with simpler toast calls
  const showNotification = (type, message, subText) => {
    const content = subText ? `${message}\n${subText}` : message;

    if (type === 'success') {
      toast.success(content, {
        duration: 5000,
        position: 'top-center',
      });
    } else {
      toast.error(content, {
        duration: 5000,
        position: 'top-center',
      });
    }
  };

  const handleAdminAction = async (e) => {
    e.preventDefault();
    const action = isAddingAdmin ? 'add' : 'remove';

    if (!newAdminId || Number.isNaN(newAdminId)) {
      showNotification('error', 'Invalid Input', 'Please enter a valid user ID');
      return;
    }

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/admin/${action}-admin`, {
        userId: parseInt(newAdminId, 10),
      });
      showNotification('success', 'Success', response.data.message);
      setNewAdminId('');
    } catch (err) {
      showNotification('error', 'Error', err.response?.data?.error || `Error ${action}ing admin`);
    }
  };

  const handleMaintenanceToggle = async () => {
    try {
      const newState = !maintenanceMode;

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/admin/maintenance-mode`, {
        enabled: newState,
      });

      if (response.status === 200) {
        setMaintenanceMode(newState);
        showNotification(
          'success',
          'Maintenance Mode Updated',
          `Maintenance mode ${newState ? 'enabled' : 'disabled'} successfully`
        );

        const currentState = await axios.get(
          `${import.meta.env.VITE_API_URL}/admin/system-settings`
        );
        setMaintenanceMode(!!currentState.data.maintenanceMode);
      }
    } catch (err) {
      showNotification(
        'error',
        'Error',
        err.response?.data?.error || 'Error toggling maintenance mode'
      );

      const currentState = await axios.get(`${import.meta.env.VITE_API_URL}/admin/system-settings`);
      setMaintenanceMode(!!currentState.data.maintenanceMode);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/system-settings`);
      console.log('Fetched maintenance mode:', response.data.maintenanceMode);
      setMaintenanceMode(response.data.maintenanceMode);
    } catch (err) {
      console.error('Error fetching system settings:', err);
      toast.error('Failed to fetch system settings');
    }
  };

  const openActivityDetails = (activity) => {
    setSelectedActivity(activity);
  };

  const closeActivityDetails = () => {
    setSelectedActivity(null);
  };

  const renderActivities = () => {
    if (isLoading) {
      return <div>Loading activities...</div>;
    }

    if (!adminActivity || !Array.isArray(adminActivity) || adminActivity.length === 0) {
      return <div className="no-activity">No activities found</div>;
    }

    return (
      <div className="all-activities">
        <div className="activity-header">
          <h4>Your Activityes</h4>
        </div>
        {adminActivity.map((activity) => {
          const uniqueKey = `${activity.id}_${activity.created_at}`;

          return (
            <div key={uniqueKey} className="activity-item">
              <div className="activity-details">
                <div className="activity-header">
                  <span className="activity-type">{activity.type}</span>
                  <small className="activity-date">
                    {new Date(activity.created_at).toLocaleString()}
                  </small>
                </div>
                <div className="activity-body">
                  <p className="activity-body-para">{activity.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="admin-settings-container">
      <Toaster />
      <Sidebar />
      <div className="admin-settings-main">
        <h2 className="admin-settings-title">Admin Settings</h2>

        {/* Combined Add/Remove Admin Section */}
        <section className="admin-settings-section">
          <h3 className="admin-settings-section-title">Manage Admins</h3>
          <form className="admin-settings-form" onSubmit={handleAdminAction}>
            <input
              className="admin-settings-input"
              type="number"
              value={newAdminId}
              onChange={(e) => setNewAdminId(e.target.value)}
              placeholder="Enter user ID"
              min="1"
            />
            <div className="admin-settings-controls">
              <div className="admin-settings-action-buttons">
                <button
                  type="button"
                  className={`admin-settings-mode-btn ${isAddingAdmin ? 'active' : ''}`}
                  onClick={() => setIsAddingAdmin(true)}
                >
                  Add
                </button>
                <button
                  type="button"
                  className={`admin-settings-mode-btn ${!isAddingAdmin ? 'active' : ''}`}
                  onClick={() => setIsAddingAdmin(false)}
                >
                  Remove
                </button>
              </div>
              <button
                className={`admin-settings-submit-btn ${
                  !isAddingAdmin ? 'admin-settings-remove-btn' : ''
                }`}
                type="submit"
              >
                {isAddingAdmin ? 'Add Admin' : 'Remove Admin'}
              </button>
            </div>
          </form>
        </section>

        {/* Grant Free Subscription Section */}
        <section className="admin-settings-section">
          <h3 className="admin-settings-section-title">Grant Free Subscription</h3>
          <GrantFreeSubscriptionForm />
        </section>

        {/* Maintenance Mode Section - Second */}
        <section className="admin-settings-section">
          <h3 className="admin-settings-section-title">System Maintenance</h3>
          <div className="admin-settings-toggle-container">
            <label className="admin-settings-toggle-switch">
              <input
                className="admin-settings-toggle-input"
                type="checkbox"
                checked={maintenanceMode}
                onChange={handleMaintenanceToggle}
              />
              <span className="admin-settings-toggle-slider"></span>
            </label>
            <span className="toggle-label">
              Maintenance Mode: {maintenanceMode ? 'Enabled' : 'Disabled'}
            </span>
            <p className="maintenance-description">
              Current Status:{' '}
              {maintenanceMode ? 'Site is in maintenance mode' : 'Site is operating normally'}
            </p>
          </div>
        </section>

        {/* Activities Section - Third */}
        <section className="settings-section">
          <div className="settings-section-header">
            <h3 className="admin-settings-section-title">Admin Activities</h3>
            <button className="refresh-button" onClick={fetchAdminActivities} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          <div className="activity-list">{renderActivities()}</div>
        </section>

        {selectedActivity && (
          <div className="modal">
            <div className="modal-content">
              <button className="close-button" onClick={closeActivityDetails}>
                &times;
              </button>
              <h3>Activity Details</h3>
              <p>{selectedActivity.action_description}</p>
              <p>Type: {selectedActivity.action_type}</p>
              <p>Date: {new Date(selectedActivity.created_at).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettingsPage;
