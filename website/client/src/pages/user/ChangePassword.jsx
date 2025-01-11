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
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setError('');
    setMessage('');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields');
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      toast.error('New password must be at least 8 characters long');
      return;
    }
  
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
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
  
      setMessage('Password changed successfully!');
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error changing password. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };
  
  return (
    <>
      <Navbar />
      <div className="change-password-container">
        <Sidebar activeLink="login" />
        <div className="change-password-main">
          <h2 className="change-password-title">Change Password</h2>

          {error && <div className="change-password-error-message">{error}</div>}
          {message && <div className="change-password-success-message">{message}</div>}
          
          <form className="change-password-form-container" onSubmit={handleSubmit}>
            <label className="change-password-input-label" htmlFor="current-password">
              Current Password
            </label>
            <input
              className="change-password-input-field"
              type="password"
              id="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />

            <label className="change-password-input-label" htmlFor="new-password">
              New Password
            </label>
            <input
              className="change-password-input-field"
              type="password"
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />

            <label className="change-password-input-label" htmlFor="confirm-password">
              Confirm Password
            </label>
            <input
              className="change-password-input-field"
              type="password"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="change-password-button-container">
              <button type="submit" className="change-password-button change-password-save-button">
                Save Changes
              </button>
              <button type="button" className="change-password-button change-password-cancel-button">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default ChangePassword;
