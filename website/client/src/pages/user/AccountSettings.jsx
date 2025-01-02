import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from 'components/Navbar';
import Sidebar from 'components/AccountSettingsSidebar';
import { useAuth } from 'AuthContext';
import 'styles/AccountSettings.css';
import defaultProfilePic from '../../assets/images/default-profile-pic.png';

function ProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (!user || !user.token) {
      navigate('/');
    } else {
      if (user.name) setName(user.name);
      if (user.country) setCountry(user.country);
      if (user.bio) setBio(user.bio);
    }
  }, [user, navigate]);

  const handleRemoveProfilePic = async () => {
    try {
      const response = await axios.delete('/api/removeProfilePic', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });
  
      const updatedUser = { ...user, profileimage: null };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      alert('Profile picture removed successfully');
    } catch (error) {
      console.error('Error removing profile picture:', error);
      alert(error.response?.data?.error || 'An error occurred while removing your profile picture');
    }
  };
  
  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const formData = new FormData();
    formData.append('profilePic', file);
  
    try {
      const response = await axios.post('/api/uploadProfilePic', formData, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
  
      const profileimage = response.data.profileimage;
      const updatedUser = { ...user, profileimage };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      alert('Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert(error.response?.data?.error || 'An error occurred while uploading your profile picture');
    }
  };
  
  const handleSaveChanges = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.put('/api/updateProfile', 
        { name, country, bio },
        {
          headers: {
            'Authorization': `Bearer ${user.token}`,
          },
        }
      );

      const updatedUser = { ...user, name, country, bio };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      alert('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(error.response?.data?.error || 'An error occurred while updating your profile');
    }
  };

  return (
    <>
      <Navbar />
      <div className="account-settings-profile-page">
        <Sidebar activeLink="profile" />

        <div className="account-settings-profile-content">
          <h2>{name ? `Welcome, ${name}!` : 'Loading...'}</h2>
          <div className="account-settings-profile-header">
            <div className="account-settings-profile-avatar">
              <img
                src={
                  user.profileimage
                    ? `${user.profileimage}?${new Date().getTime()}`
                    : defaultProfilePic
                }
                alt="Profile"
              />

              <input
                type="file"
                id="profilePicInput"
                style={{ display: 'none' }}
                onChange={handleProfilePicChange}
              />
              <button
                className="settings-btn settings-update-btn"
                onClick={() => document.getElementById('profilePicInput').click()}
              >
                Update
              </button>
              <button className="settings-btn settings-remove-btn" onClick={handleRemoveProfilePic}>
                Remove
              </button>
            </div>
          </div>

          <form className="account-settings-profile-form" onSubmit={handleSaveChanges}>
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              className="Rand-idafkd-Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label htmlFor="country">Country</label>
            <select
              id="country"
              className="account-settings-select"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="Other">Other</option>
              <option value="Palestine">Palestine</option>
              <option value="Jordan">Jordan</option>
              <option value="USA">USA</option>
              <option value="UK">UK</option>
            </select>

            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              className="account-settings-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            ></textarea>

            <div className="account-settings-form-buttons">
              <button type="submit" className="settings-btn settings-save-btn">Save Changes</button>
              <button
                type="button"
                className="settings-btn settings-cancel-btn"
                onClick={() => navigate('/AccountSettings')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default ProfilePage;