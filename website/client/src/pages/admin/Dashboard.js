import React from 'react';
import Sidebar from 'pages/admin/components/Sidebar';
import DashboardContent from 'pages/admin/DashboardContent';
import 'pages/admin/styles/Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <DashboardContent />
    </div>
  );
};

export default Dashboard;
