import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'app/AuthContext';
import './MaintenanceCheck.css';

const MaintenanceCheck = ({ children }) => {
  const [isInMaintenance, setIsInMaintenance] = useState(false);
  const [isInitialCheck, setIsInitialCheck] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Cache the axios instance with configuration
  const axiosInstance = useMemo(() => {
    const baseURL = import.meta.env.VITE_API_URL;
    if (!baseURL) {
      console.error('VITE_API_URL is not defined. Please check your environment variables.');
    }
    return axios.create({
      baseURL,
      timeout: 8000, // Increase timeout for slower connections
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkMaintenanceStatus = async () => {
      try {
        
        let response;
        try {
          // Use relative path, not full URL
          response = await axiosInstance.get('/admin/system-settings');
        } catch {
          
          response = await axiosInstance.get('/admin/maintenance-status');
        }

        if (isMounted) {
         
          setIsInMaintenance(!!response.data.maintenanceMode);
        }
      } catch (err) {
        console.error('Error checking maintenance status:', err);
        if (isMounted) {
          // In case of error, assume system is not in maintenance mode
          setIsInMaintenance(false);
        }
      } finally {
        if (isMounted) {
          setIsInitialCheck(false);
        }
      }
    };

    // Initial check
    checkMaintenanceStatus();

    // Poll every 5 minutes
    const pollInterval = setInterval(checkMaintenanceStatus, 300000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [axiosInstance]);

  // Only handle user session during maintenance mode for authenticated users
  useEffect(() => {
    if (isInMaintenance && user && !user.admin) {
      // Save the current path for redirect after login
      sessionStorage.setItem('redirectPath', window.location.pathname);
      logout();
    }
  }, [isInMaintenance, user, logout]);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    // Save the current path for redirect after login
    sessionStorage.setItem('redirectPath', window.location.pathname);
    navigate('/LoginPage');
  };

  // Always render children while we're doing the initial check
  if (isInitialCheck) {
    return children;
  }

  // Allow access if not in maintenance or if user is admin
  if (!isInMaintenance || (user && user.admin)) {
    return children;
  }

  // Show maintenance page
  return (
    <div className="maintenance-page">
      <div className="maintenance-content">
        <h1>Site Under Maintenance</h1>
        <p>We&apos;re currently performing scheduled maintenance to improve your experience.</p>
        <div className="maintenance-info">
          <p>Expected Duration: 2 hours</p>
          <p>We&apos;ll be back online soon!</p>
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
          <a href="mailto:support@mail.dev-quest.me">support@mail.dev-quest.me</a>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceCheck;
