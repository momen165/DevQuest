import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import Sidebar from 'pages/admin/components/Sidebar';
import DashboardContent from 'pages/admin/DashboardContent';
import 'pages/admin/styles/Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !user.admin) {
      // Redirect to homepage or login if the user is not an admin
      navigate('/');
    }
  }, [user, navigate]);

  if (!user || !user.admin) {
    return null; // Render nothing or a loading spinner while redirecting
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <DashboardContent />
    </div>
  );
};

export default Dashboard;
