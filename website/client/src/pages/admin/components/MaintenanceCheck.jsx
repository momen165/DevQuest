import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'AuthContext';
import '../styles/MaintenanceCheck.css';

const MaintenanceCheck = ({ children }) => {
  const [isInMaintenance, setIsInMaintenance] = useState(false);
  const [isInitialCheck, setIsInitialCheck] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Cache the axios instance with configuration
  const axiosInstance = useMemo(() => {
    return axios.create({
      timeout: 3000, // Shorter timeout
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkMaintenanceStatus = async () => {
      try {
        const response = await axiosInstance.get('/api/admin/system-settings');
        if (isMounted) {
          setIsInMaintenance(response.data.maintenanceMode);
        }
      } catch (err) {
        console.error('Error checking maintenance status:', err);
        if (isMounted) {
          setIsInMaintenance(false); // Fail open
        }
      } finally {
        if (isMounted) {
          setIsInitialCheck(false);
        }
      }
    };

    // Initial check
    checkMaintenanceStatus();

    // Poll every 5 minutes instead of every minute
    const pollInterval = setInterval(checkMaintenanceStatus, 300000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [axiosInstance]);

  // Handle user session during maintenance mode
  useEffect(() => {
    if (isInMaintenance && user && !user.admin) {
      sessionStorage.setItem('redirectPath', window.location.pathname);
      logout();
    }
  }, [isInMaintenance, user, logout]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (user) {
      await logout();
    }
    sessionStorage.setItem('redirectPath', window.location.pathname);
    navigate('/LoginPage');
  };

  // Don't show any loading state, just render children while checking
  if (isInitialCheck) {
    return children;
  }

  // Allow access if not in maintenance or if user is admin
  if (!isInMaintenance || user?.admin) {
    return children;
  }

  // Maintenance mode page
  return (
    <div className="maintenance-page">
      <div className="maintenance-content">
        <h1>Site Under Maintenance</h1>
        <p>We're currently performing scheduled maintenance to improve your experience.</p>
        <div className="maintenance-info">
          <p>Expected Duration: 2 hours</p>
          <p>We'll be back online soon!</p>
        </div>
        <div className="admin-login-section">
          <p>
            Administrators can{' '}
            <button 
              onClick={handleAdminLogin}
              className="login-link"
              aria-label="Administrator login"
            >
              log in here
            </button>
          </p>
        </div>
        <div className="contact-info">
          <p>Need help? Contact us:</p>
          <a href="mailto:support@devquest.com">support@devquest.com</a>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceCheck;