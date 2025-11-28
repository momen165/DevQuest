'use client';

import React, { useState } from "react";
import axios from "axios";
import "@/styles/AuthPages.css";
import Link from "next/link";

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const validateEmail = (email: string): boolean => {
    return !!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError("");
    setMessage("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/password-reset`,
        { email },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      setMessage(
        response.data.message ||
        "Password reset instructions sent to your email",
      );
      setEmail("");
    } catch (err: any) {
      console.error("Password reset error:", err);

      if (err.response) {
        // Handle specific status codes
        if (err.response.status === 404) {
          setError("Email address not found");
        } else if (err.response.status === 500) {
          setError("Server error. Please try again later");
        } else {
          setError(
            err.response.data.error ||
            "Failed to send reset instructions. Please try again.",
          );
        }
      } else {
        setError("Network error. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="Auth_container">
      <div className="form-container">
        <h1>Forgot Password</h1>
        <p>Enter your email address to receive a password reset link.</p>
        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit} className="form">
          <label>
            Email address
            <input
              type="email"
              name="email"
              value={email}
              onChange={handleChange}
              required
              className="input"
              disabled={loading}
            />
          </label>
          <button type="submit" className="button" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
        <p>
          Remembered your password? <Link href="/LoginPage">Log in</Link>
        </p>
      </div>
      <div className="welcome-container">
        <h2>Need Help?</h2>
        <p>
          Forgot your password? No worries! Just enter your email, and we&apos;ll
          send you instructions to reset your password. You&apos;ll be back on track
          in no time.
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
