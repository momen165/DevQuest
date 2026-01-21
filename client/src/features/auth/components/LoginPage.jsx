import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AuthPages.css';
import { useAuth } from 'app/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleResendVerification = async () => {
    if (!formData.email) return;

    try {
      setLoading(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/resend-verification`, {
        email: formData.email,
      });
      toast.success('Verification email sent! Please check your inbox.');
    } catch (err) {
      toast.error(
        err.response?.data?.error || 'Failed to resend verification email. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNeedsVerification(false);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/login`, {
        email: formData.email,
        password: formData.password,
      });

      const { token, refreshToken, user } = response.data;

      // Store tokens and user data using the updated auth context
      const success = await login(token, refreshToken, user);

      if (success) {
        toast.success('Login successful!');
        navigate('/');
      } else {
        toast.error('Failed to process login information.');
      }
    } catch (err) {
      // Handle verification-specific error
      if (err.response?.data?.needsVerification) {
        setNeedsVerification(true);
        toast.error('Please verify your email before logging in');
      } else {
        toast.error(
          err.response?.data?.error || 'Login failed. Please check your email and password.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="Auth_container">
      <div className="form-container">
        <h1>Welcome Back</h1>
        <p>
          Don't have an account? <a href="/RegistrationPage">Sign up</a>
        </p>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Email address
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="input"
              autoComplete="email"
              placeholder="Enter your email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="input"
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </label>

          <button type="submit" className="button" disabled={loading}>
            {loading ? 'Authenticating...' : 'Log in'}
          </button>
        </form>

        {needsVerification && (
          <div className="verification-message">
            <p>Your email address has not been verified yet.</p>
            <button onClick={handleResendVerification} className="resend-button" disabled={loading}>
              Resend Verification Email
            </button>
          </div>
        )}

        <p>
          <a href="/ForgotPasswordPage">Forgot your password?</a>
        </p>
      </div>
      <div className="welcome-container">
        <h2>Continue Your Coding Journey!</h2>
        <p>
          Welcome back to DevQuest! Ready to dive back into your programming adventure? Your next
          coding challenge awaits. Let's build something amazing together and level up your
          development skills one line of code at a time.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
