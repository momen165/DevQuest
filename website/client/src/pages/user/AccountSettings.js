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
      <div className="user-profile-settings-container">
        <Sidebar activeLink="profile" />

        <div className="user-profile-settings-content">
          <h2>{name ? `Welcome, ${name}!` : 'Loading...'}</h2>
          <div className="user-profile-settings-header">
            <div className="user-profile-avatar-container">
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
                className="user-profile-btn user-profile-update-btn"
                onClick={() => document.getElementById('profilePicInput').click()}
              >
                Update
              </button>
              <button className="user-profile-btn user-profile-remove-btn" onClick={handleRemoveProfilePic}>
                Remove
              </button>
            </div>
          </div>

          <form className="user-profile-form" onSubmit={handleSaveChanges}>
            <label className="user-profile-label" htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              className="user-profile-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label className="user-profile-label" htmlFor="country">Country</label>
            <select
              id="country"
              className="user-profile-select"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="Other">Other</option>
              <option value="Palestine">Palestine</option>
              <option value="Jordan">Jordan</option>
              <option value="USA">USA</option>
              <option value="UK">UK</option>
            </select>

            <label className="user-profile-label" htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              className="user-profile-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            ></textarea>

            <div className="user-profile-form-buttons">
              <button type="submit" className="user-profile-btn user-profile-save-btn">Save Changes</button>
              <button
                type="button"
                className="user-profile-btn user-profile-cancel-btn"
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
