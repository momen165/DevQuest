import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "components/Navbar";
import Sidebar from "components/AccountSettingsSidebar";
import { useAuth } from "AuthContext";
import "styles/AccountSettings.css";
import BadgeNotification from "components/BadgeNotification";
import ProfileAvatar from "components/ProfileAvatar";
import CountrySelect from "components/CountrySelect";
import SkillsManager from "components/SkillsManager";
import { useAccountSettings } from "hooks/useAccountSettings";

function ProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const {
    name, setName,
    country, setCountry,
    bio, setBio,
    skills,
    newSkill, setNewSkill,
    showBadgeNotification, setShowBadgeNotification,
    profileCompleteBadge,
    handleRemoveProfilePic,
    handleProfilePicChange,
    handleSaveChanges,
    addSkill,
    removeSkill
  } = useAccountSettings(user, setUser);

  useEffect(() => {
    if (!user || !user.token) {
      navigate("/");
    }
  }, [user, navigate]);

  const profileImageSrc = user?.profileimage || defaultProfilePic;

  return (
    <>
      <Navbar />
      {showBadgeNotification && profileCompleteBadge && (
        <BadgeNotification
          badge={profileCompleteBadge}
          onClose={() => setShowBadgeNotification(false)}
        />
      )}
      <div className="account-settings-profile-page">
        <Sidebar activeLink="profile" />

        <div className="account-settings-profile-content">
          <h2>{name ? `Welcome, ${name}!` : "Loading..."}</h2>
          <div className="account-settings-profile-header">
            <ProfileAvatar 
              imageUrl={user?.profileimage}
              onImageChange={handleProfilePicChange}
            />
          </div>

          <form
            className="account-settings-profile-form"
            onSubmit={handleSaveChanges}
          >
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              className="Rand-idafkd-Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label htmlFor="country">Country</label>
            <div style={{ marginBottom: '1rem' }}>
              <CountrySelect 
                value={country}
                onChange={setCountry}
              />
            </div>

            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              className="account-settings-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            ></textarea>

            <label htmlFor="skills">Skills</label>
            <SkillsManager
              skills={skills}
              newSkill={newSkill}
              setNewSkill={setNewSkill}
              onAddSkill={addSkill}
              onRemoveSkill={removeSkill}
            />

            <div className="account-settings-form-buttons">
              <button type="submit" className="settings-btn settings-save-btn">
                Save Changes
              </button>
              <button
                type="button"
                className="settings-btn settings-cancel-btn"
                onClick={() => navigate("/AccountSettings")}
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
