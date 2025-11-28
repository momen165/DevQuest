'use client';

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import MaintenanceCheck from '@/components/MaintenanceCheck';
import Sidebar from '@/components/admin/Sidebar';
import DashboardContent from '@/components/admin/DashboardContent';
import '@/styles/admin/Dashboard.css';

const Dashboard: React.FC = () => {
  return (
    <MaintenanceCheck>
      <ProtectedRoute adminRequired={true}>
        <div className="dashboard-container">
          <Sidebar />
          <DashboardContent />
        </div>
      </ProtectedRoute>
    </MaintenanceCheck>
  );
};

export default Dashboard;
