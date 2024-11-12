import React, { useState } from 'react';
import 'styles/ChangePassword.css'; // Create and import this CSS file for styling
import Navbar from 'components/Navbar';

import Sidebar from 'components/ProfileSidebar';

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <>
    <Navbar />
    <div className="change-password-page">   
    
    <Sidebar activeLink="login" /> {/* Set activeLink to "login" */}
      <div className="change-password-content">
        <h2>Change Password</h2>
        <form className="password-form">
          <label htmlFor="current-password">Current Password</label>
          <input
            type="password"
            id="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />

          <label htmlFor="new-password">New Password</label>
          <input
            type="password"
            id="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <label htmlFor="confirm-password">Confirm Password</label>
          <input
            type="password"
            id="confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <div className="form-buttons">
            <button type="submit" className="save-btn">Save Changes</button>
            <button type="button" className="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
    
    </>
  );
}

export default ChangePassword;
