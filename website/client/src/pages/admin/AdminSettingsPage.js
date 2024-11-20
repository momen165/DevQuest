import React from 'react';
import Sidebar from 'pages/admin/components/Sidebar';
import 'pages/admin/styles/AdminSettingsPage.css';

const AdminSettingsPage = () => {
  return (
    <div className="admin-settings-container">
      <Sidebar />
      <div className="admin-settings-main">
        <h2>Admin Settings</h2>
        <p>Select a feature from the  or start adding functionality here.</p>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
