import React, { useState } from 'react';
import 'styles/ChangePassword.css';
import Navbar from 'components/Navbar';
import Sidebar from 'components/AccountSettingsSidebar';
import axios from 'axios'; // Import axios for making HTTP requests

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Function that gets called when the form is submitted
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Ensure passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
  
    // Retrieve the combined user data from localStorage
    const userData = JSON.parse(localStorage.getItem('user'));
  
    if (!userData || !userData.token) {
      setError('Token is missing. Please log in again.');
      return;
    }
  
    const token = userData.token; // Retrieve the token from userData
  
    try {
      const response = await axios.post(
        'http://localhost:5000/api/changePassword',
        { currentPassword, newPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`, // Pass token in Authorization header
          },
        }
      );
  
      setMessage('Password changed successfully!');
    } catch (error) {
      setError('Error changing password. Please try again.');
    }
  };
  
  return (
    <>
      <Navbar />
      <div className="change-password-page">
        <Sidebar activeLink="login" />
        <div className="change-password-content">
          <h2>Change Password</h2>
          {error && <p className="error">{error}</p>} {/* Show error message */}
          {message && <p className="success">{message}</p>} {/* Show success message */}
          <form className="password-form" onSubmit={handleSubmit}>
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
