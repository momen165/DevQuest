import React, { useState, useEffect } from "react";
import Select from 'react-select';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Sidebar from "../../components/AccountSettingsSidebar";
import { useAuth } from "../../AuthContext";
import "../../styles/AccountSettings.css";
import defaultProfilePic from "../../assets/images/default-profile-pic.png";
import { FaCamera } from "react-icons/fa";

function ProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [newSkill, setNewSkill] = useState("");

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
      alert("Profile picture removed successfully");
    } catch (error) {
      console.error("[handleRemoveProfilePic] Error:", error);
      console.error(
        "[handleRemoveProfilePic] Response data:",
        error.response?.data,
      );
      console.error("[handleRemoveProfilePic] Stack:", error.stack);
      alert(
        error.response?.data?.error ||
        "An error occurred while removing your profile picture",
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

      alert("Profile picture updated successfully");
    } catch (error) {
      console.error("[handleProfilePicChange] Error:", error);
      console.error(
        "[handleProfilePicChange] Response data:",
        error.response?.data,
      );
      console.error("[handleProfilePicChange] Stack:", error.stack);
      alert(
        error.response?.data?.error ||
        "An error occurred while uploading your profile picture",
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
      alert("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(
        error.response?.data?.error ||
        "An error occurred while updating your profile",
      );
    }
  };

  return (
    <>
      <Navbar />
      <div className="account-settings-profile-page">
        <Sidebar activeLink="profile" />

        <div className="account-settings-profile-content">
          <h2>{name ? `Welcome, ${name}!` : "Loading..."}</h2>
          <div className="account-settings-profile-header">
            <div className="account-settings-profile-avatar">
              <img
                src={user?.profileimage || defaultProfilePic}
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
                  control: (provided) => ({
                    ...provided,
                    backgroundColor: '#282f40',
                    color: 'white',
                    borderColor: '#282f40',
                  }),
                  singleValue: (provided) => ({
                    ...provided,
                    color: 'white',
                  }),
                  menu: (provided) => ({
                    ...provided,
                    backgroundColor: '#282f40',
                    color: 'white',
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isFocused ? '#1a1f2b' : '#282f40',
                    color: 'white',
                    cursor: 'pointer',
                  }),
                  input: (provided) => ({
                    ...provided,
                    color: 'white',
                  }),
                  dropdownIndicator: (provided) => ({
                    ...provided,
                    color: 'white',
                  }),
                  indicatorSeparator: (provided) => ({
                    ...provided,
                    backgroundColor: 'white',
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
                          ×
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
                  onKeyPress={(e) => {
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
