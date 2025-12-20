import React from 'react';
import { FaCamera } from "react-icons/fa";
import defaultProfilePic from "assets/images/default-profile-pic.png";

const ProfileAvatar = ({ imageUrl, onImageChange }) => {
  const profileImageSrc = imageUrl || defaultProfilePic;

  return (
    <div className="account-settings-profile-avatar">
      <img
        src={profileImageSrc}
        alt="Profile"
        onError={(e) => {
          console.error("[ProfileAvatar] Error loading profile image");
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
        onChange={(e) => onImageChange(e.target.files[0])}
      />
    </div>
  );
};

export default ProfileAvatar;
