import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from 'components/Navbar';
import Sidebar from 'components/ProfileSidebar';
import { useAuth } from 'AuthContext';
import 'styles/Profile.css';

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('Morty Smith');
  const [country, setCountry] = useState('Palestine');
  const [bio, setBio] = useState(
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis ut velit imperdiet, vulputate sapien eu, maximus tellus. Nam tellus sem, condimentum et rhoncus a, interdum.'
  );

  useEffect(() => {
    // Debug: Log user data to check if it's correctly set
    console.log("User data:", user);

    // Redirect to home if user is not authenticated
    if (!user || !user.token) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleProfilePicChange = (e) => {
   // const file = e.target.files[0];
    // Handle profile picture upload logic here
  };

  return (
    <>
      <Navbar />
      <div className="profile-page">
        <Sidebar activeLink="profile" />

        <div className="profile-content">
          <div className="profile-header">
            <div className="profile-avatar">
              <img
                src="https://via.placeholder.com/100" // Replace with user's profile picture URL
                alt="Profile"
              />
              <input
                type="file"
                id="profilePicInput"
                style={{ display: 'none' }}
                onChange={handleProfilePicChange}
              />
              <button className="update-btn" onClick={() => document.getElementById('profilePicInput').click()}>
                Update
              </button>
              <button className="remove-btn">Remove</button>
            </div>
          </div>

          <form className="profile-form">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label htmlFor="country">Country</label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="Palestine">Palestine</option>
              <option value="USA">USA</option>
              <option value="Canada">Canada</option>
              {/* Add more countries as needed */}
            </select>

            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            ></textarea>

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

export default ProfilePage;
