import React, { useState, useEffect } from "react";
import Select from 'react-select';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import Sidebar from "../../components/AccountSettingsSidebar";
import { useAuth } from "../../AuthContext";
import "../../styles/AccountSettings.css";
import defaultProfilePic from "../../assets/images/default-profile-pic.png";
import { FaCamera } from "react-icons/fa";
import BadgeNotification from "../../components/BadgeNotification";

function ProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [newSkill, setNewSkill] = useState("");

  // Badge notification state
  const [showBadgeNotification, setShowBadgeNotification] = useState(false);
  const [profileCompleteBadge, setProfileCompleteBadge] = useState(null);
  const [badgesBefore, setBadgesBefore] = useState([]);

  // Fetch badges before profile update
  useEffect(() => {
    const fetchBadges = async () => {
      if (user && user.token) {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/badges/user`, {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          if (res.data.success && Array.isArray(res.data.badges)) {
            setBadgesBefore(res.data.badges);
          }
        } catch (err) {
          // Optionally handle error
        }
      }
    };
    fetchBadges();
  }, [user]);

  useEffect(() => {
    if (!user || !user.token) {
      navigate("/");
    } else {
      if (user.name) setName(user.name);
      if (user.country) setCountry(user.country);
      if (user.bio) setBio(user.bio);
      if (user.skills) setSkills(user.skills.join(", "));
    }
  }, [user, navigate]);

  const handleRemoveProfilePic = async () => {
    try {
      const response = await axios.delete(`${import.meta.env.VITE_API_URL}/removeProfilePic`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      const updatedUser = { ...user, profileimage: null };
      setUser(updatedUser);

      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Profile picture removed successfully");
    } catch (error) {
      console.error("[handleRemoveProfilePic] Error:", error);
      console.error(
        "[handleRemoveProfilePic] Response data:",
        error.response?.data,
      );
      console.error("[handleRemoveProfilePic] Stack:", error.stack);
      toast.error(
        error.response?.data?.error ||
        "An error occurred while removing your profile picture"
      );
    }
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("profilePic", file);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/uploadProfilePic`, formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const { profileimage } = response.data;
      if (!profileimage) {
        console.error(
          "[handleProfilePicChange] No profile image URL in response",
        );
        throw new Error("No profile image URL received from server");
      }

      const updatedUser = {
        ...user,
        profileimage: profileimage,
      };
      setUser(updatedUser);

      localStorage.setItem("user", JSON.stringify(updatedUser));

      toast.success("Profile picture updated successfully");
    } catch (error) {
      console.error("[handleProfilePicChange] Error:", error);
      console.error(
        "[handleProfilePicChange] Response data:",
        error.response?.data,
      );
      console.error("[handleProfilePicChange] Stack:", error.stack);
      toast.error(
        error.response?.data?.error ||
        "An error occurred while uploading your profile picture"
      );
    }
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    try {
      const skillsArray = skills
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill !== "");

      console.log("[DEBUG] badgesBefore:", badgesBefore);

      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/update-profile`,
        {
          name,
          country,
          bio,
          skills: skillsArray,
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      );
      const updatedUser = { ...user, name, country, bio, skills: skillsArray };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Profile updated successfully");

      // Fetch badges after update
      const badgeRes = await axios.get(`${import.meta.env.VITE_API_URL}/badges/user`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (badgeRes.data.success && Array.isArray(badgeRes.data.badges)) {
        const badgesAfter = badgeRes.data.badges;
        console.log("[DEBUG] badgesAfter:", badgesAfter);
        const hadProfileComplete = badgesBefore.some(b => b.badge_type === "profile_complete");
        const newProfileBadge = badgesAfter.find(b => b.badge_type === "profile_complete");
        console.log("[DEBUG] hadProfileComplete:", hadProfileComplete, "newProfileBadge:", newProfileBadge);
        if (!hadProfileComplete && newProfileBadge) {
          console.log("[DEBUG] Triggering BadgeNotification for profile_complete");
          setProfileCompleteBadge(newProfileBadge);
          setShowBadgeNotification(true);
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(
        error.response?.data?.error ||
        "An error occurred while updating your profile"
      );
    }
  };

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
            <div className="account-settings-profile-avatar">
              <img
                src={profileImageSrc}
                alt="Profile"
                onError={(e) => {
                  console.error(
                    "[ProfilePage] Error loading profile image:",
                    e,
                  );
                  e.target.src = defaultProfilePic;
                }}
              />
              <label
                htmlFor="profilePicInput"
                className="account-settings-profile-pic-buttons"
              >
                <FaCamera size={16} color="#e2e8f0" />
              </label>
              <input
                type="file"
                id="profilePicInput"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleProfilePicChange}
              />
            </div>
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
              <Select
                id="country"
                classNamePrefix="account-settings-select"
                value={[
                  { value: 'Other', label: 'Other' },
                  { value: 'Palestine', label: 'Palestine' },
                  { value: 'Jordan', label: 'Jordan' },
                  { value: 'USA', label: 'USA' },
                  { value: 'UK', label: 'UK' }
                ].find(opt => opt.value === country)}
                onChange={opt => setCountry(opt.value)}
                options={[
                  { value: 'Other', label: 'Other' },
                  { value: 'Palestine', label: 'Palestine' },
                  { value: 'Jordan', label: 'Jordan' },
                  { value: 'USA', label: 'USA' },
                  { value: 'UK', label: 'UK' }
                ]}
                isSearchable={false}
                styles={{
                  control: (provided, state) => ({
                    ...provided,
                    backgroundColor: 'rgba(10, 15, 28, 0.6)',
                    color: '#e2e8f0',
                    borderColor: state.isFocused ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.15)',
                    borderRadius: '10px',
                    padding: '4px',
                    boxShadow: state.isFocused ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : '0 2px 10px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: 'rgba(99, 102, 241, 0.3)',
                    },
                  }),
                  singleValue: (provided) => ({
                    ...provided,
                    color: '#e2e8f0',
                  }),
                  menu: (provided) => ({
                    ...provided,
                    backgroundColor: 'rgba(10, 15, 28, 0.98)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isFocused ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    color: state.isFocused ? '#c4b5fd' : '#a5b4fc',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:active': {
                      backgroundColor: 'rgba(99, 102, 241, 0.25)',
                    },
                  }),
                  input: (provided) => ({
                    ...provided,
                    color: '#e2e8f0',
                  }),
                  dropdownIndicator: (provided) => ({
                    ...provided,
                    color: '#a5b4fc',
                    '&:hover': {
                      color: '#c4b5fd',
                    },
                  }),
                  indicatorSeparator: (provided) => ({
                    ...provided,
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                  }),
                }}
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
            <div className="skills-container">
              <div className="skills-wrapper">
                {skills.split(",").map(
                  (skill, index) =>
                    skill.trim() && (
                      <div key={index} className="skill-badge">
                        {skill.trim()}
                        <span
                          className="skill-remove-icon"
                          onClick={() => {
                            const newSkills = skills
                              .split(",")
                              .filter((_, i) => i !== index)
                              .join(", ");
                            setSkills(newSkills);
                          }}
                        >
                          x
                        </span>
                      </div>
                    ),
                )}
              </div>
              <div className="skill-input-container">
                <input
                  type="text"
                  className="skill-input"
                  placeholder="Add a skill..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newSkill.trim()) {
                      setSkills(skills ? `${skills}, ${newSkill}` : newSkill);
                      setNewSkill("");
                    }
                  }}
                />
                <button
                  className="add-skill-btn"
                  onClick={() => {
                    if (newSkill.trim()) {
                      setSkills(skills ? `${skills}, ${newSkill}` : newSkill);
                      setNewSkill("");
                    }
                  }}
                >
                  +
                </button>
              </div>
            </div>

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
