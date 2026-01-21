import React, { useState } from "react";
import "./ChangePassword.css";
import Navbar from "shared/ui/Navbar";
import Sidebar from "features/profile/components/AccountSettingsSidebar";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "app/AuthContext";
import { useNavigate } from "react-router-dom";

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [emailError, setEmailError] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    // Clear previous messages
    setError("");
    setMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all password fields");
      toast.error("Please fill in all password fields");
      return;
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      const errorMsg =
        "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }

    const userData = JSON.parse(localStorage.getItem("user"));

    if (!userData || !userData.token) {
      toast.error("Token is missing. Please log in again.");
      return;
    }

    const token = userData.token;

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/changePassword`,
        { currentPassword, newPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setMessage("Password changed successfully!");
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Error changing password. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleEmailChangeRequest = async (e) => {
    e.preventDefault();

    // Clear previous email messages
    setEmailError("");
    setEmailMessage("");

    if (!newEmail) {
      setEmailError("Please enter a new email address");
      toast.error("Please enter a new email address");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError("Please enter a valid email address");
      toast.error("Please enter a valid email address");
      return;
    }

    // Show initial request toast
    const toastId = toast.loading("Requesting email change...");

    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData || !userData.token) {
      setEmailError("Authentication error. Please log in again.");
      toast.error("Authentication error. Please log in again.", {
        id: toastId,
      });
      return;
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/requestEmailChange`,
        { newEmail },
        {
          headers: {
            Authorization: `Bearer ${userData.token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.message) {
        setEmailMessage(
          "Verification email sent! Please check your current email inbox to confirm the change.",
        );
        toast.success("Verification email sent!", { id: toastId });
        setNewEmail("");
      }
    } catch (error) {
      let errorMessage = "Error requesting email change. Please try again.";

      if (error.response?.data?.error === "Email is already in use") {
        errorMessage =
          "This email address is already registered. Please use a different email.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setEmailError(errorMessage);
      toast.error(errorMessage, { id: toastId });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user"));
      const response = await axios.delete(
        `http://localhost:5000/api/student/delete-account`,
        {
          headers: {
            Authorization: `Bearer ${userData.token}`,
          },
        },
      );

      if (response.data.success) {
        // Clear all local storage data
        localStorage.clear();

        // Show success message
        toast.success("Account deleted successfully");

        // Logout and redirect
        await logout();

        // Small delay to ensure cleanup is complete
        setTimeout(() => {
          navigate("/");
        }, 500);
      }
    } catch (error) {
      console.error("Delete account error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to delete account";
      toast.error(errorMessage);
    }
  };

  return (
    <>
      <Navbar />
      <div className="change-password-container">
        <Sidebar activeLink="login" />
        <div className="change-password-main">
          <h2 className="change-password-title">Security Settings</h2>

          <div className="settings-section">
            <h3 className="settings-subtitle">Change Password</h3>
            {error && (
              <div className="change-password-error-message">{error}</div>
            )}
            {message && (
              <div className="change-password-success-message">{message}</div>
            )}

            <form
              className="change-password-form-container"
              onSubmit={handlePasswordSubmit}
            >
              {/* Hidden username field for accessibility */}
              <input
                type="text"
                name="username"
                autoComplete="username"
                style={{ display: "none" }}
              />
              <label
                className="change-password-input-label"
                htmlFor="current-password"
              >
                Current Password
              </label>
              <input
                className="change-password-input-field"
                type="password"
                id="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />

              <label
                className="change-password-input-label"
                htmlFor="new-password"
              >
                New Password
              </label>
              <input
                className="change-password-input-field"
                type="password"
                id="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <p className="change-password-hint">
                Password must be at least 8 characters long and contain at least
                one uppercase letter, one lowercase letter, one number, and one
                special character (@$!%*?&)
              </p>

              <label
                className="change-password-input-label"
                htmlFor="confirm-password"
              >
                Confirm Password
              </label>
              <input
                className="change-password-input-field"
                type="password"
                id="confirm-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />

              <div className="change-password-button-container">
                <button
                  type="submit"
                  className="change-password-button change-password-save-button"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>

          <div className="settings-section">
            <h3 className="settings-subtitle">Change Email</h3>
            {emailError && (
              <div className="change-password-error-message">{emailError}</div>
            )}
            {emailMessage && (
              <div className="change-password-success-message">
                {emailMessage}
              </div>
            )}

            <form
              className="change-password-form-container"
              onSubmit={handleEmailChangeRequest}
            >
              <label
                className="change-password-input-label"
                htmlFor="new-email"
              >
                New Email Address
              </label>
              <input
                className="change-password-input-field"
                type="email"
                id="new-email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                placeholder="Enter your new email address"
              />

              <div className="change-password-button-container">
                <button
                  type="submit"
                  className="change-password-button change-password-save-button"
                >
                  Request Email Change
                </button>
              </div>
            </form>
          </div>

          <div className="account-deletion-container">
            <h3>Account Deletion</h3>
            <div className="account-deletion-content">
              <p className="account-deletion-text">
                If you'd like to permanently delete your account and all
                associated data, you can do so by clicking the button below.
              </p>
              <button
                className="account-deletion-button"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Account
              </button>
            </div>
          </div>

          {showDeleteConfirm && (
            <div className="account-deletion-modal-overlay">
              <div className="account-deletion-modal">
                <h3 className="account-deletion-modal-title">
                  Confirm Account Deletion
                </h3>
                <p className="account-deletion-modal-text">
                  Are you sure you want to permanently delete your account? This
                  action cannot be undone and will remove all your data from our
                  system.
                </p>
                <ul className="account-deletion-modal-list">
                  <li>Course progress and achievements</li>
                  <li>Completed lessons and exercises</li>
                  <li>Profile information and settings</li>
                  <li>Subscription and payment details</li>
                </ul>
                <div className="account-deletion-modal-actions">
                  <button
                    className="account-deletion-cancel-button"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="account-deletion-confirm-button"
                    onClick={handleDeleteAccount}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ChangePassword;
