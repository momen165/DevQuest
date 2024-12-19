import React, { useState } from 'react';
import 'styles/ChangePassword.css';
import Navbar from 'components/Navbar';
import Sidebar from 'components/AccountSettingsSidebar';
import axios from 'axios';
import toast from 'react-hot-toast';

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
  
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
  
    const userData = JSON.parse(localStorage.getItem('user'));
  
    if (!userData || !userData.token) {
      toast.error('Token is missing. Please log in again.');
      return;
    }
  
    const token = userData.token;
  
    try {
      await axios.post(
        '/api/changePassword',
        { currentPassword, newPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error changing password. Please try again.');
    }
  };
  
  return (
    <>
      <Navbar />
      <div className="change-password-page">
        <Sidebar activeLink="login" />
        <div className="change-password-content">
          <h2>Change Password</h2>
          <form className="password-form" onSubmit={handleSubmit}>
            <label htmlFor="current-password">Current Password</label>
            <input
              type="password"
              id="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />

            <label htmlFor="new-password">New Password</label>
            <input
              type="password"
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />

            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              type="password"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
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
