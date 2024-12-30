import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'AuthContext';
import '../styles/MaintenanceCheck.css';

const MaintenanceCheck = ({ children }) => {
  const [isInMaintenance, setIsInMaintenance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        const response = await axios.get('/api/admin/system-settings');
        setIsInMaintenance(response.data.maintenanceMode);
      } catch (err) {
        console.error('Error checking maintenance status:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkMaintenanceStatus();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const handleAdminLogin = async () => {
    if (user) {
      await logout(); // Logout current user
    }
    navigate('/LoginPage');
  };

  if (!isInMaintenance || user?.admin) {
    return children;
  }

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
