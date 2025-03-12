// ResetPasswordPage.js
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "styles/ResetPasswordPage.css";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const token = new URLSearchParams(location.search).get("token");

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(password)) {
      setError(
        "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await axios.post(
        "/api/reset-password",
        { token, newPassword: password },
        { withCredentials: true },
      );

      setMessage("Password reset successful!");
      setTimeout(() => navigate("/LoginPage"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-container">
      <div className="reset-password-box">
        <h1 className="h1-reset-password">Reset Password</h1>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label-reset-password" htmlFor="password">
              New Password
            </label>
            <input
              className="reset-password"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            <p className="hint">
              Password must be at least 8 characters long and contain at least
              one uppercase letter, one lowercase letter, one number, and one
              special character (@$!%*?&)
            </p>
          </div>

          <div className="form-group">
            <label className="label-reset-password" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              className="reset-password"
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button className="submit-button" type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
