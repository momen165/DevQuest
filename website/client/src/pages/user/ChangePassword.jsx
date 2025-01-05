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
      <div className="change-password-page">
        <Sidebar activeLink="login" />
        <div className="change-password-content">
          <h2>Change Password</h2>

          {error && <p className="change-password-error">{error}</p>} {/* Show error message */}
          {message && <p className="change-password-success">{message}</p>} {/* Show success message */}
          <form className="change-password-form" onSubmit={handleSubmit}>

       

            <label htmlFor="current-password" className="change-password-label">Current Password</label>
            <input
              type="password"
              id="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />

            <label htmlFor="new-password" className="change-password-label">New Password</label>
            <input
              type="password"
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />

            <label htmlFor="confirm-password" className="change-password-label">Confirm Password</label>
            <input
              type="password"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="change-password-form-buttons">
              <button type="submit" className="change-password-save-btn">Save Changes</button>
              <button type="button" className="change-password-cancel-btn">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default ChangePassword;
