import { useState, useEffect } from "react";
import apiClient from "shared/lib/apiClient";
import toast from "react-hot-toast";

export const useAccountSettings = (user, setUser) => {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(false);

  // Badge notification state
  const [showBadgeNotification, setShowBadgeNotification] = useState(false);
  const [profileCompleteBadge, setProfileCompleteBadge] = useState(null);
  const [badgesBefore, setBadgesBefore] = useState([]);

  useEffect(() => {
    const fetchBadges = async () => {
      if (user && user.token) {
        try {
          const res = await apiClient.get("/badges/user");
          if (res.data.success && Array.isArray(res.data.badges)) {
            setBadgesBefore(res.data.badges);
          }
        } catch (err) {
          console.error("Error fetching badges:", err);
        }
      }
    };
    fetchBadges();
  }, [user]);

  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.country) setCountry(user.country);
      if (user.bio) setBio(user.bio);
      if (user.skills) setSkills(user.skills.join(", "));
    }
  }, [user]);

  const handleRemoveProfilePic = async () => {
    try {
      await apiClient.delete("/removeProfilePic");

      const updatedUser = { ...user, profileimage: null };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Profile picture removed successfully");
    } catch (error) {
      console.error("[handleRemoveProfilePic] Error:", error);
      toast.error(
        error.response?.data?.error || "An error occurred while removing your profile picture"
      );
    }
  };

  const handleProfilePicChange = async (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("profilePic", file);

    try {
      const response = await apiClient.post("/uploadProfilePic", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const { profileimage } = response.data;
      if (!profileimage) {
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
      toast.error(
        error.response?.data?.error || "An error occurred while uploading your profile picture"
      );
    }
  };

  const handleSaveChanges = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const skillsArray = skills
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill !== "");

      await apiClient.put("/update-profile", {
        name,
        country,
        bio,
        skills: skillsArray,
      });

      const updatedUser = { ...user, name, country, bio, skills: skillsArray };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Profile updated successfully");

      // Fetch badges after update
      const badgeRes = await apiClient.get("/badges/user");

      if (badgeRes.data.success && Array.isArray(badgeRes.data.badges)) {
        const badgesAfter = badgeRes.data.badges;
        const hadProfileComplete = badgesBefore.some((b) => b.badge_type === "profile_complete");
        const newProfileBadge = badgesAfter.find((b) => b.badge_type === "profile_complete");

        if (!hadProfileComplete && newProfileBadge) {
          setProfileCompleteBadge(newProfileBadge);
          setShowBadgeNotification(true);
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(error.response?.data?.error || "An error occurred while updating your profile");
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      setSkills(skills ? `${skills}, ${newSkill}` : newSkill);
      setNewSkill("");
    }
  };

  const removeSkill = (index) => {
    const newSkills = skills
      .split(",")
      .filter((_, i) => i !== index)
      .join(", ");
    setSkills(newSkills);
  };

  return {
    name,
    setName,
    country,
    setCountry,
    bio,
    setBio,
    skills,
    setSkills,
    newSkill,
    setNewSkill,
    loading,
    showBadgeNotification,
    setShowBadgeNotification,
    profileCompleteBadge,
    handleRemoveProfilePic,
    handleProfilePicChange,
    handleSaveChanges,
    addSkill,
    removeSkill,
  };
};
